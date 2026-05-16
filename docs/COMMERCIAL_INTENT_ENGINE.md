# Commercial Intent Interpretation Engine

Deterministic semantic interpretation of anonymous commercial behavior — **not** an ML layer, LLM runtime, or identity product.

## What it is

A phrase-pack-driven pipeline:

```txt
DOM interaction / path / form structure
→ commercial action classification
→ momentum + blocker inference
→ session commercial_intent memory
→ existing experience decision runtime
```

## What it is not

- Not embeddings or vector search
- Not winkNLP / franc / compromise in `si.js`
- Not cross-session identity
- Not raw text storage (no form values, no search queries)

## Taxonomy packs

Located in `packages/shared/src/context-packs/commercial-intent/`:

| File | Purpose |
|------|---------|
| `action-taxonomy.json` | CTA/action families, stages, friction, phrases |
| `multilingual-phrases.json` | Core families in en/es/fr/de/it/pt/nl |
| `blocker-taxonomy.json` | Objection categories + path hints |
| `page-role-taxonomy.json` | URL/title role hints |

## SDK modules

`packages/sdk/src/commercialIntent/`:

- `classifyCommercialAction` — label/href/aria matching
- `classifyCtaElement` — DOM context + counting rules
- `classifyFormIntent` — form field **names/labels only**
- `classifyPageRole` — path + page semantics
- `inferCommercialBlockers` — active objections
- `inferJourneyMomentum` — increasing / validating / hesitating
- `updateCommercialIntentMemory` — session memory
- `updateCommercialIntentFromForm` — form submit → memory + `form_type_counts`
- `buyerSafeFormTimelineLabel` — buyer-safe form milestone copy

## Form submit wiring

On every `submit` (capture phase), `observer.ts` classifies the form with `classifyFormIntent` and updates `commercial_intent` via `updateCommercialIntentFromForm`. **No field values are read** — only structure (action URL, method, names, labels, placeholders, autocomplete, submit text, types, data attributes).

| Form type | Timeline label (examples) | Memory emphasis |
|-----------|---------------------------|-----------------|
| lead | Submitted a lead or contact form | human escalation, high intent |
| application | Moved into an application flow | commitment, high intent |
| appointment | Moved toward scheduling… | human escalation (auto → test drive family) |
| eligibility | Requested eligibility or coverage guidance | qualification |
| checkout | Moved toward checkout | commitment, high intent |
| quote | Requested a quote… | qualification |
| support | Submitted a support or help request | trust validation |
| search | Submitted a search | low exploration; also increments `onsite_search_events` |
| newsletter | Signed up for updates… | low exploration (does not over-escalate) |

Dedupe keys: `form:<form_type>`. Buyer read uses `form_type_counts` qualitatively — never field names or raw action URLs.

## Privacy boundaries

- Session-scoped `commercial_intent` on `SessionProfile` (stored in **sessionStorage** via `si:session`, not cookies)
- Counts, stages, families — never clicked label text persisted
- Timeline uses buyer-safe milestone labels only

### Browser storage (not part of commercial intent, but relevant to privacy reviews)

| Mechanism | Key | What is stored |
|-----------|-----|----------------|
| **sessionStorage** | `si:session` | Full anonymous `SessionProfile`, including `commercial_intent` |
| **sessionStorage** | `si:exp_progression` | Experience progression memory |
| **localStorage** | `si:returning` | **Only** localStorage key: prior-visit timestamp for return-visit detection on the **current origin** — not identity stitching, not cross-site |

Optiview does **not** use cookies for visitor tracking, fingerprinting, or cross-site identity graphs. See [PRIVACY_QA.md](./PRIVACY_QA.md) and [CUSTOMER_INSTALL.md](./CUSTOMER_INSTALL.md).

## Vertical examples

**Auto retail:** compare → finance calculator → schedule test drive → increasing momentum.

**B2B SaaS:** docs → pricing → security → schedule demo → validating then increasing.

**Ecommerce:** category → compare → reviews → add to cart → trust_validation if returns after cart.

## How intent influences decisions

Commercial intent is not inspector-only. After recipe matching, `commercialIntentDecisionCoupling.ts` applies **bounded** confidence deltas (max **+0.12** / **−0.18**) and optional commercial holdbacks before ranking:

| Signal | Effect |
|--------|--------|
| **Strongest action family** | Nudges recipes whose surfaces/angles align (e.g. finance → `finance_payment_assist`, compare → comparison modules). |
| **Active blockers** | Favor the blocker’s response family (pricing → ROI/rate explainer, integration → integration summary, etc.). Penalize hard escalation when finance or human-contact hesitation is active. |
| **Momentum** | `validating` / `hesitating` / `regressing` bias toward reassurance and away from modals; `increasing` allows progression only when readiness supports it. |
| **Regulated verticals** | Healthcare and financial services add extra restraint (no urgency/approval pressure; appointment/application only when earned). |

