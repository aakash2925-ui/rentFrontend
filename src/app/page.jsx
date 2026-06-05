"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarCheck, Camera, ClipboardCheck, Lightbulb, MonitorUp, ShieldCheck, Speaker, Tags, Truck, WalletCards } from "lucide-react";
import HeroSection from "@/components/home/HeroSection";
import PropertyGrid from "@/components/properties/PropertyGrid";
import ErrorMessage from "@/components/common/ErrorMessage";
import api from "@/lib/api";
import { itemTypeOf } from "@/lib/itemFields";
import { PropertyGridSkeleton } from "@/components/common/Skeleton";

const categoryIcons = {
  projector: MonitorUp,
  speaker: Speaker,
  camera: Camera,
  light: Lightbulb
};

const featuredCategories = [
  {
    name: "Projector",
    image: "https://images.unsplash.com/photo-1601944177325-f8867652837f?auto=format&fit=crop&w=900&q=80"
  },
  {
    name: "Speaker",
    image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=900&q=80"
  },
  {
    name: "Camera",
    image: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80"
  },
  {
    name: "Light",
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80"
  }
];

export default function HomePage() {
  const [properties, setProperties] = useState([]);
  const [itemTypes, setItemTypes] = useState([]);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.get("/properties?sort=newest"), api.get("/item-types")])
      .then(([propertiesResponse, itemTypesResponse]) => {
        const allProperties = propertiesResponse.data.properties;
        setProperties(allProperties.slice(0, 6));
        setItemTypes(itemTypesResponse.data.itemTypes);
        setCategoryCounts(allProperties.reduce((items, item) => {
          const type = itemTypeOf(item);
          items[type] = (items[type] || 0) + 1;
          return items;
        }, {}));
      })
      .catch(() => setError("Unable to load featured items"))
      .finally(() => setLoading(false));
  }, []);

  const featuredNames = new Set(featuredCategories.map((type) => type.name.toLowerCase()));
  const categories = [
    ...featuredCategories,
    ...itemTypes.filter((type) => !featuredNames.has(type.name.toLowerCase())).map((type) => ({ name: type.name }))
  ];

  return (
    <>
      <HeroSection />
      <section className="border-y border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:grid-cols-3">
          {[
            ["500+", "Rental requests handled"],
            ["24 hr", "Typical confirmation window"],
            ["100%", "Admin-managed inventory"]
          ].map(([value, label]) => (
            <div key={label} className="rounded-lg bg-mist p-5 dark:bg-stone-900">
              <p className="text-3xl font-black text-meadow">{value}</p>
              <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{label}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-5">
          <p className="text-sm font-bold uppercase tracking-wide text-clay">Browse by category</p>
          <h2 className="text-3xl font-black">Find the right gear faster</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.slice(0, 8).map((type) => {
            const Icon = categoryIcons[type.name.toLowerCase()] || Tags;
            return (
              <Link key={type.name} href={`/properties?type=${encodeURIComponent(type.name)}`} className="group overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-soft dark:border-stone-800 dark:bg-stone-900">
                <div className="aspect-[16/9] bg-stone-100 dark:bg-stone-800">
                  {type.image ? <img src={type.image} alt={type.name} className="h-full w-full object-cover transition group-hover:scale-105" /> : <div className="flex h-full items-center justify-center"><Icon className="h-10 w-10 text-meadow" /></div>}
                </div>
                <div className="p-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-mist text-meadow dark:bg-stone-800">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-black">{type.name}</h3>
                  <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{categoryCounts[type.name] || 0} fresh item(s)</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
      <section className="bg-white py-12 dark:bg-stone-950">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-wide text-clay">Simple rental flow</p>
            <h2 className="mt-2 text-3xl font-black">From search to pickup in a few clear steps</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-4">
            {[
              { icon: ClipboardCheck, title: "Choose gear", text: "Filter by item type, budget, quantity, and stock status." },
              { icon: CalendarCheck, title: "Pick dates", text: "Select rental start and end dates and see total pricing upfront." },
              { icon: ShieldCheck, title: "Admin confirms", text: "Inventory quantity is managed when rentals are marked active." },
              { icon: Truck, title: "Pickup ready", text: "Use pickup details and request history to coordinate smoothly." }
            ].map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-lg border border-stone-200 bg-mist p-5 dark:border-stone-800 dark:bg-stone-900">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-meadow dark:bg-stone-800"><Icon className="h-5 w-5" /></span>
                <h3 className="mt-4 font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-clay">Fresh listings</p>
            <h2 className="text-3xl font-black">Featured equipment</h2>
          </div>
        </div>
        {loading ? <PropertyGridSkeleton /> : error ? <ErrorMessage message={error} /> : <PropertyGrid properties={properties} />}
      </section>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-14 md:grid-cols-[1fr_1fr]">
        <div className="rounded-lg border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
          <WalletCards className="h-7 w-7 text-clay" />
          <h2 className="mt-4 text-2xl font-black">Transparent totals before you send a request</h2>
          <p className="mt-3 leading-7 text-stone-600 dark:text-stone-300">The detail page calculates rental days, selected quantity, daily rent, refundable deposit, and total payable before the request is submitted.</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-ink p-6 text-white dark:border-stone-800">
          <ShieldCheck className="h-7 w-7 text-clay" />
          <h2 className="mt-4 text-2xl font-black">Stock stays honest as rentals move</h2>
          <p className="mt-3 leading-7 text-stone-300">When admin marks a request as rented, inventory quantity reduces automatically. When it is returned or closed, quantity comes back.</p>
        </div>
      </section>
    </>
  );
}
