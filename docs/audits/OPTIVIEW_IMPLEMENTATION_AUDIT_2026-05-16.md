# Optiview Implementation Audit

**Audit date:** 2026-05-16  
**Repository commit:** `98b0404` (`feat: couple commercial intent to experience decisions`)  
**Auditor mode:** Read-only (no code changes)  
**Production references (last known deploy):** CDN snippet commit `98b040450aac`; demo build `98b0404` with `VITE_SI_SNIPPET_VERSION=98b040450aac`

---

## Executive summary

Optiview / Session Intelligence implements a **deterministic, session-scoped anonymous experience decision runtime** in the browser. The core pipeline—signals → site semantics / activation opportunity → recipe match → **commercial intent coupling** → suppression → ranked envelope → destinations—is **implemented, tested, and deployed** to Cloudflare (Worker API + Pages for CDN, demo, dashboard, marketing).

**Strengths (evidence-backed):**

- 234 Vitest tests passing; 96/96 decision fixtures passing (`pnpm decision-fixtures`).
- Full `window.SessionIntel` decision API surface on hosted `si.js` (`packages/sdk/src/iife.ts`).
- Vertical surface catalogs (84 surfaces) and recipe packs (67 recipes) with regulated fixture matrices for healthcare and financial services.
- Commercial Intent Engine (phrase packs, memory, buyer read) **wired into decisions** via `commercialIntentDecisionCoupling.ts` (bounded ±0.12/−0.18 deltas).
- Buyer inspector defaults to buyer mode; operator jargon filtered by `buyerCopySafety.ts` (tests enforce forbidden strings).
- Demo cache-bust for hosted CDN snippet (`apps/demo-retailer/src/si-cdn-bridge.ts`, `scripts/deploy-demo-pages.sh`).

**Gaps / risks:**

- **Form submit hook is narrow** (`observer.ts`): only increments `onsite_search_events` for search forms; does not call `classifyFormIntent` on generic form submit (commercial intent from forms relies on field-name classification elsewhere).
- **`localStorage` used only for return-visit detection** (`storage.ts`), not session profile persistence—document clearly for privacy reviews.
- **Commercial intent coupling** may under-rank or over-rank in live sessions (fixture + unit tests pass; live QA on `demo.optiview.ai` showed correct intent read with null primary when hesitation/finance blocker active—by design).
- **Operator narrative** (`experienceInspectorNarrative.ts`) still contains numeric readiness/engagement language—buyer path uses `buyerInspectorNarrative.ts` instead.
- **No server-side decision persistence** or cross-session identity (intentional; limits “real-world session capture loop” for analytics).

**Readiness ratings (this commit):**

| Dimension | Rating | Rationale |
|-----------|--------|-----------|
| **SDK / runtime ship** | **8.5/10** | Pipeline complete, tests green, snippet ~375 KB IIFE / ~103 KB gzip |
| **Demo readiness** | **9/10** | Deploy scripts, cache-bust, 25 scenario presets, live vertical demo |
| **External beta** | **7/10** | Dashboard auth, Access, D1 tenancy exist; ops/docs depend on Cloudflare config |
| **Enterprise GTM** | **6/10** | No identity/CDP; bounded to anonymous session decisions |

---

## Implemented vs missing

| Area | Status | Evidence |
|------|--------|----------|
| Experience decision pipeline | **Implemented** | `packages/sdk/src/decisioning/experienceDecisionPipeline.ts` |
| Recipe / surface matching | **Implemented** | `recipeMatcher.ts`, `surfaceMatcher.ts`, packs under `packages/shared/src/context-packs/` |
| Suppression + ranking | **Implemented** | `decisionSuppression.ts`, `decisionRanking.ts` |
| Commercial intent → decisions | **Implemented** | `commercialIntentDecisionCoupling.ts` (commit `98b0404`) |
| Progression memory | **Implemented** | `progressionMemory.ts`, tests in `__tests__/progressionMemory.test.ts` |
| Decision bus / envelope | **Implemented** | `decisionBus.ts`, `buildExperienceDecisionEnvelope.ts` |
| Replay + operator story | **Implemented** | `decisioning/replay/*`, `runDecisionReplay`, `buildOperatorSessionStory` |
| Buyer inspector narrative | **Implemented** | `buyerInspectorNarrative.ts`, `inspector.ts` |
| Commercial Intent Engine | **Implemented** | `packages/sdk/src/commercialIntent/*`, taxonomy packs |
| Surface mapper | **Implemented** | `packages/sdk/src/surfaceMapper/*`, 13 tests |
| Scenario presets (25) | **Implemented** | `apps/demo-retailer/src/scenarioPresets/scenarios.ts` (25 `scenario(` calls) |
| Decision fixtures (96) | **Implemented** | `decision-fixtures/`, floor `≥49` in `decision-fixtures.test.ts` |
| Integration examples | **Implemented** | `pnpm check:integrations` → 25 files OK |
| Marketing positioning | **Implemented** | `apps/marketing-site/src/pages/HomePage.tsx` |
| Worker API + D1 | **Implemented** | `worker/`, migrations `0001`–`0006` |
| CDN / demo deploy | **Implemented** | `scripts/deploy-snippet.sh`, `scripts/deploy-demo-pages.sh` |
| ML / LLM interpretation | **Missing (by design)** | No wink-nlp/franc/compromise in `package.json` |
| Cross-session identity | **Missing (by design)** | Docs + marketing deny fingerprinting / identity graph |
| Server decision DB | **Missing (by design)** | Decisions are session-local envelope only |
| Full form-submit → commercial intent | **Partial** | `classifyFormIntent` exists; submit listener is search-only |
| Real-world session replay export | **Partial** | In-browser `getDecisionReplayFrames()` buffer (max 16 profiles) |

