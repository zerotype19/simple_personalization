# Decision fixture QA

This document describes how we **regression-test decision quality** for the Experience Decision Runtime using root-level `decision-fixtures/`. The goal is to lock in realistic primaries, good suppression, and vertical specificity **without** growing another rules platform or persisting decisions to a database.

## What gets tested

1. **Primary decision** — surface, offer type, timing, message angle, confidence bands, optional partial fields (`action`, `friction`, `cta_label`).
2. **Null primaries** — early research or low-intent sessions that should not force a modal or hard CTA.
3. **Copy guardrails** — `forbidden_terms` and `bad-decisions.json` patterns must not appear in headline, body, CTA label, message angle, offer type, reasons, or evidence on the primary.
4. **Reason quality** — `required_reason_terms` when we need the model to cite specific evidence classes.
5. **Secondaries** — optional allow-list; global cap of **two** secondaries.
6. **Surface slots** — `surface_slots` and `expected_surfaces_to_query` integrate with the same slot map used by `getExperienceDecision(surface_id)`.

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

- **Healthcare** — forbid diagnosis, risk, “you have”, treatment guarantees, countdown urgency tied to health outcomes.
- **Financial services** — forbid predatory urgency, implied approval, creditworthiness claims, distress exploitation.
- **Ecommerce** — forbid “act now” style pressure when the scenario calls for secondary loyalty treatment; match coupon recipes to engagement thresholds so comparison flows are not hijacked.
- **B2B SaaS** — forbid hard demo before evaluation signals; prefer inline implementation aids for late-stage technical visitors.

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

- **≥ 21** fixture cases across the seven verticals.
- `pnpm test`, `pnpm typecheck`, and `pnpm decision-fixtures` all succeed in CI and locally.

This layer is the quality gate for **what** the runtime chooses; pack and recipe edits should be justified by fixture deltas or new cases.
