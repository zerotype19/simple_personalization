import { Link } from "react-router-dom";
import { CodeBlock, CopyLine } from "../components/CodeBlock";
import { DEMO_URL } from "../config/publicUrls";

export function DemoPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="mb-3 text-3xl font-semibold tracking-tight text-slate-900">Live demo</h1>
        <p className="max-w-2xl text-slate-600">
          See Optiview&apos;s <strong>anonymous experience decision runtime</strong> on a controlled auto-retail journey —
          compare, financing, test drive, and restraint after high intent.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Open the hosted demo</h2>
        <p className="mb-4 text-sm text-slate-600">
          Walk the core path at{" "}
          <strong>demo.optiview.ai</strong>: compare two vehicles → review financing → book a test drive → submit the
          scheduling form. The demo strip shows <strong>scripted path progress</strong>; the inspector shows{" "}
          <strong>runtime judgment</strong> (they are not the same ladder).
        </p>
        <a
          href={DEMO_URL}
          className="inline-flex rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-600"
          rel="noreferrer"
        >
          See live demo
        </a>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Buyer judgment panel</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-600">
          <li>Click the <strong>SI</strong> control (bottom-left) or press <strong>Ctrl+Shift+`</strong> (backtick).</li>
          <li>Stay on <strong>Buyer view</strong> for stakeholder-friendly copy.</li>
          <li>
            Read <strong>Current commercial read</strong>, <strong>Runtime experience depth</strong>,{" "}
            <strong>Recommended next experience</strong>, and <strong>Why stronger escalation was withheld</strong>.
          </li>
          <li>After test-drive submit, confirm restraint: high intent ≠ automatic extra interruption.</li>
        </ol>
      </div>

      <div>
        <h2 className="mb-3 font-semibold text-slate-900">Console verification (on pages with the snippet)</h2>
        <div className="space-y-3">
          <CopyLine code="typeof window.SessionIntel === 'object'" />
          <CopyLine code="typeof window.SessionIntel.getExperienceDecisionEnvelope === 'function'" />
          <CopyLine code="window.SessionIntel.getExperienceDecisionEnvelope()" />
        </div>
      </div>

      <CodeBlock
        label="Subscribe to one surface"
        code={`window.SessionIntel.subscribeToDecision("finance_payment_assist", () => {
  const decision = window.SessionIntel.getExperienceDecision("finance_payment_assist");
  // gate rendering on decision?.action === "show"
});`}
      />

      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="mb-4 text-slate-600">Ready for your own snippet key and dashboard access?</p>
        <Link
          to="/signup"
          className="inline-flex rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-600"
        >
          Get free access
        </Link>
      </div>
    </div>
  );
}
