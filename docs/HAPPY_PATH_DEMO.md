# Happy-path demo (inspector + dashboard)

Use this flow after `pnpm test` is green so numbers you narrate match the SDK, worker validation, and dashboard aggregates.

## Preconditions

- Demo retailer and worker pointed at the same collect URL (see `docs/CLOUDFLARE.md`).
- Open the **Session Intelligence** inspector on the demo site and the **dashboard** summary in parallel for one browser session.

## Flow A — Finance-led recommendation (matches tests)

1. In the demo, generate **finance interactions** (e.g. payment calculator) and light **VDP / CTA** activity without pushing intent to the generic “≥ 75” fallback alone—see `packages/sdk/src/__tests__/click-path-happy.test.ts` (“finance engagement…”).
2. In the inspector, confirm **treatment_hint** / copy path aligns with **payment_sensitive** when rules fire, or the same hint from `defaultRecommendation` when rules do not.
3. Trigger a collect (or wait for batch flush). On the dashboard, confirm the session row reflects the same **intent_score**, **journey_stage**, and **category_affinity** keys as the inspector (parity is asserted in the Batcher test).

## Flow B — Sedan affinity fallback

1. Bias **category_hits** toward sedan (many sedan keyword hits vs few SUV), then refresh scores so **category_affinity.sedan ≥ 0.36** (see sedan test in `click-path-happy.test.ts`).
2. Inspector should show **researcher** / sedan-oriented **next_best_action** when finance and SUV-family branches do not win.

## Flow C — Experiment + rule stacking (treatment arm)

1. Assign **treatment** variant (`treatment_id: t_high_intent`, `is_control: false`).
2. Drive **intent ≥ 70**, **urgency ≥ 50**, and **finance ≥ 1 or pricing_views ≥ 2** (see stacking test: `vdp_views: 1`, `pricing_views: 2`, `finance_interactions: 2`, `cta_clicks: 4`, `pages_viewed: 3`).
3. `selectTreatments` should list **t_high_intent** (experiment) and **t_payment_sensitive** (rule). Hero slots should reflect both priorities in DOM order.

## Dashboard / experiment math (automated)

- **Per-session aggregates**: `aggregateDashboardSummary` in `worker/src/analyticsMath.ts` mirrors the D1 summary CTE (dedupe by `session_id`, max converted, average intent/engagement per session, then global means). Covered in `worker/src/__tests__/analytics-math.test.ts`.
- **Experiment merge + lift**: `mergeExperiment` / `weightedAvg` — same file and tests.
- **Collect validation**: `validatePayload` — worker tests reject out-of-range affinity.

Run **`pnpm test`** before each demo; extend the test file when you add new product rules so the story stays provably accurate.