---

## 1. Product thesis / doctrine

**Verified in docs:**

| Doctrine | Location |
|----------|----------|
| Anonymous experience decision runtime | `docs/EXPERIENCE_RUNTIME_MVP.md` (title, pipeline, constraints table) |
| Commercial judgment for anonymous traffic | `docs/COMMERCIAL_INTENT_ENGINE.md` |
| Restraint over weak interruption | `docs/DECISION_QA.md` (suppression expectations, regulated verticals) |
| Progression over immediate conversion | `progressionMemory.ts`, fixture cases with `progression_gated` |
| Confidence earns interruption | `decisionSuppression.ts` (global floor 0.45, modal thresholds, readiness gates) |
| No identity / enrichment / orchestration creep | `EXPERIENCE_RUNTIME_MVP.md` “What it is not”; marketing privacy copy |

**Marketing:** `apps/marketing-site/src/pages/HomePage.tsx` — hero “Anonymous experience decision runtime”; “No fingerprinting. No identity graph.”

**Not found:** Visitor identification or identity-resolution product claims on marketing home/privacy (only negations).

---

## 2. Public runtime APIs

### `window.SessionIntel` (hosted IIFE)

**Source:** `packages/sdk/src/iife.ts` (lines 13–40, 73–100)

| API | On `SessionIntel` after `bootFromScriptTag` |
|-----|---------------------------------------------|
| `getExperienceDecisionEnvelope` | Yes |
| `getExperienceDecision` | Yes |
| `getAllExperienceDecisions` | Yes |
| `subscribeToDecision` | Yes |
| `subscribeToAllDecisions` | Yes |
| `pushExperienceDecisionToDataLayer` | Yes |
| `pushExperienceDecisionToAdobeDataLayer` | Yes |
| `pushExperienceDecisionToOptimizely` | Yes |
| `getDecisionReplayFrames` | Yes |
| `runDecisionReplay` | Yes (module export, not instance method) |
| `buildOperatorSessionStory` | Yes (module export, not instance method) |

Also exposed: `boot`, `destroy`, `getState`, `subscribe`, `markConversion`, `softResetSession`, activation/personalization push aliases, legacy `pushToDataLayer` / Adobe / Optimizely.

### ESM package exports (`packages/sdk/src/index.ts`)

Decision-related exports include: `getExperienceDecisionEnvelope`, `getExperienceDecision`, `getAllExperienceDecisions`, `subscribeToDecision`, `subscribeToAllDecisions`, `pushExperienceDecision*`, `runDecisionReplay`, `buildOperatorSessionStory`, fixture helpers, buyer narrative types.

**Not on `SessionIntel` instance:** `getDecisionReplayFrames` is runtime method only (wired in iife).

### Demo CDN bridge (`apps/demo-retailer/src/si-cdn-bridge.ts`)

Re-exports **subset** for demo app only: `runDecisionReplay`, `buildFixtureProfile`, `buildBuyerInspectorView`, buyer copy safety, experience state presentation—not the full `SessionIntel` API. Loads hosted `si.js` with `?v=` cache-bust via `snippetCacheBustVersion()`.

---

## 3. Experience decision runtime

### Pipeline (as implemented)

```txt
signals (observer.ts)
  → site semantics / behavior_snapshot (buildBehaviorSnapshot.ts)
  → activation_opportunity + personalization_signal
  → matchRecipeCandidates (recipeMatcher.ts)
  → dedupeByRecipe
  → rankCandidatesWithCommercialIntent (commercialIntentDecisionCoupling.ts)  [98b0404+]
  → buildDecisionFromCandidate
  → shouldSuppressForCommercialIntent → shouldSuppressDecision
  → rankDecisions
  → progressionGateDecision
  → ExperienceDecisionEnvelope + slot map
  → DecisionBus / destinations / inspector
```

### Module inventory (`packages/sdk/src/decisioning/`)

| Module | Role |
|--------|------|
| `experienceDecisionPipeline.ts` | Main tick pipeline |
| `recipeMatcher.ts` | Recipe eligibility + base confidence |
| `surfaceMatcher.ts` | Catalog lookup |
| `decisionSuppression.ts` | Hard suppression rules |
| `decisionRanking.ts` | Confidence sort |
| `commercialIntentDecisionCoupling.ts` | Bounded intent deltas + commercial holdbacks |
| `progressionMemory.ts` | Pacing / cooldown gates |
| `decisionBus.ts` | Subscriptions |
| `buildExperienceDecisionEnvelope.ts` | Envelope builder wrapper |
| `buyerInspectorNarrative.ts` | Buyer copy |
| `experienceInspectorNarrative.ts` | Operator-oriented copy (numeric) |
| `decisionDiff.ts` | Meaningful change detection |
| `replay/*` | Deterministic replay |
| `fixtures/*` | 96 JSON fixtures + runner |

