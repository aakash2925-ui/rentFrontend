"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, Boxes, CalendarCheck, History, ImagePlus, LayoutDashboard, Mail, MapPin, Menu, Package, PackageCheck, PackagePlus, Pencil, Phone, Save, ShieldCheck, Tags, TicketPercent, Trash2, Truck, Users, X } from "lucide-react";
import api, { uploadUrl } from "@/lib/api";
import { conditionOf, itemTypeOf, quantityOf } from "@/lib/itemFields";
import ErrorMessage from "@/components/common/ErrorMessage";
import EmptyState from "@/components/common/EmptyState";
import Loading from "@/components/common/Loading";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";

const adminTasks = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "types", label: "Item Types", icon: Tags },
  { id: "items", label: "Items", icon: Boxes },
  { id: "vouchers", label: "Vouchers", icon: TicketPercent },
  { id: "bookings", label: "Booking Requests", icon: Package },
  { id: "delivery", label: "Delivery", icon: Truck },
  { id: "contacts", label: "Contact Inquiries", icon: Mail },
  { id: "activity", label: "Activity Logs", icon: History },
  { id: "users", label: "Users", icon: Users }
];

const bookingStatusOptions = [
  ["pending", "Pending"],
  ["rented", "Confirmed"],
  ["closed", "Cancelled"],
  ["returned", "Completed"]
];

const bookingFilterStatusOptions = bookingStatusOptions.filter(([status]) => status !== "returned");

const orderTimelineOptions = [
  ["order_received", "Order Received"],
  ["order_confirmed", "Order Confirmed"],
  ["order_packed", "Order Packed"],
  ["delivery_scheduled", "Delivery Scheduled"],
  ["delivery_partner_booked", "Delivery Partner Booked"],
  ["order_delivered", "Order Delivered"],
  ["order_return_due", "Order Return Due"],
  ["pickup_scheduled", "Pickup Scheduled"],
  ["pickup_partner_booked", "Pickup Partner Booked"],
  ["return_received", "Return Received"],
  ["order_under_inspection", "Order Under Inspection"],
  ["order_completed", "Order Completed"]
];

const bookingStatusLabel = (status) => ({
  pending: "Pending",
  contacted: "Contacted",
  rented: "Confirmed",
  returned: "Completed",
  closed: "Cancelled"
}[status] || status);

const orderTimelineLabel = (status) => orderTimelineOptions.find(([value]) => value === status)?.[1] || "Order Received";

const deliveryStatusLabels = {
  assigned: "Assigned",
  pickup_started: "Pickup Started",
  picked_up: "Picked Up",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  return_pickup_assigned: "Return Pickup Assigned",
  return_pickup_started: "Return Pickup Started",
  returned_picked_back: "Returned / Picked Back",
  failed_delivery: "Failed Delivery",
  cancelled: "Cancelled"
};

const deliveryStatusClass = (status) => {
  if (["delivered", "returned_picked_back"].includes(status)) return "border-green-200 bg-green-50 text-green-700";
  if (["failed_delivery", "cancelled"].includes(status)) return "border-red-200 bg-red-50 text-red-700";
  if (["out_for_delivery", "pickup_started", "return_pickup_started"].includes(status)) return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
};

const deliveryStatusDotClass = (status) => {
  if (["delivered", "returned_picked_back"].includes(status)) return "bg-green-600";
  if (["failed_delivery", "cancelled"].includes(status)) return "bg-red-600";
  if (["out_for_delivery", "pickup_started", "return_pickup_started"].includes(status)) return "bg-blue-600";
  return "bg-amber-500";
};

const kycBadge = (status = "not_submitted") => {
  if (status === "approved") return null;
  if (status === "rejected") return { label: "KYC rejected", className: "border-red-200 bg-red-50 text-red-700" };
  if (["pending", "otp_pending"].includes(status)) return { label: "KYC pending", className: "border-amber-200 bg-amber-50 text-amber-700" };
  return { label: "KYC needed", className: "border-red-200 bg-red-50 text-red-700" };
};

const needsKycForConfirmation = (booking) => booking.user?.kyc?.status !== "approved" && booking.status !== "rented";

const canSelectOrderTimeline = (currentStatus, nextStatus) => {
  const currentIndex = orderTimelineOptions.findIndex(([value]) => value === (currentStatus || "order_received"));
  const nextIndex = orderTimelineOptions.findIndex(([value]) => value === nextStatus);
  return currentIndex >= 0 && nextIndex >= 0 && (nextIndex === currentIndex || nextIndex === currentIndex + 1);
};

const defaultItemTypeImage = "https://images.unsplash.com/photo-1520549233664-03f65c1d1327?auto=format&fit=crop&w=900&q=80";
const emptyVoucherForm = {
  code: "",
  description: "",
  discountType: "percentage",
  value: "",
  maxDiscount: "",
  minAmount: "",
  startDate: "",
  endDate: "",
  usageLimit: "",
  isActive: true
};

const emptyDeliveryForm = {
  name: "",
  mobileNumber: "",
  email: "",
  password: "",
  address: "",
  city: "",
  area: "",
  pincode: "",
  availabilityStatus: "available",
  isActive: true,
  joiningDate: ""
};

