# Experience decision runtime — MVP architecture (locked)

This document freezes product and engineering decisions **before** building the anonymous experience decision layer. Goal: avoid a **second platform** (second rule engine, orchestration product, or analytics DB) inside Session Intelligence.

## Thesis (external)

**Optiview is a lightweight anonymous experience decision runtime that helps websites decide what to show visitors before identity exists.**

Not: identity resolution, full personalization platform replacement, passive analytics, or “anonymous insight OS.”

**Stack position:** a thin decision layer that **feeds** CMS and personalization systems you already use — not a CDP, not identity resolution, not a full Adobe-class orchestration suite.

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

## Runtime philosophy

The runtime is:

- **suppression-first** and interruption-aware
- **confidence-weighted** and explainable
- **conservative when uncertain**
- **timing-aware** (see [Decision timing](#decision-timing))
- oriented to **CMS / personalization activation**, not proprietary DOM orchestration

It may intentionally emit **no primary decision**, softer conversion paths, or **educational** recommendations instead of aggressive lead capture.

**No-decision is often better than a weak decision.**

## Decision cardinality

- **One `primary_decision`** — single best action right now.
- **Up to two `secondary_decisions`** — optional, ranked.
- **Not** open-ended `decisions[]` (avoids prioritization hell and accidental “mini Adobe Target”).

Event diffing and inspector UX target this shape only.

## Decision quality standard

A **valid** experience decision (one we emit to subscribers / destinations) should satisfy **most** of:

- **Session-specific** — grounded in this session’s behavior, not generic copy for every visitor
- **Evidence-backed** — traceable reasons / signals (for explainability and debugging)
- **Conversion-plausible** — tied to a realistic next step for the vertical and surface, not random CTAs
- **Context-differentiated** — varies by vertical / page / journey phase where the recipe pack allows
- **CMS-actionable** — a host can map `surface_id` + copy/offer fields to a component without guessing
- **Non-generic across surfaces** — same session should not get interchangeable “show a guide” on every `surface_id` without distinction
- **Confidence-weighted** — low confidence → suppress or soften (see [Suppression behavior](#suppression-behavior))
- **Suppressible** — weak or contradictory signals → no emit
- **Timing-aware** — includes timing guidance (see [Decision timing](#decision-timing))
- **Interruption-aware** — respects research vs conversion posture already in the profile

**Weak or generic decisions must not emit.** Prefer emitting nothing over burning trust with a hollow recommendation.

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

## Progressive offer hierarchy (philosophy)

The runtime should respect **ask intensity** — not every visitor should see the same conversion depth.

Illustrative ladder (exact labels live in recipe packs; this is strategic intent only):

| Visitor / session posture | Example offer types (low → higher ask) |
|---------------------------|----------------------------------------|
| **Low intent / early research** | article depth, framework explainer, checklist, light comparison |
| **Medium intent** | calculator, self-assessment, implementation guide, category comparison |
| **High intent** | demo request, lead form, pricing / quote, hard sales CTA |

Recipes choose the **appropriate rung** for current readiness and posture — not “popup everywhere.” Escalation across the session should be **earned** by behavior, not assumed.

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

## Decision timing

Every **emitted** decision includes **lightweight timing guidance** for CMS, GTM, Adobe, Optimizely, AEM, etc. — advisory only, not DOM orchestration baked into the snippet.

### v1 `timing` vocabulary (locked)

```ts
type DecisionTiming =
  | "immediate"
  | "after_scroll"
  | "next_navigation"
  | "exit_intent"
  | "idle";
```

Hosts map these to their own triggers (scroll %, route change, idle timers, exit overlays). Optiview does not own the timer implementation.

## Suppression behavior

**Suppression-first:** the runtime is explicitly allowed to conclude **“do nothing.”**

Suppress (emit **no** primary decision, or `action: "suppress"` / defer if represented in payload) when **any** of these hold, non-exhaustively:

- **Confidence too weak** or signals **contradictory**
- **Interruption risk high** — e.g. strong research posture, rapid bounce patterns, visitor likely overwhelmed
- **Similar decision already emitted** this session for the same `surface_id` / offer family (frequency / dedup)
- **Visitor already converting** — e.g. engaged hard CTA; don’t stack noisy asks
- **Readiness below recipe threshold** — wait or soften rather than push

**Suppression is a valid, sophisticated outcome** — not a failure mode.

## Geo / temporal (MVP)

**Yes (lightweight):** timezone, local hour, weekday/weekend, season, region/country when available without invasive APIs, coarse seasonal/tax/holiday-style **hints** as text or enum — not creepy personalization.

**No:** GPS / precise geolocation, IP enrichment vendors in MVP.

## In-session journey memory (MVP vs follow-on)

**MVP:** use existing journey constructs (path sequence, page journey, commercial phase, engagement / readiness, acquisition narrative) so decisions reflect **where the visitor is now**.

**Differentiation (follow-on):** emphasize **“what changed?”** in-session — narrowing exploration, repeated comparisons, revisits, acceleration vs hesitation, CTA avoidance, increasing specificity. That delta is high-signal for timing and suppression.

**Intent momentum** (below) becomes the natural home for **rate-of-change** once the core decision path ships — **do not block MVP** on it, but plan the schema so momentum can plug in without a breaking redesign.

## New signal (follow-on — not MVP-blocking)

**Intent momentum** — how fast intent compounds (rapid multi-page exploration, comparison acceleration, CTA proximity, narrowing focus). First-class score **after** core decision path ships; **do not block MVP** on it.

## Borrow / do not borrow

**Borrow:** Plausible-style lightweight + privacy clarity; David Wells–style **destination plugins**; Infobip-style operational SDK (events, subscribe, push).

**Do not borrow in MVP:** MCP-as-product, LLM runtime decisioning, identity / enrichment graphs, agent orchestration stacks.

## Related docs

Update marketing copy and implementation briefs to align with this file. Snippet install and `/collect` privacy posture stay unchanged until an explicit phase adds decision telemetry.
