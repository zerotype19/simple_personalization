# Optiview demo script

Product walkthrough for **prospects and pilot stakeholders** — not the internal Velocity engineering demo. Uses the **hosted** retailer demo and production URLs.

| Resource | URL |
|----------|-----|
| Live demo | `https://demo.optiview.ai` |
| Marketing | `https://optiview.ai` |
| Privacy | `https://optiview.ai/privacy` |
| Dashboard | `https://dashboard.optiview.ai` |
| Snippet CDN | `https://cdn.optiview.ai/si.js` |

Legacy internal script: [DEMO_SCRIPT.md](./DEMO_SCRIPT.md). Pilot install: [PILOT_ONBOARDING.md](./PILOT_ONBOARDING.md).

**Format:** **SAY** (narration) · **DO** (screen) · **CUE** (discussion)

---

## Before the call (5 min)

**DO:** Normal browser window (not incognito) on `https://demo.optiview.ai`. Optional second tab: dashboard (if audience is operators).

**DO:** Click **New session · re-roll A/B** on the demo strip so the room sees a fresh journey.

**SAY (20 sec):** “Optiview is an **anonymous experience decision runtime**. It tells you what this visit seems ready for and what to show next — without building an identity graph and without rewriting your site by default.”

---

## Act 1 — The problem (45 sec)

**SAY:** “Most stacks know **what happened** — page views, clicks, conversions. Fewer know **what to do next** for *this* anonymous visit without guessing or over-prompting.”

**CUE:** *Where do you still guess today — homepage vs finance vs high-intent CTA?*

---

## Act 2 — Live journey (6–8 min)

### Compare

**DO:** Go to **Compare**. Select two vehicles.

**SAY:** “Comparison behavior feeds commercial intent — not just a page view counter.”

### Finance

**DO:** Click **See payments for picks**. Adjust a slider on Finance.

**SAY:** “Payment and financing uncertainty is a first-class signal. The runtime can favor reassurance before a harder ask.”

### Test drive

**DO:** Navigate to **Test drive**. Click **Book test drive** (submit the form).

**SAY:** “Form submits are classified from **structure only** — button labels and field names, never what someone typed. That’s how we stay privacy-safe.”

**CUE:** *What is your tier-1 conversion on the site — and would the system recognize it today?*

---

## Act 3 — Buyer inspector (4 min)

**DO:** Open **Toggle Optiview judgment panel** (or SI chip / **Ctrl+Shift+backtick**). Stay on **Buyer view**.

**DO:** Scroll **Commercial intent read** and **Session highlights**.

**SAY:** “This is what a marketer or product owner can read without engineering jargon — financing uncertainty, movement toward in-person intent, scheduling form activity. Timeline milestones, not a chat log of PII.”

**DO:** Point at a withheld or soft recommendation if shown.

**SAY:** “Restraint is intentional. We’d rather miss a popup than train visitors to ignore noise.”

**CUE:** *Would you trust this read in a weekly ops meeting?*

---

## Act 4 — Operator view (optional, 3 min)

**DO:** Switch to **Operator view**. Show envelope / surface preview if audience is technical.

**SAY:** “Same session — more detail for implementation. Surface IDs map to your GTM, Adobe, or CMS. You decide what actually renders.”

**CUE:** *GTM, Adobe, or direct CMS — which is your default activation path?*

---

## Act 5 — Privacy and install (2 min)

**SAY:** “No tracking cookies. No fingerprinting. No cross-site identity graph. One optional localStorage key on your domain for return-visit detection. Full technical posture is on optiview.ai/privacy.”

**DO:** Briefly show [optiview.ai/privacy](https://optiview.ai/privacy) if security is in the room.

**SAY:** “Install is one async script and a snippet key. We recommend `data-si-intent` on your real conversion buttons so KPIs show up in the timeline.”

---

## Act 6 — Pilot close (1 min)

**SAY:** “Week one is about **believable decisions** and **three surface opportunities** — not guaranteed lift. We use a scorecard and a clear integration plan before scaling.”

**DO:** Mention [PILOT_ONBOARDING.md](./PILOT_ONBOARDING.md) / one-pager for their webmaster.

**CUE:** *Who owns the tag on your side, and when could we run a 48-hour validation?*

---

## Objection handles (short)

| Objection | Response |
|-----------|----------|
| “Is this another popup tool?” | Decisions can be inline, deferred, or null — suppression is core. |
| “Do you read form data?” | No values — structure-only classification. |
| “Do you need cookies?” | No tracking cookies; sessionStorage for the visit. |
| “Will you change our site?” | Not by default — you wire surfaces to your stack. |
| “How do we measure success?” | Week 1: believable reads + surface map + integration path; lift comes after activation. |

Privacy depth: [SECURITY_PRIVACY_FAQ.md](./SECURITY_PRIVACY_FAQ.md).
