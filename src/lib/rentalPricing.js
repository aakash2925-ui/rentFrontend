export const DELIVERY_RATE_PER_KM = 25;
export const FAST_DELIVERY_CHARGE = 199;

export const DELIVERY_TIME_SLOTS = [
  {
    speed: "early",
    label: "Early Delivery",
    eta: "11AM-1PM",
    window: "11AM-1PM",
    charge: 199,
    text: "Get your rental order early in the day."
  },
  {
    speed: "afternoon",
    label: "Afternoon Slot",
    eta: "1PM-3PM",
    window: "1PM-3PM",
    charge: 149,
    text: "A balanced slot for daytime delivery."
  },
  {
    speed: "evening",
    label: "Evening Slot",
    eta: "3PM-5PM",
    window: "3PM-5PM",
    charge: 99,
    text: "Convenient delivery before evening plans."
  },
  {
    speed: "standard",
    label: "Standard Delivery",
    eta: "5PM-11PM",
    window: "5PM-11PM",
    charge: 0,
    text: "Free delivery within the standard schedule."
  }
];

export const deliverySpeedDetails = (speed = "standard") => {
  const slot = DELIVERY_TIME_SLOTS.find((item) => item.speed === speed);
  if (slot) return slot;

  if (speed === "fast") {
    return {
      speed: "fast",
      label: "Fast delivery",
      eta: "Within 2 hours",
      charge: FAST_DELIVERY_CHARGE
    };
  }

  return DELIVERY_TIME_SLOTS.find((item) => item.speed === "standard");
};

export const discountForDays = (days) => {
  if (days >= 30) return 20;
  if (days >= 16) return 15;
  if (days >= 8) return 10;
  if (days >= 4) return 5;
  return 0;
};

export const calculateRentalPricing = ({ rent, deposit, quantity, rentalDays, deliveryDistanceKm, deliverySpeed = "standard", voucherCode, voucherDiscountAmount = 0, voucherMessage = "" }) => {
  const baseAmount = Number(rent || 0) * Number(quantity || 1) * Number(rentalDays || 0);
  const discountPercentage = discountForDays(Number(rentalDays || 0));
  const discountAmount = Math.round((baseAmount * discountPercentage) / 100);
  const totalRent = Math.max(0, baseAmount - discountAmount);
  const voucherAmount = Math.min(Number(voucherDiscountAmount || 0), totalRent);
  const delivery = deliverySpeedDetails(deliverySpeed);
  const deliveryCharge = Math.ceil(Number(deliveryDistanceKm || 0) * DELIVERY_RATE_PER_KM) + delivery.charge;
  const finalAmount = Math.max(0, totalRent - voucherAmount) + Number(deposit || 0) + deliveryCharge;

  return {
    baseAmount,
    discountPercentage,
    discountAmount,
    totalRent,
    voucher: { code: voucherCode || "", valid: Boolean(voucherCode && voucherAmount > 0), message: voucherMessage },
    voucherDiscountAmount: voucherAmount,
    delivery,
    deliveryCharge,
    finalAmount
  };
};
