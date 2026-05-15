# Optiview × Adobe Experience Platform Web SDK (Alloy)

Send Session Intelligence decisions on the **`xdm`** path with **`sendEvent`**, keeping Optiview fields beside your existing commerce / content schemas.

## 1. Install snippet

1. Deploy Alloy per Adobe docs (`alloy("configure", { ... })`).
2. Add [Session Intelligence](https://optiview.ai/install) on the same page.

```html
<script async src="https://cdn.optiview.ai/si.js"
  data-si-site="YOUR_SITE_SLUG"
  data-si-key="YOUR_PUBLISHABLE_KEY"></script>
```

## 2. Read decision envelope

```javascript
var env = window.SessionIntel.getExperienceDecisionEnvelope();
```

## 3. Subscribe to surface decision

```javascript
window.SessionIntel.subscribeToDecision("article_inline_mid", function () {
  var d = window.SessionIntel.getExperienceDecision("article_inline_mid");
  if (d.action === "show") {
    // render your headless / CMS surface
  }
});
```

## 4. Render or suppress

Gate UI on **`getExperienceDecision(surfaceId).action === "show"`**; do not show on **`suppress`** / **`none`**.

## 5. Push decision — `alloy("sendEvent", …)`

Normalize fields from **`primary_decision`** (or iterate secondaries if your AEP use case needs them):

```javascript
function siOptiviewXdmFromEnvelope(env) {
  var p = env && env.primary_decision;
  var xdm = {
    _si: {
      experienceDecision: {
        surfaceId: p && p.surface_id,
        action: p && p.action,
        offerType: p && p.offer_type,
        messageAngle: p && p.message_angle,
        timing: p && p.timing,
        confidence: p && p.confidence,
        sessionId: env && env.session_id,
        suppressionSummary: env && env.suppression_summary
      }
    }
  };
  return xdm;
}

window.SessionIntel.subscribeToAllDecisions(async function () {
  var env = window.SessionIntel.getExperienceDecisionEnvelope();
  if (typeof alloy !== "function") return;
  await alloy("sendEvent", {
    xdm: siOptiviewXdmFromEnvelope(env),
    documentUnloading: false
  });
});
```

**Customization:** Replace **`_si.experienceDecision`** with your org’s **mixins / field groups**; the snippet shows **where** to attach Optiview. Many teams alias the same keys as `targetPageParams` for parity with at.js.

### Client Data Layer shortcut

If you use `adobeDataLayer`:

```javascript
window.SessionIntel.pushExperienceDecisionToAdobeDataLayer();
```

## 6. Debug checklist

- [ ] Edge / Assurance shows **`sendEvent`** with Optiview fields on envelope change.
- [ ] UI still gated per **`getExperienceDecision(surfaceId)`**.
- [ ] No PII in custom fields (Optiview payload is offer/session metadata only).
- [ ] **`INTEGRATION_QA.md`**.

## Related

- [Adobe Target (at.js)](adobe-target.md)
- [examples/integrations/adobe-target/](../../examples/integrations/adobe-target/) (similar parameter mapping)
