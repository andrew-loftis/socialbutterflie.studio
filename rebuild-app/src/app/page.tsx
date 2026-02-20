"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthScreen } from '@/components/auth/auth-screen';
import { hasFirebaseClientConfig } from '@/lib/firebase/client';
import { useAuth } from '@/lib/firebase/auth-provider';

export default function HomePage() {
  const router = useRouter();
  const { loading, user } = useAuth();

  useEffect(() => {
    if (!loading && (!hasFirebaseClientConfig || user)) {
      router.replace('/dashboard');
    }
  }, [loading, router, user]);

  if (!hasFirebaseClientConfig) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-[var(--muted)]">Redirecting to dashboard...</div>;
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-[var(--muted)]">Checking session...</div>;
  }

  if (user) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-[var(--muted)]">Entering workspace...</div>;
  }

  return <AuthScreen defaultMode="signup" />;
}

