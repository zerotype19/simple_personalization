import { Link, useParams } from "react-router-dom";
import { useSiPage } from "../hooks/useSiPage";
import { getVehicle } from "../data/vehicles";

export default function VehiclePage() {
  useSiPage("vdp");
  const { id } = useParams();
  const v = id ? getVehicle(id) : undefined;

  if (!v) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-8">
        <div className="text-lg font-semibold text-white">Vehicle not found</div>
        <Link className="mt-3 inline-block text-sm font-semibold text-indigo-300" to="/inventory">
          Back to inventory
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 p-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Vehicle detail</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">{v.name}</h1>
          <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-slate-300">
            {["Gallery", "Specs", "Warranty"].map((t) => (
              <div key={t} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-white text-sm font-semibold">{t}</div>
                <div className="mt-1 text-slate-400">Demo content</div>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-sm font-semibold text-white">Highlights</div>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">
              {v.highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-xs text-slate-400">Internet price</div>
              <button type="button" data-si-price className="mt-1 text-4xl font-semibold tracking-tight text-white">
                ${v.price.toLocaleString()}
              </button>
            </div>
            <div className="text-right text-xs text-slate-400">{v.mpg}</div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              data-si-cta="primary"
              className="inline-flex items-center justify-center rounded-xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-400"
              to="/test-drive"
            >
              Schedule test drive
            </Link>
            <Link
              data-si-cta="finance"
              className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-950/40 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-900"
              to="/finance"
            >
              Explore financing
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6" data-si-finance>
          <div className="text-sm font-semibold text-white">Financing module</div>
          <p className="mt-2 text-sm text-slate-300">
            Adjust terms to simulate payment-sensitive behavior (signals finance interactions).
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-400">
              Credit score band
              <select className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white">
                <option>720+</option>
                <option>660–719</option>
                <option>620–659</option>
              </select>
            </label>
            <label className="text-xs text-slate-400">
              Term (months)
              <select className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white">
                <option>36</option>
                <option>48</option>
                <option>60</option>
                <option>72</option>
              </select>
            </label>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6">
          <div className="text-sm font-semibold text-white">Safety</div>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-300">
            {v.safety.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
