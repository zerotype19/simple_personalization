import { useState } from "react";
import { Link } from "react-router-dom";
import { useSiPage } from "../hooks/useSiPage";

export default function TradeInPage() {
  useSiPage("trade_in");
  const [mileage, setMileage] = useState(42000);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Trade-in estimator</h1>
        <p className="mt-2 text-sm text-slate-300">
          A lightweight flow to simulate appraisal interest. No PII is collected in this demo.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-8">
        <label className="block text-xs text-slate-400">
          Mileage
          <input
            className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            type="number"
            value={mileage}
            onChange={(e) => setMileage(Number(e.target.value))}
          />
        </label>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="text-sm font-semibold text-white">Instant range (demo)</div>
          <div className="mt-2 text-3xl font-semibold text-white">
            ${Math.max(5000, Math.round((42000 / mileage) * 9000)).toLocaleString()} –{" "}
            ${Math.max(8000, Math.round((42000 / mileage) * 12000)).toLocaleString()}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            This is intentionally nonsense math—only useful for generating UI signals.
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" data-si-cta="primary" className="rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white">
            Continue trade-in (demo)
          </button>
          <Link className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-white" to="/inventory">
            Browse inventory
          </Link>
        </div>
      </div>
    </div>
  );
}