**Tests:** `experienceDecisions.test.ts`, `commercialIntentDecisionCoupling.test.ts` (17), `decision-replay.test.ts`, `decision-fixtures.test.ts`, `buyerInspectorNarrative.test.ts`, `buyerCopySafety.test.ts`, `progressionMemory.test.ts`.

---

## 4. Decision envelope behavior

**Types:** `packages/shared/src/index.ts` — `ExperienceDecision` includes `privacy_scope: "session_only"`, `visitor_status: "anonymous"`.

**Runtime behavior:**

| Rule | Evidence |
|------|----------|
| `primary_decision` null allowed | Fixtures with `primary_must_be_null` (12+ cases); pipeline sets `primary = null` when observe-only or no viable candidates |
| Secondary max 2 | `experienceDecisionPipeline.ts`: `gated.slice(1, 3)`; `fixtures/runFixture.ts` asserts `≤2` |
| Per-slot suppress | `getExperienceDecision.ts` `suppressSlotDecision`; fixture `surface_slots` |
| No hard escalation on weak confidence | `decisionSuppression.ts` floors; regulated fixtures |
| `suppression_summary` when needed | `summarizeSuppression()` in pipeline |
| Session-only / anonymous | Set in `buildDecisionFromCandidate` |

---

## 5. Surface catalogs

**Path:** `packages/shared/src/context-packs/surface-catalogs/*.json`

| Vertical file | Surface count | Duplicate IDs | Missing `surface_id` |
|---------------|---------------|---------------|----------------------|
| auto-oem | 12 | 0 | 0 |
| auto-retail | 5 | 0 | 0 |
| b2b-saas | 19 | 0 | 0 |
| ecommerce | 15 | 0 | 0 |
| financial-services | 12 | 0 | 0 |
| healthcare | 11 | 0 | 0 |
| publisher | 5 | 0 | 0 |
| generic | 5 | 0 | 0 |
| **Total** | **84** | **0** | **0** |

**Notable thresholds:** Modal/popup surfaces often `min_confidence` 0.68–0.72 (`guided_walkthrough_request`, `ecom_exit_offer_popup`, `generic.soft_popup`). Healthcare `provider_discussion_cta` 0.58; auto `dealer_locator_soft_prompt` 0.62.

**Generic-sounding IDs (review, not bugs):** `inline_cta`, `soft_popup`, `article_inline_mid`, `homepage_hero_secondary` (used across B2B/publisher).

<details>
<summary>Full surface tables (all verticals)</summary>

### auto-oem

| surface_id | min_confidence | max_friction | allowed_timing | surface_type |
|------------|----------------|--------------|----------------|--------------|
| model_discovery_assist | 0.44 | medium | after_scroll, next_navigation | inline |
| capability_feature_explainer | 0.45 | low | after_scroll, next_navigation | inline |
| trim_comparison_module | 0.46 | medium | next_navigation, after_scroll | inline_module |
| build_price_assist | 0.48 | medium | after_scroll, next_navigation | inline_module |
| configurator_resume_module | 0.51 | medium | next_navigation, after_scroll | inline_module |
| ev_education_module | 0.47 | medium | next_navigation, after_scroll | inline_module |
| family_use_case_module | 0.47 | medium | next_navigation, after_scroll | inline_module |
| incentive_inline_offer | 0.5 | medium | after_scroll, next_navigation | inline |
| payment_estimate_helper | 0.46 | low | after_scroll, next_navigation | inline |
| inventory_transition_assist | 0.52 | medium | next_navigation, after_scroll | inline_module |
| dealer_locator_soft_prompt | 0.62 | low | next_navigation, idle | soft_modal |
| owner_resource_assist | 0.44 | low | after_scroll, next_navigation | inline |

### auto-retail

| surface_id | min_confidence | max_friction | allowed_timing | surface_type |
|------------|----------------|--------------|----------------|--------------|
| inventory_assist_module | 0.44 | medium | after_scroll, next_navigation | inline_module |
| finance_payment_assist | 0.46 | medium | after_scroll, next_navigation | inline |
| trade_in_soft_prompt | 0.48 | low | next_navigation, after_scroll | inline |
| test_drive_secondary_cta | 0.52 | medium | next_navigation, after_scroll | inline_cta |
| dealer_contact_assist | 0.5 | medium | next_navigation, idle | inline_cta |

### b2b-saas

