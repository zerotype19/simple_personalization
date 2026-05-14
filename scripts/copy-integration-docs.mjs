#!/usr/bin/env node
/**
 * Copies integration markdown from /docs into each app's public/integration
 * so Pages can serve them at /integration/*.md
 *
 * Usage (from repo root):
 *   node scripts/copy-integration-docs.mjs
 *   node scripts/copy-integration-docs.mjs apps/demo-retailer/public/integration
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const FILES = [
  "session-intelligence-data-dictionary.md",
  "session-intelligence-webmaster-demo-guide.md",
  "SNIPPET_HOSTING.md",
];

const defaultTargets = [
  path.join(ROOT, "apps/demo-retailer/public/integration"),
  path.join(ROOT, "apps/dashboard/public/integration"),
];

const targets = process.argv.slice(2).length ? process.argv.slice(2).map((p) => path.resolve(ROOT, p)) : defaultTargets;

for (const out of targets) {
  fs.mkdirSync(out, { recursive: true });
  for (const f of FILES) {
    const src = path.join(ROOT, "docs", f);
    if (!fs.existsSync(src)) {
      console.warn(`[copy-integration-docs] skip missing: ${path.relative(ROOT, src)}`);
      continue;
    }
    fs.copyFileSync(src, path.join(out, f));
  }
  console.log(`[copy-integration-docs] → ${path.relative(ROOT, out)}`);
}
