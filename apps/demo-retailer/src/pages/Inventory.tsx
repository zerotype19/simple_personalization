import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSiPage } from "../hooks/useSiPage";
import type { VehicleCategory } from "../data/vehicles";
import { VEHICLES } from "../data/vehicles";

const FILTERS: { id: VehicleCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "suv", label: "SUV" },
  { id: "truck", label: "Truck" },
  { id: "sedan", label: "Sedan" },
  { id: "hybrid", label: "Hybrid" },
  { id: "luxury", label: "Luxury" },
];

export default function InventoryPage() {
  useSiPage("inventory");
  const [cat, setCat] = useState<(typeof FILTERS)[number]["id"]>("all");

  const rows = useMemo(() => {
    if (cat === "all") return VEHICLES;
    return VEHICLES.filter((v) => v.category === cat);
  }, [cat]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Inventory</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          This grid is tagged for automatic understanding. Click pricing blocks to signal payment sensitivity.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setCat(f.id)}
            className={[
              "rounded-full border px-4 py-2 text-sm",
              cat === f.id
                ? "border-indigo-500/60 bg-indigo-500/15 text-white"
                : "border-slate-800 bg-slate-950/40 text-slate-200 hover:border-slate-700",
            ].join(" ")}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2" data-si-inventory data-si-surface="inventory_assist_module">
        {rows.map((v) => (
          <div key={v.id} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">{v.name}</div>
                <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">{v.category}</div>
              </div>
              <Link
                data-si-cta="primary"
                className="rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-400"
                to={`/vehicle/${v.id}`}
              >
                View details
              </Link>
            </div>
            <div className="mt-4 flex items-end justify-between gap-3">
              <div>
                <div className="text-xs text-slate-400">Starting at</div>
                <button
                  type="button"
                  data-si-price
                  className="mt-1 text-left text-2xl font-semibold tracking-tight text-white hover:text-indigo-200"
                >
                  ${v.price.toLocaleString()}
                </button>
              </div>
              <div className="text-right text-xs text-slate-400">{v.mpg}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
