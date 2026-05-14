#!/usr/bin/env bash
# Deploy only the Velocity Motors demo Pages project (si-session-demo).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

URL="${VITE_SI_WORKER_URL:-${SI_WORKER_URL:-}}"
if [[ -z "${URL}" ]]; then
  echo "Set VITE_SI_WORKER_URL or SI_WORKER_URL to your Worker origin (no trailing slash)." >&2
  exit 1
fi

export VITE_SI_WORKER_URL="${URL%/}"
export VITE_SI_SNIPPET_ORIGIN="${VITE_SI_SNIPPET_ORIGIN:-https://cdn.optiview.ai}"
echo "Using VITE_SI_SNIPPET_ORIGIN=$VITE_SI_SNIPPET_ORIGIN"

# Load the same hosted si.js publishers use (requires snippet host live and matching baked URLs).
export VITE_SI_DEMO_USE_HOSTED_SNIPPET="${VITE_SI_DEMO_USE_HOSTED_SNIPPET:-1}"
export VITE_SI_DEMO_SNIPPET_INSPECTOR="${VITE_SI_DEMO_SNIPPET_INSPECTOR:-1}"

VITE_SI_WORKER_URL="${VITE_SI_WORKER_URL}" \
  VITE_SI_SNIPPET_ORIGIN="${VITE_SI_SNIPPET_ORIGIN}" \
  VITE_SI_DEMO_USE_HOSTED_SNIPPET="${VITE_SI_DEMO_USE_HOSTED_SNIPPET}" \
  VITE_SI_DEMO_SNIPPET_INSPECTOR="${VITE_SI_DEMO_SNIPPET_INSPECTOR}" \
  pnpm --filter @si/demo-retailer build
pnpm exec wrangler pages deploy --cwd apps/demo-retailer --branch main --commit-dirty
echo "Pages deploy finished: si-session-demo only."
