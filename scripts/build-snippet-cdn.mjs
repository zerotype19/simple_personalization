#!/usr/bin/env node
/**
 * Production snippet-only artifact for Pages project `si-session-snippet` (e.g. cdn.optiview.ai).
 *
 * Required env:
 *   VITE_SI_WORKER_URL — API origin, e.g. https://api.optiview.ai
 *
 * Optional env:
 *   VITE_SI_SNIPPET_ORIGIN — default https://cdn.optiview.ai
 *   SI_PUBLIC_INSPECTOR_CSS_URL — default {VITE_SI_SNIPPET_ORIGIN}/si-inspector.css
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const worker = (process.env.VITE_SI_WORKER_URL ?? process.env.SI_PUBLIC_WORKER_URL ?? "").trim();
if (!worker) {
  console.error("[build-snippet-cdn] Set VITE_SI_WORKER_URL (e.g. https://api.optiview.ai).");
  process.exit(1);
}

const snippetOrigin = (process.env.VITE_SI_SNIPPET_ORIGIN ?? "https://cdn.optiview.ai")
  .trim()
  .replace(/\/+$/, "");

const env = {
  ...process.env,
  VITE_SI_WORKER_URL: worker.replace(/\/+$/, ""),
  SI_PUBLIC_WORKER_URL: worker.replace(/\/+$/, ""),
  VITE_SI_SNIPPET_ORIGIN: snippetOrigin,
  SI_SNIPPET_OUT_DIR: path.join(root, "apps", "snippet-cdn", "dist"),
  SI_SNIPPET_WRITE_META: "1",
  SI_SNIPPET_WRITE_HEADERS: "1",
};
if (!env.SI_PUBLIC_INSPECTOR_CSS_URL?.trim()) {
  env.SI_PUBLIC_INSPECTOR_CSS_URL = `${snippetOrigin}/si-inspector.css`;
}

const script = path.join(root, "scripts", "build-snippet-artifacts.mjs");
const r = spawnSync(process.execPath, [script], { cwd: root, stdio: "inherit", env, shell: false });
process.exit(r.status ?? 1);
