# Reference site HTML fixtures (planned)

Sanitized, static HTML snapshots used to stress-test:

- vertical and page-role classification  
- concept affinity and evidence  
- activation opportunity (offer, surface, timing, friction)  
- CTA bucketing (hard / soft / navigation / support)  
- confidence posture and inspector copy  

## Naming (aligns with `docs/reference-site-archetypes/catalog.yaml`)

Suggested files (create over time; **do not** commit raw third-party pages without rights and scrubbing PII/scripts):

| Fixture file | Archetype `id` (from catalog) |
|----------------|------------------------------|
| `apple-home.html` | `apple_premium_ecosystem_commerce` |
| `samsung-product-compare.html` | `samsung_high_sku_consumer_electronics` |
| `nike-category.html` | `nike_lifestyle_dtc_commerce` |
| `sephora-pdp.html` | `sephora_beauty_commerce_loyalty` |
| `amazon-search-results.html` | `amazon_marketplace_high_intent_commerce` |
| `wayfair-room-idea.html` | `wayfair_high_consideration_home_commerce` |
| `cologuard-screening.html` | `cologuard_healthcare_education_to_lead` |
| `hims-condition.html` | `hims_healthcare_dtc_acquisition` |
| `uhc-plan-compare.html` | `unitedhealthcare_benefits_navigation` |
| `citi-card-compare.html` | `citi_financial_services_multi_product` |
| `usaa-home.html` | `usaa_financial_insurance_membership_ecosystem` |
| `rocket-mortgage-rates.html` | `rocket_mortgage_lead_gen_funnel` |
| `turbotax-product.html` | `turbotax_seasonal_guided_conversion` |
| `jeep-model-page.html` | `jeep_lifestyle_auto_oem` |
| `ford-inventory.html` | `ford_mass_market_auto_oem` |
| `tesla-order.html` | `tesla_direct_order_ev_commerce` |
| `chevron-sustainability.html` | `chevron_corporate_reputation_investor` |
| `coca-cola-campaign.html` | `coca_cola_global_cpg_brand_story` |
| `pg-brand-hub.html` | `procter_gamble_multi_brand_cpg_ecosystem` |
| `marriott-destination.html` | `marriott_hospitality_booking_loyalty` |
| `expedia-search.html` | `expedia_travel_marketplace` |
| `spotify-pricing.html` | `spotify_subscription_entertainment_funnel` |
| `salesforce-industry.html` | `salesforce_enterprise_b2b_platform` |
| `hubspot-resource.html` | `hubspot_inbound_saas_content_engine` |
| `angi-quote-flow.html` | `angi_local_services_marketplace` |

## Test harness (target behavior)

For each fixture, assert at least:

1. **Vertical** (or explicit “unknown / general” when appropriate)  
2. **Page role** (PDP, article, plan compare, corporate story, etc.)  
3. **Top concepts** (from universal + vertical packs)  
4. **Activation opportunity** shape (offer type, surface, friction band)  
5. **CTA classification** (no “learn more” counted as hard conversion)  
6. **Confidence posture** (ladder / certainty bands not over-claiming)  
