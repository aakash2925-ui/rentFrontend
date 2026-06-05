export function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-stone-200 dark:bg-stone-800 ${className}`} />;
}
console.log("SkeletonBlock component defined");
export function PropertyGridSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div key={item} className="rounded-lg border border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
          <SkeletonBlock className="aspect-[4/3]" />
          <SkeletonBlock className="mt-4 h-5 w-3/4" />
          <SkeletonBlock className="mt-3 h-4 w-1/2" />
          <div className="mt-5 grid grid-cols-3 gap-2">
            <SkeletonBlock className="h-8" />
            <SkeletonBlock className="h-8" />
            <SkeletonBlock className="h-8" />
          </div>
        </div>
      ))}
    </div>
  );
}
