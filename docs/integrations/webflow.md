# Optiview × Webflow

Add a **site-wide embed** for `si.js`, then a second **embed** with a tiny listener that maps **`surface_id`** to **`data-si-surface`** sections — show / hide without Webflow interactions.

## 1. Install snippet

**Embed** (Site settings → Custom code → **Footer**):

```html
<script async src="https://cdn.optiview.ai/si.js"
  data-si-site="YOUR_SITE_SLUG"
  data-si-key="YOUR_PUBLISHABLE_KEY"></script>
```

## 2. Read decision envelope

Same embed or a second one — after load:

```javascript
window.SessionIntel.getExperienceDecisionEnvelope();
```

## 3. Subscribe to surface decision

```javascript
window.SessionIntel.subscribeToDecision("article_inline_mid", function () {
  var d = window.SessionIntel.getExperienceDecision("article_inline_mid");
  var el = document.querySelector('[data-si-surface="article_inline_mid"]');
  if (!el) return;
  el.style.display = d.action === "show" ? "block" : "none";
});
```

## 4. Map sections — `data-si-surface`

On the **section** or **div** you want Optiview to control, add:

```html
<div data-si-surface="article_inline_mid" style="display:none">
  <!-- Webflow CMS content -->
</div>
```

Webflow: **Custom attribute** `data-si-surface` = `article_inline_mid`.

## 5. Push decision

If you also use GTM on Webflow:

```javascript
window.SessionIntel.subscribeToAllDecisions(function () {
  window.SessionIntel.pushExperienceDecisionToDataLayer();
});
```

## 6. Debug checklist

- [ ] Published site (not only Designer preview) loads **`si.js`**.
- [ ] `querySelector` finds your **`data-si-surface`** element (unique per page).
- [ ] **`display`** toggles only from **your** embed — Optiview tag itself does not touch Webflow DOM.
- [ ] **`INTEGRATION_QA.md`**.

## Related

- **`examples/integrations/webflow/`**