export default function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [data, setData] = useState({ stats: null, users: [], properties: [], bookings: [], contacts: [], logs: [], itemTypes: [], vouchers: [], deliveryBoys: [], deliveryAssignments: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [typeName, setTypeName] = useState("");
  const [typeImage, setTypeImage] = useState(null);
  const [typePreview, setTypePreview] = useState("");
  const [editingType, setEditingType] = useState(null);
  const [editTypeName, setEditTypeName] = useState("");
  const [editTypeImage, setEditTypeImage] = useState(null);
  const [editTypePreview, setEditTypePreview] = useState("");
  const [activeTask, setActiveTask] = useState("overview");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [filters, setFilters] = useState({ search: "", status: "", type: "", role: "", dateFrom: "", dateTo: "" });
  const [logPagination, setLogPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [bookingPagination, setBookingPagination] = useState({ page: 1, limit: 6, total: 0, totalPages: 1 });
  const [userPagination, setUserPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [voucherForm, setVoucherForm] = useState(emptyVoucherForm);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [deliveryForm, setDeliveryForm] = useState(emptyDeliveryForm);
  const [editingDeliveryBoy, setEditingDeliveryBoy] = useState(null);
  const [deliveryFiles, setDeliveryFiles] = useState({ profilePhoto: null, idProof: null });
  const { showToast } = useToast();

  useEffect(() => {
    Promise.all([
      api.get("/admin/stats"),
      api.get("/admin/users", { params: { page: 1, limit: 10 } }),
      api.get("/admin/properties"),
      api.get("/bookings", { params: { page: 1, limit: 6 } }),
      api.get("/contact?limit=50"),
      api.get("/admin/activity-logs", { params: { page: 1, limit: 10 } }),
      api.get("/item-types"),
      api.get("/vouchers"),
      api.get("/delivery/boys"),
      api.get("/delivery/assignments")
    ])
      .then(([stats, users, properties, bookings, contacts, logs, itemTypes, vouchers, deliveryBoys, deliveryAssignments]) => {
        setData({
          stats: stats.data.stats,
          users: users.data.users,
          properties: properties.data.properties,
          bookings: bookings.data.bookings,
          contacts: contacts.data.contacts,
          logs: logs.data.logs,
          itemTypes: itemTypes.data.itemTypes,
          vouchers: vouchers.data.vouchers,
          deliveryBoys: deliveryBoys.data.deliveryBoys,
          deliveryAssignments: deliveryAssignments.data.assignments
        });
        setLogPagination(logs.data.pagination || { page: 1, limit: 10, total: logs.data.logs.length, totalPages: 1 });
        setBookingPagination(bookings.data.pagination || { page: 1, limit: 6, total: bookings.data.bookings.length, totalPages: 1 });
        setUserPagination(users.data.pagination || { page: 1, limit: 10, total: users.data.users.length, totalPages: 1 });
      })
      .catch(() => setError("Unable to load admin dashboard"))
      .finally(() => setLoading(false));
  }, []);

  const addItemType = async (event) => {
    event.preventDefault();
    if (!typeName.trim()) return;

    try {
      const formData = new FormData();
      formData.append("name", typeName.trim());
      if (typeImage) formData.append("image", typeImage);
      const { data: response } = await api.post("/item-types", formData);
      setData((current) => ({ ...current, itemTypes: [...current.itemTypes, response.itemType].sort((a, b) => a.name.localeCompare(b.name)) }));
      setTypeName("");
      setTypeImage(null);
      setTypePreview("");
      showToast("Item type added");
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to add item type", "error");
    }
  };

  const startEditItemType = (item) => {
    setEditingType(item);
    setEditTypeName(item.name);
    setEditTypeImage(null);
    setEditTypePreview(item.image ? uploadUrl(item.image) : "");
  };

  const cancelEditItemType = () => {
    setEditingType(null);
    setEditTypeName("");
    setEditTypeImage(null);
    setEditTypePreview("");
  };

  const updateItemType = async (event) => {
    event.preventDefault();
    if (!editingType || !editTypeName.trim()) return;

    try {
      const formData = new FormData();
      formData.append("name", editTypeName.trim());
      if (editTypeImage) formData.append("image", editTypeImage);
      const { data: response } = await api.put(`/item-types/${editingType._id}`, formData);
      setData((current) => ({
        ...current,
        itemTypes: current.itemTypes.map((item) => item._id === response.itemType._id ? response.itemType : item).sort((a, b) => a.name.localeCompare(b.name))
      }));
      cancelEditItemType();
      showToast("Item type updated");
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to update item type", "error");
    }
  };

  const selectTypeImage = (file) => {
    setTypeImage(file || null);
    setTypePreview(file ? URL.createObjectURL(file) : "");
  };

  const selectEditTypeImage = (file) => {
    setEditTypeImage(file || null);
    setEditTypePreview(file ? URL.createObjectURL(file) : (editingType?.image ? uploadUrl(editingType.image) : ""));
  };

  const removeItemType = async (id) => {
    if (!window.confirm("Remove this item type? Existing items keep their current type name.")) return;
    try {
      await api.delete(`/item-types/${id}`);
      setData((current) => ({ ...current, itemTypes: current.itemTypes.filter((item) => item._id !== id) }));
      showToast("Item type removed");
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to remove item type", "error");
    }
  };

  const resetVoucherForm = () => {
    setVoucherForm(emptyVoucherForm);
    setEditingVoucher(null);
  };

  const saveVoucher = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        ...voucherForm,
        code: voucherForm.code.trim().toUpperCase(),
        value: Number(voucherForm.value || 0),
        maxDiscount: Number(voucherForm.maxDiscount || 0),
        minAmount: Number(voucherForm.minAmount || 0),
        usageLimit: Number(voucherForm.usageLimit || 0)
      };
      const request = editingVoucher ? api.put(`/vouchers/${editingVoucher._id}`, payload) : api.post("/vouchers", payload);
      const { data: response } = await request;
      setData((current) => ({
        ...current,
        vouchers: editingVoucher
          ? current.vouchers.map((voucher) => voucher._id === response.voucher._id ? response.voucher : voucher)
          : [response.voucher, ...current.vouchers]
      }));
      resetVoucherForm();
      showToast(editingVoucher ? "Voucher updated" : "Voucher added");
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to save voucher", "error");
    }
  };

  const startEditVoucher = (voucher) => {
    setEditingVoucher(voucher);
    setVoucherForm({
      code: voucher.code || "",
      description: voucher.description || "",
      discountType: voucher.discountType || "percentage",
      value: voucher.value || "",
      maxDiscount: voucher.maxDiscount || "",
      minAmount: voucher.minAmount || "",
      startDate: voucher.startDate ? voucher.startDate.slice(0, 10) : "",
      endDate: voucher.endDate ? voucher.endDate.slice(0, 10) : "",
      usageLimit: voucher.usageLimit || "",
      isActive: voucher.isActive !== false
    });
  };

  const deleteVoucher = async (id) => {
    if (!window.confirm("Delete this voucher?")) return;
    try {
      await api.delete(`/vouchers/${id}`);
      setData((current) => ({ ...current, vouchers: current.vouchers.filter((voucher) => voucher._id !== id) }));
      showToast("Voucher deleted");
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to delete voucher", "error");
    }
  };

  const loadDeliveryData = async () => {
    const [{ data: boys }, { data: assignments }] = await Promise.all([
      api.get("/delivery/boys"),
      api.get("/delivery/assignments")
    ]);
    setData((current) => ({ ...current, deliveryBoys: boys.deliveryBoys, deliveryAssignments: assignments.assignments }));
  };

  const resetDeliveryForm = () => {
    setDeliveryForm(emptyDeliveryForm);
    setEditingDeliveryBoy(null);
    setDeliveryFiles({ profilePhoto: null, idProof: null });
  };

  const startEditDeliveryBoy = (boy) => {
    setEditingDeliveryBoy(boy);
    setDeliveryForm({
      name: boy.name || "",
      mobileNumber: boy.mobileNumber || "",
      email: boy.email || "",
      password: "",
      address: boy.address || "",
      city: boy.city || "",
      area: boy.area || "",
      pincode: boy.pincode || "",
      availabilityStatus: boy.availabilityStatus || "available",
      isActive: boy.isActive !== false,
      joiningDate: boy.joiningDate ? boy.joiningDate.slice(0, 10) : ""
    });
    setDeliveryFiles({ profilePhoto: null, idProof: null });
  };

  const saveDeliveryBoy = async (event) => {
    event.preventDefault();
    try {
      const formData = new FormData();
      Object.entries(deliveryForm).forEach(([key, value]) => {
        if (key !== "password" || value || !editingDeliveryBoy) formData.append(key, value);
      });
      if (deliveryFiles.profilePhoto) formData.append("profilePhoto", deliveryFiles.profilePhoto);
      if (deliveryFiles.idProof) formData.append("idProof", deliveryFiles.idProof);
      const request = editingDeliveryBoy ? api.put(`/delivery/boys/${editingDeliveryBoy._id}`, formData) : api.post("/delivery/boys", formData);
      await request;
      await loadDeliveryData();
      resetDeliveryForm();
      showToast(editingDeliveryBoy ? "Delivery profile updated" : "Delivery profile created");
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to save delivery profile", "error");
    }
  };

  const deleteDeliveryBoy = async (id) => {
    if (!window.confirm("Delete this delivery boy profile?")) return;
    try {
      await api.delete(`/delivery/boys/${id}`);
      await loadDeliveryData();
      showToast("Delivery profile deleted");
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to delete delivery profile", "error");
    }
  };

  const assignDeliveryBoy = async (bookingId, deliveryBoyId) => {
    if (!deliveryBoyId) return;
    try {
      await api.post("/delivery/assign", { bookingId, deliveryBoyId });
      await loadDeliveryData();
      showToast("Delivery boy assigned");
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to assign delivery boy", "error");
    }
  };

  const deleteItem = async (id) => {
    if (!window.confirm("Delete this rental item? This action cannot be undone.")) return;

    try {
      await api.delete(`/properties/${id}`);
      showToast("Item deleted");
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to delete item", "error");
      return;
    }
    const [{ data: stats }, { data: properties }] = await Promise.all([
      api.get("/admin/stats"),
      api.get("/admin/properties")
    ]);

    setData((current) => ({
      ...current,
      stats: stats.stats,
      properties: properties.properties
    }));
  };

  const loadActivityLogs = async ({ page = logPagination.page, nextFilters = filters } = {}) => {
    const { data: logs } = await api.get("/admin/activity-logs", {
      params: {
        page,
        limit: logPagination.limit,
        search: nextFilters.search || undefined,
        dateFrom: nextFilters.dateFrom || undefined,
        dateTo: nextFilters.dateTo || undefined
      }
    });
    setData((current) => ({ ...current, logs: logs.logs }));
    setLogPagination(logs.pagination || { page, limit: logPagination.limit, total: logs.logs.length, totalPages: 1 });
    return logs;
  };

  const loadBookings = useCallback(async ({ page = 1, nextFilters = filters } = {}) => {
    const { data: response } = await api.get("/bookings", {
      params: {
        page,
        limit: bookingPagination.limit,
        search: nextFilters.search || undefined,
        status: nextFilters.status || undefined,
        dateFrom: nextFilters.dateFrom || undefined,
        dateTo: nextFilters.dateTo || undefined
      }
    });
    setData((current) => ({ ...current, bookings: response.bookings }));
    setBookingPagination(response.pagination || { page, limit: bookingPagination.limit, total: response.bookings.length, totalPages: 1 });
    return response;
  }, [bookingPagination.limit, filters]);

  const loadUsers = useCallback(async ({ page = 1, nextFilters = filters } = {}) => {
    const { data: response } = await api.get("/admin/users", {
      params: {
        page,
        limit: userPagination.limit,
        search: nextFilters.search || undefined,
        role: nextFilters.role || undefined
      }
    });
    setData((current) => ({ ...current, users: response.users }));
    setUserPagination(response.pagination || { page, limit: userPagination.limit, total: response.users.length, totalPages: 1 });
    return response;
  }, [filters, userPagination.limit]);

  const updateBookingStatus = async (id, status) => {
    try {
      await api.put(`/bookings/${id}/status`, { status });
      const [{ data: properties }] = await Promise.all([
        api.get("/admin/properties"),
        loadActivityLogs(),
        loadBookings({ page: bookingPagination.page })
      ]);
      setData((current) => ({
        ...current,
        properties: properties.properties
      }));
      showToast("Booking request status updated");
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to update booking request", "error");
    }
  };

  const updateOrderStatus = async (id, orderStatus) => {
    try {
      await api.put(`/bookings/${id}/order-status`, { orderStatus });
      await Promise.all([loadActivityLogs(), loadBookings({ page: bookingPagination.page })]);
      showToast("Order timeline updated");
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to update order timeline", "error");
    }
  };

  const signOut = () => {
    logout();
    showToast("Logged out successfully");
    router.push("/");
  };

  const selectTask = (id) => {
    setActiveTask(id);
    setMobileOpen(false);
  };

  const updateUserKycStatus = async (id, status) => {
    const rejectionReason = status === "rejected" ? window.prompt("Reason for rejection?", "KYC details could not be verified") || "" : "";
    try {
      await api.put(`/admin/users/${id}/kyc`, { status, rejectionReason });
      await loadUsers({ page: userPagination.page });
      showToast(`KYC ${status}`);
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to update KYC", "error");
    }
  };

  const deleteUserKyc = async (user) => {
    if (!window.confirm(`Delete KYC details for ${user.email}? This will remove document details and the uploaded KYC photo.`)) return;
    try {
      await api.delete(`/admin/users/${user._id}/kyc`);
      await loadUsers({ page: userPagination.page });
      showToast("KYC deleted");
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to delete KYC", "error");
    }
  };

  const updatePaymentStatus = async (id, paymentStatus) => {
    try {
      const { data: response } = await api.put(`/bookings/${id}/payment-status`, { paymentStatus });
      await loadActivityLogs();
      setData((current) => ({
        ...current,
        bookings: current.bookings.map((booking) => booking._id === id ? { ...booking, paymentStatus: response.booking.paymentStatus } : booking)
      }));
      showToast("Payment status updated");
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to update payment status", "error");
    }
  };

  const sendKycReminder = async (id) => {
    try {
      const { data: response } = await api.post(`/bookings/${id}/kyc-reminder`);
      showToast(response.message || "KYC reminder sent");
      await Promise.all([loadActivityLogs(), loadBookings({ page: bookingPagination.page })]);
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to send KYC reminder", "error");
    }
  };

  const updateContactStatus = async (id, status) => {
    try {
      const { data: response } = await api.put(`/contact/${id}/status`, { status });
      await loadActivityLogs();
      setData((current) => ({
        ...current,
        contacts: current.contacts.map((contact) => contact._id === id ? response.contact : contact)
      }));
      showToast("Contact status updated");
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to update contact status", "error");
    }
  };

  const deleteContact = async (id) => {
    if (!window.confirm("Delete this contact inquiry?")) return;
    try {
      await api.delete(`/contact/${id}`);
      await loadActivityLogs();
      setData((current) => ({
        ...current,
        contacts: current.contacts.filter((contact) => contact._id !== id)
      }));
      showToast("Contact inquiry deleted");
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to delete contact inquiry", "error");
    }
  };

  const exportCsv = (filename, rows) => {
    if (!rows.length) return showToast("No rows to export", "error");
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((row) => headers.map((header) => `"${String(row[header] ?? "").replaceAll('"', '""')}"`).join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!["bookings", "delivery"].includes(activeTask)) return undefined;
    const timer = setInterval(() => {
      loadDeliveryData().catch(() => {});
      if (activeTask === "bookings") loadBookings({ page: bookingPagination.page }).catch(() => {});
    }, 15000);
    return () => clearInterval(timer);
  }, [activeTask, bookingPagination.page, loadBookings]);

  return (
    <ProtectedRoute roles={["admin"]}>
      <DashboardLayout title="Admin dashboard">
        {loading ? <Loading /> : error ? <ErrorMessage message={error} /> : (
          <div className="relative">
            <button className="btn-secondary mb-4 lg:hidden" type="button" onClick={() => setMobileOpen(true)}>
              <Menu className="h-4 w-4" /> Menu
            </button>
            {mobileOpen && <button className="fixed inset-0 z-30 bg-black/40 lg:hidden" type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)} />}
            <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
              <DashboardSidebar
                activeId={activeTask}
                collapsed={collapsed}
                headerLabel="Admin"
                items={adminTasks}
                mobileOpen={mobileOpen}
                onClose={() => setMobileOpen(false)}
                onCollapse={() => setCollapsed((value) => !value)}
                onLogout={signOut}
                onSelect={selectTask}
                user={user}
                footer={<Link href="/add-item" className="btn-primary w-full"><PackagePlus className="h-4 w-4" /> Add Item</Link>}
              />

              <section className="min-w-0 rounded-[1.5rem] border border-violet-100 bg-white/90 p-4 shadow-soft dark:border-violet-900/70 dark:bg-white/10 md:p-6">
              {activeTask === "overview" && <OverviewPanel stats={data.stats} properties={data.properties} bookings={data.bookings} />}
              {activeTask === "types" && (
                <ItemTypesPanel
                  itemTypes={data.itemTypes}
                  properties={data.properties}
                  typeName={typeName}
                  setTypeName={setTypeName}
                  typePreview={typePreview}
                  selectTypeImage={selectTypeImage}
                  addItemType={addItemType}
                  removeItemType={removeItemType}
                  editingType={editingType}
                  editTypeName={editTypeName}
                  setEditTypeName={setEditTypeName}
                  editTypePreview={editTypePreview}
                  selectEditTypeImage={selectEditTypeImage}
                  startEditItemType={startEditItemType}
                  cancelEditItemType={cancelEditItemType}
                  updateItemType={updateItemType}
                />
              )}
              {activeTask === "items" && <ItemsPanel items={data.properties} filters={filters} setFilters={setFilters} deleteItem={deleteItem} exportCsv={exportCsv} />}
              {activeTask === "vouchers" && <VouchersPanel vouchers={data.vouchers} voucherForm={voucherForm} setVoucherForm={setVoucherForm} editingVoucher={editingVoucher} saveVoucher={saveVoucher} startEditVoucher={startEditVoucher} resetVoucherForm={resetVoucherForm} deleteVoucher={deleteVoucher} exportCsv={exportCsv} />}
              {activeTask === "bookings" && <BookingsPanel bookings={data.bookings} deliveryBoys={data.deliveryBoys} deliveryAssignments={data.deliveryAssignments} pagination={bookingPagination} filters={filters} setFilters={setFilters} loadBookings={loadBookings} assignDeliveryBoy={assignDeliveryBoy} updateBookingStatus={updateBookingStatus} updateOrderStatus={updateOrderStatus} updatePaymentStatus={updatePaymentStatus} sendKycReminder={sendKycReminder} exportCsv={exportCsv} />}
              {activeTask === "delivery" && <DeliveryPanel deliveryBoys={data.deliveryBoys} assignments={data.deliveryAssignments} filters={filters} setFilters={setFilters} deliveryForm={deliveryForm} setDeliveryForm={setDeliveryForm} deliveryFiles={deliveryFiles} setDeliveryFiles={setDeliveryFiles} editingDeliveryBoy={editingDeliveryBoy} saveDeliveryBoy={saveDeliveryBoy} resetDeliveryForm={resetDeliveryForm} startEditDeliveryBoy={startEditDeliveryBoy} deleteDeliveryBoy={deleteDeliveryBoy} exportCsv={exportCsv} />}
              {activeTask === "contacts" && <ContactsPanel contacts={data.contacts} filters={filters} setFilters={setFilters} updateContactStatus={updateContactStatus} deleteContact={deleteContact} exportCsv={exportCsv} />}
              {activeTask === "activity" && <ActivityPanel logs={data.logs} pagination={logPagination} filters={filters} setFilters={setFilters} loadActivityLogs={loadActivityLogs} exportCsv={exportCsv} />}
              {activeTask === "users" && <UsersPanel users={data.users} pagination={userPagination} filters={filters} setFilters={setFilters} loadUsers={loadUsers} updateUserKycStatus={updateUserKycStatus} deleteUserKyc={deleteUserKyc} exportCsv={exportCsv} />}
              </section>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function OverviewPanel({ stats, properties, bookings }) {
  const statusCounts = bookings.reduce((counts, booking) => {
    counts[booking.status] = (counts[booking.status] || 0) + 1;
    return counts;
  }, {});
  const topCategories = bookings.reduce((counts, booking) => {
    const type = itemTypeOf(booking.property || {}) || "Other";
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {});
  const revenue = bookings
    .filter((booking) => ["rented", "returned"].includes(booking.status) || booking.paymentStatus === "paid")
    .reduce((total, booking) => total + Number(booking.finalAmount || booking.totalAmount || 0), 0);
  const trendByDay = bookings.reduce((counts, booking) => {
    const key = new Date(booking.createdAt).toLocaleDateString();
    counts[key] = (counts[key] || 0) + Number(booking.finalAmount || booking.totalAmount || 0);
    return counts;
  }, {});
  const maxStatus = Math.max(1, ...Object.values(statusCounts));
  const maxCategory = Math.max(1, ...Object.values(topCategories));
  const maxRevenue = Math.max(1, ...Object.values(trendByDay));
  const lowStock = properties.filter((item) => quantityOf(item) > 0 && quantityOf(item) <= 2);
  const analytics = {
    bookings: bookings.length,
    confirmed: statusCounts.rented || 0,
    pending: statusCounts.pending || 0,
    cancelled: statusCounts.closed || 0
  };

  return (
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AnalyticsCard icon={Package} label="Total Bookings" value={analytics.bookings} hint={`${stats?.users || 0} users`} />
        <AnalyticsCard icon={PackageCheck} label="Confirmed" value={analytics.confirmed} hint="Inventory reserved" />
        <AnalyticsCard icon={CalendarCheck} label="Pending" value={analytics.pending} hint="Needs review" />
        <AnalyticsCard icon={BarChart3} label="Revenue" value={`₹${revenue.toLocaleString()}`} hint={`${analytics.cancelled} cancelled`} />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Booking status">
          {bookingStatusOptions.map(([status, label]) => (
            <BarRow key={status} label={label} value={statusCounts[status] || 0} max={maxStatus} />
          ))}
        </ChartCard>
        <ChartCard title="Most booked categories">
          {Object.entries(topCategories).length ? Object.entries(topCategories).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([type, count]) => (
            <BarRow key={type} label={type} value={count} max={maxCategory} />
          )) : <EmptyState title="No category data" message="Publish items to see top category performance." />}
        </ChartCard>
      </div>
      <ChartCard title="Revenue trends">
        {Object.entries(trendByDay).length ? Object.entries(trendByDay).slice(-7).map(([day, amount]) => (
          <BarRow key={day} label={day} value={amount} max={maxRevenue} prefix="₹" />
        )) : <EmptyState title="No revenue data" message="Confirmed or paid bookings will create revenue trend data." />}
      </ChartCard>
      <ChartCard title="Low-stock alerts">
        {lowStock.length ? lowStock.slice(0, 6).map((item) => (
          <div key={item._id} className="flex items-center justify-between rounded-lg bg-mist p-3 text-sm dark:bg-stone-800">
            <span>{item.title}</span>
            <strong className="text-amber-700">{quantityOf(item)} left</strong>
          </div>
        )) : <EmptyState title="No low-stock items" message="Items with 1 or 2 units left will appear here." />}
      </ChartCard>
    </section>
  );
}

function AnalyticsCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft dark:border-violet-900/70 dark:bg-stone-950/70">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-violet-950/55 dark:text-violet-100/60">{label}</p>
          <p className="mt-2 text-3xl font-black text-ink dark:text-white">{value}</p>
          <p className="mt-2 text-xs font-bold text-meadow">{hint}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-100">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
      <h2 className="text-lg font-black">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function BarRow({ label, value, max, prefix = "" }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="capitalize text-stone-600 dark:text-stone-300">{label}</span>
        <strong>{prefix}{Number(value).toLocaleString()}</strong>
      </div>
      <div className="h-2 rounded-full bg-mist dark:bg-stone-800">
        <div className="h-2 rounded-full bg-meadow" style={{ width: value ? `${Math.max(4, (value / max) * 100)}%` : "0%" }} />
      </div>
    </div>
  );
}

