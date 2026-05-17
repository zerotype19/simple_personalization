import type { JourneyStep } from "../demo/journeyConfig";

export default function RestraintCallout({ step }: { step: JourneyStep | null }) {
  if (!step?.restraintNote) return null;

  return (
    <aside className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4">
      <h3 className="text-sm font-semibold text-amber-100">Why no stronger interruption appeared yet</h3>
      <p className="mt-2 text-sm leading-relaxed text-amber-50/90">{step.restraintNote}</p>
      <p className="mt-3 text-xs text-amber-200/70">
        Most tools push harder here. Optiview intentionally holds back until escalation is earned.
      </p>
    </aside>
  );
}
