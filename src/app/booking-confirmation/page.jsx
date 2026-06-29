"use client";

import Link from "next/link";
import { CheckCircle2, CreditCard, PackageCheck, ShieldCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useAuth } from "@/context/AuthContext";

export default function BookingConfirmationPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-14"><div className="rounded-2xl border border-violet-100 bg-white p-8 shadow-soft dark:border-violet-900/70 dark:bg-white/10">Loading confirmation...</div></div>}>
      <BookingConfirmationContent />
    </Suspense>
  );
}

function BookingConfirmationContent() {
  const params = useSearchParams();
  const { user } = useAuth();
  const bookingId = params.get("booking");
  const method = params.get("method");
  const isOnline = method === "razorpay";
  const needsKyc = user && user.kyc?.status !== "approved";

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
          {needsKyc && (
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm dark:border-amber-900/60 dark:bg-amber-950/30">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-200" />
                <div>
                  <h2 className="font-black text-amber-800 dark:text-amber-100">Complete KYC after booking</h2>
                  <p className="mt-1 leading-6 text-amber-800/75 dark:text-amber-100/75">
                    Your booking is confirmed. Please complete OTP-based KYC from your dashboard profile so the team can verify your identity before handover.
                  </p>
                  <Link href="/dashboard?section=profile" className="btn-primary mt-3">Complete KYC</Link>
                </div>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/dashboard" className="btn-primary flex-1">View dashboard</Link>
            <Link href="/items" className="btn-secondary flex-1">Browse more items</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
