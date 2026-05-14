# Experience decision runtime — MVP architecture (locked)

This document freezes product and engineering decisions **before** building the anonymous experience decision layer. Goal: avoid a **second platform** (second rule engine, orchestration product, or analytics DB) inside Session Intelligence.

## Thesis (external)

**Optiview is a lightweight anonymous experience decision runtime that helps websites decide what to show visitors before identity exists.**

Not: identity resolution, full personalization platform replacement, passive analytics, or “anonymous insight OS.”

**Stack position:** a thin decision layer that **feeds** CMS and personalization systems you already use — not a CDP, not identity resolution, not a full Adobe-class orchestration suite.

## Pipeline (single path)

```txt
signals → existing inference → activation opportunity → recipe match → experience decision → CMS activation
```

Recipes **match** on top of today’s concepts / playbooks / behavior / readiness — they do **not** replace or re-implement that stack. No nested boolean DSL; simple thresholds and required concepts only.

## Positioning (GTM)

**Sell (one sentence):** Optiview helps websites decide the **next best experience** before a visitor identifies themselves.

**Operational contrast:** Many personalization stacks are **identity-dependent**, **rules-heavy**, **slow to implement**, and **interruptive** for anonymous traffic. Optiview targets the gap: **session-scoped decisions** that existing CMS, GTM, Adobe, and Optimizely can consume **without** owning the full orchestration product.

**Do not sell as:** “we identify visitors,” “AI behavioral intelligence,” “personalization platform replacement,” or analytics / pseudo-CDP.

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

## What the product is (vs the inspector)

The **inspector** is a **sales, demo, and debug** surface — not the product customers buy.

What must be **excellent** for product–market fit:

