"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { itemTypeOf, minRentalDaysOf, quantityOf, specValueOf } from "@/lib/itemFields";

const CartContext = createContext(null);
const CART_KEY = "zasoota_cart";

const cartSnapshot = (property) => ({
  _id: property._id,
  title: property.title,
  rent: Number(property.rent || 0),
  deposit: Number(property.deposit || 0),
  images: property.images || [],
  city: property.city,
  state: property.state,
  itemType: itemTypeOf(property),
  quantityAvailable: quantityOf(property),
  minRentalDays: minRentalDaysOf(property),
  specValue: specValueOf(property),
  isAvailable: property.isAvailable !== false
});

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    try {
      setItems(JSON.parse(localStorage.getItem(CART_KEY) || "[]"));
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (property, quantity = 1) => {
    const snapshot = cartSnapshot(property);
    setItems((current) => {
      const existing = current.find((item) => item._id === snapshot._id);
      if (existing) {
        return current.map((item) => (
          item._id === snapshot._id
            ? { ...item, ...snapshot, cartQuantity: Math.min(item.quantityAvailable || 1, item.cartQuantity + quantity) }
            : item
        ));
      }
      return [...current, { ...snapshot, cartQuantity: Math.min(snapshot.quantityAvailable || 1, quantity) }];
    });
  };

  const removeItem = (id) => {
    setItems((current) => current.filter((item) => item._id !== id));
  };

  const updateQuantity = (id, quantity) => {
    setItems((current) => current.map((item) => (
      item._id === id
        ? { ...item, cartQuantity: Math.max(1, Math.min(item.quantityAvailable || 1, Number(quantity) || 1)) }
        : item
    )));
  };

  const clearCart = () => setItems([]);

  const count = items.reduce((total, item) => total + Number(item.cartQuantity || 0), 0);
  const totalDailyRent = items.reduce((total, item) => total + Number(item.rent || 0) * Number(item.cartQuantity || 1), 0);
  const totalDeposit = items.reduce((total, item) => total + Number(item.deposit || 0), 0);

  const value = useMemo(() => ({
    items,
    count,
    totalDailyRent,
    totalDeposit,
    addItem,
    removeItem,
    updateQuantity,
    clearCart
  }), [items, count, totalDailyRent, totalDeposit]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
