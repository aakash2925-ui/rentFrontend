"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
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
  Plus,
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
  const cancelledByUser = booking.cancelledBy === "user";
  const cancelled = cancelledByUser || status === "closed" || payment === "cancelled" || payment === "failed";
  if (filter === "cancelled") return cancelled;
  if (cancelled) return filter === "all";
  if (filter === "pending") return status === "pending" || payment === "pending";
  if (filter === "completed") return ["returned", "closed", "rented"].includes(status) || payment === "paid";
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
  { status: "order_received", label: "Order Received" },
  { status: "order_confirmed", label: "Order Confirmed" },
  { status: "order_packed", label: "Order Packed" },
  { status: "delivery_scheduled", label: "Delivery Scheduled" },
  { status: "delivery_partner_booked", label: "Delivery Partner Booked" },
  { status: "order_delivered", label: "Order Delivered" },
  { status: "order_return_due", label: "Order Return Due" },
  { status: "pickup_scheduled", label: "Pickup Scheduled" },
  { status: "pickup_partner_booked", label: "Pickup Partner Booked" },
  { status: "return_received", label: "Return Received" },
  { status: "order_under_inspection", label: "Order Under Inspection" },
  { status: "order_completed", label: "Order Completed" }
];

const bookingTrackerIndex = (booking) => {
  if (booking.cancelledBy === "user" || booking.paymentStatus === "failed" || booking.paymentStatus === "cancelled" || booking.status === "closed") return -1;
  const byOrderStatus = orderTrackerSteps.findIndex((step) => step.status === booking.orderStatus);
  if (byOrderStatus >= 0) return byOrderStatus;
  if (booking.status === "returned") return orderTrackerSteps.length - 1;
  if (booking.status === "rented") return 1;
  return 0;
};

const KYC_MAX_FILE_SIZE = 15 * 1024 * 1024;
const KYC_TARGET_IMAGE_SIZE = 4 * 1024 * 1024;
const KYC_ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
const kycDocumentLabels = {
  aadhaar: "Aadhaar Card",
  pan: "PAN Card",
  passport: "Passport"
};

const validateKycUploadFile = (file) => {
  if (!file) return "Select a clear JPG, PNG, or PDF file";
  if (!KYC_ALLOWED_TYPES.includes(file.type)) return "Only JPG, PNG, and PDF files are supported";
  if (file.size > KYC_MAX_FILE_SIZE) return "File size must be 15 MB or less";
  return "";
};

