"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Bookmark,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Edit3,
  Headphones,
  Heart,
  Home,
  LayoutDashboard,
  MapPin,
  Menu,
  Package,
  Search,
  ShieldCheck,
  Save,
  Trash2,
  UserRound
} from "lucide-react";
import api, { uploadUrl } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ErrorMessage from "@/components/common/ErrorMessage";
import Loading from "@/components/common/Loading";
import EmptyState from "@/components/common/EmptyState";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import RentalRequestCard from "@/components/dashboard/RentalRequestCard";
import PropertyCard from "@/components/properties/PropertyCard";
import { useToast } from "@/context/ToastContext";
import { statusLabel, statusTone } from "@/lib/rentalStatus";

const sections = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "bookings", label: "Bookings", icon: Package },
  { id: "wishlist", label: "Wishlist", icon: Heart },
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "addresses", label: "Addresses", icon: MapPin },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "support", label: "Support", icon: Headphones }
];

const bookingFilters = [
  ["all", "All"],
  ["active", "Active"],
  ["pending", "Pending"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"]
];

const filterBooking = (booking, filter) => {
  const status = booking.status;
  const payment = booking.paymentStatus;
  if (filter === "pending") return status === "pending" || payment === "pending";
  if (filter === "completed") return ["returned", "closed", "rented"].includes(status) || payment === "paid";
  if (filter === "cancelled") return payment === "cancelled" || payment === "failed";
  if (filter === "active") return ["contacted", "rented"].includes(status) || payment === "paid";
  return true;
};

export default function UserDashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [activeSection, setActiveSection] = useState("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [properties, setProperties] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [ownerInquiries, setOwnerInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const section = new URLSearchParams(window.location.search).get("section");
    if (sections.some((item) => item.id === section)) setActiveSection(section);
  }, []);

  useEffect(() => {
    if (!user) return;
    const calls = [api.get("/inquiries/my-inquiries"), api.get("/bookings/my-bookings"), api.get("/wishlist"), api.get("/auth/addresses")];
    if (["owner", "admin"].includes(user.role)) {
      calls.push(api.get("/properties/my-properties"));
      calls.push(api.get("/inquiries/owner-inquiries"));
    }

    Promise.all(calls)
      .then((responses) => {
        setInquiries(responses[0].data.inquiries);
        setBookings(responses[1].data.bookings);
        setWishlist(responses[2].data.wishlist);
        setSavedAddresses(responses[3].data.addresses || []);
        if (responses[4]) setProperties(responses[4].data.properties);
        if (responses[5]) setOwnerInquiries(responses[5].data.inquiries);
      })
      .catch(() => setError("Unable to load dashboard data"))
      .finally(() => setLoading(false));
  }, [user]);

  const selectSection = (id) => {
    setActiveSection(id);
    setMobileOpen(false);
    const next = `${window.location.pathname}?section=${id}`;
    window.history.pushState(null, "", next);
  };

  const signOut = () => {
    logout();
    showToast("Logged out successfully");
    router.push("/");
  };

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/inquiries/${id}/status`, { status });
      setOwnerInquiries((items) => items.map((item) => item._id === id ? { ...item, status } : item));
      showToast("Booking request status updated");
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to update booking request", "error");
    }
  };

  const removeWishlist = async (propertyId) => {
    try {
      await api.post(`/wishlist/${propertyId}/toggle`);
      setWishlist((items) => items.filter((item) => item.property?._id !== propertyId));
      showToast("Removed from wishlist");
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to update wishlist", "error");
    }
  };

  const stats = useMemo(() => ({
    bookings: bookings.length,
    active: bookings.filter((item) => filterBooking(item, "active")).length,
    wishlist: wishlist.length,
    pending: bookings.filter((item) => filterBooking(item, "pending")).length
  }), [bookings, wishlist]);

  const panelProps = { user, bookings, inquiries, wishlist, savedAddresses, setSavedAddresses, properties, ownerInquiries, updateStatus, removeWishlist, stats };

  return (
    <ProtectedRoute>
      <DashboardLayout
        title={`Welcome, ${user?.name || "there"}`}
        actions={user?.role === "admin" ? <Link key="add" href="/add-item" className="btn-primary">Add item</Link> : null}
      >
        {loading ? <Loading /> : error ? <ErrorMessage message={error} /> : (
          <div className="relative">
            <button className="btn-secondary mb-4 lg:hidden" type="button" onClick={() => setMobileOpen(true)}>
              <Menu className="h-4 w-4" /> Menu
            </button>
            {mobileOpen && <button className="fixed inset-0 z-30 bg-black/40 lg:hidden" type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
            <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
              <DashboardSidebar
                activeId={activeSection}
                collapsed={collapsed}
                headerLabel="My Account"
                items={sections}
                mobileOpen={mobileOpen}
                onCollapse={() => setCollapsed((value) => !value)}
                onClose={() => setMobileOpen(false)}
                onSelect={selectSection}
                onLogout={signOut}
                user={user}
              />
              <main className="min-w-0 rounded-[1.5rem] border border-violet-100 bg-white/90 p-4 shadow-soft dark:border-violet-900/70 dark:bg-white/10 md:p-6">
                <DashboardPanel section={activeSection} {...panelProps} />
              </main>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function DashboardPanel(props) {
  if (props.section === "bookings") return <BookingsPanel {...props} />;
  if (props.section === "wishlist") return <WishlistPanel {...props} />;
  if (props.section === "profile") return <ProfilePanel user={props.user} />;
  if (props.section === "addresses") return <AddressesPanel user={props.user} addresses={props.savedAddresses} setAddresses={props.setSavedAddresses} />;
  if (props.section === "payments") return <PaymentsPanel bookings={props.bookings} />;
  if (props.section === "notifications") return <NotificationsPanel bookings={props.bookings} inquiries={props.inquiries} />;
  if (props.section === "support") return <SupportPanel />;
  return <OverviewPanel {...props} />;
}

function SectionHeader({ title, text, action }) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
      <div>
        <h2 className="text-2xl font-black text-ink dark:text-white">{title}</h2>
        {text && <p className="mt-1 text-sm text-violet-950/60 dark:text-violet-100/65">{text}</p>}
      </div>
      {action}
    </div>
  );
}

function OverviewPanel({ user, bookings, inquiries, wishlist, properties, ownerInquiries, updateStatus, stats }) {
  return (
    <div className="space-y-6">
      <SectionHeader title="Dashboard Overview" text="Track bookings, wishlist items, and account activity from one place." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Package} label="Bookings" value={stats.bookings} />
        <MetricCard icon={CalendarDays} label="Active" value={stats.active} />
        <MetricCard icon={Heart} label="Wishlist" value={stats.wishlist} />
        <MetricCard icon={Bell} label="Pending" value={stats.pending} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-violet-100 bg-mist/70 p-4 dark:border-violet-900/70 dark:bg-white/10">
          <h3 className="text-lg font-black">Recent bookings</h3>
          <div className="mt-4 space-y-3">
            {bookings.slice(0, 3).map((booking) => <BookingCard key={booking._id} booking={booking} compact />)}
            {!bookings.length && <EmptyState title="No bookings yet" message="Your rental bookings will appear here." actionHref="/items" actionLabel="Browse items" />}
          </div>
        </div>
        <div className="rounded-2xl border border-violet-100 bg-mist/70 p-4 dark:border-violet-900/70 dark:bg-white/10">
          <h3 className="text-lg font-black">Saved wishlist</h3>
          <div className="mt-4 grid gap-3">
            {wishlist.slice(0, 3).map((item) => <WishlistMini key={item._id} item={item} />)}
            {!wishlist.length && <EmptyState title="No saved items" message="Save items to compare and book later." actionHref="/items" actionLabel="Explore rentals" />}
          </div>
        </div>
      </div>

      {["owner", "admin"].includes(user?.role) && (
        <div className="space-y-5">
          <section>
            <h3 className="mb-4 text-lg font-black">My rental items</h3>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {properties.length ? properties.map((property) => <PropertyCard key={property._id} property={property} />) : <EmptyState title="No rental items listed" message="Admin-published inventory appears here." />}
            </div>
          </section>
          <section>
            <h3 className="mb-4 text-lg font-black">Requests to manage</h3>
            <div className="grid gap-3">
              {ownerInquiries.length ? ownerInquiries.map((item) => <RentalRequestCard key={item._id} request={item} showUser showAvailable onStatusChange={updateStatus} />) : <EmptyState title="No requests to manage" message="Requests for listed inventory will appear here." />}
            </div>
          </section>
        </div>
      )}

      <section>
        <h3 className="mb-4 text-lg font-black">My booking requests</h3>
        <div className="grid gap-3">
          {inquiries.length ? inquiries.slice(0, 3).map((item) => <RentalRequestCard key={item._id} request={item} />) : <EmptyState title="No booking requests" message="Booking requests appear here after you submit an item request." actionHref="/items" actionLabel="Browse items" />}
        </div>
      </section>
    </div>
  );
}

function BookingsPanel({ bookings }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const visible = bookings.filter((booking) => filterBooking(booking, filter)).filter((booking) => {
    const text = `${booking.property?.title || ""} ${booking.paymentStatus || ""} ${booking.status || ""}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  return (
    <div>
      <SectionHeader title="Orders / Bookings" text="Review rental dates, payment state, amount, and booking status." />
      <div className="mb-5 grid gap-3 xl:grid-cols-[1fr_auto]">
        <label className="flex items-center gap-2 rounded-2xl border border-violet-100 bg-mist/70 px-4 py-3 dark:border-violet-900/70 dark:bg-white/10">
          <Search className="h-4 w-4 text-violet-500" />
          <input className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-violet-950/45 dark:placeholder:text-violet-100/45" placeholder="Search bookings" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="flex gap-2 overflow-x-auto">
          {bookingFilters.map(([id, label]) => (
            <button key={id} type="button" onClick={() => setFilter(id)} className={`shrink-0 rounded-xl px-4 py-3 text-sm font-black transition ${filter === id ? "bg-violet-700 text-white shadow-soft" : "bg-violet-50 text-violet-800 hover:bg-violet-100 dark:bg-white/10 dark:text-violet-100"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4">
        {visible.map((booking) => <BookingCard key={booking._id} booking={booking} />)}
        {!visible.length && <EmptyState title="No matching bookings" message="Try a different filter or search term." actionHref="/items" actionLabel="Browse rentals" />}
      </div>
    </div>
  );
}

function BookingCard({ booking, compact = false }) {
  return (
    <article className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft dark:border-violet-900/70 dark:bg-stone-950/70">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-black text-ink dark:text-white">{booking.property?.title || "Rental item"}</h3>
          <p className="mt-1 text-sm font-semibold text-violet-950/60 dark:text-violet-100/65">
            {formatDate(booking.startDate)} - {formatDate(booking.endDate)} · {booking.quantity} item(s)
          </p>
          {!compact && <p className="mt-2 line-clamp-2 text-sm text-violet-950/60 dark:text-violet-100/65">Delivery: {booking.deliveryAddress || "Address shared"}</p>}
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          <StatusPill label={statusLabel(booking.status)} className={statusTone[booking.status]} />
          <StatusPill label={`payment ${booking.paymentStatus}`} />
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <InfoCard label="Amount" value={`₹${Number(booking.finalAmount || booking.totalAmount || 0).toLocaleString()}`} />
        <InfoCard label="Method" value={booking.paymentMethod === "razorpay" ? "Razorpay" : "Cash on Delivery"} />
        <InfoCard label="Delivery" value={booking.deliveryEta || (booking.deliverySpeed === "fast" ? "Within 2 hours" : "Within 24 hours")} />
        <InfoCard label="Booking ID" value={String(booking._id).slice(-8)} />
      </div>
      {!compact && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/items/${booking.property?._id || ""}`} className="btn-secondary">View item</Link>
          <Link href="/contact" className="btn-primary">Get support</Link>
        </div>
      )}
    </article>
  );
}

