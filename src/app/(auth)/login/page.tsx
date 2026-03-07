import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { auth } from '@/features/auth/auth';
import { SignInButton } from '@/features/auth/components/sign-in-button';

export const metadata: Metadata = {
  title: 'Sign In',
};

export default async function LoginPage() {
  const session = await auth();

  // Defense-in-depth: middleware should redirect authenticated users,
  // but catch it here too in case middleware is bypassed or misconfigured.
  if (session?.user) {
    redirect('/dashboard');
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Sign in to GitReview</h1>
        <p className="text-sm text-muted-foreground">
          Use your GitHub account to get started
        </p>
      </div>
      <SignInButton />
    </div>
  );
}
