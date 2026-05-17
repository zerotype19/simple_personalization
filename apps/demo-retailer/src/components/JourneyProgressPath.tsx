import { useLocation } from "react-router-dom";
import { maxProgressionIndexForPath, PROGRESSION_LABELS } from "../demo/journeyConfig";

export default function JourneyProgressPath() {
  const { pathname } = useLocation();
  const current = maxProgressionIndexForPath(pathname);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-4">
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">Demo path progress</p>
      <p className="mb-3 text-xs leading-relaxed text-slate-500">
        This shows where you are in the scripted demo path. The inspector shows Optiview&apos;s runtime judgment.
      </p>
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2 text-sm">
        {PROGRESSION_LABELS.map((label, i) => {
          const reached = current >= i;
          const active = current === i;
          return (
            <span key={label} className="inline-flex items-center gap-2">
              <span
                className={[
                  "rounded-md px-2.5 py-1",
                  active
                    ? "bg-indigo-500/25 font-semibold text-indigo-100 ring-1 ring-indigo-500/50"
                    : reached
                      ? "bg-slate-800 text-slate-200"
                      : "text-slate-600",
                ].join(" ")}
              >
                {label}
              </span>
              {i < PROGRESSION_LABELS.length - 1 ? (
                <span className="text-slate-600" aria-hidden>
                  →
                </span>
              ) : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}
