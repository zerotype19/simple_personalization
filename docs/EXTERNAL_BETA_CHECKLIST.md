# External beta gate checklist

**Customer-facing beta readiness** — run this before inviting external pilots, agencies, or unpaid beta sites. It assumes technical deploy steps from [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md) are in progress or done.

Related: [CLOUDFLARE_INVENTORY.md](./CLOUDFLARE_INVENTORY.md) (hostname → project map).

---

1. [ ] **Remote D1 migrations applied** — including `signup_requests` (`0004_signup_requests.sql`):  
   `cd worker && pnpm exec wrangler d1 migrations apply session-intelligence --remote`

2. [ ] **Worker deployed in production mode** — `pnpm deploy:worker` (uses `wrangler deploy --env production`). Worker shows **`SI_DEPLOYMENT_MODE=production`** and bound **D1** in Wrangler output.

3. [ ] **Auth bypass disabled** — `SI_BYPASS_DASHBOARD_AUTH` not `1`; `SI_DEV_ACCESS_EMAIL` empty in production dashboard vars. Production Worker should **503** if misconfigured ([ENVIRONMENT_MODES.md](./ENVIRONMENT_MODES.md)).

4. [ ] **Cloudflare Access protects dashboard** — visiting `https://dashboard.optiview.ai` requires login.

5. [ ] **Access identity reaches Worker** — same Access application includes **`api.optiview.ai`**; after login, `GET https://api.optiview.ai/dashboard/me` returns **200** with your email when called from the dashboard origin with `credentials: "include"`.

6. [ ] **Dashboard CORS locked** — `SI_DASHBOARD_ORIGINS` is exactly production dashboard origin(s), e.g. `https://dashboard.optiview.ai` only (no localhost in prod).

7. [ ] **`customer_viewer` denied `/admin/signups`** — user with only `customer_viewer` gets **403** on `GET /dashboard/admin/signups` (or UI shows forbidden if they navigate there).

8. [ ] **`platform_admin` can access `/admin/signups`** — list loads; PATCH status works.

9. [ ] **Marketing `/signup` creates D1 row** — submit form on live marketing site; row appears with `status = pending` (verify via admin UI or D1 query).

10. [ ] **Admin can mark signup reviewed / approved / rejected** — buttons on `/admin/signups` update row status (no auto-provisioning required).

11. [ ] **Tenant / site / `authorized_user` manually provisioned** — per [FREE_ACCESS_ONBOARDING.md](./FREE_ACCESS_ONBOARDING.md).

12. [ ] **Customer snippet uses `data-si-key`** — install tag documents public snippet key; optional `data-si-site` per your schema.

13. [ ] **`/collect` resolves tenant/site server-side** — rows in `sessions_summary` get `tenant_id` / `site_id` from D1 lookup, not from client trust; mismatch returns **400** where applicable.

14. [ ] **Dashboard shows only authorized site data** — `customer_viewer` cannot query another tenant’s `site_id` (**403**).

15. [ ] **`cdn.optiview.ai/si.js` and `si-inspector.css` return 200** — DNS for `cdn` exists and points at **si-session-snippet**.

16. [ ] **Demo loads CDN snippet** — `demo.optiview.ai` (or your demo host) runs with hosted `si.js` from `cdn.optiview.ai` (not `ERR_NAME_NOT_RESOLVED`).

17. [ ] **Dashboard loads Worker by absolute URL** — production dashboard bundle uses `VITE_SI_WORKER_URL` (e.g. `https://api.optiview.ai`), not relative `/dashboard` calls that miss the API host.

---

When every item is checked, you are in a defensible **external beta** posture for Session Intelligence / Optiview.
