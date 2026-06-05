"use client";

import { Heart } from "lucide-react";
import { useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";

export default function WishlistButton({ propertyId, initial = false }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [wished, setWished] = useState(initial);

  const toggle = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!user) return showToast("Login to save items", "error");

    try {
      const { data } = await api.post(`/wishlist/${propertyId}/toggle`);
      setWished(data.wished);
      showToast(data.wished ? "Saved to wishlist" : "Removed from wishlist");
    } catch (error) {
      showToast("Unable to update wishlist", "error");
    }
  };

  return (
    <button onClick={toggle} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-red-500 shadow-sm" aria-label="Toggle wishlist">
      <Heart className={`h-4 w-4 ${wished ? "fill-current" : ""}`} />
    </button>
  );
}
