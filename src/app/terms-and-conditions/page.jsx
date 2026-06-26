const sections = [
  {
    title: "Use of Zasoota",
    body: "Zasoota provides rental access to items such as projectors, speakers, cameras, luggage, fashion items, and other approved products. By using the platform, customers agree to provide accurate account, delivery, and booking information."
  },
  {
    title: "Bookings and Availability",
    body: "All bookings are subject to product availability, serviceable PIN codes, user verification, and successful booking confirmation. Zasoota may reject or cancel requests where information is incomplete, incorrect, or violates platform policies."
  },
  {
    title: "Payments",
    body: "Customers may pay through available payment methods such as Razorpay-supported online payments or other enabled methods. Online bookings are confirmed after payment verification. Any pending or failed payment may result in booking cancellation."
  },
  {
    title: "Customer Responsibilities",
    body: "Customers must use rented items responsibly, return them in the agreed condition, and report any issue immediately. Damage, loss, delayed return, or misuse may attract additional charges."
  },
  {
    title: "Contact",
    body: "For support related to bookings, payments, or returns, contact Zasoota at zasoota.in@gmail.com or 8796318284."
  }
];

export const metadata = {
  title: "Terms and Conditions | Zasoota",
  description: "Terms and conditions for using Zasoota rental services."
};

export default function TermsAndConditionsPage() {
  return (
    <section className="bg-mist px-4 py-14 dark:bg-[#10071d]">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[2rem] border border-violet-100 bg-white p-6 shadow-soft dark:border-violet-900/70 dark:bg-white/10 md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-meadow">Zasoota Policy</p>
          <h1 className="mt-3 text-3xl font-black text-ink dark:text-white md:text-5xl">Terms and Conditions</h1>
          <p className="mt-4 text-sm leading-7 text-violet-950/65 dark:text-violet-100/70">
            Last updated: June 26, 2026. These terms explain the basic rules for using Zasoota rental services.
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
