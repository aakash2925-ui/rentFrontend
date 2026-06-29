"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Bookmark,
  Camera,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Edit3,
  Headphones,
  Heart,
  Home,
  IndianRupee,
  LayoutDashboard,
  MapPin,
  Menu,
  Package,
  Search,
  ShieldCheck,
  Save,
  Trash2,
  Truck,
  Upload,
  X,
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

const deliverySlotLabels = {
  early: "Early delivery",
  afternoon: "Afternoon slot",
  evening: "Evening slot",
  standard: "Standard delivery",
  fast: "Fast delivery"
};

const deliverySlotWindows = {
  early: "11AM-1PM",
  afternoon: "1PM-3PM",
  evening: "3PM-5PM",
  standard: "5PM-11PM",
  fast: "Within 2 hours"
};

const orderTrackerSteps = [
  { key: "pending", label: "Placed", text: "Booking request created" },
  { key: "paid", label: "Payment", text: "Payment/COD selected" },
  { key: "rented", label: "Confirmed", text: "Admin confirmed order" },
  { key: "delivery", label: "Delivery", text: "Ready for handover" },
  { key: "returned", label: "Completed", text: "Rental completed" }
];

const bookingTrackerIndex = (booking) => {
  if (booking.paymentStatus === "failed" || booking.paymentStatus === "cancelled" || booking.status === "closed") return -1;
  if (booking.status === "returned") return 4;
  if (booking.status === "rented") return 3;
  if (booking.status === "contacted") return 2;
  if (booking.paymentStatus === "paid" || booking.paymentMethod === "cod") return 1;
  return 0;
};

const KYC_MAX_FILE_SIZE = 5 * 1024 * 1024;
const KYC_ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
const kycDocumentLabels = {
  aadhaar: "Aadhaar Card",
  pan: "PAN Card",
  passport: "Passport"
};

