# External beta runbook

Operational guide to verify **production** readiness before external pilots. This runbook does **not** change product behavior — it records **order**, **commands**, **URLs**, and **expected outputs** for evidence collection ([EXTERNAL_BETA_CHECKLIST.md](./EXTERNAL_BETA_CHECKLIST.md)).

**Prerequisites:** Cloudflare account access, Wrangler authenticated, production secrets configured. See [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md) and [PRODUCTION_HOSTING.md](./PRODUCTION_HOSTING.md).

---

## Roles

| Role | Responsibility |
|------|----------------|
| **Engineering operator** | Runs deploys, migrations, curl checks, attaches command output |
| **Dashboard verifier** | Access login, role tests (`customer_viewer` vs `platform_admin`) |
| **Privacy reviewer** | Signs [PRIVACY_QA.md](./PRIVACY_QA.md); confirms marketing copy |
| **Beta approver** | Product or engineering lead — final go/no-go for external invites |

Only the **beta approver** should mark the external beta gate complete after evidence is attached to the launch ticket.

---

## Phase 0 — Local sanity (optional, pre-production)

```bash
pnpm test
pnpm typecheck
pnpm decision-fixtures
pnpm build:snippet   # VITE_SI_WORKER_URL=https://api.optiview.ai
pnpm build:marketing
```

**Expected:** all tests pass; fixtures report 99/99 (or current count); builds exit 0.

---

## Phase 1 — Database and Worker

### 1.1 Apply remote D1 migrations

```bash
cd worker
pnpm exec wrangler d1 migrations apply session-intelligence --remote
```

**Expected output (example):**

```txt
Applied X migrations
```

**Evidence:** paste full command output into ticket.

**Verify signup table (optional):**

```bash
pnpm exec wrangler d1 execute session-intelligence --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table' AND name='signup_requests';"
```

**Expected:** one row `signup_requests`.

### 1.2 Deploy Worker (production)

From repo root:

```bash
pnpm deploy:worker
```

**Expected:** Wrangler reports production deployment; bindings include D1 `session-intelligence`.

**Verify vars** (dashboard or CLI):

- `SI_DEPLOYMENT_MODE=production`
- `SI_DASHBOARD_ORIGINS=https://dashboard.optiview.ai` (no localhost)
- `SI_BYPASS_DASHBOARD_AUTH` unset or `0`
- `SI_DEV_ACCESS_EMAIL` empty

**URLs:**

| Endpoint | Expected |
|----------|----------|
| `GET https://api.optiview.ai/config` | **200** JSON |
| `GET https://api.optiview.ai/dashboard/me` (no Access) | **403** from allowed origin |

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://api.optiview.ai/config
```

**Expected:** `200`

---

## Phase 2 — Cloudflare Access and dashboard auth

### 2.1 Access on dashboard

1. Open `https://dashboard.optiview.ai` in a private window (logged out).
2. **Expected:** Cloudflare Access login challenge.

**Evidence:** screenshot of Access login.

### 2.2 Access includes API host

Confirm the Access application protects **`api.optiview.ai`** (same app as dashboard) so `CF-Access-Authenticated-User-Email` reaches the Worker.

### 2.3 `/dashboard/me` after login

1. Log in via Access.
2. Open dashboard; DevTools → Network → `GET .../dashboard/me`.

**Expected:** **200**, JSON with `email`, `role`, `sites[]`.

**Evidence:** screenshot (redact email if posting publicly).

### 2.4 Role checks

| Action | Role | Expected |
|--------|------|----------|
| `GET /dashboard/admin/signups` | `customer_viewer` | **403** |
| `GET /dashboard/admin/signups` | `platform_admin` | **200** list |
| `PATCH /dashboard/admin/signups/:id` | `platform_admin` | **200** status update |

**Evidence:** Network tab screenshots per role.

---

## Phase 3 — Signup and provisioning

### 3.1 Marketing signup

1. Open `https://optiview.ai/signup` (or your marketing host).
2. Submit the form with a test email.

**Expected:** success message; row in D1 `signup_requests` with `status = pending`.

**Evidence:** form screenshot + admin list or SQL query output.

### 3.2 Manual provisioning

Follow [FREE_ACCESS_ONBOARDING.md](./FREE_ACCESS_ONBOARDING.md): tenant, site, `snippet_key`, `authorized_user`.

