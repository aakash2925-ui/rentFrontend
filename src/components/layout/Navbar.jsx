"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Loader2, LogOut, Menu, PackagePlus, PlusCircle, Search, ShoppingCart, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";

const links = [
  { href: "/", label: "Home" },
  { href: "/items", label: "Items" }
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { count } = useCart();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestForm, setRequestForm] = useState({
    itemName: "",
    category: "",
    description: "",
    rentalStartDate: "",
    rentalEndDate: "",
    locationPincode: "",
    contactNumber: ""
  });
  const blurTimer = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {

    const term = query.trim();
    if (term.length < 3) {
      setSuggestions([]);
      setSuggestionLoading(false);
      return undefined;
    }

    setSuggestionLoading(true);
    const timer = setTimeout(() => {
      api.get("/properties", { params: { search: term, limit: 6 } })
        .then(({ data }) => setSuggestions(data.properties || []))
        .catch(() => setSuggestions([]))
        .finally(() => setSuggestionLoading(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!user || user.role !== "user") return;
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("requestItem") === "1";
    const shouldOpen = fromQuery || sessionStorage.getItem("open_request_item") === "1";
    if (!shouldOpen) return;

    sessionStorage.removeItem("open_request_item");
    setRequestForm((current) => ({ ...current, contactNumber: current.contactNumber || user.phone || "" }));
    setRequestOpen(true);
    if (fromQuery) router.replace(pathname || "/");
  }, [pathname, router, user]);

  const searchItems = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("search", query.trim());
    router.push(`/items${params.toString() ? `?${params.toString()}` : ""}`);
    setShowSuggestions(false);
    setOpen(false);
  };

  const focusSearch = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setShowSuggestions(true);
  };

  const blurSearch = () => {
    blurTimer.current = setTimeout(() => setShowSuggestions(false), 150);
  };

  const closeMenu = () => {
    setOpen(false);
    setShowSuggestions(false);
  };

  const signOut = () => {
    logout();
    closeMenu();
    router.push("/");
  };

  const openRequestModal = () => {
    closeMenu();
    if (!user) {
      sessionStorage.setItem("open_request_item", "1");
      showToast("Please login to request an item", "error");
      router.push("/login");
      return;
    }
    if (user.role !== "user") return;
    setRequestForm((current) => ({ ...current, contactNumber: current.contactNumber || user.phone || "" }));
    setRequestOpen(true);
  };

  const submitItemRequest = async (event) => {
    event.preventDefault();
    setRequestLoading(true);
    try {
      const { data } = await api.post("/item-requests", requestForm);
      showToast(data.message || "Your item request has been submitted successfully. We will notify you when it becomes available.");
      setRequestOpen(false);
      setRequestForm({
        itemName: "",
        category: "",
        description: "",
        rentalStartDate: "",
        rentalEndDate: "",
        locationPincode: "",
        contactNumber: user?.phone || ""
      });
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to submit item request", "error");
    } finally {
      setRequestLoading(false);
    }
  };

  const updateRequestForm = (key, value) => setRequestForm((current) => ({ ...current, [key]: value }));
  const openSuggestion = (item) => {
    setQuery(item.title || "");
    closeMenu();
    router.push(`/items/${item._id}`);
  };

  const suggestionBox = (
    showSuggestions && query.trim().length >= 3 && (
      <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-violet-100 bg-white text-violet-950 shadow-glow dark:border-violet-900/70 dark:bg-stone-950 dark:text-white">
        {suggestionLoading ? (
          <p className="px-4 py-3 text-sm font-semibold text-violet-950/60 dark:text-violet-100/60">Searching...</p>
        ) : suggestions.length ? (
          <div className="max-h-80 overflow-y-auto py-2">
            {suggestions.map((item) => (
              <button
                key={item._id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => openSuggestion(item)}
                className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-violet-50 dark:hover:bg-white/10"
              >
                <span className="min-w-0">
                  <span className="line-clamp-1 text-sm font-black">{item.title}</span>
                  <span className="mt-1 block text-xs font-semibold text-violet-950/55 dark:text-violet-100/55">{item.itemType || item.propertyType || "Rental item"}</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="px-4 py-3 text-sm font-semibold text-violet-950/60 dark:text-violet-100/60">No matching items found</p>
        )}
      </div>
    )
  );

  const requestModal = requestOpen && (
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-violet-950/70 px-4 py-6 backdrop-blur-sm">
      <div className="mx-auto max-w-2xl overflow-hidden rounded-[2rem] border border-white/20 bg-white shadow-glow dark:bg-[#12081f]">
        <div className="flex items-start justify-between gap-4 bg-gradient-to-br from-violet-800 via-violet-700 to-fuchsia-700 p-5 text-white">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-100">Zasoota request desk</p>
            <h2 className="mt-2 text-2xl font-black">Request an Item</h2>
            <p className="mt-1 text-sm font-semibold text-violet-100/80">Tell us what you need and we will notify you when it becomes available.</p>
          </div>
          <button className="rounded-xl bg-white/15 p-2 text-white transition hover:bg-white/25" type="button" onClick={() => setRequestOpen(false)} aria-label="Close request item modal">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submitItemRequest} className="grid gap-4 p-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-black">Item Name <span className="text-red-500">*</span></span>
            <input className="field" required value={requestForm.itemName} onChange={(event) => updateRequestForm("itemName", event.target.value)} placeholder="e.g. DSLR gimbal" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-black">Category</span>
            <input className="field" value={requestForm.category} onChange={(event) => updateRequestForm("category", event.target.value)} placeholder="Camera, event, travel..." />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="text-sm font-black">Item Description</span>
            <textarea className="field min-h-28 resize-y" value={requestForm.description} onChange={(event) => updateRequestForm("description", event.target.value)} placeholder="Share brand, model, use case, or any required specifications." />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-black">From <span className="text-red-500">*</span></span>
            <input
              className="field"
              required
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={requestForm.rentalStartDate}
              onChange={(event) => updateRequestForm("rentalStartDate", event.target.value)}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-black">To <span className="text-red-500">*</span></span>
            <input
              className="field"
              required
              type="date"
              min={requestForm.rentalStartDate || new Date().toISOString().slice(0, 10)}
              value={requestForm.rentalEndDate}
              onChange={(event) => updateRequestForm("rentalEndDate", event.target.value)}
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-black">Delivery Location / Pincode <span className="text-red-500">*</span></span>
            <input className="field" required value={requestForm.locationPincode} onChange={(event) => updateRequestForm("locationPincode", event.target.value)} placeholder="Area or 6-digit pincode" />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-black">Contact Number <span className="text-red-500">*</span></span>
            <input className="field" required type="tel" value={requestForm.contactNumber} onChange={(event) => updateRequestForm("contactNumber", event.target.value)} placeholder="Mobile number" />
          </label>
          <div className="flex flex-col-reverse gap-2 pt-2 md:col-span-2 md:flex-row md:justify-end">
            <button className="btn-secondary" type="button" onClick={() => setRequestOpen(false)}>Cancel</button>
            <button className="btn-primary" type="submit" disabled={requestLoading}>
              {requestLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {requestLoading ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-violet-100 bg-white/85 shadow-sm backdrop-blur-xl dark:border-violet-900/70 dark:bg-[#11071f]/88">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" onClick={closeMenu} className="group flex items-center" aria-label="Zasoota home">
          <img
            src="/zasoota-logo.svg"
            alt="Zasoota logo"
            className="h-12 w-36 shrink-0 rounded-2xl object-cover shadow-soft transition group-hover:-translate-y-0.5 group-hover:scale-[1.03] group-hover:shadow-glow sm:h-14 sm:w-44"
          />
        </Link>
        <form onSubmit={searchItems} className="relative hidden min-w-0 flex-1 items-center gap-2 rounded-full border border-violet-300/70 bg-violet-950/90 p-1.5 shadow-sm ring-1 ring-white/25 backdrop-blur-xl lg:flex dark:border-violet-800/80 dark:bg-violet-950/80">
          <Search className="ml-3 h-4 w-4 shrink-0 text-white" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={focusSearch}
            onBlur={blurSearch}
            className="min-w-0 flex-1 bg-transparent px-1 text-sm font-semibold text-white outline-none placeholder:text-white/90"
            placeholder="Search projectors, speakers, cameras..."
          />
          <button type="submit" className="rounded-full bg-white px-4 py-2 text-xs font-black text-meadow shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft">
            Search
          </button>
          {suggestionBox}
        </form>
        <button className="rounded-xl border border-violet-100 bg-white/80 p-2 text-ink shadow-sm md:hidden dark:border-violet-900/70 dark:bg-white/10 dark:text-white" onClick={() => setOpen((value) => !value)} aria-label="Open menu">
          <Menu />
        </button>
        <div className={`${open ? "flex" : "hidden"} absolute left-0 right-0 top-16 flex-col gap-2 border-b border-violet-100 bg-mist/95 p-4 shadow-soft backdrop-blur-xl dark:border-violet-900/70 dark:bg-[#11071f]/96 md:static md:flex md:flex-row md:items-center md:border-0 md:bg-transparent md:p-0 md:shadow-none`}>
          <form onSubmit={searchItems} className="relative flex items-center gap-2 rounded-full border border-violet-300/70 bg-violet-950/90 p-1.5 lg:hidden dark:border-violet-900/70 dark:bg-violet-950/80">
            <Search className="ml-3 h-4 w-4 text-white" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={focusSearch}
              onBlur={blurSearch}
              className="min-w-0 flex-1 bg-transparent px-1 text-sm font-semibold text-white outline-none placeholder:text-white/90"
              placeholder="Search gear"
            />
            <button type="submit" className="rounded-full bg-white px-3 py-2 text-xs font-black text-meadow">
              Go
            </button>
            {suggestionBox}
          </form>
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={closeMenu} className={`rounded-xl px-3 py-2 text-sm font-semibold transition hover:-translate-y-0.5 ${pathname === link.href ? "bg-white text-meadow shadow-sm dark:bg-white/10" : "text-violet-950/75 hover:bg-white/65 hover:text-meadow dark:text-violet-100/80"}`}>
              {link.label}
            </Link>
          ))}
          <Link href="/cart" onClick={closeMenu} className="btn-secondary relative" aria-label="Cart">
            <ShoppingCart className="h-4 w-4" /> Cart
            {count > 0 && (
              <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-fuchsia-500 px-1 text-[0.65rem] font-black text-white">
                {count}
              </span>
            )}
          </Link>
          {user?.role === "admin" && (
            <Link href="/add-item" onClick={closeMenu} className="btn-secondary">
              <PlusCircle className="h-4 w-4" /> Add
            </Link>
          )}
          {(!user || user.role === "user") && (
            <button type="button" onClick={openRequestModal} className="btn-secondary">
              <PackagePlus className="h-4 w-4" /> Request an Item
            </button>
          )}
          {user?.role === "delivery" ? (
            <button type="button" onClick={signOut} className="btn-secondary">
              <LogOut className="h-4 w-4" /> Logout
            </button>
          ) : user ? (
            <Link href={user.role === "admin" ? "/admin" : "/dashboard"} onClick={closeMenu} className="btn-secondary">
              <UserRound className="h-4 w-4" /> Dashboard
            </Link>
          ) : (
            <Link href="/login" onClick={closeMenu} className="btn-primary">Login</Link>
          )}
        </div>
      </nav>
    </header>
    {mounted && createPortal(requestModal, document.body)}
    </>
  );
}
