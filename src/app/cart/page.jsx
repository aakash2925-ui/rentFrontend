"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, CreditCard, Edit3, Loader2, MapPin, Plus, ShieldCheck, ShoppingCart, Trash2, XCircle } from "lucide-react";
import api, { uploadUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { calculateRentalPricing } from "@/lib/rentalPricing";
import { minRentalDaysOf, rentalDaysBetween } from "@/lib/itemFields";

const steps = ["Cart", "Address", "Payment", "Confirmation", "KYC"];

function toDateInputValue(date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function addDays(value, days) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}

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

const blankAddress = (user) => ({
  fullName: user?.name || "",
  mobileNumber: user?.phone || "",
  houseFlatNo: "",
  streetArea: "",
  landmark: "",
  city: "",
  state: "",
  pincode: ""
});

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, count, updateItem, removeItem, clearCart } = useCart();
  const { showToast } = useToast();
  const today = useMemo(() => toDateInputValue(new Date()), []);
  const stepRefs = useRef([]);
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressForm, setAddressForm] = useState(blankAddress(user));
  const [addressMode, setAddressMode] = useState("new");
  const [saveAddress, setSaveAddress] = useState(false);
  const [availability, setAvailability] = useState({ status: "idle", message: "", blockedItems: [] });
  const [dateAvailability, setDateAvailability] = useState({});
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [deliverySpeed, setDeliverySpeed] = useState("standard");
  const [promoCode, setPromoCode] = useState("");
  const [appliedVouchers, setAppliedVouchers] = useState({});
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoMessage, setPromoMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmedBookings, setConfirmedBookings] = useState([]);

  useEffect(() => {
    stepRefs.current[step]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [step]);

  useEffect(() => {
    if (!user) return;
    setAddressForm((current) => ({
      ...current,
      fullName: current.fullName || user.name || "",
      mobileNumber: current.mobileNumber || user.phone || ""
    }));
    api.get("/auth/addresses")
      .then(({ data }) => setAddresses(data.addresses || []))
      .catch(() => setAddresses([]));
  }, [user]);

  const pricedItems = useMemo(() => items.map((item) => {
    const rentalDays = rentalDaysBetween(item.startDate, item.endDate);
    const voucher = appliedVouchers[item._id];
    const pricing = calculateRentalPricing({
      rent: item.rent,
      deposit: item.deposit,
      quantity: 1,
      rentalDays,
      deliveryDistanceKm: 0,
      deliverySpeed,
      voucherCode: voucher?.code || "",
      voucherDiscountAmount: voucher?.discountAmount || 0,
      voucherMessage: voucher?.message || ""
    });
    return { ...item, rentalDays, pricing };
  }), [appliedVouchers, deliverySpeed, items]);

  const totals = useMemo(() => pricedItems.reduce((summary, item) => ({
    baseAmount: summary.baseAmount + item.pricing.baseAmount,
    discountAmount: summary.discountAmount + item.pricing.discountAmount,
    voucherDiscountAmount: summary.voucherDiscountAmount + item.pricing.voucherDiscountAmount,
    deposit: summary.deposit + Number(item.deposit || 0),
    deliveryCharge: summary.deliveryCharge + item.pricing.deliveryCharge,
    finalAmount: summary.finalAmount + item.pricing.finalAmount
  }), { baseAmount: 0, discountAmount: 0, voucherDiscountAmount: 0, deposit: 0, deliveryCharge: 0, finalAmount: 0 }), [pricedItems]);

  const addressPayload = useMemo(() => ({
    fullName: addressForm.fullName,
    mobileNumber: addressForm.mobileNumber,
    houseFlatNo: addressForm.houseFlatNo,
    streetArea: addressForm.streetArea,
    landmark: addressForm.landmark,
    city: addressForm.city,
    state: addressForm.state,
    pincode: addressForm.pincode
  }), [addressForm]);

  const deliveryAddress = [addressForm.houseFlatNo, addressForm.streetArea, addressForm.landmark, addressForm.city, addressForm.state, addressForm.pincode].filter(Boolean).join(", ");

  const validateCart = useCallback(() => {
    if (!user) return "Please login before checkout.";
    if (!items.length) return "Your cart is empty.";
    for (const item of items) {
      const minDays = minRentalDaysOf(item);
      const days = rentalDaysBetween(item.startDate, item.endDate);
      if (!item.startDate) return `Select start date for ${item.title}.`;
      if (!item.endDate) return `Select end date for ${item.title}.`;
      if (item.startDate < today) return `Start date for ${item.title} cannot be before today.`;
      if (item.endDate < item.startDate) return `End date for ${item.title} cannot be before start date.`;
      if (days < minDays) return `${item.title} requires at least ${minDays} rental day(s).`;
      if (dateAvailability[item._id]?.status === "checking") return `Checking availability for ${item.title}.`;
      if (dateAvailability[item._id]?.status === "unavailable") return dateAvailability[item._id].message || `${item.title} is not available for selected dates.`;
    }
    return "";
  }, [dateAvailability, items, today, user]);

  const validateAddress = useCallback(() => {
    if (!addressForm.fullName.trim()) return "Full name is required.";
    if (!addressForm.mobileNumber.trim()) return "Mobile number is required.";
    if (!addressForm.houseFlatNo.trim()) return "House/flat number is required.";
    if (!addressForm.streetArea.trim()) return "Street/area is required.";
    if (!addressForm.city.trim()) return "City is required.";
    if (!addressForm.state.trim()) return "State is required.";
    if (!/^\d{6}$/.test(addressForm.pincode)) return "Enter a valid 6-digit PIN code.";
    if (availability.status !== "available") return "Selected address is not serviceable for all cart items.";
    return "";
  }, [addressForm, availability.status]);

  const checkServiceability = useCallback(async (pin = addressForm.pincode) => {
    if (!items.length || !/^\d{6}$/.test(pin)) {
      setAvailability({ status: "idle", message: "", blockedItems: [] });
      return;
    }
    setAvailability({ status: "checking", message: "Checking all items...", blockedItems: [] });
    try {
      const results = await Promise.all(items.map((item) => api.get(`/properties/${item._id}/availability`, { params: { pincode: pin, startDate: item.startDate, endDate: item.endDate } })));
      const blockedItems = results
        .map((result, index) => ({ item: items[index], data: result.data }))
        .filter((result) => !result.data.available)
        .map(({ item, data }) => ({ _id: item._id, title: item.title, message: data.message || "Not serviceable at this PIN code" }));
      setAvailability(blockedItems.length
        ? { status: "unavailable", message: "Some cart items are not serviceable at this PIN code.", blockedItems }
        : { status: "available", message: "All items are serviceable at this address.", blockedItems: [] });
    } catch (err) {
      setAvailability({ status: "unavailable", message: err.response?.data?.message || "Unable to check serviceability", blockedItems: [] });
    }
  }, [addressForm.pincode, items]);

  useEffect(() => {
    setAvailability({ status: "idle", message: "", blockedItems: [] });
    if (!/^\d{6}$/.test(addressForm.pincode)) return undefined;
    const timer = setTimeout(() => checkServiceability(addressForm.pincode), 500);
    return () => clearTimeout(timer);
  }, [addressForm.pincode, checkServiceability]);

  useEffect(() => {
    const checkableItems = items.filter((item) => item.startDate && item.endDate && /^\d{6}$/.test(String(item.deliveryPincode || item.pincode || "")));
    setDateAvailability((current) => {
      const next = {};
      checkableItems.forEach((item) => {
        next[item._id] = current[item._id]?.status === "unavailable" ? current[item._id] : { status: "checking", message: "Checking date availability..." };
      });
      return next;
    });
    if (!checkableItems.length) return undefined;

    let cancelled = false;
    const timer = setTimeout(async () => {
      const results = await Promise.all(checkableItems.map((item) => (
        api.get(`/properties/${item._id}/availability`, {
          params: {
            pincode: item.deliveryPincode || item.pincode,
            startDate: item.startDate,
            endDate: item.endDate
          }
        })
          .then(({ data }) => ({ item, data }))
          .catch((err) => ({ item, data: { available: false, message: err.response?.data?.message || "Unable to check date availability" } }))
      )));
      if (cancelled) return;
      const next = {};
      results.forEach(({ item, data }) => {
        next[item._id] = {
          status: data.available ? "available" : "unavailable",
          message: data.available ? "Available for selected dates" : data.message,
          nextAvailableAfter: data.nextAvailableAfter || data.nextAvailableAt || ""
        };
      });
      setDateAvailability(next);
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [items]);

  const goNext = async () => {
    const message = step === 0 ? validateCart() : step === 1 ? validateAddress() : "";
    if (message) {
      setError(message);
      showToast(message, "error");
      if (!user) router.push("/login");
      return;
    }
    if (step === 1 && saveAddress) {
      try {
        const request = addressMode === "edit" && selectedAddressId
          ? api.put(`/auth/addresses/${selectedAddressId}`, addressPayload)
          : api.post("/auth/addresses", addressPayload);
        const { data } = await request;
        setAddresses(data.addresses || []);
        setSaveAddress(false);
        showToast("Address saved");
      } catch (err) {
        const text = err.response?.data?.message || "Unable to save address";
        setError(text);
        showToast(text, "error");
        return;
      }
    }
    setError("");
    setStep((current) => {
      const next = Math.min(steps.length - 1, current + 1);
      setMaxStep((allowed) => Math.max(allowed, next));
      return next;
    });
  };

  const fillAddress = (address) => {
    setSelectedAddressId(address._id);
    setAddressMode("edit");
    setSaveAddress(false);
    setAddressForm({
      fullName: address.fullName || "",
      mobileNumber: address.mobileNumber || "",
      houseFlatNo: address.houseFlatNo || "",
      streetArea: address.streetArea || "",
      landmark: address.landmark || "",
      city: address.city || "",
      state: address.state || "",
      pincode: address.pincode || ""
    });
  };

  const startNewAddress = () => {
    setAddressMode("new");
    setSelectedAddressId("");
    setSaveAddress(true);
    setAddressForm(blankAddress(user));
  };

  const deleteAddress = async (id) => {
    if (!window.confirm("Delete this saved address?")) return;
    try {
      const { data } = await api.delete(`/auth/addresses/${id}`);
      setAddresses(data.addresses || []);
      if (selectedAddressId === id) startNewAddress();
      showToast("Address deleted");
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to delete address", "error");
    }
  };

  const applyPromoCode = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) {
      setPromoMessage({ type: "error", text: "Enter a promo code." });
      return;
    }
    const validationError = validateCart();
    if (validationError) {
      setPromoMessage({ type: "error", text: validationError });
      showToast(validationError, "error");
      return;
    }

    setPromoLoading(true);
    setPromoMessage({ type: "", text: "" });
    try {
      const results = await Promise.all(items.map((item) => api.post("/vouchers/apply", {
        code,
        property: item._id,
        startDate: item.startDate,
        endDate: item.endDate,
        quantity: 1,
        deliveryDistanceKm: 0,
        deliverySpeed
      })));
      const next = {};
      results.forEach(({ data }, index) => {
        next[items[index]._id] = data.voucher;
      });
      setAppliedVouchers(next);
      setPromoCode(code);
      const discount = results.reduce((total, { data }) => total + Number(data.voucher?.discountAmount || 0), 0);
      const message = `Promo ${code} applied. You save ₹${discount.toLocaleString()}.`;
      setPromoMessage({ type: "success", text: message });
      showToast(message);
    } catch (err) {
      setAppliedVouchers({});
      const message = err.response?.data?.message || "Invalid promo code.";
      setPromoMessage({ type: "error", text: message });
      showToast(message, "error");
    } finally {
      setPromoLoading(false);
    }
  };

  const removePromoCode = () => {
    setAppliedVouchers({});
    setPromoCode("");
    setPromoMessage({ type: "", text: "" });
  };

  const clearAppliedPromo = () => {
    setAppliedVouchers({});
    setPromoMessage({ type: "", text: "" });
  };

  const payloadForItem = (item) => ({
    property: item._id,
    fullName: addressForm.fullName,
    mobileNumber: addressForm.mobileNumber,
    phone: addressForm.mobileNumber,
    startDate: item.startDate,
    endDate: item.endDate,
    quantity: 1,
    houseFlatNo: addressForm.houseFlatNo,
    streetArea: addressForm.streetArea,
    landmark: addressForm.landmark,
    city: addressForm.city,
    state: addressForm.state,
    pincode: addressForm.pincode,
    deliveryAddress,
    deliveryDistanceKm: 0,
    deliverySpeed,
    voucherCode: item.pricing?.voucher?.valid ? item.pricing.voucher.code : "",
    message: `Cart checkout booking for ${item.title}.`
  });

  const confirmCod = async () => {
    const bookings = [];
    for (const item of items) {
      const { data } = await api.post("/bookings/cod", payloadForItem(item));
      bookings.push(data.booking);
    }
    return bookings;
  };

  const payItemWithRazorpay = async (item) => {
    const { data } = await api.post("/bookings/razorpay/order", payloadForItem(item));
    await loadRazorpay();
    return new Promise((resolve, reject) => {
      const checkout = new window.Razorpay({
        key: data.key,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "Zasoota",
        description: item.title,
        order_id: data.order.id,
        prefill: { name: addressForm.fullName || user?.name, email: user?.email, contact: addressForm.mobileNumber },
        theme: { color: "#6d28d9" },
        handler: async (response) => {
          try {
            await api.post("/bookings/razorpay/verify", { bookingId: data.booking._id, ...response });
            resolve(data.booking);
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

  const confirmPayment = async () => {
    const message = validateCart() || validateAddress();
    if (message) {
      setError(message);
      showToast(message, "error");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const bookings = paymentMethod === "cod"
        ? await confirmCod()
        : await (async () => {
          const paidBookings = [];
          for (const item of items) paidBookings.push(await payItemWithRazorpay(item));
          return paidBookings;
        })();
      setConfirmedBookings(bookings);
      clearCart();
      showToast(paymentMethod === "cod" ? "Booking confirmed with Cash on Delivery" : "Payment successful");
      setMaxStep(4);
      setStep(3);
    } catch (err) {
      const text = err.response?.data?.message || err.message || "Unable to confirm booking";
      setError(text);
      showToast(text, "error");
    } finally {
      setLoading(false);
    }
  };

  if (!items.length && !confirmedBookings.length) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-mist text-meadow shadow-soft dark:bg-white/10">
          <ShoppingCart className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-3xl font-black text-ink dark:text-white">Your cart is empty</h1>
        <p className="mt-2 text-violet-950/65 dark:text-violet-100/70">Add rental items with dates and delivery pincode to start checkout.</p>
        <Link href="/items" className="btn-primary mt-6">Browse items</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-7">
        <p className="text-sm font-bold uppercase tracking-wide text-meadow">Rental checkout</p>
        <h1 className="mt-2 text-4xl font-black text-ink dark:text-white">Cart checkout</h1>
      </div>
      <div className="mb-6 overflow-x-auto pb-1">
        <div className="flex min-w-max items-center gap-2 rounded-[1.35rem] border border-violet-100 bg-white/90 p-2 shadow-soft dark:border-violet-900/70 dark:bg-white/10">
          {steps.map((label, index) => (
            <button
              key={label}
              ref={(node) => { stepRefs.current[index] = node; }}
              type="button"
              disabled={index > maxStep}
              onClick={() => index <= maxStep && setStep(index)}
              className={`flex min-w-28 items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-sm font-black transition ${
                step === index ? "bg-violet-700 text-white shadow-soft" : index <= maxStep ? "bg-violet-50 text-violet-800 hover:bg-violet-100 dark:bg-white/10 dark:text-violet-100" : "cursor-not-allowed bg-stone-100 text-stone-400 dark:bg-white/5 dark:text-white/35"
              }`}
            >
              <span className={`grid h-8 w-8 place-items-center rounded-full ${step === index ? "bg-white text-violet-700" : "bg-white/80 text-violet-700 dark:bg-white/15 dark:text-white"}`}>
                {index < maxStep ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-700 dark:bg-red-950/30 dark:text-red-200">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="min-w-0 rounded-[1.75rem] border border-violet-100 bg-white/90 p-5 shadow-soft dark:border-violet-900/70 dark:bg-white/10">
          {step === 0 && (
            <CartReview items={pricedItems} today={today} updateItem={updateItem} removeItem={removeItem} clearCart={clearCart} dateAvailability={dateAvailability} />
          )}
          {step === 1 && (
            <AddressStep
              addresses={addresses}
              addressForm={addressForm}
              setAddressForm={setAddressForm}
              fillAddress={fillAddress}
              startNewAddress={startNewAddress}
              deleteAddress={deleteAddress}
              saveAddress={saveAddress}
              setSaveAddress={setSaveAddress}
              addressMode={addressMode}
              selectedAddressId={selectedAddressId}
              availability={availability}
              removeItem={removeItem}
            />
          )}
          {step === 2 && (
            <PaymentStep
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              deliverySpeed={deliverySpeed}
              setDeliverySpeed={setDeliverySpeed}
              totals={totals}
              promoCode={promoCode}
              setPromoCode={setPromoCode}
              applyPromoCode={applyPromoCode}
              removePromoCode={removePromoCode}
              clearAppliedPromo={clearAppliedPromo}
              promoLoading={promoLoading}
              promoMessage={promoMessage}
              hasAppliedPromo={Object.keys(appliedVouchers).length > 0}
            />
          )}
          {step === 3 && (
            <ConfirmationStep bookings={confirmedBookings} paymentMethod={paymentMethod} />
          )}
          {step === 4 && (
            <KycStep user={user} />
          )}
          <div className="mt-6 grid gap-3 border-t border-violet-100 pt-5 dark:border-violet-900/70 sm:grid-cols-2">
            {step > 0 && step < 3 && <button className="btn-secondary" type="button" onClick={() => setStep((current) => Math.max(0, current - 1))}>Back</button>}
            {step < 2 && <button className="btn-primary" type="button" onClick={goNext}>{step === 0 ? "Continue to Address" : "Continue to Payment"}</button>}
            {step === 2 && <button className="btn-primary sm:col-span-2" type="button" disabled={loading} onClick={confirmPayment}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} {loading ? "Processing..." : paymentMethod === "cod" ? "Confirm COD Booking" : "Pay and Confirm"}</button>}
            {step === 3 && <button className="btn-primary sm:col-span-2" type="button" onClick={() => { setMaxStep(4); setStep(4); }}>Continue to KYC</button>}
          </div>
        </section>

        <aside className="h-fit rounded-[1.75rem] border border-violet-100 bg-white/90 p-5 shadow-soft dark:border-violet-900/70 dark:bg-white/10 lg:sticky lg:top-24">
          <h2 className="text-xl font-black text-ink dark:text-white">Order summary</h2>
          <div className="mt-5 space-y-3 text-sm">
            <SummaryRow label="Items" value={count || confirmedBookings.length} />
            <SummaryRow label="Base rental" value={`₹${totals.baseAmount.toLocaleString()}`} />
            <SummaryRow label="Rental discount" value={`-₹${totals.discountAmount.toLocaleString()}`} />
            {totals.voucherDiscountAmount > 0 && <SummaryRow label={`Promo (${promoCode})`} value={`-₹${totals.voucherDiscountAmount.toLocaleString()}`} />}
            <SummaryRow label="Security deposit" value={`₹${totals.deposit.toLocaleString()}`} />
            <SummaryRow label="Delivery charges" value={totals.deliveryCharge ? `₹${totals.deliveryCharge.toLocaleString()}` : "Free"} />
            <SummaryRow label="Taxes" value="₹0" />
            <div className="border-t border-violet-100 pt-3 dark:border-violet-900/70">
              <SummaryRow label="Final payable" value={`₹${totals.finalAmount.toLocaleString()}`} strong />
            </div>
          </div>
          {step < 3 && <Link href="/items" className="btn-secondary mt-5 w-full">Add more items</Link>}
        </aside>
      </div>
    </div>
  );
}

function CartReview({ items, today, updateItem, removeItem, clearCart, dateAvailability }) {
  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-ink dark:text-white">Cart Review</h2>
          <p className="mt-1 text-sm text-violet-950/60 dark:text-violet-100/65">Review items, rental dates, and pricing before adding your address.</p>
        </div>
        <button type="button" onClick={clearCart} className="btn-secondary"><Trash2 className="h-4 w-4" /> Clear cart</button>
      </div>
      <div className="space-y-4">
        {items.map((item) => {
          const minDays = minRentalDaysOf(item);
          const itemDateAvailability = dateAvailability[item._id];
          const useAvailableDate = () => {
            if (!itemDateAvailability?.nextAvailableAfter) return;
            const startDate = String(itemDateAvailability.nextAvailableAfter).slice(0, 10);
            const duration = rentalDaysBetween(item.startDate, item.endDate) || minDays;
            updateItem(item._id, { startDate, endDate: addDays(startDate, duration) });
          };
          return (
            <article key={item._id} className="grid gap-4 rounded-2xl border border-violet-100 bg-mist/70 p-4 dark:border-violet-900/70 dark:bg-white/10 sm:grid-cols-[132px_1fr]">
              <Link href={`/items/${item._id}`} className="overflow-hidden rounded-xl bg-white dark:bg-stone-950">
                <img src={uploadUrl(item.images?.[0])} alt={item.title} className="h-32 w-full object-cover transition hover:scale-105" />
              </Link>
              <div className="min-w-0">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <Link href={`/items/${item._id}`} className="break-words text-lg font-black text-ink hover:text-meadow dark:text-white">{item.title}</Link>
                    <p className="mt-1 text-sm text-violet-950/60 dark:text-violet-100/65">{item.itemType}</p>
                  </div>
                  <button type="button" onClick={() => removeItem(item._id)} className="inline-flex items-center gap-2 rounded-xl border border-red-100 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-50 dark:border-red-900/70 dark:hover:bg-red-950/30">
                    <Trash2 className="h-4 w-4" /> Remove
                  </button>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-black">Start date</span>
                    <input className="field" type="date" min={today} value={item.startDate || ""} onChange={(event) => {
                      const startDate = event.target.value;
                      updateItem(item._id, {
                        startDate,
                        endDate: item.endDate && item.endDate >= startDate ? item.endDate : addDays(startDate, minDays)
                      });
                    }} />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-black">End date</span>
                    <input className="field" type="date" min={item.startDate || today} value={item.endDate || ""} onChange={(event) => updateItem(item._id, { endDate: event.target.value })} />
                  </label>
                </div>
                {itemDateAvailability?.status === "checking" && (
                  <div className="mt-3 flex items-center gap-2 rounded-2xl border border-violet-100 bg-white px-4 py-3 text-sm font-black text-violet-700 dark:border-violet-900/70 dark:bg-stone-950/60 dark:text-violet-100">
                    <Loader2 className="h-4 w-4 animate-spin" /> Checking selected dates...
                  </div>
                )}
                {itemDateAvailability?.status === "unavailable" && (
                  <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-black text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                    <p>{itemDateAvailability.message || "This item is not available for selected dates."}</p>
                    {itemDateAvailability.nextAvailableAfter && (
                      <button className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-black text-amber-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft dark:bg-white/10 dark:text-amber-100" type="button" onClick={useAvailableDate}>
                        Use {String(itemDateAvailability.nextAvailableAfter).slice(0, 10)} as start date
                      </button>
                    )}
                  </div>
                )}
                {itemDateAvailability?.status === "available" && (
                  <div className="mt-3 flex items-center gap-2 rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-black text-green-700 dark:border-green-900/70 dark:bg-green-950/30 dark:text-green-100">
                    <CheckCircle2 className="h-4 w-4" /> Available for selected dates
                  </div>
                )}
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <MiniStat label="Rental days" value={item.rentalDays || "-"} />
                  <MiniStat label="Daily rent" value={`₹${Number(item.rent || 0).toLocaleString()}`} />
                  <MiniStat label="Payable" value={`₹${item.pricing.finalAmount.toLocaleString()}`} />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function AddressStep({ addresses, addressForm, setAddressForm, fillAddress, startNewAddress, deleteAddress, saveAddress, setSaveAddress, addressMode, selectedAddressId, availability, removeItem }) {
  const update = (key, value) => setAddressForm((current) => ({ ...current, [key]: value }));
  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-ink dark:text-white">Address Selection</h2>
          <p className="mt-1 text-sm text-violet-950/60 dark:text-violet-100/65">Choose or add an address. PIN serviceability is checked for every item.</p>
        </div>
        <button className="btn-secondary" type="button" onClick={startNewAddress}><Plus className="h-4 w-4" /> Add address</button>
      </div>
      {addresses.length > 0 && (
        <div className="mb-5 grid gap-3">
          {addresses.map((address) => (
            <article key={address._id} className={`rounded-2xl border p-4 transition ${selectedAddressId === address._id ? "border-meadow bg-meadow/10 shadow-soft" : "border-violet-100 bg-mist/70 dark:border-violet-900/70 dark:bg-white/10"}`}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="break-words font-black text-ink dark:text-white">{address.fullName} · {address.mobileNumber}</p>
                  <p className="mt-1 break-words text-sm leading-6 text-violet-950/65 dark:text-violet-100/70">{[address.houseFlatNo, address.streetArea, address.landmark, address.city, address.state, address.pincode].filter(Boolean).join(", ")}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn-primary px-3 py-2 text-xs" type="button" onClick={() => fillAddress(address)}>Use</button>
                  <button className="btn-secondary px-3 py-2 text-xs" type="button" onClick={() => fillAddress(address)}><Edit3 className="h-4 w-4" /> Edit</button>
                  <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-50 dark:border-red-900/70 dark:bg-white/10 dark:text-red-300 dark:hover:bg-red-950/30" type="button" onClick={() => deleteAddress(address._id)}><Trash2 className="h-4 w-4" /> Delete</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Full Name" value={addressForm.fullName} onChange={(value) => update("fullName", value)} />
        <Field label="Mobile Number" value={addressForm.mobileNumber} onChange={(value) => update("mobileNumber", value)} />
        <Field label="House/Flat No." value={addressForm.houseFlatNo} onChange={(value) => update("houseFlatNo", value)} />
        <Field label="Street/Area" value={addressForm.streetArea} onChange={(value) => update("streetArea", value)} />
        <Field label="Landmark" optional value={addressForm.landmark} onChange={(value) => update("landmark", value)} />
        <Field label="City" value={addressForm.city} onChange={(value) => update("city", value)} />
        <Field label="State" value={addressForm.state} onChange={(value) => update("state", value)} />
        <label className="space-y-2">
          <span className="text-sm font-black text-violet-950 dark:text-white">PIN Code <span className="text-clay">*</span></span>
          <input className="field h-12 text-base font-black tracking-wide" inputMode="numeric" maxLength={6} value={addressForm.pincode} onChange={(event) => update("pincode", event.target.value.replace(/\D/g, "").slice(0, 6))} />
        </label>
      </div>
      <div className={`mt-4 rounded-2xl border p-4 text-sm font-black ${
        availability.status === "available" ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900/70 dark:bg-green-950/30 dark:text-green-200" : availability.status === "unavailable" ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200" : "border-violet-100 bg-mist/70 text-violet-950/60 dark:border-violet-900/70 dark:bg-white/10 dark:text-violet-100/65"
      }`}>
        <div className="flex items-start gap-2">
          {availability.status === "checking" ? <Loader2 className="mt-0.5 h-5 w-5 animate-spin" /> : availability.status === "available" ? <CheckCircle2 className="mt-0.5 h-5 w-5" /> : availability.status === "unavailable" ? <XCircle className="mt-0.5 h-5 w-5" /> : <MapPin className="mt-0.5 h-5 w-5" />}
          <p>{availability.message || "Enter a 6-digit PIN code to check serviceability."}</p>
        </div>
        {availability.blockedItems?.length > 0 && (
          <div className="mt-4 space-y-2">
            {availability.blockedItems.map((item) => (
              <div key={item._id} className="flex flex-col gap-2 rounded-xl bg-white/75 p-3 text-red-700 dark:bg-stone-950/40 dark:text-red-200 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="break-words font-black">{item.title}</p>
                  <p className="mt-1 text-xs font-semibold opacity-80">{item.message}</p>
                </div>
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-50 dark:border-red-900/70 dark:bg-white/10 dark:text-red-200 dark:hover:bg-red-950/30"
                  onClick={() => removeItem(item._id)}
                >
                  <Trash2 className="h-4 w-4" /> Remove from cart
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <label className="mt-4 flex items-start gap-3 rounded-2xl border border-violet-100 bg-mist/70 p-4 text-sm font-bold dark:border-violet-900/70 dark:bg-white/10">
        <input className="mt-1 h-4 w-4 accent-meadow" type="checkbox" checked={saveAddress} onChange={(event) => setSaveAddress(event.target.checked)} />
        <span>{addressMode === "edit" && selectedAddressId ? "Update selected saved address" : "Save this address for future use"}</span>
      </label>
    </div>
  );
}

function PaymentStep({ paymentMethod, setPaymentMethod, deliverySpeed, setDeliverySpeed, totals, promoCode, setPromoCode, applyPromoCode, removePromoCode, clearAppliedPromo, promoLoading, promoMessage, hasAppliedPromo }) {
  return (
    <div>
      <h2 className="text-2xl font-black text-ink dark:text-white">Payment</h2>
      <p className="mt-1 text-sm text-violet-950/60 dark:text-violet-100/65">Choose delivery speed and payment method.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {[["standard", "Standard delivery", "Within 24 hours", "Free"], ["fast", "Fast delivery", "Within 2 hours", "₹199 per item"]].map(([value, title, text, price]) => (
          <label key={value} className={`rounded-2xl border p-4 transition ${deliverySpeed === value ? "border-meadow bg-meadow/10" : "border-violet-100 bg-mist/70 dark:border-violet-900/70 dark:bg-white/10"}`}>
            <input className="mr-2 accent-meadow" type="radio" checked={deliverySpeed === value} onChange={() => setDeliverySpeed(value)} />
            <span className="font-black">{title}</span>
            <p className="mt-1 text-sm text-violet-950/60 dark:text-violet-100/65">{text} · {price}</p>
          </label>
        ))}
      </div>
      <div className="mt-5 grid gap-3">
        {[["cod", "Cash on Delivery", "Confirm now and pay during delivery handover."], ["razorpay", "Razorpay Online Payment", "Pay with UPI, cards, net banking, or wallets."]].map(([value, title, text]) => (
          <label key={value} className={`rounded-2xl border p-4 transition ${paymentMethod === value ? "border-meadow bg-meadow/10" : "border-violet-100 bg-mist/70 dark:border-violet-900/70 dark:bg-white/10"}`}>
            <input className="mr-2 accent-meadow" type="radio" checked={paymentMethod === value} onChange={() => setPaymentMethod(value)} />
            <span className="font-black">{title}</span>
            <p className="mt-1 text-sm text-violet-950/60 dark:text-violet-100/65">{text}</p>
          </label>
        ))}
      </div>
      <div className="mt-5 rounded-2xl border border-violet-100 bg-mist/70 p-4 dark:border-violet-900/70 dark:bg-white/10">
        <h3 className="text-sm font-black uppercase tracking-wide text-meadow">Promo code</h3>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            className="field uppercase"
            placeholder="Enter voucher code"
            value={promoCode}
            onChange={(event) => {
              setPromoCode(event.target.value.toUpperCase());
              if (promoMessage.text || hasAppliedPromo) clearAppliedPromo();
            }}
          />
          <button className="btn-primary shrink-0" type="button" disabled={promoLoading} onClick={applyPromoCode}>
            {promoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {promoLoading ? "Checking" : "Apply"}
          </button>
          {hasAppliedPromo && <button className="btn-secondary shrink-0" type="button" onClick={removePromoCode}>Remove</button>}
        </div>
        {promoMessage.text && (
          <p className={`mt-3 text-sm font-black ${promoMessage.type === "success" ? "text-green-700 dark:text-green-200" : "text-red-700 dark:text-red-200"}`}>
            {promoMessage.text}
          </p>
        )}
      </div>
      <div className="mt-5 rounded-2xl bg-mist/70 p-4 text-sm dark:bg-white/10">
        {totals.voucherDiscountAmount > 0 && <SummaryRow label="Promo discount" value={`-₹${totals.voucherDiscountAmount.toLocaleString()}`} />}
        <SummaryRow label="Final payable" value={`₹${totals.finalAmount.toLocaleString()}`} strong />
      </div>
    </div>
  );
}

function ConfirmationStep({ bookings, paymentMethod }) {
  return (
    <div className="text-center">
      <CheckCircle2 className="mx-auto h-14 w-14 text-green-500" />
      <h2 className="mt-4 text-3xl font-black text-ink dark:text-white">Booking confirmed</h2>
      <p className="mt-2 text-violet-950/65 dark:text-violet-100/70">{paymentMethod === "cod" ? "Your COD booking request has been created." : "Payment verified and booking confirmed."}</p>
      <div className="mt-5 grid gap-3 text-left">
        {bookings.map((booking) => (
          <div key={booking._id} className="rounded-2xl bg-mist/70 p-4 text-sm dark:bg-white/10">
            <p className="text-violet-950/60 dark:text-violet-100/65">Booking ID</p>
            <p className="mt-1 break-all font-black text-ink dark:text-white">{booking._id}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function KycStep({ user }) {
  const approved = user?.kyc?.status === "approved";
  return (
    <div className="rounded-2xl border border-violet-100 bg-mist/70 p-5 dark:border-violet-900/70 dark:bg-white/10">
      <div className="flex items-start gap-3">
        <ShieldCheck className={`mt-1 h-7 w-7 shrink-0 ${approved ? "text-green-600" : "text-meadow"}`} />
        <div>
          <h2 className="text-2xl font-black text-ink dark:text-white">{approved ? "KYC verified" : "Complete KYC verification"}</h2>
          <p className="mt-2 leading-7 text-violet-950/65 dark:text-violet-100/70">
            {approved ? "Your identity is verified for rental handover." : "Your booking is confirmed. Delivery or handover remains restricted until KYC is verified. Complete OTP-based KYC from your dashboard profile. DigiLocker provider integration can be connected here once provider credentials are available."}
          </p>
          {!approved && <Link href="/dashboard?section=profile" className="btn-primary mt-5">Complete KYC</Link>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, optional = false, value, onChange }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-black text-violet-950 dark:text-white">{label} {!optional && <span className="text-clay">*</span>}</span>
      <input className="field" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl bg-white p-3 text-sm dark:bg-stone-950/50">
      <span className="text-violet-950/60 dark:text-violet-100/65">{label}</span>
      <strong className="mt-1 block text-ink dark:text-white">{value}</strong>
    </div>
  );
}

function SummaryRow({ label, value, strong = false }) {
  return (
    <div className={`flex justify-between gap-4 py-1 ${strong ? "text-base font-black" : ""}`}>
      <span className="text-violet-950/60 dark:text-violet-100/65">{label}</span>
      <strong className="text-right text-ink dark:text-white">{value}</strong>
    </div>
  );
}
