# Privacy QA checklist

Engineering verification that the **Optiview / Session Intelligence snippet** respects anonymous, first-party, in-session boundaries. Use before external beta sign-off ([EXTERNAL_BETA_CHECKLIST.md](./EXTERNAL_BETA_CHECKLIST.md) row P2).

**Scope:** runtime behavior as implemented in `packages/sdk` — not legal review. Pair with marketing copy at `/privacy` and [CUSTOMER_INSTALL.md](./CUSTOMER_INSTALL.md).

---

## Automated checks (CI)

Run on every release candidate:

```bash
pnpm test
pnpm typecheck
```

**Relevant suites:**

| Suite | What it guards |
|-------|----------------|
| `formSubmitCommercialIntent.test.ts` | No `input.value` in `classifyFormIntent`; no raw values in memory/buyer copy |
| `commercialIntent.test.ts` | Buyer-safe copy; taxonomy ids filtered |
| `buyerCopySafety.test.ts` | Unsafe strings rejected from inspector output |
| `surfaceMapper.test.ts` | Surface mappings do **not** use `localStorage` |

---

## Manual browser QA

Use a clean profile or private window on a page with the snippet installed (demo or staging).

### Cookies and tracking

| # | Check | Pass criteria | Evidence |
|---|--------|---------------|----------|
| 1 | **No Optiview cookies** | Application → Cookies: no `si_*` or Session Intelligence cookies set by snippet | Screenshot |
| 2 | **No fingerprinting APIs** | No canvas/audio/font probing for identity; no third-party ID sync in snippet path | Code review + spot-check Network tab (no unexpected third-party ID calls from `si.js`) |

### Form and search boundaries

| # | Check | Pass criteria | Evidence |
|---|--------|---------------|----------|
| 3 | **No `input.value` reads** | Grep `packages/sdk/src` — commercial intent / observer paths do not read `.value` on inputs | `rg '\\.value' packages/sdk/src/observer.ts packages/sdk/src/commercialIntent` — only tests or unrelated modules |
| 4 | **No `textarea.value` reads** | Same for textarea in commercial intent + observer | Grep output clean |
| 5 | **No raw search queries stored** | Submit site search; timeline says “Submitted a search” without query text; `commercial_intent` JSON has no query string | Inspector screenshot + `sessionStorage` `si:session` inspect (redact in ticket) |
| 6 | **Form structure only** | Submit lead/test-drive form with distinctive text in fields; memory/timeline/buyer copy **must not** contain field text | Inspector screenshot |

### Storage keys

| # | Check | Pass criteria | Evidence |
|---|--------|---------------|----------|
| 7 | **sessionStorage primary** | `si:session` present after browse; holds anonymous profile | DevTools → Application screenshot |
| 8 | **localStorage limited** | Only `si:returning` in localStorage (timestamp string); no other `si:*` keys in default path | DevTools screenshot |
| 9 | **Return visit flag** | Second visit same origin: `si:returning` exists; not replicated on another domain | Two-origin test or documentation note |
| 10 | **No cross-site stitching** | Storage on `site-a` not readable from `site-b` | Browser same-origin policy (document in ticket) |
| 11 | **User can clear** | Clear site data → fresh session id and empty profile | Screenshot after clear |

### sessionStorage keys (documented)

Confirm only these keys appear in a normal session (debug/surface-map optional):

| Key | Required? | Purpose |
|-----|-----------|---------|
| `si:session` | Yes | Anonymous `SessionProfile` |
| `si:exp_progression` | Yes (when decisions run) | Progression memory |
| `si:returning` | localStorage only | Prior visit timestamp |
| `si:debug` | Optional | Debug / inspector |
| `si:inspector_mode` | Optional | Buyer vs operator inspector |
| `si:surface_mappings` | Optional | Operator surface map |
| `si:surface_mapper_overlay` | Optional | Surface map overlay |

### commercial_intent memory

| # | Check | Pass criteria | Evidence |
|---|--------|---------------|----------|
| 12 | **Classifications only** | `commercial_intent` contains `action_counts`, `form_type_counts`, `blockers`, `momentum` — not raw CTA labels or field names | JSON excerpt from `si:session` |
| 13 | **Buyer read safe** | Inspector “Commercial intent read” has no taxonomy ids, form names, or URLs | Screenshot |
| 14 | **Timeline safe** | Session highlights use milestone labels only | Screenshot |

### Collect endpoint (if enabled)

| # | Check | Pass criteria | Evidence |
|---|--------|---------------|----------|
| 15 | **No PII in collect payload** | Inspect POST body: aggregated signals, no form values | Network tab screenshot |
| 16 | **Tenancy server-side** | `tenant_id` / `site_id` resolved from `snippet_key`, not client-supplied tenant | Worker logs or D1 row |

---

## Marketing copy alignment

| # | Check | Pass criteria |
|---|--------|---------------|
| 17 | Privacy page | Describes sessionStorage, single `localStorage` key, no cookies/fingerprinting/cross-site graph |
| 18 | CUSTOMER_INSTALL | Storage table matches keys above |
| 19 | COMMERCIAL_INTENT_ENGINE | Privacy / storage section matches runtime |

---

## Sign-off

| Reviewer | Date | Result (PASS / FAIL) | Notes |
|----------|------|----------------------|-------|
| Engineering | | | |
| Privacy / compliance | | | |

**FAIL:** file issues, block beta approver until fixed and checklist re-run.
