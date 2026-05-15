# CMS activation examples (surface contract)

Optiview’s **experience layer** is built around stable **`surface_id`** values declared in per-vertical [surface catalogs](SURFACE_CATALOGS.md) (e.g. `packages/shared/src/context-packs/surface-catalogs/`). Recipes in JSON packs choose a **primary** surface when confidence, suppression, and progression gates pass.

## What you integrate

| Concept | Meaning |
|---------|---------|
| **`surface_id`** | Stable string your CMS / Target / component maps to a **region** or **component variant**. Same ID in the catalog, recipes, and your integration code. |
| **Primary vs slots** | The **envelope** has at most one **primary** decision plus secondaries. Each catalog **surface** also has a **slot** decision (`getExperienceDecision(surfaceId)`) for suppress/none vs show. |
| **No silent DOM writes** | The tag does not inject offer markup into arbitrary CMS regions. **Your** listener renders or suppresses. |

## Read API (browser)

After **`SessionIntel`** / `boot` (hosted `si.js`) or **`@si/sdk`** `boot()`:

- **`getExperienceDecisionEnvelope()`** — full envelope (`primary_decision`, `secondary_decisions`, `suppression_summary`, …).
- **`getExperienceDecision(surfaceId)`** — slot decision for one surface (use for gated render).
- **`subscribeToDecision(surfaceId, cb)`** — fires when the experience **meaningfully** changes; callback receives **envelope** — then call `getExperienceDecision(surfaceId)` inside (see [integrations README](integrations/README.md)).
- **`subscribeToAllDecisions(cb)`** — same, for all surfaces you want one stream.
- **`pushExperienceDecisionToDataLayer()`** / **`pushExperienceDecisionToAdobeDataLayer()`** / **`pushExperienceDecisionToOptimizely()`** — push normalized payload (see [GTM guide](integrations/google-tag-manager.md)).

**CustomEvent:** `si:experience-decision` — `detail` is the envelope (useful in AEM / Webflow without a module bundler).

## Integration guides (copy-paste)

All guides live in **`docs/integrations/`**:

- [README — standard pattern + hub](integrations/README.md)
- [Google Tag Manager](integrations/google-tag-manager.md)
- [Adobe Target](integrations/adobe-target.md)
- [Adobe Experience Platform Web SDK](integrations/adobe-aep-web-sdk.md)
- [Adobe Experience Manager (AEM)](integrations/adobe-aem.md)
- [Optimizely](integrations/optimizely.md)
- [Shopify](integrations/shopify.md)
- [React / headless](integrations/react-headless.md)
- [Webflow](integrations/webflow.md)

## Examples in repo

Runnable / pasteable samples: **`examples/integrations/`** (GTM, Target, AEM, Optimizely, Shopify, React, Webflow).

## QA

Use **[INTEGRATION_QA.md](INTEGRATION_QA.md)** before go-live.
