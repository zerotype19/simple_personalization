import { Link, useLocation } from "react-router-dom";
import { CORE_JOURNEY_STEPS, LIVE_JOURNEY_STEPS, stepMatchesPath, type JourneyStep } from "../demo/journeyConfig";

function cardClass(active: boolean): string {
  return [
    "block rounded-xl border p-4 text-left transition",
    active
      ? "border-indigo-500/60 bg-indigo-950/40 ring-1 ring-indigo-500/40"
      : "border-slate-800 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-900/70",
  ].join(" ");
}

function StepCard({ step, pathname }: { step: JourneyStep; pathname: string }) {
  const active = stepMatchesPath(step, pathname);
  const to = step.id === "submit" ? "/test-drive" : step.path;
  return (
    <Link to={to} className={cardClass(active)}>
      <div className="text-sm font-semibold text-white">{step.title}</div>
      <p className="mt-2 text-xs text-slate-400">{step.action}</p>
    </Link>
  );
}

export default function JourneyStepCards() {
  const { pathname } = useLocation();
  const optional = LIVE_JOURNEY_STEPS.filter((s) => !s.corePath);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CORE_JOURNEY_STEPS.map((step) => (
          <StepCard key={step.id} step={step} pathname={pathname} />
        ))}
      </div>
      {optional.length > 0 ? (
        <div className="border-t border-slate-800/80 pt-4">
          <p className="mb-2 text-xs text-slate-500">Optional</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {optional.map((step) => (
              <StepCard key={step.id} step={step} pathname={pathname} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
