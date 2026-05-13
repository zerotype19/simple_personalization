#!/usr/bin/env node
/**
 * When `VITE_SI_WORKER_URL` is set (same origin the demo uses for `/config` + `/collect`),
 * rebuilds the IIFE with that Worker base baked in and copies it to `public/si.js`.
 * After Pages deploy, webmasters can use:
 *   <script async src="https://YOUR_DEMO_DOMAIN/si.js"></script>
 *
 * Optional: `VITE_SI_SNIPPET_FORCE_INSPECTOR=1` bakes in the on-page inspector for that bundle.
 *
 * `VITE_SI_SNIPPET_ORIGIN` (default `https://optiview.ai`) bakes `…/si-inspector.css` into the IIFE
 * so the companion stylesheet loads even when DOM `script[src]` scanning cannot find `/si.js`.
 */
import { execSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(__dirname, "..");
const root = path.join(appDir, "..", "..");
const outFile = path.join(appDir, "public", "si.js");
const sdkDist = path.join(root, "packages", "sdk", "dist", "sdk.iife.js");

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

const env = {
  ...process.env,
  SI_PUBLIC_WORKER_URL: worker,
};
const snippetOrigin = (process.env.VITE_SI_SNIPPET_ORIGIN ?? "https://optiview.ai")
  .trim()
  .replace(/\/+$/, "");
env.SI_PUBLIC_INSPECTOR_CSS_URL = `${snippetOrigin}/si-inspector.css`;
if (process.env.VITE_SI_SNIPPET_FORCE_INSPECTOR === "1") {
  env.SI_PUBLIC_FORCE_INSPECTOR = "1";
}

console.log("[prepare-hosted-snippet] Building @si/sdk IIFE with Worker base:", worker);
execSync("pnpm --filter @si/sdk build", { cwd: root, stdio: "inherit", env });

if (!existsSync(sdkDist)) {
  console.error("[prepare-hosted-snippet] Expected file missing:", sdkDist);
  process.exit(1);
}

mkdirSync(path.join(appDir, "public"), { recursive: true });
copyFileSync(sdkDist, outFile);
console.log("[prepare-hosted-snippet] Wrote", path.relative(root, outFile));

const inspectorCssSrc = path.join(root, "packages", "sdk", "src", "inspector-panel.txt");
const inspectorCssOut = path.join(appDir, "public", "si-inspector.css");
if (existsSync(inspectorCssSrc)) {
  copyFileSync(inspectorCssSrc, inspectorCssOut);
  console.log("[prepare-hosted-snippet] Wrote", path.relative(root, inspectorCssOut));
} else {
  console.warn("[prepare-hosted-snippet] Missing inspector CSS source:", inspectorCssSrc);
}
