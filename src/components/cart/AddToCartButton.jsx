"use client";

import { useRouter } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { quantityOf } from "@/lib/itemFields";

export default function AddToCartButton({ property, className = "", compact = false }) {
  const router = useRouter();
  const { addItem, items } = useCart();
  const { showToast } = useToast();
  const { user, loading } = useAuth();
  const availableQuantity = quantityOf(property);
  const disabled = !property?.isAvailable || availableQuantity <= 0;
  const inCart = items.some((item) => item._id === property._id);

  const addToCart = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!loading && !user) {
      showToast("Please login to add items to cart", "error");
      router.push("/login");
      return;
    }
    if (disabled) {
      showToast("This item is out of stock", "error");
      return;
    }
    addItem(property);
    showToast(inCart ? "Cart quantity updated" : "Added to cart");
  };

  return (
    <button
      type="button"
      onClick={addToCart}
      disabled={disabled}
      className={`${compact ? "min-h-10 px-3 text-xs" : "min-h-11 px-4 text-sm"} inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-700 via-meadow to-fuchsia-500 font-black text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-55 ${className}`}
    >
      <ShoppingCart className={compact ? "h-4 w-4" : "h-5 w-5"} />
      {inCart ? "Add more" : "Add to cart"}
    </button>
  );
}
