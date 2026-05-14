# Environment modes (development, staging, production)

Session Intelligence distinguishes **where code runs** from **how strictly we enforce production safety**. The Worker reads **`SI_DEPLOYMENT_MODE`** (preferred) and falls back to **`SI_ENV`** when the mode is unset.

| Mode | Typical use | Worker safety |
| --- | --- | --- |
| **development** | `wrangler dev`, local D1, Vite dashboard on localhost | No deployment gate. Dashboard auth bypass is allowed via **`worker/.dev.vars`**. |
| **staging** | Pre-production Worker + staging dashboard hostname | Requests stay enabled; **warnings** are logged for bypass, `SI_DEV_ACCESS_EMAIL`, or localhost in `SI_DASHBOARD_ORIGINS`. |
| **production** | `api.optiview.ai` + `dashboard.optiview.ai` | **Hard gate**: if `SI_BYPASS_DASHBOARD_AUTH` is enabled, `SI_DEV_ACCESS_EMAIL` is set, or `SI_DASHBOARD_ORIGINS` includes localhost / loopback, the Worker returns **503** on every route (including `/collect`) until fixed. |

See also [DASHBOARD_AUTH.md](./DASHBOARD_AUTH.md) and [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md).

## Variables

| Variable | Values | Purpose |
| --- | --- | --- |
| `SI_DEPLOYMENT_MODE` | `development`, `staging`, `production` (aliases: `dev`, `prod`, `stage`) | Primary mode selector for safety checks and dashboard banner fields on `GET /dashboard/me`. |
| `SI_ENV` | legacy string (`dev`, `production`, …) | Used only when `SI_DEPLOYMENT_MODE` is **unset**. Prefer `SI_DEPLOYMENT_MODE` for new configs. |
| `SI_BYPASS_DASHBOARD_AUTH` | `0` / `1` (also `true`, `yes`, `on`) | When enabled, Worker trusts `X-SI-Dev-Access-Email` or `SI_DEV_ACCESS_EMAIL`. **Forbidden in production.** |
| `SI_DEV_ACCESS_EMAIL` | email or empty | Fallback identity when bypass is on. **Must be unset in production.** |
| `SI_DASHBOARD_ORIGINS` | comma-separated exact `Origin` values | Credentialed CORS for `/dashboard/*`. **Must not include `localhost`, `127.0.0.1`, or `::1` in production.** |

## Local development

1. Default **`worker/wrangler.toml`** `[vars]` ship with **`SI_BYPASS_DASHBOARD_AUTH=0`** and **`SI_DEPLOYMENT_MODE=development`** so a bare `wrangler deploy` (without `--env production`) does not publish an auth bypass.
2. Copy **`worker/.dev.vars.example`** → **`worker/.dev.vars`** (gitignored) and set **`SI_BYPASS_DASHBOARD_AUTH=1`**, **`SI_DEV_ACCESS_EMAIL`**, and localhost dashboard origins as needed.
3. Run **`pnpm dev:worker`** (or `cd worker && pnpm exec wrangler dev`). Wrangler loads `.dev.vars` on top of `[vars]`.

The **dashboard** Vite dev server proxies `/dashboard` to the Worker and sends **`X-SI-Dev-Access-Email`** (from `VITE_SI_DEV_ACCESS_EMAIL`).

## Staging / demo

- Deploy with **`pnpm exec wrangler deploy --env staging`** after adjusting **`[env.staging.vars]`** in `worker/wrangler.toml` (especially **`SI_DASHBOARD_ORIGINS`** for your staging Pages hostname).
- Prefer **`SI_BYPASS_DASHBOARD_AUTH=0`** and real Cloudflare Access so staging matches production auth behavior.
- If you temporarily enable bypass on staging, expect **warning** lines in Worker logs (`[si-deployment:staging] …`).

## Production

1. Deploy the Worker with **`pnpm deploy:worker`** from the repo root (runs **`wrangler deploy --env production`**).
2. In the Cloudflare dashboard, confirm **production** vars and secrets do not reintroduce **`SI_BYPASS_DASHBOARD_AUTH=1`** or **`SI_DEV_ACCESS_EMAIL`** (dashboard overrides merge with `wrangler.toml`; **`SI_DEPLOYMENT_MODE`** must remain **`production`**).
3. **`SI_DASHBOARD_ORIGINS`** should list only real dashboard origins (for example `https://dashboard.optiview.ai`), never localhost.

### Runtime checks

**`assertProductionSafety(env)`** runs at the beginning of every Worker request. It calls **`evaluateDeploymentSafety`** for the resolved mode and:

- In **production**, returns **503** `{"error":"deployment_misconfigured","errors":[…]}` when rules are violated.
- In **staging**, logs warnings only (Worker stays up).
- In **development**, no-op.

## Deploy scripts (explicit production)

| Script | Worker command |
| --- | --- |
| `pnpm deploy:worker` | `wrangler deploy --env production` |
| `pnpm --filter @si/worker run deploy:development` | `wrangler deploy` (default `[vars]` only — still **`development`** mode; use for non-prod Workers only) |

CI (`.github/workflows/cloudflare-deploy.yml`) uses **`--env production`**.

## Dashboard UI

`GET /dashboard/me` includes **`deployment_mode`** and **`auth_bypass_enabled`**. When **`deployment_mode !== "production"`**, the dashboard shows an amber banner:

- With bypass: **“Development environment — auth bypass enabled”** or **“Staging environment — auth bypass enabled”**.
- Without bypass: **“Development environment”** or **“Staging environment”**.

## Acceptance mapping

- Production Worker **cannot** run with auth bypass or dev access email (503).
- Production Worker **cannot** run with localhost loopback entries in **`SI_DASHBOARD_ORIGINS`** (503).
- Non-production mode is **visible** in the dashboard banner.
- Vitest covers **`evaluateDeploymentSafety`** and **`assertProductionSafety`** in `worker/src/__tests__/deployment-safety.test.ts`.
