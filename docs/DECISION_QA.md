# Decision fixture QA

This document describes how we **regression-test decision quality** for the Experience Decision Runtime using root-level `decision-fixtures/`. The goal is to lock in realistic primaries, good suppression, and vertical specificity **without** growing another rules platform or persisting decisions to a database.

## What gets tested

1. **Primary decision** — surface, offer type, timing, message angle, confidence bands, optional partial fields (`action`, `friction`, `cta_label`).
2. **Null primaries** — early research or low-intent sessions that should not force a modal or hard CTA.
3. **Copy guardrails** — `forbidden_terms` and `bad-decisions.json` patterns must not appear in headline, body, CTA label, message angle, offer type, reasons, or evidence on the primary.
4. **Global weak-marketing guard** — All non-null primaries are scanned for cliché phrases (`unlock`, `frictionless`, `drive conversions`, …) via `globalWeakMarketingCopy.ts`. Failures are **fixture errors**, not runtime mutations.
5. **Regulated vertical safety** — Healthcare and financial-services fixtures may set `regulated_vertical_safety` in `expected-primary.json` to run additional regex checks on that same primary blob (vertical-specific disallowed phrases such as diagnosis/urgency vs. guaranteed approval / distress copy). This is additive to per-fixture `forbidden_terms`.
6. **Reason quality** — `required_reason_terms` when we need the model to cite specific evidence classes.
7. **Secondaries** — optional allow-list; global cap of **two** secondaries.
8. **Surface slots** — `surface_slots`, `hard_surfaces_must_not_show`, and `expected_surfaces_to_query` integrate with the same slot map used by `getExperienceDecision(surface_id)`.
9. **Realism hints (warnings only)** — `fixtureRealismHeuristics.ts` may append `! realism:` lines to the CLI report for thin copy; these do **not** fail fixtures.

Vitest also covers **credibility regressions** outside the JSON fixtures: distinct-page counts in playbook reasons (not raw `pages_viewed`), session-relative timeline clocks (`MM:SS` / `H:MM:SS`), activation payload `page.kind` normalization when the classifier is `unknown`, and NBA fallback copy that references distinct paths.

Implementation: `packages/sdk/src/decisioning/fixtures/` and Vitest `decision-fixtures.test.ts`.

## How to add a fixture

1. Pick a vertical folder under `decision-fixtures/<vertical>/`.
2. Create a new case directory (kebab-case id), e.g. `04-new-scenario/`.
3. Add the four files:
   - **`session-input.json`** — start from an existing case in the same vertical; adjust `site_environment`, phase, engagement, and signals until the runtime produces the decision you want to lock.
   - **`expected-primary.json`** — assert only what matters (surface + offer + timing is often enough). Use `primary_must_be_null` when the correct outcome is “no strong primary.”
   - **`bad-decisions.json`** — add substrings for anti-patterns you fear regressions on (generic ebook popup, diagnosis language, predatory finance copy, etc.).
   - **`why.md`** — explain commercial intent so future editors do not “fix” the test by weakening business logic.

4. Run locally:

   ```bash
   pnpm decision-fixtures
   pnpm test
   pnpm typecheck
   ```

5. If the engine legitimately changes ranking, **update the fixture or the recipe pack data** — not public types or collect schema — so the test reflects the new intended policy.

## Good vs bad decision examples

| Good | Bad |
|------|-----|
| Inline checklist for a returning evaluator in implementation phase | Generic “download our ebook” popup on first visit |
| Soft demo or comparison assist on pricing with hesitation | Hard “book demo now” modal before readiness signals |
| Help-me-choose module when comparison navigation is strong | Coupon modal when engagement is below the coupon recipe threshold |
| Eligibility / education guide when user signals plan interest | Diagnosis, prognosis, or “you may have…” style health claims |
| Card finder when comparing products | Push to full application with urgency when user is only researching rates/fees |
| Build-and-price assist on trim exploration | Dealer handoff when user is only in lifestyle discovery |
| Trade-in soft prompt when trade-in signals exist | Hard finance CTA on first inventory glance |
| Related content or soft newsletter for deep readers | Hard lead capture when there is no commercial intent |

## Commercial plausibility rubric

A fixture’s **expected** primary should pass this mental checklist:

1. **Phase fit** — Does the offer match discovery vs evaluation vs decision posture?
2. **Surface fit** — Is the chosen surface the lightest effective touch (inline vs secondary vs modal policy implied by slots)?
3. **Evidence** — Would a reasonable marketer defend this with the session signals in `session-input.json`?
4. **Reversibility** — If we are wrong, is the user annoyed for seconds, not minutes? (Prefer inline / defer over interrupt when confidence is mixed.)

