# External beta gate checklist

**Customer-facing beta readiness** — run this before inviting external pilots, agencies, or unpaid beta sites. Technical deploy steps live in [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md). Operational order and commands: [EXTERNAL_BETA_RUNBOOK.md](./EXTERNAL_BETA_RUNBOOK.md).

Related: [CLOUDFLARE_INVENTORY.md](./CLOUDFLARE_INVENTORY.md) (hostname → project map), [PRIVACY_QA.md](./PRIVACY_QA.md) (snippet privacy verification), [PILOT_ONBOARDING.md](./PILOT_ONBOARDING.md) (customer pilot path).

---

## How to use the evidence column

Each row must be **checked** and **evidenced** before external beta sign-off. Attach evidence in your launch ticket (screenshot, log excerpt, or command output). Minimum acceptable evidence types are listed per row.

| # | Check | Evidence required (attach to ticket) |
|---|--------|--------------------------------------|
| 1 | **Remote D1 migrations applied** — including `signup_requests` (`0004_signup_requests.sql`) | **Command output** showing successful apply, e.g. `cd worker && pnpm exec wrangler d1 migrations apply session-intelligence --remote` with `Applied N migrations` (screenshot or paste). Optional: `wrangler d1 execute session-intelligence --remote --command "SELECT name FROM sqlite_master WHERE type='table' AND name='signup_requests';"` showing one row. |
| 2 | **Worker deployed in production mode** | **Wrangler deploy output** showing `SI_DEPLOYMENT_MODE=production` and D1 binding. Screenshot of Workers dashboard → production deployment + vars. |
| 3 | **Auth bypass disabled** | **Screenshot** of production Worker vars: `SI_BYPASS_DASHBOARD_AUTH` not `1`, `SI_DEV_ACCESS_EMAIL` empty. Or `wrangler secret list` / dashboard vars export (redact secrets). Confirm misconfig returns **503** per [ENVIRONMENT_MODES.md](./ENVIRONMENT_MODES.md) if documented. |
| 4 | **Cloudflare Access protects dashboard** | **Screenshot** of browser redirect/login when visiting `https://dashboard.optiview.ai` while logged out of Access. Screenshot of Access application policy including dashboard hostname. |
| 5 | **Access identity reaches Worker** | **Screenshot** of Network tab: `GET https://api.optiview.ai/dashboard/me` → **200** with JSON `email` after Access login from dashboard origin (`credentials: include`). Include response body (redact if needed). |
| 6 | **Dashboard CORS locked** | **Screenshot** of Worker var `SI_DASHBOARD_ORIGINS` = `https://dashboard.optiview.ai` only (no localhost). Optional: failed preflight from wrong origin in Network tab. |
| 7 | **`customer_viewer` denied `/admin/signups`** | **Screenshot** of **403** on `GET https://api.optiview.ai/dashboard/admin/signups` as `customer_viewer`, or dashboard UI forbidden state. Include role from `/dashboard/me`. |
| 8 | **`platform_admin` can access `/admin/signups`** | **Screenshot** of admin list loading + successful **PATCH** status change (reviewed / approved / rejected). |
| 9 | **Marketing `/signup` creates D1 row** | **Screenshot** of form success + **admin UI row** or D1 query output: `SELECT id, email, status, created_at FROM signup_requests ORDER BY created_at DESC LIMIT 5;` showing `status = pending`. |
| 10 | **Admin can mark signup reviewed / approved / rejected** | **Screenshot** of status buttons and updated row in admin UI (same session as #8). |
| 11 | **Tenant / site / `authorized_user` manually provisioned** | **Screenshot** or SQL output confirming tenant, site, `snippet_key`, and user row per [FREE_ACCESS_ONBOARDING.md](./FREE_ACCESS_ONBOARDING.md). |
| 12 | **Customer snippet uses `data-si-key`** | **Screenshot** of install tag in dashboard or docs + live page **Elements** panel showing `data-si-key` on script tag. |
| 13 | **`/collect` resolves tenant/site server-side** | **Screenshot** of collect request payload (snippet_key present) + **D1/admin proof** that `sessions_summary` row has correct `tenant_id` / `site_id`. Mismatch test: **400** `site_id_snippet_mismatch` screenshot if applicable. |
| 14 | **Dashboard shows only authorized site data** | **Screenshot**: `customer_viewer` **403** when requesting another tenant's `site_id`, or UI scoped to allowed sites only. |
| 15 | **`cdn.optiview.ai/si.js` and `si-inspector.css` return 200** | **Command output**: `curl -sI https://cdn.optiview.ai/si.js \| head -5` and same for `si-inspector.css` showing `HTTP/2 200` and JS/CSS content types. |
| 16 | **Demo loads CDN snippet** | **Screenshot** of demo footer build stamp (`demo … · snippet …`) + Network tab `si.js` from `cdn.optiview.ai` (not `ERR_NAME_NOT_RESOLVED`). |
| 17 | **Dashboard loads Worker by absolute URL** | **Screenshot** of Network tab: dashboard API calls go to `https://api.optiview.ai/dashboard/...`, not relative `/dashboard` on Pages host. Optional: built bundle grep for `api.optiview.ai`. |

---

## Privacy / snippet posture (documentation only — no runtime change)

| # | Check | Evidence required |
|---|--------|-------------------|
| P1 | Marketing privacy page describes sessionStorage + single localStorage key | **Screenshot** of `https://optiview.ai/privacy` (or your marketing host) showing storage section. |
| P2 | Privacy QA checklist completed | Link or checkbox list from [PRIVACY_QA.md](./PRIVACY_QA.md) signed by reviewer. |

---

## Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Engineering | | | All rows 1–17 evidenced |
| Privacy / compliance reviewer | | | P1–P2 |
| Beta approver | | | Authorizes external pilot invites |

When every **required** row is checked with evidence, you are in a defensible **external beta** posture for Session Intelligence / Optiview.