function WishlistPanel({ wishlist, removeWishlist }) {
  return (
    <div>
      <SectionHeader title="Wishlist" text="Saved items are ready when you want to compare or book." action={<Link href="/items" className="btn-secondary">Browse more</Link>} />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {wishlist.map((item) => <WishlistCard key={item._id} item={item} onRemove={removeWishlist} />)}
        {!wishlist.length && <div className="sm:col-span-2 xl:col-span-3"><EmptyState title="No saved items" message="Tap the heart on item cards to save gear for later." actionHref="/items" actionLabel="Browse items" /></div>}
      </div>
    </div>
  );
}

function WishlistCard({ item, onRemove }) {
  const property = item.property;
  if (!property) return null;
  return (
    <article className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-soft dark:border-violet-900/70 dark:bg-stone-950/70">
      <Link href={`/items/${property._id}`} className="block aspect-[4/3] overflow-hidden bg-stone-100 dark:bg-stone-900">
        <img src={uploadUrl(property.images?.[0])} alt={property.title} className="h-full w-full object-cover transition hover:scale-105" />
      </Link>
      <div className="p-4">
        <h3 className="line-clamp-2 text-base font-black text-ink dark:text-white">{property.title}</h3>
        <p className="mt-2 text-sm font-black text-meadow">₹{Number(property.rent || 0).toLocaleString()} / day</p>
        <p className="mt-1 flex items-center gap-1 text-sm text-violet-950/60 dark:text-violet-100/65"><MapPin className="h-4 w-4" /> Pincode {property.pincode || "-"}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Link href={`/items/${property._id}`} className="btn-primary">Rent now</Link>
          <button type="button" onClick={() => onRemove(property._id)} className="btn-secondary">Remove</button>
        </div>
      </div>
    </article>
  );
}

