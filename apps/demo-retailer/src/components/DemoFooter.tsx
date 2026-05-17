function envUrl(name: string, fallback: string): string {
  const v = import.meta.env[name as keyof ImportMetaEnv] as string | undefined;
  return typeof v === "string" && v.trim() ? v.trim().replace(/\/$/, "") : fallback;
}

export default function DemoFooter() {
  const marketing = envUrl("VITE_SI_LIVE_DEMO_URL", "https://optiview.ai");
  const dashboard = envUrl("VITE_SI_DASHBOARD_URL", "https://dashboard.optiview.ai");

  return (
    <footer className="border-t border-slate-800 py-8">
      <div className="mx-auto max-w-4xl px-4 text-center">
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-400">
          <a
            className="hover:text-indigo-300"
            href="/integration/session-intelligence-webmaster-demo-guide.md"
            target="_blank"
            rel="noreferrer"
          >
            Integration guide
          </a>
          <a className="hover:text-indigo-300" href={`${marketing}/install`}>
            Install
          </a>
          <a className="hover:text-indigo-300" href={`${marketing}/privacy`}>
            Privacy
          </a>
          <a className="hover:text-indigo-300" href={dashboard}>
            Dashboard
          </a>
        </nav>
        <p className="mt-4 text-[11px] text-slate-500">
          Inspector: <span className="text-slate-400">SI</span> button or{" "}
          <span className="font-mono text-slate-400">Ctrl+Shift+`</span>
        </p>
        <p className="mt-3 font-mono text-[10px] text-slate-600">
          Build: demo {__SI_DEMO_GIT_SHA__} · SDK {__SI_SDK_GIT_SHA__} · snippet {__SI_SNIPPET_GIT_SHA__}
        </p>
      </div>
    </footer>
  );
}
