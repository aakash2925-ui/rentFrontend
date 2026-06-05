export default function Loading({ label = "Loading" }) {
  return (
    <div className="flex min-h-48 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-meadow border-t-transparent" />
      <span className="ml-3 text-sm font-medium text-stone-600 dark:text-stone-300">{label}</span>
    </div>
  );
}
