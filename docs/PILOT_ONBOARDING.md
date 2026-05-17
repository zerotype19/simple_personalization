# Pilot onboarding

Bridge from **interest → install → first readout** for beta customers and their webmasters. This is operational packaging, not product code.

**Related assets**

| Doc | Use when |
|-----|----------|
| [PILOT_ONBOARDING_CHECKLIST.md](./PILOT_ONBOARDING_CHECKLIST.md) | Printable tick list for install + week 1 |
| [WEBMASTER_INSTALL_ONE_PAGER.md](./WEBMASTER_INSTALL_ONE_PAGER.md) | Hand to implementation / GTM owner |
| [PILOT_WEEK_ONE_GUIDE.md](./PILOT_WEEK_ONE_GUIDE.md) | Set expectations with stakeholders |
| [PILOT_SUCCESS_SCORECARD.md](./PILOT_SUCCESS_SCORECARD.md) | Score pilot at closeout |
| [OPTIVIEW_DEMO_SCRIPT.md](./OPTIVIEW_DEMO_SCRIPT.md) | Live product walkthrough |
| [SECURITY_PRIVACY_FAQ.md](./SECURITY_PRIVACY_FAQ.md) | Security / legal / privacy reviewers |

**Technical references:** [CUSTOMER_INSTALL.md](./CUSTOMER_INSTALL.md) · [PRIVACY_QA.md](./PRIVACY_QA.md) · [EXTERNAL_BETA_RUNBOOK.md](./EXTERNAL_BETA_RUNBOOK.md) · [CMS_ACTIVATION_EXAMPLES.md](./CMS_ACTIVATION_EXAMPLES.md) · [FREE_ACCESS_ONBOARDING.md](./FREE_ACCESS_ONBOARDING.md)

---

## 1. Pilot promise

Optiview helps teams understand what **anonymous visitors appear ready for** and **what experience should be shown next** — in plain language and stable surface IDs your stack can act on.

- **Decision-first:** recommendations, suppression, and commercial posture — not a black-box “personalize everything” switch.
- **Anonymous by design:** session-scoped signals on your origin; not identity resolution inside Optiview.
- **Your stack decides what renders:** the tag does not rewrite your CMS by default; you wire surfaces to GTM, Adobe, Optimizely, or your components.

---

## 2. Requirements (before day 0)

| Requirement | Why it matters |
|-------------|----------------|
| **Website access** to add one async `<script>` (or GTM custom HTML) | Core install |
| **List of key surfaces, CTAs, and conversion goals** | Maps `surface_id` and `data-si-intent` to business KPIs |
| **Optional:** GTM / Adobe / Optimizely / CMS access | Activation and measurement |
| **One internal owner** | Webmaster or growth lead for install + week-1 review |
| **Snippet key from Optiview** | `data-si-key` for tenancy and dashboard sessions |

Provisioning flow: [FREE_ACCESS_ONBOARDING.md](./FREE_ACCESS_ONBOARDING.md).

---

## 3. Install steps

Full detail: [CUSTOMER_INSTALL.md](./CUSTOMER_INSTALL.md) and [WEBMASTER_INSTALL_ONE_PAGER.md](./WEBMASTER_INSTALL_ONE_PAGER.md).

### 3.1 Add the tag

```html
<script
  async
  src="https://cdn.optiview.ai/si.js"
  data-si-key="YOUR_PUBLIC_SNIPPET_KEY"
></script>
```

Optional: `data-si-site="YOUR_SITE_ID"` when provisioned (must match the key’s site row).

### 3.2 Mark important regions (recommended)

```html
<section data-si-surface="finance_payment_assist">…</section>
```

Catalog IDs per vertical: [SURFACE_CATALOGS.md](./SURFACE_CATALOGS.md). Activation patterns: [CMS_ACTIVATION_EXAMPLES.md](./CMS_ACTIVATION_EXAMPLES.md).

### 3.3 Mark tier-1 CTAs (recommended)

```html
<button data-si-intent="schedule_test_drive">Book test drive</button>
```

Use on primary conversion controls so commercial intent and timeline reflect real KPIs, not generic “primary” buttons.

### 3.4 Confirm script loads

- Network: `si.js` and `si-inspector.css` from `cdn.optiview.ai` → **200**
- Console: `window.SessionIntel` exists after load
- CSP: `connect-src` allows your API host (e.g. `https://api.optiview.ai`) for `/config` and `/collect`

See [SNIPPET_HOSTING.md](./SNIPPET_HOSTING.md).

### 3.5 Confirm dashboard sees sessions

1. Log in at `https://dashboard.optiview.ai` (Cloudflare Access).
2. Select the provisioned site.
3. Browse the pilot site in a normal window; wait for collect batches.
4. Confirm session / signal activity appears (per your dashboard views).

---

## 4. First 48 hours

Goal: prove the tag is **safe**, **reading the site**, and **speaking believably**.

| Check | How to verify |
|-------|----------------|
| **Pages scanned** | Navigate 5–10 key templates; inspector timeline shows page milestones |
| **High-intent CTAs** | Click tier-1 CTAs; timeline shows commercial milestones (not only page views) |
| **Forms classified** | Submit lead, search, or appointment forms; timeline uses structure-only labels; no field text in inspector |
| **Surface preview** | Operator mode: regions with `data-si-surface` appear in preview |
| **Buyer inspector language** | Buyer view: no taxonomy ids, field names, or raw URLs; commercially plausible read |

