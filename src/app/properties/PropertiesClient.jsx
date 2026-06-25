"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import Loading from "@/components/common/Loading";
import ErrorMessage from "@/components/common/ErrorMessage";
import PropertyFilterSidebar from "@/components/properties/PropertyFilterSidebar";
import PropertyGrid from "@/components/properties/PropertyGrid";
import { PropertyGridSkeleton } from "@/components/common/Skeleton";

export default function PropertiesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState(Object.fromEntries(searchParams.entries()));
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    api.get(`/properties?${searchParams.toString()}`)
      .then(({ data }) => setProperties(data.properties))
      .catch(() => setError("Unable to load rental items"))
      .finally(() => setLoading(false));
  }, [searchParams]);

  const applyFilters = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
    router.push(`/items?${params.toString()}`);
  };

  const clearFilters = () => {
    setFilters({});
    router.push("/items");
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[280px_1fr]">
      <PropertyFilterSidebar filters={filters} setFilters={setFilters} applyFilters={applyFilters} clearFilters={clearFilters} />
      <section>
        <div className="mb-5">
          <h1 className="text-3xl font-black">Rental items</h1>
          <p className="mt-1 text-sm text-stone-500">{properties.length} results found</p>
        </div>
        {loading ? <PropertyGridSkeleton /> : error ? <ErrorMessage message={error} /> : <PropertyGrid properties={properties} />}
      </section>
    </div>
  );
}
