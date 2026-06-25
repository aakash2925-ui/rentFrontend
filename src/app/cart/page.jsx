"use client";

import Link from "next/link";
import { ShoppingCart, Trash2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { uploadUrl } from "@/lib/api";

export default function CartPage() {
  const { items, count, totalDailyRent, totalDeposit, removeItem, clearCart } = useCart();

  if (!items.length) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-mist text-meadow shadow-soft dark:bg-white/10">
          <ShoppingCart className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-3xl font-black text-ink dark:text-white">Your cart is empty</h1>
        <p className="mt-2 text-violet-950/65 dark:text-violet-100/70">Add projectors, speakers, cameras, luggage, or fashion items to plan your rental.</p>
        <Link href="/items" className="btn-primary mt-6">Browse items</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-meadow">Rental cart</p>
          <h1 className="mt-2 text-4xl font-black text-ink dark:text-white">Review your items</h1>
          <p className="mt-2 text-sm text-violet-950/65 dark:text-violet-100/70">{count} item(s) selected for rental.</p>
        </div>
        <button type="button" onClick={clearCart} className="btn-secondary">
          <Trash2 className="h-4 w-4" /> Clear cart
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="space-y-4">
          {items.map((item) => (
            <article key={item._id} className="grid gap-4 rounded-2xl border border-violet-100 bg-white/85 p-4 shadow-sm dark:border-violet-900/70 dark:bg-white/10 sm:grid-cols-[132px_1fr]">
              <Link href={`/items/${item._id}`} className="overflow-hidden rounded-xl bg-mist">
                <img src={uploadUrl(item.images?.[0])} alt={item.title} className="h-32 w-full object-cover transition hover:scale-105" />
              </Link>
              <div className="min-w-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Link href={`/items/${item._id}`} className="text-lg font-black text-ink hover:text-meadow dark:text-white">{item.title}</Link>
                    <p className="mt-1 text-sm text-violet-950/60 dark:text-violet-100/65">{item.itemType} · Pincode {item.pincode}</p>
                    {item.offer && <p className="mt-1 text-sm font-bold text-meadow">{item.offer}</p>}
                  </div>
                  <button type="button" onClick={() => removeItem(item._id)} className="inline-flex items-center gap-2 rounded-xl border border-red-100 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-50 dark:border-red-900/70 dark:hover:bg-red-950/30">
                    <Trash2 className="h-4 w-4" /> Remove
                  </button>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-mist p-3 text-sm dark:bg-white/10">
                    <span className="text-violet-950/60 dark:text-violet-100/65">Daily rent</span>
                    <strong className="mt-1 block text-ink dark:text-white">₹{Number(item.rent).toLocaleString()}</strong>
                  </div>
                  <div className="rounded-xl bg-mist p-3 text-sm dark:bg-white/10">
                    <span className="text-violet-950/60 dark:text-violet-100/65">Deposit</span>
                    <strong className="mt-1 block text-ink dark:text-white">₹{Number(item.deposit).toLocaleString()}</strong>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
                  <Link href={`/items/${item._id}`} className="btn-primary">Proceed to Checkout</Link>
                </div>
              </div>
            </article>
          ))}
        </section>

        <aside className="h-fit rounded-2xl border border-violet-100 bg-white/90 p-5 shadow-soft dark:border-violet-900/70 dark:bg-white/10 lg:sticky lg:top-24">
          <h2 className="text-xl font-black text-ink dark:text-white">Cart summary</h2>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between"><span>Items</span><strong>{count}</strong></div>
            <div className="flex justify-between"><span>Daily rent total</span><strong>₹{totalDailyRent.toLocaleString()}</strong></div>
            <div className="flex justify-between"><span>Refundable deposits</span><strong>₹{totalDeposit.toLocaleString()}</strong></div>
            <div className="border-t border-violet-100 pt-3 dark:border-violet-900/70">
              <p className="text-violet-950/60 dark:text-violet-100/65">Final rental amount depends on rental dates, delivery option, and admin confirmation.</p>
            </div>
          </div>
          <Link href="/items" className="btn-secondary mt-5 w-full">Add more items</Link>
        </aside>
      </div>
    </div>
  );
}
