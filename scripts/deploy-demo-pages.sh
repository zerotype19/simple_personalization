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

DEMO_GIT_SHA="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"
export VITE_GIT_SHA="${VITE_GIT_SHA:-$DEMO_GIT_SHA}"

if [[ -z "${VITE_SI_SNIPPET_VERSION:-}" ]]; then
  VITE_SI_SNIPPET_VERSION="$(
    curl -sf "${VITE_SI_SNIPPET_ORIGIN%/}/version.json" 2>/dev/null \
      | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{try{const j=JSON.parse(d);const c=(j.commit||'').slice(0,12);process.stdout.write(c||'');}catch{}})" \
      || true
  )"
fi
export VITE_SI_SNIPPET_VERSION="${VITE_SI_SNIPPET_VERSION:-$DEMO_GIT_SHA}"
export VITE_SI_SNIPPET_GIT_SHA="${VITE_SI_SNIPPET_GIT_SHA:-$VITE_SI_SNIPPET_VERSION}"
echo "Using VITE_SI_SNIPPET_VERSION=$VITE_SI_SNIPPET_VERSION (demo si.js cache-bust)"

VITE_SI_WORKER_URL="${VITE_SI_WORKER_URL}" \
  VITE_SI_SNIPPET_ORIGIN="${VITE_SI_SNIPPET_ORIGIN}" \
  VITE_SI_DEMO_USE_HOSTED_SNIPPET="${VITE_SI_DEMO_USE_HOSTED_SNIPPET}" \
  VITE_SI_DEMO_SNIPPET_INSPECTOR="${VITE_SI_DEMO_SNIPPET_INSPECTOR}" \
  VITE_SI_SNIPPET_VERSION="${VITE_SI_SNIPPET_VERSION}" \
  VITE_SI_SNIPPET_GIT_SHA="${VITE_SI_SNIPPET_GIT_SHA}" \
  VITE_GIT_SHA="${VITE_GIT_SHA}" \
  pnpm --filter @si/demo-retailer build
pnpm exec wrangler pages deploy --cwd apps/demo-retailer --branch main --commit-dirty
echo "Pages deploy finished: si-session-demo only."
