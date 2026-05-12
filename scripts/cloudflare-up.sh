#!/usr/bin/env bash
# Live Cloudflare setup using only the Wrangler CLI (plus pnpm for builds).
# Prerequisite: you must be logged in — run once:  pnpm exec wrangler login
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORKER_DIR="$ROOT/worker"
DB_NAME="session-intelligence"

cd "$ROOT"

echo ""
echo "========== 1) Wrangler auth =========="
pnpm exec wrangler whoami

echo ""
echo "========== 2) D1 database =========="
cd "$WORKER_DIR"
LIST_JSON="$(pnpm exec wrangler d1 list --json)"
UUID="$(node -e "
const j = JSON.parse(process.argv[1]);
const rows = Array.isArray(j) ? j : (j.result || j.databases || []);
const name = process.argv[2];
const r = rows.find((x) => x && x.name === name);
console.log(r ? (r.uuid || r.id || '') : '');
" "$LIST_JSON" "$DB_NAME")"

if [[ -z "$UUID" ]]; then
  echo "No D1 database named \"$DB_NAME\" — creating it..."
  CREATE_OUT="$(pnpm exec wrangler d1 create "$DB_NAME" 2>&1)"
  echo "$CREATE_OUT"
  UUID="$(echo "$CREATE_OUT" | grep -Eo '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)"
fi

if [[ -z "$UUID" ]]; then
  echo "ERROR: could not determine D1 database_id."
  exit 1
fi
echo "Using database_id: $UUID"

node -e "
const fs = require('fs');
const p = '$WORKER_DIR/wrangler.toml';
const uuid = '$UUID';
let t = fs.readFileSync(p, 'utf8');
const next = t.replace(/database_id\\s*=\\s*\\\"[^\\\"]*\\\"/, 'database_id = \\\"' + uuid + '\\\"');
if (next === t) throw new Error('Could not patch database_id in wrangler.toml');
fs.writeFileSync(p, next);
"
echo "Updated worker/wrangler.toml"

echo ""
echo "========== 3) D1 migrations (remote) =========="
pnpm exec wrangler d1 migrations apply "$DB_NAME" --remote

echo ""
echo "========== 4) Deploy Worker =========="
DEPLOY_LOG="$(pnpm exec wrangler deploy 2>&1)"
echo "$DEPLOY_LOG"
WORKER_URL="$(echo "$DEPLOY_LOG" | grep -Eo 'https://[^[:space:]]+\.workers\.dev' | head -1 || true)"
if [[ -z "$WORKER_URL" ]]; then
  echo "Could not grep Worker URL from deploy output. Set SI_WORKER_URL and re-run from step 5, or read the URL above."
  if [[ -n "${SI_WORKER_URL:-}" ]]; then
    WORKER_URL="${SI_WORKER_URL%/}"
  else
    exit 1
  fi
fi
echo ""
echo "Worker URL: $WORKER_URL"

cd "$ROOT"
export VITE_SI_WORKER_URL="$WORKER_URL"

echo ""
echo "========== 5) Build demo + dashboard =========="
pnpm --filter @si/demo-retailer build
pnpm --filter @si/dashboard build

echo ""
echo "========== 6) Deploy Pages (demo) =========="
pnpm exec wrangler pages deploy --cwd apps/demo-retailer --branch main --commit-dirty

echo ""
echo "========== 7) Deploy Pages (dashboard) =========="
pnpm exec wrangler pages deploy --cwd apps/dashboard --branch main --commit-dirty

echo ""
echo "========== Done =========="
echo "Worker:  $WORKER_URL"
echo "Pages:   open Cloudflare dashboard → Workers & Pages → projects from apps/*/wrangler.toml (si-session-demo, si-session-dashboard)"
echo "Note:    worker/wrangler.toml now contains your real D1 id — commit or revert as you prefer."