Hard suppression in `decisionSuppression.ts` always wins — commercial coupling **cannot** bypass confidence floors, regulated safety, or progression gates.

Buyer-facing “why” bullets come from `buildCommercialIntentDecisionReasons` (plain language, no taxonomy ids).

Implementation: `packages/sdk/src/decisioning/commercialIntentDecisionCoupling.ts`, wired in `experienceDecisionPipeline.ts`.

## Tests

| Suite | Purpose |
|-------|---------|
| `commercialIntent.test.ts` | Phrase matching, DOM CTA weighting, form/page roles, buyer-safe copy |
| `formSubmitCommercialIntent.test.ts` | Form structure classification, memory/timeline/buyer copy, no `.value` usage |
| `__tests__/commercial-intent-replay.test.ts` | Vertical journey replay via `testUtils/buildCommercialIntentJourney.ts` |
| `decisioning/commercialIntentDecisionCoupling.test.ts` | Bounded deltas, suppression, regulated restraint, ranking shifts per vertical |
| `decision-fixtures/auto-retail/14-compare-finance-intent-coupling` | Fixture: finance intent + blocker → payment assist primary |
| `decision-fixtures/b2b-saas/20-integration-trust-intent-coupling` | Fixture: integration blocker → integration summary, not walkthrough |
| `decision-fixtures/financial-services/17-rate-fee-intent-coupling` | Fixture: finance intent + pricing uncertainty → rate/fee explainer |
| `decision-fixtures/healthcare/17-eligibility-intent-coupling` | Fixture: eligibility intent → eligibility guidance, not appointment push |

### How we test commercial intent journeys

Journey tests **do not use the live DOM** unless exercising `classifyCtaElement` / `classifyFormIntent` negatives. The helper `buildCommercialIntentJourney(vertical, steps)` replays:

1. `classifyCommercialAction` (and optional `data-si-cta` / `data-si-intent` overrides)
2. `updateCommercialIntentMemory`
3. `applyCommercialIntentTick` (page-role refresh + blocker/momentum recompute)
4. `inferCommercialBlockers` / `inferJourneyMomentum`
5. `buildBuyerCommercialIntentRead`

Assertions focus on **memory + momentum + buyer copy** telling a believable story — not isolated classifier unit scores.

Run:

```bash
pnpm test
pnpm typecheck
pnpm decision-fixtures
```

### Vertical journey examples (replay fixtures)

| Vertical | Click / path sequence | Expected memory story |
|----------|----------------------|------------------------|
| **Auto retail** | Compare → finance/payment → test drive | `comparison` → `qualification` → `human_escalation`; `financing_or_payment_uncertainty` before drive; `schedule_test_drive` strongest; increasing momentum; buyer copy mentions human / in-person movement |
| **B2B SaaS** | Integrations → security → pricing → demo | `integration_concern` or `trust_security_concern`; deepens to `human_escalation`; `schedule_demo` strongest; buyer copy mentions implementation / trust / human contact |
| **Ecommerce** | Compare → reviews → shipping → cart | `shipping_returns_uncertainty` or trust blocker; validating/increasing momentum; `add_to_cart` strongest; no discount-first copy |
| **Healthcare** | Article → eligibility → request info | `coverage_or_eligibility_uncertainty`; restrained copy (no diagnosis / fear / urgency) |
| **Finance** | Rates/fees → calculator → apply | `pricing_uncertainty` or `application_friction`; qualification/commitment stages; no approval/distress/urgency language |

### Privacy guardrails (tests + runtime)

- **Persisted:** action family counts, stage sequence, blocker ids, momentum direction — never raw clicked label text.
- **Forms:** `classifyFormIntent` reads field **names, types, and button labels** only — never `input.value` or `textarea.value`. Submit wiring in `observer.ts` uses the same boundary; timeline and buyer copy never include form action URLs or field names.
- **Buyer copy:** `buildBuyerCommercialIntentRead` + `buyerCopySafety` filter taxonomy ids, engineering tokens, and unsafe CTA strings from inspector output.
- **Timeline:** `buyerSafeTimelineLabel` maps families to human milestones (e.g. “Moved toward an in-person test drive”).
- **Privacy QA:** [PRIVACY_QA.md](./PRIVACY_QA.md) — manual and CI checks before external beta.
