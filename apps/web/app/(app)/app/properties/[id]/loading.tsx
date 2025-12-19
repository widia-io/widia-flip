export default function PropertyHubLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      {/* Header skeleton */}
      <div className="flex items-start justify-between">
        <div>
          <div className="h-4 w-20 animate-pulse rounded bg-neutral-800" />
          <div className="mt-2 h-8 w-64 animate-pulse rounded bg-neutral-800" />
          <div className="mt-1 h-4 w-32 animate-pulse rounded bg-neutral-800" />
        </div>
        <div className="h-7 w-24 animate-pulse rounded-full bg-neutral-800" />
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-1 border-b border-neutral-800 pb-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-9 w-24 animate-pulse rounded bg-neutral-800"
          />
        ))}
      </div>

      {/* Content skeleton */}
      <div className="space-y-4">
        <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6">
          <div className="h-5 w-40 animate-pulse rounded bg-neutral-800" />
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="h-10 animate-pulse rounded bg-neutral-800" />
            <div className="h-10 animate-pulse rounded bg-neutral-800" />
            <div className="h-10 animate-pulse rounded bg-neutral-800" />
            <div className="h-10 animate-pulse rounded bg-neutral-800" />
          </div>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6">
          <div className="h-5 w-48 animate-pulse rounded bg-neutral-800" />
          <div className="mt-4 space-y-3">
            <div className="h-12 animate-pulse rounded bg-neutral-800" />
            <div className="h-12 animate-pulse rounded bg-neutral-800" />
          </div>
        </div>
      </div>
    </div>
  );
}
