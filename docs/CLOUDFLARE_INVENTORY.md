# Cloudflare inventory (Optiview / Session Intelligence)

Single-account map of **what is in use**, **what hostname it serves**, and **how you deploy it**. Naming is intentionally unchanged during beta; see **Rename later** at the bottom.

Related: [PRODUCTION_HOSTING.md](./PRODUCTION_HOSTING.md), [ENVIRONMENT_MODES.md](./ENVIRONMENT_MODES.md), [EXTERNAL_BETA_CHECKLIST.md](./EXTERNAL_BETA_CHECKLIST.md).

## Active resources

| Resource (Cloudflare name) | Type | Purpose |
|----------------------------|------|---------|
| `session-intelligence-worker` | Worker | API + D1: `/config`, `/collect`, `/signup-request`, `/dashboard/*`, admin signups. Production deploy uses `wrangler deploy --env production` (see `worker/wrangler.toml`). |
| `si-session-snippet` | Pages | Snippet CDN only: `si.js`, `si-inspector.css`, `version.json`, `health.json`, `_headers`. |
| `si-session-demo` | Pages | Velocity Motors demo SPA; production builds load snippet from CDN (`VITE_SI_SNIPPET_ORIGIN`). |
| `si-session-dashboard` | Pages | Operator dashboard (sessions, experiments, install snippet, `/admin/signups` for `platform_admin`). |
| `si-session-marketing` | Pages | Marketing site: positioning, install, signup, privacy, links to demo/dashboard. |

## Public hostname mapping (intended)

| Public hostname | Points to | Customer-facing? |
|-----------------|-----------|------------------|
| `api.optiview.ai` | Worker `session-intelligence-worker` | **Yes** — publishers’ browsers and sites call the API; dashboard uses credentialed `/dashboard/*`. |
| `cdn.optiview.ai` | Pages `si-session-snippet` | **Yes** — third-party and customer sites load `https://cdn.optiview.ai/si.js`. |
| `demo.optiview.ai` | Pages `si-session-demo` | **Yes** — public demo; sales / pilots. |
| `dashboard.optiview.ai` | Pages `si-session-dashboard` | **Yes** — customers and operators (behind Access). |
| `optiview.ai` / `www.optiview.ai` | Pages `si-session-marketing` | **Yes** — public marketing and signup. |

Attach each hostname under **Workers & Pages → project → Custom domains** (or DNS CNAME as Cloudflare instructs). Until DNS exists, you will see errors such as `ERR_NAME_NOT_RESOLVED` for missing names (e.g. `cdn`).

Default **`.pages.dev`** URLs still exist for each Pages project; use them for smoke tests only, not for customer-facing installs.

## Deploy command (monorepo root)

| Resource | Command | Notes |
|----------|---------|--------|
| Worker | `pnpm deploy:worker` | Requires Wrangler auth; uses `--env production`. |
| Snippet CDN | `pnpm deploy:snippet` | Needs `SI_WORKER_URL` or `VITE_SI_WORKER_URL` (no trailing slash) so `si.js` bakes correct API origin. |
| Demo | `pnpm deploy:demo` | Same Worker URL env for build. |
| Dashboard | `pnpm deploy:dashboard` | Same Worker URL env for build (`VITE_SI_WORKER_URL`). |
| Marketing | `pnpm deploy:marketing` | Optional env overrides for public URLs; see [MARKETING_SITE.md](./MARKETING_SITE.md). |
| All of the above | `pnpm deploy:all` | Fails fast if `SI_WORKER_URL` / `VITE_SI_WORKER_URL` unset. |

## Customer-facing vs internal-only

- **Customer-facing:** `cdn.*`, `api.*` (collect/config from published sites), `demo.*`, `dashboard.*` (after Access), `optiview.ai` / `www`.
- **Internal / operator:** same dashboard and API; distinguish by **role** in D1 (`authorized_users`) and **Cloudflare Access** policies, not by separate Cloudflare project names.

## Custom domains — notes

1. **Worker:** `api.optiview.ai` must be on the **same** Worker that receives dashboard credentialed fetches, so Access JWT / cookies apply. See [DASHBOARD_AUTH.md](./DASHBOARD_AUTH.md).
2. **Pages:** each app has its own project; apex `optiview.ai` should attach only to **marketing**, not demo, or you will load the wrong app (e.g. demo trying to fetch `cdn.optiview.ai/si.js` before CDN DNS exists).
3. **CORS:** Worker `SI_DASHBOARD_ORIGINS` must list the **exact** dashboard Origin (e.g. `https://dashboard.optiview.ai`). Production safety rejects localhost in that list when `SI_DEPLOYMENT_MODE=production`.

## Orphan / deprecated resources

| Resource | Status |
|----------|--------|
| `session-intelligence-worker-production` | **Deprecated / orphan.** Created when `env.production` did not pin the Worker `name` to the top-level service. **Safe to delete** in the Cloudflare dashboard **only after** you confirm **no** custom domain, route, or bookmark still targets `session-intelligence-worker-production.*.workers.dev`. The live API should be **`session-intelligence-worker`** (what `pnpm deploy:worker` deploys today). |

## Rename later (post-beta)

Do **not** rename during beta stabilization. When ready, plan a single **rename day**: e.g. `optiview-cdn`, `optiview-demo`, `optiview-dashboard`, `optiview-marketing`, `optiview-api` — update every `wrangler.toml`, deploy script echo, doc, and reattach custom domains to the new project/worker names.
