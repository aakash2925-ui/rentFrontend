export const metadata = {
  title: "Merchant Details | Zasoota",
  description: "Merchant legal details for Zasoota."
};

export default function MerchantDetailsPage() {
  return (
    <section className="bg-mist px-4 py-14 dark:bg-[#10071d]">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[2rem] border border-violet-100 bg-white p-6 shadow-soft dark:border-violet-900/70 dark:bg-white/10 md:p-10">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-meadow">Merchant Information</p>
          <h1 className="mt-3 text-3xl font-black text-ink dark:text-white md:text-5xl">Merchant Details</h1>
          <div className="mt-8 space-y-4">
            <div className="rounded-3xl border border-violet-100 bg-violet-50/70 p-5 dark:border-violet-900/70 dark:bg-violet-950/30">
              <span className="text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-200">Brand name</span>
              <p className="mt-2 text-lg font-black text-ink dark:text-white">Zasoota</p>
            </div>
            <div className="rounded-3xl border border-violet-100 bg-violet-50/70 p-5 dark:border-violet-900/70 dark:bg-violet-950/30">
              <span className="text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-200">Merchant legal name</span>
              <p className="mt-2 text-lg font-black text-ink dark:text-white">SUMIT KUMAR</p>
            </div>
            <div className="rounded-3xl border border-violet-100 bg-violet-50/70 p-5 dark:border-violet-900/70 dark:bg-violet-950/30">
              <span className="text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-200">Website</span>
              <p className="mt-2 text-lg font-black text-ink dark:text-white">www.zasoota.com</p>
            </div>
            <div className="rounded-3xl border border-violet-100 bg-violet-50/70 p-5 dark:border-violet-900/70 dark:bg-violet-950/30">
              <span className="text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-200">Contact</span>
              <p className="mt-2 text-lg font-black text-ink dark:text-white">zasoota.in@gmail.com · 8796318284</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
