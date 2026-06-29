"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, Loader2, MapPin, ShoppingCart, XCircle } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { minRentalDaysOf, rentalDaysBetween } from "@/lib/itemFields";

function toDateInputValue(date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function addDays(value, days) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}

function laterDate(first, second) {
  if (!first) return second;
  if (!second) return first;
  return first > second ? first : second;
}

function formatBookedPeriodDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function dateOnly(value) {
  return new Date(`${String(value).slice(0, 10)}T00:00:00`);
}

function uniqueBookedPeriods(periods = []) {
  return Array.from(
    new Map(periods.filter(Boolean).map((period) => [`${period.startDate}-${period.endDate}`, period])).values()
  );
}

function bookedPeriodsOverlap(periods = [], startDate, endDate) {
  if (!startDate || !endDate) return null;
  const start = dateOnly(startDate);
  const end = dateOnly(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;
  return periods.find((period) => dateOnly(period.startDate) < end && dateOnly(period.endDate) > start) || null;
}

function bookedPeriodMessage(period) {
  return `This item is booked. Book after the booked period.`;
}

export default function RentalOptionsCard({ property }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { addItem, items, removeItem } = useCart();
  const { showToast } = useToast();
  const today = useMemo(() => toDateInputValue(new Date()), []);
  const minRentalDays = minRentalDaysOf(property);
  const earliestStartDate = today;
  const [form, setForm] = useState({
    startDate: earliestStartDate,
    endDate: earliestStartDate ? addDays(earliestStartDate, minRentalDays) : "",
    pincode: ""
  });
  const [availability, setAvailability] = useState({ status: "idle", message: "" });
  const [showCartAction, setShowCartAction] = useState(false);
  const rentalDays = rentalDaysBetween(form.startDate, form.endDate);
  const inCart = items.some((item) => item._id === property._id);
  const datesValid = form.startDate && form.endDate && form.startDate >= earliestStartDate && form.endDate >= form.startDate && rentalDays >= minRentalDays;
  const ready = Boolean(datesValid && availability.status === "available");
  const knownBookedPeriods = useMemo(() => uniqueBookedPeriods([
    ...(property.bookedPeriods || []),
    ...(availability.bookedPeriods || [])
  ]), [availability.bookedPeriods, property.bookedPeriods]);

  useEffect(() => {
    if (!/^\d{6}$/.test(form.pincode)) {
      setAvailability({ status: "idle", message: "" });
      return undefined;
    }
    setAvailability({ status: "checking", message: "Checking delivery availability..." });
    const timer = setTimeout(() => {
      api.get(`/properties/${property._id}/availability`, { params: { pincode: form.pincode, startDate: form.startDate, endDate: form.endDate } })
        .then(({ data }) => setAvailability({
          status: data.available ? "available" : "unavailable",
          message: data.message,
          nextAvailableAfter: data.nextAvailableAfter || data.nextAvailableAt || "",
          bookedPeriods: data.bookedPeriods || []
        }))
        .catch((err) => setAvailability({ status: "unavailable", message: err.response?.data?.message || "Unable to check availability", nextAvailableAfter: "", bookedPeriods: [] }));
    }, 450);
    return () => clearTimeout(timer);
  }, [form.endDate, form.pincode, form.startDate, property._id]);

  const updateStartDate = (value) => {
    const startDate = laterDate(value, earliestStartDate);
    const endDate = form.endDate && form.endDate >= startDate ? form.endDate : addDays(startDate, minRentalDays);
    const blockedPeriod = bookedPeriodsOverlap(knownBookedPeriods, startDate, endDate);
    if (blockedPeriod) {
      const message = bookedPeriodMessage(blockedPeriod);
      setAvailability({ status: "unavailable", message, nextAvailableAfter: blockedPeriod.endDate, bookedPeriods: [blockedPeriod] });
      showToast(message, "error");
      return;
    }
    setForm((current) => ({
      ...current,
      startDate,
      endDate
    }));
  };

  const updateEndDate = (value) => {
    const nextRentalDays = rentalDaysBetween(form.startDate, value);
    if (form.startDate && nextRentalDays > 0 && nextRentalDays < minRentalDays) {
      showToast(`Minimum rental duration is ${minRentalDays} days`, "error");
    }
    const blockedPeriod = bookedPeriodsOverlap(knownBookedPeriods, form.startDate, value);
    if (blockedPeriod) {
      const message = bookedPeriodMessage(blockedPeriod);
      setAvailability({ status: "unavailable", message, nextAvailableAfter: blockedPeriod.endDate, bookedPeriods: [blockedPeriod] });
      showToast(message, "error");
      return;
    }
    setForm((current) => ({ ...current, endDate: value }));
  };

  const addToCart = () => {
    if (!authLoading && !user) {
      showToast("Please login to add this item to cart", "error");
      router.push("/login");
      return;
    }
    if (!ready) {
      showToast("Select valid rental dates and a serviceable PIN code first", "error");
      return;
    }
    addItem(property, { startDate: form.startDate, endDate: form.endDate, pincode: form.pincode });
    showToast("Added to cart");
    setShowCartAction(true);
  };

  const removeFromCart = () => {
    removeItem(property._id);
    setShowCartAction(false);
    showToast("Removed from cart");
  };

  return (
    <section className="rounded-[1.75rem] border border-violet-100 bg-white p-5 shadow-soft dark:border-violet-900/70 dark:bg-white/10">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-100">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-black uppercase tracking-wide text-meadow">Rental options</p>
          <h2 className="mt-1 text-2xl font-black text-ink dark:text-white">Select dates and pincode</h2>
          <p className="mt-1 text-sm text-violet-950/60 dark:text-violet-100/65">Add to cart is enabled only after availability is confirmed.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-black text-violet-950 dark:text-white">Start Date</span>
            <input className="field" type="date" min={earliestStartDate} value={form.startDate} onChange={(event) => updateStartDate(event.target.value)} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-black text-violet-950 dark:text-white">End Date</span>
            <input className="field" type="date" min={form.startDate || earliestStartDate} value={form.endDate} onChange={(event) => updateEndDate(event.target.value)} />
          </label>
        </div>
        {form.startDate && form.endDate && rentalDays > 0 && rentalDays < minRentalDays && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200">
            Minimum rental duration is {minRentalDays} days. Please select at least {minRentalDays} days.
          </div>
        )}
        <div className={`rounded-2xl border p-4 transition ${
          availability.status === "available"
            ? "border-green-200 bg-green-50 dark:border-green-900/70 dark:bg-green-950/30"
            : availability.status === "unavailable"
              ? "border-red-200 bg-red-50 dark:border-red-900/70 dark:bg-red-950/30"
              : "border-violet-100 bg-mist/70 dark:border-violet-900/70 dark:bg-stone-950/40"
        }`}>
          <label className="space-y-2">
            <span className="text-sm font-black text-violet-950 dark:text-white">Delivery PIN Code</span>
            <div>
              <input
                className="field h-12 text-base font-black tracking-wide"
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter 6-digit pincode"
                value={form.pincode}
                onChange={(event) => setForm((current) => ({ ...current, pincode: event.target.value.replace(/\D/g, "").slice(0, 6) }))}
              />
            </div>
          </label>
          <div className="mt-3 flex items-start gap-2 text-sm font-black">
            {availability.status === "checking" ? <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-violet-700" /> : availability.status === "available" ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" /> : availability.status === "unavailable" ? <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" /> : <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-violet-500" />}
            <p className={availability.status === "available" ? "text-green-700 dark:text-green-200" : availability.status === "unavailable" ? "text-red-700 dark:text-red-200" : "text-violet-950/60 dark:text-violet-100/65"}>
              {availability.status === "available" ? "Available in your area" : availability.message || "Enter your pincode to check availability."}
            </p>
          </div>
          {availability.status === "unavailable" && form.startDate && form.endDate && (
            <div className="mt-3 rounded-2xl border border-red-200 bg-white/75 px-4 py-3 text-sm font-black text-red-700 dark:border-red-900/70 dark:bg-red-950/20 dark:text-red-100">
              This item is booked.
              {availability.bookedPeriods?.length > 0 && (
                <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs dark:bg-red-950/30">
                  <p className="mb-2 font-black">Booked period:</p>
                  <div className="grid gap-1">
                    {availability.bookedPeriods.map((period, index) => (
                      <span key={`${period.startDate}-${period.endDate}-${index}`}>
                        {formatBookedPeriodDate(period.startDate)} to {formatBookedPeriodDate(period.endDate)}. Book after this period.
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {availability.nextAvailableAfter && (
                <button
                  className="mt-3 block rounded-xl bg-white px-3 py-2 text-xs font-black text-red-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft dark:bg-white/10 dark:text-red-100"
                  type="button"
                  onClick={() => {
                    const startDate = String(availability.nextAvailableAfter).slice(0, 10);
                    setForm((current) => ({ ...current, startDate, endDate: addDays(startDate, minRentalDays) }));
                  }}
                >
                  Select {String(availability.nextAvailableAfter).slice(0, 10)} instead
                </button>
              )}
            </div>
          )}
        </div>
        {inCart ? (
          <button type="button" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-100 bg-white px-4 text-sm font-black text-red-600 shadow-soft transition hover:bg-red-50 dark:border-red-900/70 dark:bg-white/10 dark:text-red-300 dark:hover:bg-red-950/30" onClick={removeFromCart}>
            Remove from cart
          </button>
        ) : (
          <button type="button" className="btn-primary min-h-12" disabled={!ready} onClick={addToCart}>
            <ShoppingCart className="h-5 w-5" /> Add to Cart
          </button>
        )}
      </div>
      {showCartAction && inCart && (
        <div className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-violet-100 bg-white/95 p-3 shadow-glow backdrop-blur-xl dark:border-violet-900/70 dark:bg-stone-950/95">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-black text-ink dark:text-white">Item added to cart</p>
              <p className="line-clamp-1 text-xs font-semibold text-violet-950/60 dark:text-violet-100/65">{property.title}</p>
            </div>
            <button type="button" className="btn-primary min-h-11 shrink-0 px-5" onClick={() => router.push("/cart")}>
              Go to Cart
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
