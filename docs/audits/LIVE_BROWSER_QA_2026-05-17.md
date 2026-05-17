# Live browser QA — production ecosystem

**Date/time:** 2026-05-17 (browser pass, UTC evening)  
**Browser:** Cursor IDE Browser (Chromium-based automation)  
**Profile:** Shared automation session (not a clean incognito profile; prior demo sessions may have warmed `sessionStorage`)  
**Expected build:** `1e85a91` (demo + SDK + CDN snippet)  
**Auditor:** Automated browser QA per release-gate checklist (no code changes in this pass)

---

## Executive summary

| Result | Count |
|--------|------:|
| **Pass** | 18 |
| **Partial / warn** | 8 |
| **Fail** | 5 |

**Release gate recommendation:** **Ship for pilot/demo with known P1 copy fixes queued** — core live journey and form-submit “aha” work on `demo.optiview.ai` at `1e85a91`. Blockers are **buyer-trust copy leaks** (implementation jargon in inspector empty states and scenario replay summaries), not journey mechanics.

---

## Environment evidence

### CDN `version.json`

```json
{
  "name": "session-intelligence-snippet",
  "version": "0.1.0",
  "commit": "1e85a91c4bf92802153e4173f79382d4c37301f0",
  "built_at": "2026-05-17T01:14:16.016Z",
  "worker_url": "https://api.optiview.ai",
  "snippet_origin": "https://cdn.optiview.ai"
}
```

- `GET https://cdn.optiview.ai/version.json` → **200**
- `GET https://cdn.optiview.ai/si.js` → **200** (`content-type: application/javascript`)

### Demo footer (observed)

```text
Build: demo 1e85a91 · SDK 1e85a91 · snippet 1e85a91
```

### Stale cache

- No stale snippet observed when footer SHAs match CDN commit.
- Marketing/demo load `https://cdn.optiview.ai/si.js` (network tab). Cache-bust query is baked at **demo build** time via `VITE_SI_SNIPPET_VERSION` (not visible in static HTML curl because demo is a SPA).

### Console (cross-site pattern)

Repeated **debug** (not fatal) on `optiview.ai`, `demo.optiview.ai`, `rhythm90.io`:

```text
Access to resource at 'https://api.optiview.ai/collect' from origin '…' has been blocked by CORS policy:
The value of the 'Access-Control-Allow-Origin' header must not be the wildcard '*'
when the request's credentials mode is 'include'.
```

Session Intelligence still boots and inspector works in-browser; **server collect may be failing** for credentialed pings.

---

## Results table

