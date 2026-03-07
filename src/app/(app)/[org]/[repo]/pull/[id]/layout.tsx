/**
 * PR review page layout.
 * Fills the remaining viewport height from the parent flex container
 * with a column layout for header -> metadata -> sidebar+diff.
 */
export default function PullRequestLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex h-screen flex-col overflow-hidden bg-zinc-950">{children}</div>;
}
