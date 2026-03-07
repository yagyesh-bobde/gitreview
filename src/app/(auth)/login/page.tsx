import type { Metadata } from 'next';
import { SignInButton } from '@/features/auth/components/sign-in-button';

export const metadata: Metadata = {
  title: 'Sign In',
};

export default function LoginPage() {
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
