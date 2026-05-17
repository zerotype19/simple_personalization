import type { JourneyStep } from "../demo/journeyConfig";
import RestraintCallout from "./RestraintCallout";

export default function LiveExplanationPanel({ step }: { step: JourneyStep | null }) {
  if (!step) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 text-sm text-slate-400">
        Start the demo journey or pick a step below. Open the inspector to see how Optiview judges each moment.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-300/90">This step</p>
        <h3 className="mt-1 text-lg font-semibold text-white">{step.title}</h3>
        <p className="mt-2 text-sm text-slate-300">{step.action}</p>
      </div>
      <RestraintCallout step={step} />
    </div>
  );
}
