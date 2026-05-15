# Decision replay & runtime observability

This doc describes **Phase C**: how to **inspect**, **replay**, and **explain** the browser-local experience runtime **without** a remote decision service, database writes, or orchestration layer changes.

## Philosophy

- **Deterministic** — replays feed the same `SessionProfile` snapshots through the **same** recipe → suppression → progression pipeline as production (`buildExperienceDecisionEnvelope`).
- **Fixture-first** — quality gates live next to decision fixtures; replay tests assert pacing, not copy polish.
- **Operator-first** — narratives and inspector UI assume **CMS / analytics / solutions** readers, not shoppers.
- **Local-only** — replay and CustomEvent payloads stay in the browser; no implied persistence or ML.

## Core APIs (`@si/sdk`)

| Export | Role |
|--------|------|
| `runDecisionReplay(frames, options?)` | Re-run an ordered list of profiles; returns frames, transitions, summaries. |
| `buildOperatorSessionStory(replay)` | Template-built operator narrative from a `ReplayResult` (not LLM). |
| `buildExperienceDecisionEnvelopeWithDiagnostics` | Same outcome as the runtime envelope, plus matched / suppressed / gated recipe diagnostics. |
| `diffExperienceDecision(prev, next, vertical, progression?)` | Structural diff for CMS adapters (surface, timing, friction band, family, escalation delta). |
| `inferDecisionTransitionReasons({ ... })` | Map profile + envelope deltas to `DecisionTransitionReason` codes. |
| `dispatchSiDecisionTransition` / `dispatchSiDecisionSuppressed` / `dispatchSiDecisionReplayed` | Optional CustomEvent emitters (`si:*`). |
| Observability helpers | `replayHasSurfaceFlicker`, `replayEscalationJumpsLimited`, `replayTransitionsHaveReasons`, etc. |

## Browser events

Emitted when the runtime detects a **meaningful** experience change (same predicate as the decision bus):

| Event | When |
|-------|------|
| `si:decision-transition` | Primary / suppression story changed; `detail` includes coded `transition_reasons`, timing, confidence endpoints, progression stage. |
| `si:decision-suppressed` | Primary became `null` after previously having a primary. |

`si:decision-replayed` is opt-in via `dispatchSiDecisionReplayed` for tooling that runs `runDecisionReplay` explicitly (the inspector does not emit it on every render).

Types live in `packages/sdk/src/destinations/decisionRuntimeEvents.ts`.

## Inspector: Decision progression

The Session Intelligence panel includes **Decision progression** — a replay of the last snapshots captured when the envelope meaningfully changed (up to about 16). It shows:

- A short **operator story** (`buildOperatorSessionStory`).
- **Transition codes** (why the runtime moved, suppressed, or held steady).
- **Per-tick** primary surface, readiness, and path key.

## Transition codes

`DecisionTransitionReason` includes session shape (`readiness_crossed_threshold`, `commercial_phase_advanced`, …), decision shape (`decision_family_rotated`, `timing_escalated`, …), restraint (`suppression_due_to_low_confidence`, `progression_gate_blocked`, …), and `first_frame`.

## Debugging workflow

1. Capture or synthesize `SessionProfile[]` (tests, inspector buffer, exported state).
2. Run `runDecisionReplay(frames)` and read transitions + suppression summaries.
3. Use `diffExperienceDecision` when wiring CMS slots to avoid DOM churn on no-op deltas.
4. Subscribe to `si:decision-transition` only for secondary automation; default integration remains `si:experience-decision`.

## Tests

- `packages/sdk/src/decisioning/__tests__/decision-replay.test.ts`
- `packages/sdk/src/decisioning/replay/observabilityInvariants.ts`

## Constraints (non-goals)

No remote replay API, rule builder UI, DB logging, or autonomous optimizers. Replay does **not** re-run site scan — it evaluates the profiles you pass in.
