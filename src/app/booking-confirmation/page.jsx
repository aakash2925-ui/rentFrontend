"use client";

import Link from "next/link";
import { CheckCircle2, CreditCard, PackageCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export default function BookingConfirmationPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-14"><div className="rounded-2xl border border-violet-100 bg-white p-8 shadow-soft dark:border-violet-900/70 dark:bg-white/10">Loading confirmation...</div></div>}>
      <BookingConfirmationContent />
    </Suspense>
  );
}

function BookingConfirmationContent() {
  const params = useSearchParams();
  const bookingId = params.get("booking");
  const method = params.get("method");
  const isOnline = method === "razorpay";

  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <section className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-soft dark:border-violet-900/70 dark:bg-white/10">
        <div className="bg-gradient-to-br from-violet-950 via-violet-800 to-fuchsia-700 p-8 text-center text-white">
          <CheckCircle2 className="mx-auto h-14 w-14 text-green-200" />
          <h1 className="mt-4 text-3xl font-black">Booking confirmed</h1>
          <p className="mt-2 text-violet-100/80">Your booking request has been created successfully.</p>
        </div>
        <div className="space-y-4 p-6">
          <div className="rounded-2xl bg-mist p-4 text-sm dark:bg-white/10">
            <p className="text-violet-950/60 dark:text-violet-100/65">Booking ID</p>
            <p className="mt-1 break-all font-black text-ink dark:text-white">{bookingId || "Available in dashboard"}</p>
          </div>
          <div className="rounded-2xl bg-mist p-4 text-sm dark:bg-white/10">
            <div className="flex items-center gap-2 font-black text-ink dark:text-white">
              {isOnline ? <CreditCard className="h-5 w-5 text-meadow" /> : <PackageCheck className="h-5 w-5 text-meadow" />}
              {isOnline ? "Online payment verified" : "Cash on Delivery selected"}
            </div>
            <p className="mt-2 text-violet-950/65 dark:text-violet-100/70">
              {isOnline ? "Payment status is marked paid." : "Payment status is pending until delivery collection."}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/dashboard" className="btn-primary flex-1">View dashboard</Link>
            <Link href="/properties" className="btn-secondary flex-1">Browse more items</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
