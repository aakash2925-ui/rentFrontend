"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Boxes, ImagePlus, IndianRupee, Loader2, MapPin, PackageCheck, Save, Tags, ToggleLeft } from "lucide-react";
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
const requiredFields = ["title", "description", "rent", "deposit", "itemType", "address", "city", "state", "pincode", "quantity", "minRentalDays", "specValue"];

export default function AddPropertyForm({ itemId }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [form, setForm] = useState(initial);
  const [images, setImages] = useState([]);
  const [itemTypes, setItemTypes] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const selectedImages = Array.from(images || []);

  const imagePreviews = useMemo(
    () => selectedImages.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })),
    [images]
  );

  useEffect(() => {
    return () => imagePreviews.forEach((image) => URL.revokeObjectURL(image.url));
  }, [imagePreviews]);

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

  const validateForm = () => {
    const missing = requiredFields.filter((field) => String(form[field] ?? "").trim() === "");
    if (missing.length) return "Please complete all required fields before publishing.";
    if (Number(form.rent) < 0 || Number(form.deposit) < 0) return "Rent and deposit cannot be negative.";
    if (Number(form.quantity) < 0) return "Quantity cannot be negative.";
    if (Number(form.minRentalDays) < 1) return "Minimum rental days must be at least 1.";
    if (Number(form.specValue) < 0) return "Spec value cannot be negative.";
    if (!/^\d{4,10}$/.test(String(form.pincode).trim())) return "Enter a valid pincode.";
    return "";
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      showToast(validationError, "error");
      return;
    }

    setLoading(true);
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    selectedImages.forEach((file) => data.append("images", file));

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
    <form onSubmit={submit} className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-stone-200 pb-5 dark:border-stone-800 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-meadow">{itemId ? "Inventory edit" : "New inventory item"}</p>
          <h1 className="mt-1 text-3xl font-black text-ink dark:text-stone-50">{itemId ? "Edit rental item" : "Add rental item"}</h1>
        </div>
        <Link href="/admin" className="btn-secondary self-start md:self-auto">Back to admin</Link>
      </div>

      {error && <ErrorMessage message={error} />}

      <Section icon={PackageCheck} title="Item details">
        <Field label="Item name" required className="md:col-span-2">
          <input className="field" placeholder="Epson projector, JBL speaker, Canon camera" required value={form.title} onChange={(e) => update("title", e.target.value)} />
        </Field>
        <Field label="Description" required className="md:col-span-2">
          <textarea className="field min-h-32 resize-y" placeholder="Brand, model, use case, included condition notes, and renter instructions" required value={form.description} onChange={(e) => update("description", e.target.value)} />
        </Field>
        <Field label="Item type" required>
          <select className="field" value={form.itemType} onChange={(e) => update("itemType", e.target.value)} required>
            <option value="">Select item type</option>
            {itemTypes.map((type) => <option key={type._id} value={type.name}>{type.name}</option>)}
          </select>
        </Field>
        <Field label="Condition">
          <select className="field" value={form.condition} onChange={(e) => update("condition", e.target.value)}>
            {conditions.map((item) => <option key={item}>{item}</option>)}
          </select>
        </Field>
      </Section>

      <Section icon={IndianRupee} title="Pricing">
        <Field label="Rent per day" required>
          <input className="field" type="number" min="0" inputMode="numeric" placeholder="1200" required value={form.rent} onChange={(e) => update("rent", e.target.value)} />
        </Field>
        <Field label="Refundable deposit" required>
          <input className="field" type="number" min="0" inputMode="numeric" placeholder="3000" required value={form.deposit} onChange={(e) => update("deposit", e.target.value)} />
        </Field>
      </Section>

      <Section icon={Boxes} title="Stock and rental rules">
        <Field label="Quantity available" required>
          <input className="field" type="number" min="0" inputMode="numeric" required value={form.quantity} onChange={(e) => update("quantity", e.target.value)} />
        </Field>
        <Field label="Minimum rental days" required>
          <input className="field" type="number" min="1" inputMode="numeric" required value={form.minRentalDays} onChange={(e) => update("minRentalDays", e.target.value)} />
        </Field>
        <Field label="Spec value" required>
          <input className="field" type="number" min="0" inputMode="decimal" placeholder="3000" required value={form.specValue} onChange={(e) => update("specValue", e.target.value)} />
        </Field>
        <Field label="Availability">
          <label className="flex min-h-[42px] items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-semibold dark:border-stone-700 dark:bg-stone-900">
            <span className="flex items-center gap-2"><ToggleLeft className="h-4 w-4 text-meadow" /> Available for rent</span>
            <input className="h-4 w-4 accent-meadow" type="checkbox" checked={form.isAvailable} onChange={(e) => update("isAvailable", e.target.checked)} />
          </label>
        </Field>
      </Section>

      <Section icon={MapPin} title="Pickup location">
        <Field label="Pickup address" required className="md:col-span-2">
          <input className="field" placeholder="Street, building, landmark" required value={form.address} onChange={(e) => update("address", e.target.value)} />
        </Field>
        <Field label="City" required>
          <input className="field" required value={form.city} onChange={(e) => update("city", e.target.value)} />
        </Field>
        <Field label="State" required>
          <input className="field" required value={form.state} onChange={(e) => update("state", e.target.value)} />
        </Field>
        <Field label="Pincode" required>
          <input className="field" inputMode="numeric" pattern="[0-9]{4,10}" required value={form.pincode} onChange={(e) => update("pincode", e.target.value)} />
        </Field>
      </Section>

      <Section icon={Tags} title="Accessories">
        <Field label="Included accessories" className="md:col-span-2">
          <input className="field" placeholder="Stand, cable, tripod, remote" value={form.amenities} onChange={(e) => update("amenities", e.target.value)} />
        </Field>
      </Section>

      <Section icon={ImagePlus} title="Photos">
        <Field label="Upload item photos" className="md:col-span-2">
          <input className="field file:mr-3 file:rounded-md file:border-0 file:bg-meadow file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white" type="file" multiple accept="image/*" onChange={(e) => setImages(e.target.files)} />
        </Field>
        {imagePreviews.length > 0 && (
          <div className="md:col-span-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {imagePreviews.map((image) => (
              <figure key={image.url} className="overflow-hidden rounded-lg border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
                <img src={image.url} alt={image.name} className="aspect-[4/3] w-full object-cover" />
                <figcaption className="truncate px-3 py-2 text-xs text-stone-500">{image.name}</figcaption>
              </figure>
            ))}
          </div>
        )}
      </Section>

      <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-stone-200 bg-mist/95 py-4 backdrop-blur dark:border-stone-800 dark:bg-[#121611]/95 sm:flex-row sm:items-center sm:justify-end">
        {!itemTypes.length && <p className="text-sm font-semibold text-clay sm:mr-auto">Add at least one item type from Admin before publishing.</p>}
        <button className="btn-primary min-h-[42px] sm:min-w-44" disabled={loading || !itemTypes.length}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {loading ? "Saving..." : itemId ? "Update item" : "Publish item"}
        </button>
      </div>
    </form>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="border-b border-stone-200 pb-6 dark:border-stone-800">
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white text-meadow shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800">
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="text-lg font-black text-ink dark:text-stone-50">{title}</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ label, required, className = "", children }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-bold text-stone-700 dark:text-stone-200">
        {label}{required && <span className="text-clay"> *</span>}
      </span>
      {children}
    </label>
  );
}
