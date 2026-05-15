# Surface Mapper (MVP)

## What it is

The **Surface Mapper** is developer and buyer tooling inside the Session Intel **SDK inspector**. It connects **experience decisions** (what the runtime would recommend for a `surface_id`) to **concrete regions on the current page** (where that recommendation could appear in your layout).

- **Local only**: mappings live in **`sessionStorage`** under the key `si:surface_mappings`, scoped by **`hostname|pathname`** (no query string). Nothing is sent to your backend or ours for this feature.
- **Preview only**: it does **not** rewrite the DOM, inject creatives, or orchestrate CMS delivery. It answers: “If we decided X for this surface, this is the box on the page we’re talking about.”
- **Onboarding / demo**: helps operators tag regions during integration and gives buyers a compact view of **mapped surfaces → action / timing / suppression** without pretending Session Intel owns your CMS.

## What it is not

- Not a visual rule builder or no-code personalization editor.
- Not an orchestration layer between Session Intel and your CMS.
- Not a system that automatically mutates page content.
- Not analytics or server-persisted configuration.

## Declarative install: `data-si-surface`

The simplest mapping is declarative HTML:

```html
<section data-si-surface="article_inline_mid">
  <!-- CMS-owned region; runtime can reason about this surface_id -->
</section>
```

On load, the mapper **discovers** elements with `[data-si-surface]`, ignores hidden or trivially small nodes, ignores the inspector’s own DOM, and builds a **stable-ish CSS selector** plus bounds for highlighting.

## Inspector workflow (operator)

In **operator** mode, open the inspector’s **Surface mapper** section:

1. **Refresh scan** — re-run discovery (attributes + saved mappings).
2. **Enable mapping overlay** — highlights mapped/discovered regions on the page (preview geometry only).
3. **Pick region on page** — click a page element; the tool records a selector (same path as declarative discovery).
4. Choose a **`surface_id`** from the known catalog (or fallback list), then **Save mapping** — stored in `sessionStorage` for this host+path.
5. **Clear mappings** — removes saved mappings for the current page only.

Optional: the page may dispatch a local **`CustomEvent`** named `si:surface-map-updated` after mapping changes (no required runtime telemetry).

## Buyer view

In **buyer** mode, the inspector shows a compact **Mapped surfaces** list: label, current decision action, timing, and suppression / idle messaging where relevant. This is narrative + preview, not activation.

## Session storage shape

- **Key**: `si:surface_mappings`
- **Value**: JSON `{ "v": 1, "pages": { "<hostname>|<pathname>": [ { surface_id, selector, label, created_at, source } ] } }`
- **No `localStorage`** for this feature.

## How this maps to a real CMS

In production, your CMS or tag manager owns **where** content is rendered. Session Intel continues to emit **decisions** per `surface_id`. You align that contract by:

1. Tagging slots with `data-si-surface` (or equivalent server-side markers your mapper understands), **or**
2. Maintaining your own server-side map from `surface_id` → template region.

The Surface Mapper MVP proves that alignment **on a live page** during sales and integration, without persisting layout config to Session Intel servers.

## API surface (SDK)

The implementation lives under `packages/sdk/src/surfaceMapper/`. The package root re-exports helpers such as `discoverSurfaceRegions`, `buildSurfaceMapState`, `buildSurfaceDecisionPreview`, and mapping store functions for advanced integrations or tests.

`discoverSurfaceRegions` accepts an optional `layoutStub` on `DiscoverOptions` **for automated tests only** (for example under happy-dom, where `getClientRects()` is often empty). Production code should omit it so visibility uses real layout signals.
