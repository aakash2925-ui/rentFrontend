"use client";

import { useEffect, useRef, useState } from "react";

const googleScriptId = "google-identity-services";

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const existingScript = document.getElementById(googleScriptId);
    if (existingScript) {
      existingScript.addEventListener("load", resolve, { once: true });
      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = googleScriptId;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function GoogleLoginButton({ onSuccess, onError, disabled }) {
  const buttonRef = useRef(null);
  const [ready, setReady] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || disabled) return;

    let active = true;
    loadGoogleScript()
      .then(() => {
        if (!active || !buttonRef.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) onSuccess(response.credential);
            else onError("Google login did not return a credential");
          }
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          width: buttonRef.current.offsetWidth || 360
        });
        setReady(true);
      })
      .catch(() => onError("Unable to load Google login"));

    return () => {
      active = false;
    };
  }, [clientId, disabled, onError, onSuccess]);

  if (!clientId) {
    return (
      <div className="rounded-full border border-violet-200 bg-violet-50 px-4 py-3 text-center text-sm font-semibold text-violet-900 dark:border-violet-900/70 dark:bg-white/10 dark:text-violet-100">
        Google login needs a client ID.
      </div>
    );
  }

  return (
    <div className={disabled ? "pointer-events-none opacity-60" : ""}>
      <div ref={buttonRef} className="flex min-h-11 w-full justify-center" />
      {!ready && <div className="h-11 animate-pulse rounded-full border border-violet-200 bg-white/70 dark:border-violet-900/70 dark:bg-white/10" />}
    </div>
  );
}
