# Demo flow (Velocity Motors + Session Intelligence)

Use this script for a **live walkthrough** of the hosted model: CDN snippet, anonymous session, inspector, and activation APIs.

## Prerequisites

- Demo deployed (for example **`https://demo.optiview.ai`**) with Worker URL and snippet CDN aligned with [PRODUCTION_HOSTING.md](./PRODUCTION_HOSTING.md).
- Or run locally: `pnpm dev:demo` with Worker dev proxy (bundled SDK path; CDN bridge is for production-like builds).

## Steps

1. **Open the demo site** in a clean window or incognito.
2. **Show the installed pattern** — production builds load **`https://cdn.optiview.ai/si.js`** (see Network → JS); local dev uses the SDK via Vite instead.
3. **Open the inspector** — **SI** chip or **Ctrl+Shift+`** / **⌘+Shift+`**; optionally add **`?si_debug=1`** first.
4. **Anonymous visitor read** — walk through the executive briefing: journey, concepts, and trust posture (no PII).
5. **Acquisition intelligence** — how anonymous interest is inferred from navigation and engagement (still anonymous).
6. **Activation opportunity** — synthesized recommendation and supporting context.
7. **Console: `getPersonalizationSignal()`** — show the structured signal your stack can consume.
8. **Console: `pushPersonalizationSignalAll()`** — show pushes to common data layers where enabled.
9. **Data layer** — mention `pushPersonalizationSignalToDataLayer` / Adobe / Optimizely helpers as in the integration dictionary.
10. **Privacy posture** — session-scoped, no fingerprinting claim beyond product policy; `/collect` is optional batch telemetry to your Worker.

## Related docs

- [session-intelligence-webmaster-demo-guide.md](./session-intelligence-webmaster-demo-guide.md) (also copied under `/integration` on the demo).
- [CUSTOMER_INSTALL.md](./CUSTOMER_INSTALL.md)
