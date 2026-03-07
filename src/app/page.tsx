import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/features/auth/auth';

export default async function HomePage() {
  const session = await auth();

  // Defense-in-depth: middleware should handle this redirect,
  // but if it doesn't, catch it here at the page level.
  if (session?.user) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-4xl font-bold tracking-tight">GitReview</h1>
        <p className="text-lg text-muted-foreground">
          AI-powered code review for GitHub pull requests
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Sign in with GitHub
        </Link>
      </div>
    </div>
  );
}
