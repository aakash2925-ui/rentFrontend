"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Loading from "./Loading";

export default function ProtectedRoute({ children, roles }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && roles?.length && !roles.includes(user.role)) {
      router.replace(user.role === "admin" ? "/admin" : user.role === "delivery" ? "/delivery" : "/dashboard");
    }
  }, [loading, user, roles, router]);

  if (loading || !user) return <Loading label="Checking access" />;
  if (roles?.length && !roles.includes(user.role)) return <Loading label="Redirecting" />;
  return children;
}
