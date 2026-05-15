# Optiview × React / headless

Use **`@si/sdk`** `boot()` in your app shell and a small **`useOptiviewDecision(surfaceId)`** hook for gated render. Safe for SSR: guard **`typeof window`** before subscribing.

## 1. Install snippet / package

**Browser tag:** [Session Intelligence](https://optiview.ai/install).

**npm (recommended for React):**

```bash
npm install @si/sdk
```

```tsx
import { boot } from "@si/sdk";

await boot({ site: "YOUR_SITE_SLUG", key: "YOUR_PUBLISHABLE_KEY" });
```

## 2. Read decision envelope

```typescript
import { getExperienceDecisionEnvelope } from "@si/sdk";
const env = getExperienceDecisionEnvelope();
```

## 3–4. Hook — subscribe + surface slot

See **`examples/integrations/react-headless/useOptiviewDecision.ts`** — pattern:

- `useEffect` → `subscribeToDecision(surfaceId, () => set(getExperienceDecision(surfaceId)))`.

## 5. Push decision to your stack

From the same package:

- `pushExperienceDecisionToDataLayer()` — GTM.
- `pushExperienceDecisionToAdobeDataLayer()` — Adobe Client Data Layer.
- `pushExperienceDecisionToOptimizely()` — Optimizely.

Call from `useEffect` on envelope change if your tag containers need it.

## 6. Debug checklist

- [ ] Single React 18 root: no double `boot` in Strict Mode without idempotent guard (avoid duplicate listeners — use module singleton).
- [ ] Decision updates re-render only when **slot** for that **`surface_id`** changes.
- [ ] **`INTEGRATION_QA.md`**.

## Related

- [Webflow](webflow.md) (no bundler) · [Shopify](shopify.md) · [CMS hub](../CMS_ACTIVATION_EXAMPLES.md)
