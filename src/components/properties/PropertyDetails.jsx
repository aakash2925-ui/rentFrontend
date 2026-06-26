import { CalendarClock, Package, Percent, ShieldCheck, Star } from "lucide-react";
import { conditionOf, itemTypeOf, minRentalDaysOf, quantityOf } from "@/lib/itemFields";

export default function PropertyDetails({ property }) {
  const availableQuantity = quantityOf(property);
  const isBookable = property.isAvailable && availableQuantity > 0;
  const facts = [
    { icon: CalendarClock, label: `${minRentalDaysOf(property)}+ rental days` },
    { icon: ShieldCheck, label: `${conditionOf(property)} condition` },
    { icon: Package, label: itemTypeOf(property) }
  ];

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-violet-100 bg-white/90 p-6 shadow-soft dark:border-violet-900/70 dark:bg-white/10">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-black leading-tight text-ink dark:text-stone-50 md:text-4xl">{property.title}</h1>
          </div>
          <div className="rounded-2xl bg-mist px-4 py-3 text-sm font-black text-ink dark:bg-white/10 dark:text-white">
            <span className="flex items-center gap-1 text-clay"><Star className="h-4 w-4 fill-current" /> Ratings</span>
            <p className="mt-1 text-xs font-semibold text-violet-950/60 dark:text-violet-100/65">See renter reviews below</p>
          </div>
        </div>
        {property.offer && <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-meadow/10 px-3 py-1 text-sm font-black text-meadow"><Percent className="h-4 w-4" /> {property.offer}</p>}
        {property.availabilityMessage && (
          <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-black ${isBookable ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"}`}>
            <CalendarClock className="h-4 w-4" /> {isBookable ? property.availabilityMessage : `Booked now. ${property.availabilityMessage}`}
          </div>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {facts.map(({ icon: Icon, label }) => (
          <div key={label} className="rounded-lg border border-stone-200 bg-white p-3 text-sm font-semibold dark:border-stone-800 dark:bg-stone-900">
            <Icon className="mb-2 h-5 w-5 text-clay" /> {label}
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
        <h2 className="text-lg font-black text-ink dark:text-stone-50">Description</h2>
        <p className="mt-3 leading-7 text-stone-600 dark:text-stone-300">{property.description}</p>
        <h2 className="mt-6 text-lg font-black text-ink dark:text-stone-50">Included accessories</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {property.amenities?.length ? property.amenities.map((item) => <span key={item} className="rounded-full bg-mist px-3 py-1 text-sm dark:bg-stone-800">{item}</span>) : <span className="text-sm text-stone-500 dark:text-stone-400">No accessories listed.</span>}
        </div>
      </div>
    </section>
  );
}
