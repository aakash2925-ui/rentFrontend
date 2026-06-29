export default function RentPriceSection({ property }) {
  return (
    <div className="rounded-2xl border border-violet-100 bg-white/90 p-5 shadow-soft dark:border-violet-900/70 dark:bg-white/10">
      <p className="break-words text-base font-black leading-6 text-ink dark:text-white">{property.title}</p>
      <p className="mt-2 flex items-end gap-2 text-3xl font-black text-meadow">
        ₹{Number(property.rent).toLocaleString()}
        <span className="pb-1 text-sm font-black text-violet-950/55 dark:text-violet-100/60">/ day</span>
      </p>
      {property.offer && <p className="mt-2 rounded-full bg-meadow/10 px-3 py-1 text-sm font-black text-meadow">{property.offer}</p>}
      <div className="mt-4 rounded-xl bg-mist p-3 text-sm dark:bg-white/10">
        <div className="flex justify-between"><span>Refundable deposit</span><strong>₹{Number(property.deposit).toLocaleString()}</strong></div>
      </div>
    </div>
  );
}