**Evidence:** admin screenshot or SQL showing site + user linkage.

---

## Phase 4 — Snippet CDN and demo

### 4.1 Build and deploy snippet

```bash
export VITE_SI_WORKER_URL=https://api.optiview.ai
pnpm build:snippet
pnpm deploy:snippet
```

### 4.2 CDN smoke

```bash
curl -sI https://cdn.optiview.ai/si.js | head -8
curl -sI https://cdn.optiview.ai/si-inspector.css | head -8
curl -sS https://cdn.optiview.ai/health.json
```

**Expected:**

- Both assets **HTTP 200**
- `si.js` content-type includes `javascript`
- `health.json` → `{ "ok": true, "service": "session-intelligence-snippet" }` (or current schema)

### 4.3 Deploy demo (hosted snippet)

```bash
VITE_SI_WORKER_URL=https://api.optiview.ai \
VITE_SI_DEMO_USE_HOSTED_SNIPPET=1 \
VITE_SI_SNIPPET_ORIGIN=https://cdn.optiview.ai \
pnpm deploy:demo
```

1. Open `https://demo.optiview.ai`
2. Footer shows build stamp (`demo … · snippet …`)
3. Network: `si.js` loaded from `cdn.optiview.ai`

**Evidence:** screenshot of footer + Network tab.

### 4.4 Deploy dashboard

```bash
VITE_SI_WORKER_URL=https://api.optiview.ai pnpm deploy:dashboard
```

**Expected:** API calls use `https://api.optiview.ai/dashboard/...` (absolute), not Pages-relative paths.

---

## Phase 5 — Collect and tenancy

### 5.1 Snippet on a provisioned site

Install tag (example):

```html
<script async src="https://cdn.optiview.ai/si.js" data-si-key="YOUR_PUBLIC_SNIPPET_KEY"></script>
```

Browse a few pages; confirm collect batches in Network tab.

**Expected:** POST `https://api.optiview.ai/collect` → **2xx**; server stores `tenant_id` / `site_id` from **snippet_key** lookup (not client-trusted tenant id).

**Mismatch test (optional):** send wrong `site_id` with valid key → **400** `site_id_snippet_mismatch`.

**Evidence:** collect request/response screenshot + dashboard or D1 row showing correct tenancy.

### 5.2 Tenant isolation

As `customer_viewer`, attempt another tenant's `site_id` in dashboard API.

**Expected:** **403**

---

## Phase 6 — Privacy documentation (no deploy)

1. Review `https://optiview.ai/privacy` (after `pnpm deploy:marketing` if copy changed).
2. Complete [PRIVACY_QA.md](./PRIVACY_QA.md) checklist.
3. Confirm [CUSTOMER_INSTALL.md](./CUSTOMER_INSTALL.md) storage table matches runtime.

**Evidence:** privacy page screenshot + signed PRIVACY_QA checklist in ticket.

---

## Rollback notes

| Failure | Rollback action |
|---------|-----------------|
| Bad Worker deploy | `wrangler rollback` (Workers dashboard) or redeploy previous git tag via `pnpm deploy:worker` |
| Bad snippet CDN | Redeploy prior commit: `git checkout <tag> && pnpm deploy:snippet` |
| Bad dashboard/demo Pages | Redeploy previous Pages deployment in Cloudflare UI or redeploy from known git SHA |
| Migration issue | **Do not** delete D1 in production without incident review; forward-fix with new migration |
| Access misconfiguration | Restore Access policy from Cloudflare audit log; verify `api` + `dashboard` hostnames |

Document the incident SHA and re-run this runbook from Phase 1 after fix.

---

## Completion

1. Attach all evidence to the launch ticket per [EXTERNAL_BETA_CHECKLIST.md](./EXTERNAL_BETA_CHECKLIST.md).
2. Privacy reviewer signs [PRIVACY_QA.md](./PRIVACY_QA.md).
3. **Beta approver** marks external beta **GO**.

**Related docs:** [DASHBOARD_AUTH.md](./DASHBOARD_AUTH.md), [SNIPPET_HOSTING.md](./SNIPPET_HOSTING.md), [COMMERCIAL_INTENT_ENGINE.md](./COMMERCIAL_INTENT_ENGINE.md) (storage boundaries).
