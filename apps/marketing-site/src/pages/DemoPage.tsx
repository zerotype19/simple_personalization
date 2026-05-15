import { Link } from "react-router-dom";
import { CodeBlock, CopyLine } from "../components/CodeBlock";
import { DEMO_URL } from "../config/publicUrls";

export function DemoPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="mb-3 text-3xl font-semibold tracking-tight text-slate-900">Live demo</h1>
        <p className="max-w-2xl text-slate-600">
          The demo runs on a separate host so you can see Optiview&apos;s <strong>anonymous experience decisions</strong> on a
          realistic retail-style site before you request access for your own domain.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Open the hosted demo</h2>
        <p className="mb-4 text-sm text-slate-600">
          Use the demo site to watch <strong>experience decisions</strong> and payloads update as you navigate. When the
          snippet inspector is enabled, use the on-page controls to inspect payloads without leaving the session.
        </p>
        <a
          href={DEMO_URL}
          className="inline-flex rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-600"
          rel="noreferrer"
        >
          Open demo site
        </a>
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6">
        <h2 className="mb-2 font-semibold text-slate-900">Inspector (placeholder)</h2>
        <p className="text-sm text-slate-600">
          Screenshot walkthroughs can be added here. For now, follow the on-demo instructions: open the Optiview
          inspector from the demo chrome, then review activation, personalization, and experience decision payloads for
          the current page.
        </p>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-slate-900">Console API (on pages with the snippet)</h2>
        <div className="space-y-3">
          <CopyLine code="window.SessionIntel.getExperienceDecisionEnvelope()" />
          <CopyLine code="window.SessionIntel.getPersonalizationSignal()" />
          <CopyLine code="window.SessionIntel.getActivationPayload()" />
          <CopyLine code="window.SessionIntel.pushPersonalizationSignalAll()" />
        </div>
      </div>

      <CodeBlock
        label="Example: read experience envelope in console"
        code={`// After the snippet loads:
const envelope = window.SessionIntel.getExperienceDecisionEnvelope();
console.log(envelope);`}
      />

      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="mb-4 text-slate-600">When you are ready for your own snippet key and dashboard access:</p>
        <Link
          to="/signup"
          className="inline-flex rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-600"
        >
          Get your free snippet key
        </Link>
      </div>
    </div>
  );
}
