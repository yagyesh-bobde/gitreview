export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <div className="h-6 w-36 animate-pulse rounded bg-zinc-800" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-zinc-800/60" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-14 animate-pulse rounded-full bg-zinc-800" />
                  <div className="h-4 w-64 animate-pulse rounded bg-zinc-800" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-3 w-32 animate-pulse rounded bg-zinc-800" />
                  <div className="h-3 w-24 animate-pulse rounded bg-zinc-800" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-16 animate-pulse rounded bg-zinc-800" />
                <div className="size-7 animate-pulse rounded-full bg-zinc-800" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
