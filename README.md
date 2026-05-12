# Session Intelligence (MVP)

Monorepo implementing the **Session Intelligence** MVP described in the product brief: a **one-script**, **local-first** anonymous session scoring + rules-based personalization layer, with a **demo retailer**, **inspector panel**, **Cloudflare Worker** ingestion/config APIs, and a **dashboard** for seeded + live lift reporting.

## Repo layout

- `packages/sdk` — browser SDK (`@si/sdk`)
- `packages/shared` — shared types (`@si/shared`)
- `apps/demo-retailer` — Velocity Motors demo site (React + Vite)
- `apps/dashboard` — operator dashboard (React + Vite)
- `worker` — Cloudflare Worker (`GET /config`, `POST /collect`, `GET /dashboard/*`)

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

## Privacy notes (MVP)

- No fingerprinting APIs are used.
- Analytics are **batched summaries** (see `POST /collect` payload).
- The SDK avoids storing raw page text; it extracts **lightweight keyword/category counts**.

## Product naming

This repo is intentionally generic (`simple_personalization`) but the shipped product name in-app is **Session Intelligence**.
