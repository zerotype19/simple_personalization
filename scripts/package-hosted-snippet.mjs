#!/usr/bin/env node
/**
 * Package Optiview hosted-snippet zip for webmasters (cdn assets + install docs).
 * Requires apps/snippet-cdn/dist from `pnpm build:snippet` (runs build if dist missing).
 */
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync, spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const cdnDist = path.join(root, "apps", "snippet-cdn", "dist");
const bundleTemplate = path.join(__dirname, "hosted-snippet-bundle");
const docs = [
  "CUSTOMER_INSTALL.md",
  "WEBMASTER_INSTALL_ONE_PAGER.md",
  "SNIPPET_HOSTING.md",
  "SECURITY_PRIVACY_FAQ.md",
];

function shortSha() {
  try {
    return execSync("git rev-parse --short HEAD", { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function ensureBuilt() {
  if (existsSync(path.join(cdnDist, "si.js"))) return;
  console.log("[package-hosted-snippet] dist missing — running pnpm build:snippet …");
  const r = spawnSync("pnpm", ["build:snippet"], {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      VITE_SI_WORKER_URL: process.env.VITE_SI_WORKER_URL ?? "https://api.optiview.ai",
      VITE_SI_SNIPPET_ORIGIN: process.env.VITE_SI_SNIPPET_ORIGIN ?? "https://cdn.optiview.ai",
    },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

ensureBuilt();

const sha = shortSha();
const outDir = path.join(root, "dist", `optiview-hosted-snippet-${sha}`);
const zipPath = `${outDir}.zip`;

rmSync(outDir, { recursive: true, force: true });
mkdirSync(path.join(outDir, "cdn"), { recursive: true });
mkdirSync(path.join(outDir, "docs"), { recursive: true });

for (const name of ["si.js", "si-inspector.css", "version.json", "health.json", "_headers"]) {
  copyFileSync(path.join(cdnDist, name), path.join(outDir, "cdn", name));
}

const healthHtml = path.join(root, "apps", "demo-retailer", "public", "snippet-health.html");
if (existsSync(healthHtml)) {
  copyFileSync(healthHtml, path.join(outDir, "cdn", "snippet-health.html"));
}

copyFileSync(path.join(bundleTemplate, "README.txt"), path.join(outDir, "README.txt"));
copyFileSync(path.join(bundleTemplate, "install-examples.html"), path.join(outDir, "install-examples.html"));

for (const doc of docs) {
  cpSync(path.join(root, "docs", doc), path.join(outDir, "docs", doc));
}

rmSync(zipPath, { force: true });
execSync(`zip -r "${path.basename(zipPath)}" "${path.basename(outDir)}"`, {
  cwd: path.join(root, "dist"),
  stdio: "inherit",
});

let commit = sha;
try {
  const v = JSON.parse(readFileSync(path.join(outDir, "cdn", "version.json"), "utf8"));
  if (v.commit) commit = String(v.commit).slice(0, 7);
} catch {
  /* ignore */
}

console.log(`[package-hosted-snippet] Wrote ${zipPath} (commit ${commit})`);
