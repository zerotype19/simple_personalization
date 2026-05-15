# Optiview × Adobe Target (at.js)

Pass Optiview **primary** (or per-surface) decisions into Target **profile** or **activity** parameters so experiences align with Session Intelligence restraint and progression.

## 1. Install snippet

Load [Session Intelligence](https://optiview.ai/install) **before** or alongside `at.js` per your Adobe guidance. Example async tag:

```html
<script async src="https://cdn.optiview.ai/si.js"
  data-si-site="YOUR_SITE_SLUG"
  data-si-key="YOUR_PUBLISHABLE_KEY"></script>
```

## 2. Read decision envelope

```javascript
var env = window.SessionIntel.getExperienceDecisionEnvelope();
var primary = env && env.primary_decision;
```

## 3. Subscribe to surface decision

```javascript
window.SessionIntel.subscribeToDecision("article_inline_mid", function () {
  var slot = window.SessionIntel.getExperienceDecision("article_inline_mid");
  if (slot.action === "show") {
    // e.g. reveal AEM region, React slot, or Shopify block (your code)
  }
});
```

## 4. Render or suppress (surface mapping)

**Surface → Target mapping:** use **`surface_id`** as a stable key in your Offer Library / activity. Example mental model:

| Optiview `surface_id` | Target Mbox / location | Notes |
|------------------------|------------------------|--------|
| `article_inline_mid` | `article-mid` | Content fragment |
| `cart_assist_inline` | `cart-inline` | Cart reassurance |

Only call Adobe APIs that **show** the experience when Optiview’s **`action === "show"`** for that slot.

## 5. Push decision — `targetPageParams` (at.js)

After Optiview updates, merge parameters **before** the relevant `getOffer` / page load that should see them:

```javascript
function siMergeTargetPageParams() {
  var env = window.SessionIntel.getExperienceDecisionEnvelope();
  var p = env && env.primary_decision;
  if (!p) return;

  window.targetPageParams = window.targetPageParams || function () {
    return {};
  };

  var prev = typeof window.targetPageParams === "function"
    ? window.targetPageParams()
    : window.targetPageParams || {};

  return Object.assign({}, prev, {
    si_surface_id: p.surface_id,
    si_action: p.action,
    si_offer_type: p.offer_type,
    si_message_angle: p.message_angle,
    si_timing: p.timing,
    si_confidence: p.confidence
  });
}

window.SessionIntel.subscribeToAllDecisions(function () {
  window.targetPageParams = function () { return siMergeTargetPageParams(); };
  if (typeof adobe !== "undefined" && adobe.target) {
    adobe.target.triggerView && adobe.target.triggerView(window.location.pathname);
  }
});
```

**Note:** Exact Target APIs depend on SPA vs MPA; adjust `triggerView` / `applyOffer` to your integration. The **field names** above are suggestions — map into your **Profile / Parameter** schema consistently.

### Adobe Data Layer helper

If you use the **Adobe Client Data Layer** (not only `targetPageParams`):

```javascript
window.SessionIntel.pushExperienceDecisionToAdobeDataLayer();
```

## 6. Debug checklist

- [ ] `targetPageParams` reflects latest **`primary_decision`** after subscribe tick.
- [ ] Per-surface UI still gated with **`getExperienceDecision(surfaceId)`** if primary != slot.
- [ ] No duplicate `applyOffer` without idempotency guard.
- [ ] **`INTEGRATION_QA.md`**.

## Related

- [AEP Web SDK (Alloy)](adobe-aep-web-sdk.md) if you standardize on Alloy.
- [examples/integrations/adobe-target/](../../examples/integrations/adobe-target/)
