"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Boxes, ClipboardList, History, LayoutDashboard, Package, PackagePlus, Tags, Trash2, Users } from "lucide-react";
import api from "@/lib/api";
import { conditionOf, itemTypeOf, quantityOf } from "@/lib/itemFields";
import ErrorMessage from "@/components/common/ErrorMessage";
import EmptyState from "@/components/common/EmptyState";
import Loading from "@/components/common/Loading";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import RentalRequestCard from "@/components/dashboard/RentalRequestCard";
import { useToast } from "@/context/ToastContext";
import { statusLabel, statusOptions as rentalStatusOptions, statusTone } from "@/lib/rentalStatus";

const adminTasks = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "types", label: "Item Types", icon: Tags },
  { id: "items", label: "Items", icon: Boxes },
  { id: "inquiries", label: "Rental Requests", icon: ClipboardList },
  { id: "bookings", label: "Booking Records", icon: Package },
  { id: "activity", label: "Activity Logs", icon: History },
  { id: "users", label: "Users", icon: Users }
];

export default function AdminDashboardPage() {
  const [data, setData] = useState({ stats: null, users: [], properties: [], inquiries: [], bookings: [], logs: [], itemTypes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [typeName, setTypeName] = useState("");
  const [activeTask, setActiveTask] = useState("overview");
  const [filters, setFilters] = useState({ search: "", status: "", type: "", role: "", dateFrom: "", dateTo: "" });
  const { showToast } = useToast();

  useEffect(() => {
    Promise.all([
      api.get("/admin/stats"),
      api.get("/admin/users"),
      api.get("/admin/properties"),
      api.get("/admin/inquiries"),
      api.get("/bookings"),
      api.get("/admin/activity-logs"),
      api.get("/item-types")
    ])
      .then(([stats, users, properties, inquiries, bookings, logs, itemTypes]) => {
        setData({
          stats: stats.data.stats,
          users: users.data.users,
          properties: properties.data.properties,
          inquiries: inquiries.data.inquiries,
          bookings: bookings.data.bookings,
          logs: logs.data.logs,
          itemTypes: itemTypes.data.itemTypes
        });
      })
      .catch(() => setError("Unable to load admin dashboard"))
      .finally(() => setLoading(false));
  }, []);

  const addItemType = async (event) => {
    event.preventDefault();
    if (!typeName.trim()) return;

    try {
      const { data: response } = await api.post("/item-types", { name: typeName.trim() });
      setData((current) => ({ ...current, itemTypes: [...current.itemTypes, response.itemType].sort((a, b) => a.name.localeCompare(b.name)) }));
      setTypeName("");
      showToast("Item type added");
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to add item type", "error");
    }
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

  const deleteItem = async (id) => {
    if (!window.confirm("Delete this rental item? This action cannot be undone.")) return;

    try {
      await api.delete(`/properties/${id}`);
      showToast("Item deleted");
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to delete item", "error");
      return;
    }
    const [{ data: stats }, { data: properties }, { data: inquiries }] = await Promise.all([
      api.get("/admin/stats"),
      api.get("/admin/properties"),
      api.get("/admin/inquiries")
    ]);

    setData((current) => ({
      ...current,
      stats: stats.stats,
      properties: properties.properties,
      inquiries: inquiries.inquiries
    }));
  };

  const updateInquiryStatus = async (id, status) => {
    const { data: response } = await api.put(`/inquiries/${id}/status`, { status });
    const [{ data: properties }, { data: inquiries }] = await Promise.all([
      api.get("/admin/properties"),
      api.get("/admin/inquiries")
    ]);
    setData((current) => ({
      ...current,
      inquiries: inquiries.inquiries.map((item) => item._id === id ? { ...item, status: response.inquiry.status } : item),
      properties: properties.properties
    }));
    showToast("Rental request status updated");
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
      const { data: logs } = await api.get("/admin/activity-logs");
      setData((current) => ({
        ...current,
        bookings: current.bookings.map((booking) => booking._id === id ? { ...booking, paymentStatus: response.booking.paymentStatus } : booking),
        logs: logs.logs
      }));
      showToast("Payment status updated");
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to update payment status", "error");
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
          <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
            <aside className="rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900 lg:sticky lg:top-24 lg:self-start">
              <nav className="space-y-1">
                {adminTasks.map((task) => {
                  const Icon = task.icon;
                  const isActive = activeTask === task.id;

                  return (
                    <button
                      key={task.id}
                      onClick={() => setActiveTask(task.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${isActive ? "bg-meadow text-white" : "text-stone-700 hover:bg-mist hover:text-meadow dark:text-stone-200 dark:hover:bg-stone-800"}`}
                    >
                      <Icon className="h-4 w-4" />
                      {task.label}
                    </button>
                  );
                })}
              </nav>
              <Link href="/add-property" className="btn-primary mt-4 w-full">
                <PackagePlus className="h-4 w-4" />
                Add Item
              </Link>
            </aside>

            <section className="min-w-0">
              {activeTask === "overview" && <OverviewPanel stats={data.stats} inquiries={data.inquiries} properties={data.properties} bookings={data.bookings} />}
              {activeTask === "types" && (
                <ItemTypesPanel
                  itemTypes={data.itemTypes}
                  properties={data.properties}
                  typeName={typeName}
                  setTypeName={setTypeName}
                  addItemType={addItemType}
                  removeItemType={removeItemType}
                />
              )}
              {activeTask === "items" && <ItemsPanel items={data.properties} filters={filters} setFilters={setFilters} deleteItem={deleteItem} exportCsv={exportCsv} />}
              {activeTask === "inquiries" && <InquiriesPanel inquiries={data.inquiries} filters={filters} setFilters={setFilters} updateInquiryStatus={updateInquiryStatus} exportCsv={exportCsv} />}
              {activeTask === "bookings" && <BookingsPanel bookings={data.bookings} filters={filters} setFilters={setFilters} updatePaymentStatus={updatePaymentStatus} exportCsv={exportCsv} />}
              {activeTask === "activity" && <ActivityPanel logs={data.logs} filters={filters} setFilters={setFilters} exportCsv={exportCsv} />}
              {activeTask === "users" && <UsersPanel users={data.users} filters={filters} setFilters={setFilters} updateUserRole={updateUserRole} exportCsv={exportCsv} />}
            </section>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}

function OverviewPanel({ stats, inquiries, properties, bookings }) {
  const statusCounts = inquiries.reduce((counts, inquiry) => {
    counts[inquiry.status] = (counts[inquiry.status] || 0) + 1;
    return counts;
  }, {});
  const topCategories = properties.reduce((counts, item) => {
    const type = itemTypeOf(item) || "Other";
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {});
  const revenue = inquiries
    .filter((inquiry) => ["rented", "returned", "closed"].includes(inquiry.status))
    .reduce((total, inquiry) => total + Number(inquiry.totalAmount || 0), 0);
  const maxStatus = Math.max(1, ...Object.values(statusCounts));
  const maxCategory = Math.max(1, ...Object.values(topCategories));
  const lowStock = properties.filter((item) => quantityOf(item) > 0 && quantityOf(item) <= 2);

  return (
    <section className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(stats || {}).map(([key, value]) => (
          <div key={key} className="rounded-lg border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
            <p className="text-sm capitalize text-stone-500">{key}</p>
            <p className="mt-2 text-3xl font-black">{value}</p>
          </div>
        ))}
        <div className="rounded-lg border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <p className="text-sm text-stone-500">Revenue tracked</p>
          <p className="mt-2 text-3xl font-black">₹{revenue.toLocaleString()}</p>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Rental status">
          {rentalStatusOptions.map(([status, label]) => (
            <BarRow key={status} label={label} value={statusCounts[status] || 0} max={maxStatus} />
          ))}
        </ChartCard>
        <ChartCard title="Top categories">
          {Object.entries(topCategories).length ? Object.entries(topCategories).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([type, count]) => (
            <BarRow key={type} label={type} value={count} max={maxCategory} />
          )) : <EmptyState title="No category data" message="Publish items to see top category performance." />}
        </ChartCard>
      </div>
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

function ChartCard({ title, children }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
      <h2 className="text-lg font-black">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function BarRow({ label, value, max }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="capitalize text-stone-600 dark:text-stone-300">{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="h-2 rounded-full bg-mist dark:bg-stone-800">
        <div className="h-2 rounded-full bg-meadow" style={{ width: value ? `${Math.max(4, (value / max) * 100)}%` : "0%" }} />
      </div>
    </div>
  );
}

function ItemTypesPanel({ itemTypes, properties, typeName, setTypeName, addItemType, removeItemType }) {
  const countByType = properties.reduce((counts, item) => {
    const type = itemTypeOf(item);
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {});

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-lg font-black">Item types</h2>
          <p className="mt-1 text-sm text-stone-500">Add categories used in the item form and filters.</p>
        </div>
        <form onSubmit={addItemType} className="flex flex-col gap-2 sm:flex-row">
          <input className="field min-w-52" placeholder="Projector, speaker, camera" value={typeName} onChange={(e) => setTypeName(e.target.value)} />
          <button className="btn-primary">Add</button>
        </form>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {itemTypes.length ? itemTypes.map((item) => (
          <article key={item._id} className="rounded-lg border border-stone-200 bg-mist p-4 dark:border-stone-800 dark:bg-stone-800">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-meadow dark:bg-stone-900">
                  <Package className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-black">{item.name}</h3>
                  <p className="text-sm text-stone-500">{countByType[item.name] || 0} listed items</p>
                </div>
              </div>
              <button className="rounded-lg p-2 text-stone-500 hover:bg-white hover:text-red-600 dark:text-stone-400 dark:hover:bg-stone-900 dark:hover:text-red-400" onClick={() => removeItemType(item._id)} aria-label={`Remove ${item.name}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </article>
        )) : <EmptyState title="No item types yet" message="Add categories like Projector, Speaker, Camera, and Light before publishing inventory." />}
      </div>
    </section>
  );
}

function ItemsPanel({ items, filters, setFilters, deleteItem, exportCsv }) {
  const filteredItems = items.filter((item) => {
    const q = filters.search.toLowerCase();
    const matchesSearch = !q || item.title.toLowerCase().includes(q) || itemTypeOf(item).toLowerCase().includes(q) || item.city.toLowerCase().includes(q);
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
        <button className="btn-secondary" onClick={() => exportCsv("items.csv", filteredItems.map((item) => ({ title: item.title, type: itemTypeOf(item), city: item.city, quantity: quantityOf(item), rent: item.rent })))}>
          Export CSV
        </button>
        <Link href="/add-property" className="btn-primary">
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
              {["Item", "Type", "City", "Qty", "Daily rent", "Status", "Action"].map((header) => (
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
                <td className="px-4 py-3">{item.city}</td>
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
        {!filteredItems.length && <div className="p-4"><EmptyState title="No matching items" message="Adjust search or filters to find inventory." actionHref="/add-property" actionLabel="Add item" /></div>}
      </div>
    </section>
  );
}

function InquiriesPanel({ inquiries, filters, setFilters, updateInquiryStatus, exportCsv }) {
  const filteredInquiries = inquiries.filter((inquiry) => {
    const q = filters.search.toLowerCase();
    const text = `${inquiry.property?.title || ""} ${inquiry.user?.name || ""} ${inquiry.message || ""}`.toLowerCase();
    return (!q || text.includes(q)) && (!filters.status || inquiry.status === filters.status) && matchesDate(inquiry.createdAt, filters);
  });

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h2 className="text-lg font-black">Rental requests</h2>
          <p className="mt-1 text-sm text-stone-500">Manage the request lifecycle. Confirmed rental reserves inventory; returned or closed releases it.</p>
        </div>
        <button className="btn-secondary" onClick={() => exportCsv("rental-requests.csv", filteredInquiries.map((item) => ({ item: item.property?.title, user: item.user?.name, status: statusLabel(item.status), amount: item.totalAmount })))}>
          Export CSV
        </button>
      </div>
      <AdminFilters showDates filters={filters} setFilters={setFilters} statusOptions={[["", "All statuses"], ...rentalStatusOptions]} />
      <div className="mt-4 space-y-3">
        {filteredInquiries.length ? filteredInquiries.map((inquiry) => (
          <RentalRequestCard key={inquiry._id} request={inquiry} showUser showAvailable onStatusChange={updateInquiryStatus} />
        )) : <EmptyState title="No matching rental requests" message="Rental requests appear here when users submit date and quantity details." />}
      </div>
    </section>
  );
}

function BookingsPanel({ bookings, filters, setFilters, updatePaymentStatus, exportCsv }) {
  const filteredBookings = bookings.filter((booking) => {
    const q = filters.search.toLowerCase();
    const text = `${booking.property?.title || ""} ${booking.user?.name || ""} ${booking.paymentStatus || ""}`.toLowerCase();
    return (!q || text.includes(q)) && (!filters.status || booking.status === filters.status) && matchesDate(booking.createdAt, filters);
  });

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h2 className="text-lg font-black">Booking records</h2>
          <p className="mt-1 text-sm text-stone-500">Read-only records created from each rental request for dates, quantity, payment status, and totals.</p>
        </div>
        <button className="btn-secondary" onClick={() => exportCsv("booking-records.csv", filteredBookings.map((booking) => ({ item: booking.property?.title, user: booking.user?.name, status: statusLabel(booking.status), payment: booking.paymentStatus, amount: booking.totalAmount })))}>
          Export CSV
        </button>
      </div>
      <AdminFilters showDates filters={filters} setFilters={setFilters} statusOptions={[["", "All statuses"], ...rentalStatusOptions]} />
      <div className="mt-4 space-y-3">
        {filteredBookings.length ? filteredBookings.map((booking) => (
          <div key={booking._id} className="grid gap-3 rounded-lg bg-mist p-3 text-sm dark:bg-stone-800 md:grid-cols-[1fr_180px] md:items-center">
            <div>
              <strong>{booking.property?.title}</strong>
              <p className="text-stone-600 dark:text-stone-300">{booking.user?.name} - {new Date(booking.startDate).toLocaleDateString()} to {new Date(booking.endDate).toLocaleDateString()}</p>
              <p className="mt-1">₹{Number(booking.totalAmount || 0).toLocaleString()}</p>
              <p className="mt-1 text-stone-600 dark:text-stone-300">{booking.deliveryOption === "delivery" ? `Delivery: ${booking.deliveryAddress}, ${booking.deliveryDistanceKm} km, ₹${Number(booking.deliveryCharge || 0).toLocaleString()}` : "Pickup selected"}</p>
              <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-bold ${statusTone[booking.status]}`}>{statusLabel(booking.status)}</span>
            </div>
            <select className="field" value={booking.paymentStatus} onChange={(event) => updatePaymentStatus(booking._id, event.target.value)}>
              <option value="pending">payment pending</option>
              <option value="paid">paid</option>
              <option value="refunded">refunded</option>
            </select>
          </div>
        )) : <EmptyState title="No matching booking records" message="Booking records are created when rental requests are submitted." />}
      </div>
    </section>
  );
}

function ActivityPanel({ logs, filters, setFilters, exportCsv }) {
  const filteredLogs = logs.filter((log) => {
    const q = filters.search.toLowerCase();
    const text = `${log.actor?.name || ""} ${log.action} ${log.message}`.toLowerCase();
    return (!q || text.includes(q)) && matchesDate(log.createdAt, filters);
  });

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h2 className="text-lg font-black">Activity logs</h2>
          <p className="mt-1 text-sm text-stone-500">Audit trail for admin actions like role changes, status updates, and item edits.</p>
        </div>
        <button className="btn-secondary" onClick={() => exportCsv("activity-logs.csv", filteredLogs.map((log) => ({ actor: log.actor?.name, action: log.action, message: log.message, date: log.createdAt })))}>
          Export CSV
        </button>
      </div>
      <AdminFilters showDates filters={filters} setFilters={setFilters} />
      <div className="mt-4 space-y-3">
        {filteredLogs.length ? filteredLogs.map((log) => (
          <div key={log._id} className="rounded-lg bg-mist p-3 text-sm dark:bg-stone-800">
            <strong>{log.action}</strong>
            <p className="mt-1 text-stone-600 dark:text-stone-300">{log.message}</p>
            <p className="mt-1 text-xs text-stone-500">{log.actor?.name || "System"} - {new Date(log.createdAt).toLocaleString()}</p>
          </div>
        )) : <EmptyState title="No matching activity" message="Admin actions will appear here." />}
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
