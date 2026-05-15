# Optiview × Shopify (Online Store 2.0)

Theme **snippet** + **section** visibility: listen for **`si:experience-decision`** (or `subscribeToDecision`) and show product comparison / shipping reassurance blocks when Optiview **`action === "show"`** for a mapped **`surface_id`**.

## 1. Install snippet

Add to **`theme.liquid`** before `</body>` (adjust CDN if self-hosted):

```liquid
<script async src="https://cdn.optiview.ai/si.js"
  data-si-site="YOUR_SITE_SLUG"
  data-si-key="YOUR_PUBLISHABLE_KEY"></script>
```

## 2. Read decision envelope

In theme JS (or inline after `SessionIntel`):

```javascript
window.SessionIntel.getExperienceDecisionEnvelope();
```

## 3. Subscribe to surface decision

Example **`cart_assist_inline`** (map to your catalog `surface_id`):

```javascript
window.SessionIntel.subscribeToDecision("cart_assist_inline", function () {
  var d = window.SessionIntel.getExperienceDecision("cart_assist_inline");
  var box = document.getElementById("si-shipping-reassurance");
  if (!box) return;
  if (d.action === "show") {
    box.hidden = false;
  } else {
    box.hidden = true;
  }
});
```

## 4. Render or suppress — product comparison / reassurance

Put markup in a **section** or **snippet** with **`id="si-product-comparison"`** or **`id="si-shipping-reassurance"`**, **`hidden` by default**. Only Optiview + your listener reveals it.

**Product comparison example:** map **`surface_id`** e.g. **`article_inline_mid`** (or a PDP-specific id from your pack) to a block under the buy box.

## 5. Push decision to Shopify / adjacent stack

Shopify does not define a global `dataLayer`; use one of:

- **`pushExperienceDecisionToDataLayer()`** if GTM is also on the storefront.
- **`analytics.publish`** (Shopify privacy API) only if your app owns the channel — not required for Optiview.
- Server-side: forward envelope via your **theme app extension** backend (out of scope here).

## 6. Debug checklist

- [ ] Theme inspector: **`si.js`** loads, **`SessionIntel`** defined.
- [ ] Cart / PDP: module appears **once** on **`show`**, hidden on **`suppress`**.
- [ ] No Liquid `{{ }}` inside raw Optiview script — keep listeners in **`*.js` asset** or `{% javascript %}` where appropriate.
- [ ] **`INTEGRATION_QA.md`**.

## Related

- **`examples/integrations/shopify/`** — Liquid + JS starter.
