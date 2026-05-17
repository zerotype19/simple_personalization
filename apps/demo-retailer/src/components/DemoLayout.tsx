import { Link, Outlet, useLocation } from "react-router-dom";
import DemoFooter from "./DemoFooter";
import JourneyProgressPath from "./JourneyProgressPath";
import LiveExplanationPanel from "./LiveExplanationPanel";
import LiveOptiviewReading from "./LiveOptiviewReading";
import { stepForPath } from "../demo/journeyConfig";

export default function DemoLayout() {
  const { pathname } = useLocation();
  const onHub = pathname === "/";
  const activeStep = stepForPath(pathname);
  const onJourney = !onHub;

  return (
    <div className="min-h-full bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/90">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-500" aria-hidden />
            <span className="text-sm font-semibold text-white">Optiview</span>
            <span className="hidden text-xs text-slate-500 sm:inline">Live decision demo</span>
          </Link>
          {!onHub ? (
            <Link to="/" className="text-xs text-indigo-300 hover:text-indigo-200">
              ← Back to demo
            </Link>
          ) : null}
        </div>
      </header>

      {onJourney ? (
        <div className="border-b border-slate-800 bg-slate-900/30">
          <div className="mx-auto max-w-4xl space-y-4 px-4 py-4">
            <JourneyProgressPath />
            {activeStep ? <LiveExplanationPanel step={activeStep} /> : null}
            <LiveOptiviewReading />
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-4xl px-4 py-8">
        <Outlet />
      </main>

      <DemoFooter />
    </div>
  );
}
