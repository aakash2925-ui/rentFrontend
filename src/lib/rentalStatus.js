export const statusLabels = {
  pending: "Request sent",
  contacted: "Contacted",
  rented: "Confirmed rental",
  returned: "Returned",
  closed: "Closed"
};

export const statusDescriptions = {
  pending: "Waiting for admin review.",
  contacted: "Admin has contacted the renter.",
  rented: "Inventory is reserved and quantity has been reduced.",
  returned: "Rental is complete and quantity has been restored.",
  closed: "Request is closed."
};

export const statusTone = {
  pending: "bg-amber-50 text-amber-700",
  contacted: "bg-blue-50 text-blue-700",
  rented: "bg-green-50 text-green-700",
  returned: "bg-meadow/10 text-meadow",
  closed: "bg-stone-100 text-stone-700"
};

export const statusLabel = (status) => statusLabels[status] || status;

export const statusOptions = [
  ["pending", statusLabels.pending],
  ["contacted", statusLabels.contacted],
  ["rented", statusLabels.rented],
  ["returned", statusLabels.returned],
  ["closed", statusLabels.closed]
];
