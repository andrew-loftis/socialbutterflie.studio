"use client";

import Link from 'next/link';
import { Zap } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { useActiveCompany } from '@/lib/hooks/use-active-company';
import { CompanyIntegrations } from '@/components/integrations/company-integrations';

export default function IntegrationsPage() {
  const { activeCompany } = useActiveCompany();

  if (!activeCompany) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><Zap className="h-6 w-6" /></div>
        <h3>No company selected</h3>
        <p>Integrations are company-scoped. Select a company first.</p>
        <Link className="btn-primary" href="/select-company">Choose company</Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Integrations"
        subtitle={`Manage social connections for ${activeCompany.name}.`}
        actions={<Link className="btn-ghost btn-sm" href={`/companies/${activeCompany.id}/integrations`}>Open company page</Link>}
      />
      <CompanyIntegrations companyId={activeCompany.id} companyName={activeCompany.name} />
    </div>
  );
}
