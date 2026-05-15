# Optiview × your stack

These guides are **copy-paste oriented** for webmasters, growth, and personalization teams. They assume the [Session Intelligence snippet](https://optiview.ai/install) is already on the page (or you are testing on localhost with the same `si.js` embed).

**Contract:** Optiview emits a stable **`surface_id`** (e.g. `article_inline_mid`, `cart_assist_inline`) per vertical pack. Your CMS, tag manager, or experimentation layer **maps** those IDs to components, offers, or audiences. Optiview does **not** mutate your DOM unless **your** code does.

## Guides

| Guide | Best for |
|-------|----------|
| [Google Tag Manager](google-tag-manager.md) | dataLayer triggers, GA4-adjacent routing |
| [Adobe Target](adobe-target.md) | `targetPageParams`, profile / activity parameters |
| [Adobe Experience Platform Web SDK](adobe-aep-web-sdk.md) | Alloy `sendEvent`, XDM-friendly patterns |
| [Adobe Experience Manager (AEM)](adobe-aem.md) | Authorable components, `CustomEvent` listeners |
| [Optimizely](optimizely.md) | Event API, tags, audience attributes |
| [Shopify](shopify.md) | Theme app extension / Liquid + theme JS |
| [React / headless](react-headless.md) | Hooks, SSR-safe guards |
| [Webflow](webflow.md) | Embed + visibility / CMS-bound attributes |

**Hub:** [CMS activation examples / surface contract](../CMS_ACTIVATION_EXAMPLES.md) · **QA checklist:** [INTEGRATION_QA.md](../INTEGRATION_QA.md)

## Standard pattern (all stacks)

1. **Install** `si.js` once (async is fine).
2. **Read** `getExperienceDecisionEnvelope()` after `SessionIntel` / `boot` resolves.
3. **Subscribe** to updates for the surfaces you own (see note below).
4. **Render or hide** your UI from `getExperienceDecision(surfaceId)` — only show when `action === "show"` for your slot.
5. **Push** the same fields to your platform (GTM dataLayer, Target params, Optimizely event, etc.).
6. **Debug** with the Session Intelligence inspector and [INTEGRATION_QA.md](../INTEGRATION_QA.md).

### Important: `subscribeToDecision` receives the **full envelope**

The callback argument is an **`ExperienceDecisionEnvelope`**, not a single `ExperienceDecision`. On each meaningful update, use **`getExperienceDecision(surfaceId)`** to read the **slot** for the surface you care about (`show` / `suppress` / `none`).

```javascript
window.SessionIntel.subscribeToDecision("article_inline_mid", () => {
  const decision = window.SessionIntel.getExperienceDecision("article_inline_mid");

  if (decision?.action === "show") {
    // render mapped CMS / component surface
  } else {
    // hide or do nothing — Optiview is not asking for this slot
  }
});
```

**Copy-paste examples** live under `examples/integrations/` in this repo.