| Area | Pass/Fail | Severity | Evidence (summary) | Required fix | Owner / area |
|------|-----------|----------|------------------|--------------|--------------|
| **A. Marketing** | **Partial** | P2 | Hero: “Anonymous experience decision runtime”; H1: “Decide what to show… before visitors identify themselves”; privacy bullets present. CTAs: Demo, Get free access, Privacy, Install, Integrations, Dashboard visible. SI launcher present; inspector opens **Buyer** default. | Align marketing hero with “earned escalation / commercial judgment” wedge (demo already does). | `apps/marketing-site` |
| **A. Marketing — snippet** | **Pass** | — | `cdn.optiview.ai/si.js` + `si-inspector.css` load 200. | — | CDN / marketing `index.html` |
| **A. Marketing — buyer jargon** | **Fail** | P1 | Buyer inspector empty state: `Add data-si-surface="surface_id"…` | Buyer-safe empty state; hide `surface_id` / attribute names in buyer mode | `packages/sdk/src/inspector.ts` |
| **A. Marketing — example copy** | **Partial** | P2 | Static example block: “Reading implementation-focused content” (marketing content, not inspector). | Optional copy refresh for auto-retail wedge | `apps/marketing-site` |
| **B. Privacy page** | **Pass** | — | `/privacy`: sessionStorage, `si:returning`, no cookies/fingerprinting/identity graph, no raw form values, no raw search queries. | — | `apps/marketing-site/src/pages/PrivacyPage.tsx` |
| **C. CDN version** | **Pass** | — | commit `1e85a91`, worker + origin correct. | — | `deploy:snippet` |
| **D. Demo hub** | **Pass** | — | Hero “See when escalation is actually earned”; no Velocity Motors; replay **▸ collapsed** (without `si_debug`); core 4 steps + optional inventory; **Recommended experiences** human copy. | — | `apps/demo-retailer` |
| **D. Live journey** | **Pass** | — | Compare → Finance (restraint banner) → Test drive → Submit; inspector **auto-opens**, **Buyer** pressed. | — | demo + SDK |
| **D. Timeline after submit** | **Pass** | — | Includes: Compare/shortlist, financing guidance + page, test drive page, “Moved toward an in-person test drive”, **“Moved toward scheduling or an in-person visit”** (not generic form line). | — | `classifyFormIntent` / `formTimelineLabels` |
| **D. Ladder state** | **Partial** | P2 | Ladder lists all five labels including “Implementation-focused”; **current** step not exposed in a11y tree (likely **Comparing** after `1e85a91` auto fix—visual confirm recommended). | Optional: buyer ladder label “Validation-focused” for auto | `experienceStatePresentation.ts` |
| **D. Buyer forbidden terms** | **Pass** | — | No `route ticks`, `cooldown`, `gates`, `candidates`, `data-si-cta`, raw scores in live journey inspector buyer view. | — | buyer copy filters |
| **D. Timeline polish** | **Partial** | P2 | “Activation readiness moved up” still in session highlights (semi-technical). | Buyer-safe timeline label | `sessionIntel` / timeline formatters |
| **E. Inspector modes** | **Pass** | — | Buyer default; Operator shows diagnostics (`route ticks`, scores, etc.); toggle back restores buyer copy. Minimize/close work; page CTAs remain in snapshot. | — | SDK inspector |
| **E. `?si_debug=1`** | **Partial** | P2 | Replay **▾ expanded**; inspector opens on load. **Buyer** still default (not Operator)—demo intentionally sets buyer mode. | Document: `si_debug` opens drawer; operator via toggle or separate flag | docs + demo `main.tsx` |
| **F. Scenario presets** | **Partial** | P1 | “Preset replay only — not your live session” **present**. Presets advance on Next step. Replay summary shows **`Surface: …` module names** (e.g. `Inventory Assist Module`, `Finance Payment Assist`). | `buyerSafeLineOrNull` on preset judgment lines; hide Surface/Timing in embedded replay | `ScenarioPresetsPanel.tsx` + SDK |
| **G. Recommended experiences** | **Pass** | — | Page section **“Recommended experiences”** with Why/When/Withheld; no visible `surface_id`. Inspector buyer still says **“Surface preview”** (section title). | Rename inspector section to match demo | `inspector.ts` |
| **G. DOM rewrite** | **Pass** | — | No automatic DOM rewrite observed on demo pages. | — | — |
| **H. Console API** | **Not run** | P3 | Browser automation did not execute `window.SessionIntel.*` in DevTools console this pass. Inspector + journey imply runtime booted. | Manual spot-check or Playwright `page.evaluate` in CI gate | QA script |
| **I. Dashboard** | **Pass** | — | `https://dashboard.optiview.ai/` → **Cloudflare Access** email OTP gate (`zerotype.cloudflareaccess.com`). | None (expected) | infra |
| **J. rhythm90.io** | **Pass** | — | Tag installed; SI launcher; buyer inspector; exploratory copy, no operator jargon in buyer sections tested. | — | customer site |
| **Global CORS collect** | **Fail** | P2 | Credentialed `POST /collect` blocked with `Access-Control-Allow-Origin: *`. | Worker CORS: echo `Origin` when credentials used, or disable credentials on ping | `api` worker |

---

## Section evidence (visible text)

### A. Marketing — `https://optiview.ai/`

**Hero (accessibility snapshot):**

- Eyebrow: “Anonymous experience decision runtime”
- H1: “Decide what to show on each surface—before visitors identify themselves.”
- “No fingerprinting. No identity graph. No raw search queries. Session-scoped by design.”

**Navigation links exercised (present):** Product, Demo, Install, Integrations, Privacy, Login, Get free access, Try the live demo, Dashboard.

**Inspector:** SI toggle → expanded; **Buyer view** `[pressed]`; Runtime state + Commercial intent read in plain language.

