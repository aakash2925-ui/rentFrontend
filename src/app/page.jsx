"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Camera, IndianRupee, Luggage, MessageCircle, MonitorUp, RefreshCw, ShieldCheck, Shirt, Speaker, Star, Tags, Truck, WalletCards } from "lucide-react";
import HeroSection from "@/components/home/HeroSection";
import api, { uploadUrl } from "@/lib/api";

const categoryIcons = {
  projector: MonitorUp,
  speaker: Speaker,
  camera: Camera,
  luggage: Luggage,
  fashion: Shirt
};

const fallbackCategoryImages = {
  projector: "https://images.unsplash.com/photo-1601944177325-f8867652837f?auto=format&fit=crop&w=900&q=80",
  speaker: "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=900&q=80",
  camera: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80",
  luggage: "https://images.unsplash.com/photo-1553531888-a5f7d704a33f?auto=format&fit=crop&w=900&q=80",
  fashion: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80",
  default: "https://images.unsplash.com/photo-1520549233664-03f65c1d1327?auto=format&fit=crop&w=900&q=80"
};

const categoryImageFor = (type) => {
  const fallback = fallbackCategoryImages[type.name?.toLowerCase()] || fallbackCategoryImages.default;
  return type.image ? uploadUrl(type.image) : fallback;
};

const experienceSlides = [
  {
    title: "Movie Nights",
    text: "Projector + speaker setup",
    image: "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=900&q=85"
  },
  {
    title: "Date Nights",
    text: "Cozy projector experience",
    image: "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?auto=format&fit=crop&w=900&q=85"
  },
  {
    title: "House Parties",
    text: "Speaker + projector",
    image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=900&q=85"
  },
  {
    title: "Travel Adventures",
    text: "Luggage rentals",
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=85"
  },
  {
    title: "Weddings & Events",
    text: "Cameras & speakers",
    image: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=85"
  }
];

const whyZasoota = [
  { icon: Truck, title: "Fast Delivery", text: "Doorstep delivery for rentals when timing matters." },
  { icon: IndianRupee, title: "Affordable Rentals", text: "Use premium products without heavy ownership costs." },
  { icon: ShieldCheck, title: "Verified Products", text: "Inventory is reviewed and managed before requests move." },
  { icon: RefreshCw, title: "Rent. Use. Return.", text: "Simple pickup and return flow without ownership hassles." },
  { icon: MessageCircle, title: "24*7 Customer Support", text: "Support touchpoints are easy to find across the site." }
];

const howItWorks = [
  ["Browse", "Choose your product"],
  ["Rent", "Select dates"],
  ["Enjoy", "Use without ownership hassles"],
  ["Return", "Pickup from your doorstep"]
];

