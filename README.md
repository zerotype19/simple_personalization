# Session Intelligence (MVP)

Monorepo implementing the **Session Intelligence** MVP described in the product brief: a **one-script**, **local-first** anonymous session scoring + rules-based personalization layer, with a **demo retailer**, **inspector panel**, **Cloudflare Worker** ingestion/config APIs, and a **dashboard** for seeded + live lift reporting.

## Repo layout

- `packages/sdk` — browser SDK (`@si/sdk`)
- `packages/shared` — shared types (`@si/shared`)
- `apps/demo-retailer` — Velocity Motors demo site (React + Vite)
- `apps/dashboard` — operator dashboard (React + Vite)
- `worker` — Cloudflare Worker (`GET /config`, `POST /collect`, `GET /dashboard/*`); config in `worker/wrangler.toml`
- `apps/*/wrangler.toml` — Cloudflare Pages project names and `dist` output for direct upload / CI
- `.github/workflows/cloudflare-deploy.yml` — optional GitHub deploy (secrets documented in `docs/CLOUDFLARE.md`)

**Live Cloudflare:** `pnpm exec wrangler login` once, then **`pnpm cloudflare:up`** (Wrangler-only shell script). Details: [`docs/CLOUDFLARE.md`](docs/CLOUDFLARE.md).

## Prereqs

- Node **20+** and **pnpm** (`corepack enable` recommended)

## Install

```bash
pnpm install
```

## Local dev (recommended flow)

Terminal A — Worker (needs a configured D1 database id in `worker/wrangler.toml`):

```bash
pnpm dev:worker
```

Terminal B — Demo site (proxies `/config`, `/collect`, `/dashboard/*` to the worker):

```bash
pnpm dev:demo
```

Terminal C — Dashboard:

```bash
pnpm dev:dashboard
```

### D1 setup (one-time)

1. Create a D1 database:

```bash
cd worker
pnpm dlx wrangler d1 create session-intelligence
```

2. Copy the printed `database_id` into `worker/wrangler.toml` (`[[d1_databases]]`).

3. Apply migrations:

```bash
pnpm dlx wrangler d1 migrations apply session-intelligence --local
```

> For remote dev/prod, run the same command without `--local`.

## SDK usage (bundled IIFE)

Build the SDK:

```bash
pnpm --filter @si/sdk build
```

Host `packages/sdk/dist/sdk.iife.js` from your CDN/domain, then:

```html
<script
  async
  src="/sdk.iife.js"
  data-config="https://YOUR_WORKER/config"
  data-collect="https://YOUR_WORKER/collect"
  data-inspector="true"
></script>
```

At runtime:

```js
window.SessionIntel.getState();
window.SessionIntel.subscribe((state) => console.log(state));
```

### Hosted one-line snippet (webmasters: `src` only)

To ship a single URL such as `https://personalizeme.ai/si.js` with **no** `data-config` / `data-collect` on the customer page, bake your Worker endpoints into the IIFE at build time. Attributes on the tag still **override** these defaults.

```bash
SI_PUBLIC_WORKER_URL="https://YOUR_WORKER_HOST" \
SI_PUBLIC_FORCE_INSPECTOR=1 \
pnpm --filter @si/sdk build
```

That sets default `GET ${SI_PUBLIC_WORKER_URL}/config` and `POST ${SI_PUBLIC_WORKER_URL}/collect`. Alternatively set full URLs: `SI_PUBLIC_CONFIG_URL` and `SI_PUBLIC_COLLECT_URL` (they win over `SI_PUBLIC_WORKER_URL`).

Webmasters then add:

```html
<script async src="https://personalizeme.ai/si.js"></script>
```

- **On-site panel:** set `SI_PUBLIC_FORCE_INSPECTOR=1` so the Session Intelligence inspector opens without `data-inspector` or `?si_debug=1` (omit that env for a silent embed).
- **Your aggregate “data panel” (dashboard):** traffic still appears there as long as `POST /collect` reaches your Worker; each batch includes `origin` (the publisher site) for attribution.

## Privacy notes (MVP)

- No fingerprinting APIs are used.
- Analytics are **batched summaries** (see `POST /collect` payload).
- The SDK avoids storing raw page text; it extracts **lightweight keyword/category counts**.

## Product naming

This repo is intentionally generic (`simple_personalization`) but the shipped product name in-app is **Session Intelligence**.
