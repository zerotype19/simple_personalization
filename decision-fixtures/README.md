# Decision fixtures

JSON-driven QA for the **Experience Decision Runtime** in `@si/sdk`. Fixtures assert that ranked decisions stay commercially plausible, vertically appropriate, and safe (suppression, confidence gates, copy guardrails) **without** changing runtime types, collect schema, or public SessionIntel APIs.

## Layout

Each vertical is a folder. Each case is a subfolder with four files:

| File | Role |
|------|------|
| `session-input.json` | Session / profile inputs merged into the same shapes the runtime uses (`buildFixtureProfile` → `buildExperienceDecisionEnvelope`). |
| `expected-primary.json` | Assertions on primary decision, secondaries, slots, confidence, and forbidden substrings. |
| `bad-decisions.json` | Patterns that must **not** appear in primary headline/body/CTA/reasons/evidence (anti-patterns). |
| `why.md` | Human intent: why the expected outcome is good business, why bad patterns are unacceptable, what suppression should do. |

Vertical folders (minimum three cases each):

- `b2b-saas/`
- `ecommerce/`
- `healthcare/`
- `financial-services/`
- `auto-oem/`
- `auto-retail/`
- `publisher/`

## Session input (`session-input.json`)

Supported fields mirror fixture builder types (see `packages/sdk/src/decisioning/fixtures/types.ts`). Commonly used:

- `name`, `vertical`
- `engagement_score`, `commercial_journey_phase`, `page_type`, `journey_stage`
- `site_environment` (page kind, confidence, signals)
- `behavior_snapshot`, `activation_opportunity`, `signals`, `recommendation`
- `expected_surfaces_to_query`: surface IDs that must exist in the slot map; if that surface is primary, slot action must be `show`

## Expected primary (`expected-primary.json`)

- `primary_must_be_null` or `primary_decision: null` — no strong primary.
- `expected_surface_id`, `expected_offer_type`, `expected_message_angle`, `expected_timing`
- `min_confidence` / `max_confidence`
- `required_reason_terms` — substrings required in `primary.reason` joined text
- `forbidden_terms` — must not appear in primary copy blob
- `allowed_secondary_surface_ids` — every secondary must be in this list when set
- `surface_slots` — per-surface `show` | `suppress` | `none` | `any` for slot decisions

The runner also enforces **at most two** secondary decisions globally.

## Bad decisions (`bad-decisions.json`)

Array of `{ "forbidden_substring": "..." }` checked case-insensitively against the same primary blob as `forbidden_terms`.

## How to run

From the repository root:

```bash
pnpm decision-fixtures
```

Alias:

```bash
pnpm test:decisions
```

Vitest (full suite including fixtures):

```bash
pnpm test
```

Override fixture root (optional):

```bash
SI_DECISION_FIXTURES_ROOT=/path/to/fixtures pnpm decision-fixtures
```

## Documentation

See [docs/DECISION_QA.md](../docs/DECISION_QA.md) for the commercial plausibility rubric, vertical safety expectations, and a step-by-step guide for adding new cases.
