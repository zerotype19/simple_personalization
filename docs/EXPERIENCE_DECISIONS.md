# Experience decisions (browser-local)

Optiview’s hosted async tag (`si.js`) runs a **session-scoped Experience Decision** layer on top of the existing Session Intelligence profile. Decisions are **computed locally** after each profile tick — **no network round trip** is required for the first (or any) envelope.

## Constraints (hosted tag)

1. **Do not block page load** — boot stays async; scoring uses existing tick path.
2. **Do not require server calls before the first decision** — recipes and surface catalogs are bundled JSON.
3. **Do not rewrite the DOM by default** — consumers wire GTM / Adobe / Optimizely / CMS from events or `getExperienceDecision`.
4. **Session-scoped only** — no server persistence of decisions in this phase.

## Types (`@si/shared`)

- `ExperienceDecisionEnvelope` — `event: "si_experience_decision"`, `session_id`, `generated_at`, `primary_decision` (nullable), `secondary_decisions` (≤2), optional `suppression_summary`.
- `ExperienceDecision` — `surface_id`, optional `surface_type`, `action`, copy fields, `timing`, `friction`, `confidence`, `reason[]`, `evidence[]`, `ttl_seconds` / `expires_at`, `privacy_scope: "session_only"`, `visitor_status: "anonymous"`.

## Global vs slot behavior

- **Envelope (`getExperienceDecisionEnvelope`)** — if nothing is strong enough, `primary_decision` is **`null`** (intentional restraint). `suppression_summary` explains why.
- **Slot (`getExperienceDecision(surface_id)`)** — may return `action: "suppress"` when that catalog surface was evaluated and intentionally held back; otherwise `show` / `none` as appropriate.

## `window.SessionIntel` API

| Method | Purpose |
|--------|---------|
| `getExperienceDecisionEnvelope()` | Latest envelope (clone). |
| `getExperienceDecision(surface_id)` | Per-surface decision / suppress / none. |
| `getAllExperienceDecisions()` | All slot decisions for surfaces in the vertical catalog. |
| `subscribeToDecision(surface_id, cb)` | Callback when the envelope **meaningfully** changes (see below). |
| `subscribeToAllDecisions(cb)` | Same for all surfaces. |
| `pushExperienceDecisionToDataLayer()` | Pushes flattened `si_experience_decision` payload to `window.dataLayer`. |
| `pushExperienceDecisionToAdobeDataLayer()` | Same for `window.adobeDataLayer`. |
| `pushExperienceDecisionToOptimizely()` | Pushes an Optimizely-style event object. |

## Browser event

```js
window.addEventListener("si:experience-decision", (e) => {
  const envelope = e.detail; // ExperienceDecisionEnvelope
});
```

**Meaningful change** (subscriptions and CustomEvent): primary null ↔ non-null, `surface_id`, `action`, `offer_type`, `message_angle`, confidence delta ≥ **0.10**, or `suppression_summary` change. Not every tick.

## Staging / trust

`BootOptions.experienceDecisionMode: "observe_only"` keeps **`primary_decision` null** while still running matchers internally — useful for enterprise pilots.

## Files (implementation)

- Decision engine: `packages/sdk/src/decisioning/`
- Packs: `packages/shared/src/context-packs/experience-recipes/*.json`, `surface-catalogs/*.json`
- Barrel: `@si/shared/experiencePacks`
