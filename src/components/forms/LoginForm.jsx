"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ErrorMessage from "@/components/common/ErrorMessage";
import { useToast } from "@/context/ToastContext";
import GoogleLoginButton from "@/components/auth/GoogleLoginButton";

export default function LoginForm() {
  const router = useRouter();
  const { login, googleLogin } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(form);
      showToast("Logged in successfully");
      router.push(sessionStorage.getItem("open_request_item") === "1" ? "/?requestItem=1" : "/");
    } catch (err) {
      const message = err.response?.data?.message || "Unable to login";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = useCallback((message) => {
    setError(message);
    showToast(message, "error");
  }, [showToast]);

  const handleGoogleSuccess = useCallback(async (credential) => {
    setError("");
    setLoading(true);
    try {
      await googleLogin(credential);
      showToast("Logged in with Google");
      router.push(sessionStorage.getItem("open_request_item") === "1" ? "/?requestItem=1" : "/");
    } catch (err) {
      const message = err.response?.data?.message || "Unable to login with Google";
      handleGoogleError(message);
    } finally {
      setLoading(false);
    }
  }, [googleLogin, handleGoogleError, router, showToast]);

  return (
    <form onSubmit={submit} className="mx-auto max-w-md rounded-lg border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <h1 className="text-2xl font-black text-ink dark:text-stone-50">Login</h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Access your rental dashboard.</p>
      <div className="mt-5 space-y-3">
        {error && <ErrorMessage message={error} />}
        <GoogleLoginButton onSuccess={handleGoogleSuccess} onError={handleGoogleError} disabled={loading} />
        <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-wide text-violet-950/45 dark:text-violet-100/45">
          <span className="h-px flex-1 bg-violet-100 dark:bg-violet-900/70" />
          or use email
          <span className="h-px flex-1 bg-violet-100 dark:bg-violet-900/70" />
        </div>
        <input className="field" type="email" placeholder="Email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="field" type="password" placeholder="Password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <button className="btn-primary w-full" disabled={loading}>{loading ? "Signing in..." : "Login"}</button>
      </div>
    </form>
  );
}
