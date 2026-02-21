"use client";

import { useParams } from 'next/navigation';
import { IntakeWizard } from '@/components/companies/intake-wizard';
import { useAppState } from '@/components/shell/app-state';
import { PageHeader } from '@/components/ui/page-header';

export default function IntakePage() {
  const params = useParams<{ companyId: string }>();
  const { companies } = useAppState();
  const company = companies.find((entry) => entry.id === params.companyId) || null;
  const companyLabel = company?.name || params.companyId;

  return (
    <div className="space-y-3">
      <PageHeader
        title="Company Intake Wizard"
        subtitle={`Guided questionnaire for ${companyLabel} with autosave and upload support.`}
      />
      <IntakeWizard companyId={params.companyId} />
    </div>
  );
}
