#!/usr/bin/env node
/**
 * One-shot live Cloudflare setup (from your machine, after Wrangler auth):
 * 1) Ensure D1 database exists (create if missing)
 * 2) Write database_id into worker/wrangler.toml
 * 3) Apply D1 migrations --remote
 * 4) wrangler deploy --env production (Worker)
 * 5) Build demo + dashboard with VITE_SI_WORKER_URL
 * 6) wrangler pages deploy for apps/demo-retailer and apps/dashboard (uses each app’s wrangler.toml)
 *
 * Usage (repo root):
 *   pnpm cloudflare:bootstrap
 *   SKIP_PAGES=1 pnpm cloudflare:bootstrap
 *
 * Auth: run `pnpm exec wrangler login` once, or set CLOUDFLARE_API_TOKEN (+ CLOUDFLARE_ACCOUNT_ID if needed).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workerDir = path.join(rootDir, "worker");
const wranglerTomlPath = path.join(workerDir, "wrangler.toml");
const demoWranglerPath = path.join(rootDir, "apps", "demo-retailer", "wrangler.toml");
const dashWranglerPath = path.join(rootDir, "apps", "dashboard", "wrangler.toml");

const skipPages = process.env.SKIP_PAGES === "1" || process.argv.includes("--skip-pages");

function readWranglerToml() {
  return fs.readFileSync(wranglerTomlPath, "utf8");
}

function readTomlName(tomlPath) {
  const t = fs.readFileSync(tomlPath, "utf8");
  const m = t.match(/^name\s*=\s*"([^"]+)"/m);
  return m?.[1] ?? path.basename(path.dirname(tomlPath));
}

function readWorkerName(toml) {
  const m = toml.match(/^name\s*=\s*"([^"]+)"/m);
  return m?.[1] ?? "session-intelligence-worker";
}

function readD1DatabaseName(toml) {
  const m = toml.match(/\[\[d1_databases\]\][\s\S]*?database_name\s*=\s*"([^"]+)"/);
  return m?.[1] ?? "session-intelligence";
}

function setWranglerDatabaseId(toml, id) {
  if (!/^[\da-f-]{36}$/i.test(id)) {
    throw new Error(`Refusing to write invalid database_id: ${id}`);
  }
  const re = /(\[\[d1_databases\]\][\s\S]*?)database_id\s*=\s*"[^"]*"/;
  if (!re.test(toml)) throw new Error("Could not find [[d1_databases]] / database_id in worker/wrangler.toml");
  const next = toml.replace(re, (_, head) => `${head}database_id = "${id}"`);
  fs.writeFileSync(wranglerTomlPath, next);
}

function wranglerJson(args) {
  const r = spawnSync("pnpm", ["exec", "wrangler", ...args], {
    cwd: workerDir,
    encoding: "utf8",
    env: process.env,
  });
  if (r.status !== 0) {
    const err = (r.stderr || "") + (r.stdout || "");
    const hint =
      /login|auth|token/i.test(err) ?
        "\n→ Run:  pnpm exec wrangler login  (from repo root)\n   Or set CLOUDFLARE_API_TOKEN for non-interactive use.\n"
        : "";
    throw new Error(`wrangler ${args.join(" ")} failed (exit ${r.status}):\n${err}${hint}`);
  }
  const out = (r.stdout || "").trim();
  const tryParse = (s) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };
  let parsed = tryParse(out);
  if (parsed) return parsed;
  const fromBracket = out.match(/[\[{][\s\S]*[\]}]/);
  if (fromBracket) {
    parsed = tryParse(fromBracket[0]);
    if (parsed) return parsed;
  }
  throw new Error(`Could not parse JSON from wrangler output:\n${out.slice(0, 800)}`);
}

function wranglerRun(args, inherit = true) {
  const r = spawnSync("pnpm", ["exec", "wrangler", ...args], {
    cwd: workerDir,
    encoding: "utf8",
    env: process.env,
    stdio: inherit ? "inherit" : ["inherit", "pipe", "pipe"],
  });
  if (r.status !== 0) {
    const detail = inherit ? "" : `\n${r.stdout || ""}\n${r.stderr || ""}`;
    throw new Error(`wrangler ${args.join(" ")} failed (exit ${r.status})${detail}`);
  }
  return { stdout: r.stdout || "", stderr: r.stderr || "" };
}

function wranglerPagesFromRoot(appRelative, inherit = true) {
  const r = spawnSync(
    "pnpm",
    ["exec", "wrangler", "pages", "deploy", "--cwd", appRelative, "--branch", "main", "--commit-dirty"],
    {
      cwd: rootDir,
      encoding: "utf8",
      env: process.env,
      stdio: inherit ? "inherit" : ["inherit", "pipe", "pipe"],
    },
  );
  if (r.status !== 0) {
    const detail = inherit ? "" : `\n${r.stdout || ""}\n${r.stderr || ""}`;
    throw new Error(`wrangler pages deploy ${appRelative} failed (exit ${r.status})${detail}`);
  }
}

function ensurePagesProject(name) {
  const r = spawnSync(
    "pnpm",
    ["exec", "wrangler", "pages", "project", "create", name, "--production-branch", "main"],
    {
      cwd: rootDir,
      encoding: "utf8",
      env: process.env,
      stdio: "pipe",
    },
  );
  if (r.status === 0) console.log(`Ensured Pages project exists: ${name}`);
}

function findD1Uuid(listJson, databaseName) {
  const rows = Array.isArray(listJson) ? listJson : listJson?.result ?? listJson?.databases ?? [];
  const row = rows.find((x) => x?.name === databaseName);
  return row?.uuid ?? row?.id ?? null;
}

function extractWorkerUrl(text, workerName) {
  const esc = workerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const specific = new RegExp(`https://${esc}\\.[^\\s/]+\\.workers\\.dev`, "i");
  const m1 = text.match(specific);
  if (m1) return m1[0].replace(/\/$/, "");
  const m2 = text.match(/https:\/\/[^\s]+\.workers\.dev/);
  if (m2) return m2[0].replace(/\/$/, "");
  return null;
}

function pnpmRun(args, cwd, extraEnv) {
  const r = spawnSync("pnpm", args, {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...extraEnv },
    stdio: "inherit",
  });
  if (r.status !== 0) {
    throw new Error(`pnpm ${args.join(" ")} failed (exit ${r.status})`);
  }
}

function main() {
  console.log(`\n=== Cloudflare bootstrap: Worker + D1${skipPages ? "" : " + Pages"} ===\n`);

  let toml = readWranglerToml();
  const workerName = readWorkerName(toml);
  const databaseName = readD1DatabaseName(toml);
  const pagesDemoName = readTomlName(demoWranglerPath);
  const pagesDashName = readTomlName(dashWranglerPath);

  console.log("Checking Wrangler auth…");
  wranglerRun(["whoami"], true);

  console.log(`\nLooking up D1 database "${databaseName}"…`);
  let dbId;
  try {
    const listed = wranglerJson(["d1", "list", "--json"]);
    dbId = findD1Uuid(listed, databaseName);
  } catch (e) {
    console.error(String(e));
    process.exit(1);
  }

  if (!dbId) {
    console.log(`Creating D1 database "${databaseName}"…`);
    const r = spawnSync("pnpm", ["exec", "wrangler", "d1", "create", databaseName], {
      cwd: workerDir,
      encoding: "utf8",
      env: process.env,
      stdio: ["inherit", "pipe", "pipe"],
    });
    const combined = (r.stdout || "") + (r.stderr || "");
    if (r.status !== 0) {
      console.error(combined);
      process.exit(r.status ?? 1);
    }
    const uuidMatch = combined.match(/[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}/i);
    if (!uuidMatch) {
      console.error("Could not parse new database UUID from wrangler output:\n", combined);
      process.exit(1);
    }
    dbId = uuidMatch[0];
    console.log(`Created database_id=${dbId}`);
  } else {
    console.log(`Using existing database_id=${dbId}`);
  }

  console.log("\nUpdating worker/wrangler.toml …");
  setWranglerDatabaseId(toml, dbId);
  toml = readWranglerToml();

  console.log(`\nApplying migrations to remote D1 (${databaseName})…`);
  wranglerRun(["d1", "migrations", "apply", databaseName, "--remote"], true);

  console.log("\nDeploying Worker…");
  const dep = wranglerRun(["deploy"], false);
  const combined = dep.stdout + dep.stderr;
  const workerUrl =
    process.env.SI_WORKER_URL?.trim().replace(/\/$/, "") ||
    extractWorkerUrl(combined, workerName);
  if (!workerUrl) {
    throw new Error(
      "Could not detect Worker URL from deploy logs. Set SI_WORKER_URL to your https://….workers.dev origin and re-run from the Pages build step, or deploy again and copy the URL from the output.",
    );
  }
  console.log(`\nWorker URL: ${workerUrl}`);

  if (skipPages) {
    console.log("\n(Skipping Pages: SKIP_PAGES=1 or --skip-pages)\n");
    printNext(workerUrl, pagesDemoName, pagesDashName, false);
    return;
  }

  console.log("\nBuilding demo + dashboard (VITE_SI_WORKER_URL set)…");
  pnpmRun(["--filter", "@si/demo-retailer", "build"], rootDir, { VITE_SI_WORKER_URL: workerUrl });
  pnpmRun(["--filter", "@si/dashboard", "build"], rootDir, { VITE_SI_WORKER_URL: workerUrl });

  const demoDist = path.join(rootDir, "apps", "demo-retailer", "dist");
  const dashDist = path.join(rootDir, "apps", "dashboard", "dist");
  if (!fs.existsSync(demoDist) || !fs.existsSync(dashDist)) {
    throw new Error("Expected dist/ folders after build");
  }

  console.log("\nEnsuring Cloudflare Pages projects exist…");
  ensurePagesProject(pagesDemoName);
  ensurePagesProject(pagesDashName);

  console.log(`\nDeploying Pages (${pagesDemoName})…`);
  try {
    wranglerPagesFromRoot("apps/demo-retailer", true);
  } catch (e) {
    console.error(String(e));
    console.error(
      "\nIf Pages deploy failed (permissions), ensure the API token includes Cloudflare Pages — Edit.\n" +
        "Project names come from apps/*/wrangler.toml (top-level `name`).\n",
    );
    printNext(workerUrl, pagesDemoName, pagesDashName, true);
    process.exit(1);
  }

  console.log(`\nDeploying Pages (${pagesDashName})…`);
  wranglerPagesFromRoot("apps/dashboard", true);

  printNext(workerUrl, pagesDemoName, pagesDashName, false);
}

function printNext(workerUrl, demoProject, dashProject, pagesPartial) {
  console.log("\n--- Done ---\n");
  console.log(`VITE_SI_WORKER_URL (for future local builds): ${workerUrl}`);
  if (!pagesPartial) {
    console.log(`\nOpen Pages URLs from Cloudflare dashboard → Workers & Pages → each project → Visit.`);
    console.log(`(Project names: ${demoProject}, ${dashProject})`);
  }
  console.log(`\nworker/wrangler.toml was updated with your D1 database_id — review before committing.`);
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
