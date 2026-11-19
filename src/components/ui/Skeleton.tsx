export function SkeletonBar({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded bg-accent-soft ${className}`}
    />
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-sm">
      <div className="space-y-3">
        <SkeletonBar className="h-9 w-full" />
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonBar key={i} className="h-11 w-full" />
        ))}
      </div>
    </div>
  );
}

/** Placeholder shown while a lazily loaded page chunk downloads. */
export function PageSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-6">
      <div className="space-y-2">
        <SkeletonBar className="h-7 w-64" />
        <SkeletonBar className="h-4 w-96 max-w-full" />
      </div>
      <TableSkeleton rows={5} />
    </div>
  );
}
