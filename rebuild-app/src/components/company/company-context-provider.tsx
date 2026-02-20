"use client";

import { useEffect } from 'react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { getUserCompanyPreference, setUserCompanyPreference, subscribeCompanies } from '@/lib/firebase/company-store';
import { subscribeCompanyMembers } from '@/lib/firebase/member-store';
import { useAppState } from '@/components/shell/app-state';
import { applyCompanyTheme } from '@/lib/theme/company-theme';

export function CompanyContextProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const {
    appContext,
    setAppContext,
    companies,
    setCompanies,
    setActiveCompany,
    markCompanyGateSeen,
    setMembersByCompany,
  } = useAppState();

  useEffect(() => {
    if (!user) return;

    let active = true;
    getUserCompanyPreference(user.uid).then((pref) => {
      if (!active) return;
      setAppContext((prev) => ({
        ...prev,
        workspaceId: pref.lastActiveWorkspaceId || prev.workspaceId || 'workspace-primary',
        userId: user.uid,
      }));

      const hasActiveInSession =
        typeof window !== 'undefined' && Boolean(window.sessionStorage.getItem('sb_active_company_id'));
      if (!hasActiveInSession && pref.lastActiveCompanyId) {
        setActiveCompany(pref.lastActiveCompanyId);
      }
    });

    return () => {
      active = false;
    };
  }, [setActiveCompany, setAppContext, user]);

  useEffect(() => {
    if (!user || loading) return;
    return subscribeCompanies(appContext.workspaceId, (next) => setCompanies(next));
  }, [appContext.workspaceId, loading, setCompanies, user]);

  useEffect(() => {
    if (!user || !appContext.activeCompanyId) return;
    setUserCompanyPreference(user.uid, appContext.workspaceId, appContext.activeCompanyId).catch(() => undefined);
    return subscribeCompanyMembers(appContext.workspaceId, appContext.activeCompanyId, (members) => {
      setMembersByCompany((prev) => ({ ...prev, [appContext.activeCompanyId as string]: members }));
    });
  }, [appContext.activeCompanyId, appContext.workspaceId, setMembersByCompany, user]);

  useEffect(() => {
    if (!user) return;

    if (!companies.length) {
      if (appContext.activeCompanyId) {
        setActiveCompany(null);
      }
      if (!appContext.companyGateSeenInSession) {
        markCompanyGateSeen(true);
      }
      return;
    }

    if (companies.length === 1) {
      const onlyCompanyId = companies[0].id;
      if (appContext.activeCompanyId !== onlyCompanyId) {
        setActiveCompany(onlyCompanyId);
      }
      if (!appContext.companyGateSeenInSession) {
        markCompanyGateSeen(true);
      }
      return;
    }

    if (appContext.activeCompanyId && !companies.some((company) => company.id === appContext.activeCompanyId)) {
      setActiveCompany(null);
      if (appContext.companyGateSeenInSession) {
        markCompanyGateSeen(false);
      }
    }
  }, [
    appContext.activeCompanyId,
    appContext.companyGateSeenInSession,
    companies,
    markCompanyGateSeen,
    setActiveCompany,
    user,
  ]);

  useEffect(() => {
    const activeCompany = companies.find((company) => company.id === appContext.activeCompanyId) || null;
    applyCompanyTheme(activeCompany);
  }, [appContext.activeCompanyId, companies]);

  return <>{children}</>;
}
