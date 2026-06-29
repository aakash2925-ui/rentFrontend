const sections = [
  {
    title: "Information We Collect",
    body: "We collect details required to create accounts, process bookings, verify users, deliver items, accept payments, and provide customer support. This may include name, email, phone number, address, booking details, payment status, and KYC-related information where applicable."
  },
  {
    title: "How We Use Information",
    body: "Information is used to manage rentals, check serviceability, process payments, send booking updates, improve support, prevent fraud, and comply with legal or operational requirements."
  },
  {
    title: "Payments and Third Parties",
    body: "Online payments are processed through payment partners such as Razorpay. Zasoota does not store full card, UPI, or banking credentials on its servers."
  },
  {
    title: "Data Security",
    body: "We use reasonable technical and operational safeguards to protect customer information. Access to sensitive information is restricted to authorized users and administrators."
  },
  {
    title: "Contact",
    body: "For privacy-related questions, contact Zasoota at zasoota.in@gmail.com or 8796318284."
  }
];

export const metadata = {
  title: "Privacy Policy | Zasoota",
  description: "Privacy policy for Zasoota rental services."
};

export default function PrivacyPolicyPage() {
  return (
    <section className="bg-mist px-4 py-14 dark:bg-[#10071d]">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[2rem] border border-violet-100 bg-white p-6 shadow-soft dark:border-violet-900/70 dark:bg-white/10 md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-meadow">Zasoota Policy</p>
          <h1 className="mt-3 text-3xl font-black text-ink dark:text-white md:text-5xl">Privacy Policy</h1>
          <p className="mt-4 text-sm leading-7 text-violet-950/65 dark:text-violet-100/70">
            Last updated: June 26, 2026. This policy explains how Zasoota handles customer information.
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
