"use client";

import Link from "next/link";
import { CalendarClock, ChevronLeft, ChevronRight, Percent } from "lucide-react";
import { useState } from "react";
import { uploadUrl } from "@/lib/api";
import { minRentalDaysOf } from "@/lib/itemFields";
import AddToCartButton from "@/components/cart/AddToCartButton";
import WishlistButton from "./WishlistButton";

export default function PropertyCard({ property }) {
  const [activeImage, setActiveImage] = useState(0);
  const images = property.images?.length ? property.images : [null];

  const moveImage = (event, direction) => {
    event.preventDefault();
    event.stopPropagation();
    setActiveImage((current) => (current + direction + images.length) % images.length);
  };

  return (
    <article className="group overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-soft dark:border-stone-800 dark:bg-stone-900">
      <div className="relative aspect-[4/3] overflow-hidden bg-stone-100 dark:bg-stone-800">
        <Link href={`/items/${property._id}`}>
          <img src={uploadUrl(images[activeImage])} alt={property.title} className="h-full w-full object-cover transition group-hover:scale-105" />
        </Link>
        <div className="absolute right-3 top-3">
          <WishlistButton propertyId={property._id} />
        </div>
        {images.length > 1 && (
          <>
            <button className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm" onClick={(event) => moveImage(event, -1)} aria-label="Previous image">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink shadow-sm" onClick={(event) => moveImage(event, 1)} aria-label="Next image">
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/items/${property._id}`} className="line-clamp-2 text-base font-bold hover:text-meadow">{property.title}</Link>
          <p className="whitespace-nowrap text-sm font-black text-meadow">₹{Number(property.rent).toLocaleString()}</p>
        </div>
        {property.offer && <p className="mt-2 flex items-center gap-1 text-sm font-bold text-meadow"><Percent className="h-4 w-4" /> {property.offer}</p>}
        <div className="mt-4 grid gap-2 text-xs text-stone-600 dark:text-stone-300">
          <span className="flex items-center gap-1"><CalendarClock className="h-4 w-4" /> {minRentalDaysOf(property)}+ days</span>
        </div>
        <div className="mt-4">
          <AddToCartButton property={property} className="w-full" compact showGoToCart={false} />
        </div>
      </div>
    </article>
  );
}
