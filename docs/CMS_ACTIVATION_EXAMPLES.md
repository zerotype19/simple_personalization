# CMS activation examples (experience decisions)

Use **`si:experience-decision`** or `window.SessionIntel.getExperienceDecision*` so your CMS, tag manager, or experimentation tool applies **only** what you approve — the tag does not auto-mutate the DOM.

## Vanilla JS — listen once

```js
window.addEventListener("si:experience-decision", (e) => {
  const env = e.detail;
  const d = env.primary_decision;
  if (!d || d.action === "suppress" || d.action === "none") return;
  // Map d.surface_id + d.headline / d.cta_label to your own slots.
});
```

## Google Tag Manager — Custom Event trigger

1. Trigger type: **Custom Event**, Event name: `si_experience_decision` (if you push to dataLayer) **or** use a **Custom Event** listener in a tag template that listens to `si:experience-decision` on `window`.
2. DataLayer push (optional) — call `SessionIntel.pushExperienceDecisionToDataLayer()` from a tag that runs **After** SessionIntel boot (`window.__siBootFromTag` promise).

```html
<script>
  window.__siBootFromTag?.then(() => {
    window.SessionIntel?.pushExperienceDecisionToDataLayer?.();
  });
</script>
```

## Adobe Client Data Layer (AEP-style)

```js
window.addEventListener("si:experience-decision", (e) => {
  window.adobeDataLayer = window.adobeDataLayer || [];
  window.adobeDataLayer.push({
    event: "optiviewExperienceDecision",
    optiview: e.detail,
  });
});
```

Or use `SessionIntel.pushExperienceDecisionToAdobeDataLayer()`.

## Optimizely Web

```js
window.addEventListener("si:experience-decision", (e) => {
  window.optimizely = window.optimizely || [];
  window.optimizely.push({
    type: "event",
    eventName: "si_experience_decision",
    tags: {
      surface_id: e.detail.primary_decision?.surface_id ?? null,
      confidence: e.detail.primary_decision?.confidence ?? null,
    },
  });
});
```

## React — subscribe after boot

```tsx
useEffect(() => {
  let unsub: (() => void) | undefined;
  window.__siBootFromTag?.then(() => {
    unsub = window.SessionIntel?.subscribeToAllDecisions?.((env) => {
      setDecision(env.primary_decision);
    });
  });
  return () => unsub?.();
}, []);
```

## AEM / CMS slot mapping

Map stable **`surface_id`** values from the [surface catalogs](SURFACE_CATALOGS.md) to authoring keys (e.g. `experienceFragment:pricing_assist`) in your delivery layer. Keep mapping server- or CDN-configured; the tag only **suggests** `surface_id` + copy fields.

## Shopify / headless

Treat the envelope as **input** to your theme app extension or Hydrogen loader — fetch product or promo data **yourself**; Optiview supplies **which surface** and **which message angle** to prefer.

## AEM / Target combined pattern

Use the decision as **input** to a Target mbox or AEM ContextHub key — e.g. set `digitalData.optiview = envelope` then read it in your existing launch rules.
