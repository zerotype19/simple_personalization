# Optiview × Optimizely

Tag decisions with **`pushExperienceDecisionToOptimizely`** or the Optimizely Event API, and feed **`surface_id` / `action` / offer fields** into **user context** or **custom attributes** for audience building.

## 1. Install snippet

```html
<script async nonce="OPTIMIZELY_NONCE" src="https://cdn.optiview.ai/si.js"
  data-si-site="YOUR_SITE_SLUG"
  data-si-key="YOUR_PUBLISHABLE_KEY"></script>
```

Load **`window.optimizely`** per your snippet instructions before or in parallel with Optiview; order rarely matters if you subscribe after both resolve.

## 2. Read decision envelope

```javascript
var env = window.SessionIntel.getExperienceDecisionEnvelope();
```

## 3. Subscribe to surface decision

```javascript
window.SessionIntel.subscribeToDecision("article_inline_mid", function () {
  var d = window.SessionIntel.getExperienceDecision("article_inline_mid");
  if (d.action === "show") {
    // mount CMS / module
  }
});
```

## 4. Render or suppress

Hide modules when **`action !== "show"`** for that **`surface_id`**.

## 5. Push decision — helper + attributes

**Built-in helper** (normalizes payload to Optimizely tag shape):

```javascript
window.SessionIntel.subscribeToAllDecisions(function () {
  window.SessionIntel.pushExperienceDecisionToOptimizely();
});
```

**Audience / context pattern:** read **`getExperienceDecisionEnvelope()`** and set user or event attributes your project expects (names are **your** Optimizely schema):

```javascript
window.SessionIntel.subscribeToAllDecisions(function () {
  var env = window.SessionIntel.getExperienceDecisionEnvelope();
  var p = env && env.primary_decision;
  if (!p || !window.optimizely) return;
  // Example: Project JS API — align with your Optimizely version / docs
  window.optimizely.push({
    type: "user",
    attributes: {
      si_surface_id: p.surface_id,
      si_action: p.action,
      si_offer_type: p.offer_type,
      si_message_angle: p.message_angle,
      si_timing: p.timing,
      si_confidence: String(p.confidence)
    }
  });
});
```

Replace **`optimizely.push`** with the **Event API** call your account uses if you track impressions separately.

## 6. Debug checklist

- [ ] Optimizely debugger shows tags / events after envelope updates.
- [ ] **`surface_id`** matches catalog + Offer mappings.
- [ ] No duplicate client-side experiments fighting the same DOM region without priority rules.
- [ ] **`INTEGRATION_QA.md`**.

## Related

- **`examples/integrations/optimizely/`**
- [GTM](google-tag-manager.md) if you dual-write to `dataLayer`.
