export default function PullRequestLoading() {
  return (
    <div className="container mx-auto p-6">
      <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      <div className="mt-6 flex gap-4">
        <div className="h-[calc(100vh-12rem)] w-64 animate-pulse rounded-lg bg-muted" />
        <div className="h-[calc(100vh-12rem)] flex-1 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}
