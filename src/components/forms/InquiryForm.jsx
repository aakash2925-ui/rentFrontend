"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, CheckCircle2, ChevronRight, CreditCard, Edit3, IndianRupee, Loader2, MapPin, PackageCheck, Plus, Trash2, Truck, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ErrorMessage from "@/components/common/ErrorMessage";
import { minRentalDaysOf, quantityOf, rentalDaysBetween } from "@/lib/itemFields";
import { calculateRentalPricing } from "@/lib/rentalPricing";
import { useToast } from "@/context/ToastContext";
import AddToCartButton from "@/components/cart/AddToCartButton";
import { useCart } from "@/context/CartContext";

const steps = ["Review", "Address", "Payment", "Confirm"];

function toDateInputValue(date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
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

export default function InquiryForm({ property }) {
  const { user } = useAuth();
  const { clearCart } = useCart();
  const { showToast } = useToast();
  const router = useRouter();
  const stepRefs = useRef([]);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    fullName: user?.name || "",
    mobileNumber: user?.phone || "",
    startDate: "",
    endDate: "",
    houseFlatNo: "",
    streetArea: "",
    landmark: "",
    city: "",
    state: "",
    pincode: "",
    deliverySpeed: "standard",
    paymentMethod: "cod",
    message: `Hi, I want to rent ${property.title}.`
  });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saveAddress, setSaveAddress] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [addressMode, setAddressMode] = useState("new");
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [availability, setAvailability] = useState({ status: "idle", message: "" });
  const [voucherInput, setVoucherInput] = useState("");
  const [appliedVoucherCode, setAppliedVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherMessage, setVoucherMessage] = useState({ type: "", text: "" });
  const [maxStep, setMaxStep] = useState(0);

  const rentalDays = rentalDaysBetween(form.startDate, form.endDate);
  const today = useMemo(() => toDateInputValue(new Date()), []);
  const selectedQuantity = 1;
  const deliveryDistanceKm = 0;
  const availableQuantity = quantityOf(property);
  const minRentalDays = minRentalDaysOf(property);
  const pricing = useMemo(() => calculateRentalPricing({
    rent: property.rent,
    deposit: property.deposit,
    quantity: selectedQuantity,
    rentalDays,
    deliveryDistanceKm,
    deliverySpeed: form.deliverySpeed,
    voucherCode: appliedVoucherCode,
    voucherDiscountAmount: appliedVoucher?.discountAmount || 0,
    voucherMessage: appliedVoucher?.message || ""
  }), [property.rent, property.deposit, selectedQuantity, rentalDays, deliveryDistanceKm, form.deliverySpeed, appliedVoucherCode, appliedVoucher]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const clearAppliedVoucher = (message = "") => {
    if (!appliedVoucherCode) return;
    setAppliedVoucherCode("");
    setAppliedVoucher(null);
    if (message) setVoucherMessage({ type: "error", text: message });
  };

  const updateStartDate = (value) => {
    clearAppliedVoucher("Voucher removed. Apply it again after changing rental dates.");
    setForm((current) => ({
      ...current,
      startDate: value,
      endDate: current.endDate && current.endDate < value ? "" : current.endDate
    }));
  };

  const updateEndDate = (value) => {
    clearAppliedVoucher("Voucher removed. Apply it again after changing rental dates.");
    update("endDate", value);
  };

  const applyVoucher = async () => {
    const code = voucherInput.trim().toUpperCase();
    if (!code) {
      setVoucherMessage({ type: "error", text: "Enter a voucher code." });
      return;
    }
    if (!form.startDate || !form.endDate) {
      setVoucherMessage({ type: "error", text: "Select rental dates before applying a voucher." });
      return;
    }

    setVoucherLoading(true);
    try {
      const { data } = await api.post("/vouchers/apply", {
        code,
        property: property._id,
        startDate: form.startDate,
        endDate: form.endDate,
        quantity: selectedQuantity,
        deliveryDistanceKm,
        deliverySpeed: form.deliverySpeed
      });
      setAppliedVoucherCode(data.voucher.code);
      setAppliedVoucher(data.voucher);
      setVoucherInput(data.voucher.code);
      setVoucherMessage({ type: "success", text: data.voucher.message });
      showToast(data.voucher.message);
    } catch (err) {
      setAppliedVoucherCode("");
      setAppliedVoucher(null);
      setVoucherMessage({ type: "error", text: err.response?.data?.message || "Invalid voucher code." });
    } finally {
      setVoucherLoading(false);
    }
  };

  const removeVoucher = () => {
    setAppliedVoucherCode("");
    setAppliedVoucher(null);
    setVoucherInput("");
    setVoucherMessage({ type: "", text: "" });
  };

  const addressPayload = useMemo(() => ({
    fullName: form.fullName,
    mobileNumber: form.mobileNumber,
    houseFlatNo: form.houseFlatNo,
    streetArea: form.streetArea,
    landmark: form.landmark,
    city: form.city,
    state: form.state,
    pincode: form.pincode
  }), [form.city, form.fullName, form.houseFlatNo, form.landmark, form.mobileNumber, form.pincode, form.state, form.streetArea]);

  const validateStep = useCallback((targetStep = step) => {
    if (!user) return "Please login before booking this item.";
    if (!form.startDate) return "Start date is required.";
    if (!form.endDate) return "End date is required.";
    if (form.startDate < today) return "Start date cannot be before today.";
    if (form.endDate < form.startDate) return "End date cannot be before start date.";
    if (rentalDays < minRentalDays) return `Minimum rental duration is ${minRentalDays} day(s).`;
    if (availableQuantity < 1) return "This item is currently out of stock.";
    if (targetStep >= 1) {
      if (!form.fullName.trim()) return "Full name is required.";
      if (!form.mobileNumber.trim()) return "Mobile number is required.";
      if (!form.houseFlatNo.trim()) return "House/flat number is required.";
      if (!form.streetArea.trim()) return "Street/area is required.";
      if (!form.city.trim()) return "City is required.";
      if (!form.state.trim()) return "State is required.";
      if (!/^\d{6}$/.test(form.pincode)) return "Enter a valid 6-digit PIN code.";
      if (availability.status !== "available") return "Check PIN code availability before proceeding to payment.";
    }
    return "";
  }, [availableQuantity, availability.status, form.city, form.endDate, form.fullName, form.houseFlatNo, form.mobileNumber, form.pincode, form.startDate, form.state, form.streetArea, minRentalDays, rentalDays, step, today, user]);

  useEffect(() => {
    setError("");
  }, [step]);

  useEffect(() => {
    if (!user) return;
    setForm((current) => ({
      ...current,
      fullName: current.fullName || user.name || "",
      mobileNumber: current.mobileNumber || user.phone || ""
    }));
  }, [user]);

  useEffect(() => {
    stepRefs.current[step]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [step]);

  useEffect(() => {
    if (!user) return;
    api.get("/auth/addresses")
      .then(({ data }) => {
        const addresses = data.addresses || [];
        setSavedAddresses(addresses);
        setForm((current) => ({
          ...current,
          fullName: current.fullName || user.name || addresses[0]?.fullName || "",
          mobileNumber: current.mobileNumber || user.phone || addresses[0]?.mobileNumber || ""
        }));
      })
      .catch(() => setSavedAddresses([]));
  }, [user]);

  const nextStep = async () => {
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      showToast(validationError, "error");
      if (!user) router.push("/login");
      return;
    }
    if (step === 1 && saveAddress) {
      try {
        await saveCurrentAddress();
        showToast("Address saved");
      } catch (err) {
        const message = err.response?.data?.message || err.message || "Unable to save address";
        setError(message);
        showToast(message, "error");
        return;
      }
    }
    setStep((current) => {
      const next = Math.min(steps.length - 1, current + 1);
      setMaxStep((allowed) => Math.max(allowed, next));
      return next;
    });
  };

  const checkAvailability = useCallback(async (pin = form.pincode) => {
    if (!/^\d{6}$/.test(pin)) {
      setAvailability({ status: "idle", message: "" });
      return;
    }
    setAvailability({ status: "checking", message: "Checking availability..." });
    try {
      const { data } = await api.get(`/properties/${property._id}/availability`, { params: { pincode: pin } });
      setAvailability({ status: data.available ? "available" : "unavailable", message: data.message });
    } catch (err) {
      setAvailability({ status: "unavailable", message: err.response?.data?.message || "Unable to check availability" });
    }
  }, [form.pincode, property._id]);

  const fillAddress = useCallback((address) => {
    setForm((current) => ({
      ...current,
      fullName: address.fullName || current.fullName,
      mobileNumber: address.mobileNumber || current.mobileNumber,
      houseFlatNo: address.houseFlatNo || "",
      streetArea: address.streetArea || "",
      landmark: address.landmark || "",
      city: address.city || "",
      state: address.state || "",
      pincode: address.pincode || ""
    }));
    if (/^\d{6}$/.test(address.pincode || "")) checkAvailability(address.pincode);
    setAddressMode("edit");
    setSelectedAddressId(address._id || "");
    setSaveAddress(false);
  }, [checkAvailability]);

  const deleteAddress = async (id) => {
    try {
      const { data } = await api.delete(`/auth/addresses/${id}`);
      setSavedAddresses(data.addresses || []);
      if (selectedAddressId === id) {
        setSelectedAddressId("");
        setAddressMode("new");
      }
      showToast("Address deleted");
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to delete address", "error");
    }
  };

  const saveCurrentAddress = async () => {
    const validationError = validateStep(1);
    if (validationError) throw new Error(validationError);
    const request = addressMode === "edit" && selectedAddressId
      ? api.put(`/auth/addresses/${selectedAddressId}`, addressPayload)
      : api.post("/auth/addresses", addressPayload);
    const { data } = await request;
    setSavedAddresses(data.addresses || []);
    setSaveAddress(false);
  };

  const startNewAddress = () => {
    setAddressMode("new");
    setSelectedAddressId("");
    setSaveAddress(true);
    setAvailability({ status: "idle", message: "" });
    setForm((current) => ({
      ...current,
      houseFlatNo: "",
      streetArea: "",
      landmark: "",
      city: "",
      state: "",
      pincode: ""
    }));
  };

  useEffect(() => {
    setAvailability({ status: "idle", message: "" });
    if (!/^\d{6}$/.test(form.pincode)) return undefined;
    const timeout = setTimeout(() => checkAvailability(form.pincode), 500);
    return () => clearTimeout(timeout);
  }, [checkAvailability, form.pincode]);

  const deliveryAddress = [form.houseFlatNo, form.streetArea, form.landmark, form.city, form.state, form.pincode].filter(Boolean).join(", ");

  const updatePin = (value) => {
    update("pincode", value.replace(/\D/g, "").slice(0, 6));
  };

  const payload = {
    property: property._id,
    fullName: form.fullName,
    mobileNumber: form.mobileNumber,
    phone: form.mobileNumber,
    startDate: form.startDate,
    endDate: form.endDate,
    quantity: selectedQuantity,
    houseFlatNo: form.houseFlatNo,
    streetArea: form.streetArea,
    landmark: form.landmark,
    city: form.city,
    state: form.state,
    pincode: form.pincode,
    deliveryAddress,
    deliveryDistanceKm: 0,
    deliverySpeed: form.deliverySpeed,
    voucherCode: appliedVoucherCode,
    message: form.message
  };

  const confirmCod = async () => {
    const { data } = await api.post("/bookings/cod", payload);
    setStatus(`Booking confirmed. Booking ID: ${data.booking._id}`);
    showToast("Booking confirmed with Cash on Delivery");
    clearCart();
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
        prefill: { name: form.fullName || user?.name, email: user?.email, contact: form.mobileNumber },
        theme: { color: "#6d28d9" },
        handler: async (response) => {
          try {
            await api.post("/bookings/razorpay/verify", { bookingId: data.booking._id, ...response });
            showToast("Payment successful");
            clearCart();
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
    const validationError = validateStep(1);
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
              <div key={label} ref={(node) => { stepRefs.current[index] = node; }} className="flex items-center gap-2">
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
                    {index < maxStep ? <Check className="h-4 w-4" /> : index + 1}
                  </span>
                  <span className="text-sm font-black">{label === "Confirm" ? "Confirmation" : label}</span>
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
            <div className="rounded-[1.35rem] border border-violet-100 bg-mist/70 p-5 dark:border-violet-900/70 dark:bg-white/10">
              <SummaryRow label="Item" value={property.title} />
              <SummaryRow label="Daily rent" value={`₹${Number(property.rent || 0).toLocaleString()}`} />
              <SummaryRow label="Refundable deposit" value={`₹${Number(property.deposit || 0).toLocaleString()}`} />
              {property.offer && <p className="mt-3 rounded-xl bg-meadow/10 px-3 py-2 text-sm font-black text-meadow">{property.offer}</p>}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-black text-violet-950 dark:text-white">Start date</span>
                <input
                  className="field"
                  type="date"
                  min={today}
                  required
                  value={form.startDate}
                  onChange={(e) => updateStartDate(e.target.value)}
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-black text-violet-950 dark:text-white">End date</span>
                <input className="field" type="date" min={form.startDate || today} required value={form.endDate} onChange={(e) => updateEndDate(e.target.value)} />
              </label>
            </div>
            <div className="rounded-[1.35rem] border border-violet-100 bg-white/90 p-4 shadow-sm dark:border-violet-900/70 dark:bg-stone-950/40">
              <div className="flex items-center gap-2 text-sm font-black text-meadow">
                <Truck className="h-4 w-4" /> Delivery details
              </div>
              <p className="mt-1 text-xs font-semibold text-violet-950/55 dark:text-violet-100/60">Standard delivery is free within 24 hours. Choose fast delivery when you need the item sooner.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {[
                  ["standard", "Standard delivery", "Within 24 hours", "Free"],
                  ["fast", "Fast delivery", "Within 2 hours", "₹199"]
                ].map(([value, title, eta, price]) => (
                  <label key={value} className={`cursor-pointer rounded-2xl border p-4 transition ${
                    form.deliverySpeed === value
                      ? "border-meadow bg-meadow/10 shadow-soft"
                      : "border-violet-100 bg-mist/70 hover:border-violet-300 dark:border-violet-900/70 dark:bg-white/10"
                  }`}>
                    <input
                      className="sr-only"
                      type="radio"
                      name="deliverySpeed"
                      checked={form.deliverySpeed === value}
                      onChange={() => update("deliverySpeed", value)}
                    />
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-ink dark:text-white">{title}</p>
                        <p className="mt-1 text-sm font-semibold text-violet-950/60 dark:text-violet-100/65">{eta}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${value === "fast" ? "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-100" : "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-200"}`}>
                        {price}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="rounded-[1.35rem] border border-violet-100 bg-white/90 p-4 shadow-sm dark:border-violet-900/70 dark:bg-stone-950/40">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                <label className="flex-1 space-y-2">
                  <span className="text-sm font-black text-violet-950 dark:text-white">Voucher code</span>
                  <input
                    className="field uppercase"
                    placeholder="Enter voucher code"
                    value={voucherInput}
                    onChange={(e) => {
                      setVoucherInput(e.target.value.toUpperCase());
                      if (appliedVoucherCode) setAppliedVoucherCode("");
                      if (voucherMessage.text) setVoucherMessage({ type: "", text: "" });
                    }}
                  />
                </label>
                <div className="flex gap-2">
                  <button className="btn-primary px-4 py-3 text-sm" type="button" onClick={applyVoucher} disabled={voucherLoading}>
                    {voucherLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {voucherLoading ? "Checking" : "Apply"}
                  </button>
                  {appliedVoucherCode && (
                    <button className="btn-secondary px-4 py-3 text-sm" type="button" onClick={removeVoucher}>Remove</button>
                  )}
                </div>
              </div>
              {voucherMessage.text && (
                <p className={`mt-3 text-sm font-black ${voucherMessage.type === "success" ? "text-green-700 dark:text-green-200" : "text-red-700 dark:text-red-200"}`}>
                  {voucherMessage.text}
                </p>
              )}
            </div>
            <PriceBreakdown pricing={pricing} rentalDays={rentalDays} deposit={property.deposit} />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 rounded-[1.35rem] border border-violet-100 bg-mist/70 p-5 dark:border-violet-900/70 dark:bg-white/10">
            <div>
              <div>
                <div className="flex items-center gap-2 text-sm font-black text-meadow"><Truck className="h-4 w-4" /> Address and PIN availability</div>
                <p className="mt-1 text-xs font-semibold text-violet-950/55 dark:text-violet-100/60">Enter your delivery address manually. PIN availability checks automatically.</p>
              </div>
            </div>
            <div className="rounded-[1.35rem] border border-violet-100 bg-white/90 p-4 shadow-sm dark:border-violet-900/70 dark:bg-stone-950/40">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-sm font-black text-ink dark:text-white">Saved addresses</h3>
                  <p className="mt-1 text-xs font-semibold text-violet-950/55 dark:text-violet-100/60">Choose a saved address or add a new one for this booking.</p>
                </div>
                <button className="btn-secondary px-3 py-2 text-xs" type="button" onClick={startNewAddress}>
                  <Plus className="h-4 w-4" /> Add new address
                </button>
              </div>
              {savedAddresses.length ? (
                <div className="mt-4 grid gap-3">
                  {savedAddresses.map((address) => {
                    const selected = address.pincode === form.pincode && address.houseFlatNo === form.houseFlatNo && address.streetArea === form.streetArea;
                    return (
                      <article key={address._id} className={`rounded-2xl border p-3 transition ${selected ? "border-meadow bg-meadow/10 shadow-soft" : "border-violet-100 bg-mist/70 dark:border-violet-900/70 dark:bg-white/10"}`}>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <p className="font-black text-ink dark:text-white">{address.fullName} · {address.mobileNumber}</p>
                            <p className="mt-1 text-sm leading-6 text-violet-950/65 dark:text-violet-100/70">
                              {[address.houseFlatNo, address.streetArea, address.landmark, address.city, address.state, address.pincode].filter(Boolean).join(", ")}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <button className="btn-primary px-3 py-2 text-xs" type="button" onClick={() => fillAddress(address)}>Use this address</button>
                            <button className="btn-secondary px-3 py-2 text-xs" type="button" onClick={() => fillAddress(address)}><Edit3 className="h-4 w-4" /> Edit</button>
                            <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-50 dark:border-red-900/70 dark:bg-white/10 dark:text-red-300 dark:hover:bg-red-950/30" type="button" onClick={() => deleteAddress(address._id)}>
                              <Trash2 className="h-4 w-4" /> Delete
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 rounded-2xl bg-mist/70 px-4 py-3 text-sm font-semibold text-violet-950/60 dark:bg-white/10 dark:text-violet-100/65">No saved addresses yet. Add one below and save it for next time.</p>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-black text-violet-950 dark:text-white">Full Name <span className="text-clay">*</span></span>
                <input className="field" required value={form.fullName} onChange={(e) => update("fullName", e.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-black text-violet-950 dark:text-white">Mobile Number <span className="text-clay">*</span></span>
                <input className="field" required value={form.mobileNumber} onChange={(e) => update("mobileNumber", e.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-black text-violet-950 dark:text-white">House/Flat No. <span className="text-clay">*</span></span>
                <input className="field" required value={form.houseFlatNo} onChange={(e) => update("houseFlatNo", e.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-black text-violet-950 dark:text-white">Street/Area <span className="text-clay">*</span></span>
                <input className="field" required value={form.streetArea} onChange={(e) => update("streetArea", e.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-black text-violet-950 dark:text-white">Landmark <span className="font-semibold text-violet-950/45 dark:text-violet-100/45">(Optional)</span></span>
                <input className="field" value={form.landmark} onChange={(e) => update("landmark", e.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-black text-violet-950 dark:text-white">City <span className="text-clay">*</span></span>
                <input className="field" required value={form.city} onChange={(e) => update("city", e.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-black text-violet-950 dark:text-white">State <span className="text-clay">*</span></span>
                <input className="field" required value={form.state} onChange={(e) => update("state", e.target.value)} />
              </label>
            </div>
            <div className={`rounded-[1.35rem] border p-4 shadow-sm transition ${
              availability.status === "available"
                ? "border-green-200 bg-green-50/90 dark:border-green-900/70 dark:bg-green-950/30"
                : availability.status === "unavailable"
                  ? "border-red-200 bg-red-50/90 dark:border-red-900/70 dark:bg-red-950/30"
                  : "border-violet-100 bg-white/90 dark:border-violet-900/70 dark:bg-stone-950/40"
            }`}>
              <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-sm font-black text-ink dark:text-white">Serviceability check</h3>
                  <p className="mt-1 text-xs font-semibold text-violet-950/55 dark:text-violet-100/60">Availability checks automatically after a valid 6-digit PIN code is entered.</p>
                </div>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${
                  availability.status === "available"
                    ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-200"
                    : availability.status === "unavailable"
                      ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200"
                      : "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-100"
                }`}>
                  {availability.status === "available" ? "Serviceable" : availability.status === "unavailable" ? "Unavailable" : availability.status === "checking" ? "Checking" : "Required"}
                </span>
              </div>
              <div className="grid gap-3">
                <label className="min-w-0 space-y-2">
                  <span className="text-sm font-black text-violet-950 dark:text-white">PIN Code <span className="text-clay">*</span></span>
                  <input
                    className="field h-12 w-full text-base font-black tracking-wide"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter 6-digit PIN for auto check"
                    required
                    value={form.pincode}
                    onChange={(e) => updatePin(e.target.value)}
                  />
                </label>
              </div>
              <div className="mt-3 flex items-start gap-2 text-sm font-black">
                {availability.status === "available" ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                ) : availability.status === "unavailable" ? (
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                ) : availability.status === "checking" ? (
                  <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-violet-700" />
                ) : (
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-violet-500" />
                )}
                <p className={
                  availability.status === "available"
                    ? "text-green-700 dark:text-green-200"
                    : availability.status === "unavailable"
                      ? "text-red-700 dark:text-red-200"
                      : "text-violet-950/60 dark:text-violet-100/65"
                }>
                  {availability.status === "available"
                    ? "Available in your area"
                    : availability.message || "Enter your PIN code to confirm service availability before payment."}
                </p>
              </div>
            </div>
            <label className="flex items-start gap-3 rounded-2xl border border-violet-100 bg-white/90 p-4 text-sm font-bold text-violet-950 shadow-sm dark:border-violet-900/70 dark:bg-stone-950/40 dark:text-violet-100">
              <input className="mt-1 h-4 w-4 accent-meadow" type="checkbox" checked={saveAddress} onChange={(event) => setSaveAddress(event.target.checked)} />
              <span>
                Save this address for future use
                <span className="mt-1 block text-xs font-semibold text-violet-950/55 dark:text-violet-100/60">
                  {addressMode === "edit" && selectedAddressId ? "Checked addresses will update the selected saved address." : "Checked addresses will be saved to your account after validation."}
                </span>
              </span>
            </label>
          </div>
        )}

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
            <SummaryRow label="Deliver to" value={deliveryAddress || "-"} />
            <SummaryRow label="Delivery time" value={pricing.delivery?.eta || "Within 24 hours"} />
            <SummaryRow label="Payment" value={form.paymentMethod === "cod" ? "Cash on Delivery" : "Razorpay"} />
            <PriceBreakdown pricing={pricing} rentalDays={rentalDays} deposit={property.deposit} compact />
            <textarea className="field min-h-24" placeholder="Message" required value={form.message} onChange={(e) => update("message", e.target.value)} />
          </div>
        )}

        <div className="grid gap-3 border-t border-violet-100 pt-5 dark:border-violet-900/70 sm:grid-cols-2">
          {step > 0 && <button className="btn-secondary" type="button" onClick={() => setStep((current) => Math.max(0, current - 1))}>Back</button>}
          {step < 3 ? (
            <button className="btn-primary" type="button" onClick={nextStep} disabled={step === 1 && availability.status !== "available"}>
              {step === 1 ? "Proceed to Payment" : "Continue"}
            </button>
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
      {pricing.voucherDiscountAmount > 0 && <SummaryRow label={`Voucher (${pricing.voucher.code})`} value={`-₹${pricing.voucherDiscountAmount.toLocaleString()}`} />}
      <SummaryRow label="Refundable deposit" value={`₹${Number(deposit || 0).toLocaleString()}`} />
      <SummaryRow label={`Delivery (${pricing.delivery?.eta || "Within 24 hours"})`} value={pricing.deliveryCharge > 0 ? `₹${pricing.deliveryCharge.toLocaleString()}` : "Free"} />
      <div className="mt-3 flex justify-between border-t border-violet-100 pt-3 text-base dark:border-violet-900/70"><span className="font-black">Final payable</span><strong className="text-meadow">₹{pricing.finalAmount.toLocaleString()}</strong></div>
      {(pricing.discountAmount + pricing.voucherDiscountAmount) > 0 && <p className="mt-3 rounded-xl bg-green-50 px-3 py-2 text-sm font-black text-green-700 dark:bg-green-950/40 dark:text-green-200"><IndianRupee className="mr-1 inline h-4 w-4" /> You save ₹{(pricing.discountAmount + pricing.voucherDiscountAmount).toLocaleString()} on this booking.</p>}
    </div>
  );
}

function SummaryRow({ label, value }) {
  return <div className="flex justify-between gap-4 py-1"><span className="text-violet-950/60 dark:text-violet-100/65">{label}</span><strong className="text-right text-ink dark:text-white">{value}</strong></div>;
}
