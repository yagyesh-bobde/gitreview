import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { linkTokens } from '@/lib/db/schema';

interface LinkPageProps {
  searchParams: Promise<{ token?: string; error?: string }>;
}

const errorMessages: Record<string, { title: string; description: string }> = {
  not_found: {
    title: 'Invalid Link',
    description: 'This link token was not found. It may have already been used or expired.',
  },
  used: {
    title: 'Link Already Used',
    description:
      'This link has already been used to connect an account. Please generate a new one if needed.',
  },
  expired: {
    title: 'Link Expired',
    description: 'This link has expired. Please generate a new one from your GitReview settings.',
  },
};

/**
 * /auth/link?token=xxx
 *
 * Landing page for cross-browser account linking.
 * Validates the token, then redirects to the Route Handler that sets cookies
 * and kicks off the GitHub OAuth flow.
 *
 * Also handles error redirects from the Route Handler via ?error=xxx.
 */
export default async function LinkPage({ searchParams }: LinkPageProps) {
  const { token, error } = await searchParams;

  // Show error messages redirected back from the route handler
  if (error && errorMessages[error]) {
    const { title, description } = errorMessages[error];
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="mt-2 text-sm text-zinc-400">{description}</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold">Invalid Link</h1>
          <p className="mt-2 text-sm text-zinc-400">
            No token provided. Please generate a new link from your GitReview settings.
          </p>
        </div>
      </div>
    );
  }

  // Quick validation so we don't redirect to the API route with a bogus token
  const db = getDb();
  const row = await db
    .select({
      expiresAt: linkTokens.expiresAt,
      usedAt: linkTokens.usedAt,
    })
    .from(linkTokens)
    .where(eq(linkTokens.token, token))
    .limit(1)
    .then((rows) => rows[0] ?? null);

  if (!row) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold">Invalid Link</h1>
          <p className="mt-2 text-sm text-zinc-400">
            This link token was not found. It may have already been used or expired.
          </p>
        </div>
      </div>
    );
  }

  if (row.usedAt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold">Link Already Used</h1>
          <p className="mt-2 text-sm text-zinc-400">
            This link has already been used to connect an account. Please generate a new one if
            needed.
          </p>
        </div>
      </div>
    );
  }

  if (new Date() > row.expiresAt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-semibold">Link Expired</h1>
          <p className="mt-2 text-sm text-zinc-400">
            This link has expired. Please generate a new one from your GitReview settings.
          </p>
        </div>
      </div>
    );
  }

  // Token is valid -- redirect to the Route Handler that sets cookies and starts OAuth
  redirect(`/api/auth/link-start?token=${encodeURIComponent(token)}`);
}
