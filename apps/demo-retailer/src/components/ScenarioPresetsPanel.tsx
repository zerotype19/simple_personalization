import { useEffect, useMemo, useState } from "react";
import {
  buildBuyerInspectorView,
  buildFixtureProfile,
  buyerSafeLineOrNull,
  describeLatestReplayTransition,
  getExperienceState,
  getStateProgressionLadder,
  joinBuyerInspectorNarrativeForTests,
  ladderLabel,
  runDecisionReplay,
} from "@si/sdk";
import { SCENARIO_PRESETS, type ScenarioGroupId, type ScenarioPreset } from "../scenarioPresets/scenarios";

const GROUP_ORDER: ScenarioGroupId[] = [
  "b2b_saas",
  "ecommerce",
  "healthcare",
  "financial_services",
  "auto_retail",
];

function presetsForGroup(group: ScenarioGroupId): ScenarioPreset[] {
  return SCENARIO_PRESETS.filter((p) => p.group === group);
}

const btnSecondary =
  "rounded-md border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-600 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40";

const btnPrimary =
  "rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40";

const DEFAULT_SCENARIO_PRESET_ID =
  SCENARIO_PRESETS.find((p) => p.group === "auto_retail")?.id ?? SCENARIO_PRESETS[0]!.id;

export default function ScenarioPresetsPanel() {
  const [presetId, setPresetId] = useState<string>(DEFAULT_SCENARIO_PRESET_ID);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const selected = useMemo(
    () => SCENARIO_PRESETS.find((p) => p.id === presetId) ?? SCENARIO_PRESETS[0]!,
    [presetId],
  );

  const maxStep = selected.frames.length - 1;

  useEffect(() => {
    setStep(0);
    setPlaying(false);
  }, [presetId]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setStep((s) => {
        if (s >= maxStep) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, 1350);
    return () => window.clearInterval(id);
  }, [playing, maxStep]);

  const profiles = useMemo(
    () => selected.frames.map((f) => buildFixtureProfile(f)),
    [selected.frames],
  );

  const slice = profiles.slice(0, step + 1);
  const replay = useMemo(() => runDecisionReplay(slice), [slice]);

  const lastProfile = slice[slice.length - 1]!;
  const lastFrame = replay.frames[replay.frames.length - 1]!;

  const buyer = useMemo(
    () => buildBuyerInspectorView(lastProfile, lastFrame.envelope, replay),
    [lastProfile, lastFrame, replay],
  );

  const runtimeLadder = useMemo(
    () => getStateProgressionLadder(getExperienceState(lastProfile, lastFrame.envelope, replay)),
    [lastProfile, lastFrame, replay],
  );

  const stateShift = useMemo(() => {
    if (step === 0) return null;
    const prevSlice = profiles.slice(0, step);
    const prevReplay = runDecisionReplay(prevSlice);
    const pf = prevReplay.frames[prevReplay.frames.length - 1]!;
    const pp = prevSlice[prevSlice.length - 1]!;
    const a = getExperienceState(pp, pf.envelope, prevReplay);
    const b = getExperienceState(lastProfile, lastFrame.envelope, replay);
    if (a === b) return null;
    return buyerSafeLineOrNull(`${ladderLabel(a)} → ${ladderLabel(b)}`);
  }, [step, profiles, lastProfile, lastFrame, replay]);

  const replayTransitionWhy = useMemo(() => {
    const raw = describeLatestReplayTransition(replay);
    return raw ? buyerSafeLineOrNull(raw) : null;
  }, [replay]);

  const decisionShift = useMemo(() => {
    if (step === 0) return null;
    const prevSlice = profiles.slice(0, step);
    const prevReplay = runDecisionReplay(prevSlice);
    const pf = prevReplay.frames[prevReplay.frames.length - 1]!;
    const pp = prevSlice[prevSlice.length - 1]!;
    const prevBuyer = buildBuyerInspectorView(pp, pf.envelope, prevReplay);
    if (prevBuyer.recommended.show === buyer.recommended.show) return null;
    return buyerSafeLineOrNull(
      `Decision shifted: ${prevBuyer.recommended.show} → ${buyer.recommended.show}`,
    );
  }, [step, profiles, buyer]);

  const play = () => {
    if (step >= maxStep) setStep(0);
    setPlaying(true);
  };

  const pause = () => setPlaying(false);

  const next = () => {
    setStep((s) => Math.min(maxStep, s + 1));
  };

  const reset = () => {
    setPlaying(false);
    setStep(0);
  };

  return (
    <section className="border-b border-slate-800 bg-slate-950/80">
      <div className="mx-auto max-w-6xl px-4 py-5">
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Scenario presets</h2>
          <p className="text-xs text-slate-500">
            Deterministic session frames replayed through the same decision pipeline as the live runtime — no generated
            traffic, no demo-only inference.
          </p>
        </div>

        <div className="space-y-5">
          {GROUP_ORDER.map((g) => (
            <div key={g}>
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                {presetsForGroup(g)[0]?.groupTitle ?? g}
              </div>
              <div className="flex flex-wrap gap-2">
                {presetsForGroup(g).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={
                      p.id === selected.id
                        ? "rounded-md border border-indigo-500/60 bg-indigo-950/40 px-3 py-1.5 text-left text-xs text-indigo-100"
                        : "rounded-md border border-slate-800 bg-slate-900/50 px-3 py-1.5 text-left text-xs text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                    }
                    onClick={() => setPresetId(p.id)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnPrimary} onClick={play} disabled={playing}>
                Play
              </button>
              <button type="button" className={btnSecondary} onClick={pause} disabled={!playing}>
                Pause
              </button>
              <button type="button" className={btnSecondary} onClick={next} disabled={step >= maxStep}>
                Next step
              </button>
              <button type="button" className={btnSecondary} onClick={reset}>
                Reset
              </button>
            </div>
            <div className="text-[11px] text-slate-500">
              Step {step + 1} of {maxStep + 1} · {selected.label}
            </div>
          </div>

          <div className="mt-4 border-t border-slate-800/80 pt-4">
            <div className="text-[11px] font-medium text-slate-500">Experience states</div>
            <p className="mt-1 text-[11px] text-slate-500">
              Same five-state path as the buyer inspector — highlights move as replay frames advance.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-2 text-xs text-slate-400">
              {runtimeLadder.steps.map((lbl, i) => (
                <span key={`${lbl}-r-${i}`} className="inline-flex items-center gap-2">
                  <span
                    className={
                      i === runtimeLadder.currentIndex
                        ? "rounded-md bg-slate-800 px-2 py-0.5 font-medium text-slate-100"
                        : "rounded-md px-2 py-0.5"
                    }
                  >
                    {lbl}
                  </span>
                  {i < runtimeLadder.steps.length - 1 ? (
                    <span className="text-slate-600" aria-hidden>
                      →
                    </span>
                  ) : null}
                </span>
              ))}
            </div>
            <div className="mt-3 space-y-1.5 text-[11px] leading-relaxed text-slate-400">
              <div>
                <span className="font-medium text-slate-500">Current state: </span>
                {buyer.statePresentation.currentStateLabel}
              </div>
              <div>
                <span className="font-medium text-slate-500">Escalation posture: </span>
                {buyer.statePresentation.escalationPosture}
              </div>
              <div>
                <span className="font-medium text-slate-500">Why this state: </span>
                {buyer.statePresentation.whyThisState}
              </div>
              <div>
                <span className="font-medium text-slate-500">What would move it forward: </span>
                {buyer.statePresentation.whatWouldMoveForward}
              </div>
              {stateShift ? (
                <p className="text-slate-300">
                  <span className="font-medium text-slate-500">State shift: </span>
                  {stateShift}
                </p>
              ) : null}
              {replayTransitionWhy && step > 0 ? (
                <p className="text-slate-400">
                  <span className="font-medium text-slate-500">What changed: </span>
                  {replayTransitionWhy}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-4 border-t border-slate-800/80 pt-4">
            <div className="text-[11px] font-medium text-slate-500">Scenario steps</div>
            <div className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-2 text-xs text-slate-400">
              {selected.progressionLabels.map((lbl, i) => (
                <span key={`${lbl}-${i}`} className="inline-flex items-center gap-2">
                  <span
                    className={
                      i === step
                        ? "rounded-md bg-slate-800 px-2 py-0.5 font-medium text-slate-100"
                        : "rounded-md px-2 py-0.5"
                    }
                  >
                    {lbl}
                  </span>
                  {i < selected.progressionLabels.length - 1 ? (
                    <span className="text-slate-600" aria-hidden>
                      →
                    </span>
                  ) : null}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-2 border-t border-slate-800/80 pt-4 text-xs leading-relaxed text-slate-300">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Preset replay only — not your live session
            </p>
            <p className="text-slate-400">{buyer.commercialRead}</p>
            <p>
              <span className="text-slate-500">Judgment: </span>
              {buyer.recommended.show}
              {buyer.hasPrimaryExperience ? (
                <>
                  {" "}
                  · <span className="text-slate-500">Surface: </span>
                  {buyer.recommended.surface}
                  {" "}
                  · <span className="text-slate-500">Timing: </span>
                  {buyer.recommended.timing}
                </>
              ) : null}
            </p>
            {decisionShift ? <p className="text-slate-200">{decisionShift}</p> : null}
            {buyer.whatChanged && !decisionShift ? <p className="text-slate-400">{buyer.whatChanged}</p> : null}
          </div>

          {buyer.withheld.length > 0 ? (
            <div className="mt-3 rounded-md border border-slate-800 bg-slate-900/30 px-3 py-2 text-[11px] text-slate-400">
              <div className="mb-1 font-medium text-slate-500">Why stronger escalation was withheld</div>
              <ul className="list-inside list-disc space-y-0.5">
                {buyer.withheld.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** Exported for tests — all strings the scenario panel would show buyers. */
export function joinScenarioPanelBuyerTextForTests(args: {
  buyer: ReturnType<typeof buildBuyerInspectorView>;
  stateShift: string | null;
  replayTransitionWhy: string | null;
  decisionShift: string | null;
  ladderLabels: readonly string[];
  stepLabels: readonly string[];
}): string {
  return [
    joinBuyerInspectorNarrativeForTests(args.buyer),
    args.buyer.commercialRead,
    args.buyer.recommended.show,
    args.buyer.recommended.surface,
    args.buyer.recommended.timing,
    args.stateShift ?? "",
    args.replayTransitionWhy ?? "",
    args.decisionShift ?? "",
    ...args.ladderLabels,
    ...args.stepLabels,
  ].join("\n");
}
