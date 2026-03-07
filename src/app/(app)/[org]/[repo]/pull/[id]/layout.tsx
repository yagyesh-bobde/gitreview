/**
 * PR review page layout.
 * Uses fixed positioning to create a full-viewport immersive view,
 * bypassing the parent (app) layout's default header and padding.
 */
export default function PullRequestLayout({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 z-40 overflow-hidden bg-zinc-950">{children}</div>;
}
