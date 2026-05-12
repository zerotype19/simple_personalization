import { NavLink, Outlet } from "react-router-dom";
import SessionPersonalizationStrip from "./SessionPersonalizationStrip";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "rounded-lg px-3 py-2 text-sm transition",
    isActive ? "bg-slate-900 text-white" : "text-slate-200 hover:bg-slate-900/60",
  ].join(" ");

export default function Layout() {
  return (
    <div className="min-h-full bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <a href="/" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-500 shadow-lg shadow-indigo-500/25" />
            <div>
              <div className="text-sm font-semibold tracking-wide text-white">
                Velocity Motors
              </div>
              <div className="text-xs text-slate-400">Demo retailer for Session Intelligence</div>
            </div>
          </a>
          <nav className="hidden flex-wrap items-center gap-1 md:flex">
            <NavLink className={linkClass} to="/">
              Home
            </NavLink>
            <NavLink className={linkClass} to="/inventory">
              Inventory
            </NavLink>
            <NavLink className={linkClass} to="/finance">
              Finance
            </NavLink>
            <NavLink className={linkClass} to="/compare">
              Compare
            </NavLink>
            <NavLink className={linkClass} to="/trade-in">
              Trade-in
            </NavLink>
            <NavLink className={linkClass} to="/test-drive">
              Test drive
            </NavLink>
          </nav>
        </div>
      </header>
      <SessionPersonalizationStrip />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-800 py-10 text-center text-xs text-slate-500">
        Fictional dealership for product demo. Open the Session Intelligence inspector with{" "}
        <span className="rounded bg-slate-900 px-2 py-1 text-slate-200">Ctrl+Shift+D</span>
        <span className="text-slate-500"> / </span>
        <span className="rounded bg-slate-900 px-2 py-1 text-slate-200">⌘+Shift+D</span>
        <span className="text-slate-500"> (Mac)</span>.
      </footer>
    </div>
  );
}
