"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import Loading from "@/components/common/Loading";
import ErrorMessage from "@/components/common/ErrorMessage";
import InquiryForm from "@/components/forms/InquiryForm";
import PropertyDetails from "@/components/properties/PropertyDetails";
import PropertyImageGallery from "@/components/properties/PropertyImageGallery";
import PropertyGrid from "@/components/properties/PropertyGrid";
import ReviewSection from "@/components/properties/ReviewSection";
import RentPriceSection from "@/components/properties/RentPriceSection";
import { itemTypeOf } from "@/lib/itemFields";

export default function PropertyDetailPage({ params }) {
  const [property, setProperty] = useState(null);
  const [related, setRelated] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/properties/${params.id}`)
      .then(({ data }) => {
        setProperty(data.property);
        return api.get(`/properties?type=${encodeURIComponent(itemTypeOf(data.property))}&limit=4`);
      })
      .then(({ data }) => setRelated(data.properties.filter((item) => item._id !== params.id).slice(0, 3)))
      .catch(() => setError("Item not found"))
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    if (!property) return;
    const stored = JSON.parse(localStorage.getItem("recent_items") || "[]").filter((item) => item._id !== property._id);
    const next = [{ _id: property._id, title: property.title, rent: property.rent, images: property.images, pincode: property.pincode, quantity: property.quantity, minRentalDays: property.minRentalDays, offer: property.offer, isAvailable: property.isAvailable }, ...stored].slice(0, 4);
    localStorage.setItem("recent_items", JSON.stringify(next));
    setRecentlyViewed(stored.slice(0, 3));
  }, [property]);

  if (loading) return <Loading />;
  if (error) return <div className="mx-auto max-w-7xl px-4 py-8"><ErrorMessage message={error} /></div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="mb-5 text-sm text-stone-500">
        <Link href="/" className="hover:text-meadow">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/items" className="hover:text-meadow">Items</Link>
        <span className="mx-2">/</span>
        <span>{property.title}</span>
      </nav>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <PropertyImageGallery images={property.images} title={property.title} />
          <PropertyDetails property={property} />
          <ReviewSection propertyId={property._id} />
        </div>
        <aside id="rental-checkout" className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start">
          <RentPriceSection property={property} />
          <InquiryForm property={property} />
        </aside>
      </div>
      {related.length > 0 && (
        <section className="mt-12">
          <p className="text-sm font-bold uppercase tracking-wide text-clay">Related gear</p>
          <h2 className="mt-2 text-3xl font-black">More {itemTypeOf(property)} items</h2>
          <div className="mt-5">
            <PropertyGrid properties={related} />
          </div>
        </section>
      )}
      {recentlyViewed.length > 0 && (
        <section className="mt-12">
          <p className="text-sm font-bold uppercase tracking-wide text-clay">Recently viewed</p>
          <h2 className="mt-2 text-3xl font-black">Items you checked earlier</h2>
          <div className="mt-5">
            <PropertyGrid properties={recentlyViewed} />
          </div>
        </section>
      )}
    </div>
  );
}
