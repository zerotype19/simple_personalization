# Experience decision runtime — MVP architecture (locked)

This document freezes product and engineering decisions **before** building the anonymous experience decision layer. Goal: avoid a **second platform** (second rule engine, orchestration product, or analytics DB) inside Session Intelligence.

## Thesis (external)

**Optiview is a lightweight anonymous experience decision runtime that helps websites decide what to show visitors before identity exists.**

Not: identity resolution, full personalization platform replacement, passive analytics, or “anonymous insight OS.”

## Pipeline (single path)

```txt
signals → existing inference → activation opportunity → recipe match → experience decision → CMS activation
```

Recipes **match** on top of today’s concepts / playbooks / behavior / readiness — they do **not** replace or re-implement that stack. No nested boolean DSL; simple thresholds and required concepts only.

## MVP cut line

| In MVP | Out of MVP (later) |
|--------|---------------------|
| Browser-only decisioning | Decision persistence / D1 analytics tables |
| Local event bus + `CustomEvent` | Cross-session learning |
| Surface/recipe packs in repo | Remote recipe editing / admin UI |
| Decision inspector (decision-first) | Server-side orchestration |
| Destination plugins (thin adapters) | Reverse-IP / enrichment providers |
| Decision payloads in memory + events | MCP / agent frameworks |

First win: **emit useful decisions** and **wire them to CMS / GTM / Adobe / Optimizely** — not more databases.

## Decision cardinality

- **One `primary_decision`** — single best action right now.
- **Up to two `secondary_decisions`** — optional, ranked.
- **Not** open-ended `decisions[]` (avoids prioritization hell and accidental “mini Adobe Target”).

Event diffing and inspector UX target this shape only.

## Surfaces vs presentation

Optiview recommends **what** to show on a **surface** the customer maps in their CMS — not “popup vs inline” as the core abstraction.

### v1 type direction (locked)

```ts
surface_id: string;        // required — primary CMS / customer integration contract
surface_type?: string;     // optional — grouping / reporting only, not required for integration
```

- **`surface_id`** — stable string the host wires to a component or slot (examples: `homepage_hero_secondary`, `article_inline_mid`, `product_comparison_module`, `soft_popup`). Custom values allowed.
- **`surface_type`** — optional taxonomy for analytics or UI grouping later (examples: `hero`, `inline_cta`, `popup`, `recommendation_module`, `form`). **Not** required for MVP integrations.

Customer owns **DOM / component implementation**; we own **message angle, offer, timing guidance, suppression, priority, confidence, reasons**.

## Recipes (lightweight)

Declarative only — **no** nested `all`/`or` trees, no custom expression language.

Good:

```json
{
  "verticals": ["b2b_saas"],
  "min_engagement": 50,
  "required_concepts": ["implementation_readiness"],
  "max_cta_clicks": 0
}
```

Bad: arbitrary boolean DSL or second inference engine.

## Geo / temporal (MVP)

**Yes (lightweight):** timezone, local hour, weekday/weekend, season, region/country when available without invasive APIs, coarse seasonal/tax/holiday-style **hints** as text or enum — not creepy personalization.

**No:** GPS / precise geolocation, IP enrichment vendors in MVP.

## New signal (follow-on — not MVP-blocking)

**Intent momentum** — how fast intent signals compound (rapid multi-page exploration, comparison acceleration, CTA proximity). Plan as a first-class score **after** core decision path ships; **do not block MVP** on it.

## Borrow / do not borrow

**Borrow:** Plausible-style lightweight + privacy clarity; David Wells–style **destination plugins**; Infobip-style operational SDK (events, subscribe, push).

**Do not borrow in MVP:** MCP-as-product, LLM runtime decisioning, identity / enrichment graphs, agent orchestration stacks.

## Related docs

Update marketing copy and implementation briefs to align with this file. Snippet install and `/collect` privacy posture stay unchanged until an explicit phase adds decision telemetry.
