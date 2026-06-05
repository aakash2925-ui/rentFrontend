"use client";

import { Star } from "lucide-react";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import EmptyState from "@/components/common/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

export default function ReviewSection({ propertyId }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [reviews, setReviews] = useState([]);
  const [average, setAverage] = useState(0);
  const [form, setForm] = useState({ rating: 5, comment: "" });

  const loadReviews = () => {
    api.get(`/reviews/property/${propertyId}`)
      .then(({ data }) => {
        setReviews(data.reviews);
        setAverage(data.average);
      })
      .catch(() => setReviews([]));
  };

  useEffect(() => {
    loadReviews();
  }, [propertyId]);

  const submit = async (event) => {
    event.preventDefault();
    if (!user) return showToast("Login to add a review", "error");
    try {
      await api.post("/reviews", { property: propertyId, ...form });
      setForm({ rating: 5, comment: "" });
      showToast("Review added");
      loadReviews();
    } catch (error) {
      showToast(error.response?.data?.message || "Unable to add review", "error");
    }
  };

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black">Reviews</h2>
          <p className="mt-1 text-sm text-stone-500">{reviews.length} review(s), {average.toFixed(1)} average</p>
        </div>
        <div className="flex text-amber-500">
          {[1, 2, 3, 4, 5].map((item) => <Star key={item} className={`h-4 w-4 ${item <= Math.round(average) ? "fill-current" : ""}`} />)}
        </div>
      </div>

      {user ? (
        <form onSubmit={submit} className="mt-4 grid gap-3 rounded-lg bg-mist p-3 dark:bg-stone-800">
          <select className="field" value={form.rating} onChange={(event) => setForm({ ...form, rating: Number(event.target.value) })}>
            {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}
          </select>
          <textarea className="field min-h-24" placeholder="Share your rental experience" required value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} />
          <button className="btn-primary">Submit or update review</button>
        </form>
      ) : <p className="mt-4 rounded-lg bg-mist p-3 text-sm text-stone-600 dark:bg-stone-800 dark:text-stone-300">Login to add your review.</p>}

      <div className="mt-4 space-y-3">
        {reviews.length ? reviews.map((review) => (
          <article key={review._id} className="rounded-lg bg-mist p-3 text-sm dark:bg-stone-800">
            <div className="flex justify-between">
              <strong>{review.user?.name || "User"}</strong>
              <span className="text-amber-600">{review.rating}/5</span>
            </div>
            <p className="mt-2 text-stone-600 dark:text-stone-300">{review.comment}</p>
          </article>
        )) : <EmptyState title="No reviews yet" message="Logged-in users can add the first review for this item." />}
      </div>
    </section>
  );
}