Debug: `?si_debug=1` or inspector shortcut **⌘+Shift+`** / **Ctrl+Shift+`** (backtick). Privacy spot-check: [PRIVACY_QA.md](./PRIVACY_QA.md).

---

## 5. First week readout

Schedule a 30–45 minute review with the pilot owner. Bring:

| Topic | What to show |
|-------|----------------|
| **Top anonymous commercial states** | Recurring journey phases, strongest action families, momentum (validating vs increasing) |
| **Common blockers** | Pricing, financing, trust, eligibility, integration — whichever appear in sessions |
| **Surfaces recommended** | Primary / secondary decisions and catalog surfaces that matched |
| **Suppressions / withheld escalation** | Where the runtime stayed patient (null primary, defer, regulated restraint) |
| **Integration opportunities** | dataLayer / Adobe / Optimizely / CMS hooks that fit their stack |
| **Copy / surface improvements** | Recipe or markup tweaks (`data-si-intent`, `data-si-surface`, forbidden copy) |

Template: [PILOT_WEEK_ONE_GUIDE.md](./PILOT_WEEK_ONE_GUIDE.md). Scorecard: [PILOT_SUCCESS_SCORECARD.md](./PILOT_SUCCESS_SCORECARD.md).

---

## 6. Success criteria

A pilot is **successful enough to expand** when most of these are true:

- [ ] Tag loads cleanly on all key templates (no CSP / CDN errors)
- [ ] No privacy issues raised in review ([SECURITY_PRIVACY_FAQ.md](./SECURITY_PRIVACY_FAQ.md))
- [ ] Decisions feel **commercially believable** on real sessions (not generic popups)
- [ ] At least **3 useful surface opportunities** identified (regions + `surface_id` + why)
- [ ] At least **1 integration path** selected (GTM, Adobe, Optimizely, or direct CMS)

---

## 7. What Optiview does not do

| Not in scope | Note |
|--------------|------|
| Identity resolution | Not an ID graph or CDP |
| Fingerprinting | No device fingerprint for stitching |
| Automatic DOM rewrites (default) | You render; Optiview recommends |
| Cookies for tracking | Session uses sessionStorage; one optional `localStorage` return-visit flag |
| Raw form value capture | Structure-only form intent |
| Raw search query storage | Search classified, query text not stored |
| Guaranteed lift | Pilots prove **decision quality** and **integration fit** first |

Public copy: [optiview.ai/privacy](https://optiview.ai/privacy).

---

## 8. Troubleshooting

| Symptom | Likely cause | What to do |
|---------|--------------|------------|
| **Snippet not loading** | CSP, wrong URL, ad blocker | Allow `cdn.optiview.ai`; verify `curl -sI https://cdn.optiview.ai/si.js` |
| **Stale CDN** | Old cached `si.js` | Hard reload; check footer/build stamp on demo; redeploy snippet if you operate CDN |
| **Dashboard auth fails** | Access / email not provisioned | Confirm Cloudflare Access + `authorized_users` row ([DASHBOARD_AUTH.md](./DASHBOARD_AUTH.md)) |
| **No sessions in dashboard** | Missing `data-si-key`, domain mismatch, collect blocked | Verify key, `sites.domain`, Network tab `POST /collect` → 2xx |
| **No decisions** | Low engagement, suppression, wrong vertical config | Browse deeper paths; check inspector envelope; confirm site vertical |
| **CTAs not classified** | Generic buttons, no `data-si-intent` | Add intent attributes on tier-1 CTAs; use visible commercial labels |
| **Forms not classified** | Submit prevented before capture phase | Ensure native `submit` fires; check structure (button text, field names) |

Operator production checks: [EXTERNAL_BETA_RUNBOOK.md](./EXTERNAL_BETA_RUNBOOK.md).

---

## 9. Pilot closeout

At end of week 1–2, complete [PILOT_SUCCESS_SCORECARD.md](./PILOT_SUCCESS_SCORECARD.md) and decide:

| Outcome | Next step |
|---------|-----------|
| **Proceed** | Lock integration path; expand `data-si-surface` coverage; define measurement |
| **Pause** | Fix markup, CSP, or vertical config; re-run 48-hour validation |
| **Expand** | Additional templates, second brand/site, stakeholder demo ([OPTIVIEW_DEMO_SCRIPT.md](./OPTIVIEW_DEMO_SCRIPT.md)) |

**Deliverables to customer**

1. Recommended **next surfaces** (IDs + placement)
2. **Integration plan** (one primary destination: GTM vs Adobe vs CMS)
3. **Measurement plan** (what “ready for X” means in their analytics, not Optiview-only metrics)

---

## Quick start (operator → customer email)

> You will add one async script from `https://cdn.optiview.ai/si.js` with the snippet key we provide. Optiview runs anonymously in the browser on your domain, classifies commercial intent without reading form values, and recommends **what to show next** — your team still controls rendering. After install, use the inspector (SI button or Ctrl+Shift+backtick) for a buyer-safe readout. We will review week 1 together using the success scorecard.
