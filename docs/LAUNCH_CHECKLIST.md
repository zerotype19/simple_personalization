# Launch checklist (snippet CDN + API)

## How to use these docs

- **This file** (`LAUNCH_CHECKLIST.md`) — technical launch readiness: deploys, DNS, Access, CORS, Worker, CDN, and smoke tests before you call the stack deploy-ready.
- **[EXTERNAL_BETA_CHECKLIST.md](./EXTERNAL_BETA_CHECKLIST.md)** — customer-facing beta readiness with **evidence** requirements; use before external pilots.
- **[EXTERNAL_BETA_RUNBOOK.md](./EXTERNAL_BETA_RUNBOOK.md)** — ordered production verification commands and rollback notes.
- **[PRIVACY_QA.md](./PRIVACY_QA.md)** — snippet storage and PII boundary verification (no runtime changes).
- **[CLOUDFLARE_INVENTORY.md](./CLOUDFLARE_INVENTORY.md)** — infrastructure map; use it to confirm hostname → Cloudflare project mapping before changing domains or deleting resources.

Use the sections below before pointing customers at **`https://cdn.optiview.ai/si.js`** and **`https://api.optiview.ai`**.

## Pre-launch verification (auth, tenancy, and hosting)

Run these in order before calling the service **launch-ready** (from the correct Cloudflare account):

1. [ ] **Remote D1 migrations** — `cd worker && pnpm exec wrangler d1 migrations apply session-intelligence --remote` (account must match `database_id` in `worker/wrangler.toml`).
2. [ ] **Cloudflare Access** — `dashboard.optiview.ai` requires login; same Access app includes **`api.optiview.ai`** so dashboard `fetch(..., { credentials: "include" })` receives identity headers on the Worker.
3. [ ] **403 for unknown users** — signed-out or unprovisioned email: `GET https://api.optiview.ai/dashboard/me` → **403** (from a browser origin listed in `SI_DASHBOARD_ORIGINS`).
4. [ ] **`customer_viewer`** — only sees D1 `sites` for their `tenant_id`; switching `site_id` to another tenant’s id → **403**.
5. [ ] **`platform_admin`** — can load metrics for **all** sites (e.g. both seeded demo sites after seed migration).
6. [ ] **`/collect` resolution** — with `snippet_key` and/or `site_id` on the JSON envelope, rows get `tenant_id` / `site_id` stored **only** after server lookup; mismatched `snippet_key` + `site_id` → **400** `site_id_snippet_mismatch`.
7. [ ] **CDN snippet** — `https://cdn.optiview.ai/si.js` returns JS; inspector CSS **200**.
8. [ ] **Demo + CDN bridge** — `demo.*` build with CDN bridge loads `${VITE_SI_SNIPPET_ORIGIN}/si.js` and runs (inspector + console helpers).
9. [ ] **Transitional demo-hosted `/si.js`** — still **200** on the demo Pages host while customers migrate to the CDN URL ([SNIPPET_HOSTING.md](./SNIPPET_HOSTING.md)).
10. [ ] **Dashboard CORS** — allowed `Origin` (e.g. `https://dashboard.optiview.ai`) succeeds; a random origin does **not** receive credentialed CORS for `/dashboard/*` (see [DASHBOARD_AUTH.md](./DASHBOARD_AUTH.md)).

## Cloudflare setup

- [ ] Worker **session-intelligence-worker** deployed with **`pnpm deploy:worker`** (uses **`wrangler deploy --env production`** — see [ENVIRONMENT_MODES.md](./ENVIRONMENT_MODES.md)).
- [ ] **D1 migrations** applied on the remote database:  
  `cd worker && pnpm exec wrangler d1 migrations apply session-intelligence --remote`
- [ ] **Cloudflare Access** protects **`dashboard.optiview.ai`** and includes **`api.optiview.ai`** in the same application so credentialed dashboard `fetch` calls receive `CF-Access-Authenticated-User-Email` (see [DASHBOARD_AUTH.md](./DASHBOARD_AUTH.md)).
- [ ] Worker vars: **`SI_DEPLOYMENT_MODE=production`**; **`SI_DASHBOARD_ORIGINS`** lists `https://dashboard.optiview.ai` only (no localhost); **`SI_BYPASS_DASHBOARD_AUTH=0`**; **`SI_DEV_ACCESS_EMAIL`** unset / empty.
- [ ] Custom domain **`api.optiview.ai`** attached to the Worker; `GET https://api.optiview.ai/config` returns **200** (JSON).
- [ ] Pages project **si-session-snippet** created; custom domain **`cdn.optiview.ai`** attached.
- [ ] Pages projects **si-session-demo** and **si-session-dashboard** use their intended hostnames (e.g. `demo`, `dashboard`).

## Build and deploy order

1. `export VITE_SI_WORKER_URL=https://api.optiview.ai` (no trailing slash).
2. `pnpm deploy:snippet` — uploads only `si.js`, `si-inspector.css`, `version.json`, `health.json`, `_headers`.
3. `pnpm deploy:demo` — optional; uses CDN bridge by default (snippet host must already serve matching `si.js`).
4. `pnpm deploy:dashboard` — operator UI.

Or once: `pnpm deploy:all`.

## Automated checks (local)

- [ ] `pnpm build:snippet` (with `VITE_SI_WORKER_URL` set).
- [ ] `pnpm test`
- [ ] `pnpm typecheck`

## Manual checks (production)

After DNS and TLS are live:

- [ ] `https://cdn.optiview.ai/si.js` — **200**, `Content-Type` includes **javascript**, body is minified JS.
- [ ] `https://cdn.optiview.ai/si-inspector.css` — **200**, CSS.
- [ ] `https://cdn.optiview.ai/version.json` — JSON with `worker_url`, `snippet_origin`, `commit`, `built_at`.
- [ ] `https://cdn.optiview.ai/health.json` — `{ "ok": true, "service": "session-intelligence-snippet" }`.
- [ ] `https://api.optiview.ai/config` — **200**.
- [ ] `POST https://api.optiview.ai/collect` — accepts batched payloads (CORS + 2xx as configured).

## Console (publisher page with snippet installed)

```js
window.SessionIntel.getPersonalizationSignal();
window.SessionIntel.getActivationPayload();
window.SessionIntel.pushPersonalizationSignalAll();
```

## Optional debug install

```html
<script async src="https://cdn.optiview.ai/si.js" data-si-debug="true"></script>
```

(See [SNIPPET_HOSTING.md](./SNIPPET_HOSTING.md) for `?si_debug=1` and inspector shortcuts.)

## Third-party smoke

- [ ] Demo site loads (with `pnpm deploy:demo`, inspector opens, signals update).
- [ ] External site (e.g. Rhythm90) loads CDN snippet, inspector opens, same console checks pass.

## External beta gate

Before external pilots, complete **[EXTERNAL_BETA_CHECKLIST.md](./EXTERNAL_BETA_CHECKLIST.md)**. (See **How to use these docs** at the top of this file for roles of each doc.)
