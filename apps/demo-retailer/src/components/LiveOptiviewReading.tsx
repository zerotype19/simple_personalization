import { useLocation } from "react-router-dom";
import { buildLiveReading } from "../demo/liveReading";
import { maxProgressionIndexForPath, stepForPath } from "../demo/journeyConfig";
import { useDemoProfile } from "../hooks/useDemoProfile";

export default function LiveOptiviewReading() {
  const { pathname } = useLocation();
  const profile = useDemoProfile();
  const step = stepForPath(pathname);
  const live = buildLiveReading(step ?? null, profile);
  const progressionIdx = maxProgressionIndexForPath(pathname);

  return (
    <section className="space-y-4" aria-live="polite">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">What Optiview is reading</h2>
        {progressionIdx >= 0 ? (
          <span className="text-xs text-indigo-300/90">Live · step {progressionIdx + 1} of 4</span>
        ) : (
          <span className="text-xs text-slate-500">Live</span>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <ReadingCard title="Commercial intent" label="Currently detecting" body={live.commercialIntent} active={progressionIdx >= 0} />
        <ReadingCard title="Behavioral momentum" label="Currently detecting" body={live.momentum} active={progressionIdx >= 0} />
        <ReadingCard title="Experience judgment" label="Currently detecting" body={live.judgment} active={progressionIdx >= 1} />
      </div>
    </section>
  );
}

function ReadingCard({
  title,
  label,
  body,
  active,
}: {
  title: string;
  label: string;
  body: string;
  active: boolean;
}) {
  return (
    <article
      className={[
        "rounded-xl border p-4 transition",
        active ? "border-indigo-500/40 bg-indigo-950/25" : "border-slate-800 bg-slate-900/40",
      ].join(" ")}
    >
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-200">{body}</p>
    </article>
  );
}
