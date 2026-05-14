# Production hosting (Session Intelligence)

This document describes the **separated** Cloudflare layout for a GA-style B2B embed: static snippet CDN, Worker API, demo site, and operator dashboard.

## Target hostnames

| Hostname | Cloudflare project | Role |
| --- | --- | --- |
| `https://cdn.optiview.ai` | **si-session-snippet** (Pages) | Serves only `si.js`, `si-inspector.css`, `version.json`, `health.json` |
| `https://api.optiview.ai` | **session-intelligence-worker** (Worker) | `GET /config`, `POST /collect`, D1, future dashboard APIs |
| `https://demo.optiview.ai` | **si-session-demo** (Pages) | Velocity Motors demo SPA (may still mirror `/si.js` during migration) |
| `https://dashboard.optiview.ai` | **si-session-dashboard** (Pages) | Internal / operator UI |
| `https://www.optiview.ai` | (marketing) | Out of this repo; not deployed by these scripts |

The **tag runs in the visitor’s browser** after it is **served** from the CDN Pages project. The Worker is the **data plane** only.

## Environment variables (snippet + demo builds)

Build the hosted IIFE with these (no trailing slash on origins):

| Variable | Example | Purpose |
| --- | --- | --- |
| `VITE_SI_WORKER_URL` | `https://api.optiview.ai` | Baked into `si.js` as `/config` and `/collect` base |
| `VITE_SI_SNIPPET_ORIGIN` | `https://cdn.optiview.ai` | Default host for inspector CSS URL when `SI_PUBLIC_INSPECTOR_CSS_URL` is unset |
| `SI_PUBLIC_INSPECTOR_CSS_URL` | `https://cdn.optiview.ai/si-inspector.css` | Full URL baked into the IIFE for `<link rel="stylesheet">` |

For **Velocity demo** builds that load the same snippet publishers use:

| Variable | Example | Purpose |
| --- | --- | --- |
| `VITE_SI_DEMO_USE_HOSTED_SNIPPET` | `1` | Vite aliases `@si/sdk` to a bridge that loads `${VITE_SI_SNIPPET_ORIGIN}/si.js` |
| `VITE_SI_DEMO_SNIPPET_INSPECTOR` | `1` | Adds `data-inspector="1"` on the injected script tag |

`pnpm deploy:demo` sets the demo bridge flags by default. `pnpm cloudflare:deploy:pages` / `scripts/deploy-pages.sh` does **not** enable the bridge so the demo can still run fully bundled if the CDN is not live yet.

## Worker custom domain (`api.optiview.ai`)

1. Deploy the Worker: `pnpm deploy:worker` (Wrangler **`--env production`** — [ENVIRONMENT_MODES.md](./ENVIRONMENT_MODES.md)).
2. In Cloudflare **Workers & Pages** → **session-intelligence-worker** → **Triggers** → **Custom Domains**, add `api.optiview.ai` (or use **Routes** on the `optiview.ai` zone if you prefer pattern-based routing).
3. Ensure TLS is **Full (strict)** and DNS `A`/`AAAA` or `CNAME` for `api` points at the Worker as instructed by the dashboard.

Do **not** put `*.workers.dev` URLs in **customer-facing** install docs or production `si.js` builds. Always bake **`https://api.optiview.ai`** (or your final API host) via `VITE_SI_WORKER_URL` when running `pnpm build:snippet` or demo `prepare-hosted-snippet`.

## Pages projects and deploy commands

From the repo root (requires `VITE_SI_WORKER_URL` or `SI_WORKER_URL` except where noted):

| Command | Deploys |
| --- | --- |
| `pnpm deploy:worker` | Worker only (`wrangler deploy --env production`) |
| `pnpm deploy:snippet` | **si-session-snippet** only (`apps/snippet-cdn/dist`) |
| `pnpm deploy:demo` | **si-session-demo** only |
| `pnpm deploy:dashboard` | **si-session-dashboard** only |
| `pnpm deploy:all` | Worker → snippet → demo → dashboard (snippet before demo so the CDN bridge can load) |
| `pnpm cloudflare:deploy:pages` | Demo + dashboard **without** snippet project (legacy / transitional) |

Create the **si-session-snippet** Pages project in the Cloudflare dashboard the first time (same pattern as demo/dashboard), connect the repo or use **Direct Upload** with Wrangler as these scripts do.

## Cache and versioning

During beta, the snippet build emits a root **`_headers`** file (see `scripts/build-snippet-artifacts.mjs`) with:

- `si.js` / `si-inspector.css`: `Cache-Control: max-age=300`
- `version.json` / `health.json`: `no-cache`

Later you can ship immutable paths, for example:

- `https://cdn.optiview.ai/v1/si.js`
- `https://cdn.optiview.ai/latest/si.js`

MVP uses flat paths: `/si.js`, `/si-inspector.css`.

## Backward compatibility

While migrating, **si-session-demo** may continue to serve **`/si.js`** and **`/si-inspector.css`** from the same Pages deployment (see `prepare-hosted-snippet.mjs`). New production installs should prefer **`https://cdn.optiview.ai/si.js`** so demo or marketing deploys do not affect the embed.

See also: [SNIPPET_HOSTING.md](./SNIPPET_HOSTING.md), [CUSTOMER_INSTALL.md](./CUSTOMER_INSTALL.md), [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md), [DASHBOARD_AUTH.md](./DASHBOARD_AUTH.md).
