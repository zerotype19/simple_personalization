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

## Privacy boundaries

- Session-scoped `commercial_intent` on `SessionProfile`
- Counts, stages, families — never clicked label text persisted
- Timeline uses buyer-safe milestone labels only

## Vertical examples

**Auto retail:** compare → finance calculator → schedule test drive → increasing momentum.

**B2B SaaS:** docs → pricing → security → schedule demo → validating then increasing.

**Ecommerce:** category → compare → reviews → add to cart → trust_validation if returns after cart.

## Tests

| Suite | Purpose |
|-------|---------|
| `commercialIntent.test.ts` | Phrase matching, DOM CTA weighting, form/page roles, buyer-safe copy |
| `__tests__/commercial-intent-replay.test.ts` | Vertical journey replay via `testUtils/buildCommercialIntentJourney.ts` |

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
- **Forms:** `classifyFormIntent` reads field **names, types, and button labels** only — never `input.value`.
- **Buyer copy:** `buildBuyerCommercialIntentRead` + `buyerCopySafety` filter taxonomy ids, engineering tokens, and unsafe CTA strings from inspector output.
- **Timeline:** `buyerSafeTimelineLabel` maps families to human milestones (e.g. “Moved toward an in-person test drive”).
