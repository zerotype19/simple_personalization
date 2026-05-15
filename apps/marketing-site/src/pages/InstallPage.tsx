import { Link } from "react-router-dom";
import { CodeBlock, CopyLine } from "../components/CodeBlock";
import { CDN_URL } from "../config/publicUrls";

export function InstallPage() {
  const script = `<script async src="${CDN_URL}/si.js" data-si-key="YOUR_SNIPPET_KEY"></script>`;
  const scriptDebug = `<script async src="${CDN_URL}/si.js" data-si-key="YOUR_SNIPPET_KEY" data-si-debug="true"></script>`;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="mb-3 text-3xl font-semibold tracking-tight text-slate-900">Install</h1>
        <p className="text-slate-600">
          Add one script tag, verify in the console, then push experience decisions (or the personalization signal) to your
          tools.
        </p>
      </div>

      <ol className="space-y-8">
        <li className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <span className="text-sm font-semibold text-accent">1</span>
          <h2 className="mt-1 font-semibold text-slate-900">Add the script tag</h2>
          <p className="mt-2 text-sm text-slate-600">Place before closing body on pages you want to instrument.</p>
          <div className="mt-4">
            <CodeBlock label="HTML" code={script} />
          </div>
        </li>
        <li className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <span className="text-sm font-semibold text-accent">2</span>
          <h2 className="mt-1 font-semibold text-slate-900">Verify in the browser console</h2>
          <p className="mt-2 text-sm text-slate-600">After load, the global exposes helpers for inspection.</p>
          <div className="mt-4 space-y-3">
            <CopyLine code="window.SessionIntel.getPersonalizationSignal()" />
            <CopyLine code="window.SessionIntel.getActivationPayload()" />
            <CopyLine code="window.SessionIntel.pushPersonalizationSignalAll()" />
          </div>
        </li>
        <li className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <span className="text-sm font-semibold text-accent">3</span>
          <h2 className="mt-1 font-semibold text-slate-900">Open the inspector</h2>
          <p className="mt-2 text-sm text-slate-600">
            When enabled for your build, use the in-page inspector to review payloads without digging through minified
            bundles.
          </p>
        </li>
        <li className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <span className="text-sm font-semibold text-accent">4</span>
          <h2 className="mt-1 font-semibold text-slate-900">Confirm payload shape</h2>
          <p className="mt-2 text-sm text-slate-600">
            Align fields with your tag plan: Adobe, Optimizely, GTM, or a custom CMS slot.
          </p>
        </li>
        <li className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <span className="text-sm font-semibold text-accent">5</span>
          <h2 className="mt-1 font-semibold text-slate-900">Push to tools</h2>
          <p className="mt-2 text-sm text-slate-600">
            See <Link to="/integrations">Integrations</Link> for one-line helpers and event patterns.
          </p>
        </li>
      </ol>

      <div>
        <h2 className="mb-2 font-semibold text-slate-900">Optional debug attribute</h2>
        <p className="mb-4 text-sm text-slate-600">Use only in non-production or short-lived debugging windows.</p>
        <CodeBlock label="HTML (debug)" code={scriptDebug} />
      </div>
    </div>
  );
}
