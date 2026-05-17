# Webmaster install — one page

Hand this to whoever adds the tag (webmaster, GTM owner, or CMS dev). Full detail: [CUSTOMER_INSTALL.md](./CUSTOMER_INSTALL.md).

---

## What you are adding

One **async** script from Optiview’s CDN. It runs **only on your site’s origin**, keeps an **anonymous session** in the browser, and sends **aggregated signals** to Optiview if collect is enabled. It does **not** change your page layout by default.

---

## Copy-paste install

```html
<script
  async
  src="https://cdn.optiview.ai/si.js"
  data-si-key="PASTE_YOUR_SNIPPET_KEY_HERE"
></script>
```

- Place **once**, near the end of `<body>` (or one GTM tag on all pages).
- Replace the key with the value Optiview provisioned for your site.

---

## Recommended markup (15 minutes)

**Surfaces** — mark regions you may personalize later:

```html
<div data-si-surface="finance_payment_assist">…</div>
```

**Tier-1 CTAs** — mark conversion buttons:

```html
<a href="/test-drive" data-si-intent="schedule_test_drive">Book test drive</a>
```

Surface IDs come from your vertical catalog ([SURFACE_CATALOGS.md](./SURFACE_CATALOGS.md)). Intent values are snake_case commercial actions (e.g. `view_financing`, `begin_checkout`, `talk_to_sales`).

---

## Verify (5 minutes)

1. Open your site → DevTools → **Network** → confirm `si.js` loads from `cdn.optiview.ai`.
2. Console:

```js
typeof window.SessionIntel === "object";
typeof window.SessionIntel.getExperienceDecisionEnvelope === "function";
window.SessionIntel.getExperienceDecisionEnvelope();
```

3. Click **SI** (bottom-left) or press **Ctrl+Shift+`** (backtick) to open the inspector.
4. Browse a few pages; confirm timeline and recommendations update.

---

## CSP checklist

Allow in **Content-Security-Policy**:

| Directive | Host |
|-----------|------|
| `script-src` | `https://cdn.optiview.ai` |
| `style-src` | `https://cdn.optiview.ai` (inspector CSS) |
| `connect-src` | `https://api.optiview.ai` (or your Worker URL) |

---

## Privacy (short)

- No tracking **cookies**
- No **fingerprinting** or cross-site identity graph
- No reading **form field values** or raw search queries
- **sessionStorage** for session state; one optional **localStorage** key (`si:returning`) for return-visit detection on your domain only

[optiview.ai/privacy](https://optiview.ai/privacy) · [SECURITY_PRIVACY_FAQ.md](./SECURITY_PRIVACY_FAQ.md)

---

## When something breaks

| Issue | Fix |
|-------|-----|
| Script blocked | CSP or ad blocker — see above |
| No dashboard data | Wrong or missing `data-si-key`; domain must match provisioned site |
| Inspector won’t open | Add `?si_debug=1` and reload, or `data-inspector="1"` on script tag |

Escalate with: browser, URL, screenshot of Network tab, and your snippet key id (not the full secret in public channels).

**Pilot path:** [PILOT_ONBOARDING.md](./PILOT_ONBOARDING.md)
