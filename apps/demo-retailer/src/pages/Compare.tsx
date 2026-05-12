import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSiPage } from "../hooks/useSiPage";
import type { Vehicle } from "../data/vehicles";
import { VEHICLES } from "../data/vehicles";

export default function ComparePage() {
  useSiPage("compare");
  const [selected, setSelected] = useState<string[]>([VEHICLES[0].id, VEHICLES[1].id]);

  const rows = useMemo(
    () => VEHICLES.filter((v) => selected.includes(v.id)),
    [selected],
  );

  const specs: Array<{ label: string; render: (v: Vehicle) => string }> = [
    { label: "Price", render: (v) => `$${v.price.toLocaleString()}` },
    { label: "MPG", render: (v) => v.mpg },
    { label: "Category", render: (v) => v.category },
  ];

  function toggle(id: string) {
    setSelected((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= 3) return [...cur.slice(1), id];
      return [...cur, id];
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Compare vehicles</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Selecting rows fires compare interactions. The table is tagged for DOM pattern detection.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6" data-si-compare>
        <div className="text-sm font-semibold text-white">Pick up to 3 vehicles</div>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {VEHICLES.map((v) => {
            const on = selected.includes(v.id);
            return (
              <button
                key={v.id}
                type="button"
                data-si-compare-item
                onClick={() => toggle(v.id)}
                className={[
                  "flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm",
                  on ? "border-indigo-500/60 bg-indigo-500/10 text-white" : "border-slate-800 bg-slate-950 text-slate-200",
                ].join(" ")}
              >
                <span className="font-semibold">{v.name}</span>
                <span className="text-xs text-slate-400">{on ? "Selected" : "Tap"}</span>
              </button>
            );
          })}
        </div>

        <div className="compare-table mt-8 overflow-x-auto">
          <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="border-b border-slate-800 py-3 pr-4">Feature</th>
                {rows.map((v) => (
                  <th key={v.id} className="border-b border-slate-800 px-4 py-3 font-semibold text-white">
                    {v.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {specs.map((spec) => (
                <tr key={spec.label} className="border-b border-slate-900">
                  <td className="py-3 pr-4 text-slate-400">{spec.label}</td>
                  {rows.map((v) => (
                    <td key={v.id} className="px-4 py-3">
                      {spec.render(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link data-si-cta="primary" className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white" to="/test-drive">
            Book a test drive
          </Link>
          <Link data-si-cta="finance" className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-white" to="/finance">
            See payments for picks
          </Link>
        </div>
      </div>
    </div>
  );
}
