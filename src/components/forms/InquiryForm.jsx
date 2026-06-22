"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronRight, CreditCard, IndianRupee, Loader2, LocateFixed, PackageCheck, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ErrorMessage from "@/components/common/ErrorMessage";
import { minRentalDaysOf, quantityOf, rentalDaysBetween } from "@/lib/itemFields";
import { calculateRentalPricing } from "@/lib/rentalPricing";
import { useToast } from "@/context/ToastContext";
import AddToCartButton from "@/components/cart/AddToCartButton";

const steps = ["Dates", "Pricing", "Payment", "Confirm"];

function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

export default function InquiryForm({ property }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    phone: user?.phone || "",
    startDate: "",
    endDate: "",
    quantity: 1,
    deliveryAddress: "",
    paymentMethod: "cod",
    message: `Hi, I want to rent ${property.title}.`
  });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [maxStep, setMaxStep] = useState(0);

  const rentalDays = rentalDaysBetween(form.startDate, form.endDate);
  const selectedQuantity = Number(form.quantity || 1);
  const deliveryDistanceKm = 0;
  const availableQuantity = quantityOf(property);
  const minRentalDays = minRentalDaysOf(property);
  const pricing = useMemo(() => calculateRentalPricing({
    rent: property.rent,
    deposit: property.deposit,
    quantity: selectedQuantity,
    rentalDays,
    deliveryDistanceKm
  }), [property.rent, property.deposit, selectedQuantity, rentalDays, deliveryDistanceKm]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const validate = useCallback(() => {
    if (!user) return "Please login before booking this item.";
    if (rentalDays < minRentalDays) return `Minimum rental duration is ${minRentalDays} day(s).`;
    if (selectedQuantity > availableQuantity) return `Only ${availableQuantity} item(s) available.`;
    if (selectedQuantity < 1) return "Quantity must be at least 1.";
    if (!form.phone.trim()) return "Phone number is required.";
    if (!form.deliveryAddress.trim()) return "Delivery address is required.";
    return "";
  }, [availableQuantity, form.deliveryAddress, form.phone, minRentalDays, rentalDays, selectedQuantity, user]);

  useEffect(() => {
    setError("");
  }, [step]);

  const nextStep = () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      showToast(validationError, "error");
      if (!user) router.push("/login");
      return;
    }
    setStep((current) => {
      const next = Math.min(steps.length - 1, current + 1);
      setMaxStep((allowed) => Math.max(allowed, next));
      return next;
    });
  };

  const detectLocation = async () => {
    if (!navigator.geolocation) {
      const message = "Location detection is not supported in this browser.";
      setError(message);
      showToast(message, "error");
      return;
    }

    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const fallbackAddress = `Current location: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}`
          );
          const data = await response.json();
          update("deliveryAddress", data.display_name || fallbackAddress);
          showToast("Location detected and added to address.");
        } catch {
          update("deliveryAddress", fallbackAddress);
          showToast("Location detected. Please add nearby landmark if needed.");
        } finally {
          setLocating(false);
        }
      },
      () => {
        const message = "Unable to detect location. Please allow location access or enter address manually.";
        setError(message);
        showToast(message, "error");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

  const payload = {
    property: property._id,
    phone: form.phone,
    startDate: form.startDate,
    endDate: form.endDate,
    quantity: selectedQuantity,
    deliveryAddress: form.deliveryAddress,
    deliveryDistanceKm: 0,
    message: form.message
  };

  const confirmCod = async () => {
    const { data } = await api.post("/bookings/cod", payload);
    setStatus(`Booking confirmed. Booking ID: ${data.booking._id}`);
    showToast("Booking confirmed with Cash on Delivery");
    router.push(`/booking-confirmation?booking=${data.booking._id}&method=cod`);
  };

  const confirmRazorpay = async () => {
    const { data } = await api.post("/bookings/razorpay/order", payload);
    await loadRazorpay();
    await new Promise((resolve, reject) => {
      const checkout = new window.Razorpay({
        key: data.key,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "Zasoota Rentals",
        description: property.title,
        order_id: data.order.id,
        prefill: { name: user?.name, email: user?.email, contact: form.phone },
        theme: { color: "#6d28d9" },
        handler: async (response) => {
          try {
            await api.post("/bookings/razorpay/verify", { bookingId: data.booking._id, ...response });
            showToast("Payment successful");
            router.push(`/booking-confirmation?booking=${data.booking._id}&method=razorpay`);
            resolve();
          } catch (err) {
            reject(err);
          }
        },
        modal: {
          ondismiss: async () => {
            await api.put(`/bookings/${data.booking._id}/payment-failed`, { status: "cancelled" }).catch(() => {});
            reject(new Error("Payment cancelled"));
          }
        }
      });
      checkout.open();
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      showToast(validationError, "error");
      if (!user) router.push("/login");
      return;
    }
    setLoading(true);
    setError("");
    setStatus("");
    try {
      if (form.paymentMethod === "cod") await confirmCod();
      else await confirmRazorpay();
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Unable to confirm booking";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-5 overflow-hidden rounded-[1.75rem] border border-violet-100 bg-white shadow-soft dark:border-violet-900/70 dark:bg-white/10">
      <div className="bg-gradient-to-br from-violet-950 via-violet-800 to-fuchsia-700 p-6 text-white md:p-7">
        <p className="text-sm font-bold uppercase tracking-wide text-violet-100">Rental checkout</p>
        <h2 className="mt-1 text-2xl font-black">Proceed to Rent</h2>
        <div className="mt-6 overflow-x-auto pb-1">
          <div className="flex min-w-max items-center gap-2 rounded-[1.35rem] border border-white/15 bg-white/10 p-2 backdrop-blur">
            {steps.map((label, index) => (
              <div key={label} className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={index > maxStep}
                  onClick={() => index <= maxStep && setStep(index)}
                  className={`group flex min-w-24 items-center gap-2 rounded-2xl px-3 py-2.5 text-left transition ${
                    step === index
                      ? "bg-white text-violet-950 shadow-soft"
                      : index <= maxStep
                        ? "bg-white/10 text-white hover:bg-white/20"
                        : "cursor-not-allowed text-white/40"
                  }`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                    step === index ? "bg-violet-700 text-white" : index <= maxStep ? "bg-white/20 text-white" : "bg-white/10 text-white/40"
                  }`}>
                    {index + 1}
                  </span>
                  <span className="text-sm font-black">{label}</span>
                </button>
                {index < steps.length - 1 && (
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                    index < maxStep ? "border-meadow/60 bg-meadow/20 text-meadow" : "border-white/15 bg-white/5 text-white/35"
                  }`}>
                    <ChevronRight className="h-4 w-4" />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-5 p-6 md:p-7">
        {error && <ErrorMessage message={error} />}
        {status && <div className="rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 dark:bg-green-950/40 dark:text-green-200">{status}</div>}

        {step === 0 && (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-black text-violet-950 dark:text-white">Start date</span>
                <input className="field" type="date" required value={form.startDate} onChange={(e) => update("startDate", e.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-black text-violet-950 dark:text-white">End date</span>
                <input className="field" type="date" required value={form.endDate} onChange={(e) => update("endDate", e.target.value)} />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-black text-violet-950 dark:text-white">Quantity</span>
                <input className="field" type="number" min="1" max={availableQuantity} required placeholder="Quantity" value={form.quantity} onChange={(e) => update("quantity", e.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-black text-violet-950 dark:text-white">Phone number</span>
                <input className="field" placeholder="Phone number" required value={form.phone} onChange={(e) => update("phone", e.target.value)} />
              </label>
            </div>
            <div className="space-y-4 rounded-[1.35rem] border border-violet-100 bg-mist/70 p-5 dark:border-violet-900/70 dark:bg-white/10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-black text-meadow"><Truck className="h-4 w-4" /> Doorstep delivery required</div>
                <button className="btn-secondary px-4 py-2 text-xs" type="button" onClick={detectLocation} disabled={locating}>
                  {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
                  {locating ? "Detecting..." : "Detect location"}
                </button>
              </div>
              <label className="space-y-2">
                <span className="text-sm font-black text-violet-950 dark:text-white">Delivery address</span>
                <textarea className="field min-h-28 resize-none" placeholder="House number, street, landmark, city" required value={form.deliveryAddress} onChange={(e) => update("deliveryAddress", e.target.value)} />
              </label>
              <p className="text-xs font-semibold text-violet-950/55 dark:text-violet-100/60">Auto-detected address can be edited before continuing.</p>
            </div>
          </div>
        )}

        {step === 1 && <PriceBreakdown pricing={pricing} rentalDays={rentalDays} deposit={property.deposit} />}

        {step === 2 && (
          <div className="grid gap-3">
            {[["cod", "Cash on Delivery", "Pay when the item reaches you. Payment status remains pending."], ["razorpay", "Online Payment (Razorpay)", "Pay securely now. Booking is marked paid after verification."]].map(([value, title, text]) => (
              <label key={value} className={`rounded-2xl border p-4 transition ${form.paymentMethod === value ? "border-meadow bg-meadow/10" : "border-violet-100 dark:border-violet-900/70"}`}>
                <input className="mr-2 accent-meadow" type="radio" name="paymentMethod" checked={form.paymentMethod === value} onChange={() => update("paymentMethod", value)} />
                <span className="font-black">{title}</span>
                <p className="mt-1 text-sm text-violet-950/60 dark:text-violet-100/65">{text}</p>
              </label>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <SummaryRow label="Item" value={property.title} />
            <SummaryRow label="Dates" value={`${form.startDate || "-"} to ${form.endDate || "-"}`} />
            <SummaryRow label="Rental days" value={rentalDays || "-"} />
            <SummaryRow label="Payment" value={form.paymentMethod === "cod" ? "Cash on Delivery" : "Razorpay"} />
            <PriceBreakdown pricing={pricing} rentalDays={rentalDays} deposit={property.deposit} compact />
            <textarea className="field min-h-24" placeholder="Message" required value={form.message} onChange={(e) => update("message", e.target.value)} />
          </div>
        )}

        <div className="grid gap-3 border-t border-violet-100 pt-5 dark:border-violet-900/70 sm:grid-cols-2">
          {step > 0 && <button className="btn-secondary" type="button" onClick={() => setStep((current) => Math.max(0, current - 1))}>Back</button>}
          {step < 3 ? (
            <button className="btn-primary" type="button" onClick={nextStep}>Continue</button>
          ) : (
            <button className="btn-primary" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : form.paymentMethod === "cod" ? <PackageCheck className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
              {loading ? "Processing..." : form.paymentMethod === "cod" ? "Confirm Booking" : "Pay and Confirm"}
            </button>
          )}
          {step === 0 && <AddToCartButton property={property} />}
        </div>
      </div>
    </form>
  );
}

function PriceBreakdown({ pricing, rentalDays, deposit, compact = false }) {
  return (
    <div className={`rounded-2xl border border-violet-100 bg-mist/70 p-4 text-sm dark:border-violet-900/70 dark:bg-white/10 ${compact ? "" : "space-y-1"}`}>
      <SummaryRow label="Rental days" value={rentalDays || "-"} />
      <SummaryRow label="Base price" value={`₹${pricing.baseAmount.toLocaleString()}`} />
      <SummaryRow label={`Discount (${pricing.discountPercentage}%)`} value={`-₹${pricing.discountAmount.toLocaleString()}`} />
      <SummaryRow label="Refundable deposit" value={`₹${Number(deposit || 0).toLocaleString()}`} />
      {pricing.deliveryCharge > 0 && <SummaryRow label="Delivery" value={`₹${pricing.deliveryCharge.toLocaleString()}`} />}
      <div className="mt-3 flex justify-between border-t border-violet-100 pt-3 text-base dark:border-violet-900/70"><span className="font-black">Final payable</span><strong className="text-meadow">₹{pricing.finalAmount.toLocaleString()}</strong></div>
      {pricing.discountAmount > 0 && <p className="mt-3 rounded-xl bg-green-50 px-3 py-2 text-sm font-black text-green-700 dark:bg-green-950/40 dark:text-green-200"><IndianRupee className="mr-1 inline h-4 w-4" /> You save ₹{pricing.discountAmount.toLocaleString()} on this booking. Long-term rental discount applied.</p>}
    </div>
  );
}

function SummaryRow({ label, value }) {
  return <div className="flex justify-between gap-4 py-1"><span className="text-violet-950/60 dark:text-violet-100/65">{label}</span><strong className="text-right text-ink dark:text-white">{value}</strong></div>;
}
