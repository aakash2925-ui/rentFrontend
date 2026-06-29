"use client";

import { SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function PropertyFilterSidebar({ filters, setFilters, applyFilters, clearFilters }) {
  const [itemTypes, setItemTypes] = useState([]);
  const update = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    api.get("/item-types")
      .then(({ data }) => setItemTypes(data.itemTypes))
      .catch(() => setItemTypes([]));
  }, []);

  return (
    <aside className="rounded-lg border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide"><SlidersHorizontal className="h-4 w-4" /> Filters</h2>
      <div className="mt-4 space-y-3">
        <input className="field" placeholder="Pincode" value={filters.city || ""} onChange={(e) => update("city", e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <input className="field" type="number" placeholder="Min daily rent" value={filters.minRent || ""} onChange={(e) => update("minRent", e.target.value)} />
          <input className="field" type="number" placeholder="Max daily rent" value={filters.maxRent || ""} onChange={(e) => update("maxRent", e.target.value)} />
        </div>
        <div className="rounded-2xl border border-violet-100 bg-mist/70 p-3 dark:border-violet-900/70 dark:bg-white/10">
          <p className="text-xs font-black uppercase tracking-wide text-meadow">Check date availability</p>
          <div className="mt-3 grid gap-2">
            <label className="space-y-1">
              <span className="text-xs font-black text-violet-950 dark:text-white">Start date</span>
              <input className="field" type="date" value={filters.startDate || ""} onChange={(e) => update("startDate", e.target.value)} />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-black text-violet-950 dark:text-white">End date</span>
              <input className="field" type="date" min={filters.startDate || ""} value={filters.endDate || ""} onChange={(e) => update("endDate", e.target.value)} />
            </label>
          </div>
        </div>
        <select className="field" value={filters.type || ""} onChange={(e) => update("type", e.target.value)}>
          <option value="">Item type</option>
          {itemTypes.map((type) => <option key={type._id} value={type.name}>{type.name}</option>)}
        </select>
        <select className="field" value={filters.sort || "newest"} onChange={(e) => update("sort", e.target.value)}>
          <option value="newest">Newest</option>
          <option value="rent-low">Rent: Low to high</option>
          <option value="rent-high">Rent: High to low</option>
        </select>
        <div className="grid gap-2">
          <button className="btn-primary w-full" onClick={applyFilters}>Apply filters</button>
          <button className="btn-secondary w-full" type="button" onClick={clearFilters}>Clear filters</button>
        </div>
      </div>
    </aside>
  );
}
