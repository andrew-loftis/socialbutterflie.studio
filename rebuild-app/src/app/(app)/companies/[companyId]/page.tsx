"use client";

import Link from 'next/link';
import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { CompanyMembersManager } from '@/components/company/company-members-manager';
import { CompanyProfileEditor } from '@/components/companies/company-profile-editor';
import { useAppState } from '@/components/shell/app-state';
import { PageHeader } from '@/components/ui/page-header';

export default function CompanyDetailPage() {
  const params = useParams<{ companyId: string }>();
  const { companies, setActiveCompany, markCompanyGateSeen } = useAppState();
  const company = companies.find((entry) => entry.id === params.companyId) || null;

  useEffect(() => {
    if (!company) return;
    setActiveCompany(company.id);
    markCompanyGateSeen(true);
  }, [company, markCompanyGateSeen, setActiveCompany]);

  if (!company) {
    return (
      <section className="panel">
        <h3>Company not found</h3>
        <p>This company may have been removed or is not loaded in the current workspace.</p>
        <div className="button-row">
          <Link className="btn-primary" href="/select-company">Select company</Link>
          <Link className="btn-ghost" href="/companies">Back to companies</Link>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title={company.name}
        subtitle={`Brand profile | ${company.completionScore}% complete`}
        actions={<Link className="btn-primary" href={`/companies/${company.id}/intake`}>Open Intake Wizard</Link>}
      />
      <CompanyMembersManager companyId={company.id} />
      <CompanyProfileEditor initialCompany={company} />
    </div>
  );
}


