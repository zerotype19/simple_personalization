# Free access onboarding (manual MVP)

Optiview free access is **manual** in this phase: the marketing form captures intent, operators provision infrastructure, and customers install the snippet. No automatic tenant creation or billing.

## 1. Customer: signup request

1. Customer completes **Get free access** on the marketing site (`/signup`).
2. The browser `POST`s to **`POST https://api.optiview.ai/signup-request`** (or your Worker URL in staging).
3. The Worker validates input and inserts a row into D1 **`signup_requests`** with `status = 'pending'`.

Fields stored: `name`, `email`, `company`, `website`, `use_case`, `tools_json`, `created_at`.

## 2. Operator: review (dashboard)

1. Sign in as a **`platform_admin`** user on the operator dashboard.
2. Open **`/admin/signups`** (link: **Signup requests (admin)** on the main dashboard) to list rows from D1 `signup_requests`.
3. Use **Reviewed**, **Approved**, or **Rejected** to update status (read-only beyond status; no auto-provisioning).

## 3. Operator: review (SQL / D1)

Optional: inspect or export rows with the D1 console or `wrangler d1 execute` when you prefer not to use the dashboard UI.

## 4. Operator: create tenant and site

1. Create or reuse a **`tenants`** row for the customer organization.
2. Create a **`sites`** row linked to that tenant with the correct public hostname / configuration you use for snippet and collect routing.
3. Generate a **`snippet_key`** (or equivalent public site token) and associate it with the site record per your existing schema.

## 5. Operator: authorize dashboard users

1. Insert **`authorized_users`** rows for each email that should see the dashboard (Cloudflare Access should allow the same identities).
2. Confirm Cloudflare Access policies for **`dashboard.optiview.ai`** include those emails or IdP groups.

## 6. Customer: snippet and verify

1. Send the customer their **`data-si-key`** value (and any `data-si-site` guidance your deployment uses).
2. Customer adds the script from **`https://cdn.optiview.ai/si.js`** (or your CDN host) to their site.
3. Customer verifies in the browser console (`getPersonalizationSignal`, `getActivationPayload`, optional inspector).

## 7. Customer: dashboard login

1. Customer opens **`https://dashboard.optiview.ai`** and signs in via Cloudflare Access.
2. They confirm sessions and configuration in the operator dashboard.

## 8. What we are not doing yet

- No automated email from the Worker on signup.
- No auto-provisioning pipeline from `signup_requests` to `tenants` / `sites`.
- No payment or plan selection; positioning uses **Get free access** so paid tiers can be introduced later without contradicting public copy.

## Related docs

- [MARKETING_SITE.md](./MARKETING_SITE.md) — build, deploy, and API details for the marketing app.
- [DASHBOARD_AUTH.md](./DASHBOARD_AUTH.md) — Cloudflare Access and authorized users.
