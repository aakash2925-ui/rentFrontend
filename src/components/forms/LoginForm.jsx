"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import ErrorMessage from "@/components/common/ErrorMessage";
import { useToast } from "@/context/ToastContext";
import GoogleLoginButton from "@/components/auth/GoogleLoginButton";
import MobileOtpAuth from "@/components/auth/MobileOtpAuth";
import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const { googleLogin } = useAuth();
  const { showToast } = useToast();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const redirectAfterAuth = useCallback(() => {
    const redirect = new URLSearchParams(window.location.search).get("redirect");
    router.push(sessionStorage.getItem("open_request_item") === "1" ? "/?requestItem=1" : redirect?.startsWith("/") ? redirect : "/");
  }, [router]);

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
      redirectAfterAuth();
    } catch (err) {
      const message = err.response?.data?.message || "Unable to login with Google";
      handleGoogleError(message);
    } finally {
      setLoading(false);
    }
  }, [googleLogin, handleGoogleError, redirectAfterAuth, showToast]);

  const handleMobileSuccess = useCallback(() => {
    redirectAfterAuth();
  }, [redirectAfterAuth]);

  return (
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/88 shadow-glow backdrop-blur-xl dark:border-violet-900/70 dark:bg-[#120821]/92 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="relative hidden min-h-[560px] overflow-hidden bg-gradient-to-br from-violet-950 via-violet-800 to-fuchsia-700 p-8 text-white lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(255,255,255,0.28),transparent_26%),radial-gradient(circle_at_82%_75%,rgba(244,114,182,0.24),transparent_30%)]" />
        <div className="relative flex h-full flex-col justify-between">
          <div>
            <img src="/zasoota-logo.svg" alt="Zasoota logo" className="h-16 w-48 rounded-2xl bg-white/95 object-cover p-1 shadow-soft" />
            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-4 py-2 text-xs font-black uppercase tracking-wide backdrop-blur">
              <Sparkles className="h-4 w-4" />
              Rent. Use. Return.
            </div>
            <h2 className="mt-5 text-4xl font-black leading-tight">Access your rentals in a few seconds.</h2>
            <p className="mt-4 max-w-sm text-sm leading-7 text-violet-50/82">Sign in securely to manage bookings, saved addresses, wishlist items, payments, and rental updates.</p>
          </div>
          <div className="grid gap-3">
            {["Secure OTP login", "Google account access", "Order and KYC updates"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/12 px-4 py-3 text-sm font-black backdrop-blur">
                <CheckCircle2 className="h-5 w-5 text-green-200" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="p-5 sm:p-8 lg:p-10">
        <div className="mx-auto max-w-md">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-meadow">Welcome back</p>
              <h1 className="mt-2 text-3xl font-black text-ink dark:text-stone-50">Login to Zasoota</h1>
            </div>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700 shadow-soft dark:bg-violet-950/70 dark:text-violet-100">
              <ShieldCheck className="h-6 w-6" />
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-stone-500 dark:text-stone-400">Use Google or your verified mobile number to continue.</p>

          <div className="mt-7 space-y-4">
            {error && <ErrorMessage message={error} />}
            <div className="rounded-2xl border border-violet-100 bg-mist/70 p-3 shadow-sm dark:border-violet-900/70 dark:bg-white/10">
              <GoogleLoginButton onSuccess={handleGoogleSuccess} onError={handleGoogleError} disabled={loading} />
            </div>
            {/* <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-soft dark:border-violet-900/70 dark:bg-stone-950/45">
              <MobileOtpAuth onSuccess={handleMobileSuccess} title="Login with Mobile Number" />
            </div> */}
          </div>

        </div>
      </section>
    </div>
  );
}
