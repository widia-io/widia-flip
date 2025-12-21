export default function PropertyHubLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {/* Header skeleton */}
      <div className="flex items-start justify-between">
        <div>
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-8 w-64 animate-pulse rounded bg-muted" />
          <div className="mt-1 h-4 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-7 w-24 animate-pulse rounded-full bg-muted" />
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-1 border-b border-border pb-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-9 w-24 animate-pulse rounded bg-muted"
          />
        ))}
      </div>

      {/* Content skeleton */}
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="h-10 animate-pulse rounded bg-muted" />
            <div className="h-10 animate-pulse rounded bg-muted" />
            <div className="h-10 animate-pulse rounded bg-muted" />
            <div className="h-10 animate-pulse rounded bg-muted" />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="h-5 w-48 animate-pulse rounded bg-muted" />
          <div className="mt-4 space-y-3">
            <div className="h-12 animate-pulse rounded bg-muted" />
            <div className="h-12 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