| surface_id | min_confidence | max_friction | allowed_timing | surface_type |
|------------|----------------|--------------|----------------|--------------|
| implementation_readiness_checklist | 0.48 | medium | after_scroll, next_navigation | inline_module |
| rollout_complexity_estimator | 0.5 | medium | next_navigation, after_scroll | interactive_module |
| stakeholder_alignment_guide | 0.48 | medium | next_navigation, after_scroll | inline_module |
| migration_risk_breakdown | 0.47 | low | next_navigation, after_scroll | educational_module |
| integration_requirements_summary | 0.49 | medium | next_navigation, after_scroll | comparison_module |
| soft_roi_framework | 0.46 | low | after_scroll, next_navigation | inline_module |
| evaluation_next_steps | 0.47 | medium | next_navigation, after_scroll | inline_cta |
| team_adoption_story | 0.45 | low | next_navigation, after_scroll | social_proof_module |
| implementation_timeline_example | 0.46 | low | next_navigation, after_scroll | educational_module |
| operational_objection_handler | 0.47 | medium | next_navigation, after_scroll | inline_module |
| guided_walkthrough_request | 0.72 | low | next_navigation, idle | soft_modal |
| workspace_readiness_assessment | 0.54 | medium | next_navigation, after_scroll | interactive_module |
| implementation_workshop_offer | 0.68 | medium | next_navigation, idle | soft_popup |
| homepage_hero_secondary | 0.45 | medium | after_scroll, next_navigation | inline_cta |
| article_inline_mid | 0.42 | medium | after_scroll, next_navigation | inline_cta |
| implementation_readiness_inline | 0.44 | medium | after_scroll, next_navigation | inline_cta |
| pricing_page_secondary_cta | 0.48 | medium | next_navigation, after_scroll | inline_cta |
| comparison_module | 0.46 | medium | next_navigation, after_scroll | inline_module |
| demo_soft_escalation | 0.7 | low | next_navigation, idle | soft_modal |

### ecommerce

| surface_id | min_confidence | max_friction | allowed_timing | surface_type |
|------------|----------------|--------------|----------------|--------------|
| category_help_me_choose | 0.44 | medium | after_scroll, next_navigation | inline_module |
| pdp_comparison_module | 0.46 | medium | after_scroll, next_navigation | inline_module |
| mobile_quick_compare | 0.42 | low | after_scroll, next_navigation | compact_module |
| product_fit_assistant | 0.45 | medium | after_scroll, next_navigation | inline_module |
| size_or_variant_guidance | 0.44 | low | after_scroll, next_navigation | inline_module |
| bundle_or_accessory_module | 0.48 | medium | after_scroll, next_navigation | inline_module |
| cart_assist_inline | 0.5 | medium | immediate, after_scroll | inline_cta |
| shipping_returns_reassurance | 0.48 | low | after_scroll, immediate | inline_module |
| review_summary_module | 0.46 | low | after_scroll, next_navigation | inline_module |
| high_aov_confidence_module | 0.5 | low | after_scroll, next_navigation | inline_module |
| inventory_reassurance_strip | 0.44 | low | after_scroll, immediate | inline_strip |
| coupon_offer_secondary | 0.58 | low | after_scroll, idle | inline |
| loyalty_or_email_soft_capture | 0.52 | low | after_scroll, next_navigation | inline |
| product_recommendation_slot | 0.42 | low | after_scroll, next_navigation | inline |
| ecom_exit_offer_popup | 0.72 | medium | next_navigation, idle | soft_popup |

### financial-services

| surface_id | min_confidence | max_friction | allowed_timing | surface_type |
|------------|----------------|--------------|----------------|--------------|
| card_comparison_module | 0.48 | medium | after_scroll, next_navigation | inline_module |
| rewards_comparison_module | 0.49 | medium | after_scroll, next_navigation | inline_module |
| rate_fee_explainer | 0.45 | low | after_scroll, next_navigation | inline |
| fee_transparency_module | 0.47 | medium | next_navigation, after_scroll | inline_module |
| trust_reassurance_inline | 0.44 | low | after_scroll, next_navigation | inline |
| security_trust_module | 0.48 | medium | next_navigation, after_scroll | inline_module |
| eligibility_assist | 0.5 | medium | next_navigation, after_scroll | inline_module |
| calculator_next_step | 0.46 | low | after_scroll, next_navigation | inline |
| payment_estimate_helper | 0.46 | low | after_scroll, next_navigation | inline |
| refinance_scenario_explainer | 0.48 | medium | next_navigation, after_scroll | inline_module |
| document_prep_checklist | 0.52 | medium | next_navigation, after_scroll | inline_module |
| application_soft_resume | 0.56 | medium | next_navigation, idle | inline |

### healthcare

| surface_id | min_confidence | max_friction | allowed_timing | surface_type |
|------------|----------------|--------------|----------------|--------------|
| education_inline_next_step | 0.48 | low | after_scroll, next_navigation | inline |
| next_clinical_step_guide | 0.49 | low | after_scroll, next_navigation | inline |
| eligibility_guidance_module | 0.5 | medium | next_navigation, after_scroll | inline_module |
| coverage_reassurance_inline | 0.46 | low | after_scroll, next_navigation | inline |
| insurance_coverage_helper | 0.47 | low | after_scroll, next_navigation | inline |
| care_pathway_explainer | 0.5 | medium | next_navigation, after_scroll | inline_module |
| screening_education_module | 0.49 | medium | next_navigation, after_scroll | inline_module |
| doctor_conversation_guide | 0.52 | medium | next_navigation, after_scroll | inline_module |
| provider_discussion_cta | 0.58 | medium | next_navigation | inline_cta |
| appointment_soft_prompt | 0.56 | low | next_navigation, after_scroll | inline |
| soft_request_info | 0.52 | low | next_navigation, idle | inline |

