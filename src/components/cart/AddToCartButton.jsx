"use client";

import { useRouter } from "next/navigation";
import { ShoppingCart, Trash2 } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { quantityOf } from "@/lib/itemFields";

export default function AddToCartButton({ property, className = "", compact = false }) {
  const router = useRouter();
  const { addItem, items, removeItem } = useCart();
  const { showToast } = useToast();
  const { user, loading } = useAuth();
  const availableQuantity = quantityOf(property);
  const disabled = !property?.isAvailable || availableQuantity <= 0;
  const inCart = items.some((item) => item._id === property._id);

  const toggleCart = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!loading && !user) {
      showToast("Please login to add items to cart", "error");
      router.push("/login");
      return;
    }
    if (disabled) {
      showToast(property.availabilityMessage ? `This item is booked. ${property.availabilityMessage}` : "This item is out of stock", "error");
      return;
    }
    if (inCart) {
      removeItem(property._id);
      showToast("Removed from cart");
      return;
    }
    addItem(property);
    showToast("Added to cart");
  };

  return (
    <button
      type="button"
      onClick={toggleCart}
      disabled={disabled}
      className={`${compact ? "min-h-10 px-3 text-xs" : "min-h-11 px-4 text-sm"} inline-flex items-center justify-center gap-2 rounded-xl ${inCart ? "border border-red-100 bg-white text-red-600 hover:bg-red-50 dark:border-red-900/70 dark:bg-white/10 dark:text-red-300 dark:hover:bg-red-950/30" : "bg-gradient-to-r from-violet-700 via-meadow to-fuchsia-500 text-white"} font-black shadow-soft transition hover:-translate-y-0.5 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-55 ${className}`}
    >
      {inCart ? <Trash2 className={compact ? "h-4 w-4" : "h-5 w-5"} /> : <ShoppingCart className={compact ? "h-4 w-4" : "h-5 w-5"} />}
      {inCart ? "Remove from cart" : "Add to cart"}
    </button>
  );
}
