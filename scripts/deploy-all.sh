#!/usr/bin/env bash
# Worker, then snippet CDN, then demo, then dashboard — full production push.
# Snippet is deployed before the demo so the demo's CDN bridge can load si.js.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

URL="${VITE_SI_WORKER_URL:-${SI_WORKER_URL:-}}"
if [[ -z "${URL}" ]]; then
  echo "Set VITE_SI_WORKER_URL or SI_WORKER_URL." >&2
  exit 1
fi

export VITE_SI_WORKER_URL="${URL%/}"
export VITE_SI_SNIPPET_ORIGIN="${VITE_SI_SNIPPET_ORIGIN:-https://cdn.optiview.ai}"

pnpm deploy:worker
pnpm deploy:snippet
pnpm deploy:demo
pnpm deploy:dashboard
pnpm deploy:marketing
echo "Full deploy finished (worker + snippet + demo + dashboard + marketing)."
