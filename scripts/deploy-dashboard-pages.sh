#!/usr/bin/env bash
# Deploy only the operator dashboard Pages project (si-session-dashboard).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

URL="${VITE_SI_WORKER_URL:-${SI_WORKER_URL:-}}"
if [[ -z "${URL}" ]]; then
  echo "Set VITE_SI_WORKER_URL or SI_WORKER_URL to your Worker origin (no trailing slash)." >&2
  exit 1
fi

export VITE_SI_WORKER_URL="${URL%/}"
VITE_SI_WORKER_URL="${VITE_SI_WORKER_URL}" pnpm --filter @si/dashboard build
pnpm exec wrangler pages deploy --cwd apps/dashboard --branch main --commit-dirty
echo "Pages deploy finished: si-session-dashboard only."
