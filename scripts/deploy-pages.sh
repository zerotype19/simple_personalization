#!/usr/bin/env bash
# Build demo + dashboard with VITE_SI_WORKER_URL, then wrangler pages deploy both.
# Required for /si.js: the Worker URL is baked in at build time (Pages "direct upload"
# does not run this script on Cloudflare — you must run it locally or in CI).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

URL="${VITE_SI_WORKER_URL:-${SI_WORKER_URL:-}}"
if [[ -z "${URL}" ]]; then
  echo "Set VITE_SI_WORKER_URL or SI_WORKER_URL to your Worker origin, e.g." >&2
  echo "  https://session-intelligence-worker.<subdomain>.workers.dev" >&2
  echo "(no trailing slash)" >&2
  exit 1
fi

export VITE_SI_WORKER_URL="${URL%/}"
echo "Using VITE_SI_WORKER_URL=$VITE_SI_WORKER_URL"

# Canonical origin where /si.js and /si-inspector.css are served (baked into the IIFE).
export VITE_SI_SNIPPET_ORIGIN="${VITE_SI_SNIPPET_ORIGIN:-https://optiview.ai}"
echo "Using VITE_SI_SNIPPET_ORIGIN=$VITE_SI_SNIPPET_ORIGIN"

pnpm --filter @si/demo-retailer build
pnpm --filter @si/dashboard build

pnpm exec wrangler pages deploy --cwd apps/demo-retailer --branch main --commit-dirty
pnpm exec wrangler pages deploy --cwd apps/dashboard --branch main --commit-dirty

echo "Pages deploy finished (si-session-demo + si-session-dashboard)."
