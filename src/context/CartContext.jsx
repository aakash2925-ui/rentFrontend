"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { isBookableItem, itemTypeOf, minRentalDaysOf, quantityOf } from "@/lib/itemFields";
import { useAuth } from "@/context/AuthContext";

const CartContext = createContext(null);
const LEGACY_CART_KEY = "zasoota_cart";

const cartSnapshot = (property, rentalPlan = {}) => ({
  _id: property._id,
  title: property.title,
  rent: Number(property.rent || 0),
  deposit: Number(property.deposit || 0),
  images: property.images || [],
  pincode: property.pincode,
  itemType: itemTypeOf(property),
  quantityAvailable: quantityOf(property),
  minRentalDays: minRentalDaysOf(property),
  offer: property.offer || "",
  isAvailable: property.isAvailable !== false,
  startDate: rentalPlan.startDate || property.startDate || "",
  endDate: rentalPlan.endDate || property.endDate || "",
  deliveryPincode: rentalPlan.pincode || property.deliveryPincode || ""
});

export function CartProvider({ children }) {
  const { user, loading } = useAuth();
  const [items, setItems] = useState([]);
  const cartKey = user ? `zasoota_cart:${user.id || user._id || user.email}` : "";

  useEffect(() => {
    if (loading) return;
    if (!cartKey) {
      setItems([]);
      return;
    }
    try {
      setItems(JSON.parse(localStorage.getItem(cartKey) || "[]"));
      localStorage.removeItem(LEGACY_CART_KEY);
    } catch {
      setItems([]);
    }
  }, [cartKey, loading]);

  useEffect(() => {
    if (!cartKey || loading) return;
    localStorage.setItem(cartKey, JSON.stringify(items));
  }, [cartKey, items, loading]);

  const addItem = (property, rentalPlan = {}) => {
    if (!isBookableItem(property)) return false;
    const snapshot = cartSnapshot(property, rentalPlan);
    setItems((current) => {
      const existing = current.find((item) => item._id === snapshot._id);
      if (existing) return current.map((item) => (item._id === snapshot._id ? { ...item, ...snapshot, cartQuantity: 1 } : item));
      return [...current, { ...snapshot, cartQuantity: 1 }];
    });
    return true;
  };

  const updateItem = (id, updates) => {
    setItems((current) => current.map((item) => (item._id === id ? { ...item, ...updates } : item)));
  };

  const removeItem = (id) => {
    setItems((current) => current.filter((item) => item._id !== id));
  };

  const clearCart = () => setItems([]);

  const count = items.length;
  const totalDailyRent = items.reduce((total, item) => total + Number(item.rent || 0), 0);
  const totalDeposit = items.reduce((total, item) => total + Number(item.deposit || 0), 0);

  const value = useMemo(() => ({
    items,
    count,
    totalDailyRent,
    totalDeposit,
    addItem,
    updateItem,
    removeItem,
    clearCart
  }), [items, count, totalDailyRent, totalDeposit]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
