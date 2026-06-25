export const DELIVERY_RATE_PER_KM = 25;

export const discountForDays = (days) => {
  if (days >= 30) return 20;
  if (days >= 16) return 15;
  if (days >= 8) return 10;
  if (days >= 4) return 5;
  return 0;
};

export const calculateRentalPricing = ({ rent, deposit, quantity, rentalDays, deliveryDistanceKm, voucherCode, voucherDiscountAmount = 0, voucherMessage = "" }) => {
  const baseAmount = Number(rent || 0) * Number(quantity || 1) * Number(rentalDays || 0);
  const discountPercentage = discountForDays(Number(rentalDays || 0));
  const discountAmount = Math.round((baseAmount * discountPercentage) / 100);
  const totalRent = Math.max(0, baseAmount - discountAmount);
  const voucherAmount = Math.min(Number(voucherDiscountAmount || 0), totalRent);
  const deliveryCharge = Math.ceil(Number(deliveryDistanceKm || 0) * DELIVERY_RATE_PER_KM);
  const finalAmount = Math.max(0, totalRent - voucherAmount) + Number(deposit || 0) + deliveryCharge;

  return {
    baseAmount,
    discountPercentage,
    discountAmount,
    totalRent,
    voucher: { code: voucherCode || "", valid: Boolean(voucherCode && voucherAmount > 0), message: voucherMessage },
    voucherDiscountAmount: voucherAmount,
    deliveryCharge,
    finalAmount
  };
};
