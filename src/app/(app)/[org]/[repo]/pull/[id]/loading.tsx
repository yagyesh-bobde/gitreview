const SIDEBAR_WIDTHS = ['70%', '55%', '80%', '65%', '90%', '50%', '75%', '60%', '85%', '72%'];
const DIFF_WIDTHS = [
  '45%', '80%', '60%', '72%', '55%', '88%', '40%', '65%', '76%', '50%',
  '82%', '58%', '70%', '48%', '85%', '62%', '90%', '52%', '78%', '68%',
];

export default function PullRequestLoading() {
  return (
    <div className="flex h-full flex-col">
      {/* Header skeleton */}
      <div className="flex h-12 shrink-0 items-center border-b border-zinc-800 px-4">
        <div className="h-4 w-20 animate-pulse rounded bg-zinc-800" />
        <div className="mx-auto h-4 w-64 animate-pulse rounded bg-zinc-800" />
        <div className="size-8 animate-pulse rounded-full bg-zinc-800" />
      </div>

      {/* Metadata bar skeleton */}
      <div className="flex h-10 shrink-0 items-center gap-4 border-b border-zinc-800 px-4">
        <div className="h-4 w-24 animate-pulse rounded bg-zinc-800" />
        <div className="h-4 w-40 animate-pulse rounded bg-zinc-800" />
        <div className="ml-auto h-4 w-20 animate-pulse rounded bg-zinc-800" />
      </div>

      {/* Body skeleton */}
      <div className="flex min-h-0 flex-1">
        {/* Sidebar skeleton */}
        <div className="w-[280px] shrink-0 border-r border-zinc-800 bg-zinc-900 p-3">
          <div className="mb-3 h-5 w-12 animate-pulse rounded bg-zinc-800" />
          <div className="space-y-1.5">
            {SIDEBAR_WIDTHS.map((w, i) => (
              <div
                key={i}
                className="h-5 animate-pulse rounded bg-zinc-800"
                style={{ width: w }}
              />
            ))}
          </div>
        </div>

        {/* Diff viewer skeleton */}
        <div className="flex-1 p-4">
          <div className="mb-4 h-8 w-72 animate-pulse rounded bg-zinc-800" />
          <div className="space-y-1">
            {DIFF_WIDTHS.map((w, i) => (
              <div
                key={i}
                className="h-5 animate-pulse rounded bg-zinc-800/50"
                style={{ width: w }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