### publisher

| surface_id | min_confidence | max_friction | allowed_timing | surface_type |
|------------|----------------|--------------|----------------|--------------|
| article_inline_mid | 0.42 | low | after_scroll, next_navigation | inline_cta |
| article_related_next | 0.42 | low | after_scroll, next_navigation | inline |
| newsletter_soft_signup | 0.43 | low | after_scroll, next_navigation, idle | inline_cta |
| topic_depth_module | 0.45 | low | after_scroll, next_navigation | inline_module |
| return_reader_prompt | 0.46 | low | next_navigation, idle | inline |

### generic

| surface_id | min_confidence | max_friction | allowed_timing | surface_type |
|------------|----------------|--------------|----------------|--------------|
| homepage_hero_secondary | 0.45 | medium | after_scroll, next_navigation | inline_cta |
| inline_cta | 0.4 | medium | immediate, after_scroll | inline_cta |
| soft_popup | 0.72 | low | next_navigation, exit_intent, idle | modal |
| content_recommendation | 0.42 | low | after_scroll, next_navigation | inline |
| lead_form_assist | 0.55 | medium | after_scroll, next_navigation | inline |

</details>

---

## 6. Recipe packs

**Path:** `packages/shared/src/context-packs/experience-recipes/*.json`

| Vertical | Recipe count | Duplicate IDs | Recipes missing `decision_family` | Hard-CTA risk notes |
|----------|--------------|---------------|-----------------------------------|---------------------|
| auto-oem | 12 | 0 | 12 (all) | `auto_oem_dealer_locator_earned` |
| auto-retail | 5 | 0 | 5 (all) | — |
| b2b-saas | 12 | 0 | 0 | `b2b_governed_walkthrough_earned`, `b2b_implementation_workshop_offer_soft` |
| ecommerce | 12 | 0 | 0 | `ecom_mobile_quick_compare` (compact, not modal) |
| financial-services | 13 | 0 | 13 (all) | — |
| healthcare | 11 | 0 | 11 (all) | `healthcare_flash_urgency_test` (suppressed in fixtures) |
| publisher | 1 | 0 | 1 | — |
| generic | 1 | 0 | 1 | — |
| **Total** | **67** | **0** | **53 without `decision_family`** | |

**Order-sensitive / progression:** Recipes with high `min_activation_readiness` and `max_cta_clicks: 1` (B2B walkthrough, finance application resume) depend on `progressionMemory.ts` + commercial coupling holdbacks.

**Generic copy scan:** No “unlock/frictionless/act now” hits in automated recipe scan; `healthcare_flash_urgency_test` is intentional negative test recipe.

---

## 7. Fixture coverage

**Command:** `pnpm decision-fixtures`  
**Result:** `96 total, 96 passed, 0 failed`

**Vitest floor:** `decision-fixtures.test.ts` expects `total >= 49`.

### Count by vertical

| Vertical folder | Cases |
|-----------------|-------|
| auto-oem | 15 |
| auto-retail | 14 |
| b2b-saas | 19 |
| ecommerce | 13 |
| financial-services | 16 |
| healthcare | 16 |
| publisher | 3 |
| **Total** | **96** |

### Fixture feature usage

| Feature | Approx. count | Notes |
|---------|---------------|-------|
| `regulated_vertical_safety` | 26 | healthcare + financial_services |
| `hard_surfaces_must_not_show` | 41 | Escalation restraint |
| `primary_must_be_null` | 12 | Early research / low intent |
| `commercial_intent` in session-input | 1 | `auto-retail/14-compare-finance-intent-coupling` |

**Gaps:** No dedicated coupling fixtures per vertical beyond auto-retail #14; coupling covered heavily in `commercialIntentDecisionCoupling.test.ts` (17 cases).

---

## 8. Commercial Intent Engine

### Taxonomy packs (`packages/shared/src/context-packs/commercial-intent/`)

| Pack | Count |
|------|-------|
| Action families (`action-taxonomy.json` → `actions[]`) | **25** |
| Blockers (`blocker-taxonomy.json`) | **12** |
| Page roles (`page-role-taxonomy.json`) | **10** |
| Multilingual phrase keys | **15** families × langs **en, es, fr, de, it, pt, nl** |

### SDK modules (`packages/sdk/src/commercialIntent/`)

`classifyCommercialAction`, `classifyCtaElement`, `classifyFormIntent`, `classifyPageRole`, `inferCommercialBlockers`, `inferJourneyMomentum`, `updateCommercialIntentMemory`, `applyCommercialIntentTick`, `buyerCommercialIntentRead`, `timelineLabels`, test utils.

### Decision coupling

`packages/sdk/src/decisioning/commercialIntentDecisionCoupling.ts` — max +0.12 / −0.18; wired in `experienceDecisionPipeline.ts`.

### Tests (`pnpm test -- commercialIntent`)