Document the “why” in `why.md` so the rubric survives personnel changes.

## Suppression expectations

Suppression rules live in the runtime and packs; fixtures **assert outcomes**, not implementation. Typical expectations encoded in fixtures:

- Low confidence or early phase → **no** aggressive surfaces; null primary or content-level recommendations only.
- Healthcare / financial verticals → **no** urgency scams, creditworthiness judgments, or medical diagnostic language in user-facing copy.
- **At most two** secondary decisions so destinations stay bounded.

Use `surface_slots` when a specific surface must be `suppress` or `defer` for a scenario.

## Vertical safety rules

When authoring `bad-decisions.json` and `forbidden_terms`:

- **Healthcare** — forbid diagnosis-style claims, fear/panic framing, “you may have…”, “symptoms mean…”, risk/urgency countdowns, **guaranteed coverage**, and pushy scheduling (“schedule now”) on weak sessions; align copy with **`regulatedFixtureSafety`** + per-fixture `forbidden_terms`.
- **Financial services** — forbid **guaranteed approval**, **pre-approved**, **you qualify**, **improve your credit / bad credit** framing, **debt trouble / financial distress** exploitation, **creditworthiness** inference, urgency (“act now”, “urgent”, “limited time”, “don’t miss out”), and pushy **apply now** on non–conversion-ready sessions; prefer **comparison, rate/fee clarity, calculators, and trust** before **`application_soft_resume`**. Runtime suppression (`decisionSuppression.ts`) and **`regulatedFixtureSafety`** both scan finance copy; fixtures in **`financial-services/05-*` through `16-*`** lock the matrix.
- **Ecommerce** — merchandising doctrine, not coupon spam:
  - **Discounts are earned** — `price_promo_sensitivity` (or equivalent signals) must be present before `coupon_offer_secondary` / loyalty capture; comparison-led sessions without promo concepts stay on help-me-choose / PDP compare surfaces.
  - **Comparison before coupon** — fit/product uncertainty → `category_help_me_choose`, `pdp_comparison_module`, or `mobile_quick_compare`; never default coupon on weak confidence.
  - **Cart hesitation** — `shipping_returns_reassurance` / `cart_assist_inline` before discount unless promo sensitivity exists (`06-cart-hesitation-shipping-reassurance`).
  - **High-AOV** — `high_aov_confidence_module` + trust/review copy; forbid cheap urgency (`07-high-aov-confidence-module`).
  - **Mobile quick scan** — compact compare (`08-mobile-quick-scan-compact-compare`); exit/popup surfaces stay off for rapid scanners.
  - **Low-intent category** — often **null primary** (`09-low-intent-category-null`); no exit popup on shallow browse.
  - Forbidden patterns: “act now”, “last chance”, “limited time” (unless explicit promo fixture), “don’t miss out”, generic “unlock savings”, coupon popup on comparison-only sessions.
  - Fixture matrix **`decision-fixtures/ecommerce/04-*` through `13-*`** plus `01–03` locks comparison, coupon-secondary, cart reassurance, AOV trust, mobile compare, null browse, fit/variant, inventory, and anti-discount-spam outcomes against `surface-catalogs/ecommerce.json` + `experience-recipes/ecommerce.json`.
- **B2B SaaS** — forbid hard demo before evaluation signals; prefer inline implementation aids for late-stage technical visitors. The **`decision-fixtures/b2b-saas/05-*` through `16-*`** matrix locks integration, AI arrival, stakeholder alignment, comparison, ROI research pacing, progressive rollout study, earned walkthrough, workspace readiness, and thin-session restraint against `packages/shared/src/context-packs/surface-catalogs/b2b-saas.json` + `experience-recipes/b2b-saas.json`.
- **Auto OEM** — progress **model → trim → build/configure** before **dealer locator** or inventory handoff; forbid **“buy now”**, **“contact dealer now”**, and **“schedule test drive”** on early education sessions unless fixtures explicitly allow; avoid fake scarcity without inventory signals. **`decision-fixtures/auto-oem/04-*` through `15-*`** lock the realism matrix against `surface-catalogs/auto-oem.json` + `experience-recipes/auto-oem.json`.

## Regulated verticals (restraint-first)

Healthcare and financial services are **restraint-first** verticals: anonymous or uncertain sessions should default to **education, comparison, and trust** surfaces—not fear, pseudo-diagnosis, guaranteed approval, or hard conversion chrome.

