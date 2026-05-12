# QA: Inspector panel, runtime, and dashboard

Automated checks live in `pnpm test` (Vitest): shared `demoMetrics`, worker `analyticsMath` + `validatePayload`, SDK scoring, click-path, observer, and `panel-dashboard-parity.test.ts`. Use this document for **manual** QA and traceability.

## Session Intelligence inspector (⌘/Ctrl+Shift+D)

| UI block | Field | Source in code | Sent to `/collect`? | Dashboard |
|----------|--------|------------------|---------------------|-----------|
| Session profile | Session ID | `session.ts` `loadOrCreateProfile` | Yes (`session_id`) | Stored on row; used to dedupe summary |
| | Journey stage | `scorer.ts` `pickJourneyStage` from signals + intent | Yes (`summary.journey_stage`) | Not in top summary cards today |
| | Page type | `site.ts` `inferPageContext` + observer route | No (payload has no top-level page type; batcher sends `summary` only) | — |
| | Persona | `rules.ts` `runRules` mutates `profile.persona` from `rule.set` | No (persona is **not** in `AnalyticsPayload.summary`) | Not shown on MVP dashboard |
| | Intent / Urgency / Engagement | `scorer.ts` `computeClampedScores` → `recomputeScores` | Yes (`summary.intent_score`, etc.) | Summary: **avg intent** and **avg engagement** (per-session dedupe, then global avg). **Urgency** is not aggregated on dashboard yet. |
| Live signals | pages, vdp, pricing, finance, compare, CTA, scroll, return, duration | `observer.ts`, `runtime.ts` `tick` category decay/hits | Yes (`summary.*` keys) | Experiments: **CTA CTR** = `SUM(cta_clicks)/SUM(pages)` per variant (row-sum, not session-level CTR). |
| Category affinity | Top 8 tags % | `mergeAffinityFromHits` in `scorer.ts` | Yes (`summary.category_affinity`) | Not in MVP dashboard table |
| Recommendation | Copy, confidence %, bullets | `rules.ts` + `recommender.ts` `chooseRecommendation` | No (recommendation is client-only unless you extend payload) | — |
| Active personalization | treatment ids + slots | `personalization.ts` `selectTreatments` / `applyTreatment` | First treatment id stored on ingest (`treatment_id` column from `active_treatments[0]`) | Experiment bucketing uses `experiment_json` |
| Experiment | experiment / variant / treatment / control | `experiments.ts` `assignExperiments` | Yes (`experiment_assignment`, `active_treatments`) | `handleExperiments` groups by experiment + variant |
| Lift preview | CTA + lead lines | `@si/shared/demoMetrics` `demoLiftPreviewCopy()` — **same seed** as worker `getDemoExperimentReports()` + `mergeExperiment` | N/A (UI only) | Dashboard experiment table = **demo seed + live D1 merge** |

### Persona gap (known)

Inspector shows **persona**, but the collect payload’s `summary` object does **not** include it. Dashboard SQL does not read persona today. To QA persona end-to-end for analytics, extend `AnalyticsPayload.summary` and worker ingest (out of scope for this MVP doc).

## Top strip (`SessionPersonalizationStrip`)

| UI | Source | Dashboard |
|----|--------|-----------|
| intent / urgency / engagement | Same as profile scores | Summary averages (intent + engagement only) |
| cta_clicks, finance_ix, pricing_views, vdp_views | `profile.signals` | CTR uses `cta_clicks` / `pages` |
| Rule dots | `evaluateExpression` on `DEFAULT_CONFIG.treatments` | Same thresholds drive which treatments apply in-session |

## Dashboard (`apps/dashboard`)

| Metric | Worker route | Definition |
|--------|--------------|------------|
| Sessions (unique), Conversions, Avg intent, Avg engagement | `GET /dashboard/summary` | D1 `per_session` CTE: per `session_id` take `MAX(converted)`, `AVG(intent_score)`, `AVG(engagement_score)` across rows, then global averages. Matches `aggregateDashboardSummary` in tests. |
| Variant sessions, CTA CTR, Conversion %, Avg engagement, Lift | `GET /dashboard/experiments` | **CTR** = total clicks ÷ total pages for all rows in that variant (see `rollupVariantCtaCtr` in tests). **Conversion** = distinct sessions with converted ≥ 1 ÷ distinct sessions (`rollupVariantConversionRate`). **Lift** = treatment vs merged control after `mergeExperiment` pools session-weighted rates. |

## Lead submit (conversion)

- **Inspector**: “Lead submit” in the lift preview is **labeling** the seeded **conversion_rate** lift (same as dashboard “Conversion %” column), not a separate metric.
- **Live conversions**: Demo fires `si:conversion` (`TestDrive.tsx` etc.); `SessionIntelRuntime.markConversion` sets `converted` on the next collect flush. Dashboard conversions count sessions with `converted = 1` in D1.

## Manual smoke (5 min)

1. Open demo → inspector **Live signals**; click a **`[data-si-price]`** block → `pricing_views` increments (see also observer Text-node fix).
2. Open **Signals** strip → same integers as inspector live block.
3. Trigger **payment-sensitive** rule (finance calculator or `finance_interactions`) → **persona** + **recommendation** confidence **0.74** in inspector; strip rule dots for `t_payment_sensitive` turn green.
4. Submit test-drive form → next collect shows `converted: true` → dashboard **Conversions** increases after refresh (unique session).
5. Dashboard **Experiments** with empty D1: numbers match inspector lift preview (seed from `@si/shared/demoMetrics`).
