# React / headless: `useOptiviewDecision`

## Prereq

Call **`boot()`** once before your app reads decisions (e.g. in `main.tsx`):

```tsx
import { boot } from "@si/sdk";

await boot({ site: "YOUR_SITE_SLUG", key: "YOUR_PUBLISHABLE_KEY" });
```

## Files

- **`useOptiviewDecision.ts`** — hook for one **`surface_id`**
- **`ArticleInlineSurface.tsx`** — gated render example

## Docs

**`docs/integrations/react-headless.md`**