export default function HomePage() {
  const [itemTypes, setItemTypes] = useState([]);
  const [customerReviews, setCustomerReviews] = useState([]);

  useEffect(() => {
    Promise.allSettled([
      api.get("/item-types"),
      api.get("/reviews/latest?limit=6")
    ])
      .then(([itemTypesResponse, reviewsResponse]) => {
        if (itemTypesResponse.status === "fulfilled") setItemTypes(itemTypesResponse.value.data.itemTypes);
        else setItemTypes([]);

        if (reviewsResponse.status === "fulfilled") setCustomerReviews(reviewsResponse.value.data.reviews || []);
        else setCustomerReviews([]);
      })
      .catch(() => {
        setItemTypes([]);
        setCustomerReviews([]);
      });
  }, []);

  const categories = itemTypes.map((type) => ({ ...type, image: categoryImageFor(type) }));

  return (
    <>
      <HeroSection />
      <section className="border-y border-violet-100 bg-white/70 backdrop-blur dark:border-violet-900/70 dark:bg-[#160b29]/82">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:grid-cols-3">
          {[
            ["Doorstep", "Delivery focused rentals"],
            ["24*7", "Customer support"],
            ["Verified", "Products and inventory"]
          ].map(([value, label]) => (
            <div key={label} className="reveal-card rounded-2xl border border-violet-100 bg-white/85 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-soft dark:border-violet-900/70 dark:bg-white/10">
              <p className="text-3xl font-black text-meadow">{value}</p>
              <p className="mt-1 text-sm text-violet-950/65 dark:text-violet-100/70">{label}</p>
            </div>
          ))}
        </div>
      </section>
      <section id="browse-categories" className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-5">
          <p className="text-sm font-bold uppercase tracking-wide text-meadow">Browse by category</p>
          <h2 className="mt-2 text-3xl font-black text-ink dark:text-white md:text-4xl">Find what you need faster</h2>
        </div>
        {categories.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.slice(0, 8).map((type) => {
            const Icon = categoryIcons[type.name.toLowerCase()] || Tags;
            const cardImages = type.images || (type.image ? [type.image] : [fallbackCategoryImages.default]);
            return (
              <Link
                key={type.name}
                href={`/items?type=${encodeURIComponent(type.name)}`}
                className="group reveal-card relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/82 p-3 shadow-soft transition duration-300 hover:-translate-y-2 hover:border-violet-300 hover:shadow-glow dark:border-violet-900/70 dark:bg-white/10"
              >
                <div className="relative aspect-[16/11] overflow-hidden rounded-[1.35rem] bg-violet-100 dark:bg-violet-950/70">
                  {cardImages.length > 1 ? (
                    <div className="grid h-full grid-cols-[1.42fr_0.9fr] gap-2 bg-violet-950/20 p-2">
                      <img src={cardImages[0]} alt={`${type.name} rental`} className="h-full w-full rounded-[1rem] object-cover transition duration-700 group-hover:scale-105" />
                      <div className="grid gap-2">
                        <img src={cardImages[1]} alt="Projector rental" className="h-full min-h-0 w-full rounded-[0.85rem] object-cover transition duration-700 group-hover:scale-105" />
                        <img src={cardImages[2]} alt="Speaker rental" className="h-full min-h-0 w-full rounded-[0.85rem] object-cover transition duration-700 group-hover:scale-105" />
                      </div>
                    </div>
                  ) : cardImages.length ? (
                    <img src={cardImages[0]} alt={type.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
                  ) : (
                    <div className="flex h-full items-center justify-center"><Icon className="h-12 w-12 text-meadow" /></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/58 via-transparent to-transparent opacity-90 transition group-hover:opacity-100" />
                </div>
                <div className="flex items-center justify-between gap-4 px-2 py-4">
                  <div className="min-w-0">
                    <h3 className="text-xl font-black leading-tight text-ink dark:text-white">{type.name}</h3>
                    <p className="mt-1 text-sm text-violet-950/60 dark:text-violet-100/62">Browse collection</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-br from-violet-700 to-fuchsia-500 px-4 py-2 text-xs font-black text-white shadow-soft transition group-hover:translate-x-1">
                    Explore <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-violet-100 bg-white/80 p-6 text-sm font-semibold text-violet-950/60 shadow-sm dark:border-violet-900/70 dark:bg-white/10 dark:text-violet-100/65">
            Categories will appear here once item types are added from the admin portal.
          </div>
        )}
      </section>
      <section className="bg-gradient-to-br from-violet-950 via-[#2a1150] to-fuchsia-950 py-14 text-white">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-wide text-clay">Experience Powered by Zasoota</p>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">Rent for the moment, not forever.</h2>
          </div>
          <div className="flex snap-x gap-4 overflow-x-auto pb-3">
            {experienceSlides.map((slide) => (
              <article key={slide.title} className="reveal-card group min-w-[260px] snap-start overflow-hidden rounded-2xl border border-white/10 bg-white/10 shadow-soft backdrop-blur md:min-w-[360px]">
                <img src={slide.image} alt={slide.title} className="h-56 w-full object-cover transition duration-700 group-hover:scale-105" />
                <div className="p-5">
                  <h3 className="text-xl font-black">{slide.title}</h3>
                  <p className="mt-1 text-sm text-violet-100/75">{slide.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-wide text-meadow">Why Zasoota</p>
          <h2 className="mt-2 text-3xl font-black text-ink dark:text-white md:text-4xl">Built for easy, affordable access.</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {whyZasoota.map(({ icon: Icon, title, text }) => (
            <article key={title} className="reveal-card rounded-2xl border border-violet-100 bg-white/85 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-soft dark:border-violet-900/70 dark:bg-white/10">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-mist text-meadow dark:bg-violet-950"><Icon className="h-5 w-5" /></span>
              <h3 className="mt-4 font-black">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-violet-950/65 dark:text-violet-100/70">{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="bg-white/70 py-12 backdrop-blur dark:bg-[#160b29]/80">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-wide text-meadow">How It Works</p>
            <h2 className="mt-2 text-3xl font-black text-ink dark:text-white md:text-4xl">Browse, rent, enjoy, return.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-4">
            {howItWorks.map(([title, text], index) => (
              <article key={title} className="reveal-card rounded-2xl border border-violet-100 bg-white/85 p-5 shadow-sm dark:border-violet-900/70 dark:bg-white/10">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-meadow text-white font-black">{index + 1}</span>
                <h3 className="mt-4 font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-violet-950/65 dark:text-violet-100/70">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-14 md:grid-cols-[1fr_1fr]">
        <div className="reveal-card rounded-2xl border border-violet-100 bg-white/85 p-6 shadow-soft dark:border-violet-900/70 dark:bg-white/10">
          <WalletCards className="h-7 w-7 text-meadow" />
          <h2 className="mt-4 text-2xl font-black">Transparent totals before you send a request</h2>
          <p className="mt-3 leading-7 text-violet-950/65 dark:text-violet-100/70">The detail page calculates rental days, daily rent, refundable deposit, and total payable before the request is submitted.</p>
        </div>
        <div className="reveal-card rounded-2xl border border-violet-700 bg-gradient-to-br from-ink via-violet-900 to-fuchsia-900 p-6 text-white shadow-glow">
          <ShieldCheck className="h-7 w-7 text-clay" />
          <h2 className="mt-4 text-2xl font-black">Stock stays honest as rentals move</h2>
          <p className="mt-3 leading-7 text-violet-100/75">When admin confirms a booking, stock updates automatically. When it is returned or closed, stock comes back.</p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-16">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-wide text-meadow">Customer reviews</p>
          <h2 className="mt-2 text-3xl font-black text-ink dark:text-white">Loved by renters planning real moments.</h2>
        </div>
        {customerReviews.length ? (
          <div className="grid gap-4 md:grid-cols-3">
            {customerReviews.slice(0, 6).map((review) => (
              <article key={review._id} className="reveal-card rounded-2xl border border-violet-100 bg-white/85 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-soft dark:border-violet-900/70 dark:bg-white/10">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex gap-1 text-clay">
                    {[1, 2, 3, 4, 5].map((item) => (
                      <Star key={item} className={`h-4 w-4 ${item <= Number(review.rating || 0) ? "fill-current" : ""}`} />
                    ))}
                  </div>
                  <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700 dark:bg-violet-950/70 dark:text-violet-100">{Number(review.rating || 0).toFixed(1)}</span>
                </div>
                <p className="mt-4 text-sm leading-6 text-violet-950/70 dark:text-violet-100/75">"{review.comment}"</p>
                <p className="mt-4 font-black">{review.user?.name || "Zasoota renter"}</p>
                <p className="mt-1 text-xs font-semibold text-violet-950/50 dark:text-violet-100/55">{review.property?.title || "Rental experience"}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-violet-100 bg-white/80 p-6 text-sm font-semibold text-violet-950/60 shadow-sm dark:border-violet-900/70 dark:bg-white/10 dark:text-violet-100/65">
            Customer reviews will appear here after renters review items.
          </div>
        )}
      </section>
    </>
  );
}