const validateKycUploadFile = (file) => {
  if (!file) return "Select a clear JPG, PNG, or PDF file";
  if (!KYC_ALLOWED_TYPES.includes(file.type)) return "Only JPG, PNG, and PDF files are supported";
  if (file.size > KYC_MAX_FILE_SIZE) return "File size must be 5 MB or less";
  return "";
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

  const panelProps = { user, bookings, inquiries, wishlist, savedAddresses, setSavedAddresses, properties, ownerInquiries, updateStatus, removeWishlist, stats, onNavigate: selectSection };

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

function OverviewPanel({ wishlist, stats, onNavigate }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Package} label="Bookings" value={stats.bookings} onClick={() => onNavigate("bookings")} />
        <MetricCard icon={CalendarDays} label="Active" value={stats.active} onClick={() => onNavigate("bookings")} />
        <MetricCard icon={Heart} label="Wishlist" value={stats.wishlist} onClick={() => onNavigate("wishlist")} />
        <MetricCard icon={Bell} label="Pending" value={stats.pending} onClick={() => onNavigate("bookings")} />
      </div>

      <div className="rounded-2xl border border-violet-100 bg-mist/70 p-4 dark:border-violet-900/70 dark:bg-white/10">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-black">Saved wishlist</h3>
          <button className="text-sm font-black text-meadow transition hover:text-violet-700" type="button" onClick={() => onNavigate("wishlist")}>View all</button>
        </div>
        <div className="mt-4 grid gap-3">
          {wishlist.slice(0, 3).map((item) => <WishlistMini key={item._id} item={item} />)}
          {!wishlist.length && <EmptyState title="No saved items" message="Save items to compare and book later." actionHref="/items" actionLabel="Explore rentals" />}
        </div>
      </div>
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
  const [trackingOpen, setTrackingOpen] = useState(false);
  const itemHref = booking.property?._id ? `/items/${booking.property._id}` : "";
  const title = booking.property?.title || "Rental item";
  const deliveryDate = booking.deliveryDate || booking.startDate;
  const deliveryLabel = deliverySlotLabels[booking.deliverySpeed] || "Delivery";
  const deliveryWindow = booking.deliveryEta || deliverySlotWindows[booking.deliverySpeed] || "Within 24 hours";
  const trackerIndex = bookingTrackerIndex(booking);
  const cancelled = trackerIndex === -1;

  return (
    <article className="min-w-0 overflow-hidden rounded-[1.35rem] border border-violet-100 bg-white shadow-sm transition hover:shadow-soft dark:border-violet-900/70 dark:bg-stone-950/70">
      <div className="border-b border-violet-100 bg-gradient-to-r from-violet-50 via-white to-fuchsia-50 p-4 dark:border-violet-900/70 dark:from-violet-950/50 dark:via-stone-950 dark:to-fuchsia-950/30">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div className="min-w-0 flex-1">
            {itemHref ? (
              <Link href={itemHref} className="line-clamp-2 max-w-full break-words text-xl font-black leading-snug text-ink transition hover:text-meadow dark:text-white">
                {title}
              </Link>
            ) : (
              <h3 className="line-clamp-2 max-w-full break-words text-xl font-black leading-snug text-ink dark:text-white">{title}</h3>
            )}
            <p className="mt-2 break-words text-sm font-semibold text-violet-950/60 dark:text-violet-100/65">
              Booking ID #{String(booking._id).slice(-8)} · {booking.quantity || 1} item(s)
            </p>
          </div>
          <div className="flex min-w-0 flex-wrap gap-2 md:max-w-[45%] md:justify-end">
            <StatusPill label={statusLabel(booking.status)} className={statusTone[booking.status]} />
            <StatusPill label={`payment ${booking.paymentStatus}`} />
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <InfoCard icon={IndianRupee} label="Amount" value={`₹${Number(booking.finalAmount || booking.totalAmount || 0).toLocaleString()}`} />
          <InfoCard icon={CreditCard} label="Payment" value={booking.paymentMethod === "razorpay" ? "Razorpay" : "Cash on Delivery"} />
          <InfoCard icon={CalendarDays} label="Rental dates" value={`${formatDate(booking.startDate)} - ${formatDate(booking.endDate)}`} />
          <InfoCard icon={Package} label="Booking ID" value={String(booking._id).slice(-8)} />
        </div>

        <div className="mt-4">
          <div className="min-w-0 rounded-2xl border border-violet-100 bg-mist/70 p-4 dark:border-violet-900/70 dark:bg-white/10">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-100">
                <Truck className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-wide text-violet-950/45 dark:text-violet-100/45">Delivery date & time</p>
                <p className="mt-1 break-words text-base font-black text-ink dark:text-white">{formatDate(deliveryDate)} · {deliveryWindow}</p>
                <p className="mt-1 break-words text-sm font-semibold text-violet-950/60 dark:text-violet-100/65">{deliveryLabel}</p>
                {!compact && <p className="mt-3 break-words text-sm leading-6 text-violet-950/65 dark:text-violet-100/70">{booking.deliveryAddress || "Address shared"}</p>}
              </div>
            </div>
          </div>
        </div>

        {!compact && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={() => setTrackingOpen(true)}>
              <Clock3 className="h-4 w-4" /> Track order
            </button>
            {itemHref && <Link href={itemHref} className="btn-secondary">View item</Link>}
            <Link href="/contact" className="btn-secondary">Get support</Link>
          </div>
        )}
      </div>
      {trackingOpen && (
        <OrderTrackingModal
          booking={booking}
          cancelled={cancelled}
          deliveryDate={deliveryDate}
          deliveryLabel={deliveryLabel}
          deliveryWindow={deliveryWindow}
          onClose={() => setTrackingOpen(false)}
          trackerIndex={trackerIndex}
        />
      )}
    </article>
  );
}