```
41 passed (3 files)
- commercialIntent.test.ts: 11
- commercial-intent-replay.test.ts: 13
- commercialIntentDecisionCoupling.test.ts: 17
```

### Deterministic vs not supported

| Deterministic | Not supported |
|---------------|---------------|
| Phrase / path / DOM role matching | Embeddings, LLM runtime |
| Session `commercial_intent` memory | Cross-session memory |
| Buyer-safe timeline labels | Raw clicked label persistence |
| Bounded recipe deltas | Learning from outcomes |

### Privacy guardrails

- Memory stores counts, stages, blocker ids—not raw CTA text (`docs/COMMERCIAL_INTENT_ENGINE.md`).
- No `input.value` / `textarea.value` in SDK grep.
- Form classifier uses field names/labels only (module exists; not all submit paths wired).

### Bundle impact

Snippet build at `98b0404`: **si.js 383,812 bytes (~375 KB)**; **gzip ~105,727 bytes (~103 KB)**. Commercial intent adds to IIFE but no NLP deps.

---

## 9. Buyer inspector

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Buyer mode default | Yes | `getInspectorPanelMode()` → `"buyer"` unless `si:debug` / operator (`inspector.ts` ~118–127) |
| Operator with debug | Yes | `sessionStorage` `si:debug`, `data-si-debug` on script tag |
| No operator jargon in buyer | Guarded | `buyerCopySafety.ts`, `buyerInspectorNarrative.ts`, tests |
| Runtime state card + ladder | Yes | `buildBuyerInspectorView` → `statePresentation` |
| Withheld section | Yes | `withheld` bullets |
| Commercial intent read | Yes | `buildBuyerCommercialIntentRead` in inspector |
| Surface preview | Yes | “Surface preview” heading (`inspector.ts`) |
| Minimized overlay | Yes | Inspector UI controls (expand/minimize) |

### Forbidden string search (buyer-visible risk)

| Pattern | Where found | Buyer-visible? |
|---------|-------------|----------------|
| `progression_surface_cooldown` | `progressionMemory.ts`, `inferTransitionReasons.ts`, tests | **No** — filtered by `buyerCopySafety`; tests assert exclusion from buyer view |
| `route ticks` | `experienceInspectorNarrative.ts` | **Operator narrative only** |
| `readiness score` / `engagement score` | `buyerCopySafety` blocklist; operator narrative uses numbers | **Buyer path filtered** |
| `activation readiness` | Operator inspector metrics; buyer uses “Activation readiness moved up” in timeline via `inspectorBriefing.ts` | **Timeline OK**; numeric scores operator-only |
| `tick` | `inferTransitionReasons`, operator narrative | **Not in buyer bullets** |

---

## 10. Surface mapper

**Path:** `packages/sdk/src/surfaceMapper/`  
**Tests:** `surfaceMapper.test.ts` (13 tests) — includes “does not use localStorage for surface mappings”.

**Behaviors:** `data-si-surface` discovery, sessionStorage mappings, overlay, surface preview in inspector, no DOM rewrite of host content (preview/mapping only).

**Docs:** `docs/SURFACE_MAPPER.md` (referenced in audit brief; present in repo per project layout).

---

## 11. Scenario presets / golden journeys

| Requirement | Evidence |
|-------------|----------|
| 25 presets | 25 `scenario(` definitions in `scenarios.ts` |
| Five groups | `ScenarioGroupId`: b2b_saas, ecommerce, healthcare, financial_services, auto_retail |
| Replay via fixtures + `runDecisionReplay` | `ScenarioPresetsPanel.tsx` imports both |
| No fake AI / randomization | Deterministic `buildScenarioFixture` steps |
| Buyer copy via `buildBuyerInspectorView` | Panel imports from `@si/sdk` |
| Play / pause / next / reset | `ScenarioPresetsPanel.tsx` state |
| Default preset auto | `DEFAULT_SCENARIO_PRESET_ID` = first `auto_retail` preset |

**Tests:** `scenarios.buyerCopy.test.ts` (3 tests).

---

## 12. Replay / observability

| Capability | Evidence |
|------------|----------|
| `runDecisionReplay` | `decisioning/replay/runDecisionReplay.ts` |
| Transition reasons | `inferTransitionReasons.ts`, `replay/types.ts` |
| `buildOperatorSessionStory` | `replay/sessionStory.ts` |
| `experienceDecisionMeaningfullyChanged` | `decisionDiff.ts` |
| Runtime event stream | `sessionIntel.ts` `pushIntelEvent` |
| Replay buffer | `runtime.ts` `decisionReplayBuffer` (max 16 frames) |
| Deterministic tests | `__tests__/decision-replay.test.ts` |

---

## 13. Integration docs / examples

**Command:** `pnpm check:integrations`  
**Output:** `check-integration-examples: OK (25 files)`

**Paths:** `docs/integrations/*`, `examples/integrations/*` (per script). Checker validates subscribe patterns, `action === "show"` gating, no identity language (per project scripts).

---

## 14. Marketing site

**Build:** `pnpm build:marketing` — **success** (199.75 KB JS, 61.87 KB gzip).

