"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, Clock3, CreditCard, Edit3, Loader2, MapPin, Moon, Plus, ShieldCheck, ShoppingCart, Sparkles, SunMedium, Trash2, XCircle, Zap } from "lucide-react";
import api, { uploadUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { DELIVERY_TIME_SLOTS, calculateRentalPricing, deliverySpeedDetails } from "@/lib/rentalPricing";
import { minRentalDaysOf, rentalDaysBetween } from "@/lib/itemFields";

const checkoutSteps = ["Cart", "Address", "Delivery", "Payment", "Confirmation"];
const serviceableStates = ["Uttar Pradesh", "Haryana", "Delhi"];

function localMobileNumber(value = "") {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.startsWith("91") && digits.length >= 12 ? digits.slice(2, 12) : digits.slice(-10);
}

function toDateInputValue(date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function addDays(value, days) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
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
  mobileNumber: localMobileNumber(user?.phoneNumber || user?.phone || ""),
  email: user?.email || "",
  houseFlatNo: "",
  streetArea: "",
  landmark: "",
  city: "",
  state: "",
  pincode: ""
});

export default function CartPage() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
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
  const kycApproved = user?.kyc?.status === "approved";
  const steps = useMemo(() => (kycApproved ? checkoutSteps : [...checkoutSteps, "KYC"]), [kycApproved]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmedBookings, setConfirmedBookings] = useState([]);

  useEffect(() => {
    stepRefs.current[step]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [step]);

  useEffect(() => {
    if (!kycApproved) return;
    setMaxStep((current) => Math.min(current, checkoutSteps.length - 1));
    setStep((current) => Math.min(current, checkoutSteps.length - 1));
  }, [kycApproved]);

  useEffect(() => {
    if (!user) return;
    setAddressForm((current) => ({
      ...current,
      fullName: current.fullName || user.name || "",
      mobileNumber: localMobileNumber(current.mobileNumber || user.phoneNumber || user.phone || ""),
      email: current.email || user.email || ""
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
      deliverySpeed: "standard",
      voucherCode: voucher?.code || "",
      voucherDiscountAmount: voucher?.discountAmount || 0,
      voucherMessage: voucher?.message || ""
    });
    return { ...item, rentalDays, pricing };
  }), [appliedVouchers, items]);

  const selectedDelivery = useMemo(() => deliverySpeedDetails(deliverySpeed), [deliverySpeed]);
  const totals = useMemo(() => {
    const itemTotals = pricedItems.reduce((summary, item) => ({
      baseAmount: summary.baseAmount + item.pricing.baseAmount,
      discountAmount: summary.discountAmount + item.pricing.discountAmount,
      voucherDiscountAmount: summary.voucherDiscountAmount + item.pricing.voucherDiscountAmount,
      deposit: summary.deposit + Number(item.deposit || 0),
      finalAmount: summary.finalAmount + item.pricing.finalAmount
    }), { baseAmount: 0, discountAmount: 0, voucherDiscountAmount: 0, deposit: 0, finalAmount: 0 });
    const deliveryCharge = Number(selectedDelivery.charge || 0);
    return {
      ...itemTotals,
      deliveryCharge,
      finalAmount: itemTotals.finalAmount + deliveryCharge
    };
  }, [pricedItems, selectedDelivery]);

  const addressPayload = useMemo(() => ({
    fullName: addressForm.fullName,
    mobileNumber: addressForm.mobileNumber,
    email: addressForm.email,
    houseFlatNo: addressForm.houseFlatNo,
    streetArea: addressForm.streetArea,
    landmark: addressForm.landmark,
    city: addressForm.city,
    state: addressForm.state,
    pincode: addressForm.pincode
  }), [addressForm]);

  const deliveryAddress = [addressForm.houseFlatNo, addressForm.streetArea, addressForm.landmark, addressForm.city, addressForm.state, addressForm.pincode].filter(Boolean).join(", ");
  const deliveryDate = useMemo(() => {
    const startDates = pricedItems.map((item) => item.startDate).filter(Boolean).sort();
    return startDates[0] || "";
  }, [pricedItems]);

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
      if (dateAvailability[item._id]?.status === "unavailable") return `${item.title} is booked. Please book after the booked period.`;
    }
    return "";
  }, [dateAvailability, items, today, user]);

  const validateAddress = useCallback(() => {
    if (!addressForm.fullName.trim()) return "Full name is required.";
    if (!addressForm.mobileNumber.trim()) return "Mobile number is required.";
    if (!/^[6-9]\d{9}$/.test(localMobileNumber(addressForm.mobileNumber))) return "Enter a valid 10-digit mobile number.";
    if (!addressForm.email.trim()) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addressForm.email.trim())) return "Enter a valid email address.";
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
          nextAvailableAfter: data.nextAvailableAfter || data.nextAvailableAt || "",
          bookedPeriods: data.bookedPeriods || []
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
    let nextAddressPayload = addressPayload;
    if (step === 1) {
      try {
        const { data } = await api.put("/auth/checkout-contact", {
          fullName: addressForm.fullName,
          mobileNumber: addressForm.mobileNumber,
          email: addressForm.email
        });
        updateUser(data.user);
        nextAddressPayload = {
          ...addressPayload,
          fullName: data.user.name || addressPayload.fullName,
          mobileNumber: localMobileNumber(data.user.phoneNumber || data.user.phone || addressPayload.mobileNumber),
          email: data.user.email || addressPayload.email
        };
        setAddressForm((current) => ({
          ...current,
          fullName: nextAddressPayload.fullName,
          mobileNumber: nextAddressPayload.mobileNumber,
          email: nextAddressPayload.email
        }));
      } catch (err) {
        const text = err.response?.data?.message || "Unable to save contact details";
        setError(text);
        showToast(text, "error");
        return;
      }
    }
    if (step === 1 && saveAddress) {
      try {
        const request = addressMode === "edit" && selectedAddressId
          ? api.put(`/auth/addresses/${selectedAddressId}`, nextAddressPayload)
          : api.post("/auth/addresses", nextAddressPayload);
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
      mobileNumber: localMobileNumber(address.mobileNumber || ""),
      email: address.email || user?.email || "",
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

  const payloadForItem = (item, index = 0) => ({
    property: item._id,
    fullName: addressForm.fullName,
    mobileNumber: addressForm.mobileNumber,
    email: addressForm.email,
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
    deliverySpeed: index === 0 ? deliverySpeed : "standard",
    voucherCode: item.pricing?.voucher?.valid ? item.pricing.voucher.code : "",
    message: `Cart checkout booking for ${item.title}.`
  });

  const confirmCod = async () => {
    const bookings = [];
    for (const [index, item] of pricedItems.entries()) {
      const { data } = await api.post("/bookings/cod", payloadForItem(item, index));
      bookings.push(data.booking);
    }
    return bookings;
  };

  const payItemWithRazorpay = async (item, index = 0) => {
    const bookingPayload = payloadForItem(item, index);
    const { data } = await api.post("/bookings/razorpay/order", bookingPayload);
    await loadRazorpay();
    return new Promise((resolve, reject) => {
      const checkout = new window.Razorpay({
        key: data.key,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "Zasoota",
        description: item.title,
        order_id: data.order.id,
        prefill: { name: addressForm.fullName || user?.name, email: addressForm.email || user?.email, contact: addressForm.mobileNumber },
        theme: { color: "#6d28d9" },
        handler: async (response) => {
          try {
            const verified = await api.post("/bookings/razorpay/verify", { ...response, bookingPayload });
            resolve(verified.data.booking);
          } catch (err) {
            reject(err);
          }
        },
        modal: {
          ondismiss: () => {
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
          for (const [index, item] of pricedItems.entries()) paidBookings.push(await payItemWithRazorpay(item, index));
          return paidBookings;
        })();
      setConfirmedBookings(bookings);
      clearCart();
      showToast(paymentMethod === "cod" ? "Booking confirmed with Cash on Delivery" : "Payment successful");
      setMaxStep(4);
      setStep(4);
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
            <DeliveryStep
              deliverySpeed={deliverySpeed}
              setDeliverySpeed={setDeliverySpeed}
              deliveryDate={deliveryDate}
            />
          )}
          {step === 3 && (
            <PaymentStep
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
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
          {step === 4 && (
            <ConfirmationStep bookings={confirmedBookings} paymentMethod={paymentMethod} kycApproved={kycApproved} />
          )}
          {!kycApproved && step === 5 && (
            <KycStep user={user} />
          )}
          <div className="mt-6 grid gap-3 border-t border-violet-100 pt-5 dark:border-violet-900/70 sm:grid-cols-2">
            {step > 0 && step < 4 && <button className="btn-secondary" type="button" onClick={() => setStep((current) => Math.max(0, current - 1))}>Back</button>}
            {step < 3 && <button className="btn-primary" type="button" onClick={goNext}>{step === 0 ? "Continue to Address" : step === 1 ? "Continue to Delivery" : "Continue to Payment"}</button>}
            {step === 3 && <button className="btn-primary sm:col-span-2" type="button" disabled={loading} onClick={confirmPayment}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} {loading ? "Processing..." : paymentMethod === "cod" ? "Confirm COD Booking" : "Pay and Confirm"}</button>}
            {step === 4 && !kycApproved && <button className="btn-primary sm:col-span-2" type="button" onClick={() => { setMaxStep(5); setStep(5); }}>Continue to KYC</button>}
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
  const [blockedSelections, setBlockedSelections] = useState({});

  const setBlockedSelection = (itemId, period) => {
    setBlockedSelections((current) => ({ ...current, [itemId]: period }));
  };

  const clearBlockedSelection = (itemId) => {
    setBlockedSelections((current) => {
      if (!current[itemId]) return current;
      const next = { ...current };
      delete next[itemId];
      return next;
    });
  };

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
          const knownBookedPeriods = uniqueBookedPeriods([
            ...(item.bookedPeriods || []),
            ...(itemDateAvailability?.bookedPeriods || [])
          ]);
          const blockedSelection = blockedSelections[item._id];
          const useAvailableDate = () => {
            if (!itemDateAvailability?.nextAvailableAfter) return;
            const startDate = String(itemDateAvailability.nextAvailableAfter).slice(0, 10);
            const duration = rentalDaysBetween(item.startDate, item.endDate) || minDays;
            clearBlockedSelection(item._id);
            updateItem(item._id, { startDate, endDate: addDays(startDate, duration) });
          };
          return (
            <article key={item._id} className="grid gap-4 rounded-2xl border border-violet-100 bg-mist/70 p-4 dark:border-violet-900/70 dark:bg-white/10 sm:grid-cols-[132px_1fr]">
              <Link href={`/items/${item._id}`} className="overflow-hidden rounded-xl bg-white dark:bg-stone-950">
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
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-black">Start date</span>
                    <input className="field" type="date" min={today} value={item.startDate || ""} onChange={(event) => {
                      const startDate = event.target.value;
                      const endDate = item.endDate && item.endDate >= startDate ? item.endDate : addDays(startDate, minDays);
                      const blockedPeriod = bookedPeriodsOverlap(knownBookedPeriods, startDate, endDate);
                      if (blockedPeriod) {
                        setBlockedSelection(item._id, blockedPeriod);
                        return;
                      }
                      clearBlockedSelection(item._id);
                      updateItem(item._id, {
                        startDate,
                        endDate
                      });
                    }} />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-black">End date</span>
                    <input className="field" type="date" min={item.startDate || today} value={item.endDate || ""} onChange={(event) => {
                      const endDate = event.target.value;
                      const blockedPeriod = bookedPeriodsOverlap(knownBookedPeriods, item.startDate, endDate);
                      if (blockedPeriod) {
                        setBlockedSelection(item._id, blockedPeriod);
                        return;
                      }
                      clearBlockedSelection(item._id);
                      updateItem(item._id, { endDate });
                    }} />
                  </label>
                </div>
                {blockedSelection && itemDateAvailability?.status !== "unavailable" && (
                  <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-black text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                    <p>This item is booked.</p>
                    <p className="mt-2 text-xs">Booked period: {formatBookedPeriodDate(blockedSelection.startDate)} to {formatBookedPeriodDate(blockedSelection.endDate)}. Book after this period.</p>
                  </div>
                )}
                {itemDateAvailability?.status === "checking" && (
                  <div className="mt-3 flex items-center gap-2 rounded-2xl border border-violet-100 bg-white px-4 py-3 text-sm font-black text-violet-700 dark:border-violet-900/70 dark:bg-stone-950/60 dark:text-violet-100">
                    <Loader2 className="h-4 w-4 animate-spin" /> Checking selected dates...
                  </div>
                )}
                {itemDateAvailability?.status === "unavailable" && (
                  <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-black text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                    <p>This item is booked.</p>
                    {itemDateAvailability.message && !itemDateAvailability.bookedPeriods?.length && <p className="mt-1 text-xs font-bold opacity-80">{itemDateAvailability.message}</p>}
                    {itemDateAvailability.bookedPeriods?.length > 0 && (
                      <div className="mt-3 rounded-xl bg-white/75 p-3 text-xs dark:bg-white/10">
                        <p className="mb-2 font-black">Booked period:</p>
                        <div className="grid gap-1">
                          {itemDateAvailability.bookedPeriods.map((period, index) => (
                            <span key={`${period.startDate}-${period.endDate}-${index}`}>
                              {formatBookedPeriodDate(period.startDate)} to {formatBookedPeriodDate(period.endDate)}. Book after this period.
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
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
                  <p className="break-words font-black text-ink dark:text-white">{[address.fullName, address.mobileNumber, address.email].filter(Boolean).join(" · ")}</p>
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Full Name" value={addressForm.fullName} onChange={(value) => update("fullName", value)} />
        <Field
          inputMode="numeric"
          label="Mobile Number"
          maxLength={10}
          pattern="[6-9][0-9]{9}"
          value={addressForm.mobileNumber}
          onChange={(value) => update("mobileNumber", localMobileNumber(value))}
        />
        <Field label="Email" type="email" value={addressForm.email} onChange={(value) => update("email", value)} />
        <Field label="House/Flat No." value={addressForm.houseFlatNo} onChange={(value) => update("houseFlatNo", value)} />
        <Field label="Street/Area" value={addressForm.streetArea} onChange={(value) => update("streetArea", value)} />
        <Field label="Landmark" optional value={addressForm.landmark} onChange={(value) => update("landmark", value)} />
        <Field label="City" value={addressForm.city} onChange={(value) => update("city", value)} />
        <StateSelect value={addressForm.state} onChange={(value) => update("state", value)} />
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
              <div key={item._id} className="flex flex-col gap-2 rounded-xl bg-white/75 p-3 dark:bg-white/10 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-black">{item.title}</p>
                  <p className="text-xs opacity-80">{item.message}</p>
                </div>
                <button className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white" type="button" onClick={() => removeItem(item._id)}>Remove item</button>
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

const deliverySlotIcons = {
  early: Sparkles,
  afternoon: SunMedium,
  evening: Moon,
  standard: Clock3
};

function formatDeliveryDate(value) {
  if (!value) return "Rental start date";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function DeliveryStep({ deliverySpeed, setDeliverySpeed, deliveryDate }) {
  const selectedDelivery = deliverySpeedDetails(deliverySpeed);

  return (
    <div>
      <h2 className="text-2xl font-black text-ink dark:text-white">Delivery time</h2>
      <p className="mt-1 text-sm text-violet-950/60 dark:text-violet-100/65">Choose your preferred delivery time slot before payment.</p>
      <div className="mt-5 rounded-[1.35rem] border border-violet-100 bg-white p-4 shadow-soft dark:border-violet-900/70 dark:bg-white/10">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-meadow">Select your preferred delivery time slot</p>
            <h3 className="mt-1 text-xl font-black text-ink dark:text-white">Rent the gear. Own your time.</h3>
            <p className="mt-1 text-sm text-violet-950/60 dark:text-violet-100/65">Get your order exactly when you need it.</p>
          </div>
          <div className="rounded-2xl bg-violet-50 px-4 py-3 text-sm font-black text-violet-800 dark:bg-violet-950/60 dark:text-violet-100">
            Delivery date: {formatDeliveryDate(deliveryDate)}
          </div>
        </div>
        <div className="mt-5 grid gap-3">
          {DELIVERY_TIME_SLOTS.map((slot) => {
            const Icon = deliverySlotIcons[slot.speed] || Clock3;
            const selected = deliverySpeed === slot.speed;
            return (
              <label key={slot.speed} className={`group flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-soft ${
                selected ? "border-meadow bg-meadow/10 shadow-soft" : "border-violet-100 bg-mist/70 dark:border-violet-900/70 dark:bg-stone-950/40"
              }`}>
                <input className="h-4 w-4 shrink-0 accent-meadow" type="radio" checked={selected} onChange={() => setDeliverySpeed(slot.speed)} />
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${selected ? "bg-meadow text-white" : "bg-white text-violet-700 dark:bg-white/10 dark:text-violet-100"}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-black text-ink dark:text-white">{slot.label}</span>
                    <span className={`rounded-full px-2.5 py-1 text-[0.68rem] font-black ${slot.charge ? "bg-violet-100 text-violet-800 dark:bg-violet-950/80 dark:text-violet-100" : "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-200"}`}>
                      {slot.charge ? `₹${slot.charge}` : "Free"}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-violet-950/60 dark:text-violet-100/65">{slot.text}</span>
                </span>
                <span className="shrink-0 text-right text-sm font-black text-violet-950 dark:text-white">{slot.window}</span>
              </label>
            );
          })}
        </div>
        <div className="mt-4 rounded-2xl border border-violet-100 bg-mist/70 p-4 text-sm dark:border-violet-900/70 dark:bg-white/10">
          <div className="flex items-start gap-3">
            <Zap className="mt-0.5 h-5 w-5 shrink-0 text-meadow" />
            <div>
              <p className="font-black text-ink dark:text-white">{selectedDelivery.label} selected</p>
              <p className="mt-1 text-violet-950/60 dark:text-violet-100/65">
                Delivery window {selectedDelivery.window || selectedDelivery.eta}. {selectedDelivery.charge ? `Delivery charge: ₹${selectedDelivery.charge.toLocaleString()} for the complete order.` : "No delivery charge for this slot."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentStep({ paymentMethod, setPaymentMethod, totals, promoCode, setPromoCode, applyPromoCode, removePromoCode, clearAppliedPromo, promoLoading, promoMessage, hasAppliedPromo }) {
  return (
    <div>
      <h2 className="text-2xl font-black text-ink dark:text-white">Payment</h2>
      <p className="mt-1 text-sm text-violet-950/60 dark:text-violet-100/65">Choose payment method and apply a promo code.</p>
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

function ConfirmationStep({ bookings, paymentMethod, kycApproved }) {
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
      {kycApproved && (
        <Link href="/dashboard?section=bookings" className="btn-primary mt-6 inline-flex">
          Go to My Orders
        </Link>
      )}
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

function Field({ label, optional = false, type = "text", value, onChange, inputMode, maxLength, pattern }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-black text-violet-950 dark:text-white">{label} {!optional && <span className="text-clay">*</span>}</span>
      <input className="field" inputMode={inputMode} maxLength={maxLength} pattern={pattern} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function StateSelect({ value, onChange }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-black text-violet-950 dark:text-white">State <span className="text-clay">*</span></span>
      <select className="field" required value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select state</option>
        {serviceableStates.map((state) => <option key={state} value={state}>{state}</option>)}
      </select>
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
