import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import JourneyProgressPath from "../components/JourneyProgressPath";
import JourneyStepCards from "../components/JourneyStepCards";
import LiveOptiviewReading from "../components/LiveOptiviewReading";
import ScenarioPresetsPanel from "../components/ScenarioPresetsPanel";
import { openInspector, resetDemoSession } from "../demo/demoActions";
import { RECOMMENDED_EXPERIENCES } from "../demo/surfacePreview";

const btnPrimary =
  "rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400";
const btnSecondary =
  "rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-600";

export default function LiveDemoHub() {
  const navigate = useNavigate();
  const replayOpen = useMemo(() => new URLSearchParams(window.location.search).get("si_debug") === "1", []);

  function startJourney() {
    resetDemoSession();
    navigate("/compare");
  }

  function resetSession() {
    resetDemoSession();
    navigate("/");
  }

  return (
    <div className="space-y-14">
      <section className="space-y-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400">Optiview live decision demo</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          See when escalation is actually earned
        </h1>
        <p className="max-w-2xl text-base text-slate-300">
          Optiview understands when interest is deepening, when reassurance is needed, and when a stronger human
          escalation should appear — or stay withheld. This session is anonymous and first-party; judgment is the
          product.
        </p>
        <div className="flex flex-wrap gap-3">
          <button type="button" className={btnPrimary} onClick={startJourney}>
            Start demo journey
          </button>
          <button type="button" className={btnSecondary} onClick={() => openInspector()}>
            Open inspector
          </button>
          <button type="button" className={btnSecondary} onClick={resetSession}>
            Reset session
          </button>
        </div>
        <p className="text-xs text-slate-500">Buyer view is on by default in the inspector.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">How this demo works</h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {[
            "Walk the journey — each click updates what Optiview infers about the visit.",
            "Watch the live read change as comparison, financing, and scheduling deepen.",
            "Open the inspector after submit to connect the form step to runtime judgment.",
          ].map((text, i) => (
            <li key={text} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-300">
              <span className="font-semibold text-indigo-300">{i + 1}. </span>
              {text}
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Live journey</h2>
        <p className="text-sm text-slate-400">
          Shortest arc: compare → review financing → book a test drive → submit. Inventory is optional.
        </p>
        <JourneyProgressPath />
        <JourneyStepCards />
      </section>

      <LiveOptiviewReading />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Recommended experiences</h2>
        <p className="text-sm text-slate-400">
          What Optiview may recommend on a real site — and why it can intentionally hold back.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {RECOMMENDED_EXPERIENCES.map((s) => (
            <article
              key={s.surfaceId}
              className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
              data-si-surface={s.surfaceId}
            >
              <h3 className="text-sm font-semibold text-white">{s.name}</h3>
              <dl className="mt-3 space-y-3 text-xs">
                <div>
                  <dt className="font-medium text-slate-500">Why it appears</dt>
                  <dd className="mt-0.5 text-slate-300">{s.whyItAppears}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">When it appears</dt>
                  <dd className="mt-0.5 text-slate-300">{s.whenItAppears}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Why it may be withheld</dt>
                  <dd className="mt-0.5 text-slate-300">{s.whyWithheld}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section>
        <details className="group rounded-xl border border-slate-800 bg-slate-950/50" open={replayOpen}>
          <summary className="cursor-pointer list-none px-4 py-4 text-sm font-semibold text-slate-200 marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="text-slate-500 group-open:hidden">▸ </span>
            <span className="hidden text-slate-500 group-open:inline">▾ </span>
            Replay preset journeys
          </summary>
          <p className="border-t border-slate-800 px-4 pb-2 pt-3 text-xs text-slate-500">
            Internal replay tooling — deterministic journeys for QA and sales. Not the live click path above.
          </p>
          <ScenarioPresetsPanel embedded />
        </details>
      </section>
    </div>
  );
}
