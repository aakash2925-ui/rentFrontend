import { Clock3, Headphones, Mail, MapPin, MessageCircle, Phone, ShieldCheck } from "lucide-react";

const contactCards = [
  { icon: Phone, label: "Call support", value: "+91 98765 43210", detail: "10 AM - 7 PM" },
  { icon: Mail, label: "Email", value: "hello@gearnest.local", detail: "Replies within a day" },
  { icon: MapPin, label: "Pickup hub", value: "Bengaluru, Karnataka", detail: "Admin-managed inventory" }
];

const helpTopics = [
  "Rental request and booking status",
  "Pickup, delivery, and distance charges",
  "Inventory availability and deposits"
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div className="space-y-6">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-meadow/10 px-3 py-1 text-sm font-bold uppercase tracking-wide text-meadow dark:bg-meadow/15">
              <Headphones className="h-4 w-4" />
              Contact GearNest
            </p>
            <h1 className="mt-4 max-w-xl text-4xl font-black leading-tight text-ink dark:text-stone-50 md:text-5xl">
              Need help renting gear?
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-stone-600 dark:text-stone-300">
              Ask about projectors, speakers, cameras, lights, rental dates, delivery charges, deposits, or your dashboard status.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {contactCards.map(({ icon: Icon, label, value, detail }) => (
              <article key={label} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-mist text-meadow dark:bg-stone-800">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">{label}</p>
                    <p className="mt-1 font-black text-ink dark:text-stone-50">{value}</p>
                    <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">{detail}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <form className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900 md:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-ink dark:text-stone-50">Send a message</h2>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Share item name, dates, and your preferred pickup or delivery option.</p>
            </div>
            <span className="hidden h-11 w-11 items-center justify-center rounded-lg bg-meadow text-white sm:flex">
              <MessageCircle className="h-5 w-5" />
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="field" placeholder="Name" />
            <input className="field" type="email" placeholder="Email" />
            <input className="field" placeholder="Phone" />
            <select className="field" defaultValue="">
              <option value="" disabled>Support topic</option>
              <option>Rental request</option>
              <option>Delivery charges</option>
              <option>Booking status</option>
              <option>Admin account</option>
            </select>
            <input className="field sm:col-span-2" placeholder="Subject" />
            <textarea className="field min-h-36 sm:col-span-2" placeholder="Message" />
            <button className="btn-primary sm:col-span-2" type="button">Send message</button>
          </div>
        </form>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <Clock3 className="h-6 w-6 text-clay" />
          <h2 className="mt-3 text-lg font-black text-ink dark:text-stone-50">Fast response</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">Most rental questions are answered the same business day with next steps clearly listed.</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <ShieldCheck className="h-6 w-6 text-clay" />
          <h2 className="mt-3 text-lg font-black text-ink dark:text-stone-50">Clear booking help</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">The team can explain request, confirmed rental, returned, closed, and payment statuses.</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <MessageCircle className="h-6 w-6 text-clay" />
          <h2 className="mt-3 text-lg font-black text-ink dark:text-stone-50">What to include</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {helpTopics.map((topic) => (
              <span key={topic} className="rounded-full bg-mist px-3 py-1 text-xs font-bold text-stone-700 dark:bg-stone-800 dark:text-stone-200">{topic}</span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
