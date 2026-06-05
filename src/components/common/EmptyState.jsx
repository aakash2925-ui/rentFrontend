import Link from "next/link";
import { PackageOpen } from "lucide-react";

export default function EmptyState({ title, message, actionHref, actionLabel }) {
  return (
    <div className="rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center dark:border-stone-700 dark:bg-stone-900">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-mist text-meadow dark:bg-stone-800">
        <PackageOpen className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-lg font-black">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-stone-500 dark:text-stone-400">{message}</p>
      {actionHref && actionLabel && <Link href={actionHref} className="btn-primary mt-5">{actionLabel}</Link>}
    </div>
  );
}
