# Dashboard authentication (MVP)

Session Intelligence uses **Cloudflare Access** (Zero Trust) as the identity layer for **`dashboard.optiview.ai`**. There is **no custom username/password** in this MVP — Access handles login; the Worker enforces **tenant/site** authorization in D1.

## Architecture

```txt
Browser → dashboard.optiview.ai (Pages + Cloudflare Access login)
       → api.optiview.ai/dashboard/* (Worker)
            reads CF-Access-Authenticated-User-Email
            loads authorized_users + sites from D1
            filters every query by site_id (never trusts client tenant_id)
```

- **Login UI**: Cloudflare Access (IdP of your choice: Google, Okta, OTP, etc.).
- **Identity**: `CF-Access-Authenticated-User-Email` request header on the Worker (set by Cloudflare after successful Access authentication when the browser calls the API with **credentialed** fetches and the API hostname is included in the same Access application).
- **Authorization**: D1 tables `authorized_users`, `sites`, `tenants`. The Worker returns **403** if the email is not provisioned or the requested `site_id` is not allowed for that user.
- **Ingestion**: `/collect` remains **public** (CORS `*`). The Worker resolves **`tenant_id` / `site_id` server-side** using optional `site_id` / `snippet_key` on the JSON envelope, or by matching `payload.origin` host to `sites.domain`. **Never** accept a client-supplied `tenant_id`.

## D1 tables

| Table | Purpose |
| --- | --- |
| `tenants` | Customer org. |
| `sites` | A site/domain + `snippet_key` + display name under a tenant. |
| `authorized_users` | Email → tenant + **role** (`customer_viewer`, `tenant_admin`, `platform_admin`). |
| `sessions_summary` | Analytics rows; includes `tenant_id`, `site_id` after resolution. |

Seed data ships in migration `0003_seed_demo_tenancy.sql` (dev/demo emails — **replace in production**).

## Cloudflare Access setup (production)

**Use a *self-hosted* application, not a SaaS connector.** In **Zero Trust → Access → Applications → Add an application**, pick **Self-hosted** (your own hostname). The wizard that asks for an **Application** like “Google” and **SAML vs OIDC** is for connecting Cloudflare to a *third-party SaaS product* — that is the wrong path for protecting `dashboard.optiview.ai`.

1. In **Zero Trust → Access → Applications**, create an application that protects:
   - **Self-hosted / Pages**: `dashboard.optiview.ai`
   - **API / Worker hostname**: `api.optiview.ai` (include this so `fetch(..., { credentials: "include" })` from the dashboard sends the Access cookie to the Worker).
2. Add an **allow policy** for your customer groups (email domain or named users).
3. On the Worker, set **`SI_DASHBOARD_ORIGINS`** (comma-separated **exact** `Origin` values), e.g.  
   `https://dashboard.optiview.ai`
4. Set **`SI_BYPASS_DASHBOARD_AUTH`** to **`0`**, clear **`SI_DEV_ACCESS_EMAIL`**, and set **`SI_DEPLOYMENT_MODE=production`** (via **`wrangler deploy --env production`** or dashboard vars). See [ENVIRONMENT_MODES.md](./ENVIRONMENT_MODES.md).

CORS for `/dashboard/*` uses **credentialed** responses: `Access-Control-Allow-Origin` is the request `Origin` only when it appears in `SI_DASHBOARD_ORIGINS`.

## Worker environment variables

| Variable | Example | Purpose |
| --- | --- | --- |
| `SI_DEPLOYMENT_MODE` | `development` / `production` | Selects deployment safety profile (see [ENVIRONMENT_MODES.md](./ENVIRONMENT_MODES.md)). |
| `SI_ENV` | `dev` | Legacy mode hint when `SI_DEPLOYMENT_MODE` is unset. |
| `SI_DASHBOARD_ORIGINS` | `https://dashboard.optiview.ai` (prod) or `http://localhost:5174` (local only) | Allowed browser origins for dashboard API CORS. Never include localhost in production. |
| `SI_BYPASS_DASHBOARD_AUTH` | `0` | When `1`, local dev can use `X-SI-Dev-Access-Email` or `SI_DEV_ACCESS_EMAIL` (never enable in production). |
| `SI_DEV_ACCESS_EMAIL` | `viewer@optiview.local` | Fallback dev identity when bypass is on. |

## Dashboard API contract

All scoped endpoints require a resolved user and a **site** scope:

- `GET /dashboard/me` — email, role, sites[], deployment_mode, auth_bypass_enabled.
- `GET /dashboard/admin/signups` — list marketing signup requests (**`platform_admin` only**).
- `PATCH /dashboard/admin/signups/:id` — body `{ "status": "reviewed" | "approved" | "rejected" }` (**`platform_admin` only**).
- `GET /dashboard/summary?site_id=…` (+ optional header `X-SI-Site-Id`)
- `GET /dashboard/experiments?site_id=…`
- `GET /dashboard/sessions?site_id=…`
- `GET /dashboard/insights?site_id=…`

**Platform admins** can query any `site_id` that exists in D1. **Customer viewers** and **tenant admins** only see sites whose `tenant_id` matches their row.

## Local development bypass

1. **`worker/wrangler.toml`** `[vars]` keep **`SI_BYPASS_DASHBOARD_AUTH=0`** in git. For local only, create **`worker/.dev.vars`** from **`.dev.vars.example`** and set **`SI_BYPASS_DASHBOARD_AUTH=1`**, **`SI_DEV_ACCESS_EMAIL`**, and localhost **`SI_DASHBOARD_ORIGINS`** as needed. **`SI_DEPLOYMENT_MODE=development`** should stay set (default in `[vars]`).
2. The **dashboard** Vite dev server proxies `/dashboard` to the Worker and injects **`X-SI-Dev-Access-Email`** (from `VITE_SI_DEV_ACCESS_EMAIL`, default `viewer@optiview.local`).
3. Apply D1 migrations locally so `authorized_users` contains that email:

```bash
cd worker && pnpm exec wrangler d1 migrations apply session-intelligence --local
```

Use **`admin@optiview.local`** in `VITE_SI_DEV_ACCESS_EMAIL` to exercise the **platform_admin** path (all sites).

## Install snippet (publishers)

Prefer the **public snippet key** (opaque install token) on the tag — the Worker resolves `tenant_id` / `site_id` from D1 and **never** trusts a client tenant:

```html
<script async src="https://cdn.optiview.ai/si.js" data-si-key="YOUR_PUBLIC_SNIPPET_KEY"></script>
```

Alias: **`data-si-snippet-key`** (same value as `data-si-key`).

Optional **`data-si-site`** (internal site UUID) for support or display. If **both** `data-si-key` and `data-si-site` are present, `/collect` rejects when they do not refer to the same site (`site_id_snippet_mismatch`).

Legacy / minimal: **`data-si-site` only** is still supported; for broad customer installs, move customers to **`data-si-key`** as the primary public identifier.

## Security notes

- **No PII** in dashboard listings: session ids are truncated in the UI; do not store raw IPs in customer-visible APIs.
- **403** for unknown emails or forbidden `site_id`.
- **Cross-tenant**: impossible for customer roles if `assertSiteAllowedForUser` is used for every scoped query (see tests in `worker/src/__tests__/access-control.test.ts`).

## Roles

| Role | Dashboard |
| --- | --- |
| `customer_viewer` | Scoped sites only; integration docs / generic admin copy hidden. |
| `tenant_admin` | Same site scope; may see full operator sections (MVP: same as viewer except flag for future). |
| `platform_admin` | All sites; use for Optiview operators only. |

Provision **`platform_admin`** sparingly (single row in `authorized_users`).
