#!/usr/bin/env node
/**
 * Builds @si/sdk IIFE and writes si.js + si-inspector.css to SI_SNIPPET_OUT_DIR.
 * Optional: version.json + health.json when SI_SNIPPET_WRITE_META=1.
 *
 * Env (required unless skipping via caller):
 *   VITE_SI_WORKER_URL or SI_PUBLIC_WORKER_URL — Worker origin (no trailing slash)
 *   SI_SNIPPET_OUT_DIR — output directory (absolute recommended)
 *
 * Env (optional):
 *   VITE_SI_SNIPPET_ORIGIN — default https://optiview.ai if unset (bake CSS host / docs)
 *   SI_PUBLIC_INSPECTOR_CSS_URL — full URL for inspector CSS (default: {origin}/si-inspector.css)
 *   VITE_SI_SNIPPET_FORCE_INSPECTOR / SI_PUBLIC_FORCE_INSPECTOR=1
 *   SI_SNIPPET_WRITE_META=1 — emit version.json + health.json next to assets
 */
import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const outDir = (process.env.SI_SNIPPET_OUT_DIR ?? "").trim();
if (!outDir) {
  console.error("[build-snippet-artifacts] SI_SNIPPET_OUT_DIR is required.");
  process.exit(1);
}
const outAbs = path.isAbsolute(outDir) ? outDir : path.join(process.cwd(), outDir);

const raw = process.env.VITE_SI_WORKER_URL ?? process.env.SI_PUBLIC_WORKER_URL ?? "";
const worker = raw.trim().replace(/\/+$/, "");
if (!worker) {
  console.error("[build-snippet-artifacts] Set VITE_SI_WORKER_URL or SI_PUBLIC_WORKER_URL.");
  process.exit(1);
}

const snippetOrigin = (process.env.VITE_SI_SNIPPET_ORIGIN ?? "https://optiview.ai")
  .trim()
  .replace(/\/+$/, "");
const cssUrl = (process.env.SI_PUBLIC_INSPECTOR_CSS_URL ?? `${snippetOrigin}/si-inspector.css`).trim();

const env = {
  ...process.env,
  SI_PUBLIC_WORKER_URL: worker,
  SI_PUBLIC_INSPECTOR_CSS_URL: cssUrl,
};
if (process.env.VITE_SI_SNIPPET_FORCE_INSPECTOR === "1" || process.env.SI_PUBLIC_FORCE_INSPECTOR === "1") {
  env.SI_PUBLIC_FORCE_INSPECTOR = "1";
}

const sdkDist = path.join(root, "packages", "sdk", "dist", "sdk.iife.js");
const outFile = path.join(outAbs, "si.js");
const inspectorCssSrc = path.join(root, "packages", "sdk", "src", "inspector-panel.txt");
const inspectorCssOut = path.join(outAbs, "si-inspector.css");

console.log("[build-snippet-artifacts] Worker base:", worker);
console.log("[build-snippet-artifacts] Inspector CSS URL:", cssUrl);
console.log("[build-snippet-artifacts] Output dir:", outAbs);

execSync("pnpm --filter @si/sdk build", { cwd: root, stdio: "inherit", env });

if (!existsSync(sdkDist)) {
  console.error("[build-snippet-artifacts] Expected file missing:", sdkDist);
  process.exit(1);
}

mkdirSync(outAbs, { recursive: true });
copyFileSync(sdkDist, outFile);
console.log("[build-snippet-artifacts] Wrote", path.relative(root, outFile));

if (existsSync(inspectorCssSrc)) {
  copyFileSync(inspectorCssSrc, inspectorCssOut);
  console.log("[build-snippet-artifacts] Wrote", path.relative(root, inspectorCssOut));
} else {
  console.warn("[build-snippet-artifacts] Missing inspector CSS source:", inspectorCssSrc);
}

if (process.env.SI_SNIPPET_WRITE_META === "1") {
  let commit = "unknown";
  try {
    commit = execSync("git rev-parse HEAD", { cwd: root, encoding: "utf8" }).trim();
  } catch {
    /* not a git checkout */
  }
  let pkgVersion = "0.0.0";
  try {
    const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
    pkgVersion = typeof pkg.version === "string" ? pkg.version : pkgVersion;
  } catch {
    /* ignore */
  }
  const builtAt = new Date().toISOString();
  const versionPayload = {
    name: "session-intelligence-snippet",
    version: pkgVersion,
    commit,
    built_at: builtAt,
    worker_url: worker,
    snippet_origin: snippetOrigin,
  };
  writeFileSync(path.join(outAbs, "version.json"), `${JSON.stringify(versionPayload, null, 2)}\n`, "utf8");
  writeFileSync(
    path.join(outAbs, "health.json"),
    `${JSON.stringify({ ok: true, service: "session-intelligence-snippet" }, null, 2)}\n`,
    "utf8",
  );
  console.log("[build-snippet-artifacts] Wrote version.json + health.json");
}

const headers = `# Snippet CDN — short TTL during beta; tighten later with versioned paths.
/si.js
  Cache-Control: max-age=300

/si-inspector.css
  Cache-Control: max-age=300

/version.json
  Cache-Control: no-cache

/health.json
  Cache-Control: no-cache
`;
if (process.env.SI_SNIPPET_WRITE_HEADERS === "1") {
  writeFileSync(path.join(outAbs, "_headers"), headers, "utf8");
  console.log("[build-snippet-artifacts] Wrote _headers");
}
