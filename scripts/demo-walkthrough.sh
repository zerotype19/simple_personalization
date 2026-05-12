#!/usr/bin/env bash
# Smoke-check live demo + dashboard + Worker, and print the manual demo checklist.
# Usage (repo root):
#   ./scripts/demo-walkthrough.sh
#   SI_WORKER_URL=https://....workers.dev ./scripts/demo-walkthrough.sh
#   ./scripts/demo-walkthrough.sh --open    # macOS: open demo + dashboard in browser
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Defaults match typical Pages project URLs; override for your account.
SI_DEMO_URL="${SI_DEMO_URL:-https://si-session-demo.pages.dev}"
SI_DASH_URL="${SI_DASH_URL:-https://si-session-dashboard.pages.dev}"
SI_WORKER_URL="${SI_WORKER_URL:-https://session-intelligence-worker.kevin-mcgovern.workers.dev}"

OPEN_BROWSER=false
for arg in "$@"; do
  if [[ "$arg" == "--open" ]]; then OPEN_BROWSER=true; fi
done

echo ""
echo "=== Session Intelligence — demo walkthrough helper ==="
echo "Demo:    $SI_DEMO_URL"
echo "Dashboard: $SI_DASH_URL"
echo "Worker:  $SI_WORKER_URL"
echo ""

code() {
  curl -sS -o /dev/null -w "%{http_code}" "$1" || echo "000"
}

echo "--- HTTP smoke (expect 200) ---"
printf "  Worker /config:          "
c1="$(code "${SI_WORKER_URL}/config")"
echo "$c1"
printf "  Worker /dashboard/summary: "
c2="$(code "${SI_WORKER_URL}/dashboard/summary")"
echo "$c2"
printf "  Worker /dashboard/experiments: "
c3="$(code "${SI_WORKER_URL}/dashboard/experiments")"
echo "$c3"
printf "  Pages demo (GET /):     "
c4="$(code "${SI_DEMO_URL}/")"
echo "$c4"
printf "  Pages dashboard (GET /): "
c5="$(code "${SI_DASH_URL}/")"
echo "$c5"

if [[ "$c1" != "200" || "$c2" != "200" || "$c3" != "200" || "$c4" != "200" || "$c5" != "200" ]]; then
  echo ""
  echo "Warning: at least one check did not return 200. Fix SI_WORKER_URL / SI_DEMO_URL / SI_DASH_URL and retry."
fi

if command -v jq >/dev/null 2>&1; then
  echo ""
  echo "--- Worker /dashboard/summary (subset) ---"
  curl -sS "${SI_WORKER_URL}/dashboard/summary" | jq '{sessions_ingested, conversions, avg_intent, avg_engagement}'
else
  echo ""
  echo "(Install jq to pretty-print summary JSON.)"
  echo "Raw summary (first 400 chars):"
  curl -sS "${SI_WORKER_URL}/dashboard/summary" | head -c 400
  echo ""
fi

echo ""
echo "--- Manual steps (do in browser; full detail: docs/DEMO_WALKTHROUGH.md) ---"
cat <<STEPS
  1. Open ${SI_DEMO_URL} — wait for home to load (SDK boots to Worker).
  2. Open inspector: Ctrl+Shift+D (Win/Linux) or Control+Shift+D (Mac).
  3. Browse: Home → Inventory → a vehicle (VDP) → Finance; optional Compare / Trade-in.
  4. Open ${SI_DASH_URL} — refresh; note Sessions (unique) and other metrics.
  5. In demo: Test drive → Submit demo lead (conversion). Dismiss alert.
  6. Refresh dashboard — Conversions should reflect session-level data (may include other traffic).
STEPS

if [[ "$OPEN_BROWSER" == true ]]; then
  if command -v open >/dev/null 2>&1; then
    open "$SI_DEMO_URL" "$SI_DASH_URL"
    echo ""
    echo "Opened demo and dashboard in default browser (--open)."
  else
    echo ""
    echo "'open' not found (not macOS?). Open URLs manually."
  fi
fi

echo ""
echo "Done."
