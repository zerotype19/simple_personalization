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
const re = /(\[\[d1_databases\]\][\s\S]*?)database_id\s*=\s*"[^"]*"/;
if (!re.test(text)) {
  console.warn("patch-d1: no [[d1_databases]] database_id line found.");
  process.exit(0);
}
const next = text.replace(re, (_, head) => `${head}database_id = "${id}"`);
if (next === text) {
  console.warn("patch-d1: no change applied.");
  process.exit(0);
}
fs.writeFileSync(wranglerPath, next);
console.log("patch-d1: updated worker/wrangler.toml with D1_DATABASE_ID.");
