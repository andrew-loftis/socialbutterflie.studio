"use client";

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAppState } from '@/components/shell/app-state';
import { hasFirebaseClientConfig } from '@/lib/firebase/client';
import { useAuth } from '@/lib/firebase/auth-provider';

export function CompanyGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { appContext, companies } = useAppState();

  useEffect(() => {
    if (!hasFirebaseClientConfig || loading || !user) return;
    const requiresSelection = companies.length > 1;

    if (
      requiresSelection &&
      (!appContext.companyGateSeenInSession || !appContext.activeCompanyId)
    ) {
      router.replace('/select-company');
      return;
    }

    if (
      requiresSelection &&
      !companies.some((company) => company.id === appContext.activeCompanyId)
    ) {
      router.replace('/select-company');
    }
  }, [appContext.activeCompanyId, appContext.companyGateSeenInSession, companies, loading, router, user]);

  if (!hasFirebaseClientConfig) {
    return <>{children}</>;
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-[var(--muted)]">Preparing workspace...</div>;
  }

  if (!user) {
    return <>{children}</>;
  }

  const requiresSelection = companies.length > 1;
  if (
    pathname !== '/select-company' &&
    requiresSelection &&
    (!appContext.companyGateSeenInSession ||
      !appContext.activeCompanyId ||
      !companies.some((company) => company.id === appContext.activeCompanyId))
  ) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-[var(--muted)]">Loading company workspace...</div>;
  }

  return <>{children}</>;
}
