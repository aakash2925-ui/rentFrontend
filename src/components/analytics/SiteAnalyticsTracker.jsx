"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const visitorKey = "zasoota_visitor_id";

const getVisitorId = () => {
  const existing = localStorage.getItem(visitorKey);
  if (existing) return existing;
  const id = crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(visitorKey, id);
  return id;
};

const apiUrl = () => {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  return `${base.replace(/\/$/, "")}/analytics/visit`;
};

export default function SiteAnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || pathname.startsWith("/delivery")) return;

    const query = window.location.search.replace(/^\?/, "");
    const payload = JSON.stringify({
      visitorId: getVisitorId(),
      path: `${pathname}${query ? `?${query}` : ""}`,
      pageTitle: document.title,
      referrer: document.referrer
    });

    const url = apiUrl();
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(url, blob);
      return;
    }

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true
    }).catch(() => {});
  }, [pathname]);

  return null;
}
