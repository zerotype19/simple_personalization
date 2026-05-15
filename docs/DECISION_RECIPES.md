# Decision recipes (JSON packs)

Recipes live under:

`packages/shared/src/context-packs/experience-recipes/`

They are **matched deterministically** in the SDK (no DSL, no remote fetch). Vertical selection uses `@si/shared/experiencePacks` (`getExperienceRecipesForVertical`).

## Shape

```json
{
  "id": "b2b_implementation_readiness_inline",
  "label": "Human-readable label",
  "verticals": ["b2b_saas", "content_led_business", "generic"],
  "surfaces": ["article_inline_mid", "implementation_readiness_inline"],
  "min_engagement_score": 40,
  "min_activation_readiness": 35,
  "required_any_concepts": ["implementation_readiness"],
  "max_cta_clicks": 2,
  "allowed_phases": ["research", "evaluation", "comparison"],
  "decision": {
    "action": "show",
    "surface_type": "inline_cta",
    "message_angle": "make_it_practical",
    "offer_type": "implementation_checklist",
    "headline": "…",
    "body": "…",
    "cta_label": "…",
    "target_url_hint": "",
    "timing": "after_scroll",
    "friction": "low",
    "ttl_seconds": 900
  }
}
```

## Concept slugs

`required_any_concepts` entries are **slugs** aligned with slugified `concept_affinity` keys from the context brain (e.g. `implementation_readiness` ↔ “Implementation readiness”). Weak concepts below the display floor do not match.

## Phases

`allowed_phases` uses `CommercialJourneyPhase` from `@si/shared` (`research`, `evaluation`, `comparison`, …). If the profile has no phase, the gate passes.

## Ordering

Multiple recipes may match. The engine **dedupes by `recipe.id`**, keeps the strongest candidate per recipe, ranks by confidence, then applies **suppression** and surface rules. At most **one primary** and **two secondaries** are emitted.

When **match confidence ties** (common today because the base score is profile-wide), the **first viable recipe in JSON file order** wins the primary after stable sorting—so **recipe order is part of the product contract** and must be updated together with fixtures when you rebalance.

**Ecommerce pack order (intentional):** comparison / fit / trust recipes (`ecom_mobile_quick_compare`, `ecom_help_me_choose_compare`, fit, variant, high-AOV, inventory, cart shipping) are listed **before** `ecom_coupon_secondary_soft` and loyalty capture so merchandising guidance wins ties unless promo concepts and thresholds are met.

**Financial services pack order (intentional):** trust/security and document-prep recipes are listed early for trust-sensitive and high-intent paperwork sessions; **rewards**, **refinance**, **calculator**, **payment estimate**, then **`finance_rate_fee_explainer_standalone`** (APR/fee/APY concepts) **before** **`finance_fee_transparency_module`** (Schumer-box / fee-schedule concepts) so APR-only readers land on the **inline rate/fee explainer**; **eligibility** and **card comparison** precede the broad **`finance_trust_compare_inline`** bundle; **`finance_application_soft_resume_high`** stays late with **`conversion_ready`** + high readiness gates; predatory **`finance_guaranteed_approval_bad`** remains last for suppression tests. Anonymous finance doctrine: **build comparison confidence and trust**, not implied approval, distress, urgency, or personal financial status—see `decision-fixtures/financial-services/05-*`–`16-*`.

**Auto OEM pack order (intentional):** **`auto_oem_incentive_inline`** first for stackable-offer sessions; **`auto_oem_model_discovery_soft`** for **discovery/research** only; **`auto_oem_capability_explainer`**, **`auto_oem_trim_compare`** (requires trim-grade concepts), **`auto_oem_configurator_resume_soft`** before **`auto_oem_build_price_focus`** so resume tokens beat generic configurator lanes; **EV**, **family**, **payment estimate**, **owner**, **inventory transition**, then **`auto_oem_dealer_locator_earned`** last among positives (high readiness + dealer/test-drive concepts). See `decision-fixtures/auto-oem/04-*`–`15-*`.

**Auto retail pack order (intentional):** **`auto_retail_dealer_contact_earned`** first among high-intent CTAs (explicit **call/text/contact dealer** concepts + readiness); **`auto_retail_finance_payment_assist`** before **`auto_retail_test_drive_earned`** so payment comparisons beat drive-booking ties; **`auto_retail_trade_in_soft`** then **`auto_retail_inventory_assist`** as the broad inventory catch-all (concept-gated). See `decision-fixtures/auto-retail/04-*`–`13-*`.

## Editing workflow

1. Add or edit JSON in `experience-recipes/`.
2. Ensure surfaces exist in the matching [surface catalog](SURFACE_CATALOGS.md) for that vertical.
3. Run `pnpm test` — `experienceDecisions.test.ts` guards key behaviors.
4. Ship SDK bundle — recipes are compiled into `si.js`.