1. **Decision quality** — nuanced, situational, commercially plausible (not generic “show a guide”).
2. **Decision timing** — correct *when*, not only *what* (see [Decision timing](#decision-timing); do not expand the taxonomy beyond the locked set).
3. **Integration simplicity** — trivial hooks: GTM listener, Adobe Target input, AEM / CMS slot mapping, Optimizely event, `CustomEvent`, small `subscribe` API.
4. **Trust** — suppression-first, null-primary when weak, explainable evidence — so teams are not afraid to ship it on anonymous traffic.

If those four are weak, no amount of “visitor intelligence” UI saves the category story.

## Runtime philosophy

The runtime is:

- **suppression-first** and interruption-aware
- **confidence-weighted** and explainable
- **conservative when uncertain**
- **timing-aware** (see [Decision timing](#decision-timing))
- oriented to **CMS / personalization activation**, not proprietary DOM orchestration

It may intentionally emit **no primary decision**, softer conversion paths, or **educational** recommendations instead of aggressive lead capture.

**No-decision is often better than a weak decision.** That restraint is strategically load-bearing: it builds **trust**, reduces **brand risk**, and avoids the over-trigger / over-fit failure mode common in personalization vendors.

### What the market needs (vs what it does not)

The wedge is **better anonymous decisions** — when to interrupt, when **not** to interrupt, appropriate **ask intensity**, which **surface** to activate vs leave quiet, when to **escalate** vs **suppress** — not more dashboards, raw visitor telemetry, or identity-adjacent enrichment for v1.

## Decision cardinality

- **One `primary_decision`** — single best action right now.
- **Up to two `secondary_decisions`** — optional, ranked.
- **Not** open-ended `decisions[]` (avoids prioritization hell and accidental “mini Adobe Target”).

Event diffing and inspector UX target this shape only.

## Global envelope vs slot-specific API

**Global session envelope** (e.g. full decision object / event `detail` for “everything this tick”):

- If there is **no strong** primary decision: set **`primary_decision: null`** and **`secondary_decisions: []`** (or omit secondaries).
- Do **not** fabricate a weak primary to “have something to show.”
- Optional human-readable context: **`suppression_summary`** (string) when useful — e.g. why nothing is being pushed yet.

Example:

```json
{
  "primary_decision": null,
  "secondary_decisions": [],
  "suppression_summary": "Signals are still forming; no strong activation decision yet."
}
```

**Slot-specific query** — `getExperienceDecision(surface_id)` (or equivalent):

- When that **surface was evaluated** and **intentionally suppressed** for clear reasons, return a **surface-scoped** object with **`action: "suppress"`** and **`suppression_reason`** (and `surface_id`).

Example:

```json
{
  "surface_id": "soft_popup",
  "action": "suppress",
  "suppression_reason": "Visitor appears to be researching; interruption risk is high."
}
```

**Rule of thumb:**

| Situation | Shape |
|-----------|--------|
| Nothing worth acting on globally / signals weak | **`primary_decision: null`** on the envelope |
| This **surface** was considered and we **choose** not to activate it | **`action: "suppress"`** on the slot result |

Do **not** use `action: "suppress"` on the global primary slot to mean “no good decision anywhere” — that stays **`null`**.

## Decision quality standard

A **valid** experience decision (one we emit to subscribers / destinations) should satisfy **most** of:

- **Session-specific** — grounded in this session’s behavior, not generic copy for every visitor
- **Evidence-backed** — traceable reasons / signals (for explainability and debugging)
- **Conversion-plausible** — tied to a realistic next step for the vertical and surface, not random CTAs
- **Context-differentiated** — varies by vertical / page / journey phase where the recipe pack allows
- **CMS-actionable** — a host can map `surface_id` + copy/offer fields to a component without guessing
- **Non-generic across surfaces** — same session should not get interchangeable “show a guide” on every `surface_id` without distinction
- **Confidence-weighted** — low confidence → **null primary** on the envelope or slot-level suppress (see [Suppression behavior](#suppression-behavior))
- **Suppressible** — weak or contradictory signals → **no primary emit** (`primary_decision: null`), not a fake “show” decision
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

## Confidence earns interruption (invariant)

**Decision confidence must earn interruption level.** This is an explicit system rule — not only implied by recipes.

| Confidence band (illustrative) | Allowed interruption / surfaces |
|-------------------------------|----------------------------------|
| **Low** | **Inline / educational only** — no popup, no hard CTA, no aggressive modal |
| **Medium** | **Soft CTA** — guides, comparisons, secondary surfaces, checklist-style asks |
| **High** | **Stronger asks** — demo, lead form, pricing / quote — only when evidence + readiness support it |

Violating this (e.g. low confidence + exit popup) undermines **brand safety**, **explainability**, and the answer to: *“Why should we trust your runtime on anonymous visitors?”*

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

**Suppression-first:** the runtime is explicitly allowed to conclude **“do nothing”** at the global level — express that as **`primary_decision: null`** (see [Global envelope vs slot-specific API](#global-envelope-vs-slot-specific-api)).

Use **`action: "suppress"`** only on **slot-scoped** results (e.g. `getExperienceDecision("soft_popup")`) when that **surface was evaluated** and we **intentionally** choose not to activate it, with a **`suppression_reason`**.

When **any** of these hold, non-exhaustively, prefer **null primary** globally and/or **suppress** on affected surfaces — not weak “show” decisions:

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

## Vertical realism (execution)

Vertical breadth supports **credible demos** — but if every vertical “feels the same,” trust collapses. For v1: **go deeper on decision realism per vertical** (archetypes, surfaces, ladders, interruption profiles, timing) rather than adding many new verticals. Quality of emitted decisions matters more than count of labels.

## New signal (follow-on — not MVP-blocking)

**Intent momentum** — how fast intent compounds (rapid multi-page exploration, comparison acceleration, CTA proximity, narrowing focus). First-class score **after** core decision path ships; **do not block MVP** on it.

## Borrow / do not borrow

**Borrow:** Plausible-style lightweight + privacy clarity; David Wells–style **destination plugins**; Infobip-style operational SDK (events, subscribe, push).

**Do not build in v1 (anti-patterns):** LLM orchestration or agent frameworks; reverse-IP / lead identity / person-level enrichment; heavy analytics or large “insight” dashboards; customer-editable visual rule builders; server-side orchestration beyond today’s Worker; cross-session ML or audience management products; MCP-as-core-product. The architecture doc is the guardrail — scope creep here destroys the wedge.

## Existential execution risks (posture, not features)

Success still depends on shipping: **(1)** decision copy that sounds like a thoughtful operator, not a template; **(2)** integration paths so simple that a marketer can wire one surface in an afternoon; **(3)** timing + suppression correctness over taxonomy richness; **(4)** frequent **`primary_decision: null`** framed as mature restraint, not failure; **(5)** vertical-specific realism so demos do not collapse into one generic voice.

## Related docs

Update marketing copy and implementation briefs to align with this file. Snippet install and `/collect` privacy posture stay unchanged until an explicit phase adds decision telemetry.
