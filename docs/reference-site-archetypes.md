# Reference site archetypes — matrix

This repository treats **reference site archetypes** as *commercial web behavior patterns*: interaction models, conversion mechanics, and anonymous-session personalization levers. They are **not** “hardcode rules for Jeep” or any single brand — they teach the engine what major **commercial interaction models** look like.

**Positioning:** *Anonymous Activation Intelligence* — recognize *what kind of commercial interaction model is this?* That is stronger than labeling a host as generic “ecommerce.”

## Where the detail lives

| Artifact | Purpose |
|----------|--------|
| [reference-site-archetypes/schema.md](./reference-site-archetypes/schema.md) | Field definitions for each archetype record. |
| [reference-site-archetypes/catalog.yaml](./reference-site-archetypes/catalog.yaml) | Machine-readable catalog (25 flagship archetypes) for fixtures, tests, vertical-pack tuning, and playbook targets. |
| [fixtures/README.md](../fixtures/README.md) | Planned HTML snapshot names and stress-test checklist. |

## Matrix (25 flagship archetypes)

Representative sites are **illustrative examples** only (not endorsement). `SiteVertical` hints map to current SDK slugs where helpful; many corporate or hybrid models remain `general_business` until classifiers gain finer roles.

| # | Representative example | Archetype label | Primary interaction model | `SiteVertical` hint (engine) | Personalization north star |
|---|-------------------------|-----------------|-----------------------------|------------------------------|-----------------------------|
| 1 | Apple.com | Premium consumer electronics ecosystem commerce | DTC premium configure + ecosystem attach | `ecommerce` | Help-me-choose, trade-in, bundles, financing clarity |
| 2 | Samsung.com | High-SKU consumer electronics commerce | Promo/financing-sensitive SKU retail | `ecommerce` | Compatibility, offers, comparison de-noise |
| 3 | Nike.com | Lifestyle + DTC commerce | Collections / drops / membership | `ecommerce` | Collections, loyalty-aware copy, size/fit assist |
| 4 | Sephora.com | Beauty commerce + loyalty | Reviews + shade discovery + rewards | `ecommerce` | Quiz/reco, rewards, complementary SKUs |
| 5 | Amazon.com | Marketplace / high-intent commerce | Search-driven comparison + urgency | `ecommerce` | Cross-sell, recommendations, ethical urgency |
| 6 | Wayfair.com | High-consideration home commerce | Long browse + financing/delivery sensitivity | `ecommerce` | Room bundles, style guidance, financing |
| 7 | Cologuard.com | Healthcare education → lead/action | Regulated screening education + handoff | `healthcare` | Provider guides, eligibility, reminders |
| 8 | Hims.com | Healthcare DTC acquisition | Quiz + subscription + privacy trust | `healthcare` | Onboarding quiz, reassurance, soft signup |
| 9 | UnitedHealthcare.com | Healthcare benefits navigation | Plan/provider/coverage self-serve | `healthcare` | Plan guidance, routing, support deflection |
| 10 | Citi.com | Financial services multi-product | Cards/bank/lend cross-sell | `financial_services` | Product match, prequal paths, rewards |
| 11 | USAA.com | Multi-line financial + insurance membership | Eligibility + bundle + trust | `financial_services` | Bundles, onboarding, security story |
| 12 | RocketMortgage.com | Lead-gen mortgage funnel | Rate/calc-driven application starts | `financial_services` | Calculators, rate alerts, consult |
| 13 | TurboTax.com | Seasonal guided conversion | Wizard + edition upsell + reassurance | `financial_services` | Guided flow, transparent upsell, help |
| 14 | Jeep.com | Lifestyle-driven auto OEM | Brand/configure → dealer handoff | `auto_retail` | Build & price, dealer clarity, compliant incentives |
| 15 | Ford.com | Mass-market auto OEM | Inventory + finance + use-case | `auto_retail` | Inventory, financing, work/personal |
| 16 | Tesla.com | Direct-order EV commerce | Online order + financing + ownership | `auto_retail` | Order assist, delivery expectations, ecosystem |
| 17 | Chevron.com | Corporate reputation + investor + sustainability | Stakeholder comms, not transaction-first | `general_business` | Reports, IR, careers/community |
| 18 | Coca-Cola.com | Global CPG brand storytelling | Campaign + promo + retailer handoff | `ecommerce` / `general_business` | Local promos, campaigns, locator |
| 19 | Procter & Gamble | Multi-brand CPG ecosystem | Household solutions + coupons + retail | `ecommerce` | Coupons, cross-brand, retailer handoff |
| 20 | Marriott.com | Hospitality booking + loyalty | Destination + booking + packages | `travel_hospitality` | Offers, points messaging, packages |
| 21 | Expedia.com | Travel marketplace | Compare + bundle + urgency | `travel_hospitality` | Price alerts, bundles, ethical scarcity |
| 22 | Spotify.com | Subscription entertainment funnel | Free → paid + plan segmentation | `publisher_content` / `lead_generation` | Trials, plan fit, feature education |
| 23 | Salesforce.com | Enterprise B2B platform | Industry + demo + ROI proof | `b2b_saas` | Role/industry journeys, demo timing |
| 24 | HubSpot.com | Inbound SaaS + content engine | Content/tools → nurture → demo | `b2b_saas` | Templates, academy depth, demo CTA |
| 25 | Angi.com | Local services marketplace | Quotes + reviews + provider match | `local_services` | Quotes explained, trust, shortlist |

## Breadth beyond the 25 (next catalog slices)

The same YAML schema supports additional archetypes without renaming the program — for example **standalone P&C insurance** (policy education + quote), **telecom** (plan/device/trade-in), **utilities** (outage/billing/start service), **retail media**, and **luxury/appointment clienteling**. Add rows to `catalog.yaml` and matching fixture filenames under `fixtures/` when you are ready to capture HTML.

## Vertical packs & playbook tuning (today → next)

- **Today:** `SiteVertical`, universal concept pack, generic playbooks, and CTA hard/soft/navigation classification align with several rows above (especially B2C commerce, healthcare, finance, travel, local services, B2B).
- **Next:** For each archetype `id` in `catalog.yaml`, optionally add:
  - `context-packs/verticals/*.json` slices or overrides (only where behavior truly diverges).
  - Playbook `when` tuning keyed off `engine_hints.playbook_tuning` in this repo’s JSON playbooks.
  - Vitest fixtures that assert vertical, page role, concepts, activation shape, and CTA buckets (see `fixtures/README.md`).

## Principles (moat)

1. **Archetypes = interaction economics**, not brand trivia.  
2. **Anonymous-first** — patterns must be visible without identity.  
3. **No deceptive urgency** — especially marketplace, travel, and promo-heavy retail.  
4. **Regulated verticals** (health, finance) — favor education, consent, and clarity over pressure.  
5. **Corporate / IR / ESG** — optimize for task completion and trust, not “checkout.”

When the hosted tag consistently answers *“what commercial interaction model is this?”*, reviewers perceive depth — not luck.
