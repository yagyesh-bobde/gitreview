import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Authentication Error',
};

export default function AuthErrorPage() {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <h1 className="text-2xl font-bold">Authentication Error</h1>
      <p className="text-sm text-muted-foreground">
        There was a problem signing in. Please try again.
      </p>
      <Link
        href="/login"
        className="text-sm text-primary underline-offset-4 hover:underline"
      >
        Back to sign in
      </Link>
    </div>
  );
}
