"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Truck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import ErrorMessage from "@/components/common/ErrorMessage";
import { useToast } from "@/context/ToastContext";

export default function RegisterForm() {
  const router = useRouter();
  const { login, logout } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login(form);
      if (user?.role !== "delivery") {
        logout();
        const message = "This login is only for delivery partners.";
        setError(message);
        showToast(message, "error");
        return;
      }
      showToast("Delivery login successful");
      router.push("/delivery");
    } catch (err) {
      const message = err.response?.data?.message || "Unable to login";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-md rounded-[1.5rem] border border-violet-100 bg-white p-6 shadow-soft dark:border-violet-900/70 dark:bg-stone-900">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950/70 dark:text-violet-100">
        <Truck className="h-7 w-7" />
      </div>
      <h1 className="mt-4 text-center text-2xl font-black text-ink dark:text-stone-50">Delivery Login</h1>
      <p className="mt-1 text-center text-sm text-stone-500 dark:text-stone-400">Access assigned pickups, deliveries, and return orders.</p>
      <div className="mt-5 grid gap-3">
        {error && <ErrorMessage message={error} />}
        <input
          className="field"
          type="email"
          placeholder="Email"
          required
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
        />
        <input
          className="field"
          type="password"
          placeholder="Password"
          required
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
        />
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "Signing in..." : "Login as Delivery Partner"}
        </button>
      </div>
    </form>
  );
}
