# Live Cloudflare setup (Worker + D1 + Pages)

Use this when you want a **real** `*.workers.dev` Worker and hosted UIs—not local Miniflare.

## Automated path (recommended)

From the **repo root**, after you are logged in (see below):

```bash
pnpm cloudflare:bootstrap
```

This script: checks auth, finds or creates the D1 database named in `worker/wrangler.toml`, writes `database_id`, applies migrations **remotely**, deploys the Worker, builds the demo + dashboard with `VITE_SI_WORKER_URL`, and runs **`wrangler pages deploy`** for two Pages projects (default names: `si-session-demo`, `si-session-dashboard`; override with `CF_PAGES_DEMO_PROJECT` / `CF_PAGES_DASH_PROJECT`).

- Worker + D1 only (no Pages): `SKIP_PAGES=1 pnpm cloudflare:bootstrap` or `pnpm cloudflare:bootstrap -- --skip-pages`
- If deploy logs do not contain a `*.workers.dev` URL: set `SI_WORKER_URL=https://…workers.dev` and rerun (or rerun from the build step after a manual deploy).

### What you still set up manually in Cloudflare

| Manual step | When |
|-------------|------|
| **Cloudflare account** | Always. |
| **Wrangler auth** | Once per machine: `pnpm exec wrangler login` (browser), **or** create an **API token** under My Profile → API Tokens and export `CLOUDFLARE_API_TOKEN` (and `CLOUDFLARE_ACCOUNT_ID` if Wrangler asks). |
| **API token permissions** (if you use a token) | Include at least **Workers Scripts: Edit**, **D1: Edit**, **Cloudflare Pages: Edit** (and account read as needed) so bootstrap can deploy Worker + D1 + Pages. |
| **Dashboard clicks** | **Usually none** for Worker/D1/Pages if the script succeeds—Wrangler creates Pages projects on first deploy. Open **Workers & Pages** in the dashboard only to copy **Visit** URLs or attach **custom domains** (optional). |

If `wrangler pages deploy` fails with **permission denied**, fix the token (Pages:Edit) or use the manual Pages section below.

---

## Manual path (step-by-step)

If you prefer not to use the script, follow the numbered steps below.

## What you are provisioning

| Piece | Purpose |
|--------|--------|
| **D1** `session-intelligence` | Stores rows from `POST /collect` (sessions summary); powers live slices in `GET /dashboard/*`. |
| **Worker** `session-intelligence-worker` | `GET /config`, `POST /collect`, `GET /dashboard/summary`, `GET /dashboard/experiments`. |
| **Pages (×2)** | Static **demo retailer** and **dashboard**; they call the Worker using `VITE_SI_WORKER_URL`. |

KV is **optional** (remote config overrides + rate limiting). The Worker runs without KV.

## Prerequisites

- Cloudflare account (free tier is enough to try this).
- Node **20+** and **pnpm** on your machine.
- Repo installed: `pnpm install` from the monorepo root.

## 1. Log in to Cloudflare (Wrangler)

From the repo root:

```bash
pnpm --filter @si/worker exec wrangler login
```

Complete the browser flow. Wrangler stores credentials for later deploys.

## 2. Create a **remote** D1 database

```bash
cd worker
pnpm exec wrangler d1 create session-intelligence
```

Copy the printed **`database_id`** (UUID).

Open `worker/wrangler.toml` and set:

```toml
[[d1_databases]]
binding = "SI_DB"
database_name = "session-intelligence"
database_id = "<paste-your-database_id-here>"
migrations_dir = "db/migrations"
```

Keep `database_name` aligned with the name you used in `d1 create` (here: `session-intelligence`).

## 3. Apply migrations to **remote** D1

Still in `worker/`:

```bash
pnpm exec wrangler d1 migrations apply session-intelligence --remote
```

Use the same **database name** as in `wrangler.toml` (`session-intelligence`), not the binding name `SI_DB`.

## 4. Deploy the Worker

