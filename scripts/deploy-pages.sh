#!/usr/bin/env bash
# Deploy demo + dashboard Pages projects only (no snippet CDN project).
# For snippet-only: pnpm deploy:snippet
# For worker + snippet + demo + dashboard: pnpm deploy:all
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

URL="${VITE_SI_WORKER_URL:-${SI_WORKER_URL:-}}"
if [[ -z "${URL}" ]]; then
  echo "Set VITE_SI_WORKER_URL or SI_WORKER_URL to your Worker origin, e.g." >&2
  echo "  https://api.optiview.ai" >&2
  echo "(no trailing slash)" >&2
  exit 1
fi

export VITE_SI_WORKER_URL="${URL%/}"
# Baked into demo-hosted /si.js CSS link (same-origin snippet during migration).
export VITE_SI_SNIPPET_ORIGIN="${VITE_SI_SNIPPET_ORIGIN:-https://optiview.ai}"
echo "Using VITE_SI_SNIPPET_ORIGIN=$VITE_SI_SNIPPET_ORIGIN (baked into demo /si.js + inspector CSS URL)"

VITE_SI_WORKER_URL="${VITE_SI_WORKER_URL}" VITE_SI_SNIPPET_ORIGIN="${VITE_SI_SNIPPET_ORIGIN}" pnpm --filter @si/demo-retailer build
VITE_SI_WORKER_URL="${VITE_SI_WORKER_URL}" pnpm --filter @si/dashboard build

pnpm exec wrangler pages deploy --cwd apps/demo-retailer --branch main --commit-dirty
pnpm exec wrangler pages deploy --cwd apps/dashboard --branch main --commit-dirty

echo "Pages deploy finished (si-session-demo + si-session-dashboard). Snippet CDN unchanged — use pnpm deploy:snippet if needed."
