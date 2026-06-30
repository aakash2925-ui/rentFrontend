"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, MapPin, Package, Search, Truck, Upload } from "lucide-react";
import api, { uploadUrl } from "@/lib/api";
import EmptyState from "@/components/common/EmptyState";
import ErrorMessage from "@/components/common/ErrorMessage";
import Loading from "@/components/common/Loading";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useToast } from "@/context/ToastContext";

const statusOptions = [
  ["", "All orders"],
  ["assigned", "Assigned"],
  ["pickup_started", "Pickup Started"],
  ["picked_up", "Picked Up"],
  ["out_for_delivery", "Out for Delivery"],
  ["delivered", "Delivered"],
  ["return_pickup_assigned", "Return Pickup Assigned"],
  ["return_pickup_started", "Return Pickup Started"],
  ["returned_picked_back", "Returned / Picked Back"],
  ["failed_delivery", "Failed Delivery"],
  ["cancelled", "Cancelled"]
];

const statusLabels = Object.fromEntries(statusOptions.filter(([value]) => value));
const deliveryFlow = [
  "assigned",
  "pickup_started",
  "picked_up",
  "out_for_delivery",
  "delivered",
  "return_pickup_assigned",
  "return_pickup_started",
  "returned_picked_back"
];
const nextActions = {
  assigned: ["pickup_started", "Start Pickup"],
  pickup_started: ["picked_up", "Mark Picked Up"],
  picked_up: ["out_for_delivery", "Out for Delivery"],
  out_for_delivery: ["delivered", "Mark Delivered"],
  delivered: ["return_pickup_assigned", "Schedule Return"],
  return_pickup_assigned: ["return_pickup_started", "Start Return Pickup"],
  return_pickup_started: ["returned_picked_back", "Mark Return Picked"]
};

const statusClass = (status) => {
  if (["delivered", "returned_picked_back"].includes(status)) return "border-green-200 bg-green-50 text-green-700";
  if (["failed_delivery", "cancelled"].includes(status)) return "border-red-200 bg-red-50 text-red-700";
  if (["out_for_delivery", "pickup_started", "return_pickup_started"].includes(status)) return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
};

const statusDotClass = (status) => {
  if (["delivered", "returned_picked_back"].includes(status)) return "bg-green-600";
  if (["failed_delivery", "cancelled"].includes(status)) return "bg-red-600";
  if (["out_for_delivery", "pickup_started", "return_pickup_started"].includes(status)) return "bg-blue-600";
  return "bg-amber-500";
};

