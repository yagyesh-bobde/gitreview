export default function DashboardLoading() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-950">
      {/* Header skeleton */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="size-6 animate-pulse rounded-md bg-zinc-800" />
            <div className="h-4 w-20 animate-pulse rounded bg-zinc-800" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-36 animate-pulse rounded-lg bg-zinc-800/60" />
            <div className="hidden sm:flex h-8 w-20 animate-pulse rounded-lg bg-zinc-800/60" />
          </div>
          <div className="size-7 animate-pulse rounded-full bg-zinc-800" />
        </div>
      </header>

      {/* Content skeleton (list view default) */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 w-full">
        <div className="mb-6">
          <div className="h-6 w-36 animate-pulse rounded bg-zinc-800" />
          <div className="mt-2 h-4 w-72 animate-pulse rounded bg-zinc-800/60" />
        </div>

        {/* Tabs skeleton */}
        <div className="flex items-center gap-4 mb-0">
          {[80, 120, 100].map((w, i) => (
            <div
              key={i}
              className="h-9 animate-pulse rounded bg-zinc-800/50"
              style={{ width: w }}
            />
          ))}
        </div>

        {/* List skeleton */}
        <div className="border border-zinc-800 rounded-xl overflow-hidden">
          <div className="bg-zinc-900/50 border-b border-zinc-800 px-4 py-2.5">
            <div className="h-3 w-24 animate-pulse rounded bg-zinc-800" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="px-4 py-3.5 flex items-center gap-4 border-b border-white/[0.06] last:border-b-0"
            >
              <div className="size-4 animate-pulse rounded-full bg-zinc-800" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-64 animate-pulse rounded bg-zinc-800" />
                <div className="h-3 w-48 animate-pulse rounded bg-zinc-800/60" />
              </div>
              <div className="hidden md:block h-3 w-28 animate-pulse rounded bg-zinc-800/50" />
              <div className="hidden sm:block size-6 animate-pulse rounded-full bg-zinc-800" />
              <div className="hidden lg:block h-3 w-20 animate-pulse rounded bg-zinc-800/50" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
