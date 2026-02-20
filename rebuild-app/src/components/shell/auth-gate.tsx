"use client";

import { AuthScreen } from '@/components/auth/auth-screen';
import { hasFirebaseClientConfig } from '@/lib/firebase/client';
import { useAuth } from '@/lib/firebase/auth-provider';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-[var(--muted)]">Loading workspace...</div>;
  }

  if (!hasFirebaseClientConfig) {
    return <>{children}</>;
  }

  if (user) {
    return <>{children}</>;
  }

  return (
    <AuthScreen
      defaultMode="signup"
      title="Sign up to access your workspace"
      subtitle="Create or sign in to continue to the dashboard."
    />
  );
}