const resizeKycImage = (file) => new Promise((resolve) => {
  if (!file?.type?.startsWith("image/") || file.size <= KYC_TARGET_IMAGE_SIZE) {
    resolve(file);
    return;
  }

  const image = new Image();
  const objectUrl = URL.createObjectURL(file);
  image.onload = () => {
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      URL.revokeObjectURL(objectUrl);
      if (!blob) {
        resolve(file);
        return;
      }
      resolve(new File([blob], file.name.replace(/\.(png|jpg|jpeg)$/i, ".jpg"), { type: "image/jpeg" }));
    }, "image/jpeg", 0.78);
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    resolve(file);
  };
  image.src = objectUrl;
});

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

  useEffect(() => {
    if (!user) return undefined;
    const timer = setInterval(() => {
      api.get("/bookings/my-bookings")
        .then((response) => setBookings(response.data.bookings))
        .catch(() => {});
    }, 15000);
    return () => clearInterval(timer);
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

  const cancelBooking = async (bookingId, reason) => {
    try {
      const { data } = await api.put(`/bookings/${bookingId}/cancel`, { reason });
      setBookings((items) => items.map((item) => item._id === bookingId ? data.booking : item));
      showToast(data.message || "Booking cancelled successfully");
      return data.booking;
    } catch (err) {
      const message = err.response?.data?.message || "Unable to cancel booking";
      showToast(message, "error");
      throw new Error(message);
    }
  };

  const stats = useMemo(() => ({
    bookings: bookings.length,
    active: bookings.filter((item) => filterBooking(item, "active")).length,
    wishlist: wishlist.length,
    pending: bookings.filter((item) => filterBooking(item, "pending")).length
  }), [bookings, wishlist]);

  const panelProps = { user, bookings, inquiries, wishlist, savedAddresses, setSavedAddresses, properties, ownerInquiries, updateStatus, removeWishlist, cancelBooking, stats, onNavigate: selectSection };

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

function BookingsPanel({ bookings, cancelBooking }) {
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
        {visible.map((booking) => <BookingCard key={booking._id} booking={booking} onCancelBooking={cancelBooking} />)}
        {!visible.length && <EmptyState title="No matching bookings" message="Try a different filter or search term." actionHref="/items" actionLabel="Browse rentals" />}
      </div>
    </div>
  );
}

function BookingCard({ booking, compact = false, onCancelBooking }) {
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const itemHref = booking.property?._id ? `/items/${booking.property._id}` : "";
  const title = booking.property?.title || "Rental item";
  const deliveryDate = booking.deliveryDate || booking.startDate;
  const deliveryLabel = deliverySlotLabels[booking.deliverySpeed] || "Delivery";
  const deliveryWindow = booking.deliveryEta || deliverySlotWindows[booking.deliverySpeed] || "Within 24 hours";
  const trackerIndex = bookingTrackerIndex(booking);
  const cancelled = trackerIndex === -1;
  const cancelledByUser = booking.cancelledBy === "user";
  const canCancel = Boolean(onCancelBooking)
    && ["pending", "contacted"].includes(booking.status)
    && !["cancelled", "failed", "refunded"].includes(booking.paymentStatus)
    && booking.canUserCancel !== false;
  const bookingStatusText = cancelledByUser ? "Cancelled by User" : statusLabel(booking.status);
  const bookingStatusClass = cancelledByUser ? "bg-red-50 text-red-700" : statusTone[booking.status];

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
            <StatusPill label={bookingStatusText} className={bookingStatusClass} />
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

        {cancelledByUser && (
          <div className="mt-4 rounded-2xl border border-red-100 bg-red-50/80 p-4 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100">
            <p className="text-xs font-black uppercase tracking-wide">Cancelled by user</p>
            <p className="mt-1 text-sm font-semibold">Reason: {booking.cancellationReason || "Not provided"}</p>
            <p className="mt-1 text-xs font-bold opacity-80">Cancelled on {formatDateTime(booking.cancelledAt)}</p>
          </div>
        )}

        {!compact && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={() => setTrackingOpen(true)}>
              <Clock3 className="h-4 w-4" /> Track order
            </button>
            {canCancel && (
              <button type="button" className="btn-secondary border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-200 dark:hover:bg-red-950/40" onClick={() => setCancelOpen(true)}>
                <X className="h-4 w-4" /> Cancel Booking
              </button>
            )}
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
      {cancelOpen && (
        <CancelBookingModal
          booking={booking}
          onCancelBooking={onCancelBooking}
          onClose={() => setCancelOpen(false)}
        />
      )}
    </article>
  );
}

function CancelBookingModal({ booking, onCancelBooking, onClose }) {
  const defaultReasons = [
    "Booked by mistake",
    "Dates are no longer suitable",
    "Found another item",
    "Delivery location changed",
    "Payment or budget issue",
    "Other"
  ];
  const [reason, setReason] = useState(defaultReasons[0]);
  const [otherReason, setOtherReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const title = booking.property?.title || "Rental item";
  const showOtherReason = reason === "Other";

  const confirmCancel = async () => {
    const trimmed = showOtherReason ? otherReason.trim() : reason.trim();
    if (!trimmed) {
      setError("Please enter a cancellation reason.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await onCancelBooking(booking._id, trimmed);
      onClose();
    } catch (err) {
      setError(err.message || "Unable to cancel booking");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/55 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-xl overflow-hidden rounded-[1.5rem] border border-violet-100 bg-white shadow-2xl dark:border-violet-900/70 dark:bg-stone-950">
        <div className="flex items-start justify-between gap-4 border-b border-violet-100 bg-gradient-to-r from-violet-50 via-white to-red-50 p-5 dark:border-violet-900/70 dark:from-violet-950/50 dark:via-stone-950 dark:to-red-950/30">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-red-600 dark:text-red-300">Confirm cancellation</p>
            <h3 className="mt-1 text-xl font-black text-ink dark:text-white">Cancel this booking?</h3>
          </div>
          <button type="button" className="rounded-full p-2 text-violet-950/60 transition hover:bg-white hover:text-ink dark:text-violet-100/70 dark:hover:bg-white/10" onClick={onClose} aria-label="Close cancellation popup">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoCard icon={Package} label="Item" value={title} />
            <InfoCard icon={CalendarDays} label="Rental dates" value={`${formatDate(booking.startDate)} - ${formatDate(booking.endDate)}`} />
            <InfoCard icon={IndianRupee} label="Amount" value={`₹${Number(booking.finalAmount || booking.totalAmount || 0).toLocaleString()}`} />
            <InfoCard icon={CreditCard} label="Payment" value={booking.paymentStatus || "pending"} />
          </div>
          <div>
            <p className="text-sm font-black text-ink dark:text-white">Cancellation reason <span className="text-red-500">*</span></p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {defaultReasons.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`rounded-2xl border px-4 py-3 text-left text-sm font-bold transition ${reason === item ? "border-red-300 bg-red-50 text-red-700 shadow-sm dark:border-red-800 dark:bg-red-950/40 dark:text-red-100" : "border-violet-100 bg-mist/60 text-violet-950/70 hover:border-violet-200 hover:bg-violet-50 dark:border-violet-900/70 dark:bg-white/10 dark:text-violet-100/75 dark:hover:bg-white/15"}`}
                  onClick={() => {
                    setReason(item);
                    if (error) setError("");
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          {showOtherReason && (
            <label className="block">
              <span className="text-sm font-black text-ink dark:text-white">Write your reason <span className="text-red-500">*</span></span>
              <textarea
                className="mt-2 min-h-32 w-full resize-y rounded-2xl border border-violet-100 bg-mist/70 px-4 py-3 text-sm font-semibold outline-none transition placeholder:text-violet-950/40 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 dark:border-violet-900/70 dark:bg-white/10 dark:placeholder:text-violet-100/45 dark:focus:ring-violet-950/70"
                placeholder="Tell us why you want to cancel this booking"
                value={otherReason}
                onChange={(event) => {
                  setOtherReason(event.target.value);
                  if (error) setError("");
                }}
              />
            </label>
          )}
          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:bg-red-950/40 dark:text-red-200">{error}</p>}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" className="btn-secondary justify-center" onClick={onClose} disabled={submitting}>Keep Booking</button>
            <button type="button" className="btn-primary justify-center bg-red-600 hover:bg-red-700" onClick={confirmCancel} disabled={submitting}>
              {submitting ? "Cancelling..." : "Confirm Cancellation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderTrackingModal({ booking, cancelled, deliveryDate, deliveryLabel, deliveryWindow, onClose, trackerIndex }) {
  const [timeline, setTimeline] = useState(null);
  const [deliveryTimeline, setDeliveryTimeline] = useState(null);
  const [loadingTimeline, setLoadingTimeline] = useState(true);

  useEffect(() => {
    let cancelledRequest = false;
    Promise.allSettled([
      api.get(`/bookings/${booking._id}/timeline`),
      api.get(`/delivery/bookings/${booking._id}/timeline`)
    ])
      .then(([orderResult, deliveryResult]) => {
        if (cancelledRequest) return;
        setTimeline(orderResult.status === "fulfilled" ? orderResult.value.data.timeline : null);
        setDeliveryTimeline(deliveryResult.status === "fulfilled" ? deliveryResult.value.data : null);
      })
      .finally(() => {
        if (!cancelledRequest) setLoadingTimeline(false);
      });
    return () => {
      cancelledRequest = true;
    };
  }, [booking._id]);

  const resolvedIndex = timeline?.orderStatus ? orderTrackerSteps.findIndex((step) => step.status === timeline.orderStatus) : trackerIndex;
  const currentIndex = resolvedIndex >= 0 ? resolvedIndex : trackerIndex;
  const timelineSteps = orderTrackerSteps.map((step) => {
    const savedStep = timeline?.steps?.find((item) => item.status === step.status);
    return { ...step, updatedAt: savedStep?.updatedAt || null };
  });
  const deliverySteps = deliveryTimeline?.assignment?.statusHistory || [];
  const deliveryLabels = deliveryTimeline?.labels || {};

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
          <InfoCard icon={Package} label="Current status" value={cancelled ? "Cancelled" : statusLabel(booking.status)} valueClassName={cancelled ? "text-red-600 dark:text-red-300" : ""} />
        </div>
        <p className="mt-3 break-words rounded-2xl bg-mist/70 px-4 py-3 text-sm font-semibold text-violet-950/65 dark:bg-white/10 dark:text-violet-100/70">
          {deliveryLabel} · {booking.deliveryAddress || "Address shared"}
        </p>

        {loadingTimeline && <p className="mt-5 rounded-2xl bg-mist/70 px-4 py-3 text-sm font-black text-violet-700 dark:bg-white/10 dark:text-violet-100">Loading timeline...</p>}
        <div className="mt-6 space-y-0">
          {timelineSteps.map((step, index) => {
            const done = !cancelled && index < currentIndex;
            const current = !cancelled && index === currentIndex;
            return (
              <div key={step.status} className="grid grid-cols-[44px_1fr] gap-3">
                <div className="relative flex justify-center">
                  {index < timelineSteps.length - 1 && <span className={`absolute top-10 h-full w-0.5 ${done ? "bg-meadow" : "bg-violet-100 dark:bg-violet-900/70"}`} />}
                  <div className={`relative z-10 grid h-10 w-10 place-items-center rounded-full border text-xs font-black ${
                    done ? "border-meadow bg-meadow text-white" : current ? "border-violet-700 bg-violet-700 text-white" : "border-violet-100 bg-white text-violet-400 dark:border-violet-900/70 dark:bg-stone-950 dark:text-violet-100/50"
                  }`}>
                    {done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                  </div>
                </div>
                <div className={`mb-4 rounded-2xl border p-4 ${current ? "border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/30" : "border-violet-100 bg-mist/70 dark:border-violet-900/70 dark:bg-white/10"}`}>
                  <p className={`break-words text-sm font-black ${done ? "text-meadow" : current ? "text-violet-700 dark:text-violet-100" : "text-violet-950/45 dark:text-violet-100/45"}`}>{step.label}</p>
                  <p className="mt-1 text-xs font-semibold text-violet-950/55 dark:text-violet-100/50">
                    {step.updatedAt ? formatDateTime(step.updatedAt) : current ? "Current step" : "Pending"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        {deliveryTimeline?.assignment && (
          <div className="mt-6 rounded-2xl border border-violet-100 bg-mist/70 p-4 dark:border-violet-900/70 dark:bg-white/10">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-meadow">Delivery timeline</p>
                <h4 className="mt-1 text-lg font-black text-ink dark:text-white">{deliveryLabels[deliveryTimeline.assignment.status] || deliveryTimeline.assignment.status}</h4>
              </div>
              {deliveryTimeline.assignment.deliveryBoy?.name && (
                <p className="text-sm font-bold text-violet-950/60 dark:text-violet-100/65">{deliveryTimeline.assignment.deliveryBoy.name} · {deliveryTimeline.assignment.deliveryBoy.mobileNumber}</p>
              )}
            </div>
            <div className="mt-4 grid gap-2">
              {deliverySteps.map((step, index) => (
                <div key={`${step.status}-${step.updatedAt}-${index}`} className="flex items-start gap-3 rounded-xl bg-white p-3 dark:bg-stone-950/70">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-meadow" />
                  <div className="min-w-0">
                    <p className="break-words text-sm font-black text-ink dark:text-white">{deliveryLabels[step.status] || step.status}</p>
                    <p className="mt-1 text-xs font-semibold text-violet-950/55 dark:text-violet-100/50">{formatDateTime(step.updatedAt)}{step.remarks ? ` · ${step.remarks}` : ""}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
    documentType: ["aadhaar", "pan", "passport"].includes(user?.kyc?.documentType) ? user.kyc.documentType : "aadhaar"
  });
  const [cameraActive, setCameraActive] = useState(false);
  const [capturePreview, setCapturePreview] = useState("");
  const [captureFile, setCaptureFile] = useState(null);
  const [documentFiles, setDocumentFiles] = useState({ documentFront: null, documentBack: null });
  const [documentPreviews, setDocumentPreviews] = useState({ documentFront: "", documentBack: "" });
  const [documentErrors, setDocumentErrors] = useState({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [savingKyc, setSavingKyc] = useState(false);
  const kycStatus = user?.kyc?.status || "not_submitted";
  const kycApproved = kycStatus === "approved";
  const kycPendingReview = ["pending", "otp_pending"].includes(kycStatus);
  const kycPhotoSubmitted = Boolean(user?.kyc?.hasSelfieWithIdImage);
  const documentRequirements = useMemo(() => (
    kycForm.documentType === "aadhaar"
      ? [
          { field: "documentFront", label: "Aadhaar front", help: "Upload the front side with your photo and Aadhaar details." },
          { field: "documentBack", label: "Aadhaar back", help: "Upload the back side with address details." }
        ]
      : [
          {
            field: "documentFront",
            label: kycForm.documentType === "passport" ? "Passport photo page" : "PAN front",
            help: kycForm.documentType === "passport" ? "Upload the personal information/photo page." : "Upload the front side of your PAN card."
          }
        ]
  ), [kycForm.documentType]);
  const requiredDocumentFields = documentRequirements.map((item) => item.field);
  const hasSubmittedDocument = (field) => Boolean(user?.kyc?.[field === "documentFront" ? "hasDocumentFrontImage" : "hasDocumentBackImage"]);
  const requiredDocumentsReady = requiredDocumentFields.every((field) => Boolean(documentFiles[field]) || hasSubmittedDocument(field));
  const canSubmitKyc = !kycApproved && !savingKyc && kycForm.legalName.trim() && requiredDocumentsReady && (captureFile || kycPhotoSubmitted);

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
    const maxSide = 1280;
    const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round((video.videoWidth || 960) * scale);
    canvas.height = Math.round((video.videoHeight || 720) * scale);
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `kyc-selfie-${Date.now()}.jpg`, { type: "image/jpeg" });
      setCaptureFile(file);
      setCapturePreview(URL.createObjectURL(file));
      stopCamera();
    }, "image/jpeg", 0.78);
  };

  useEffect(() => () => stopCamera(false), []);

  useEffect(() => {
    if (kycForm.documentType === "aadhaar") return;
    setDocumentFiles((current) => ({ ...current, documentBack: null }));
    setDocumentPreviews((current) => ({ ...current, documentBack: "" }));
    setDocumentErrors((current) => ({ ...current, documentBack: "" }));
  }, [kycForm.documentType]);

  useEffect(() => {
    if (!cameraActive || !videoRef.current || !streamRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    videoRef.current.play().catch(() => {});
  }, [cameraActive]);

  const submitKyc = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    documentRequirements.forEach(({ field, label }) => {
      if (!documentFiles[field] && !hasSubmittedDocument(field)) nextErrors[field] = `${label} is required`;
    });
    setDocumentErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      showToast("Upload all required KYC document images", "error");
      return;
    }
    if (!captureFile && !kycPhotoSubmitted) {
      showToast("Capture a live photo holding your identity card", "error");
      return;
    }
    if (!kycForm.legalName.trim()) {
      showToast("Enter your legal name", "error");
      return;
    }
    setSavingKyc(true);
    setUploadProgress(0);
    try {
      const formData = new FormData();
      formData.append("legalName", kycForm.legalName);
      formData.append("documentType", kycForm.documentType);
      if (documentFiles.documentFront) formData.append("documentFront", documentFiles.documentFront);
      if (documentFiles.documentBack) formData.append("documentBack", documentFiles.documentBack);
      if (captureFile) formData.append("selfieWithId", captureFile);
      const { data } = await api.post("/auth/kyc", formData, {
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) return;
          setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
        }
      });
      updateUser(data.user);
      setCapturePreview("");
      setCaptureFile(null);
      Object.values(documentPreviews).forEach((preview) => {
        if (preview) URL.revokeObjectURL(preview);
      });
      setDocumentFiles({ documentFront: null, documentBack: null });
      setDocumentPreviews({ documentFront: "", documentBack: "" });
      setDocumentErrors({});
      showToast(data.message || "KYC submitted for admin review");
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to submit KYC", "error");
    } finally {
      setSavingKyc(false);
      setUploadProgress(0);
    }
  };

  const handleDocumentFile = async (field, file) => {
    if (documentPreviews[field]) URL.revokeObjectURL(documentPreviews[field]);
    const preparedFile = await resizeKycImage(file);
    const error = validateKycUploadFile(preparedFile);
    if (error) {
      setDocumentFiles((current) => ({ ...current, [field]: null }));
      setDocumentPreviews((current) => ({ ...current, [field]: "" }));
      setDocumentErrors((current) => ({ ...current, [field]: error }));
      return;
    }
    setDocumentFiles((current) => ({ ...current, [field]: preparedFile }));
    setDocumentPreviews((current) => ({ ...current, [field]: preparedFile.type.startsWith("image/") ? URL.createObjectURL(preparedFile) : "" }));
    setDocumentErrors((current) => ({ ...current, [field]: "" }));
  };

  const removeDocumentFile = (field) => {
    if (documentPreviews[field]) URL.revokeObjectURL(documentPreviews[field]);
    setDocumentFiles((current) => ({ ...current, [field]: null }));
    setDocumentPreviews((current) => ({ ...current, [field]: "" }));
    setDocumentErrors((current) => ({ ...current, [field]: "" }));
  };

  return (
    <div>
      <SectionHeader title="Profile" text="Your account details used for bookings and support." />
      <div className="grid gap-4 lg:grid-cols-2">
        <InfoCard icon={UserRound} label="Name" value={user?.name || "-"} />
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
            <p className="mt-1 text-sm text-violet-950/60 dark:text-violet-100/65">After your booking is confirmed, submit identity documents for admin review.</p>
          </div>
          <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${
            kycStatus === "approved" ? "bg-green-50 text-green-700" : kycStatus === "rejected" ? "bg-red-50 text-red-700" : kycPendingReview ? "bg-amber-50 text-amber-700" : "bg-violet-50 text-violet-700"
          }`}>
            {kycStatus.replace("_", " ")}
          </span>
        </div>
        {user?.kyc?.rejectionReason && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">{user.kyc.rejectionReason}</p>}
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-black">Legal name <span className="text-red-500">*</span></span>
            <input className="field disabled:cursor-not-allowed disabled:opacity-70" disabled={kycApproved} placeholder="Name exactly as shown on document" value={kycForm.legalName} onChange={(event) => setKycForm((current) => ({ ...current, legalName: event.target.value }))} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-black">Document type <span className="text-red-500">*</span></span>
            <select className="field disabled:cursor-not-allowed disabled:opacity-70" disabled={kycApproved} value={kycForm.documentType} onChange={(event) => setKycForm((current) => ({ ...current, documentType: event.target.value }))}>
              <option value="aadhaar">Aadhaar</option>
              <option value="pan">PAN</option>
              <option value="passport">Passport</option>
            </select>
          </label>
        </div>
        <div className="mt-4 rounded-2xl border border-violet-100 bg-white/80 p-4 dark:border-violet-900/70 dark:bg-stone-950/40">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <h4 className="font-black text-ink dark:text-white">Upload {kycDocumentLabels[kycForm.documentType] || "identity document"}</h4>
              <p className="mt-1 text-sm text-violet-950/60 dark:text-violet-100/65">
                Upload clear, uncropped JPG, PNG, or PDF files up to 5 MB. Text and photo should be readable; blurry uploads may be rejected during review.
              </p>
            </div>
            <span className="w-fit rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700 dark:bg-violet-950/70 dark:text-violet-100">
              {documentRequirements.length} required
            </span>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {documentRequirements.map(({ field, label, help }) => {
              const file = documentFiles[field];
              const preview = documentPreviews[field];
              const submitted = hasSubmittedDocument(field);
              return (
                <div key={field} className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4 dark:border-violet-900/70 dark:bg-white/5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h5 className="font-black text-ink dark:text-white">{label} <span className="text-red-500">*</span></h5>
                      <p className="mt-1 text-xs font-semibold text-violet-950/55 dark:text-violet-100/60">{help}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${file || submitted ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                      {file ? "Ready" : submitted ? "Uploaded" : "Required"}
                    </span>
                  </div>
                  <div className="mt-3 overflow-hidden rounded-xl border border-white/80 bg-white dark:border-violet-900/60 dark:bg-stone-950/60">
                    {preview ? (
                      <img src={preview} alt={`${label} preview`} className="h-36 w-full object-cover" />
                    ) : file ? (
                      <div className="flex h-36 flex-col items-center justify-center gap-2 px-4 text-center text-sm font-bold text-violet-700 dark:text-violet-100">
                        <Upload className="h-7 w-7" />
                        <span className="max-w-full break-words">{file.name}</span>
                      </div>
                    ) : submitted ? (
                      <div className="flex h-36 flex-col items-center justify-center gap-2 bg-green-50 px-4 text-center text-sm font-bold text-green-700 dark:bg-green-950/30 dark:text-green-200">
                        <ShieldCheck className="h-7 w-7" />
                        <span>Already submitted for admin review</span>
                      </div>
                    ) : (
                      <div className="flex h-36 flex-col items-center justify-center gap-2 px-4 text-center text-sm font-bold text-violet-700 dark:text-violet-100">
                        <Upload className="h-7 w-7" />
                        <span>Choose a clear file</span>
                      </div>
                    )}
                  </div>
                  {documentErrors[field] && <p className="mt-2 text-xs font-black text-red-600">{documentErrors[field]}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <label className={`inline-flex cursor-pointer items-center justify-center rounded-xl bg-violet-700 px-4 py-2 text-xs font-black text-white transition hover:bg-violet-800 ${kycApproved ? "pointer-events-none opacity-50" : ""}`}>
                      {file || submitted ? "Replace" : "Upload"}
                      <input
                        type="file"
                        className="hidden"
                        accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                        disabled={kycApproved}
                        onChange={(event) => {
                          handleDocumentFile(field, event.target.files?.[0]);
                          event.target.value = "";
                        }}
                      />
                    </label>
                    {file && (
                      <button className="rounded-xl border border-red-100 bg-white px-4 py-2 text-xs font-black text-red-600 transition hover:bg-red-50 dark:border-red-900/70 dark:bg-white/10 dark:text-red-300" type="button" onClick={() => removeDocumentFile(field)}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
        {savingKyc && (
          <div className="mt-4 overflow-hidden rounded-full bg-violet-100 dark:bg-violet-950/60">
            <div className="h-2 rounded-full bg-gradient-to-r from-violet-700 to-fuchsia-500 transition-all" style={{ width: `${Math.max(uploadProgress, 12)}%` }} />
          </div>
        )}
        <button className="btn-primary mt-4 disabled:cursor-not-allowed disabled:opacity-50" type="submit" disabled={!canSubmitKyc}>
          {savingKyc ? `Uploading ${uploadProgress || 0}%` : kycApproved ? "KYC approved" : kycPendingReview ? "Update submitted KYC" : "Submit KYC"}
        </button>
        {kycPendingReview && !kycApproved && (
          <p className="mt-3 rounded-2xl border border-amber-100 bg-amber-50/80 px-4 py-3 text-sm font-bold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-100">
            KYC is submitted for admin review. It will show as verified only after admin approval.
          </p>
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

  const blankAddress = () => ({
    fullName: user?.name || "",
    mobileNumber: user?.phone || "",
    houseFlatNo: "",
    streetArea: "",
    landmark: "",
    city: "",
    state: "",
    pincode: ""
  });

  const startAdd = () => {
    setEditingId("new");
    setForm(blankAddress());
  };

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

  const saveNew = async () => {
    setSaving(true);
    try {
      const { data } = await api.post("/auth/addresses", form);
      setAddresses(data.addresses || []);
      setEditingId("");
      setForm({});
      showToast("Address added");
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to add address", "error");
    } finally {
      setSaving(false);
    }
  };

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
      <SectionHeader
        title="Saved Addresses"
        text="Addresses saved during checkout appear here for faster future bookings."
        action={(
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" type="button" onClick={startAdd}>
              <Plus className="h-4 w-4" /> Add address
            </button>
            <Link href="/items" className="btn-secondary">Book an item</Link>
          </div>
        )}
      />
      {editingId === "new" && (
        <div className="mb-5 rounded-2xl border border-violet-100 bg-mist/70 p-5 shadow-sm dark:border-violet-900/70 dark:bg-white/10">
          <div className="mb-4 flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-100">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black text-ink dark:text-white">Add new address</h3>
              <p className="mt-1 text-sm text-violet-950/60 dark:text-violet-100/65">Save this address to use it quickly during checkout.</p>
            </div>
          </div>
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
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-primary" type="button" disabled={saving} onClick={saveNew}>
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save address"}
            </button>
            <button className="btn-secondary" type="button" onClick={() => { setEditingId(""); setForm({}); }}>Cancel</button>
          </div>
        </div>
      )}
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

function InfoCard({ icon: Icon, label, value, valueClassName = "" }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-violet-100 bg-white p-4 dark:border-violet-900/70 dark:bg-stone-950/70">
      <div className="flex min-w-0 items-center gap-3">
        {Icon && <Icon className="h-5 w-5 shrink-0 text-meadow" />}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-wide text-violet-950/45 dark:text-violet-100/45">{label}</p>
          <p className={`mt-1 max-w-full break-words text-sm font-black leading-snug ${valueClassName || "text-ink dark:text-white"}`}>{value}</p>
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

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
