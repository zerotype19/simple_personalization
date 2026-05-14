# Reference site archetype — YAML fields

These archetypes describe **commercial web behavior patterns**, not one-off site rules. They teach the engine what major interaction models look like: psychology, conversion mechanics, and anonymous-session personalization levers.

Each record in `catalog.yaml` uses:

| Field | Purpose |
|--------|--------|
| `id` | Stable slug for fixtures, tests, and tuning (`apple_premium_ecosystem_commerce`). |
| `label` | Short human name for the archetype. |
| `representative_sites` | Example brands or domains (illustrative, not endorsement). |
| `site_type` | Interaction model (e.g. `dtc_commerce`, `marketplace`, `lead_gen_healthcare`). |
| `business_model` | How value is captured (subscription, transaction, membership, ads-supported, etc.). |
| `primary_objective` | Dominant commercial goal of the anonymous visit. |
| `secondary_objective` | Supporting goal (loyalty, education, handoff to channel). |
| `typical_page_roles` | Page kinds the classifier should expect (product, compare, plan_finder, etc.). |
| `common_conversion_paths` | Ordered or named funnels typical for this model. |
| `common_personalization_needs` | What “good” anonymous activation optimizes for. |
| `key_concepts` | Concept-pack / affinity anchors (maps toward `context-packs` over time). |
| `typical_ctas` | Hard vs soft CTA language patterns (for scanner / CTA bucketing tests). |
| `typical_activation_surfaces` | Where messaging usually belongs (PDP strip, exit modal, inline module, etc.). |
| `anonymous_visitor_patterns` | Observable session behaviors before identity (scroll depth, compare hops, return visits). |
| `engine_hints` | Optional: suggested `SiteVertical`, playbook tuning notes, stress-test priority. |

Fixture HTML files (e.g. `fixtures/apple-home.html`) should be **sanitized snapshots** later — no requirement to commit full third-party HTML in-repo until you have rights and a capture pipeline.
