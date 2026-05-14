#!/usr/bin/env bash
# Deploy Optiview marketing site to Cloudflare Pages (si-session-marketing).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export VITE_SI_CDN_URL="${VITE_SI_CDN_URL:-https://cdn.optiview.ai}"
export VITE_SI_DEMO_URL="${VITE_SI_DEMO_URL:-https://demo.optiview.ai}"
export VITE_SI_DASHBOARD_URL="${VITE_SI_DASHBOARD_URL:-https://dashboard.optiview.ai}"
export VITE_SI_API_URL="${VITE_SI_API_URL:-https://api.optiview.ai}"

echo "Marketing URLs: CDN=$VITE_SI_CDN_URL DEMO=$VITE_SI_DEMO_URL API=$VITE_SI_API_URL DASHBOARD=$VITE_SI_DASHBOARD_URL"

pnpm --filter @si/marketing-site build
pnpm exec wrangler pages deploy --cwd apps/marketing-site --branch main --commit-dirty
echo "Pages deploy finished: si-session-marketing."
