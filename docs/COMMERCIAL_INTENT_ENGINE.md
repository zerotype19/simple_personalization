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

`packages/sdk/src/commercialIntent/commercialIntent.test.ts` — phrase matching, negative context, form/page roles, buyer-safe copy.
