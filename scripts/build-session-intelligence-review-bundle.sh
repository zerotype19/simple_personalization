#!/usr/bin/env bash
# Regenerates session-intelligence-review-bundle.zip at the repo root.
# Run from anywhere: bash scripts/build-session-intelligence-review-bundle.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
OUT="session-intelligence-review-bundle.zip"
README="INTELLIGENCE_BUNDLE_README.txt"

cat >"$README" <<'EOF'
Session Intelligence — review bundle (logic, taxonomy, classification, playbooks)
==================================================================================

Paths in this archive are relative to the repository root.

Includes context-packs (playbooks, concepts, verticals, taxonomies, activation-mappings,
stopwords), contextBrain, integrationDocs signal catalog, shared types/presets/demo
metrics, siteIntelligence, siteSemantics (incl. CTA classifier + playbook matcher),
siteEnvironment, recommendation (incl. archetypes), rules engine + scorer + observer,
session/recommender wiring, and selected unit tests.

Excludes: runtime, inspector UI, worker, dashboard, IIFE.
EOF

rm -f "$OUT"

zip -q -r "$OUT" \
  "$README" \
  docs/reference-site-archetypes.md \
  docs/reference-site-archetypes \
  fixtures/README.md \
  packages/shared/src/context-packs \
  packages/shared/src/contextBrain \
  packages/shared/src/integrationDocs/signal-catalog.json \
  packages/shared/src/index.ts \
  packages/shared/src/presetConfigs.ts \
  packages/shared/src/demoMetrics.ts \
  packages/shared/src/demoMetrics.test.ts \
  packages/sdk/src/siteIntelligence \
  packages/sdk/src/siteSemantics \
  packages/sdk/src/siteEnvironment \
  packages/sdk/src/recommendation \
  packages/sdk/src/contextBrain \
  packages/sdk/src/site.ts \
  packages/sdk/src/rules.ts \
  packages/sdk/src/recommender.ts \
  packages/sdk/src/scorer.ts \
  packages/sdk/src/observer.ts \
  packages/sdk/src/__tests__

rm -f "$README"
echo "Wrote $ROOT/$OUT ($(wc -c <"$OUT" | tr -d ' ') bytes)"
