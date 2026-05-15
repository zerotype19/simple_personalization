# Optiview × Google Tag Manager (GTM)

Push **`si_experience_decision`** into `dataLayer` for triggers, variables, and tag routing without DOM side effects from Optiview.

## 1. Install snippet

Add the [Session Intelligence snippet](https://optiview.ai/install) **before** your GTM container if you need Optiview to own bootstrap; otherwise GTM **Custom HTML** can inject `si.js` (async). Example:

```html
<script async src="https://cdn.optiview.ai/si.js"
  data-si-site="YOUR_SITE_SLUG"
  data-si-key="YOUR_PUBLISHABLE_KEY"></script>
```

For localhost / self-hosted builds, point `src` at your bundle URL.

## 2. Read decision envelope

After **`SessionIntel`** is available:

```javascript
var env = window.SessionIntel.getExperienceDecisionEnvelope();
console.log(env && env.primary_decision);
```

## 3. Subscribe to surface decision

Callback receives the **full envelope**. Read the **slot** for your surface:

```javascript
window.SessionIntel.subscribeToDecision("article_inline_mid", function () {
  var d = window.SessionIntel.getExperienceDecision("article_inline_mid");
  if (d.action === "show") {
    // render mapped CMS / component surface (your code)
  }
});
```

## 4. Render or suppress

Only mount when **`getExperienceDecision(surfaceId).action === "show"`**. On **`suppress`** or **`none`**, remove or skip mounting.

## 5. Push decision to GTM (dataLayer)

**Recommended:** use the SDK helper (matches [destination payload](../../packages/sdk/src/destinations/destinationTypes.ts)):

```javascript
window.SessionIntel.pushExperienceDecisionToDataLayer();
```

**Manual payload shape** (same event name and keys GTM should map):

| dataLayer key | Typical GTM variable | Notes |
|---------------|----------------------|--------|
| `event` | Constant **`si_experience_decision`** | Custom Event trigger |
| `si_decision_surface_id` | DLV `si_decision_surface_id` | Primary surface |
| `si_decision_action` | DLV `si_decision_action` | `show` / `suppress` |
| `si_decision_offer_type` | DLV `si_decision_offer_type` | |
| `si_decision_message_angle` | DLV `si_decision_message_angle` | |
| `si_decision_timing` | DLV `si_decision_timing` | |
| `si_decision_confidence` | DLV `si_decision_confidence` | number |
| `si_session_id` | DLV `si_session_id` | |
| `si_suppression_summary` | DLV `si_suppression_summary` | optional string |

**Call push inside subscribe** if you want each meaningful envelope tick to update tags:

```javascript
window.SessionIntel.subscribeToAllDecisions(function () {
  window.SessionIntel.pushExperienceDecisionToDataLayer();
});
```

### GTM setup (short)

1. **Trigger:** Custom Event — Event name **`si_experience_decision`**.
2. **Variables:** Data Layer Variables for each **`si_decision_*`** key above.
3. **Tags:** GA4 event, floodlight, pixels — fire on that trigger; map variables to parameters.

See **`examples/integrations/gtm/`** for a paste-ready Custom HTML block.

## 6. Debug checklist

- [ ] Network: **`si.js`** 200, no CSP block.
- [ ] Console: **`getExperienceDecisionEnvelope()`** returns expected shape.
- [ ] GTM Preview: **`si_experience_decision`** appears in dataLayer when you subscribe + push.
- [ ] **Surface** render only on **`show`**; no duplicate mounts.
- [ ] **`INTEGRATION_QA.md`** passed.

## Related

- [CMS activation hub](../CMS_ACTIVATION_EXAMPLES.md)
- [INTEGRATION_QA.md](../INTEGRATION_QA.md)
