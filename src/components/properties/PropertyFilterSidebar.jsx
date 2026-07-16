"use client";

import { SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import api from "@/lib/api";

const RENT_MIN = 0;
const RENT_MAX = 50000;
const RENT_STEP = 100;
const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

export default function PropertyFilterSidebar({ filters, setFilters, applyFilters, clearFilters }) {
  const [itemTypes, setItemTypes] = useState([]);
  const update = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const minRent = Number(filters.minRent || RENT_MIN);
  const maxRent = Number(filters.maxRent || RENT_MAX);
  const budgetLabel = filters.minRent || filters.maxRent ? `${money(minRent)} - ${money(maxRent)}` : "Any budget";

  const updateRent = (key, nextValue) => {
    const value = Math.min(RENT_MAX, Math.max(RENT_MIN, Number(nextValue)));
    setFilters((current) => {
      const currentMin = Number(current.minRent || RENT_MIN);
      const currentMax = Number(current.maxRent || RENT_MAX);
      const next = { ...current };
      if (key === "minRent") {
        const adjustedMin = Math.min(value, currentMax);
        if (adjustedMin === RENT_MIN) delete next.minRent;
        else next.minRent = String(adjustedMin);
        if (adjustedMin > currentMax) next.maxRent = String(adjustedMin);
      } else {
        const adjustedMax = Math.max(value, currentMin);
        if (adjustedMax === RENT_MAX) delete next.maxRent;
        else next.maxRent = String(adjustedMax);
        if (adjustedMax < currentMin) next.minRent = String(adjustedMax);
      }
      return next;
    });
  };

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
        <div className="rounded-2xl border border-violet-100 bg-mist/70 p-4 dark:border-violet-900/70 dark:bg-white/10">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-wide text-meadow">Rent budget</p>
            <p className="text-sm font-black text-violet-950 dark:text-violet-100">{budgetLabel}</p>
          </div>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-2 flex items-center justify-between text-xs font-bold text-violet-950/65 dark:text-violet-100/70">
                <span>Min</span>
                <span>{money(minRent)}</span>
              </span>
              <input
                className="w-full accent-violet-700"
                max={RENT_MAX}
                min={RENT_MIN}
                step={RENT_STEP}
                type="range"
                value={minRent}
                onChange={(e) => updateRent("minRent", e.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-2 flex items-center justify-between text-xs font-bold text-violet-950/65 dark:text-violet-100/70">
                <span>Max</span>
                <span>{money(maxRent)}</span>
              </span>
              <input
                className="w-full accent-violet-700"
                max={RENT_MAX}
                min={RENT_MIN}
                step={RENT_STEP}
                type="range"
                value={maxRent}
                onChange={(e) => updateRent("maxRent", e.target.value)}
              />
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
