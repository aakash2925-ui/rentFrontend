const sections = [
  {
    title: "Eligible Refunds",
    body: "Refunds may be provided when a paid booking is cancelled by Zasoota, the item is unavailable after payment, duplicate payment is received, or a service issue is verified by the support team."
  },
  {
    title: "Non-Refundable Cases",
    body: "Refunds may not be available for completed rentals, customer-caused damage, late returns, incorrect customer details, or cancellations made after dispatch or delivery according to the booking status."
  },
  {
    title: "Refund Timeline",
    body: "Approved refunds are initiated to the original payment method. Bank or payment partner processing timelines may vary, but customers will be informed once the refund is initiated."
  },
  {
    title: "How to Request a Refund",
    body: "Customers can contact support with the booking ID, registered phone number, payment details, and reason for the refund request."
  },
  {
    title: "Contact",
    body: "For refund support, contact Zasoota at zasoota.in@gmail.com or 8796318284."
  }
];

export const metadata = {
  title: "Refund Policy | Zasoota",
  description: "Refund policy for Zasoota rental bookings."
};

export default function RefundPolicyPage() {
  return (
    <section className="bg-mist px-4 py-14 dark:bg-[#10071d]">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[2rem] border border-violet-100 bg-white p-6 shadow-soft dark:border-violet-900/70 dark:bg-white/10 md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-meadow">Zasoota Policy</p>
          <h1 className="mt-3 text-3xl font-black text-ink dark:text-white md:text-5xl">Refund Policy</h1>
          <p className="mt-4 text-sm leading-7 text-violet-950/65 dark:text-violet-100/70">
            Last updated: June 26, 2026. This policy explains when refunds may be approved for rental bookings.
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
