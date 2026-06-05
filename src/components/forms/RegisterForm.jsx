"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ErrorMessage from "@/components/common/ErrorMessage";
import { useToast } from "@/context/ToastContext";

export default function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      showToast("Password must be at least 6 characters", "error");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const user = await register(form);
      showToast("Account created");
      router.push(user.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      const message = err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || "Unable to register";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-lg rounded-lg border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <h1 className="text-2xl font-black text-ink dark:text-stone-50">Register</h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Create a user account. Admin can update roles later.</p>
      <div className="mt-5 grid gap-3">
        {error && <ErrorMessage message={error} />}
        <input className="field" placeholder="Full name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="field" type="email" placeholder="Email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="field" type="password" placeholder="Password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <input className="field" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <button className="btn-primary w-full" disabled={loading}>{loading ? "Creating account..." : "Register"}</button>
      </div>
      <p className="mt-4 text-center text-sm text-stone-500">Already registered? <Link className="font-bold text-meadow" href="/login">Login</Link></p>
    </form>
  );
}
