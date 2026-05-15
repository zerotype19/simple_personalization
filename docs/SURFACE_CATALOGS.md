# Surface catalogs

Surface catalogs define **allowed `surface_id` values** per vertical: confidence floors, friction caps, and allowed **timing** enums. They live under:

`packages/shared/src/context-packs/surface-catalogs/`

Loaded via `getSurfaceCatalogForVertical()` in `@si/shared/experiencePacks`.

## Entry shape

```json
{
  "surfaces": [
    {
      "surface_id": "pricing_page_secondary_cta",
      "surface_type": "inline_cta",
      "label": "Optional human label",
      "min_confidence": 0.48,
      "max_friction": "medium",
      "allowed_timing": ["after_scroll", "next_navigation"],
      "safe_for_zero_config": true
    }
  ]
}
```

## Bundled verticals

| File stem | Typical `SiteVertical` mapping |
|-----------|-------------------------------|
| `b2b-saas` | `b2b_saas`, `content_led_business`, `lead_generation`, … |
| `ecommerce` | `ecommerce`, `travel_hospitality` |

### Ecommerce surface roles (bundled catalog)

| `surface_id` | Role |
|--------------|------|
| `category_help_me_choose` | Category-grid shortlist / criteria |
| `pdp_comparison_module` | PDP-side-by-side compare |
| `mobile_quick_compare` | Compact thumb-friendly compare strip |
| `product_fit_assistant` | Repeat-view fit confirmation |
| `size_or_variant_guidance` | Size / colorway uncertainty |
| `bundle_or_accessory_module` | Cart-complete pairing |
| `cart_assist_inline` | Inline cart assist |
| `shipping_returns_reassurance` | Cart hesitation — policy clarity first |
| `review_summary_module` | Social proof summary |
| `high_aov_confidence_module` | Premium consideration pack |
| `inventory_reassurance_strip` | Stock / ship window strip |
| `coupon_offer_secondary` | Earned inline coupon (high confidence floor) |
| `loyalty_or_email_soft_capture` | Soft loyalty / save-for-later |
| `product_recommendation_slot` | Light browse suggestions only |
| `ecom_exit_offer_popup` | Gated interrupt (high `min_confidence`; fixtures expect suppress) |
| `healthcare` | `healthcare` |
| `financial-services` | `financial_services` |
| `auto-oem` | `auto_oem` |
| `auto-retail` | `auto_retail` |
| `publisher` | `publisher_content` |
| `generic` | fallback verticals |

## Why this matters

Enterprise integrations map **stable IDs** (e.g. `pricing_page_secondary_cta`) to CMS slots, Target mboxes, or GTM triggers. Generic labels like “popup” are intentionally avoided in favor of **role-specific** IDs.

## Adding a surface

1. Add the JSON entry to the vertical catalog.
2. Reference `surface_id` from one or more [recipes](DECISION_RECIPES.md).
3. Extend tests in `packages/sdk/src/decisioning/experienceDecisions.test.ts` if the behavior is contractually important.