**Screenshot:** `qa-marketing-hero.png` (automation capture).

---

### B. Privacy — `https://optiview.ai/privacy`

**Quoted:**

> **Browser storage (visitor device)** — The snippet runs on your site's origin…  
> **sessionStorage (primary)** — Anonymous session state… including the session profile (`si:session`)…  
> **localStorage (one key only)** — Optiview may write one localStorage key, **`si:returning`**, on your origin…  
> **What is not collected:** No cookies… No browser fingerprinting… No cross-site identity graph… No raw form field values… No raw on-site search query text stored…

**Tone:** Calm, technical. **Pass.**

---

### C. CDN / snippet loading

| Check | Result |
|-------|--------|
| `version.json` commit | `1e85a91` |
| `worker_url` | `https://api.optiview.ai` |
| `snippet_origin` | `https://cdn.optiview.ai` |
| Marketing network | `si.js`, `si-inspector.css`, `/config` XHR 200 |

---

### D. Demo journey — `https://demo.optiview.ai/`

**Hub checks**

| Check | Result |
|-------|--------|
| Product in &lt;15s | **Pass** — “See when escalation is actually earned” + wedge paragraph |
| Dealership noise | **Pass** — no Velocity Motors branding |
| Replay collapsed | **Pass** — “▸ Replay preset journeys” |
| SHAs | `demo 1e85a91 · SDK 1e85a91 · snippet 1e85a91` |

**Finance restraint (visible):**

> **Why no stronger interruption appeared yet**  
> Optiview detected growing interest, but the visitor still appears to be validating financing and comparing options. The runtime intentionally held back a stronger dealer escalation.

**After submit (inspector buyer, visible timeline excerpts):**

- Viewed Compare or shortlist page  
- Engaged with financing or payment guidance  
- Viewed Financing or payment page  
- Moved toward an in-person test drive  
- Viewed Test drive or appointment page  
- **Moved toward scheduling or an in-person visit**  
- Submitted — the inspector should open in buyer view with the live read highlighted. (page message)

**Commercial intent read (after submit):**

- “A scheduling or visit-oriented form step suggests readiness for an in-person next step.”
- “Recent actions suggest interest in human contact or an in-person next step.”

**Second submit:** Not re-tested in this pass (fixed in `1e85a91` per prior QA; recommend one manual re-check).

---

### E. Inspector modes (demo)

| Step | Result |
|------|--------|
| Buyer default | **Pass** |
| Operator toggle | **Pass** — extended diagnostics visible |
| Back to Buyer | **Pass** |
| `?si_debug=1` | Replay auto-expanded; inspector open; **Buyer** still default |
| Close / minimize | **Pass** — controls present; no stuck overlay reported |

---

### F. Scenario presets (sample)

| Preset | Next step | Notes |
|--------|-----------|-------|
| Test-drive earned (auto) | Yes | “Preset replay only — not your live session”; judgment line: `Judgment: … · Surface: Finance Payment Assist · Timing: …` → **P1** |
| (Others) | Not full matrix | Spot-check only this pass |

**Recommendation:** Run full matrix (B2B implementation-focused, ecommerce comparison, healthcare eligibility, finance calculator) in next gate with scripted Playwright.

---

### G. Surface / recommended experiences

- **Demo page:** “Recommended experiences” — Payment reassurance, Inventory reassurance, Test-drive soft prompt; human Why/When/Withheld. **Pass.**
- **Inspector buyer:** Section still titled **“Surface preview”**; empty state mentions `data-si-surface` and `surface_id`. **Fail P1** in inspector only.

---

### H. Console API

**Status:** Not executed in this browser automation run.

**Suggested manual commands on demo after journey:**

```js
window.SessionIntel.getExperienceDecisionEnvelope()
window.SessionIntel.getAllExperienceDecisions()
window.SessionIntel.getDecisionReplayFrames()
window.SessionIntel.getState()
```

---

### I. Dashboard — `https://dashboard.optiview.ai/`

**Observed:** Cloudflare Access login — “Sign in ・ Cloudflare Access”, email field, “Send login code”. Application dashboard not reachable without auth. **Expected.**

