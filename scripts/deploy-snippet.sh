#!/usr/bin/env bash
# Deploy only the snippet CDN Pages project (si-session-snippet → e.g. cdn.optiview.ai).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

URL="${VITE_SI_WORKER_URL:-${SI_WORKER_URL:-}}"
if [[ -z "${URL}" ]]; then
  echo "Set VITE_SI_WORKER_URL to your Worker API origin, e.g. https://api.optiview.ai" >&2
  exit 1
fi

export VITE_SI_WORKER_URL="${URL%/}"
export VITE_SI_SNIPPET_ORIGIN="${VITE_SI_SNIPPET_ORIGIN:-https://cdn.optiview.ai}"
if [[ -z "${SI_PUBLIC_INSPECTOR_CSS_URL:-}" ]]; then
  export SI_PUBLIC_INSPECTOR_CSS_URL="${VITE_SI_SNIPPET_ORIGIN%/}/si-inspector.css"
fi

echo "Building snippet CDN artifact (worker=$VITE_SI_WORKER_URL snippet_origin=$VITE_SI_SNIPPET_ORIGIN)"
pnpm build:snippet

pnpm exec wrangler pages deploy --cwd apps/snippet-cdn --branch main --commit-dirty
echo "Pages deploy finished: si-session-snippet only."
