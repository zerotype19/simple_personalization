# Marketing site (`apps/marketing-site`)

Static Optiview marketing and onboarding surface for [https://optiview.ai](https://optiview.ai) (and `www`), built with Vite, React, TypeScript, and Tailwind. Deploy target: **Cloudflare Pages** project **`si-session-marketing`**.

## Routes

| Path | Purpose |
|------|---------|
| `/` | Homepage: positioning, how it works, integrations preview, privacy summary, CTAs |
| `/demo` | Explainer + link to hosted demo (`demo.optiview.ai`) |
| `/install` | Script install and verification steps |
| `/integrations` | GTM, Adobe, Optimizely, and generic integration snippets |
| `/privacy` | Technical privacy posture (not legal advice) |
| `/signup` | Free access request form |
| `/login` | Handoff to Cloudflare Access dashboard |
| `/thank-you` | Post-signup confirmation |

Client-side routing uses `BrowserRouter`. **`public/_redirects`** maps `/*` to `/index.html` so deep links work on Pages.

## Environment variables (build-time)

Defaults match production hostnames. Override at build time with:

| Variable | Default |
|----------|---------|
| `VITE_SI_CDN_URL` | `https://cdn.optiview.ai` |
| `VITE_SI_DEMO_URL` | `https://demo.optiview.ai` |
| `VITE_SI_DASHBOARD_URL` | `https://dashboard.optiview.ai` |
| `VITE_SI_API_URL` | `https://api.optiview.ai` |

The signup form posts to `POST {VITE_SI_API_URL}/signup-request` (same origin in dev via Vite proxy).

Optional dev proxy target (defaults to `http://127.0.0.1:8787`):

- `VITE_SI_API_DEV_PROXY` — Worker URL for local `wrangler dev` when proxying `/signup-request`.

## Scripts (monorepo root)

- `pnpm dev:marketing` — Vite dev server on port **5175**
- `pnpm build:marketing` — typecheck + production build to `apps/marketing-site/dist`
- `pnpm deploy:marketing` — build with default public URLs and `wrangler pages deploy` for `si-session-marketing`

`pnpm deploy:all` includes the marketing deploy after dashboard.

## Worker: `POST /signup-request`

The Session Intelligence Worker accepts JSON:

```json
{
  "name": "string",
  "email": "string",
  "company": "string",
  "website": "string",
  "use_case": "string",
  "tools": ["Adobe", "GTM"]
}
```

Responses: `{ "ok": true, "id": "<uuid>" }` on success; `{ "error": "<code>" }` on validation failure. CORS uses the same public headers as `/collect` (`access-control-allow-origin: *`).

Persistence: D1 table **`signup_requests`** (see migration `worker/db/migrations/0004_signup_requests.sql`). Apply migrations locally and remotely after deploy:

```bash
pnpm exec wrangler d1 migrations apply SI_DB --local
pnpm exec wrangler d1 migrations apply SI_DB --remote
```

When **`SI_KV`** is bound, signup requests are lightly rate-limited per connecting IP (10/hour).

No email is sent from the Worker yet; operators follow [FREE_ACCESS_ONBOARDING.md](./FREE_ACCESS_ONBOARDING.md).

## Constraints

This app is copy and routing only. It does **not** change inference logic, snippet runtime, signal schema, or privacy behavior in the SDK or Worker beyond the signup API and D1 table above.
