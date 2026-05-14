import { CodeBlock, CopyLine } from "../components/CodeBlock";

export function IntegrationsPage() {
  return (
    <div className="space-y-12">
      <div>
        <h1 className="mb-3 text-3xl font-semibold tracking-tight text-slate-900">Integrations</h1>
        <p className="max-w-2xl text-slate-600">
          These examples assume the snippet is installed and <code className="rounded bg-slate-100 px-1">SessionIntel</code>{" "}
          is available on <code className="rounded bg-slate-100 px-1">window</code>. Adjust namespacing to match your
          tag architecture.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Google Tag Manager / dataLayer</h2>
        <CopyLine code="window.SessionIntel.pushPersonalizationSignalToDataLayer()" />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Adobe Client Data Layer</h2>
        <CopyLine code="window.SessionIntel.pushPersonalizationSignalToAdobeDataLayer()" />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Adobe Alloy / Web SDK</h2>
        <p className="mb-4 text-sm text-slate-600">
          Read the signal object, then pass the fields you need into <code className="rounded bg-slate-100 px-1">sendEvent</code>{" "}
          (or your wrapper). Exact event type and XDM shape are your Adobe contract.
        </p>
        <CodeBlock
          label="Example pattern"
          code={`const signal = window.SessionIntel.getPersonalizationSignal();
alloy("sendEvent", {
  xdm: {
    eventType: "optiview.signal",
    _optiview: { signal },
  },
});`}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Optimizely</h2>
        <CopyLine code="window.SessionIntel.pushPersonalizationSignalToOptimizely()" />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Push to all supported sinks</h2>
        <CopyLine code="window.SessionIntel.pushPersonalizationSignalAll()" />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Generic DOM event</h2>
        <CodeBlock
          label="Listen for updates"
          code={`window.addEventListener("si:personalization-signal", (ev) => {
  const detail = ev.detail;
  // route detail into your CMS or custom tag
});`}
        />
      </section>
    </div>
  );
}
