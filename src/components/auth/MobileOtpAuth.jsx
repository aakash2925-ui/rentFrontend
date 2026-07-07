"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Pencil, Phone, RotateCcw, ShieldCheck } from "lucide-react";
import ErrorMessage from "@/components/common/ErrorMessage";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

const countries = [
  { code: "+91", label: "India" }
];

const cleanDigits = (value) => String(value || "").replace(/[^\d]/g, "");

export default function MobileOtpAuth({ onSuccess, title = "Login with Mobile Number" }) {
  const { sendMobileOtp, verifyMobileOtp } = useAuth();
  const { showToast } = useToast();
  const [countryCode, setCountryCode] = useState("+91");
  const [mobileNumber, setMobileNumber] = useState("");
  const [step, setStep] = useState("phone");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputsRef = useRef([]);

  const normalizedMobile = useMemo(() => `${countryCode}${cleanDigits(mobileNumber)}`, [countryCode, mobileNumber]);
  const otpCode = otp.join("");

  useEffect(() => {
    if (timer <= 0) return undefined;
    const interval = setInterval(() => setTimer((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const validateMobile = () => {
    const digits = cleanDigits(mobileNumber);
    if (countryCode === "+91" && !/^[6-9]\d{9}$/.test(digits)) return "Enter a valid 10-digit Indian mobile number";
    if (digits.length < 7 || digits.length > 14) return "Enter a valid mobile number";
    return "";
  };

  const sendOtp = async () => {
    const validation = validateMobile();
    if (validation) {
      setError(validation);
      showToast(validation, "error");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await sendMobileOtp({ countryCode, mobileNumber: cleanDigits(mobileNumber) });
      setStep("otp");
      setOtp(["", "", "", "", "", ""]);
      setTimer(Number(response.expiresIn || 60));
      showToast(response.message || "OTP sent successfully");
      setTimeout(() => inputsRef.current[0]?.focus(), 80);
    } catch (err) {
      const message = err.response?.data?.message || "Unable to send OTP";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otpCode)) {
      setError("Enter the 6-digit OTP");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const user = await verifyMobileOtp({ countryCode, mobileNumber: cleanDigits(mobileNumber), code: otpCode });
      showToast("Mobile number verified");
      onSuccess?.(user);
    } catch (err) {
      const message = err.response?.data?.message || "Invalid or expired OTP";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const updateOtp = (index, value) => {
    const digit = cleanDigits(value).slice(-1);
    setOtp((current) => {
      const next = [...current];
      next[index] = digit;
      return next;
    });
    if (digit && index < 5) inputsRef.current[index + 1]?.focus();
  };

  const handleOtpKey = (index, event) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) inputsRef.current[index - 1]?.focus();
  };

  return (
    <div
      className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4 dark:border-violet-900/70 dark:bg-white/5"
      onKeyDown={(event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        if (step === "phone") sendOtp();
        else verifyOtp();
      }}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-700 text-white">
          <Phone className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-black text-ink dark:text-white">{title}</h2>
          <p className="mt-1 text-sm font-semibold text-violet-950/60 dark:text-violet-100/60">Receive a secure OTP on your mobile number.</p>
        </div>
      </div>

      {error && <div className="mt-3"><ErrorMessage message={error} /></div>}

      {step === "phone" ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-[130px_1fr]">
          <select className="field disabled:cursor-not-allowed disabled:opacity-80" value={countryCode} disabled onChange={(event) => setCountryCode(event.target.value)}>
            {countries.map((country) => <option key={country.code} value={country.code}>{country.code} {country.label}</option>)}
          </select>
          <input
            className="field"
            inputMode="numeric"
            placeholder="Mobile number"
            value={mobileNumber}
            onChange={(event) => setMobileNumber(cleanDigits(event.target.value))}
            maxLength={countryCode === "+91" ? 10 : 14}
          />
          <button className="btn-primary sm:col-span-2" type="button" disabled={loading} onClick={sendOtp}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {loading ? "Sending OTP..." : "Send OTP"}
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-violet-950 dark:bg-stone-950/70 dark:text-violet-100">
            <span>OTP sent to {normalizedMobile}</span>
            <button className="inline-flex items-center gap-1 text-violet-700 dark:text-violet-200" type="button" onClick={() => { setStep("phone"); setError(""); }}>
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          </div>
          <div className="grid grid-cols-6 gap-2">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(node) => { inputsRef.current[index] = node; }}
                className="h-12 rounded-xl border border-violet-200 bg-white text-center text-lg font-black text-ink outline-none transition focus:border-violet-600 focus:ring-2 focus:ring-violet-200 dark:border-violet-900 dark:bg-stone-950 dark:text-white"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(event) => updateOtp(index, event.target.value)}
                onKeyDown={(event) => handleOtpKey(index, event)}
              />
            ))}
          </div>
          <button className="btn-primary w-full" type="button" disabled={loading || otpCode.length !== 6} onClick={verifyOtp}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
          <button className="btn-secondary w-full" type="button" disabled={loading || timer > 0} onClick={sendOtp}>
            <RotateCcw className="h-4 w-4" />
            {timer > 0 ? `Resend OTP in ${timer}s` : "Resend OTP"}
          </button>
        </div>
      )}
    </div>
  );
}