---

### J. rhythm90.io — `https://rhythm90.io/`

| Check | Result |
|-------|--------|
| Tag installed | **Yes** — “Toggle Optiview judgment panel” |
| Buyer default | **Yes** |
| Buyer copy | Early exploration read; no `surface_id` in opening buyer sections |
| Empty surface help | Same global `data-si-surface="surface_id"` text when no regions mapped |

---

## Recommended fixes (separate from this audit commit)

### P1 — Buyer trust

1. **Inspector buyer empty state** — Remove `surface_id`, `data-si-surface`, and “operator mode” from buyer-facing HTML; keep in operator only.  
   - File: `packages/sdk/src/inspector.ts`

2. **Scenario preset replay summary** — Strip `Surface:` / module codenames from embedded replay judgment line; use buyer-safe labels only.  
   - Files: `apps/demo-retailer/src/components/ScenarioPresetsPanel.tsx`, `buildBuyerInspectorView` consumers

### P2 — Polish / infra

3. **CORS `/collect`** — Fix credentialed collect CORS on `api.optiview.ai` (non-wildcard `Access-Control-Allow-Origin`).  
4. **Timeline** — Replace “Activation readiness moved up” with buyer-safe wording.  
5. **Marketing hero** — Add earned-escalation wedge language to match demo positioning.  
6. **`si_debug` docs** — Clarify: opens drawer + expands replay; does **not** switch inspector to Operator (demo forces buyer).  
7. **Inspector section title** — “Surface preview” → “Recommended experiences” or “Mapped experiences” in buyer view.

### P3 — CI gate hardening

8. Add Playwright release gate: fresh context, full journey, assert timeline strings, assert no forbidden buyer terms, `version.json` commit match, optional `page.evaluate` on SessionIntel APIs.

---

## Acceptance criteria (this audit)

| Criterion | Met? |
|-----------|------|
| Report produced | **Yes** — this file |
| No code changes in audit commit | **Yes** |
| Failures listed with recommended fixes | **Yes** |
| Real browser interactions | **Yes** — Cursor IDE Browser |
| curl-only | **No** — browser primary; curl used for version.json only |

---

## URLs tested

1. https://optiview.ai/  
2. https://optiview.ai/privacy  
3. https://demo.optiview.ai/  
4. https://demo.optiview.ai/?si_debug=1  
5. https://cdn.optiview.ai/version.json  
6. https://dashboard.optiview.ai/  
7. https://rhythm90.io/

---

*Next gate: re-run after P1 fixes; add Playwright script mirroring sections D–F.*

---

## Post-audit fix pass (2026-05-17) — buyer trust + CORS

### Implemented

| Item | Change |
|------|--------|
| P1 empty-state copy | Buyer inspector on-page experience section no longer shows `data-si-surface="surface_id"` or mapping instructions |
| P1 replay labels | `buyerSurfaceLabel()` maps catalog `surface_id` values to human experience names in buyer inspector + scenario replay panel |
| P2 readiness timeline | Intel milestone + curated timeline use progression language, not “activation readiness moved up” |
| P2 `?si_debug=1` | Inspector defaults to **Operator** when debug URL/storage is set (explicit `si:inspector_mode` still wins) |
| P2 CORS `/collect` | SDK `fetch` uses `credentials: "omit"`; worker `publicCorsHeaders(request)` echoes `Origin` when present |

### CORS investigation (`POST /collect`)

- **Affected path:** Browser `POST` to worker `/collect` from marketing/demo origins (e.g. `https://demo.optiview.ai` → `https://api.optiview.ai/collect`).
- **Cause:** Response used `Access-Control-Allow-Origin: *` while some clients sent credentialed cross-origin requests (or the browser treated the combination as incompatible).
- **Production impact:** Telemetry may fail silently in the browser console for cross-origin installs; server-side ingest is unaffected when requests succeed. Most critical for **local/dev** and **multi-origin** snippet installs.
- **Fix applied:** Client omits credentials; server echoes request `Origin` on public routes (no `Allow-Credentials`, since cookies are not required for collect).
- **Not changed:** Dashboard credentialed CORS (still origin-allowlist + credentials).
