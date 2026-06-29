const sections = [
  {
    title: "Customer Cancellations",
    body: "Customers can request cancellation before the rental item is dispatched or delivered. Cancellation approval depends on booking status, payment status, and operational readiness."
  },
  {
    title: "Zasoota Cancellations",
    body: "Zasoota may cancel a booking if the item becomes unavailable, payment verification fails, user details are incomplete, delivery location is unsupported, or the booking appears suspicious."
  },
  {
    title: "Charges",
    body: "Cancellation charges may apply if preparation, dispatch, delivery, or other operational costs have already been incurred. Any applicable refund will follow the Refund Policy."
  },
  {
    title: "How to Cancel",
    body: "Customers should contact support with their booking ID and registered contact details to request cancellation."
  },
  {
    title: "Contact",
    body: "For cancellation support, contact Zasoota at zasoota.in@gmail.com or 8796318284."
  }
];

export const metadata = {
  title: "Cancellation Policy | Zasoota",
  description: "Cancellation policy for Zasoota rental bookings."
};

export default function CancellationPolicyPage() {
  return (
    <section className="bg-mist px-4 py-14 dark:bg-[#10071d]">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[2rem] border border-violet-100 bg-white p-6 shadow-soft dark:border-violet-900/70 dark:bg-white/10 md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-meadow">Zasoota Policy</p>
          <h1 className="mt-3 text-3xl font-black text-ink dark:text-white md:text-5xl">Cancellation Policy</h1>
          <p className="mt-4 text-sm leading-7 text-violet-950/65 dark:text-violet-100/70">
            Last updated: June 26, 2026. This policy explains how booking cancellation requests are handled.
          </p>
          <div className="mt-8 space-y-6">
            {sections.map((section) => (
              <article key={section.title} className="rounded-3xl border border-violet-100 bg-violet-50/70 p-5 dark:border-violet-900/70 dark:bg-violet-950/30">
                <h2 className="text-lg font-black text-ink dark:text-white">{section.title}</h2>
                <p className="mt-2 text-sm leading-7 text-violet-950/70 dark:text-violet-100/70">{section.body}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
