import Link from "next/link";

export default function DashboardLayout({ title, children, actions }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-clay">Dashboard</p>
          <h1 className="text-3xl font-black text-ink dark:text-stone-50">{title}</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/items" className="btn-secondary">Browse</Link>
          {actions}
        </div>
      </div>
      {children}
    </div>
  );
}