**Homepage (`HomePage.tsx`):** “Anonymous experience decision runtime”; experience decisions + surfaces; privacy negations.

**Signup / links:** Routes include `/signup`; `DEMO_URL`, dashboard links via `publicUrls`.

**Command not run for deploy:** `pnpm deploy:marketing` (build-only audit).

---

## 15. Dashboard / auth / B2B readiness

| Item | Evidence |
|------|----------|
| Signup endpoint | `worker/` routes + `worker/src/__tests__/signup.test.ts` |
| Admin signups | `worker/src/__tests__/admin-signups.test.ts` |
| D1 migrations | `worker/db/migrations/0001`–`0006` (tenants, sites, authorized_users, signup_requests, seeds) |
| snippet_key install | Worker config / dashboard install flow (see `docs/DASHBOARD_AUTH.md`) |
| Production safety | `worker/src/__tests__/deployment-safety.test.ts`, `production-safety` gate |
| Docs | `docs/DASHBOARD_AUTH.md`, `docs/EXTERNAL_BETA_CHECKLIST.md`, `docs/CLOUDFLARE_INVENTORY.md` |

**Audit note:** Live Cloudflare Access / `SI_DASHBOARD_ORIGINS` / D1 production state not verified in this run (requires operator credentials).

---

## 16. Cloudflare deployment readiness

| Project | Type | Custom domain (intended) |
|---------|------|---------------------------|
| `session-intelligence-worker` | Worker | `api.optiview.ai` |
| `si-session-snippet` | Pages | `cdn.optiview.ai` |
| `si-session-demo` | Pages | `demo.optiview.ai` |
| `si-session-dashboard` | Pages | `dashboard.optiview.ai` |
| `si-session-marketing` | Pages | `optiview.ai` / `www` |

**Scripts:** `pnpm deploy:worker`, `deploy:snippet`, `deploy:demo`, `deploy:dashboard`, `deploy:marketing`, `deploy:all`.

**version.json:** Written by `scripts/build-snippet-cdn.mjs` — example at audit time:

```json
{
  "commit": "98b040450aace075cbd345a8a72b8003a08b4b58",
  "worker_url": "https://api.optiview.ai",
  "snippet_origin": "https://cdn.optiview.ai"
}
```

**Demo cache-bust:** `deploy-demo-pages.sh` sets `VITE_SI_SNIPPET_VERSION` from CDN `version.json` commit.

---

## 17. Bundle size / performance

| Artifact | Raw | Gzip (approx.) |
|----------|-----|----------------|
| `si.js` (IIFE) | 383,812 B | 105,727 B |
| `si-inspector.css` | 15,782 B | — |
| ESM `sdk.js` | 283,000 B | — |
| Marketing JS | 199,750 B | 61,870 B |

**Forbidden deps in workspace `package.json`:** None found for wink-nlp, franc, compromise, natural, xstate, rxjs, redux, zustand.

**Largest contributors (qualitative):** Full SDK IIFE bundle (decisioning + commercial intent + inspector + surface mapper + site semantics); no separate NLP chunk.

---

## 18. Privacy / security audit

| Check | Result |
|-------|--------|
| `document.cookie` in SDK | **No matches** |
| `canvas` / `geolocation` / `navigator.plugins` | **No matches** in `packages/sdk` |
| `input.value` / `textarea.value` | **No matches** |
| `localStorage` | **Yes** — `storage.ts` `detectReturnVisit()` only (`si:returning` key) |
| `sessionStorage` | **Yes** — `packages/sdk/src/storage.ts` (safe* helpers), inspector debug, surface mapper mappings |
| Fingerprinting claims | Marketing/inspector **deny**; no fingerprint implementation found |

**`commercial_intent`:** Stores action family counts, blocker ids, momentum—not raw labels.

---

## 19. Test suite (commands run 2026-05-16)

| Command | Result |
|---------|--------|
| `pnpm test` | **40 files, 234 tests passed** |
| `pnpm typecheck` | **Pass** (all 7 workspace packages) |
| `pnpm decision-fixtures` | **96/96 passed** |
| `pnpm check:integrations` | **OK (25 files)** |
| `pnpm docs:generate` | Wrote data dictionary + webmaster guide |
| `pnpm build:marketing` | **Pass** |
| `pnpm --filter @si/sdk build` | **Pass** (via `build:snippet`) |
| `VITE_SI_DEMO_USE_HOSTED_SNIPPET=1` + `VITE_SI_SNIPPET_ORIGIN` demo build | **Pass** |
| `pnpm test -- commercialIntent` | **41 passed** |

---

## 20. Risk register

