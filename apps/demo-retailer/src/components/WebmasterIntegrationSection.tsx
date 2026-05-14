import { useCallback, useState } from "react";

const SNIPPET_HTML = '<script async src="https://optiview.ai/si.js"></script>';

function envUrl(name: string, fallback: string): string {
  const v = import.meta.env[name as keyof ImportMetaEnv] as string | undefined;
  return typeof v === "string" && v.trim() ? v.trim().replace(/\/$/, "") : fallback;
}

export default function WebmasterIntegrationSection() {
  const [copied, setCopied] = useState(false);
  const liveDemoUrl = envUrl("VITE_SI_LIVE_DEMO_URL", "https://optiview.ai");
  const dashboardUrl = envUrl("VITE_SI_DASHBOARD_URL", "https://si-session-dashboard.pages.dev");

  const copySnippet = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(SNIPPET_HTML);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <section className="mx-auto max-w-6xl border-t border-slate-800 px-4 py-10">
      <h2 className="text-base font-semibold tracking-wide text-white">For webmasters / integration docs</h2>
      <p className="mt-2 max-w-3xl text-sm text-slate-400">
        Anonymous session signals, field dictionary, and hosted snippet — for CMOs, growth, and implementers.
      </p>

      <ul className="mt-4 list-inside list-disc space-y-1.5 text-sm text-slate-300 marker:text-slate-500">
        <li>
          <a className="text-indigo-300 underline decoration-indigo-500/40 underline-offset-2 hover:text-indigo-200" href="/integration/session-intelligence-data-dictionary.md" target="_blank" rel="noreferrer">
            Integration data dictionary
          </a>{" "}
          <span className="text-slate-500">(signal fields &amp; push targets)</span>
        </li>
        <li>
          <a className="text-indigo-300 underline decoration-indigo-500/40 underline-offset-2 hover:text-indigo-200" href="/integration/session-intelligence-webmaster-demo-guide.md" target="_blank" rel="noreferrer">
            Webmaster demo guide
          </a>
        </li>
        <li>
          <a className="text-indigo-300 underline decoration-indigo-500/40 underline-offset-2 hover:text-indigo-200" href="/integration/SNIPPET_HOSTING.md" target="_blank" rel="noreferrer">
            Snippet hosting
          </a>{" "}
          <span className="text-slate-500">(CSP, inspector, health checks)</span>
        </li>
        <li>
          <a
            className="text-indigo-300 underline decoration-indigo-500/40 underline-offset-2 hover:text-indigo-200"
            href={liveDemoUrl}
            target="_blank"
            rel="noreferrer"
          >
            Live demo site
          </a>
          <span className="text-slate-500"> — Velocity retailer demo</span>
        </li>
        <li>
          <a
            className="text-indigo-300 underline decoration-indigo-500/40 underline-offset-2 hover:text-indigo-200"
            href={dashboardUrl}
            target="_blank"
            rel="noreferrer"
          >
            Analytics dashboard
          </a>
          <span className="text-slate-500"> — session metrics</span>
        </li>
      </ul>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Install tag (copy)</div>
          <button
            type="button"
            onClick={() => void copySnippet()}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow shadow-indigo-900/40 transition hover:bg-indigo-500"
          >
            {copied ? "Copied" : "Copy HTML"}
          </button>
        </div>
        <pre className="mt-3 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/80 p-4 font-mono text-[13px] leading-relaxed text-emerald-200/95">
          {SNIPPET_HTML}
        </pre>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Demo path</div>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-300">
          <li>See it work live on the demo site.</li>
          <li>Open the inspector (SI button or Ctrl+Shift+Backtick / ⌘+Shift+Backtick).</li>
          <li>View the personalization signal in the panel.</li>
          <li>Push to dataLayer / Adobe / Optimizely (see webmaster guide).</li>
          <li>Read the field dictionary for exact keys.</li>
          <li>Install the tag on your site (snippet above).</li>
        </ol>
      </div>
    </section>
  );
}
