"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const visitorKey = "zasoota_visitor_id";

const getVisitorId = () => {
  try {
    const existing = localStorage.getItem(visitorKey);
    if (existing) return existing;
    const id = window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(visitorKey, id);
    return id;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
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
    const payload = {
      visitorId: getVisitorId(),
      path: `${pathname}${query ? `?${query}` : ""}`,
      pageTitle: document.title,
      referrer: document.referrer
    };

    fetch(apiUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(() => {});
  }, [pathname]);

  return null;
}
