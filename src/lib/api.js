"use client";

import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("rent_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const uploadUrl = (path) => {
  if (!path) return "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80";
  if (path.startsWith("http")) return path;
  return `${process.env.NEXT_PUBLIC_UPLOADS_URL || "http://localhost:5000"}${path}`;
};

export default api;