| Risk | Severity | Evidence | Why it matters | Recommended fix | Owner |
|------|----------|----------|----------------|-----------------|-------|
| Commercial intent coupling under/over-weighted live | Medium | Unit/fixture pass; live QA null primary with good intent read | Product may feel “smart but quiet” or wrong vertical winners | Tune after live matrix; add 2–3 coupling fixtures per vertical | decisioning |
| CDN/demo cache staleness | Medium | Pre–cache-bust QA failures | Wrong inspector copy despite correct artifact | Keep `?v=` deploy + footer SHA checks | demo/infra |
| Bundle growth (~375 KB IIFE) | Medium | `si.js` 384 KB | Latency on slow mobile | Monitor; lazy-load inspector optional future | sdk |
| Buyer copy leakage | Low | `experienceInspectorNarrative` numeric; guards in buyer path | Trust erosion if wrong panel | Keep operator/buyer split; add E2E grep on live demo | inspector |
| Fixture gaps (coupling per vertical) | Low | 1 JSON coupling fixture | Regressions in ranking | Add finance/B2B coupling fixtures | QA |
| Surface mapper UX maturity | Low | sessionStorage only, manual map | Harder enterprise demos | Docs + optional export map | surfaceMapper |
| Dashboard auth / Access config | High (ops) | Docs exist; not verified live | Beta blocked if misconfigured | Run `EXTERNAL_BETA_CHECKLIST` on prod | infra |
| No server session capture loop | Medium | No decision DB | Hard to tune from production | Optional anonymized decision metrics export | worker |
| Form submit → commercial intent shallow | Medium | `observer.ts` search-only submit | Misses lead/checkout intent from forms | Wire `classifyFormIntent` on submit (careful PII) | observer |
| `localStorage` return visit | Low | `storage.ts` | Privacy reviewers may flag | Document in privacy page + DPA | legal/docs |
| Missing `decision_family` on many recipes | Low | 53/67 recipes | Progression gates less precise | Backfill families on OEM/finance/health | packs |
| `healthcare_flash_urgency_test` recipe exists | Low | Suppressed by runtime | Accidental enablement risk | Keep fixture + suppression tests | packs |
| Operator narrative not buyer-safe | Low | `experienceInspectorNarrative.ts` | Confusion if exposed | Never route to buyer UI (already true) | inspector |

---

## 21. Final recommendation

### Ship / demo / beta ratings

| Rating | Score | Note |
|--------|-------|------|
| **Ship readiness (SDK + CDN)** | **8.5/10** | Green tests, full API, deployed artifact |
| **Demo readiness** | **9/10** | 25 presets, hosted snippet parity, cache-bust |
| **Beta readiness (full product)** | **7/10** | Depends on Worker/D1/Access production checklist |

### Top 10 fixes before external pilot

1. Complete **Cloudflare + D1 + Access** checklist (`docs/EXTERNAL_BETA_CHECKLIST.md`) with evidence screenshots.
2. Add **2–3 commercial-intent coupling fixtures** per regulated vertical (finance, healthcare, B2B).
3. **Wire form submit** to `classifyFormIntent` for non-search forms (no value capture).
4. Document **`localStorage` return-visit** behavior on marketing privacy page (already partially there).
5. **Live QA script** (compare → finance → test drive) with expected primary/surface assertions in runbook.
6. Verify **`SI_DASHBOARD_ORIGINS`** and snippet keys for first beta tenants.
7. Add **operator-only** banner when `si:debug` so buyers never see numeric readiness panel.
8. **Monitor `si.js` gzip** on 3G; set budget alert &gt; 110 KB gzip.
9. Ensure **`version.json`** polled on every demo deploy (already in `deploy-demo-pages.sh`).
10. **Backfill `decision_family`** on auto-oem, financial-services, healthcare recipes for progression fidelity.

### Top 10 fixes after pilot starts

1. Anonymized **decision outcome telemetry** (envelope hashes, no PII) to Worker.
2. **Surface mapper** export/import for implementers.
3. **Per-tenant recipe overrides** (config pack) without forking SDK.
4. **A/B hook** for decision vs control measurement (already have experiment assignment elsewhere).
5. **Coupling weight** adjustments from pilot funnels (bounded deltas only).
6. **Dashboard**: session decision timeline from replay frames API.
7. **Integration**: Adobe/Optimizely example hardening from real customer feedback.
8. **Healthcare/finance** copy review with compliance stakeholder.
9. **Lazy-load inspector** chunk to shrink initial `si.js`.
10. **Deprecation** of orphan Worker `session-intelligence-worker-production` per `CLOUDFLARE_INVENTORY.md`.

---

## Appendix: Key file index

| Topic | Path |
|-------|------|
| Pipeline | `packages/sdk/src/decisioning/experienceDecisionPipeline.ts` |
| Commercial coupling | `packages/sdk/src/decisioning/commercialIntentDecisionCoupling.ts` |
| IIFE API | `packages/sdk/src/iife.ts` |
| Runtime | `packages/sdk/src/runtime.ts` |
| Observer | `packages/sdk/src/observer.ts` |
| Inspector | `packages/sdk/src/inspector.ts` |
| Fixtures root | `decision-fixtures/` |
| Doctrine | `docs/EXPERIENCE_RUNTIME_MVP.md`, `docs/DECISION_QA.md` |
| Commercial intent docs | `docs/COMMERCIAL_INTENT_ENGINE.md` |
| Deploy | `scripts/deploy-snippet.sh`, `scripts/deploy-demo-pages.sh` |
| Cloudflare map | `docs/CLOUDFLARE_INVENTORY.md` |

---

*End of audit. Generated from repository state at commit `98b0404` with commands executed locally on 2026-05-16.*
