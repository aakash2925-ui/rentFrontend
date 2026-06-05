"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ErrorMessage from "@/components/common/ErrorMessage";
import { useToast } from "@/context/ToastContext";

export default function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
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
      showToast("Logged in successfully");
      router.push(user.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      const message = err.response?.data?.message || "Unable to login";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-md rounded-lg border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <h1 className="text-2xl font-black text-ink dark:text-stone-50">Login</h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Access your rental dashboard.</p>
      <div className="mt-5 space-y-3">
        {error && <ErrorMessage message={error} />}
        <input className="field" type="email" placeholder="Email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="field" type="password" placeholder="Password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button className="btn-primary w-full" disabled={loading}>{loading ? "Signing in..." : "Login"}</button>
      </div>
      <p className="mt-4 text-center text-sm text-stone-500">New here? <Link className="font-bold text-meadow" href="/register">Create an account</Link></p>
    </form>
  );
}
