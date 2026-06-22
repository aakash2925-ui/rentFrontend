export const itemTypeOf = (item) => item?.itemType || item?.propertyType || "";
export const quantityOf = (item) => Number(item?.quantity ?? item?.bedrooms ?? 0);
export const minRentalDaysOf = (item) => Number(item?.minRentalDays ?? item?.bathrooms ?? 1);
export const conditionOf = (item) => item?.condition || item?.furnishing || "Good";

export const rentalDaysBetween = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  return Number.isFinite(days) && days > 0 ? days : 0;
};
