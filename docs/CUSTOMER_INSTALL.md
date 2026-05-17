# Optiview — customer install (hosted snippet)

Optiview is an **anonymous experience decision runtime**: one async tag on your site, commercial judgment in the browser, and your stack decides what to render.

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

## Optional vertical override

When your page copy does not match the journey you are demonstrating (for example a product-led demo with an auto-retail path), set an explicit vertical — **inference is skipped**:

```html
<script async src="https://cdn.optiview.ai/si.js" data-si-vertical="auto_retail" data-si-key="YOUR_PUBLIC_SNIPPET_KEY"></script>
```

Accepted values include `auto_retail`, `auto_oem`, `b2b_saas`, `ecommerce`, and other catalog verticals. Aliases: `auto` → `auto_retail`, `b2b` → `b2b_saas`.

## What the tag does

- Runs **entirely in the visitor’s browser** after download from your snippet host (for example `cdn.optiview.ai`).
- Maintains **anonymous** session state in **`sessionStorage`** under `si:session` (no accounts required for the default path).
- May set **one** `localStorage` key on your origin — `si:returning` — to detect a prior visit (timestamp only). This is **not** used for identity stitching, not shared across sites, and not required for core decisions.
- Does **not** set tracking cookies, fingerprint visitors, or build a cross-site identity graph.
- Does **not** read `input.value` / `textarea.value` or store raw search queries; commercial intent uses structure-only form classification.
- Does **not** collect PII by design; do not place PII into fields you ask the tag to read.
- Computes **experience decisions** locally (envelope + per-surface recommendations) and can push them to **GTM, Adobe, Optimizely**, or your own components.
- Optionally sends **aggregated / batched** analytics to your Optiview **Worker** (`/collect`) as configured.

### Browser storage keys (reference)

| Storage | Key | Purpose |
|---------|-----|---------|
| sessionStorage | `si:session` | Anonymous session profile (signals, commercial intent, decisions) |
| sessionStorage | `si:exp_progression` | Experience progression memory for the session |
| sessionStorage | `si:debug` | Optional inspector/debug (when enabled) |
| sessionStorage | `si:inspector_mode` | Inspector buyer vs operator view |
| sessionStorage | `si:surface_mappings` | Optional operator surface-map preview (per host+path) |
| sessionStorage | `si:surface_mapper_overlay` | Optional surface-map overlay toggle |
| localStorage | `si:returning` | Return-visit flag (timestamp); **only** localStorage key in the default runtime |

Visitors can clear these via browser settings. See [PRIVACY_QA.md](./PRIVACY_QA.md) and the marketing [privacy page](https://optiview.ai/privacy).

## Inspector

- After load, use the **SI** control (bottom-left) or **Ctrl+Shift+`** / **⌘+Shift+`** (backtick) to toggle the drawer.
- Ensure your **CSP** allows the linked **`si-inspector.css`** from the snippet origin.

## Console — experience decisions (primary)

After the tag loads, `window.SessionIntel` is an **object** of APIs (not a single function):

```js
typeof window.SessionIntel === "object";
typeof window.SessionIntel.getExperienceDecisionEnvelope === "function";

// Full session envelope (primary + ranked surfaces, suppression, commercial read)
const envelope = window.SessionIntel.getExperienceDecisionEnvelope();

// One surface (replace with your catalog surface_id)
const surfaceId = "article_inline_mid";
const decision = window.SessionIntel.getExperienceDecision(surfaceId);

window.SessionIntel.subscribeToDecision(surfaceId, () => {
  const latest = window.SessionIntel.getExperienceDecision(surfaceId);
  // Wire GTM, Adobe, React, or CMS activation from `latest`
});

// Optional: push to dataLayer when your tag manager is ready
window.SessionIntel.pushExperienceDecisionToDataLayer?.();
```

Browse a few pages, then re-run `getExperienceDecisionEnvelope()` — recommendations and restraint should update with commercial behavior.

## Console — personalization signal (legacy / supporting)

Older integrations may still use the personalization signal envelope:

```js
window.SessionIntel.getPersonalizationSignal();
window.SessionIntel.getActivationPayload();
window.SessionIntel.pushPersonalizationSignalAll();
```

Prefer **experience decision** APIs for new GTM, Adobe, and headless work. See [EXPERIENCE_DECISIONS.md](./EXPERIENCE_DECISIONS.md).

## Self-hosting warning

If you upload a **prebuilt** `si.js` from the hosted-snippet bundle **without rebuilding**, these URLs are **baked in at build time**:

- **API / collect:** `https://api.optiview.ai` (see `version.json` → `worker_url`)
- **Inspector CSS origin:** `https://cdn.optiview.ai` (see `version.json` → `snippet_origin`)

Upload **`si.js` and `si-inspector.css` on the same origin** only if you also rebuild with your hosts:

```bash
VITE_SI_WORKER_URL=https://api.optiview.ai \
VITE_SI_SNIPPET_ORIGIN=https://YOUR_SNIPPET_HOST \
pnpm build:snippet
```

Otherwise keep using **`https://cdn.optiview.ai/si.js`** and only add your `data-si-key`.

## Network

Your CSP **`connect-src`** must allow your **API** host (for example `https://api.optiview.ai`) for **`/config`** and **`/collect`**. Collect uses `credentials: "omit"` on the public tag.

## Further reading

- [SNIPPET_HOSTING.md](./SNIPPET_HOSTING.md) — CSP, caching, troubleshooting `/si.js` returning HTML.
- [WEBMASTER_INSTALL_ONE_PAGER.md](./WEBMASTER_INSTALL_ONE_PAGER.md) — handoff for implementation.
- [PRODUCTION_HOSTING.md](./PRODUCTION_HOSTING.md) — internal deploy layout and env vars.
