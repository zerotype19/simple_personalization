import { describe, expect, it } from "vitest";
import {
  buildBuyerInspectorView,
  buildFixtureProfile,
  buyerSafeLineOrNull,
  describeLatestReplayTransition,
  isBuyerUnsafeString,
  joinBuyerInspectorNarrativeForTests,
  runDecisionReplay,
  BUYER_RUNTIME_SIGNAL_STILL_GATHERING,
} from "@si/sdk";
import { joinScenarioPanelBuyerTextForTests } from "../components/ScenarioPresetsPanel";
import { SCENARIO_PRESETS } from "./scenarios";

describe("scenario preset buyer copy", () => {
  it("keeps buyer narrative and panel strings free of buyer-unsafe phrases for every preset step", () => {
    for (const preset of SCENARIO_PRESETS) {
      const profiles = preset.frames.map((f) => buildFixtureProfile(f));
      for (let step = 0; step < profiles.length; step++) {
        const slice = profiles.slice(0, step + 1);
        const replay = runDecisionReplay(slice);
        const lastFrame = replay.frames[replay.frames.length - 1]!;
        const view = buildBuyerInspectorView(slice[slice.length - 1]!, lastFrame.envelope, replay);
        const narrativeBlob = joinBuyerInspectorNarrativeForTests(view);
        expect(isBuyerUnsafeString(narrativeBlob), `unsafe narrative preset=${preset.id} step=${step}`).toBe(
          false,
        );

        const replayWhy = describeLatestReplayTransition(replay);
        const safeReplayWhy = replayWhy ? buyerSafeLineOrNull(replayWhy) : null;

        const panelBlob = joinScenarioPanelBuyerTextForTests({
          buyer: view,
          stateShift: null,
          replayTransitionWhy: safeReplayWhy,
          decisionShift: null,
          ladderLabels: preset.progressionLabels,
          stepLabels: [],
        });
        expect(isBuyerUnsafeString(panelBlob), `unsafe panel preset=${preset.id} step=${step}`).toBe(false);
        expect(panelBlob).not.toMatch(/progression_surface_cooldown|Progression held|primary_decision/i);
      }
    }
  });

  it("never surfaces raw progression_notes in withheld copy", () => {
    const preset = SCENARIO_PRESETS[0]!;
    const profiles = preset.frames.map((f) => buildFixtureProfile(f));
    const replay = runDecisionReplay(profiles);
    const lastFrame = replay.frames[replay.frames.length - 1]!;
    const env = {
      ...lastFrame.envelope,
      progression_notes: [
        "Progression held integration_requirements_summary (progression_surface_cooldown)",
      ],
    };
    const view = buildBuyerInspectorView(profiles[profiles.length - 1]!, env, replay);
    const blob = joinBuyerInspectorNarrativeForTests(view);
    expect(blob).not.toMatch(/progression_surface_cooldown|Progression held|integration_requirements/i);
    expect(isBuyerUnsafeString(blob)).toBe(false);
  });
});

describe("describeLatestReplayTransition buyer safety", () => {
  it("collapses unknown transition reasons to the canonical gathering line", () => {
    const replay = {
      frames: [],
      transitions: [
        {
          from_index: 0,
          to_index: 1,
          reasons: ["not_a_real_reason" as never],
          primary_surface_from: null,
          primary_surface_to: null,
          suppression_delta: "unchanged",
          timing_from: null,
          timing_to: null,
        },
      ],
      progression_summary: "",
      suppression_summary: "",
      timing_summary: "",
    };
    expect(describeLatestReplayTransition(replay)).toBe(BUYER_RUNTIME_SIGNAL_STILL_GATHERING);
  });
});
