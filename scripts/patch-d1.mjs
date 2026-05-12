#!/usr/bin/env node
/**
 * Replaces D1 placeholder in worker/wrangler.toml when D1_DATABASE_ID is set.
 * Used in CI (GitHub Actions) so the real database id stays in a secret, not in git.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const id = process.env.D1_DATABASE_ID?.trim();
if (!id) {
  process.exit(0);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wranglerPath = path.join(root, "worker", "wrangler.toml");
let text = fs.readFileSync(wranglerPath, "utf8");
const needle = 'database_id = "REPLACE_ME"';
if (!text.includes(needle)) {
  console.warn("patch-d1: placeholder not found; wrangler.toml may already be configured.");
  process.exit(0);
}
text = text.replace(needle, `database_id = "${id}"`);
fs.writeFileSync(wranglerPath, text);
console.log("patch-d1: updated worker/wrangler.toml with D1_DATABASE_ID.");
