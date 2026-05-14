#!/usr/bin/env node
/**
 * When `VITE_SI_WORKER_URL` is set, builds the IIFE and copies it to `public/si.js` for the demo
 * Pages app (backward-compatible same-origin `/si.js`).
 *
 * For the dedicated CDN artifact only, use `pnpm build:snippet` from the repo root.
 *
 * Optional: `VITE_SI_SNIPPET_FORCE_INSPECTOR=1` bakes in the on-page inspector for that bundle.
 *
 * `VITE_SI_SNIPPET_ORIGIN` (default `https://optiview.ai`) bakes `…/si-inspector.css` into the IIFE.
 * Override with `SI_PUBLIC_INSPECTOR_CSS_URL` for a full URL.
 */
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(__dirname, "..");
const root = path.join(appDir, "..", "..");
const outFile = path.join(appDir, "public", "si.js");

const raw = process.env.VITE_SI_WORKER_URL ?? process.env.SI_PUBLIC_WORKER_URL ?? "";
const worker = raw.trim().replace(/\/+$/, "");

if (!worker) {
  console.log(
    "[prepare-hosted-snippet] VITE_SI_WORKER_URL unset — skipping public/si.js (no drop-in snippet in this build).",
  );
  try {
    if (existsSync(outFile)) unlinkSync(outFile);
    const cssOut = path.join(appDir, "public", "si-inspector.css");
    if (existsSync(cssOut)) unlinkSync(cssOut);
  } catch {
    /* ignore */
  }
  process.exit(0);
}

const snippetOrigin = (process.env.VITE_SI_SNIPPET_ORIGIN ?? "https://optiview.ai")
  .trim()
  .replace(/\/+$/, "");
const cssUrl = (process.env.SI_PUBLIC_INSPECTOR_CSS_URL ?? `${snippetOrigin}/si-inspector.css`).trim();

const env = {
  ...process.env,
  VITE_SI_WORKER_URL: worker,
  SI_PUBLIC_WORKER_URL: worker,
  VITE_SI_SNIPPET_ORIGIN: snippetOrigin,
  SI_PUBLIC_INSPECTOR_CSS_URL: cssUrl,
  SI_SNIPPET_OUT_DIR: path.join(appDir, "public"),
};
if (process.env.VITE_SI_SNIPPET_FORCE_INSPECTOR === "1") {
  env.SI_PUBLIC_FORCE_INSPECTOR = "1";
}

const script = path.join(root, "scripts", "build-snippet-artifacts.mjs");
const r = spawnSync(process.execPath, [script], { cwd: root, stdio: "inherit", env });
process.exit(r.status ?? 1);
