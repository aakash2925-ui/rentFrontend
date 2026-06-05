"use client";

import { useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ErrorMessage from "@/components/common/ErrorMessage";
import { minRentalDaysOf, quantityOf, rentalDaysBetween } from "@/lib/itemFields";
import { useToast } from "@/context/ToastContext";

const DELIVERY_RATE_PER_KM = 25;

export default function InquiryForm({ property }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({
    phone: user?.phone || "",
    startDate: "",
    endDate: "",
    quantity: 1,
    deliveryOption: "pickup",
    deliveryAddress: "",
    deliveryDistanceKm: "",
    message: `Hi, I am interested in ${property.title}.`
  });
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const rentalDays = rentalDaysBetween(form.startDate, form.endDate);
  const selectedQuantity = Number(form.quantity || 1);
  const totalRent = rentalDays * Number(property.rent || 0) * selectedQuantity;
  const deliveryDistanceKm = Number(form.deliveryDistanceKm || 0);
  const deliveryCharge = form.deliveryOption === "delivery" ? Math.ceil(deliveryDistanceKm * DELIVERY_RATE_PER_KM) : 0;
  const totalAmount = totalRent + Number(property.deposit || 0) + deliveryCharge;
  const availableQuantity = quantityOf(property);
  const minRentalDays = minRentalDaysOf(property);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setStatus("");
    if (rentalDays < minRentalDays) return setError(`Minimum rental duration is ${minRentalDays} day(s).`);
    if (selectedQuantity > availableQuantity) return setError(`Only ${availableQuantity} item(s) available.`);
    if (form.deliveryOption === "delivery" && !form.deliveryAddress.trim()) return setError("Delivery address is required.");
    if (form.deliveryOption === "delivery" && deliveryDistanceKm <= 0) return setError("Enter delivery distance in km.");
    try {
      await api.post("/inquiries", { property: property._id, ...form });
      setStatus("Request sent. You can track it in your dashboard.");
      showToast("Rental request sent");
    } catch (err) {
      const message = err.response?.data?.message || "Please login to send a rental request.";
      setError(message);
      showToast(message, "error");
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 rounded-lg border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <h2 className="text-lg font-black text-ink dark:text-stone-50">Request rental</h2>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">This sends a request. Admin confirms it before inventory is reserved.</p>
      <div className="mt-4 space-y-3">
        {error && <ErrorMessage message={error} />}
        {status && <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-200">{status}</div>}
        <input className="field" placeholder="Phone number" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <input className="field" type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          <input className="field" type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
        </div>
        <input className="field" type="number" min="1" max={availableQuantity} required placeholder="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <label className={`rounded-lg border p-3 text-sm font-semibold ${form.deliveryOption === "pickup" ? "border-meadow bg-meadow/10 text-meadow" : "border-stone-200 dark:border-stone-700 dark:text-stone-200"}`}>
            <input className="mr-2" type="radio" name="deliveryOption" value="pickup" checked={form.deliveryOption === "pickup"} onChange={(e) => setForm({ ...form, deliveryOption: e.target.value })} />
            Pickup
          </label>
          <label className={`rounded-lg border p-3 text-sm font-semibold ${form.deliveryOption === "delivery" ? "border-meadow bg-meadow/10 text-meadow" : "border-stone-200 dark:border-stone-700 dark:text-stone-200"}`}>
            <input className="mr-2" type="radio" name="deliveryOption" value="delivery" checked={form.deliveryOption === "delivery"} onChange={(e) => setForm({ ...form, deliveryOption: e.target.value })} />
            Delivery
          </label>
        </div>
        {form.deliveryOption === "delivery" && (
          <div className="space-y-2 rounded-lg border border-stone-200 p-3 dark:border-stone-700">
            <input className="field" placeholder="Delivery address" required value={form.deliveryAddress} onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })} />
            <input className="field" type="number" min="0" step="0.1" placeholder="Distance from pickup point in km" required value={form.deliveryDistanceKm} onChange={(e) => setForm({ ...form, deliveryDistanceKm: e.target.value })} />
            <p className="text-xs text-stone-500 dark:text-stone-400">Delivery charge: ₹{DELIVERY_RATE_PER_KM}/km. Final charge is calculated by the server.</p>
          </div>
        )}
        <div className="rounded-lg bg-mist p-3 text-sm dark:bg-stone-800">
          <div className="flex justify-between"><span>Rental days</span><strong>{rentalDays || "-"}</strong></div>
          <div className="mt-2 flex justify-between"><span>Rent total</span><strong>₹{totalRent.toLocaleString()}</strong></div>
          <div className="mt-2 flex justify-between"><span>Deposit</span><strong>₹{Number(property.deposit || 0).toLocaleString()}</strong></div>
          <div className="mt-2 flex justify-between"><span>Delivery</span><strong>₹{deliveryCharge.toLocaleString()}</strong></div>
          <div className="mt-2 flex justify-between border-t border-stone-200 pt-2 dark:border-stone-700"><span>Total payable</span><strong>₹{totalAmount.toLocaleString()}</strong></div>
        </div>
        <div className="rounded-lg border border-stone-200 p-3 text-xs leading-5 text-stone-600 dark:border-stone-700 dark:text-stone-300">
          <strong className="block text-ink dark:text-stone-50">What happens next?</strong>
          Your request appears in your dashboard immediately. Admin reviews it, contacts you if needed, then marks it as Confirmed rental to reserve stock.
        </div>
        <textarea className="field min-h-28" placeholder="Message" required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        <button className="btn-primary w-full">Send rental request</button>
      </div>
    </form>
  );
}
