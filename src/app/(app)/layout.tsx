export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-6">
          <span className="text-lg font-semibold">GitReview</span>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
