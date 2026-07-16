"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Boxes, ImagePlus, IndianRupee, Loader2, MapPin, PackageCheck, Percent, Save, Tags, ToggleLeft, Trash2 } from "lucide-react";
import api, { uploadUrl } from "@/lib/api";
import ErrorMessage from "@/components/common/ErrorMessage";
import { conditionOf, itemTypeOf, minRentalDaysOf, quantityOf } from "@/lib/itemFields";
import { useToast } from "@/context/ToastContext";

const maxImageSize = 2 * 1024 * 1024;

const initial = {
  title: "",
  description: "",
  rent: "",
  deposit: "",
  itemType: "",
  pincode: "",
  serviceablePincodes: [],
  quantity: 1,
  minRentalDays: 1,
  condition: "Good",
  offer: "",
  amenities: "",
  isAvailable: true
};

const conditions = ["New", "Excellent", "Good", "Fair"];
const requiredFields = ["title", "description", "rent", "deposit", "itemType", "pincode", "quantity", "minRentalDays"];

export default function AddPropertyForm({ itemId }) {
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState(initial);
  const [newImages, setNewImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [itemTypes, setItemTypes] = useState([]);
  const [pinInput, setPinInput] = useState("");
  const [pinSearch, setPinSearch] = useState("");
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingItem, setLoadingItem] = useState(Boolean(itemId));

  const imagePreviews = useMemo(
    () => newImages.map((file) => ({ name: file.name, url: URL.createObjectURL(file), size: file.size })),
    [newImages]
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
    setLoadingItem(true);
    api.get(`/properties/${itemId}`)
      .then(({ data }) => {
        const item = data.property;
        setForm({
          title: item.title || "",
          description: item.description || "",
          rent: item.rent || "",
          deposit: item.deposit || "",
          itemType: itemTypeOf(item),
          pincode: item.pincode || "",
          serviceablePincodes: item.serviceablePincodes?.length ? item.serviceablePincodes : (item.pincode ? [item.pincode] : []),
          quantity: quantityOf(item),
          minRentalDays: minRentalDaysOf(item),
          condition: conditionOf(item),
          offer: item.offer || "",
          amenities: item.amenities?.join(", ") || "",
          isAvailable: item.isAvailable
        });
        setExistingImages(item.images || []);
      })
      .catch(() => setError("Unable to load item for editing"))
      .finally(() => setLoadingItem(false));
  }, [itemId]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

const addServicePin = (pins = pinInput) => {
  const pinList = String(pins || "")
    .split(/[\s,]+/) // comma, space, or newline
    .map((pin) => pin.trim())
    .filter(Boolean);

  const validPins = [];
  const invalidPins = [];

  pinList.forEach((pin) => {
    if (/^\d{6}$/.test(pin)) {
      validPins.push(pin);
    } else {
      invalidPins.push(pin);
    }
  });

  setForm((current) => ({
    ...current,
    serviceablePincodes: [
      ...new Set([...current.serviceablePincodes, ...validPins]),
    ],
  }));

  if (invalidPins.length) {
    showToast(
      `Invalid PIN(s): ${invalidPins.join(", ")}`,
      "error"
    );
  } else if (validPins.length) {
    showToast(`${validPins.length} PIN code(s) added`, "success");
  }

  setPinInput("");
};

  const removeServicePin = (pin) => {
    setForm((current) => ({ ...current, serviceablePincodes: current.serviceablePincodes.filter((item) => item !== pin) }));
  };

  const validateImages = (files) => {
    const valid = [];
    const invalid = [];

    files.forEach((file) => {
      if (!file.type.startsWith("image/")) invalid.push(`${file.name} is not an image.`);
      else if (file.size > maxImageSize) invalid.push(`${file.name} is larger than 2MB.`);
      else valid.push(file);
    });

    if (invalid.length) {
      const message = invalid.join(" ");
      setImageError(message);
      showToast(message, "error");
    } else {
      setImageError("");
    }

    return valid;
  };

  const addImages = (fileList) => {
    const files = validateImages(Array.from(fileList || []));
    if (!files.length) return;
    setNewImages((current) => [...current, ...files]);
    setSuccess(`${files.length} photo${files.length > 1 ? "s" : ""} ready to upload.`);
  };

  const removeNewImage = (index) => {
    setNewImages((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const removeExistingImage = (image) => {
    setExistingImages((current) => current.filter((item) => item !== image));
  };

  const validateForm = () => {
    const missing = requiredFields.filter((field) => String(form[field] ?? "").trim() === "");
    if (missing.length) return "Please complete all required fields before publishing.";
    if (Number(form.rent) < 0 || Number(form.deposit) < 0) return "Rent and deposit cannot be negative.";
    if (Number(form.quantity) < 0) return "Quantity cannot be negative.";
    if (Number(form.minRentalDays) < 1) return "Minimum rental days must be at least 1.";
    if (!/^\d{6}$/.test(String(form.pincode).trim())) return "Enter a valid 6-digit pincode.";
    const servicePins = [...new Set([...form.serviceablePincodes, form.pincode].filter(Boolean))];
    if (!servicePins.length) return "Add at least one serviceable pincode.";
    if (servicePins.some((pin) => !/^\d{6}$/.test(pin))) return "Serviceable pincodes must be 6 digits.";
    if (!existingImages.length && !newImages.length) return "Upload at least one item photo.";
    return "";
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      showToast(validationError, "error");
      return;
    }

    setLoading(true);
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (key === "serviceablePincodes") data.append(key, JSON.stringify([...new Set([...value, form.pincode].filter(Boolean))]));
      else data.append(key, value);
    });
    data.append("existingImages", JSON.stringify(existingImages));
    newImages.forEach((file) => data.append("images", file));

    try {
      const request = itemId
        ? api.put(`/properties/${itemId}`, data, { headers: { "Content-Type": "multipart/form-data" } })
        : api.post("/properties", data, { headers: { "Content-Type": "multipart/form-data" } });
      await request;
      showToast(itemId ? "Item updated" : "Item published");
      setSuccess(itemId ? "Item updated successfully." : "Item published successfully.");
      router.push("/admin");
    } catch (err) {
      const message = err.response?.data?.message || "Unable to save item";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  if (loadingItem) {
    return (
      <div className="rounded-2xl border border-violet-100 bg-white/85 p-8 text-center shadow-soft dark:border-violet-900/70 dark:bg-white/10">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-meadow" />
        <p className="mt-3 text-sm font-semibold text-violet-950/65 dark:text-violet-100/70">Loading item details...</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-violet-100 bg-white/90 shadow-soft dark:border-violet-900/70 dark:bg-white/10">
        <div className="bg-gradient-to-br from-violet-950 via-violet-800 to-fuchsia-700 p-6 text-white">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-wide text-violet-100">{itemId ? "Inventory edit" : "New inventory item"}</p>
              <h1 className="mt-2 text-3xl font-black">{itemId ? "Edit rental item" : "Add rental item"}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-violet-100/80">Add clear details, delivery pincode, pricing, offer text, and high-quality photos renters can trust.</p>
            </div>
            <Link href="/admin" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/25 bg-white/12 px-4 text-sm font-black text-white backdrop-blur transition hover:bg-white/20">Back to admin</Link>
          </div>
        </div>
      </div>

      {error && <ErrorMessage message={error} />}
      {success && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 dark:border-green-900/60 dark:bg-green-950/35 dark:text-green-200">{success}</div>}

      <Section icon={PackageCheck} title="Item Details" description="Core information shown across listings and the item detail page.">
        <Field label="Item name" required className="md:col-span-2">
          <input className="field" placeholder="Epson projector, JBL speaker, Canon camera" required value={form.title} onChange={(e) => update("title", e.target.value)} />
        </Field>
        <Field label="Description" required className="md:col-span-2">
          <textarea className="field min-h-32 resize-y" placeholder="Brand, model, condition notes, included accessories, and renter instructions" required value={form.description} onChange={(e) => update("description", e.target.value)} />
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

      <Section icon={IndianRupee} title="Pricing And Offer" description="Keep pricing transparent and add optional promotional copy.">
        <Field label="Rent per day" required>
          <input className="field" type="number" min="0" inputMode="numeric" placeholder="1200" required value={form.rent} onChange={(e) => update("rent", e.target.value)} />
        </Field>
        <Field label="Refundable deposit" required>
          <input className="field" type="number" min="0" inputMode="numeric" placeholder="3000" required value={form.deposit} onChange={(e) => update("deposit", e.target.value)} />
        </Field>
        <Field label="Offer / Discount" className="md:col-span-2">
          <div className="relative">
            <Percent className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-meadow" />
            <input className="field pl-10" placeholder="10% off this week, Weekend combo price, or festival offer" value={form.offer} onChange={(e) => update("offer", e.target.value)} />
          </div>
        </Field>
      </Section>

      <Section icon={Boxes} title="Stock And Rental Rules" description="Control availability and minimum rental duration.">
        <Field label="Quantity available" required>
          <input className="field" type="number" min="0" inputMode="numeric" required value={form.quantity} onChange={(e) => update("quantity", e.target.value)} />
        </Field>
        <Field label="Minimum rental days" required>
          <input className="field" type="number" min="1" inputMode="numeric" required value={form.minRentalDays} onChange={(e) => update("minRentalDays", e.target.value)} />
        </Field>
        <Field label="Availability" className="md:col-span-2">
          <label className="flex min-h-[46px] items-center justify-between gap-3 rounded-xl border border-violet-100 bg-white px-3 py-2 text-sm font-semibold shadow-sm dark:border-violet-900/70 dark:bg-white/10">
            <span className="flex items-center gap-2"><ToggleLeft className="h-4 w-4 text-meadow" /> Available for rent</span>
            <input className="h-4 w-4 accent-meadow" type="checkbox" checked={form.isAvailable} onChange={(e) => update("isAvailable", e.target.checked)} />
          </label>
        </Field>
      </Section>

      <Section icon={MapPin} title="Serviceable PIN Codes" description="Assign all PIN codes where this item can be delivered or rented.">
        <Field label="Primary PIN Code" required className="md:col-span-2">
          <input className="field" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} placeholder="560001" required value={form.pincode} onChange={(e) => update("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))} />
        </Field>
        <div className="md:col-span-2 rounded-2xl border border-violet-100 bg-mist/70 p-4 dark:border-violet-900/70 dark:bg-white/10">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
           <input
  className="field"
  placeholder="560001,560002,560003"
  value={pinInput}
  onChange={(event) => setPinInput(event.target.value)}
  onPaste={(event) => {
    event.preventDefault();

    const pasted = event.clipboardData.getData("text");
    addServicePin(pasted);
  }}
  onKeyDown={(event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addServicePin();
    }
  }}
/>
            <button className="btn-primary" type="button" onClick={() => addServicePin()}>Add PIN</button>
          </div>
          <input className="field mt-3" placeholder="Search PIN codes" value={pinSearch} onChange={(event) => setPinSearch(event.target.value)} />
          <div className="mt-3 flex max-h-40 flex-wrap gap-2 overflow-y-auto">
            {[...new Set([...form.serviceablePincodes, form.pincode].filter(Boolean))]
              .filter((pin) => !pinSearch || pin.includes(pinSearch.trim()))
              .map((pin) => (
                <span key={pin} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-black text-violet-800 shadow-sm dark:bg-stone-950 dark:text-violet-100">
                  {pin}
                  {pin === form.pincode ? (
                    <span className="text-xs text-meadow">primary</span>
                  ) : (
                    <button className="text-red-500" type="button" onClick={() => removeServicePin(pin)} aria-label={`Remove ${pin}`}>x</button>
                  )}
                </span>
              ))}
          </div>
          <p className="mt-3 text-xs font-semibold text-violet-950/55 dark:text-violet-100/60">Primary PIN is included automatically. Duplicate PIN codes are ignored.</p>
        </div>
      </Section>

      <Section icon={Tags} title="Accessories" description="List anything included with the rental item.">
        <Field label="Included accessories" className="md:col-span-2">
          <input className="field" placeholder="Stand, cable, tripod, remote" value={form.amenities} onChange={(e) => update("amenities", e.target.value)} />
        </Field>
      </Section>

      <Section icon={ImagePlus} title="Photos" description="Upload at least one image. JPG, PNG, or WebP up to 2MB each.">
        <div className="md:col-span-2">
          <input ref={fileInputRef} className="sr-only" type="file" multiple accept="image/*" onChange={(e) => {
            addImages(e.target.files);
            e.target.value = "";
          }} />
          <button className="flex min-h-32 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-violet-300 bg-violet-50/60 p-5 text-center transition hover:border-meadow hover:bg-violet-50 dark:border-violet-800 dark:bg-white/10" type="button" onClick={() => fileInputRef.current?.click()}>
            <ImagePlus className="h-8 w-8 text-meadow" />
            <span className="mt-2 text-sm font-black text-ink dark:text-white">{existingImages.length || newImages.length ? "Add More Photos" : "Upload Item Photos"}</span>
            <span className="mt-1 text-xs font-semibold text-violet-950/55 dark:text-violet-100/60">Select one or more images</span>
          </button>
          {imageError && <p className="mt-2 text-sm font-semibold text-red-600">{imageError}</p>}
        </div>

        {(existingImages.length > 0 || imagePreviews.length > 0) && (
          <div className="md:col-span-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {existingImages.map((image) => (
              <ImagePreview key={image} src={uploadUrl(image)} name="Uploaded photo" onRemove={() => removeExistingImage(image)} />
            ))}
            {imagePreviews.map((image, index) => (
              <ImagePreview key={image.url} src={image.url} name={image.name} onRemove={() => removeNewImage(index)} />
            ))}
          </div>
        )}
      </Section>

      <div className="sticky bottom-0 z-10 flex flex-col gap-3 rounded-2xl border border-violet-100 bg-white/95 p-4 shadow-soft backdrop-blur dark:border-violet-900/70 dark:bg-[#160b29]/95 sm:flex-row sm:items-center sm:justify-end">
        {!itemTypes.length && <p className="text-sm font-semibold text-clay sm:mr-auto">Add at least one item type from Admin before publishing.</p>}
        <button className="btn-primary min-h-[44px] sm:min-w-44" disabled={loading || !itemTypes.length}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {loading ? "Saving..." : itemId ? "Update item" : "Publish item"}
        </button>
      </div>
    </form>
  );
}

function ImagePreview({ src, name, onRemove }) {
  return (
    <figure className="group overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm dark:border-violet-900/70 dark:bg-white/10">
      <div className="relative aspect-[4/3] overflow-hidden bg-violet-100 dark:bg-violet-950/50">
        <img src={src} alt={name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        <button className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-red-600 shadow-soft transition hover:scale-105" type="button" onClick={onRemove} aria-label={`Remove ${name}`}>
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <figcaption className="truncate px-3 py-2 text-xs font-semibold text-violet-950/60 dark:text-violet-100/60">{name}</figcaption>
    </figure>
  );
}

function Section({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-2xl border border-violet-100 bg-white/90 p-5 shadow-sm dark:border-violet-900/70 dark:bg-white/10">
      <div className="mb-5 flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-meadow ring-1 ring-violet-100 dark:bg-violet-950/60 dark:ring-violet-900/70">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-black text-ink dark:text-stone-50">{title}</h2>
          {description && <p className="mt-1 text-sm text-violet-950/55 dark:text-violet-100/60">{description}</p>}
        </div>
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
