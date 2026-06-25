"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function SearchBar({ onSearch, showCity = true }) {
  const [form, setForm] = useState({ city: "", maxRent: "", type: "" });
  const [itemTypes, setItemTypes] = useState([]);

  useEffect(() => {
    api.get("/item-types")
      .then(({ data }) => setItemTypes(data.itemTypes))
      .catch(() => setItemTypes([]));
  }, []);

  const submit = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    Object.entries(form).forEach(([key, value]) => value && params.set(key, value));
    onSearch(params);
  };

  return (
    <form onSubmit={submit} className={`grid gap-3 rounded-lg border border-stone-200 bg-mist p-3 shadow-sm dark:border-stone-800 dark:bg-stone-900 ${showCity ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
      {showCity && <input className="field" placeholder="Pincode" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />}
      <input className="field" type="number" placeholder="Max daily rent" value={form.maxRent} onChange={(e) => setForm({ ...form, maxRent: e.target.value })} />
      <select className="field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
        <option value="">Any item</option>
        {itemTypes.map((type) => <option key={type._id} value={type.name}>{type.name}</option>)}
      </select>
      <button className="btn-primary" type="submit"><Search className="h-4 w-4" /> Search</button>
    </form>
  );
}
