"use client";

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Zap } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { useAppState } from '@/components/shell/app-state';
import { CompanyIntegrations } from '@/components/integrations/company-integrations';

export default function CompanyIntegrationsPage() {
  const params = useParams<{ companyId: string }>();
  const { companies } = useAppState();
  const company = companies.find((entry) => entry.id === params.companyId) || null;

  if (!company) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><Zap className="h-6 w-6" /></div>
        <h3>Company not found</h3>
        <p>Select a company and try again.</p>
        <Link className="btn-primary" href="/select-company">Choose company</Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title={`${company.name} Integrations`}
        subtitle="Connect channels for this company only."
        actions={<Link className="btn-ghost btn-sm" href={`/companies/${company.id}`}>Back to company</Link>}
      />
      <CompanyIntegrations companyId={company.id} companyName={company.name} />
    </div>
  );
}