function WishlistMini({ item }) {
  const property = item.property;
  if (!property) return null;
  return (
    <Link href={`/items/${property._id}`} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft dark:bg-stone-950/70">
      <img src={uploadUrl(property.images?.[0])} alt={property.title} className="h-14 w-14 rounded-xl object-cover" />
      <div className="min-w-0">
        <p className="truncate text-sm font-black">{property.title}</p>
        <p className="text-xs font-semibold text-meadow">₹{Number(property.rent || 0).toLocaleString()} / day</p>
      </div>
    </Link>
  );
}

function ProfilePanel({ user }) {
  return (
    <div>
      <SectionHeader title="Profile" text="Your account details used for bookings and support." />
      <div className="grid gap-4 lg:grid-cols-2">
        <InfoCard icon={UserRound} label="Name" value={user?.name || "-"} />
        <InfoCard icon={Bookmark} label="Role" value={user?.role || "user"} />
        <InfoCard icon={Bell} label="Email" value={user?.email || "-"} />
        <InfoCard icon={ShieldCheck} label="Account" value="Protected" />
      </div>
    </div>
  );
}

function AddressesPanel({ user, addresses = [], setAddresses }) {
  const { showToast } = useToast();
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const startEdit = (address) => {
    setEditingId(address._id);
    setForm({
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

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const saveEdit = async (id) => {
    setSaving(true);
    try {
      const { data } = await api.put(`/auth/addresses/${id}`, form);
      setAddresses(data.addresses || []);
      setEditingId("");
      showToast("Address updated");
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to update address", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteAddress = async (id) => {
    if (!window.confirm("Delete this saved address?")) return;
    try {
      const { data } = await api.delete(`/auth/addresses/${id}`);
      setAddresses(data.addresses || []);
      if (editingId === id) setEditingId("");
      showToast("Address deleted");
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to delete address", "error");
    }
  };

  return (
    <div>
      <SectionHeader title="Saved Addresses" text="Addresses saved during checkout appear here for faster future bookings." action={<Link href="/items" className="btn-secondary">Book an item</Link>} />
      {addresses.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {addresses.map((address) => (
            <article key={address._id} className="rounded-2xl border border-violet-100 bg-mist/70 p-5 shadow-sm dark:border-violet-900/70 dark:bg-white/10">
              {editingId === address._id ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input className="field" placeholder="Full name" value={form.fullName || ""} onChange={(event) => update("fullName", event.target.value)} />
                    <input className="field" placeholder="Mobile number" value={form.mobileNumber || ""} onChange={(event) => update("mobileNumber", event.target.value)} />
                    <input className="field" placeholder="House/Flat No." value={form.houseFlatNo || ""} onChange={(event) => update("houseFlatNo", event.target.value)} />
                    <input className="field" placeholder="Street/Area" value={form.streetArea || ""} onChange={(event) => update("streetArea", event.target.value)} />
                    <input className="field" placeholder="Landmark optional" value={form.landmark || ""} onChange={(event) => update("landmark", event.target.value)} />
                    <input className="field" placeholder="City" value={form.city || ""} onChange={(event) => update("city", event.target.value)} />
                    <input className="field" placeholder="State" value={form.state || ""} onChange={(event) => update("state", event.target.value)} />
                    <input className="field" inputMode="numeric" maxLength={6} placeholder="PIN Code" value={form.pincode || ""} onChange={(event) => update("pincode", event.target.value.replace(/\D/g, "").slice(0, 6))} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-primary" type="button" disabled={saving} onClick={() => saveEdit(address._id)}>
                      <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save"}
                    </button>
                    <button className="btn-secondary" type="button" onClick={() => setEditingId("")}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <Home className="mt-1 h-5 w-5 shrink-0 text-meadow" />
                    <div className="min-w-0">
                      <h3 className="font-black text-ink dark:text-white">{address.fullName}</h3>
                      <p className="mt-1 text-sm font-semibold text-violet-950/70 dark:text-violet-100/70">{address.mobileNumber}</p>
                      <p className="mt-2 text-sm leading-6 text-violet-950/60 dark:text-violet-100/65">
                        {[address.houseFlatNo, address.streetArea, address.landmark, address.city, address.state, address.pincode].filter(Boolean).join(", ")}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="btn-secondary px-3 py-2 text-xs" type="button" onClick={() => startEdit(address)}>
                      <Edit3 className="h-4 w-4" /> Edit
                    </button>
                    <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-50 dark:border-red-900/70 dark:bg-white/10 dark:text-red-300 dark:hover:bg-red-950/30" type="button" onClick={() => deleteAddress(address._id)}>
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-violet-100 bg-mist/70 p-5 dark:border-violet-900/70 dark:bg-white/10">
          <div className="flex items-start gap-3">
            <Home className="mt-1 h-5 w-5 text-meadow" />
            <div>
              <h3 className="font-black">No saved addresses</h3>
              <p className="mt-1 text-sm text-violet-950/60 dark:text-violet-100/65">Use the save-address checkbox during checkout to store delivery details here.</p>
              <p className="mt-3 text-sm font-semibold text-violet-950/70 dark:text-violet-100/70">Account: {user?.email || "-"}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentsPanel({ bookings }) {
  const paid = bookings.filter((booking) => booking.paymentStatus === "paid");
  const pending = bookings.filter((booking) => booking.paymentStatus === "pending");
  return (
    <div>
      <SectionHeader title="Payments" text="Review payment methods and pending dues." />
      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard icon={CreditCard} label="Paid bookings" value={paid.length} />
        <MetricCard icon={Package} label="Pending payments" value={pending.length} />
      </div>
      <div className="mt-5 grid gap-3">
        {bookings.slice(0, 5).map((booking) => (
          <div key={booking._id} className="flex flex-col justify-between gap-2 rounded-2xl border border-violet-100 bg-white p-4 text-sm dark:border-violet-900/70 dark:bg-stone-950/70 md:flex-row md:items-center">
            <strong>{booking.property?.title || "Rental item"}</strong>
            <span>₹{Number(booking.finalAmount || booking.totalAmount || 0).toLocaleString()} · {booking.paymentMethod === "razorpay" ? "Razorpay" : "COD"} · {booking.paymentStatus}</span>
          </div>
        ))}
        {!bookings.length && <EmptyState title="No payments yet" message="Payments will appear after your first booking." />}
      </div>
    </div>
  );
}

function NotificationsPanel({ bookings, inquiries }) {
  const items = [
    ...bookings.slice(0, 4).map((booking) => ({ id: `b-${booking._id}`, title: booking.property?.title || "Booking update", text: `Payment ${booking.paymentStatus}, status ${statusLabel(booking.status)}` })),
    ...inquiries.slice(0, 4).map((inquiry) => ({ id: `i-${inquiry._id}`, title: inquiry.property?.title || "Booking request", text: `Request status ${statusLabel(inquiry.status)}` }))
  ];
  return (
    <div>
      <SectionHeader title="Notifications" text="Recent booking and request updates." />
      <div className="grid gap-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-violet-100 bg-white p-4 dark:border-violet-900/70 dark:bg-stone-950/70">
            <h3 className="font-black">{item.title}</h3>
            <p className="mt-1 text-sm text-violet-950/60 dark:text-violet-100/65">{item.text}</p>
          </div>
        ))}
        {!items.length && <EmptyState title="No notifications" message="Updates from bookings and support will appear here." />}
      </div>
    </div>
  );
}

function SupportPanel() {
  return (
    <div>
      <SectionHeader title="Support / Contact" text="Get help with rentals, payments, delivery, or account questions." />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-violet-100 bg-mist/70 p-5 dark:border-violet-900/70 dark:bg-white/10">
          <Headphones className="h-7 w-7 text-meadow" />
          <h3 className="mt-3 text-lg font-black">Need assistance?</h3>
          <p className="mt-2 text-sm text-violet-950/60 dark:text-violet-100/65">Share item name, dates, booking ID, and your question for faster support.</p>
          <Link href="/contact" className="btn-primary mt-5">Contact support</Link>
        </div>
        <div className="rounded-2xl border border-violet-100 bg-white p-5 dark:border-violet-900/70 dark:bg-stone-950/70">
          <h3 className="text-lg font-black">Quick links</h3>
          <div className="mt-4 grid gap-2">
            <Link href="/items" className="btn-secondary justify-start">Browse rentals</Link>
            <Link href="/cart" className="btn-secondary justify-start">Open cart</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm dark:border-violet-900/70 dark:bg-stone-950/70">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-violet-950/55 dark:text-violet-100/60">{label}</p>
          <p className="mt-1 text-3xl font-black text-ink dark:text-white">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-100">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-violet-100 bg-white p-4 dark:border-violet-900/70 dark:bg-stone-950/70">
      <div className="flex items-center gap-3">
        {Icon && <Icon className="h-5 w-5 text-meadow" />}
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-violet-950/45 dark:text-violet-100/45">{label}</p>
          <p className="mt-1 truncate text-sm font-black text-ink dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ label, className = "bg-violet-50 text-violet-700 dark:bg-violet-950/70 dark:text-violet-100" }) {
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${className}`}>{label}</span>;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}
