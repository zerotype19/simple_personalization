# Integration QA checklist

Use this before shipping Optiview to production alongside GTM, Adobe, Optimizely, or CMS-driven surfaces.

## Repo drift guard

From the monorepo root, run **`pnpm check:integrations`** so `docs/integrations/` and `examples/integrations/` stay aligned with the public **`SessionIntel`** API (subscribe envelope vs per-surface decision, show gating, no banned storage APIs in examples, etc.).

## 1. Script loads

- [ ] `si.js` returns **200** (network tab) and does not block LCP (load **async**, place per [Install](https://optiview.ai/install)).
- [ ] `data-si-key` / `data-si-site` match your tenant (no console errors from boot).
- [ ] **`window.SessionIntel`** exists after `bootFromScriptTag` resolves (`__siBootFromTag` promise on hosted tag).

## 2. Read envelope

- [ ] **`SessionIntel.getExperienceDecisionEnvelope()`** returns an object with `event: "si_experience_decision"`, `session_id`, and `primary_decision` (may be `null` — restraint is valid).
- [ ] On thin sessions, **null primary** + `suppression_summary` is expected; not a failure.

## 3. Events fire

- [ ] **`si:experience-decision`** fires when the envelope **meaningfully** changes (optional `window.addEventListener` check).
- [ ] Phase C (optional): **`si:decision-transition`** / **`si:decision-suppressed`** if you wired automation to those.

## 4. Surface renders once

- [ ] Your listener uses **`getExperienceDecision(surfaceId)`** and only renders when **`action === "show"`**.
- [ ] Guard against double injection (idempotent mount, e.g. `data-si-mounted` on container, or framework key).
- [ ] No duplicate **dataLayer** pushes for the same user-visible state unless your tag design intentionally fires on every tick (default **pushExperienceDecisionToDataLayer** pushes current envelope only when **you** call it — pair with subscribe if needed).

## 5. Suppression works

- [ ] When **`getExperienceDecision(surfaceId).action`** is **`suppress`** or **`none`**, your UI **hides** or does not mount.
- [ ] **`suppression_summary`** in the envelope explains restraint when primary is null (inspector + replay help).

## 6. No unintended DOM mutation

- [ ] Optiview **does not** insert CMS offer markup into arbitrary regions; only **your** code mutates DOM for activation.
- [ ] Confirm no third-party script conflict (CSP, Trusted Types) — see inspector error hints if panel fails to render.

## Quick console probes

```javascript
window.SessionIntel.getExperienceDecisionEnvelope();
window.SessionIntel.getExperienceDecision("article_inline_mid");
```

Replace **`article_inline_mid`** with a **`surface_id`** from your vertical’s catalog ([SURFACE_CATALOGS.md](SURFACE_CATALOGS.md)).

## References

- [CMS activation examples / surface contract](CMS_ACTIVATION_EXAMPLES.md)
- [Decision replay / observability](DECISION_REPLAY.md)
- [integrations/](integrations/README.md)