function OrderTrackingModal({ booking, cancelled, deliveryDate, deliveryLabel, deliveryWindow, onClose, trackerIndex }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4 py-6 backdrop-blur-sm">
      <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[1.5rem] border border-violet-100 bg-white p-5 shadow-glow dark:border-violet-900/70 dark:bg-stone-950">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-meadow">Order tracking</p>
            <h3 className="mt-1 break-words text-2xl font-black text-ink dark:text-white">{booking.property?.title || "Rental item"}</h3>
            <p className="mt-1 text-sm font-semibold text-violet-950/60 dark:text-violet-100/65">Booking ID #{String(booking._id).slice(-8)}</p>
          </div>
          <button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-50 text-violet-700 transition hover:bg-violet-100 dark:bg-white/10 dark:text-violet-100" onClick={onClose} aria-label="Close tracking modal">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <InfoCard icon={Truck} label="Delivery" value={`${formatDate(deliveryDate)} · ${deliveryWindow}`} />
          <InfoCard icon={Package} label="Current status" value={cancelled ? "Stopped" : statusLabel(booking.status)} />
        </div>
        <p className="mt-3 break-words rounded-2xl bg-mist/70 px-4 py-3 text-sm font-semibold text-violet-950/65 dark:bg-white/10 dark:text-violet-100/70">
          {deliveryLabel} · {booking.deliveryAddress || "Address shared"}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-5">
          {orderTrackerSteps.map((step, index) => {
            const done = !cancelled && index <= trackerIndex;
            const current = !cancelled && index === trackerIndex;
            return (
              <div key={step.key} className="min-w-0 rounded-2xl border border-violet-100 bg-mist/70 p-3 dark:border-violet-900/70 dark:bg-white/10">
                <div className={`grid h-10 w-10 place-items-center rounded-full border text-xs font-black ${
                  done ? "border-meadow bg-meadow text-white" : "border-violet-100 bg-white text-violet-500 dark:border-violet-900/70 dark:bg-stone-950 dark:text-violet-100/60"
                }`}>
                  {done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                </div>
                <p className={`mt-3 break-words text-sm font-black ${current ? "text-meadow" : "text-ink dark:text-white"}`}>{step.label}</p>
                <p className="mt-1 break-words text-xs font-semibold leading-5 text-violet-950/55 dark:text-violet-100/50">{step.text}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
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
    <article className="min-w-0 overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-soft dark:border-violet-900/70 dark:bg-stone-950/70">
      <Link href={`/items/${property._id}`} className="block aspect-[4/3] overflow-hidden bg-stone-100 dark:bg-stone-900">
        <img src={uploadUrl(property.images?.[0])} alt={property.title} className="h-full w-full object-cover transition hover:scale-105" />
      </Link>
      <div className="min-w-0 p-4">
        <h3 className="line-clamp-2 max-w-full break-words text-base font-black leading-snug text-ink dark:text-white">{property.title}</h3>
        <p className="mt-2 text-sm font-black text-meadow">₹{Number(property.rent || 0).toLocaleString()} / day</p>
        <p className="mt-1 flex min-w-0 items-center gap-1 text-sm text-violet-950/60 dark:text-violet-100/65"><MapPin className="h-4 w-4 shrink-0" /> <span className="min-w-0 truncate">Pincode {property.pincode || "-"}</span></p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Link href={`/items/${property._id}`} className="btn-primary min-w-0 text-center">Rent now</Link>
          <button type="button" onClick={() => onRemove(property._id)} className="btn-secondary min-w-0">Remove</button>
        </div>
      </div>
    </article>
  );
}

function WishlistMini({ item }) {
  const property = item.property;
  if (!property) return null;
  return (
    <Link href={`/items/${property._id}`} className="flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft dark:bg-stone-950/70">
      <img src={uploadUrl(property.images?.[0])} alt={property.title} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
      <div className="min-w-0">
        <p className="line-clamp-2 max-w-full break-words text-sm font-black leading-snug">{property.title}</p>
        <p className="text-xs font-semibold text-meadow">₹{Number(property.rent || 0).toLocaleString()} / day</p>
      </div>
    </Link>
  );
}

function ProfilePanel({ user }) {
  const { updateUser } = useAuth();
  const { showToast } = useToast();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [kycForm, setKycForm] = useState({
    legalName: user?.kyc?.legalName || user?.name || "",
    documentType: user?.kyc?.documentType || "aadhaar",
    documentNumber: user?.kyc?.documentNumber || ""
  });
  const [kycOtp, setKycOtp] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [capturePreview, setCapturePreview] = useState("");
  const [captureFile, setCaptureFile] = useState(null);
  const [savingKyc, setSavingKyc] = useState(false);
  const [verifyingKyc, setVerifyingKyc] = useState(false);
  const kycStatus = user?.kyc?.status || "not_submitted";
  const kycApproved = kycStatus === "approved";
  const kycPhotoSubmitted = Boolean(user?.kyc?.hasSelfieWithIdImage);

  const stopCamera = (updateState = true) => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (updateState) setCameraActive(false);
  };

  const startCamera = async () => {
    if (kycApproved) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      setCameraActive(true);
    } catch {
      showToast("Unable to open camera. Please allow camera permission and try again.", "error");
    }
  };

  const captureKycPhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (!video.videoWidth || !video.videoHeight) {
      showToast("Camera is still loading. Please try again in a moment.", "error");
      return;
    }
    canvas.width = video.videoWidth || 960;
    canvas.height = video.videoHeight || 720;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `kyc-selfie-${Date.now()}.jpg`, { type: "image/jpeg" });
      setCaptureFile(file);
      setCapturePreview(URL.createObjectURL(file));
      stopCamera();
    }, "image/jpeg", 0.9);
  };

  useEffect(() => () => stopCamera(false), []);

  useEffect(() => {
    if (!cameraActive || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    videoRef.current.play().catch(() => {});
  }, [cameraActive]);

  const submitKyc = async (event) => {
    event.preventDefault();
    if (!captureFile && !kycPhotoSubmitted) {
      showToast("Capture a live photo holding your identity card", "error");
      return;
    }
    setSavingKyc(true);
    try {
      const formData = new FormData();
      formData.append("legalName", kycForm.legalName);
      formData.append("documentType", kycForm.documentType);
      formData.append("documentNumber", kycForm.documentNumber);
      if (captureFile) formData.append("selfieWithId", captureFile);
      const { data } = await api.post("/auth/kyc", formData);
      updateUser(data.user);
      setCapturePreview("");
      setCaptureFile(null);
      showToast(data.message || "KYC OTP sent to your email");
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to submit KYC", "error");
    } finally {
      setSavingKyc(false);
    }
  };

  const verifyKyc = async () => {
    setVerifyingKyc(true);
    try {
      const { data } = await api.post("/auth/kyc/verify", { otp: kycOtp });
      updateUser(data.user);
      setKycOtp("");
      showToast("KYC verified successfully");
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to verify KYC OTP", "error");
    } finally {
      setVerifyingKyc(false);
    }
  };

  return (
    <div>
      <SectionHeader title="Profile" text="Your account details used for bookings and support." />
      <div className="grid gap-4 lg:grid-cols-2">
        <InfoCard icon={UserRound} label="Name" value={user?.name || "-"} />
        <InfoCard icon={Bookmark} label="Role" value={user?.role || "user"} />
        <InfoCard icon={Bell} label="Email" value={user?.email || "-"} />
        <InfoCard icon={ShieldCheck} label="KYC" value={kycStatus.replace("_", " ")} />
      </div>
      {kycApproved ? (
        <div className="mt-5 rounded-2xl border border-green-100 bg-green-50 p-5 text-green-700 shadow-soft dark:border-green-900/70 dark:bg-green-950/30 dark:text-green-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-green-600 shadow-sm dark:bg-white/10 dark:text-green-200">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <div>
                <p className="text-lg font-black text-ink dark:text-white">KYC completed</p>
                <p className="mt-1 text-sm font-semibold text-green-700/75 dark:text-green-100/75">Your identity verification is approved.</p>
              </div>
            </div>
            <span className="w-fit rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-green-700 shadow-sm dark:bg-white/10 dark:text-green-100">
              KYC completed
            </span>
          </div>
        </div>
      ) : (
      <form onSubmit={submitKyc} className="mt-5 rounded-2xl border border-violet-100 bg-mist/70 p-5 dark:border-violet-900/70 dark:bg-white/10">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <h3 className="text-lg font-black text-ink dark:text-white">KYC Verification</h3>
            <p className="mt-1 text-sm text-violet-950/60 dark:text-violet-100/65">Submit identity details and verify the OTP sent to your registered email before bookings.</p>
          </div>
          <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${
            kycStatus === "approved" ? "bg-green-50 text-green-700" : kycStatus === "rejected" ? "bg-red-50 text-red-700" : ["pending", "otp_pending"].includes(kycStatus) ? "bg-amber-50 text-amber-700" : "bg-violet-50 text-violet-700"
          }`}>
            {kycStatus.replace("_", " ")}
          </span>
        </div>
        {user?.kyc?.rejectionReason && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{user.kyc.rejectionReason}</p>}
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="space-y-2">
            <span className="text-sm font-black">Legal name</span>
            <input className="field disabled:cursor-not-allowed disabled:opacity-70" disabled={kycApproved} value={kycForm.legalName} onChange={(event) => setKycForm((current) => ({ ...current, legalName: event.target.value }))} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-black">Document type</span>
            <select className="field disabled:cursor-not-allowed disabled:opacity-70" disabled={kycApproved} value={kycForm.documentType} onChange={(event) => setKycForm((current) => ({ ...current, documentType: event.target.value }))}>
              <option value="aadhaar">Aadhaar</option>
              <option value="pan">PAN</option>
              <option value="passport">Passport</option>
              <option value="driving_license">Driving license</option>
              <option value="voter_id">Voter ID</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-black">Document number</span>
            <input className="field uppercase disabled:cursor-not-allowed disabled:opacity-70" disabled={kycApproved} value={kycForm.documentNumber} onChange={(event) => setKycForm((current) => ({ ...current, documentNumber: event.target.value.toUpperCase() }))} />
          </label>
        </div>
        <div className="mt-4 rounded-2xl border border-violet-100 bg-white/80 p-4 dark:border-violet-900/70 dark:bg-stone-950/40">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <h4 className="font-black text-ink dark:text-white">{kycApproved ? "KYC submitted successfully" : "Live photo with identity card"}</h4>
              <p className="mt-1 text-sm text-violet-950/60 dark:text-violet-100/65">
                {kycApproved ? "Your identity verification is approved. KYC details are locked for your account." : "Hold your identity card near your face, then capture a clear live photo."}
              </p>
            </div>
            <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${kycApproved || capturePreview || kycPhotoSubmitted ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
              {kycApproved ? "Verified" : kycPhotoSubmitted ? "Submitted to admin" : capturePreview ? "Photo captured" : "Required"}
            </span>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="overflow-hidden rounded-2xl border border-violet-100 bg-stone-950 dark:border-violet-900/70">
              {cameraActive ? (
                <video ref={videoRef} className="aspect-video w-full object-cover" autoPlay muted playsInline onLoadedMetadata={(event) => event.currentTarget.play().catch(() => {})} />
              ) : capturePreview ? (
                <img src={capturePreview} alt="KYC live photo preview" className="aspect-video w-full object-cover" />
              ) : kycApproved ? (
                <div className="flex aspect-video flex-col items-center justify-center gap-2 bg-green-950 text-center text-white">
                  <ShieldCheck className="h-8 w-8" />
                  <p className="text-sm font-bold">KYC submitted successfully</p>
                  <p className="max-w-xs text-xs text-green-100/75">Your verification has been approved.</p>
                </div>
              ) : kycPhotoSubmitted ? (
                <div className="flex aspect-video flex-col items-center justify-center gap-2 bg-green-950 text-center text-white">
                  <ShieldCheck className="h-8 w-8" />
                  <p className="text-sm font-bold">KYC photo submitted for admin review</p>
                </div>
              ) : (
                <div className="flex aspect-video flex-col items-center justify-center gap-2 bg-violet-950 text-center text-white">
                  <Camera className="h-8 w-8" />
                  <p className="text-sm font-bold">Camera preview will appear here</p>
                </div>
              )}
            </div>
            <div className="flex flex-col justify-center gap-3">
              {kycApproved ? (
                <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-sm font-bold text-green-700 dark:border-green-900/70 dark:bg-green-950/30 dark:text-green-200">
                  KYC submitted successfully. No further action is required.
                </div>
              ) : (
                <>
                  <button className="btn-secondary" type="button" disabled={cameraActive} onClick={startCamera}>
                    <Camera className="h-4 w-4" /> Open camera
                  </button>
                  {cameraActive && (
                    <button className="btn-primary" type="button" onClick={captureKycPhoto}>
                      <Upload className="h-4 w-4" /> Capture photo
                    </button>
                  )}
                  {capturePreview && (
                    <button className="btn-secondary" type="button" onClick={() => { setCapturePreview(""); setCaptureFile(null); startCamera(); }}>
                      Retake photo
                    </button>
                  )}
                  {cameraActive && (
                    <button className="rounded-xl border border-red-100 bg-white px-4 py-3 text-sm font-black text-red-600 transition hover:bg-red-50 dark:border-red-900/70 dark:bg-white/10 dark:text-red-300 dark:hover:bg-red-950/30" type="button" onClick={stopCamera}>
                      Cancel camera
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
        <button className="btn-primary mt-4" type="submit" disabled={savingKyc || kycApproved}>
          {savingKyc ? "Sending OTP..." : kycApproved ? "KYC approved" : kycStatus === "otp_pending" ? "Resend OTP" : "Submit KYC"}
        </button>
        {kycStatus === "otp_pending" && (
          <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/80 p-4 dark:border-amber-900/60 dark:bg-amber-950/20">
            <p className="text-sm font-black text-amber-800 dark:text-amber-100">Enter the 6-digit OTP sent to {user?.email}</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input className="field tracking-[0.35em]" inputMode="numeric" maxLength={6} placeholder="000000" value={kycOtp} onChange={(event) => setKycOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} />
              <button className="btn-primary shrink-0" type="button" disabled={verifyingKyc || kycOtp.length !== 6} onClick={verifyKyc}>
                {verifyingKyc ? "Verifying..." : "Verify OTP"}
              </button>
            </div>
          </div>
        )}
      </form>
      )}
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
          <div key={booking._id} className="flex min-w-0 flex-col justify-between gap-2 overflow-hidden rounded-2xl border border-violet-100 bg-white p-4 text-sm dark:border-violet-900/70 dark:bg-stone-950/70 md:flex-row md:items-center">
            {booking.property?._id ? (
              <Link href={`/items/${booking.property._id}`} className="min-w-0 break-words font-black leading-snug transition hover:text-meadow">
                {booking.property?.title || "Rental item"}
              </Link>
            ) : (
              <strong className="min-w-0 break-words leading-snug">{booking.property?.title || "Rental item"}</strong>
            )}
            <span className="shrink-0 break-words md:text-right">₹{Number(booking.finalAmount || booking.totalAmount || 0).toLocaleString()} · {booking.paymentMethod === "razorpay" ? "Razorpay" : "COD"} · {booking.paymentStatus}</span>
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

function MetricCard({ icon: Icon, label, value, onClick }) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-violet-950/55 dark:text-violet-100/60">{label}</p>
          <p className="mt-1 text-3xl font-black text-ink dark:text-white">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-100">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="rounded-2xl border border-violet-100 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-meadow hover:shadow-soft focus:outline-none focus:ring-2 focus:ring-meadow/40 dark:border-violet-900/70 dark:bg-stone-950/70">
        {content}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm dark:border-violet-900/70 dark:bg-stone-950/70">
      {content}
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-violet-100 bg-white p-4 dark:border-violet-900/70 dark:bg-stone-950/70">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && <Icon className="h-5 w-5 shrink-0 text-meadow" />}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-wide text-violet-950/45 dark:text-violet-100/45">{label}</p>
          <p className="mt-1 max-w-full break-words text-sm font-black leading-snug text-ink dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ label, className = "bg-violet-50 text-violet-700 dark:bg-violet-950/70 dark:text-violet-100" }) {
  return <span className={`inline-flex max-w-full break-words rounded-full px-3 py-1 text-xs font-black leading-snug ${className}`}>{label}</span>;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}
