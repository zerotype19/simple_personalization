# Pilot onboarding checklist

Tick boxes during install and week 1. Narrative: [PILOT_ONBOARDING.md](./PILOT_ONBOARDING.md).

**Site:** ______________________ **Snippet key issued:** ☐ **Owner:** ______________________ **Dates:** __________ → __________

---

## Before install

- [ ] Signup approved; tenant / site / `authorized_users` provisioned ([FREE_ACCESS_ONBOARDING.md](./FREE_ACCESS_ONBOARDING.md))
- [ ] Customer received `data-si-key` (and optional `data-si-site`)
- [ ] Key surfaces and tier-1 CTAs documented
- [ ] One internal owner named

## Install (day 0)

- [ ] Script tag on all key templates (async, end of body or via GTM)
- [ ] `data-si-key` on script tag
- [ ] `si.js` + `si-inspector.css` load (200)
- [ ] CSP allows CDN + API (`connect-src`)
- [ ] `window.SessionIntel` in console
- [ ] Optional: `data-si-surface` on 2+ regions
- [ ] Optional: `data-si-intent` on tier-1 CTAs
- [ ] Dashboard login works (Access)
- [ ] Test browse → sessions visible in dashboard

## First 48 hours

- [ ] 5–10 templates browsed; timeline milestones look correct
- [ ] Tier-1 CTA clicks appear in timeline (not only page views)
- [ ] Form submit shows structure-only milestone (no field text in inspector)
- [ ] Buyer inspector: believable commercial read
- [ ] Privacy spot-check ([PRIVACY_QA.md](./PRIVACY_QA.md)) — no cookies, only `si:returning` in localStorage

## Week 1 readout

- [ ] Readout meeting held ([PILOT_WEEK_ONE_GUIDE.md](./PILOT_WEEK_ONE_GUIDE.md))
- [ ] Top commercial states reviewed
- [ ] Blockers and suppressions discussed
- [ ] ≥ 3 surface opportunities captured
- [ ] ≥ 1 integration path chosen
- [ ] [PILOT_SUCCESS_SCORECARD.md](./PILOT_SUCCESS_SCORECARD.md) completed

## Closeout

- [ ] Decision: Proceed / Pause / Expand
- [ ] Next surfaces list sent
- [ ] Integration + measurement plan sent
