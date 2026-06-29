"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, X } from "lucide-react";
import api from "@/lib/api";
import Loading from "@/components/common/Loading";
import ErrorMessage from "@/components/common/ErrorMessage";
import PropertyFilterSidebar from "@/components/properties/PropertyFilterSidebar";
import PropertyGrid from "@/components/properties/PropertyGrid";
import { PropertyGridSkeleton } from "@/components/common/Skeleton";

function toDateInputValue(date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function addDays(value, days) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}

function rentalDaysBetween(startDate, endDate) {
  if (!startDate || !endDate) return 1;
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  return Number.isFinite(days) && days > 0 ? days : 1;
}

export default function PropertiesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState(Object.fromEntries(searchParams.entries()));
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateNoticeOpen, setDateNoticeOpen] = useState(false);

  const dateRangeSelected = Boolean(searchParams.get("startDate") && searchParams.get("endDate"));
  const unavailableItems = properties.filter((item) => item.requestedDateUnavailable);

  useEffect(() => {
    setLoading(true);
    setError("");
    api.get(`/properties?${searchParams.toString()}`)
      .then(({ data }) => setProperties(data.properties))
      .catch(() => setError("Unable to load rental items"))
      .finally(() => setLoading(false));
  }, [searchParams]);

  useEffect(() => {
    setFilters(Object.fromEntries(searchParams.entries()));
  }, [searchParams]);

  useEffect(() => {
    if (!loading && dateRangeSelected && unavailableItems.length) setDateNoticeOpen(true);
  }, [dateRangeSelected, loading, unavailableItems.length]);

  const applyFilters = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
    router.push(`/items?${params.toString()}`);
  };

  const clearFilters = () => {
    setFilters({});
    router.push("/items");
  };

  const useAvailableDate = (item) => {
    if (!item.nextAvailableAfter) return;
    const nextStartDate = String(item.nextAvailableAfter).slice(0, 10);
    const duration = rentalDaysBetween(searchParams.get("startDate"), searchParams.get("endDate"));
    const nextEndDate = addDays(nextStartDate, duration);
    const nextFilters = { ...filters, startDate: nextStartDate, endDate: nextEndDate };
    setFilters(nextFilters);
    setDateNoticeOpen(false);

    const params = new URLSearchParams();
    Object.entries(nextFilters).forEach(([key, value]) => value && params.set(key, value));
    router.push(`/items?${params.toString()}`);
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[280px_1fr]">
      <PropertyFilterSidebar filters={filters} setFilters={setFilters} applyFilters={applyFilters} clearFilters={clearFilters} />
      <section>
        <div className="mb-5">
          <h1 className="text-3xl font-black">Rental items</h1>
          <p className="mt-1 text-sm text-stone-500">{properties.length} results found</p>
          {dateRangeSelected && unavailableItems.length > 0 && (
            <button className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-black text-amber-700 transition hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-200" type="button" onClick={() => setDateNoticeOpen(true)}>
              <CalendarDays className="h-4 w-4" /> {unavailableItems.length} item(s) unavailable for selected dates
            </button>
          )}
        </div>
        {loading ? <PropertyGridSkeleton /> : error ? <ErrorMessage message={error} /> : <PropertyGrid properties={properties} />}
      </section>
      {dateNoticeOpen && unavailableItems.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 py-6">
          <div className="max-h-[86vh] w-full max-w-lg overflow-y-auto rounded-[1.5rem] border border-violet-100 bg-white p-5 shadow-glow dark:border-violet-900/70 dark:bg-stone-950">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-black uppercase tracking-wide text-meadow">Date availability</p>
                <h2 className="mt-1 text-2xl font-black text-ink dark:text-white">Some items are unavailable</h2>
                <p className="mt-2 text-sm leading-6 text-violet-950/65 dark:text-violet-100/70">
                  These items are booked for your selected dates. Please select a date after the shown availability date.
                </p>
              </div>
              <button className="rounded-xl border border-violet-100 p-2 text-violet-700 transition hover:bg-violet-50 dark:border-violet-900/70 dark:text-violet-100 dark:hover:bg-white/10" type="button" onClick={() => setDateNoticeOpen(false)} aria-label="Close date notice">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-5 space-y-3">
              {unavailableItems.map((item) => (
                <div key={item._id} className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
                  <p className="font-black text-amber-800 dark:text-amber-100">{item.title}</p>
                  <p className="mt-1 text-sm font-semibold text-amber-700 dark:text-amber-200">{item.requestedDateMessage}</p>
                  {item.nextAvailableAfter && (
                    <button className="mt-3 inline-flex items-center justify-center rounded-xl bg-white px-3 py-2 text-xs font-black text-amber-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft dark:bg-white/10 dark:text-amber-100" type="button" onClick={() => useAvailableDate(item)}>
                      Use {String(item.nextAvailableAfter).slice(0, 10)} as start date
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button className="btn-primary mt-5 w-full" type="button" onClick={() => setDateNoticeOpen(false)}>Okay</button>
          </div>
        </div>
      )}
    </div>
  );
}
