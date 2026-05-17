import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSiPage } from "../hooks/useSiPage";
import { VEHICLES } from "../data/vehicles";

export default function ComparePage() {
  useSiPage("compare");
  const [selected, setSelected] = useState<string[]>([VEHICLES[0].id, VEHICLES[1].id]);

  const rows = useMemo(() => VEHICLES.filter((v) => selected.includes(v.id)), [selected]);

  function toggle(id: string) {
    setSelected((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= 2) return [...cur.slice(1), id];
      return [...cur, id];
    });
  }

  return (
    <div className="space-y-6" data-si-surface="card_comparison_module">
      <div>
        <h1 className="text-xl font-semibold text-white">Compare vehicles</h1>
        <p className="mt-1 text-sm text-slate-400">Select models — Optiview tracks comparison depth as you narrow options.</p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4" data-si-compare>
        <div className="grid gap-2">
          {VEHICLES.slice(0, 4).map((v) => {
            const on = selected.includes(v.id);
            return (
              <button
                key={v.id}
                type="button"
                data-si-compare-item
                data-si-intent="compare"
                onClick={() => toggle(v.id)}
                className={[
                  "rounded-lg border px-3 py-2 text-left text-sm",
                  on ? "border-indigo-500/50 bg-indigo-950/30 text-white" : "border-slate-800 text-slate-300",
                ].join(" ")}
              >
                {v.name} · ${v.price.toLocaleString()}
              </button>
            );
          })}
        </div>
        {rows.length >= 2 ? (
          <p className="mt-3 text-xs text-indigo-200/90">{rows.length} models in shortlist</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          to="/finance"
          data-si-cta="finance"
          data-si-intent="view_financing"
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
        >
          Review financing options
        </Link>
        <Link to="/inventory" className="text-sm text-slate-500 hover:text-slate-300">
          View inventory (optional)
        </Link>
      </div>
    </div>
  );
}