export default function DeliveryDashboardPage() {
  const { showToast } = useToast();
  const [assignments, setAssignments] = useState([]);
  const [deliveryBoy, setDeliveryBoy] = useState(null);
  const [filters, setFilters] = useState({ search: "", status: "" });
  const [remarks, setRemarks] = useState({});
  const [proofFiles, setProofFiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = async () => {
    const { data } = await api.get("/delivery/my-orders", {
      params: { search: filters.search || undefined, status: filters.status || undefined }
    });
    setAssignments(data.assignments || []);
    setDeliveryBoy(data.deliveryBoy || null);
  };

  useEffect(() => {
    setLoading(true);
    loadOrders()
      .catch(() => setError("Unable to load assigned orders"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadOrders().catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search]);

  const stats = useMemo(() => ({
    pending: assignments.filter((item) => ["assigned", "pickup_started"].includes(item.status)).length,
    out: assignments.filter((item) => item.status === "out_for_delivery").length,
    delivered: assignments.filter((item) => item.status === "delivered").length,
    returns: assignments.filter((item) => ["return_pickup_assigned", "return_pickup_started"].includes(item.status)).length,
    completed: assignments.filter((item) => item.status === "returned_picked_back").length,
    failed: assignments.filter((item) => ["failed_delivery", "cancelled"].includes(item.status)).length
  }), [assignments]);

  const updateStatus = async (assignment, status) => {
    try {
      await api.put(`/delivery/assignments/${assignment._id}/status`, { status, remarks: remarks[assignment._id] || "" });
      await loadOrders();
      setRemarks((current) => ({ ...current, [assignment._id]: "" }));
      showToast("Delivery status updated");
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to update delivery status", "error");
    }
  };

  const uploadProof = async (assignment) => {
    const files = proofFiles[assignment._id] || {};
    try {
      const formData = new FormData();
      if (files.handoverPhoto) formData.append("handoverPhoto", files.handoverPhoto);
      if (files.customerSignature) formData.append("customerSignature", files.customerSignature);
      if (files.returnPhoto) formData.append("returnPhotos", files.returnPhoto);
      if (files.otp) formData.append("otp", files.otp);
      if (files.remarks) formData.append("remarks", files.remarks);
      if (files.conditionNotes) formData.append("conditionNotes", files.conditionNotes);
      await api.post(`/delivery/assignments/${assignment._id}/proof`, formData);
      await loadOrders();
      setProofFiles((current) => ({ ...current, [assignment._id]: {} }));
      showToast("Proof uploaded");
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to upload proof", "error");
    }
  };

  return (
    <ProtectedRoute roles={["delivery"]}>
      <DashboardLayout title={`Delivery Dashboard${deliveryBoy?.name ? ` · ${deliveryBoy.name}` : ""}`}>
        {loading ? <Loading /> : error ? <ErrorMessage message={error} /> : (
          <section className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <Stat label="Pending pickups" value={stats.pending} />
              <Stat label="Out for delivery" value={stats.out} />
              <Stat label="Delivered" value={stats.delivered} />
              <Stat label="Return pickups" value={stats.returns} />
              <Stat label="Completed" value={stats.completed} />
              <Stat label="Cancelled / failed" value={stats.failed} tone="red" />
            </div>

            <div className="grid gap-3 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm dark:border-violet-900/70 dark:bg-stone-950/70 lg:grid-cols-[1fr_auto]">
              <label className="flex items-center gap-2 rounded-2xl border border-violet-100 bg-mist/70 px-4 py-3 dark:border-violet-900/70 dark:bg-white/10">
                <Search className="h-4 w-4 text-violet-500" />
                <input className="w-full bg-transparent text-sm font-semibold outline-none" placeholder="Search order ID, customer, mobile" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
              </label>
              <select className="field" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
                {statusOptions.map(([value, label]) => <option key={label} value={value}>{label}</option>)}
              </select>
            </div>

            <div className="grid gap-4">
              {assignments.map((assignment) => <AssignmentCard key={assignment._id} assignment={assignment} remarks={remarks} setRemarks={setRemarks} proofFiles={proofFiles} setProofFiles={setProofFiles} updateStatus={updateStatus} uploadProof={uploadProof} />)}
              {!assignments.length && <EmptyState title="No assigned orders" message="Assigned delivery orders will appear here." />}
            </div>
          </section>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function AssignmentCard({ assignment, remarks, setRemarks, proofFiles, setProofFiles, updateStatus, uploadProof }) {
  const booking = assignment.booking || {};
  const property = booking.property || {};
  const customer = booking.user || {};
  const action = nextActions[assignment.status];
  const files = proofFiles[assignment._id] || {};

  const setProof = (key, value) => setProofFiles((current) => ({ ...current, [assignment._id]: { ...(current[assignment._id] || {}), [key]: value } }));

  return (
    <article className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm dark:border-violet-900/70 dark:bg-stone-950/70">
      <div className="grid gap-4 border-b border-violet-100 bg-violet-50/70 p-4 dark:border-violet-900/70 dark:bg-violet-950/30 md:grid-cols-[120px_1fr_auto]">
        <img src={uploadUrl(property.images?.[0])} alt={property.title || "Rental item"} className="h-28 w-full rounded-2xl object-cover md:w-28" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-violet-700 px-3 py-1 text-xs font-black text-white">#{String(booking._id).slice(-8)}</span>
            <DeliveryStatusBadge status={assignment.status} />
          </div>
          <h2 className="mt-3 break-words text-xl font-black text-ink dark:text-white">{property.title || "Rental item"}</h2>
          <p className="mt-1 text-sm font-semibold text-violet-950/60 dark:text-violet-100/65">{customer.name || "Customer"} · {customer.phone || "No mobile"}</p>
          <p className="mt-1 text-sm font-semibold text-violet-950/60 dark:text-violet-100/65">KYC: {customer.kyc?.status || "not submitted"} · Payment: {booking.paymentMethod} / {booking.paymentStatus}</p>
        </div>
        <Link className="btn-secondary self-start" href={`/items/${property._id || ""}`}>View item</Link>
      </div>
      <div className="grid gap-3 p-4 lg:grid-cols-3">
        <Info icon={MapPin} label="Delivery address" value={booking.deliveryAddress || "Address shared"} />
        <Info icon={CalendarDays} label="Rental dates" value={`${formatDate(booking.startDate)} - ${formatDate(booking.endDate)}`} />
        <Info icon={Package} label="Instructions" value={assignment.specialInstructions || "No special instructions"} />
      </div>
      <DeliveryProgress status={assignment.status} />
      <div className="border-t border-violet-100 p-4 dark:border-violet-900/70">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto] lg:items-center">
          <input className="field" placeholder="Remarks or failed delivery reason" value={remarks[assignment._id] || ""} onChange={(event) => setRemarks((current) => ({ ...current, [assignment._id]: event.target.value }))} />
          {action && <button className="btn-primary" type="button" onClick={() => updateStatus(assignment, action[0])}><Truck className="h-4 w-4" /> {action[1]}</button>}
          <button className="btn-secondary" type="button" onClick={() => updateStatus(assignment, "failed_delivery")}>Failed</button>
          <button className="btn-secondary" type="button" onClick={() => updateStatus(assignment, "cancelled")}>Cancel</button>
        </div>
        <div className="mt-3 grid gap-3 rounded-2xl bg-mist/70 p-3 dark:bg-white/10 md:grid-cols-2 xl:grid-cols-5">
          <label className="field cursor-pointer"><span>{files.handoverPhoto?.name || "Handover photo"}</span><input className="hidden" type="file" accept="image/*" onChange={(event) => setProof("handoverPhoto", event.target.files?.[0] || null)} /></label>
          <label className="field cursor-pointer"><span>{files.customerSignature?.name || "Customer signature"}</span><input className="hidden" type="file" accept="image/*" onChange={(event) => setProof("customerSignature", event.target.files?.[0] || null)} /></label>
          <label className="field cursor-pointer"><span>{files.returnPhoto?.name || "Return photo"}</span><input className="hidden" type="file" accept="image/*" onChange={(event) => setProof("returnPhoto", event.target.files?.[0] || null)} /></label>
          <input className="field" placeholder="OTP" value={files.otp || ""} onChange={(event) => setProof("otp", event.target.value)} />
          <button className="btn-primary" type="button" onClick={() => uploadProof(assignment)}><Upload className="h-4 w-4" /> Upload proof</button>
        </div>
      </div>
    </article>
  );
}

function DeliveryStatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${statusClass(status)}`}>
      <span className={`h-2 w-2 rounded-full ${statusDotClass(status)}`} />
      {statusLabels[status] || status}
    </span>
  );
}

function DeliveryProgress({ status }) {
  const currentIndex = deliveryFlow.indexOf(status);
  const stopped = ["failed_delivery", "cancelled"].includes(status);

  return (
    <div className="border-t border-violet-100 px-4 py-4 dark:border-violet-900/70">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {deliveryFlow.map((step, index) => {
          const done = !stopped && currentIndex >= 0 && index < currentIndex;
          const current = !stopped && index === currentIndex;
          return (
            <div key={step} className="flex min-w-[118px] flex-1 items-center gap-2">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-black ${
                done ? "bg-green-600 text-white" : current ? "bg-violet-700 text-white" : "bg-violet-50 text-violet-400 dark:bg-violet-950/70 dark:text-violet-100/40"
              }`}>
                {done ? "✓" : index + 1}
              </span>
              <span className={`text-xs font-black leading-snug ${current ? "text-violet-700 dark:text-violet-100" : done ? "text-green-700" : "text-violet-950/45 dark:text-violet-100/45"}`}>
                {statusLabels[step]}
              </span>
            </div>
          );
        })}
      </div>
      {stopped && <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-700">Delivery flow stopped: {statusLabels[status]}</p>}
    </div>
  );
}

function Stat({ label, value, tone = "violet" }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tone === "red" ? "border-red-100 bg-red-50 text-red-700" : "border-violet-100 bg-white text-violet-700 dark:border-violet-900/70 dark:bg-stone-950/70 dark:text-violet-100"}`}>
      <p className="text-xs font-black uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-mist/70 p-4 dark:bg-white/10">
      <div className="flex gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-meadow" />
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-violet-950/45 dark:text-violet-100/45">{label}</p>
          <p className="mt-1 break-words text-sm font-black text-ink dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}
