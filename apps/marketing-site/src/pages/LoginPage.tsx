import { DASHBOARD_URL } from "../config/publicUrls";

export function LoginPage() {
  return (
    <div className="mx-auto max-w-lg space-y-6 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard login</h1>
      <p className="text-slate-600">
        Dashboard access is protected by secure login. Your organization uses Cloudflare Access to authenticate
        authorized users; there is no separate Optiview password screen in this flow.
      </p>
      <a
        href={DASHBOARD_URL}
        className="inline-flex rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-600"
        rel="noreferrer"
      >
        Open dashboard
      </a>
    </div>
  );
}
