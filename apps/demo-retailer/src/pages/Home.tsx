import { Link } from "react-router-dom";
import { useSiPage } from "../hooks/useSiPage";
import { VEHICLES } from "../data/vehicles";

export default function HomePage() {
  useSiPage("home");

  const featured = VEHICLES.slice(0, 3);

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-8 shadow-2xl shadow-indigo-500/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.35),_transparent_55%)]" />
        <div className="relative grid gap-8 md:grid-cols-2 md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              In-stock SUVs, trucks & hybrids
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white md:text-5xl">
              Find the right vehicle—<span className="text-indigo-300">faster</span>.
            </h1>
            <p data-si-slot="hero-sub" className="mt-4 text-base leading-relaxed text-slate-300">
              Transparent pricing, flexible financing, and a concierge team that respects your time.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                data-si-cta="primary"
                data-si-slot="hero-cta"
                className="inline-flex items-center justify-center rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:bg-indigo-400"
                to="/inventory"
              >
                Browse inventory
              </Link>
              <Link
                data-si-cta="finance"
                className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-950/40 px-5 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-900"
                to="/finance"
              >
                Estimate payments
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3 text-xs text-slate-400">
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                <div className="text-white text-sm font-semibold">Same-day</div>
                test drives
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                <div className="text-white text-sm font-semibold">No-pressure</div>
                trade appraisals
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                <div className="text-white text-sm font-semibold">Lease + finance</div>
                specials
              </div>
            </div>
          </div>

          <div className="relative rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Module ordering demo
            </div>
            <div className="mt-4 space-y-3" data-si-slot="home-modules">
              <div
                data-si-order="promo"
                className="rounded-xl border border-slate-800 bg-slate-950 p-4"
              >
                <div data-si-slot="promo-title" className="text-sm font-semibold text-white">
                  SUV spotlight
                </div>
                <div data-si-slot="promo-body" className="mt-2 text-sm text-slate-300">
                  Explore 3-row SUVs with flexible monthly payments.
                </div>
                <div className="mt-3">
                  <Link className="text-sm font-semibold text-indigo-300 hover:text-indigo-200" to="/inventory">
                    View SUVs →
                  </Link>
                </div>
              </div>
              <div
                data-si-order="finance"
                className="rounded-xl border border-slate-800 bg-slate-950 p-4"
              >
                <div className="text-sm font-semibold text-white">Financing made clear</div>
                <div className="mt-2 text-sm text-slate-300">
                  See lease vs finance side-by-side with incentives applied.
                </div>
                <div className="mt-3">
                  <Link className="text-sm font-semibold text-indigo-300 hover:text-indigo-200" to="/finance">
                    Open estimator →
                  </Link>
                </div>
              </div>
              <div
                data-si-order="trade"
                className="rounded-xl border border-slate-800 bg-slate-950 p-4"
              >
                <div className="text-sm font-semibold text-white">Trade-in estimator</div>
                <div className="mt-2 text-sm text-slate-300">
                  Get a ballpark value before you visit—no obligation.
                </div>
                <div className="mt-3">
                  <Link className="text-sm font-semibold text-indigo-300 hover:text-indigo-200" to="/trade-in">
                    Start trade-in →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Featured inventory</h2>
            <p className="mt-1 text-sm text-slate-400">Click into a VDP to generate stronger shopping signals.</p>
          </div>
          <Link className="text-sm font-semibold text-indigo-300 hover:text-indigo-200" to="/inventory">
            View all
          </Link>
        </div>

        <div
          className="mt-5 grid gap-4 md:grid-cols-3"
          data-si-inventory
        >
          {featured.map((v) => (
            <Link
              key={v.id}
              to={`/vehicle/${v.id}`}
              className="group rounded-2xl border border-slate-800 bg-slate-950/40 p-5 hover:border-indigo-500/40"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-white group-hover:text-indigo-200">{v.name}</div>
                <span className="rounded-full bg-slate-900 px-2 py-1 text-[11px] uppercase tracking-wide text-slate-300">
                  {v.category}
                </span>
              </div>
              <div data-si-price className="mt-3 text-lg font-semibold tracking-tight text-white">
                ${v.price.toLocaleString()}
              </div>
              <div className="mt-2 text-xs text-slate-400">{v.mpg}</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
