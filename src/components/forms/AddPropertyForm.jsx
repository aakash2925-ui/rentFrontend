"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import ErrorMessage from "@/components/common/ErrorMessage";
import { conditionOf, itemTypeOf, minRentalDaysOf, quantityOf, specValueOf } from "@/lib/itemFields";
import { useToast } from "@/context/ToastContext";

const initial = {
  title: "",
  description: "",
  rent: "",
  deposit: "",
  itemType: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  quantity: 1,
  minRentalDays: 1,
  specValue: "",
  condition: "Good",
  amenities: "",
  isAvailable: true
};

const conditions = ["New", "Excellent", "Good", "Fair"];

export default function AddPropertyForm({ itemId }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [form, setForm] = useState(initial);
  const [images, setImages] = useState([]);
  const [itemTypes, setItemTypes] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/item-types")
      .then(({ data }) => {
        setItemTypes(data.itemTypes);
        if (!itemId && data.itemTypes[0]) update("itemType", data.itemTypes[0].name);
      })
      .catch(() => setError("Unable to load item types. Add item types from the admin dashboard first."));
  }, [itemId]);

  useEffect(() => {
    if (!itemId) return;
    api.get(`/properties/${itemId}`)
      .then(({ data }) => {
        const item = data.property;
        setForm({
          title: item.title || "",
          description: item.description || "",
          rent: item.rent || "",
          deposit: item.deposit || "",
          itemType: itemTypeOf(item),
          address: item.address || "",
          city: item.city || "",
          state: item.state || "",
          pincode: item.pincode || "",
          quantity: quantityOf(item),
          minRentalDays: minRentalDaysOf(item),
          specValue: specValueOf(item),
          condition: conditionOf(item),
          amenities: item.amenities?.join(", ") || "",
          isAvailable: item.isAvailable
        });
      })
      .catch(() => setError("Unable to load item for editing"));
  }, [itemId]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    Array.from(images).forEach((file) => data.append("images", file));

    try {
      const request = itemId ? api.put(`/properties/${itemId}`, data, { headers: { "Content-Type": "multipart/form-data" } }) : api.post("/properties", data, { headers: { "Content-Type": "multipart/form-data" } });
      await request;
      showToast(itemId ? "Item updated" : "Item published");
      router.push("/admin");
    } catch (err) {
      const message = err.response?.data?.message || "Unable to save item";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <form onSubmit={submit} className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <h1 className="text-2xl font-black text-ink dark:text-stone-50">{itemId ? "Edit Rental Item" : "Add Rental Item"}</h1>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {error && <div className="md:col-span-2"><ErrorMessage message={error} /></div>}
        <input className="field md:col-span-2" placeholder="Item name, e.g. Epson projector or JBL speaker" required value={form.title} onChange={(e) => update("title", e.target.value)} />
        <textarea className="field min-h-28 md:col-span-2" placeholder="Describe brand, model, use case, and what renters should know" required value={form.description} onChange={(e) => update("description", e.target.value)} />
        <input className="field" type="number" placeholder="Rent per day" required value={form.rent} onChange={(e) => update("rent", e.target.value)} />
        <input className="field" type="number" placeholder="Refundable deposit" required value={form.deposit} onChange={(e) => update("deposit", e.target.value)} />
        <select className="field" value={form.itemType} onChange={(e) => update("itemType", e.target.value)} required>
          {itemTypes.length ? itemTypes.map((type) => <option key={type._id} value={type.name}>{type.name}</option>) : <option value="">Add item types in admin first</option>}
        </select>
        <select className="field" value={form.condition} onChange={(e) => update("condition", e.target.value)}>
          {conditions.map((item) => <option key={item}>{item}</option>)}
        </select>
        <input className="field md:col-span-2" placeholder="Pickup address" required value={form.address} onChange={(e) => update("address", e.target.value)} />
        <input className="field" placeholder="City" required value={form.city} onChange={(e) => update("city", e.target.value)} />
        <input className="field" placeholder="State" required value={form.state} onChange={(e) => update("state", e.target.value)} />
        <input className="field" placeholder="Pincode" required value={form.pincode} onChange={(e) => update("pincode", e.target.value)} />
        <input className="field" type="number" placeholder="Power/spec value, e.g. 3000 lumens or 500 watts" required value={form.specValue} onChange={(e) => update("specValue", e.target.value)} />
        <input className="field" type="number" min="1" placeholder="Quantity available" required value={form.quantity} onChange={(e) => update("quantity", e.target.value)} />
        <input className="field" type="number" min="1" placeholder="Minimum rental days" required value={form.minRentalDays} onChange={(e) => update("minRentalDays", e.target.value)} />
        <input className="field md:col-span-2" placeholder="Included accessories, comma separated: stand, cable, tripod, remote" value={form.amenities} onChange={(e) => update("amenities", e.target.value)} />
        <input className="field md:col-span-2" type="file" multiple accept="image/*" onChange={(e) => setImages(e.target.files)} />
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={form.isAvailable} onChange={(e) => update("isAvailable", e.target.checked)} /> Available for rent
        </label>
        <button className="btn-primary md:col-span-2" disabled={loading || !itemTypes.length}>{loading ? "Saving..." : itemId ? "Update item" : "Publish item"}</button>
      </div>
    </form>
  );
}
