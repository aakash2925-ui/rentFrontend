export const DELIVERY_RATE_PER_KM = 25;
export const FAST_DELIVERY_CHARGE = 199;

export const deliverySpeedDetails = (speed = "standard") => {
  if (speed === "fast") {
    return {
      speed: "fast",
      label: "Fast delivery",
      eta: "Within 2 hours",
      charge: FAST_DELIVERY_CHARGE
    };
  }

  return {
    speed: "standard",
    label: "Standard delivery",
    eta: "Within 24 hours",
    charge: 0
  };
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
