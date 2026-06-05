"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ErrorMessage from "@/components/common/ErrorMessage";
import Loading from "@/components/common/Loading";
import EmptyState from "@/components/common/EmptyState";
import ProtectedRoute from "@/components/common/ProtectedRoute";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import RentalRequestCard from "@/components/dashboard/RentalRequestCard";
import PropertyCard from "@/components/properties/PropertyCard";
import { useToast } from "@/context/ToastContext";
import { statusLabel, statusTone } from "@/lib/rentalStatus";

export default function UserDashboardPage() {
  const { user } = useAuth();
  const [properties, setProperties] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [ownerInquiries, setOwnerInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    if (!user) return;
    const calls = [api.get("/inquiries/my-inquiries"), api.get("/bookings/my-bookings"), api.get("/wishlist")];
    if (["owner", "admin"].includes(user.role)) {
      calls.push(api.get("/properties/my-properties"));
      calls.push(api.get("/inquiries/owner-inquiries"));
    }

    Promise.all(calls)
      .then((responses) => {
        setInquiries(responses[0].data.inquiries);
        setBookings(responses[1].data.bookings);
        setWishlist(responses[2].data.wishlist);
        if (responses[3]) setProperties(responses[3].data.properties);
        if (responses[4]) setOwnerInquiries(responses[4].data.inquiries);
      })
      .catch(() => setError("Unable to load dashboard data"))
      .finally(() => setLoading(false));
  }, [user]);

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/inquiries/${id}/status`, { status });
      setOwnerInquiries((items) => items.map((item) => item._id === id ? { ...item, status } : item));
      showToast("Rental request status updated");
    } catch (err) {
      showToast(err.response?.data?.message || "Unable to update rental request", "error");
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout
        title={`Welcome, ${user?.name || "there"}`}
        actions={user?.role === "admin" ? <Link key="add" href="/add-property" className="btn-primary">Add item</Link> : null}
      >
        {loading ? <Loading /> : error ? <ErrorMessage message={error} /> : (
          <div className="space-y-8">
            {["owner", "admin"].includes(user?.role) && (
              <section>
                <h2 className="mb-4 text-xl font-black">My rental items</h2>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {properties.length ? properties.map((property) => <PropertyCard key={property._id} property={property} />) : <EmptyState title="No rental items listed" message="Admin-published inventory appears here." />}
                </div>
              </section>
            )}
            <section className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-lg border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
                <h2 className="text-xl font-black">Wishlist</h2>
                <div className="mt-4 grid gap-3">
                  {wishlist.length ? wishlist.slice(0, 4).map((item) => (
                    <Link key={item._id} href={`/properties/${item.property?._id}`} className="rounded-lg bg-mist p-3 text-sm font-semibold dark:bg-stone-800">
                      {item.property?.title}
                    </Link>
                  )) : <EmptyState title="No saved items" message="Tap the heart on item cards to save gear for later." actionHref="/properties" actionLabel="Browse items" />}
                </div>
              </div>
              <div className="rounded-lg border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
                <h2 className="text-xl font-black">Booking history</h2>
                <p className="mt-1 text-sm text-stone-500">A booking record is created from each rental request so you can track dates, quantity, and payment status.</p>
                <div className="mt-4 space-y-3">
                  {bookings.length ? bookings.map((booking) => (
                    <div key={booking._id} className="rounded-lg bg-mist p-3 text-sm dark:bg-stone-800">
                      <strong>{booking.property?.title}</strong>
                      <p className="text-stone-600 dark:text-stone-300">{new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}</p>
                      <p className="mt-1 text-stone-600 dark:text-stone-300">{booking.quantity} item(s), ₹{Number(booking.totalAmount).toLocaleString()}, payment {booking.paymentStatus}</p>
                      <p className="mt-1 text-stone-600 dark:text-stone-300">{booking.deliveryOption === "delivery" ? `Delivery: ${booking.deliveryDistanceKm} km, ₹${Number(booking.deliveryCharge || 0).toLocaleString()}` : "Pickup selected"}</p>
                      <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-bold ${statusTone[booking.status]}`}>{statusLabel(booking.status)}</span>
                    </div>
                  )) : <EmptyState title="No booking history yet" message="Send a rental request to create a trackable booking record." actionHref="/properties" actionLabel="Browse items" />}
                </div>
              </div>
              <div className="rounded-lg border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
                <h2 className="text-xl font-black">My rental requests</h2>
                <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">These are requests waiting for review, contact, confirmation, return, or closure.</p>
                <div className="mt-4 space-y-3">
                  {inquiries.length ? inquiries.map((item) => <RentalRequestCard key={item._id} request={item} />) : <EmptyState title="No rental requests" message="Your rental requests will appear here after you choose dates and submit an item request." actionHref="/properties" actionLabel="Browse items" />}
                </div>
              </div>
              {["owner", "admin"].includes(user?.role) && (
                <div className="rounded-lg border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
                  <h2 className="text-xl font-black">Requests to manage</h2>
                  <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Move requests through the lifecycle. Choosing Confirmed rental reserves inventory.</p>
                  <div className="mt-4 space-y-3">
                    {ownerInquiries.length ? ownerInquiries.map((item) => <RentalRequestCard key={item._id} request={item} showUser showAvailable onStatusChange={updateStatus} />) : <EmptyState title="No requests to manage" message="Requests for listed inventory will appear here." />}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