**Healthcare doctrine (fixtures + packs):** anonymous decisions should **reduce uncertainty, not create urgency**—education and eligibility/coverage guidance **before** provider escalation; **appointment**-style prompts only after **earned readiness**; no fear, pseudo-diagnosis, or “urgent / don’t wait / at risk” posture in pack copy; medium-confidence sessions stay **inline / soft**, not hard-modal escapes.

**Financial services doctrine (fixtures + packs):** anonymous decisions should **build comparison confidence and trust**, not imply **approval**, **distress**, **urgency**, or **personal financial status**—comparison and rate/fee clarity **before** application pressure; **`application_soft_resume`** only when recipes gate **high readiness** and **`conversion_ready`** phase; eligibility copy stays **educational** (no “you qualify” / underwriting outcomes).

**Auto OEM doctrine (fixtures + packs):** anonymous decisions should help visitors move from **model education** toward **configuration confidence**—**not** jump to **dealer handoff** until **build, inventory, incentive, or dealer-intent** signals are earned; **`dealer_locator_soft_prompt`** stays recipe-gated to **high readiness** and dealer/test-drive concepts; copy avoids showroom-pressure phrases on pure research sessions.

Fixture coverage:

- **`healthcare/04-education-eligibility-soft-only`** — Education/eligibility-adjacent reading with **moderate readiness below** the eligibility-module recipe floor; expects **`education_inline_next_step`** / **`next_clinical_step_guide`**, `regulated_vertical_safety: "healthcare"`, and **`hard_surfaces_must_not_show`** for aggressive provider CTAs (e.g. `provider_discussion_cta`).
- **`healthcare/05-symptom-education-inline-reader` → `16-insurance-payment-coverage-helper`** — Realism matrix for the expanded healthcare surface catalog (`education_inline_next_step`, `eligibility_guidance_module`, `coverage_reassurance_inline`, `next_clinical_step_guide`, `doctor_conversation_guide`, `care_pathway_explainer`, `screening_education_module`, `insurance_coverage_helper`, `provider_discussion_cta`, `appointment_soft_prompt`) with **regulated_vertical_safety**, **`hard_surfaces_must_not_show`** where escalation must not earn `show`, and copy **`forbidden_terms`** aligned to the vertical lists above.
- **`financial-services/04-rate-fee-research-soft-only`** — Rate/fee comparison posture with engagement **below** the card-shopping primary recipe; expects **`finance_trust_compare_inline`** outcomes (`card_comparison_module`, **`rate_and_fee_explainer`**), `regulated_vertical_safety: "financial_services"`, and **`hard_surfaces_must_not_show`** for **`application_soft_resume`**.
- **`financial-services/05-card-comparison-confidence` → `16-distress-inference-forbidden`** — Expanded finance surface catalog with **`regulated_vertical_safety`**, **`hard_surfaces_must_not_show`** where application escalation is inappropriate, and copy **`forbidden_terms`** for approval/urgency/distress patterns.

- **`auto-oem/04-model-research-no-dealer` → `15-hard-dealer-handoff-forbidden`** — OEM realism matrix (discovery, trim, build, EV, family, payment, inventory transition, configurator resume, owner resources) with **`hard_surfaces_must_not_show`** on **`dealer_locator_soft_prompt`** where handoff is not earned, and copy **`forbidden_terms`** for dealer/test-drive pressure.

Runner logic for these cases lives in `packages/sdk/src/decisioning/fixtures/regulatedFixtureSafety.ts` (shared phrase lists) alongside `hard_surfaces_must_not_show` in `runFixture.ts`.

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm decision-fixtures` | CLI report: totals, pass/fail, expected vs actual, grouped mismatches / forbidden violations. Exits non-zero on failure. |
| `pnpm test:decisions` | Alias for the same script. |
| `pnpm test` | Full Vitest suite including `decision-fixtures.test.ts`. |
| `pnpm typecheck` | Workspace TypeScript check. |

Environment:

- `SI_DECISION_FIXTURES_ROOT` — optional absolute path to a fixtures directory (defaults to repo `decision-fixtures/`).

## Acceptance bar

- **≥ 85** fixture cases across verticals (includes the expanded B2B SaaS realism matrix, **13 ecommerce** merchandising cases, **16 healthcare** realism + restraint cases, **16 financial-services** cases, **15 auto OEM** cases including the OEM realism matrix, **3 auto retail** cases, and other verticals).
- `pnpm test`, `pnpm typecheck`, and `pnpm decision-fixtures` all succeed in CI and locally.

This layer is the quality gate for **what** the runtime chooses; pack and recipe edits should be justified by fixture deltas or new cases.