```bash
pnpm exec wrangler deploy
```

Wrangler prints the Worker URL. It will look like:

`https://session-intelligence-worker.<your-subdomain>.workers.dev`

If that name collides in your account, change the top-level `name = "session-intelligence-worker"` in `wrangler.toml` and deploy again (the URL path prefix matches the worker name).

### Smoke-test the live Worker

```bash
export SI_WORKER="https://session-intelligence-worker.<your-subdomain>.workers.dev"

curl -sS "$SI_WORKER/config" | head -c 200 && echo
curl -sS "$SI_WORKER/dashboard/summary" | head -c 200 && echo
```

You should see JSON (config + summary), not 5xx.

## 5. Build the frontends against the **live** Worker

Both apps read **`VITE_SI_WORKER_URL`** at **build time** (no trailing slash). It must be the **Worker origin** from step 4.

From the **monorepo root**:

```bash
export VITE_SI_WORKER_URL="https://session-intelligence-worker.<your-subdomain>.workers.dev"

pnpm --filter @si/demo-retailer build
pnpm --filter @si/dashboard build
```

Do **not** rely on the Vite dev proxy here—that only applies to `pnpm dev:*`.

## 6. Host the built sites (Cloudflare Pages recommended)

Create **two** Pages projects (one for the retailer, one for the dashboard). Connect your Git repo or upload a folder after a local build.

### Build settings (monorepo, pnpm)

Cloudflare Pages reads `packageManager` in the root `package.json` and can use pnpm.

**Demo retailer**

| Setting | Value |
|--------|--------|
| Root directory | `/` (repository root) |
| Build command | `pnpm install && pnpm --filter @si/demo-retailer build` |
| Build output directory | `apps/demo-retailer/dist` |

**Dashboard**

| Setting | Value |
|--------|--------|
| Root directory | `/` |
| Build command | `pnpm install && pnpm --filter @si/dashboard build` |
| Build output directory | `apps/dashboard/dist` |

### Required environment variable (both projects)

In **Pages → Settings → Environment variables** (at least **Production**; add **Preview** if you use preview deployments):

| Name | Example value |
|------|----------------|
| `VITE_SI_WORKER_URL` | `https://session-intelligence-worker.<your-subdomain>.workers.dev` |

No trailing slash. Redeploy after changing it.

### SPA routing

The apps include `public/_redirects` with:

```txt
/*    /index.html   200
```

so client-side routes work on Pages.

## 7. Click through the live demo

1. Open the **Pages** URL for the demo retailer.
2. Browse a few pages; open the Session Intelligence inspector if it appears.
3. Open the **dashboard** Pages URL and confirm metrics / experiments load (they call the same Worker).

`POST /collect` is CORS-open (`Access-Control-Allow-Origin: *`), so the browser can send batches from the Pages origin to the Worker origin.

## Optional: KV

Uncomment `[[kv_namespaces]]` in `worker/wrangler.toml`, create a KV namespace in the dashboard (or with Wrangler), set `id`, redeploy. Then:

- `GET /config` can merge overrides from KV key `config:active`.
- `POST /collect` uses KV for per-IP rate limits when `SI_KV` is bound.

## Optional: GitHub → Cloudflare automation

You can wire GitHub Actions with `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `D1_DATABASE_ID` (to patch `REPLACE_ME` in CI), and `SI_WORKER_URL` (same value as `VITE_SI_WORKER_URL` for builds). That is optional; the steps above are enough for a manual live demo.

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Worker deploy fails on D1 | `database_id` still `REPLACE_ME` or wrong UUID. |
| `/collect` 5xx on live | Migrations not applied `--remote`, or D1 binding wrong. |
| Pages UI loads but “could not reach worker” / empty data | `VITE_SI_WORKER_URL` missing or wrong at **build** time; fix env and **rebuild** (changing env alone does not change already-built JS). |
| 404 on deep links on Pages | Missing `_redirects` or output dir wrong. |
