export default function ProspectsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-40 animate-pulse rounded bg-neutral-800" />
          <div className="mt-2 h-4 w-24 animate-pulse rounded bg-neutral-800" />
        </div>
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-950">
        <div className="border-b border-neutral-800 p-4">
          <div className="flex gap-4">
            <div className="h-10 w-32 animate-pulse rounded bg-neutral-800" />
            <div className="h-10 w-48 animate-pulse rounded bg-neutral-800" />
          </div>
        </div>
        <div className="divide-y divide-neutral-800">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="h-5 w-24 animate-pulse rounded bg-neutral-800" />
              <div className="h-5 w-48 animate-pulse rounded bg-neutral-800" />
              <div className="h-5 w-16 animate-pulse rounded bg-neutral-800" />
              <div className="h-5 w-24 animate-pulse rounded bg-neutral-800" />
              <div className="h-5 w-20 animate-pulse rounded bg-neutral-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
