import { Boxes, CalendarClock, Gauge, Package, ShieldCheck } from "lucide-react";
import { conditionOf, itemTypeOf, minRentalDaysOf, quantityOf, specValueOf } from "@/lib/itemFields";

export default function PropertyDetails({ property }) {
  const facts = [
    { icon: Boxes, label: `${quantityOf(property)} Available` },
    { icon: CalendarClock, label: `${minRentalDaysOf(property)}+ rental days` },
    { icon: Gauge, label: `${specValueOf(property)} spec value` },
    { icon: ShieldCheck, label: `${conditionOf(property)} condition` },
    { icon: Package, label: itemTypeOf(property) }
  ];

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-3xl font-black text-ink dark:text-stone-50">{property.title}</h1>
        <p className="mt-2 text-stone-600 dark:text-stone-300">Pickup from {property.address}, {property.city}, {property.state} {property.pincode}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
