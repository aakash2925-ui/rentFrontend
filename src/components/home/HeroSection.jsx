"use client";

import { useRouter } from "next/navigation";
import SearchBar from "@/components/properties/SearchBar";

export default function HeroSection() {
  const router = useRouter();

  return (
    <section className="bg-white dark:bg-stone-950">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-[1.05fr_0.95fr] md:py-16">
        <div className="flex flex-col justify-center">
          <p className="text-sm font-bold uppercase tracking-wide text-clay">Verified rental marketplace</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight text-ink dark:text-stone-50 md:text-6xl">
            Rent event gear without the back-and-forth.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-stone-600 dark:text-stone-300">
            Search projectors, speakers, cameras, lights, and other gear by daily budget, item type, and quantity. Admin-managed inventory keeps availability clear before you request a rental.
          </p>
          <div className="mt-8">
            <SearchBar showCity={false} onSearch={(params) => router.push(`/properties?${params.toString()}`)} />
          </div>
        </div>
        <div className="min-h-[360px] overflow-hidden rounded-lg shadow-soft">
          <img
            src="https://images.unsplash.com/photo-1520549233664-03f65c1d1327?auto=format&fit=crop&w=1200&q=80"
            alt="Event production equipment"
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}