function ItemTypesPanel({
  itemTypes,
  properties,
  typeName,
  setTypeName,
  typePreview,
  selectTypeImage,
  addItemType,
  removeItemType,
  editingType,
  editTypeName,
  setEditTypeName,
  editTypePreview,
  selectEditTypeImage,
  startEditItemType,
  cancelEditItemType,
  updateItemType
}) {
  const countByType = properties.reduce((counts, item) => {
    const type = itemTypeOf(item);
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {});

  return (
    <section className="rounded-2xl border border-violet-100 bg-white/90 p-5 shadow-soft dark:border-violet-900/70 dark:bg-white/10">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-xl font-black text-ink dark:text-white">Item types</h2>
          <p className="mt-1 text-sm text-violet-950/60 dark:text-violet-100/65">Add categories with images for home page browsing, filters, and item forms.</p>
        </div>
      </div>

      <form onSubmit={addItemType} className="mt-5 grid gap-4 rounded-2xl border border-violet-100 bg-mist/70 p-4 dark:border-violet-900/70 dark:bg-white/10 lg:grid-cols-[140px_1fr_auto] lg:items-center">
        <label className="group relative grid aspect-[4/3] cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed border-violet-300 bg-white/80 text-center shadow-sm dark:border-violet-800 dark:bg-white/10">
          {typePreview ? (
            <img src={typePreview} alt="Item type preview" className="h-full w-full object-cover" />
          ) : (
            <span className="grid place-items-center gap-2 text-xs font-black uppercase tracking-wide text-meadow">
              <ImagePlus className="h-7 w-7" />
              Upload photo
            </span>
          )}
          <input className="sr-only" type="file" accept="image/*" onChange={(event) => selectTypeImage(event.target.files?.[0])} />
        </label>
        <div>
          <input className="field" placeholder="Projector, speaker, camera" value={typeName} onChange={(e) => setTypeName(e.target.value)} />
          <p className="mt-2 text-xs text-violet-950/55 dark:text-violet-100/60">Preview the image here before saving. If no image is uploaded, the homepage uses a default category photo.</p>
        </div>
        <button className="btn-primary min-h-11 lg:min-w-28">Add type</button>
      </form>

      {editingType && (
        <form onSubmit={updateItemType} className="mt-5 grid gap-4 rounded-2xl border border-violet-200 bg-white p-4 shadow-sm dark:border-violet-800 dark:bg-white/10 lg:grid-cols-[140px_1fr_auto] lg:items-center">
          <label className="group relative grid aspect-[4/3] cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed border-violet-300 bg-mist text-center dark:border-violet-800 dark:bg-violet-950/40">
            {editTypePreview ? (
              <img src={editTypePreview} alt={`${editTypeName} preview`} className="h-full w-full object-cover" />
            ) : (
              <span className="grid place-items-center gap-2 text-xs font-black uppercase tracking-wide text-meadow">
                <ImagePlus className="h-7 w-7" />
                Choose photo
              </span>
            )}
            <input className="sr-only" type="file" accept="image/*" onChange={(event) => selectEditTypeImage(event.target.files?.[0])} />
          </label>
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-meadow">Editing item type</p>
            <input className="field" value={editTypeName} onChange={(event) => setEditTypeName(event.target.value)} />
          </div>
          <div className="flex gap-2 lg:flex-col">
            <button className="btn-primary flex-1" type="submit"><Save className="h-4 w-4" /> Save</button>
            <button className="btn-secondary flex-1" type="button" onClick={cancelEditItemType}><X className="h-4 w-4" /> Cancel</button>
          </div>
        </form>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {itemTypes.length ? itemTypes.map((item) => (
          <article key={item._id} className="overflow-hidden rounded-2xl border border-violet-100 bg-mist/80 shadow-sm transition hover:-translate-y-1 hover:shadow-soft dark:border-violet-900/70 dark:bg-white/10">
            <div className="aspect-[16/10] bg-violet-100 dark:bg-violet-950/50">
              <img src={item.image ? uploadUrl(item.image) : defaultItemTypeImage} alt={item.name} className="h-full w-full object-cover" />
            </div>
            <div className="flex items-start justify-between gap-3 p-4">
              <div>
                <h3 className="font-black text-ink dark:text-white">{item.name}</h3>
                <p className="text-sm text-violet-950/60 dark:text-violet-100/65">{countByType[item.name] || 0} listed items</p>
                <p className="mt-2 text-xs font-semibold text-violet-950/45 dark:text-violet-100/45">{item.image ? "Custom category photo" : "Using fallback photo on homepage"}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button className="rounded-lg p-2 text-stone-500 hover:bg-white hover:text-meadow dark:text-stone-400 dark:hover:bg-stone-900 dark:hover:text-violet-200" onClick={() => startEditItemType(item)} aria-label={`Edit ${item.name}`} type="button">
                  <Pencil className="h-4 w-4" />
                </button>
                <button className="rounded-lg p-2 text-stone-500 hover:bg-white hover:text-red-600 dark:text-stone-400 dark:hover:bg-stone-900 dark:hover:text-red-400" onClick={() => removeItemType(item._id)} aria-label={`Remove ${item.name}`} type="button">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </article>
        )) : <EmptyState title="No item types yet" message="Add categories like Projector, Speaker, Camera, and Luggage before publishing inventory." />}
      </div>
    </section>
  );
}

function ItemsPanel({ items, filters, setFilters, deleteItem, exportCsv }) {
  const filteredItems = items.filter((item) => {
    const q = filters.search.toLowerCase();
    const matchesSearch = !q || item.title.toLowerCase().includes(q) || itemTypeOf(item).toLowerCase().includes(q) || String(item.pincode || "").includes(q);
    const matchesType = !filters.type || itemTypeOf(item) === filters.type;
    const matchesStatus = !filters.status || (filters.status === "low" ? quantityOf(item) > 0 && quantityOf(item) <= 2 : filters.status === "out" ? quantityOf(item) === 0 : quantityOf(item) > 2);
    return matchesSearch && matchesType && matchesStatus;
  });
  const types = [...new Set(items.map(itemTypeOf).filter(Boolean))];

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h2 className="text-lg font-black">Items</h2>
          <p className="mt-1 text-sm text-stone-500">Manage listed rental inventory and remove items that should no longer be available.</p>
        </div>
        <div className="flex gap-2">
        <button className="btn-secondary" onClick={() => exportCsv("items.csv", filteredItems.map((item) => ({ title: item.title, type: itemTypeOf(item), pincode: item.pincode, quantity: quantityOf(item), rent: item.rent, offer: item.offer || "" })))}>
          Export CSV
        </button>
        <Link href="/add-item" className="btn-primary">
          <PackagePlus className="h-4 w-4" />
          Add Item
        </Link>
        </div>
      </div>
      <AdminFilters filters={filters} setFilters={setFilters} typeOptions={types} statusOptions={[["", "All stock"], ["available", "Available"], ["low", "Low stock"], ["out", "Out of stock"]]} />
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-mist dark:bg-stone-800">
            <tr>
              {["Item", "Type", "Pincode", "Qty", "Daily rent", "Status", "Action"].map((header) => (
                <th key={header} className="px-4 py-3 font-bold">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredItems.length ? filteredItems.map((item) => (
              <tr key={item._id} className="border-t border-stone-100 dark:border-stone-800">
                <td className="px-4 py-3">
                  <strong>{item.title}</strong>
                  <p className="text-xs text-stone-500">{conditionOf(item)} condition</p>
                </td>
                <td className="px-4 py-3">{itemTypeOf(item)}</td>
                <td className="px-4 py-3">{item.pincode}</td>
                <td className="px-4 py-3 font-semibold">{quantityOf(item)}</td>
                <td className="px-4 py-3">₹{Number(item.rent).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-bold ${item.isAvailable && quantityOf(item) > 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    {item.isAvailable && quantityOf(item) > 0 ? "Available" : "Out"}
                  </span>
                </td>
                <td className="flex gap-2 px-4 py-3">
                  <Link className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-xs font-bold text-stone-700 hover:bg-mist dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800" href={`/admin/items/${item._id}/edit`}>
                    Edit
                  </Link>
                  <button className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-950/30" onClick={() => deleteItem(item._id)}>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </td>
              </tr>
            )) : null}
          </tbody>
        </table>
        {!filteredItems.length && <div className="p-4"><EmptyState title="No matching items" message="Adjust search or filters to find inventory." actionHref="/add-item" actionLabel="Add item" /></div>}
      </div>
    </section>
  );
}

function VouchersPanel({ vouchers, voucherForm, setVoucherForm, editingVoucher, saveVoucher, startEditVoucher, resetVoucherForm, deleteVoucher, exportCsv }) {
  const updateForm = (key, value) => setVoucherForm((current) => ({ ...current, [key]: value }));
  const formatDate = (value) => value ? new Date(value).toLocaleDateString() : "No limit";

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm dark:border-violet-900/70 dark:bg-stone-950/70">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-black text-ink dark:text-white">Vouchers</h2>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Create checkout discount codes with amount rules, validity, and usage limits.</p>
          </div>
          <button className="btn-secondary" type="button" onClick={() => exportCsv("vouchers.csv", vouchers.map((voucher) => ({
            code: voucher.code,
            type: voucher.discountType,
            value: voucher.value,
            minAmount: voucher.minAmount,
            used: voucher.usedCount,
            usageLimit: voucher.usageLimit,
            active: voucher.isActive
          })))}>
            Export CSV
          </button>
        </div>

        <form onSubmit={saveVoucher} className="mt-5 grid gap-4 rounded-2xl border border-violet-100 bg-mist/70 p-4 dark:border-violet-900/70 dark:bg-white/10 lg:grid-cols-3">
          <label className="space-y-2">
            <span className="text-sm font-black">Voucher code</span>
            <input className="field uppercase" placeholder="SUMMER10" value={voucherForm.code} onChange={(event) => updateForm("code", event.target.value.toUpperCase())} />
          </label>
          <label className="space-y-2 lg:col-span-2">
            <span className="text-sm font-black">Description</span>
            <input className="field" placeholder="10% off up to ₹500" value={voucherForm.description} onChange={(event) => updateForm("description", event.target.value)} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-black">Discount type</span>
            <select className="field" value={voucherForm.discountType} onChange={(event) => updateForm("discountType", event.target.value)}>
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed amount</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-black">{voucherForm.discountType === "percentage" ? "Discount %" : "Discount amount"}</span>
            <input className="field" min="0" type="number" value={voucherForm.value} onChange={(event) => updateForm("value", event.target.value)} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-black">Max discount</span>
            <input className="field" min="0" placeholder="0 for no cap" type="number" value={voucherForm.maxDiscount} onChange={(event) => updateForm("maxDiscount", event.target.value)} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-black">Minimum rent</span>
            <input className="field" min="0" type="number" value={voucherForm.minAmount} onChange={(event) => updateForm("minAmount", event.target.value)} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-black">Start date</span>
            <input className="field" type="date" value={voucherForm.startDate} onChange={(event) => updateForm("startDate", event.target.value)} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-black">End date</span>
            <input className="field" type="date" value={voucherForm.endDate} onChange={(event) => updateForm("endDate", event.target.value)} />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-black">Usage limit</span>
            <input className="field" min="0" placeholder="0 for unlimited" type="number" value={voucherForm.usageLimit} onChange={(event) => updateForm("usageLimit", event.target.value)} />
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-violet-100 bg-white px-4 py-3 text-sm font-black dark:border-violet-900/70 dark:bg-stone-950/70">
            <input className="h-4 w-4 accent-meadow" type="checkbox" checked={voucherForm.isActive} onChange={(event) => updateForm("isActive", event.target.checked)} />
            Active voucher
          </label>
          <div className="flex gap-2 lg:col-span-2 lg:justify-end">
            {editingVoucher && <button className="btn-secondary" type="button" onClick={resetVoucherForm}><X className="h-4 w-4" /> Cancel</button>}
            <button className="btn-primary" type="submit"><Save className="h-4 w-4" /> {editingVoucher ? "Update voucher" : "Add voucher"}</button>
          </div>
        </form>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {vouchers.length ? vouchers.map((voucher) => (
          <article key={voucher._id} className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm dark:border-violet-900/70 dark:bg-stone-950/70">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-black text-ink dark:text-white">{voucher.code}</h3>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${voucher.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    {voucher.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{voucher.description}</p>
              </div>
              <div className="flex gap-1">
                <button className="rounded-lg p-2 text-stone-500 hover:bg-mist hover:text-meadow dark:text-stone-400 dark:hover:bg-stone-900" type="button" onClick={() => startEditVoucher(voucher)} aria-label={`Edit ${voucher.code}`}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button className="rounded-lg p-2 text-stone-500 hover:bg-red-50 hover:text-red-600 dark:text-stone-400 dark:hover:bg-red-950/30 dark:hover:text-red-300" type="button" onClick={() => deleteVoucher(voucher._id)} aria-label={`Delete ${voucher.code}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <InfoTile label="Discount" value={voucher.discountType === "percentage" ? `${voucher.value}%` : `₹${Number(voucher.value || 0).toLocaleString()}`} />
              <InfoTile label="Max discount" value={voucher.maxDiscount ? `₹${Number(voucher.maxDiscount).toLocaleString()}` : "No cap"} />
              <InfoTile label="Minimum rent" value={`₹${Number(voucher.minAmount || 0).toLocaleString()}`} />
              <InfoTile label="Usage" value={`${voucher.usedCount || 0}${voucher.usageLimit ? ` / ${voucher.usageLimit}` : " used"}`} />
              <InfoTile label="Starts" value={formatDate(voucher.startDate)} />
              <InfoTile label="Ends" value={formatDate(voucher.endDate)} />
            </div>
          </article>
        )) : <EmptyState title="No vouchers yet" message="Create a voucher code and customers can apply it during checkout." />}
      </div>
    </section>
  );
}

function DeliveryPanel({ deliveryBoys, assignments, filters, setFilters, deliveryForm, setDeliveryForm, deliveryFiles, setDeliveryFiles, editingDeliveryBoy, saveDeliveryBoy, resetDeliveryForm, startEditDeliveryBoy, deleteDeliveryBoy, exportCsv }) {
  const updateForm = (key, value) => setDeliveryForm((current) => ({ ...current, [key]: value }));
  const filteredBoys = deliveryBoys.filter((boy) => {
    const q = filters.search.toLowerCase();
    const text = `${boy.name} ${boy.email} ${boy.mobileNumber} ${boy.city} ${boy.area} ${boy.pincode}`.toLowerCase();
    const activeMatch = !filters.status || (filters.status === "active" ? boy.isActive : !boy.isActive);
    const areaMatch = !filters.type || `${boy.city} ${boy.area} ${boy.pincode}`.toLowerCase().includes(filters.type.toLowerCase());
    return (!q || text.includes(q)) && activeMatch && areaMatch;
  });
  const available = deliveryBoys.filter((boy) => boy.availabilityStatus === "available" && boy.isActive).length;
  const busy = deliveryBoys.filter((boy) => boy.availabilityStatus === "busy").length;

  return (
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <AnalyticsCard icon={Truck} label="Delivery Boys" value={deliveryBoys.length} hint={`${available} available`} />
        <AnalyticsCard icon={PackageCheck} label="Assigned Orders" value={assignments.length} hint={`${busy} busy`} />
        <AnalyticsCard icon={CalendarCheck} label="Active Profiles" value={deliveryBoys.filter((boy) => boy.isActive).length} hint="Ready for assignment" />
      </div>

      <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm dark:border-violet-900/70 dark:bg-stone-950/70">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-black text-ink dark:text-white">{editingDeliveryBoy ? "Edit delivery boy" : "Create delivery boy"}</h2>
            <p className="mt-1 text-sm text-stone-500">Add courier profiles with login access, service area, documents, and availability.</p>
          </div>
          {editingDeliveryBoy && <button className="btn-secondary" type="button" onClick={resetDeliveryForm}><X className="h-4 w-4" /> Cancel edit</button>}
        </div>
        <form onSubmit={saveDeliveryBoy} className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input className="field" placeholder="Name" required value={deliveryForm.name} onChange={(event) => updateForm("name", event.target.value)} />
          <input className="field" placeholder="Mobile number" required value={deliveryForm.mobileNumber} onChange={(event) => updateForm("mobileNumber", event.target.value)} />
          <input className="field" type="email" placeholder="Email" required value={deliveryForm.email} onChange={(event) => updateForm("email", event.target.value)} />
          <input className="field" type="password" placeholder={editingDeliveryBoy ? "New password optional" : "Login password"} required={!editingDeliveryBoy} value={deliveryForm.password} onChange={(event) => updateForm("password", event.target.value)} />
          <input className="field md:col-span-2" placeholder="Address" required value={deliveryForm.address} onChange={(event) => updateForm("address", event.target.value)} />
          <input className="field" placeholder="City" required value={deliveryForm.city} onChange={(event) => updateForm("city", event.target.value)} />
          <input className="field" placeholder="Area" required value={deliveryForm.area} onChange={(event) => updateForm("area", event.target.value)} />
          <input className="field" placeholder="Pincode" required value={deliveryForm.pincode} onChange={(event) => updateForm("pincode", event.target.value)} />
          <select className="field" value={deliveryForm.availabilityStatus} onChange={(event) => updateForm("availabilityStatus", event.target.value)}>
            <option value="available">Available</option>
            <option value="busy">Busy</option>
            <option value="offline">Offline</option>
          </select>
          <input className="field" type="date" value={deliveryForm.joiningDate} onChange={(event) => updateForm("joiningDate", event.target.value)} />
          <label className="flex items-center gap-3 rounded-xl border border-violet-100 bg-mist/70 px-4 py-3 text-sm font-black dark:border-violet-900/70 dark:bg-white/10">
            <input className="h-4 w-4 accent-meadow" type="checkbox" checked={deliveryForm.isActive} onChange={(event) => updateForm("isActive", event.target.checked)} />
            Active profile
          </label>
          <label className="field cursor-pointer">
            <span className="text-sm">{deliveryFiles.profilePhoto ? deliveryFiles.profilePhoto.name : "Upload profile photo"}</span>
            <input className="hidden" type="file" accept="image/*" onChange={(event) => setDeliveryFiles((current) => ({ ...current, profilePhoto: event.target.files?.[0] || null }))} />
          </label>
          <label className="field cursor-pointer">
            <span className="text-sm">{deliveryFiles.idProof ? deliveryFiles.idProof.name : "Upload ID proof"}</span>
            <input className="hidden" type="file" accept="image/*,application/pdf" onChange={(event) => setDeliveryFiles((current) => ({ ...current, idProof: event.target.files?.[0] || null }))} />
          </label>
          <div className="flex gap-2 xl:col-span-4 xl:justify-end">
            <button className="btn-primary" type="submit"><Save className="h-4 w-4" /> {editingDeliveryBoy ? "Update profile" : "Create profile"}</button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm dark:border-violet-900/70 dark:bg-stone-950/70">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-black">Delivery boys</h2>
            <p className="mt-1 text-sm text-stone-500">Filter by status, service area, or assigned orders.</p>
          </div>
          <button className="btn-secondary" type="button" onClick={() => exportCsv("delivery-boys.csv", filteredBoys.map((boy) => ({ name: boy.name, email: boy.email, mobile: boy.mobileNumber, city: boy.city, area: boy.area, pincode: boy.pincode, availability: boy.availabilityStatus, active: boy.isActive, assignedOrders: boy.assignedOrders })))}>
            Export CSV
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input className="field" placeholder="Search delivery boy" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
          <select className="field" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            <option value="">All profiles</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <input className="field" placeholder="City, area, or pincode" value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))} />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {filteredBoys.map((boy) => (
            <article key={boy._id} className="rounded-2xl border border-violet-100 bg-mist/70 p-4 dark:border-violet-900/70 dark:bg-white/10">
              <div className="flex gap-4">
                <img src={uploadUrl(boy.profilePhoto)} alt={boy.name} className="h-20 w-20 rounded-2xl object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="break-words text-lg font-black text-ink dark:text-white">{boy.name}</h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${boy.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{boy.isActive ? "Active" : "Inactive"}</span>
                    <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700 dark:bg-violet-950/70 dark:text-violet-100">{boy.availabilityStatus}</span>
                  </div>
                  <p className="mt-1 break-words text-sm font-semibold text-violet-950/60 dark:text-violet-100/65">{boy.email} · {boy.mobileNumber}</p>
                  <p className="mt-1 break-words text-sm text-violet-950/60 dark:text-violet-100/65">{boy.area}, {boy.city} - {boy.pincode}</p>
                  <p className="mt-2 text-sm font-black text-meadow">{boy.assignedOrders || 0} active assigned order(s)</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="btn-secondary" type="button" onClick={() => startEditDeliveryBoy(boy)}><Pencil className="h-4 w-4" /> Edit</button>
                {boy.idProof && <a className="btn-secondary" href={uploadUrl(boy.idProof)} target="_blank" rel="noreferrer">View ID</a>}
                <button className="btn-secondary text-red-600" type="button" onClick={() => deleteDeliveryBoy(boy._id)}><Trash2 className="h-4 w-4" /> Delete</button>
              </div>
            </article>
          ))}
          {!filteredBoys.length && <EmptyState title="No delivery boys found" message="Create a delivery profile to assign orders." />}
        </div>
      </div>

      <div className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm dark:border-violet-900/70 dark:bg-stone-950/70">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-black">Assigned orders</h2>
            <p className="mt-1 text-sm text-stone-500">Review delivery timeline, assigned partner, customer, and proof status.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          {assignments.slice(0, 8).map((assignment) => {
            const booking = assignment.booking || {};
            const proofCount = [assignment.proof?.customerSignature, assignment.proof?.handoverPhoto, ...(assignment.proof?.returnPhotos || [])].filter(Boolean).length;
            return (
              <article key={assignment._id} className="rounded-2xl border border-violet-100 bg-mist/70 p-4 dark:border-violet-900/70 dark:bg-white/10">
                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-violet-700 px-3 py-1 text-xs font-black text-white">#{String(booking._id).slice(-8)}</span>
                      <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${deliveryStatusClass(assignment.status)}`}>
                        <span className={`h-2 w-2 rounded-full ${deliveryStatusDotClass(assignment.status)}`} />
                        {deliveryStatusLabels[assignment.status] || assignment.status}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-violet-700 dark:bg-stone-950 dark:text-violet-100">{proofCount} proof file(s)</span>
                    </div>
                    <h3 className="mt-2 break-words text-base font-black text-ink dark:text-white">{booking.property?.title || "Rental item"}</h3>
                    <p className="mt-1 text-sm font-semibold text-violet-950/60 dark:text-violet-100/65">{booking.user?.name || "Customer"} · {booking.user?.phone || "No mobile"}</p>
                    <p className="mt-1 text-sm font-semibold text-violet-950/60 dark:text-violet-100/65">Delivery: {assignment.deliveryBoy?.name || "Not assigned"} · {assignment.deliveryBoy?.mobileNumber || "-"}</p>
                  </div>
                  <div className="text-sm font-bold text-violet-950/55 dark:text-violet-100/55">
                    Updated {formatDate(assignment.updatedAt)}
                  </div>
                </div>
              </article>
            );
          })}
          {!assignments.length && <EmptyState title="No assigned deliveries" message="Assign a delivery boy from the Booking Requests panel." />}
        </div>
      </div>
    </section>
  );
}

function BookingsPanel({ bookings, deliveryBoys, deliveryAssignments, pagination, filters, setFilters, loadBookings, assignDeliveryBoy, updateBookingStatus, updateOrderStatus, updatePaymentStatus, sendKycReminder, exportCsv }) {
  const currentPage = pagination.page || 1;
  const totalPages = pagination.totalPages || 1;
  const totalBookings = pagination.total || 0;

  useEffect(() => {
    const timer = setTimeout(() => {
      loadBookings({ page: 1, nextFilters: filters }).catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [filters.search, filters.status, filters.dateFrom, filters.dateTo, loadBookings]);

  const movePage = (nextPage) => {
    loadBookings({ page: Math.min(Math.max(nextPage, 1), totalPages), nextFilters: filters }).catch(() => {});
  };

  const exportRows = bookings.map((booking) => {
    const amount = Number(booking.finalAmount || booking.totalAmount || 0);
    return {
      id: booking._id,
      item: booking.property?.title,
      user: booking.user?.name,
      status: bookingStatusLabel(booking.status),
      orderStatus: orderTimelineLabel(booking.orderStatus || "order_received"),
      payment: booking.paymentStatus,
      amount
    };
  });

  return (
    <section className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm dark:border-violet-900/70 dark:bg-stone-950/70 md:p-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h2 className="text-xl font-black">Booking Requests</h2>
          <p className="mt-1 text-sm text-stone-500">Latest active orders first. Completed bookings are hidden from this work queue.</p>
        </div>
        <button className="btn-secondary" onClick={() => exportCsv("booking-requests.csv", exportRows)}>
          Export CSV
        </button>
      </div>
      <AdminFilters showDates filters={filters} setFilters={setFilters} statusOptions={[["", "All active statuses"], ...bookingFilterStatusOptions]} />
      <div className="mt-4 grid gap-4">
        {bookings.length ? bookings.map((booking) => {
          const amount = Number(booking.finalAmount || booking.totalAmount || 0);
          const deliveryTime = booking.deliveryEta || (booking.deliverySpeed === "fast" ? "Within 2 hours" : "Within 24 hours");
          const assignment = deliveryAssignments.find((item) => String(item.booking?._id || item.booking) === String(booking._id));
          const customerKyc = kycBadge(booking.user?.kyc?.status);
          const confirmationLocked = needsKycForConfirmation(booking);
          return (
            <article key={booking._id} className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-soft dark:border-violet-900/70 dark:bg-stone-950/80">
              <div className="border-b border-violet-100 bg-gradient-to-r from-violet-50 via-white to-lavender/40 p-4 dark:border-violet-900/70 dark:from-violet-950/50 dark:via-stone-950 dark:to-violet-950/30">
                <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-violet-700 px-3 py-1 text-xs font-black text-white">#{String(booking._id).slice(-8)}</span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-violet-700 shadow-sm dark:bg-stone-900 dark:text-violet-100">{booking.paymentStatus || "pending"}</span>
                      {customerKyc && (
                        <button
                          className={`rounded-full border px-3 py-1 text-xs font-black transition hover:-translate-y-0.5 hover:shadow-sm ${customerKyc.className}`}
                          type="button"
                          onClick={() => sendKycReminder(booking._id)}
                          title="Send KYC reminder email"
                        >
                          {customerKyc.label}
                        </button>
                      )}
                    </div>
                    <h3 className="mt-3 break-words text-lg font-black text-ink dark:text-white">{booking.property?.title || "Rental item"}</h3>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-violet-950/60 dark:text-violet-100/65">
                      <span>{booking.user?.name || "Customer"}</span>
                      <span>{booking.user?.email || "No email"}</span>
                      <span>{formatDate(booking.createdAt)}</span>
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white px-5 py-4 text-left shadow-sm dark:bg-stone-900 xl:text-right">
                    <p className="text-xs font-black uppercase tracking-wide text-violet-950/45 dark:text-violet-100/45">Payable</p>
                    <p className="mt-1 text-2xl font-black text-meadow">₹{amount.toLocaleString()}</p>
                    <p className="mt-1 text-xs font-black uppercase text-violet-950/45 dark:text-violet-100/45">{booking.paymentMethod === "razorpay" ? "Razorpay" : "Cash on Delivery"}</p>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1.4fr]">
                  <InfoTile icon={CalendarCheck} label="Rental dates" value={`${formatDate(booking.startDate)} - ${formatDate(booking.endDate)}`} />
                  <InfoTile icon={Truck} label="Delivery time" value={deliveryTime} />
                  <div className="min-w-0 rounded-xl bg-white p-3 dark:bg-stone-950/70">
                    <div className="flex min-w-0 items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-meadow" />
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-wide text-violet-950/45 dark:text-violet-100/45">Delivery address</p>
                        <p className="mt-1 break-words font-black text-ink dark:text-white">{booking.deliveryAddress || "Address shared by customer"}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/80 via-white to-fuchsia-50/70 p-4 shadow-sm dark:border-violet-900/70 dark:from-violet-950/40 dark:via-stone-950 dark:to-fuchsia-950/20">
                  <div className="mb-4 flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-violet-950/45 dark:text-violet-100/45">Manage booking</p>
                      <p className="mt-1 text-sm font-semibold text-violet-950/60 dark:text-violet-100/60">
                        {confirmationLocked ? "KYC must be completed before this order can be confirmed." : "Update order, payment, and delivery assignment from one place."}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <ControlSelect label="Order timeline" value={booking.orderStatus || "order_received"} onChange={(value) => updateOrderStatus(booking._id, value)}>
                      {orderTimelineOptions.map(([value, label]) => (
                        <option key={value} value={value} disabled={!canSelectOrderTimeline(booking.orderStatus, value) || (confirmationLocked && value === "order_confirmed")}>
                          {label}
                        </option>
                      ))}
                    </ControlSelect>
                    <ControlSelect label="Booking status" value={booking.status} onChange={(value) => updateBookingStatus(booking._id, value)}>
                      {bookingStatusOptions.map(([value, label]) => (
                        <option key={value} value={value} disabled={confirmationLocked && value === "rented"}>{label}</option>
                      ))}
                    </ControlSelect>
                    <ControlSelect label="Payment" value={booking.paymentStatus} onChange={(value) => updatePaymentStatus(booking._id, value)}>
                      <option value="pending">Payment pending</option>
                      <option value="paid" disabled={confirmationLocked}>Paid</option>
                      <option value="failed">Failed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="refunded">Refunded</option>
                    </ControlSelect>
                    <ControlSelect label="Delivery boy" value={assignment?.deliveryBoy?._id || ""} onChange={(value) => assignDeliveryBoy(booking._id, value)}>
                      <option value="">Assign delivery</option>
                      {deliveryBoys.filter((boy) => boy.isActive && boy.availabilityStatus !== "offline").map((boy) => (
                        <option key={boy._id} value={boy._id}>{boy.name} · {boy.area}</option>
                      ))}
                    </ControlSelect>
                  </div>
                </div>
              </div>
            </article>
          );
        }) : <EmptyState title="No active booking requests" message="Completed orders are hidden. New and in-progress bookings will appear here first." />}
      </div>
      {totalBookings > pagination.limit && (
        <div className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-violet-100 pt-4 text-sm font-bold text-violet-950/60 dark:border-violet-900/70 dark:text-violet-100/60 sm:flex-row">
          <span>Showing {(currentPage - 1) * pagination.limit + 1}-{Math.min(currentPage * pagination.limit, totalBookings)} of {totalBookings}</span>
          <div className="flex items-center gap-2">
            <button className="btn-secondary" type="button" disabled={currentPage === 1} onClick={() => movePage(currentPage - 1)}>Previous</button>
            <span className="rounded-full bg-violet-50 px-4 py-2 text-violet-700 dark:bg-violet-950/60 dark:text-violet-100">Page {currentPage} / {totalPages}</span>
            <button className="btn-secondary" type="button" disabled={currentPage === totalPages} onClick={() => movePage(currentPage + 1)}>Next</button>
          </div>
        </div>
      )}
    </section>
  );
}

function InfoTile({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0 rounded-xl bg-white p-3 dark:bg-stone-950/70">
      <div className="flex min-w-0 items-start gap-2">
        {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-meadow" />}
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-violet-950/45 dark:text-violet-100/45">{label}</p>
          <p className="mt-1 break-words font-black text-ink dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ControlSelect({ label, value, onChange, children }) {
  return (
    <label className="group grid gap-2 rounded-2xl border border-violet-100 bg-white p-3 shadow-sm transition focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-200/70 hover:-translate-y-0.5 hover:shadow-soft dark:border-violet-900/70 dark:bg-stone-950/80 dark:focus-within:ring-violet-900/60">
      <span className="text-xs font-black uppercase tracking-wide text-violet-950/45 transition group-focus-within:text-violet-700 dark:text-violet-100/45 dark:group-focus-within:text-violet-100">{label}</span>
      <select
        className="w-full rounded-xl border border-violet-100 bg-mist/70 px-3 py-2.5 text-sm font-black text-ink outline-none transition focus:border-violet-400 dark:border-violet-900/70 dark:bg-white/10 dark:text-white"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

function ContactsPanel({ contacts, filters, setFilters, updateContactStatus, deleteContact, exportCsv }) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: "createdAt", direction: "desc" });
  const pageSize = 8;
  const statusOptions = [["", "All statuses"], ["pending", "Pending"], ["in_progress", "In Progress"], ["resolved", "Resolved"]];
  const statusLabels = { pending: "Pending", in_progress: "In Progress", resolved: "Resolved" };
  const statusClasses = {
    pending: "bg-amber-50 text-amber-700",
    in_progress: "bg-blue-50 text-blue-700",
    resolved: "bg-green-50 text-green-700"
  };

  const filteredContacts = contacts.filter((contact) => {
    const q = filters.search.toLowerCase();
    const text = `${contact.name} ${contact.email} ${contact.phone || ""} ${contact.subject} ${contact.message}`.toLowerCase();
    return (!q || text.includes(q)) && (!filters.status || contact.status === filters.status) && matchesDate(contact.createdAt, filters);
  }).sort((a, b) => {
    const left = sort.key === "createdAt" ? new Date(a.createdAt).getTime() : String(a[sort.key] || "").localeCompare(String(b[sort.key] || ""));
    const right = sort.key === "createdAt" ? new Date(b.createdAt).getTime() : 0;
    const result = sort.key === "createdAt" ? left - right : left;
    return sort.direction === "asc" ? result : -result;
  });

  const totalPages = Math.max(1, Math.ceil(filteredContacts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleContacts = filteredContacts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const changeSort = (key) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc"
    }));
  };

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h2 className="text-lg font-black">Contact Inquiries</h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Manage website messages, statuses, and follow-ups from one place.</p>
        </div>
        <button className="btn-secondary" onClick={() => exportCsv("contact-inquiries.csv", filteredContacts.map((contact) => ({
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          subject: contact.subject,
          status: statusLabels[contact.status],
          submitted: new Date(contact.createdAt).toLocaleString()
        })))}>
          Export CSV
        </button>
      </div>
      <AdminFilters showDates filters={filters} setFilters={(updater) => {
        setPage(1);
        setFilters(updater);
      }} statusOptions={statusOptions} />
      <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
        {["createdAt", "name", "email", "status"].map((key) => (
          <button key={key} className="rounded-full border border-stone-200 px-3 py-1 capitalize hover:border-meadow hover:text-meadow dark:border-stone-700" onClick={() => changeSort(key)} type="button">
            Sort {key === "createdAt" ? "date" : key} {sort.key === key ? sort.direction : ""}
          </button>
        ))}
      </div>
      <div className="mt-5 space-y-3">
        {visibleContacts.length ? visibleContacts.map((contact) => (
          <article key={contact._id} className="rounded-lg bg-mist p-4 text-sm dark:bg-stone-800">
            <div className="grid gap-4 lg:grid-cols-[1fr_180px_44px] lg:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-black text-ink dark:text-white">{contact.subject}</h3>
                  <span className={`rounded-full px-2 py-1 text-xs font-bold ${statusClasses[contact.status]}`}>{statusLabels[contact.status]}</span>
                </div>
                <p className="mt-1 font-semibold text-stone-700 dark:text-stone-200">{contact.name} - {contact.email}</p>
                <p className="mt-1 text-stone-600 dark:text-stone-300">{contact.phone || "No phone"} · {contact.topic || "General"} · {new Date(contact.createdAt).toLocaleString()}</p>
                <p className="mt-3 leading-6 text-stone-700 dark:text-stone-200">{contact.message}</p>
              </div>
              <select className="field" value={contact.status} onChange={(event) => updateContactStatus(contact._id, event.target.value)}>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
              <button className="rounded-lg p-2 text-stone-500 hover:bg-white hover:text-red-600 dark:text-stone-400 dark:hover:bg-stone-900 dark:hover:text-red-400" onClick={() => deleteContact(contact._id)} aria-label={`Delete ${contact.subject}`} type="button">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </article>
        )) : <EmptyState title="No matching contact inquiries" message="Website contact form submissions will appear here." />}
      </div>
      <div className="mt-5 flex items-center justify-between gap-3 text-sm">
        <span className="text-stone-500 dark:text-stone-400">Page {currentPage} of {totalPages} · {filteredContacts.length} result(s)</span>
        <div className="flex gap-2">
          <button className="btn-secondary" type="button" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
          <button className="btn-secondary" type="button" disabled={currentPage >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</button>
        </div>
      </div>
    </section>
  );
}

function ActivityPanel({ logs, pagination, filters, setFilters, loadActivityLogs, exportCsv }) {
  const [loadingLogs, setLoadingLogs] = useState(false);
  const currentPage = pagination.page || 1;
  const totalPages = pagination.totalPages || 1;

  const updateLogFilters = async (updater) => {
    const nextFilters = typeof updater === "function" ? updater(filters) : updater;
    setFilters(nextFilters);
    setLoadingLogs(true);
    try {
      await loadActivityLogs({ page: 1, nextFilters });
    } finally {
      setLoadingLogs(false);
    }
  };

  const changePage = async (page) => {
    setLoadingLogs(true);
    try {
      await loadActivityLogs({ page });
    } finally {
      setLoadingLogs(false);
    }
  };

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h2 className="text-lg font-black">Activity logs</h2>
          <p className="mt-1 text-sm text-stone-500">Audit trail for admin actions like role changes, status updates, and item edits.</p>
        </div>
        <button className="btn-secondary" onClick={() => exportCsv("activity-logs-page.csv", logs.map((log) => ({ actor: log.actor?.name, action: log.action, message: log.message, date: log.createdAt })))}>
          Export CSV
        </button>
      </div>
      <AdminFilters showDates filters={filters} setFilters={updateLogFilters} />
      <div className="mt-4 space-y-3">
        {loadingLogs && <div className="rounded-lg bg-violet-50 p-3 text-sm font-bold text-violet-700 dark:bg-violet-950/40 dark:text-violet-100">Loading activity logs...</div>}
        {!loadingLogs && logs.length ? logs.map((log) => (
          <div key={log._id} className="rounded-lg bg-mist p-3 text-sm dark:bg-stone-800">
            <strong>{log.action}</strong>
            <p className="mt-1 text-stone-600 dark:text-stone-300">{log.message}</p>
            <p className="mt-1 text-xs text-stone-500">{log.actor?.name || "System"} - {new Date(log.createdAt).toLocaleString()}</p>
          </div>
        )) : !loadingLogs && <EmptyState title="No matching activity" message="Admin actions will appear here." />}
      </div>
      <div className="mt-5 flex flex-col justify-between gap-3 text-sm sm:flex-row sm:items-center">
        <span className="text-stone-500 dark:text-stone-400">
          Page {currentPage} of {totalPages} · {pagination.total || 0} result(s)
        </span>
        <div className="flex gap-2">
          <button className="btn-secondary" type="button" disabled={loadingLogs || currentPage <= 1} onClick={() => changePage(Math.max(1, currentPage - 1))}>Previous</button>
          <button className="btn-secondary" type="button" disabled={loadingLogs || currentPage >= totalPages} onClick={() => changePage(Math.min(totalPages, currentPage + 1))}>Next</button>
        </div>
      </div>
    </section>
  );
}

function UsersPanel({ users, pagination, filters, setFilters, loadUsers, updateUserKycStatus, deleteUserKyc, exportCsv }) {
  const [loadingUsers, setLoadingUsers] = useState(false);
  const currentPage = pagination.page || 1;
  const totalPages = pagination.totalPages || 1;

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingUsers(true);
      loadUsers({ page: 1, nextFilters: filters })
        .catch(() => {})
        .finally(() => setLoadingUsers(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [filters.search, filters.role, loadUsers]);

  const changePage = async (page) => {
    setLoadingUsers(true);
    try {
      await loadUsers({ page, nextFilters: filters });
    } finally {
      setLoadingUsers(false);
    }
  };

  const userStats = [
    { label: "Total Users", value: pagination.total || users.length, icon: Users, tone: "bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-100" },
    { label: "Admins", value: users.filter((user) => user.role === "admin").length, icon: ShieldCheck, tone: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-100" },
    { label: "KYC Pending", value: users.filter((user) => ["pending", "otp_pending"].includes(user.kyc?.status)).length, icon: CalendarCheck, tone: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-100" },
    { label: "KYC Approved", value: users.filter((user) => user.kyc?.status === "approved").length, icon: PackageCheck, tone: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/50 dark:text-fuchsia-100" }
  ];

  return (
    <section className="space-y-5">
      <div className="overflow-hidden rounded-[1.5rem] border border-violet-100 bg-gradient-to-br from-violet-950 via-violet-800 to-fuchsia-700 p-5 text-white shadow-soft dark:border-violet-900">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-violet-100">Admin Users</p>
            <h2 className="mt-1 text-2xl font-black">User management</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-violet-100/75">Review customer accounts, approve KYC, and inspect identity photos from one clean workspace.</p>
          </div>
          <button className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white px-4 py-3 text-sm font-black text-violet-800 shadow-soft transition hover:-translate-y-0.5 hover:shadow-glow" onClick={() => exportCsv("users-page.csv", users.map((user) => ({ name: user.name, email: user.email, phone: user.phone, role: user.role, kyc: user.kyc?.status || "not_submitted", lastLogin: user.lastLoginAt || "" })))}>
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {userStats.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm dark:border-violet-900/70 dark:bg-stone-950/70">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-violet-950/55 dark:text-violet-100/60">{label}</p>
                <p className="mt-1 text-3xl font-black text-ink dark:text-white">{value}</p>
              </div>
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
                <Icon className="h-5 w-5" />
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[1.35rem] border border-violet-100 bg-white/90 p-4 shadow-sm dark:border-violet-900/70 dark:bg-white/10">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <label className="flex items-center gap-2 rounded-2xl border border-violet-100 bg-mist/70 px-4 py-3 dark:border-violet-900/70 dark:bg-stone-950/50">
            <Users className="h-4 w-4 shrink-0 text-violet-500" />
            <input className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-violet-950/45 dark:placeholder:text-violet-100/45" placeholder="Search by name, email, or phone" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
          </label>
          <select className="field" value={filters.role} onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value }))}>
            <option value="">All roles</option>
            <option value="user">Users</option>
            <option value="owner">Owners</option>
            <option value="admin">Admins</option>
            <option value="delivery">Delivery</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.35rem] border border-violet-100 bg-white shadow-soft dark:border-violet-900/70 dark:bg-stone-950/70">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-violet-50 text-xs uppercase tracking-wide text-violet-950/65 dark:bg-violet-950/60 dark:text-violet-100/70">
              <tr>
                <th className="px-5 py-4 font-black">User</th>
                <th className="px-5 py-4 font-black">Contact</th>
                <th className="w-28 px-3 py-4 font-black">Role</th>
                <th className="px-5 py-4 font-black">KYC</th>
                <th className="px-5 py-4 font-black">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const kycStatus = user.kyc?.status || "not_submitted";
                const canReviewKyc = ["pending", "otp_pending"].includes(kycStatus);
                const initials = (user.name || user.email || "U").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <tr key={user._id} className="border-t border-violet-100 transition hover:bg-violet-50/60 dark:border-violet-900/70 dark:hover:bg-white/5">
                    <td className="px-5 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-700 to-fuchsia-500 text-sm font-black text-white shadow-sm">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="max-w-[220px] break-words font-black leading-snug text-ink dark:text-white">{user.name}</p>
                          <span className="mt-1 inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-black text-violet-700 dark:bg-violet-950/70 dark:text-violet-100">{user.role}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="grid gap-1 text-violet-950/65 dark:text-violet-100/70">
                        <span className="flex min-w-0 items-center gap-2"><Mail className="h-4 w-4 shrink-0 text-meadow" /><span className="max-w-[260px] break-words">{user.email}</span></span>
                        <span className="flex min-w-0 items-center gap-2"><Phone className="h-4 w-4 shrink-0 text-meadow" /><span className="max-w-[220px] break-words">{user.phone || "-"}</span></span>
                        <span className="mt-1 text-xs font-black uppercase tracking-wide text-violet-950/40 dark:text-violet-100/40">
                          Last login: {user.lastLoginAt ? `${formatDate(user.lastLoginAt)} ${formatTime(user.lastLoginAt)}` : "Never"}
                        </span>
                      </div>
                    </td>
                    <td className="w-28 px-3 py-4">
                      <span className="inline-flex w-28 justify-center rounded-xl border border-violet-100 bg-violet-50 px-2 py-2 text-xs font-black uppercase tracking-wide text-violet-700 dark:border-violet-900/70 dark:bg-violet-950/50 dark:text-violet-100">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="min-w-0">
                        <KycStatusPill status={kycStatus} />
                        {user.kyc?.documentType ? (
                          <p className="mt-2 max-w-[260px] break-words text-xs font-semibold text-violet-950/55 dark:text-violet-100/55">{user.kyc.legalName || user.name} · {user.kyc.documentType}</p>
                        ) : (
                          <p className="mt-2 text-xs font-semibold text-violet-950/45 dark:text-violet-100/45">No KYC submitted</p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {user.kyc?.documentFrontImage && (
                            <a href={uploadUrl(user.kyc.documentFrontImage)} target="_blank" rel="noreferrer" className="inline-flex rounded-lg bg-violet-700 px-2.5 py-1.5 text-xs font-black text-white transition hover:bg-violet-800">
                              Front
                            </a>
                          )}
                          {user.kyc?.documentBackImage && (
                            <a href={uploadUrl(user.kyc.documentBackImage)} target="_blank" rel="noreferrer" className="inline-flex rounded-lg bg-violet-700 px-2.5 py-1.5 text-xs font-black text-white transition hover:bg-violet-800">
                              Back
                            </a>
                          )}
                          {user.kyc?.selfieWithIdImage && (
                            <a href={uploadUrl(user.kyc.selfieWithIdImage)} target="_blank" rel="noreferrer" className="inline-flex rounded-lg bg-violet-700 px-2.5 py-1.5 text-xs font-black text-white transition hover:bg-violet-800">
                              Live photo
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex min-w-[230px] flex-wrap gap-2">
                        <button className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-xs font-black text-green-700 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-green-900/70 dark:bg-green-950/30 dark:text-green-200" type="button" disabled={!canReviewKyc} onClick={() => updateUserKycStatus(user._id, "approved")}>Approve</button>
                        <button className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-200" type="button" disabled={!canReviewKyc} onClick={() => updateUserKycStatus(user._id, "rejected")}>Reject</button>
                        <button className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-black text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-700 dark:bg-white/10 dark:text-stone-200 dark:hover:bg-stone-800" type="button" disabled={!user.kyc || kycStatus === "not_submitted"} onClick={() => deleteUserKyc(user)}>
                          <Trash2 className="mr-1 inline h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {loadingUsers && <div className="p-5 text-sm font-black text-violet-700 dark:text-violet-100">Loading users...</div>}
        {!loadingUsers && !users.length && <div className="p-5"><EmptyState title="No matching users" message="Registered accounts will appear here." /></div>}
        <div className="flex flex-col justify-between gap-3 border-t border-violet-100 p-4 text-sm font-bold text-violet-950/60 dark:border-violet-900/70 dark:text-violet-100/60 sm:flex-row sm:items-center">
          <span>Page {currentPage} of {totalPages} · {pagination.total || 0} user(s)</span>
          <div className="flex gap-2">
            <button className="btn-secondary" type="button" disabled={loadingUsers || currentPage <= 1} onClick={() => changePage(Math.max(1, currentPage - 1))}>Previous</button>
            <button className="btn-secondary" type="button" disabled={loadingUsers || currentPage >= totalPages} onClick={() => changePage(Math.min(totalPages, currentPage + 1))}>Next</button>
          </div>
        </div>
      </div>
    </section>
  );
}

function KycStatusPill({ status }) {
  const className = status === "approved"
    ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-200"
    : status === "rejected"
      ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200"
      : ["pending", "otp_pending"].includes(status)
        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
        : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-200";
  return <span className={`rounded-full px-3 py-1 text-xs font-black ${className}`}>{status.replace("_", " ")}</span>;
}

function AdminFilters({ filters, setFilters, typeOptions = [], statusOptions = [], roleOptions = [], showDates = false }) {
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-3">
      <input className="field" placeholder="Search" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
      {typeOptions.length > 0 && (
        <select className="field" value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}>
          <option value="">All types</option>
          {typeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
      )}
      {statusOptions.length > 0 && (
        <select className="field" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
          {statusOptions.map(([value, label]) => <option key={label} value={value}>{label}</option>)}
        </select>
      )}
      {roleOptions.length > 0 && (
        <select className="field" value={filters.role} onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value }))}>
          {roleOptions.map(([value, label]) => <option key={label} value={value}>{label}</option>)}
        </select>
      )}
      {showDates && (
        <>
          <input className="field" type="date" value={filters.dateFrom} onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))} />
          <input className="field" type="date" value={filters.dateTo} onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))} />
        </>
      )}
    </div>
  );
}

function matchesDate(value, filters) {
  if (!filters.dateFrom && !filters.dateTo) return true;
  const date = new Date(value);
  if (filters.dateFrom && date < new Date(filters.dateFrom)) return false;
  if (filters.dateTo) {
    const end = new Date(filters.dateTo);
    end.setHours(23, 59, 59, 999);
    if (date > end) return false;
  }
  return true;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function AdminTable({ title, headers, rows }) {
  return (
    <section className="overflow-hidden rounded-lg border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <div className="border-b border-stone-200 p-4 dark:border-stone-800">
        <h2 className="text-lg font-black">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-mist dark:bg-stone-800">
            <tr>{headers.map((header) => <th key={header} className="px-4 py-3 font-bold">{header}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-stone-100 dark:border-stone-800">
                {row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <div className="p-4"><EmptyState title={`No ${title.toLowerCase()} found`} message="Records will appear here once activity starts." /></div>}
      </div>
    </section>
  );
}
