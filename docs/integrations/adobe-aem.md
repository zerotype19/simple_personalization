# Optiview × Adobe Experience Manager (AEM)

Listen for **`si:experience-decision`** at `document` (CustomEvent) or use `subscribeToDecision` in an AEM **clientlib**. Map **`surface_id`** to authored component regions.

## 1. Install snippet

Embed [Session Intelligence](https://optiview.ai/install) in your page template or root **clientlib** so it loads on publish + author preview.

## 2. Read decision envelope

```javascript
var env = window.SessionIntel && window.SessionIntel.getExperienceDecisionEnvelope();
```

## 3. Subscribe to surface decision

```javascript
window.SessionIntel.subscribeToDecision("article_inline_mid", function () {
  var d = window.SessionIntel.getExperienceDecision("article_inline_mid");
  if (d.action === "show") {
    // toggle AEM region / SPA island
  }
});
```

## 4. Render or suppress — `si:experience-decision`

Optiview dispatches a **`CustomEvent`** when the envelope meaningfully changes (see SDK `customEventDestination`). Your HTL / component author adds **`data-si-surface="article_inline_mid"`** on a wrapper; JS shows or hides **that region only**.

```javascript
document.addEventListener("si:experience-decision", function (ev) {
  var env = ev.detail;
  if (!env || !window.SessionIntel) return;
  var d = window.SessionIntel.getExperienceDecision("article_inline_mid");
  var el = document.querySelector('[data-si-surface="article_inline_mid"]');
  if (!el) return;
  if (d.action === "show") {
    el.hidden = false;
  } else {
    el.hidden = true;
  }
});
```

**Surface → region mapping:** keep **`surface_id`** as the **data attribute value** that matches your **Context Pack** catalog and Offer Library keys.

## 5. Push decision to Adobe

- Use **`pushExperienceDecisionToAdobeDataLayer()`** if **`adobeDataLayer`** is present.
- Or mirror fields into **`targetPageParams`** per [Adobe Target](adobe-target.md).

## 6. Debug checklist

- [ ] CustomEvent fires once per meaningful update (not every scroll).
- [ ] Only regions with matching **`data-si-surface`** toggle.
- [ ] Author mode: preview still respects suppression (thin session may show null primary).
- [ ] **`INTEGRATION_QA.md`**.

## Related

- **`examples/integrations/adobe-aem/`** — paste-ready listener + data attribute pattern.
