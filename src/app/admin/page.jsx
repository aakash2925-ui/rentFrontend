"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BarChart3, Boxes, CalendarCheck, History, ImagePlus, LayoutDashboard, Mail, Menu, Package, PackageCheck, PackagePlus, Pencil, Save, Tags, TicketPercent, Trash2, Users, X } from "lucide-react";
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
import { statusTone } from "@/lib/rentalStatus";

const adminTasks = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "types", label: "Item Types", icon: Tags },
  { id: "items", label: "Items", icon: Boxes },
  { id: "vouchers", label: "Vouchers", icon: TicketPercent },
  { id: "bookings", label: "Booking Requests", icon: Package },
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

const bookingStatusLabel = (status) => ({
  pending: "Pending",
  contacted: "Contacted",
  rented: "Confirmed",
  returned: "Completed",
  closed: "Cancelled"
}[status] || status);

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

export default function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [data, setData] = useState({ stats: null, users: [], properties: [], bookings: [], contacts: [], logs: [], itemTypes: [], vouchers: [] });
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
  const [voucherForm, setVoucherForm] = useState(emptyVoucherForm);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    Promise.all([
      api.get("/admin/stats"),
      api.get("/admin/users"),
      api.get("/admin/properties"),
      api.get("/bookings"),
      api.get("/contact?limit=50"),
      api.get("/admin/activity-logs", { params: { page: 1, limit: 10 } }),
      api.get("/item-types"),
      api.get("/vouchers")
    ])
      .then(([stats, users, properties, bookings, contacts, logs, itemTypes, vouchers]) => {
        setData({
          stats: stats.data.stats,
          users: users.data.users,
          properties: properties.data.properties,
          bookings: bookings.data.bookings,
          contacts: contacts.data.contacts,
          logs: logs.data.logs,
          itemTypes: itemTypes.data.itemTypes,
          vouchers: vouchers.data.vouchers
        });
        setLogPagination(logs.data.pagination || { page: 1, limit: 10, total: logs.data.logs.length, totalPages: 1 });
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

  const updateBookingStatus = async (id, status) => {
    try {
      const { data: response } = await api.put(`/bookings/${id}/status`, { status });
      const [{ data: properties }] = await Promise.all([
        api.get("/admin/properties"),
        loadActivityLogs()
      ]);
      setData((current) => ({
        ...current,
        bookings: current.bookings.map((booking) => booking._id === id ? { ...booking, status: response.booking.status, inventoryReserved: response.booking.inventoryReserved } : booking),
        properties: properties.properties
      }));
      showToast("Booking request status updated");
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to update booking request", "error");
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

  const updateUserRole = async (id, role) => {
    try {
      const { data: response } = await api.put(`/admin/users/${id}/role`, { role });
      setData((current) => ({
        ...current,
        users: current.users.map((user) => user._id === id ? response.user : user)
      }));
      showToast("User role updated");
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to update user role", "error");
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
              {activeTask === "bookings" && <BookingsPanel bookings={data.bookings} filters={filters} setFilters={setFilters} updateBookingStatus={updateBookingStatus} updatePaymentStatus={updatePaymentStatus} exportCsv={exportCsv} />}
              {activeTask === "contacts" && <ContactsPanel contacts={data.contacts} filters={filters} setFilters={setFilters} updateContactStatus={updateContactStatus} deleteContact={deleteContact} exportCsv={exportCsv} />}
              {activeTask === "activity" && <ActivityPanel logs={data.logs} pagination={logPagination} filters={filters} setFilters={setFilters} loadActivityLogs={loadActivityLogs} exportCsv={exportCsv} />}
              {activeTask === "users" && <UsersPanel users={data.users} filters={filters} setFilters={setFilters} updateUserRole={updateUserRole} exportCsv={exportCsv} />}
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

function BookingsPanel({ bookings, filters, setFilters, updateBookingStatus, updatePaymentStatus, exportCsv }) {
  const filteredBookings = bookings.filter((booking) => {
    const q = filters.search.toLowerCase();
    const text = `${booking._id || ""} ${booking.property?.title || ""} ${booking.user?.name || ""} ${booking.user?.email || ""} ${booking.paymentStatus || ""}`.toLowerCase();
    return (!q || text.includes(q)) && (!filters.status || booking.status === filters.status) && matchesDate(booking.createdAt, filters);
  });

  return (
    <section className="rounded-2xl border border-violet-100 bg-white p-5 dark:border-violet-900/70 dark:bg-stone-950/70">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h2 className="text-xl font-black">Booking Requests</h2>
          <p className="mt-1 text-sm text-stone-500">Approve, reject, complete, and review booking requests with payment details.</p>
        </div>
        <button className="btn-secondary" onClick={() => exportCsv("booking-requests.csv", filteredBookings.map((booking) => ({ id: booking._id, item: booking.property?.title, user: booking.user?.name, status: bookingStatusLabel(booking.status), payment: booking.paymentStatus, amount: booking.finalAmount || booking.totalAmount })))}>
          Export CSV
        </button>
      </div>
      <AdminFilters showDates filters={filters} setFilters={setFilters} statusOptions={[["", "All statuses"], ...bookingStatusOptions]} />
      <div className="mt-4 grid gap-3">
        {filteredBookings.length ? filteredBookings.map((booking) => (
          <div key={booking._id} className="rounded-2xl border border-violet-100 bg-mist/80 p-4 text-sm dark:border-violet-900/70 dark:bg-white/10">
            <div>
              <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                <div>
                  <strong className="text-base text-ink dark:text-white">{booking.property?.title || "Rental item"}</strong>
                  <p className="mt-1 text-stone-600 dark:text-stone-300">{booking.user?.name || "Customer"} · {booking.user?.email || "No email"}</p>
                  <p className="mt-1 text-stone-600 dark:text-stone-300">Booking ID: {booking._id}</p>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${statusTone[booking.status] || "bg-violet-50 text-violet-700"}`}>{bookingStatusLabel(booking.status)}</span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-violet-700 dark:bg-stone-950 dark:text-violet-100">payment {booking.paymentStatus}</span>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-6">
                <InfoTile label="Dates" value={`${new Date(booking.startDate).toLocaleDateString()} - ${new Date(booking.endDate).toLocaleDateString()}`} />
                <InfoTile label="Amount" value={`₹${Number(booking.finalAmount || booking.totalAmount || 0).toLocaleString()}`} />
                <InfoTile label="Method" value={booking.paymentMethod === "razorpay" ? "Razorpay" : "Cash on Delivery"} />
                <InfoTile label="Delivery date" value={booking.deliveryDate ? new Date(booking.deliveryDate).toLocaleDateString() : "-"} />
                <InfoTile label="Delivery time" value={booking.deliveryEta || (booking.deliverySpeed === "fast" ? "Within 2 hours" : "Within 24 hours")} />
                <InfoTile label="Quantity" value={`${booking.quantity || 1} item(s)`} />
              </div>
              <p className="mt-3 text-stone-600 dark:text-stone-300">Delivery: {booking.deliveryAddress || "Address shared"}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-center">
                <select className="field" value={booking.status} onChange={(event) => updateBookingStatus(booking._id, event.target.value)}>
                  {bookingStatusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <select className="field" value={booking.paymentStatus} onChange={(event) => updatePaymentStatus(booking._id, event.target.value)}>
                  <option value="pending">payment pending</option>
                  <option value="paid">paid</option>
                  <option value="failed">failed</option>
                  <option value="cancelled">cancelled</option>
                  <option value="refunded">refunded</option>
                </select>
                <button className="btn-primary" type="button" onClick={() => updateBookingStatus(booking._id, "rented")}>Approve</button>
                <button className="btn-secondary" type="button" onClick={() => updateBookingStatus(booking._id, "closed")}>Reject</button>
              </div>
            </div>
          </div>
        )) : <EmptyState title="No matching booking requests" message="Booking requests are created when users complete the rental checkout." />}
      </div>
    </section>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-xl bg-white p-3 dark:bg-stone-950/70">
      <p className="text-xs font-black uppercase tracking-wide text-violet-950/45 dark:text-violet-100/45">{label}</p>
      <p className="mt-1 font-black text-ink dark:text-white">{value}</p>
    </div>
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

function UsersPanel({ users, filters, setFilters, updateUserRole, exportCsv }) {
  const filteredUsers = users.filter((user) => {
    const q = filters.search.toLowerCase();
    return (!q || `${user.name} ${user.email} ${user.phone || ""}`.toLowerCase().includes(q)) && (!filters.role || user.role === filters.role);
  });

  return (
    <section className="overflow-hidden rounded-lg border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <div className="border-b border-stone-200 p-4 dark:border-stone-800">
        <h2 className="text-lg font-black">Users</h2>
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <p className="mt-1 text-sm text-stone-500">Only admins can assign user, owner, or admin roles.</p>
          <button className="btn-secondary" onClick={() => exportCsv("users.csv", filteredUsers.map((user) => ({ name: user.name, email: user.email, phone: user.phone, role: user.role })))}>
            Export CSV
          </button>
        </div>
      </div>
      <AdminFilters filters={filters} setFilters={setFilters} roleOptions={[["", "All roles"], ["user", "user"], ["owner", "owner"], ["admin", "admin"]]} />
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-mist dark:bg-stone-800">
            <tr>
              {["Name", "Email", "Phone", "Role"].map((header) => <th key={header} className="px-4 py-3 font-bold">{header}</th>)}
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user._id} className="border-t border-stone-100 dark:border-stone-800">
                <td className="px-4 py-3 font-semibold">{user.name}</td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">{user.phone || "-"}</td>
                <td className="px-4 py-3">
                  <select className="field max-w-40" value={user.role} onChange={(event) => updateUserRole(user._id, event.target.value)}>
                    <option value="user">user</option>
                    <option value="owner">owner</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filteredUsers.length && <div className="p-4"><EmptyState title="No matching users" message="Registered accounts will appear here." /></div>}
      </div>
    </section>
  );
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
