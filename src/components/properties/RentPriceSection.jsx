import { quantityOf } from "@/lib/itemFields";

export default function RentPriceSection({ property }) {
  return (
    <div className="rounded-2xl border border-violet-100 bg-white/90 p-5 shadow-soft dark:border-violet-900/70 dark:bg-white/10">
      <p className="text-sm text-stone-500 dark:text-stone-400">Daily rent</p>
      <p className="mt-1 text-3xl font-black text-meadow">₹{Number(property.rent).toLocaleString()}</p>
      {property.offer && <p className="mt-2 rounded-full bg-meadow/10 px-3 py-1 text-sm font-black text-meadow">{property.offer}</p>}
      <div className="mt-4 rounded-xl bg-mist p-3 text-sm dark:bg-white/10">
        <div className="flex justify-between"><span>Refundable deposit</span><strong>₹{Number(property.deposit).toLocaleString()}</strong></div>
        <div className="mt-2 flex justify-between"><span>Available quantity</span><strong>{quantityOf(property)}</strong></div>
      </div>
    </div>
  );
}
