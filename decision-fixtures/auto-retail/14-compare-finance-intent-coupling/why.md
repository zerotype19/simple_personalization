# Compare → finance commercial intent coupling

Locks **commercial_intent → decision** ranking for auto retail: when `view_financing` is strongest and `financing_or_payment_uncertainty` is active at **medium readiness**, the runtime should surface **payment assist** — not dealer contact or generic inventory.

This fixture seeds `commercial_intent` directly (no DOM). Vitest also covers the full journey replay in `commercialIntentDecisionCoupling.test.ts`.
