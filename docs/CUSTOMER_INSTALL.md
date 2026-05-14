# Customer install (Session Intelligence)

## Minimal install

Add **once** near the end of `<body>` when possible:

```html
<script async src="https://cdn.optiview.ai/si.js"></script>
```

When your dashboard provisions a **site id** and **snippet key**, use both on the tag. The Worker resolves tenancy from **`snippet_key`** first; **`site_id`** is optional (support / display). If both are sent, **`site_id` must match** the site row for that key or collect returns `site_id_snippet_mismatch`.

**Recommended (broad installs — public token is the key):**

```html
<script async src="https://cdn.optiview.ai/si.js" data-si-key="YOUR_PUBLIC_SNIPPET_KEY" data-si-site="YOUR_SITE_ID"></script>
```

`data-si-site` is optional for MVP if you rely on **`snippet_key` + origin** matching; omitting it still sends `snippet_key` when you set `data-si-key` (or alias `data-si-snippet-key`).

**MVP without key (origin-only fallback):**

```html
<script async src="https://cdn.optiview.ai/si.js"></script>
```

Publisher **origin** must match a configured `sites.domain` in D1 for rows to pick up `tenant_id` / `site_id`.

## Optional debug install

```html
<script async src="https://cdn.optiview.ai/si.js" data-si-debug="true"></script>
```

You can also append **`?si_debug=1`** to the **page** URL, use **`sessionStorage.setItem('si:debug','1')`**, or **`data-inspector="1"`** on the script tag. See [SNIPPET_HOSTING.md](./SNIPPET_HOSTING.md).

## What the tag does

- Runs **entirely in the visitor’s browser** after download from your snippet host (for example Cloudflare Pages on `cdn.optiview.ai`).
- Maintains **anonymous** session state in **`sessionStorage`** (no accounts required for the default path).
- Does **not** fingerprint visitors beyond ordinary page interaction signals described in your DPA / privacy policy.
- Does **not** collect PII by design; do not place PII into fields you ask the tag to read.
- Emits a **personalization signal** and related activation context for your personalisation / experimentation stack.
- Can push summaries to **`dataLayer`**, **`adobeDataLayer`**, and **Optimizely** helpers exposed on `window.SessionIntel`.
- Optionally sends **aggregated / batched** analytics to your Session Intelligence **Worker** (`/collect`) as configured.

## Inspector

- After load, use the **SI** control (bottom-left) or **Ctrl+Shift+`** / **⌘+Shift+`** (backtick) to toggle the drawer.
- Ensure your **CSP** allows the linked **`si-inspector.css`** from the snippet origin.

## Console helpers

```js
window.SessionIntel.getPersonalizationSignal();
window.SessionIntel.getActivationPayload();
window.SessionIntel.pushPersonalizationSignalAll();
```

## Network

Your CSP **`connect-src`** must allow your **API** host (for example `https://api.optiview.ai`) for **`/config`** and **`/collect`**.

## Further reading

- [SNIPPET_HOSTING.md](./SNIPPET_HOSTING.md) — CSP, caching, troubleshooting `/si.js` returning HTML.
- [PRODUCTION_HOSTING.md](./PRODUCTION_HOSTING.md) — internal deploy layout and env vars.
