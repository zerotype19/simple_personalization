# Security and privacy FAQ

For security, legal, and privacy reviewers during **pilots** and **procurement**. Technical posture: [optiview.ai/privacy](https://optiview.ai/privacy). Engineering verification: [PRIVACY_QA.md](./PRIVACY_QA.md).

---

## Identity and tracking

**Does Optiview resolve anonymous visitors to known individuals?**  
No. Optiview is not an identity product. It does not maintain a cross-site identity graph or stitch browser sessions to CRM records inside the product.

**Does Optiview use cookies for visitor tracking?**  
No. The default snippet does not set tracking cookies.

**Does Optiview fingerprint browsers?**  
No. There is no canvas, font, or device fingerprinting path for identity stitching.

**Does data follow users across different websites?**  
No. Storage is scoped to **your site’s origin**. Another customer’s site cannot read your visitors’ Optiview storage.

---

## Browser storage

**What is stored in the browser?**  
Primarily **sessionStorage** under `si:session` — an anonymous session profile (signals, commercial intent classifications, decision envelope summaries for the tab/session).

**Why is localStorage used at all?**  
At most **one** key on your origin: `si:returning`, holding a **timestamp** to detect a prior visit. It is not used for cross-site tracking or identity.

**Can users clear this data?**  
Yes — via browser settings, private browsing, or site-data clear. Session data ends when the tab/session ends (sessionStorage).

**Is PII stored in browser storage?**  
Not by design. Do not place PII in attributes the tag reads for classification. Form **values** are not read.

---

## Forms and search

**Does Optiview capture what users type in forms?**  
No. Form intent uses **structure only** — field names, types, labels, placeholders, submit button text — not `input.value` or `textarea.value`.

**Are search queries stored?**  
No raw query text for profiling. Search forms are classified as search intent; the query string is not persisted in commercial memory or buyer copy.

---

## Data collection to servers

**What is sent to Optiview servers?**  
If collect is enabled, **aggregated / batched** session summaries (signals, classifications, session id) — not full DOM snapshots or keystrokes. Tenancy is resolved **server-side** from `snippet_key`; clients cannot assert arbitrary `tenant_id`.

**Who operates the servers?**  
Typically the customer’s or Optiview’s **Cloudflare Worker + D1** deployment under agreed policies. Access to the operator dashboard is protected by **Cloudflare Access**.

**Where is data processed?**  
Cloudflare’s network (region per account configuration). Confirm with your Cloudflare contract for residency requirements.

---

## Security controls

**How is the dashboard protected?**  
Cloudflare Access in production; role-based API (`customer_viewer` vs `platform_admin`). See [DASHBOARD_AUTH.md](./DASHBOARD_AUTH.md).

**Can one customer see another’s data?**  
No — API enforces tenant/site scope for `customer_viewer`.

**Is the snippet subresource integrity (SRI) required?**  
Optional hardening; default install loads from `cdn.optiview.ai` with versioned deploys. See [SNIPPET_HOSTING.md](./SNIPPET_HOSTING.md).

---

## Product behavior

**Does Optiview automatically change page content?**  
**Not by default.** It recommends surfaces and emits events; your GTM, Adobe, Optimizely, or CMS renders or suppresses.

**Can Optiview show aggressive or regulated copy?**  
Regulated verticals (healthcare, financial services) include extra suppression and fixture-tested guardrails. Customer `bad-decisions` patterns can be added in QA fixtures.

**Is the inspector visible to all visitors?**  
The SI control is often enabled in pilots for validation. Production sites typically gate debug (`?si_debug=1`) or omit the inspector from customer-facing builds.

---

## Compliance posture (non-legal)

This FAQ describes **technical behavior**, not legal adequacy for GDPR, CCPA, HIPAA, etc. Customers remain responsible for:

- Privacy policy and notice updates
- Consent where required
- DPA / subprocessors (Cloudflare, etc.)
- Retention on Worker/D1 if collect is enabled

For pilot validation steps, use [PRIVACY_QA.md](./PRIVACY_QA.md) and [EXTERNAL_BETA_CHECKLIST.md](./EXTERNAL_BETA_CHECKLIST.md) row P1–P2.

---

## Quick reference

| Question | Answer |
|----------|--------|
| Cookies? | No (tracking) |
| Fingerprinting? | No |
| Cross-site graph? | No |
| Form values? | Not read |
| Search queries stored? | No |
| Identity resolution? | No |
| DOM auto-rewrite? | No (default) |

**Pilot install:** [WEBMASTER_INSTALL_ONE_PAGER.md](./WEBMASTER_INSTALL_ONE_PAGER.md) · **Onboarding:** [PILOT_ONBOARDING.md](./PILOT_ONBOARDING.md)
