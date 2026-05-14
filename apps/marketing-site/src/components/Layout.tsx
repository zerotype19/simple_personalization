import { Link, NavLink, Outlet } from "react-router-dom";
import { DASHBOARD_URL } from "../config/publicUrls";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-medium ${isActive ? "text-accent" : "text-slate-600 hover:text-slate-900"}`;

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="text-lg font-semibold tracking-tight text-slate-900">
            Optiview
          </Link>
          <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <a href="/#how-it-works" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Product
            </a>
            <NavLink to="/demo" className={navClass}>
              Demo
            </NavLink>
            <NavLink to="/install" className={navClass}>
              Install
            </NavLink>
            <NavLink to="/integrations" className={navClass}>
              Integrations
            </NavLink>
            <NavLink to="/privacy" className={navClass}>
              Privacy
            </NavLink>
            <NavLink to="/login" className={navClass}>
              Login
            </NavLink>
            <Link
              to="/signup"
              className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-indigo-600"
            >
              Get free access
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap gap-x-6 gap-y-2 px-4 py-8 text-sm text-slate-600">
          <span className="font-medium text-slate-800">Optiview</span>
          <Link to="/privacy" className="hover:text-slate-900">
            Privacy
          </Link>
          <Link to="/install" className="hover:text-slate-900">
            Install
          </Link>
          <Link to="/demo" className="hover:text-slate-900">
            Demo
          </Link>
          <a href={DASHBOARD_URL} className="hover:text-slate-900" rel="noreferrer">
            Dashboard
          </a>
          <span className="text-slate-400">Contact: hello@optiview.ai</span>
        </div>
      </footer>
    </div>
  );
}
