import { quantityOf } from "@/lib/itemFields";

export default function RentPriceSection({ property }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <p className="text-sm text-stone-500 dark:text-stone-400">Daily rent</p>
      <p className="mt-1 text-3xl font-black text-meadow">₹{Number(property.rent).toLocaleString()}</p>
      <div className="mt-4 rounded-lg bg-mist p-3 text-sm dark:bg-stone-800">
        <div className="flex justify-between"><span>Refundable deposit</span><strong>₹{Number(property.deposit).toLocaleString()}</strong></div>
        <div className="mt-2 flex justify-between"><span>Available quantity</span><strong>{quantityOf(property)}</strong></div>
      </div>
    </div>
  );
}
