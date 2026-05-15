# GTM: Session Intelligence experience decision → dataLayer

## What this does

1. Waits for **`window.__siBootFromTag`** (hosted `si.js` boot).
2. Subscribes to **all** meaningful experience updates.
3. Pushes **`si_experience_decision`** via **`pushExperienceDecisionToDataLayer()`** on each tick (and once immediately).

## Install in GTM

1. Add [Session Intelligence](https://optiview.ai/install) to the site (or inject `si.js` in another GTM tag that runs first).
2. **New tag → Custom HTML** → paste contents of **`custom-html.html`**.
3. **Trigger:** All Pages (or your consent-gated trigger).
4. **Tag sequencing:** After the tag that loads `si.js`, or use **`__siBootFromTag`** as this snippet does.

## GTM variables (Data Layer Variable)

Create DLVs for:

- `si_decision_surface_id`
- `si_decision_action`
- `si_decision_offer_type`
- `si_decision_message_angle`
- `si_decision_timing`
- `si_decision_confidence`
- `si_session_id`
- `si_suppression_summary`

## Trigger

**Custom Event** — Event name **`si_experience_decision`**.

## Full guide

See **`docs/integrations/google-tag-manager.md`**.
