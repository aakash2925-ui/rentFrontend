"use client";

import { useRouter } from "next/navigation";
import { ShoppingCart, Trash2 } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { quantityOf } from "@/lib/itemFields";

export default function AddToCartButton({ property, className = "", compact = false }) {
  const router = useRouter();
  const [showCartAction, setShowCartAction] = useState(false);
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
      setShowCartAction(false);
      showToast("Removed from cart");
      return;
    }
    addItem(property);
    setShowCartAction(true);
    showToast("Added to cart");
  };

  return (
    <>
      <button
        type="button"
        onClick={toggleCart}
        disabled={disabled}
        className={`${compact ? "min-h-10 px-3 text-xs" : "min-h-11 px-4 text-sm"} inline-flex items-center justify-center gap-2 rounded-xl ${inCart ? "border border-red-100 bg-white text-red-600 hover:bg-red-50 dark:border-red-900/70 dark:bg-white/10 dark:text-red-300 dark:hover:bg-red-950/30" : "bg-gradient-to-r from-violet-700 via-meadow to-fuchsia-500 text-white"} font-black shadow-soft transition hover:-translate-y-0.5 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-55 ${className}`}
      >
        {inCart ? <Trash2 className={compact ? "h-4 w-4" : "h-5 w-5"} /> : <ShoppingCart className={compact ? "h-4 w-4" : "h-5 w-5"} />}
        {inCart ? "Remove from cart" : "Add to cart"}
      </button>
      {showCartAction && inCart && (
        <div className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-violet-100 bg-white/95 p-3 shadow-glow backdrop-blur-xl dark:border-violet-900/70 dark:bg-stone-950/95">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-black text-ink dark:text-white">Item added to cart</p>
              <p className="line-clamp-1 text-xs font-semibold text-violet-950/60 dark:text-violet-100/65">{property.title}</p>
            </div>
            <button type="button" className="btn-primary min-h-11 shrink-0 px-5" onClick={() => router.push("/cart")}>
              Go to Cart
            </button>
          </div>
        </div>
      )}
    </>
  );
}
