# What to expect in week 1

Set expectations with pilot sponsors and webmasters **before** install. This is not a performance guarantee — it is a realistic map of the first seven days.

Full path: [PILOT_ONBOARDING.md](./PILOT_ONBOARDING.md).

---

## Day 0 — Install

**You do:** Add the snippet, optional `data-si-surface` / `data-si-intent`, verify load and dashboard access.

**You see:** Inspector works; timeline starts on first page view; no visible change to your live UX unless you wire integrations.

**You do not see:** Automatic popups, price changes, or identity-linked profiles.

---

## Days 1–2 — Validation

**Focus:** Is the tag reading the site correctly and safely?

| Activity | Expected outcome |
|----------|------------------|
| Browse key templates | Page milestones in timeline |
| Click tier-1 CTAs | Commercial milestones (e.g. financing, test drive, demo request) |
| Submit forms | Structure-only form milestones; **no** field text in inspector |
| Privacy check | No cookies; optional `si:returning` only in localStorage |

Use [PILOT_ONBOARDING_CHECKLIST.md](./PILOT_ONBOARDING_CHECKLIST.md) — “First 48 hours” section.

---

## Days 3–5 — Pattern formation

**Focus:** Do anonymous sessions tell a coherent commercial story?

You may start to see:

- Recurring **journey phases** (research → comparison → evaluation)
- **Blockers** (pricing, financing, trust, eligibility) on regulated or high-consideration paths
- **Restraint** — null primaries or soft surfaces when readiness is low (this is a feature, not a failure)

Traffic volume matters: thin sites need more internal testing or staged scenarios.

---

## Day 5–7 — Readout prep

**Focus:** Translate signals into decisions your team can act on.

Prepare for the week-1 meeting:

1. **Top commercial states** — what visitors seem ready for (in buyer language)
2. **What was withheld** — where Optiview avoided hard escalation
3. **Surface map** — at least three regions worth wiring to your stack
4. **Integration** — one path to GTM, Adobe, Optimizely, or CMS ([CMS_ACTIVATION_EXAMPLES.md](./CMS_ACTIVATION_EXAMPLES.md))

Score the pilot: [PILOT_SUCCESS_SCORECARD.md](./PILOT_SUCCESS_SCORECARD.md).

---

## What week 1 is not

| Expectation | Reality |
|-------------|---------|
| Proven revenue lift | Pilots prove **decision quality** and **fit** first |
| Perfect copy on day one | Recipes and markup tune over time |
| Full CMS automation | You choose what renders; Optiview recommends |
| Identity-based segments | Anonymous session only |

---

## Roles

| Role | Week 1 responsibility |
|------|------------------------|
| **Webmaster** | Tag, CSP, markup, inspector checks |
| **Growth / product** | KPI alignment, surface priorities |
| **Optiview operator** | Provisioning, readout, scorecard |
| **Legal / security** (optional) | [SECURITY_PRIVACY_FAQ.md](./SECURITY_PRIVACY_FAQ.md) |

---

## End of week 1

You should leave with:

- A clear **proceed / pause / expand** decision
- A short **integration plan**
- A **measurement plan** tied to your analytics (not Optiview-only metrics)
- A list of **next surfaces** to implement

Demo for stakeholders: [OPTIVIEW_DEMO_SCRIPT.md](./OPTIVIEW_DEMO_SCRIPT.md).
