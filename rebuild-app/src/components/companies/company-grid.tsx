"use client";

import Link from 'next/link';
import { useState } from 'react';
import { Layers, Mic2, Palette, Sparkles, Users } from 'lucide-react';
import { EntityCard } from '@/components/ui/entity-card';
import { useAppState } from '@/components/shell/app-state';
import { createCompany } from '@/lib/firebase/company-store';
import type { InspectorEntityPayload } from '@/types/interfaces';

const sectionIcons = [Layers, Mic2, Palette, Users, Sparkles];
const sectionLabels = ['Identity', 'Voice', 'Visual', 'Audience', 'Content'];

export function CompanyGrid() {
  const { appContext, companies, setActiveCompany, markCompanyGateSeen } = useAppState();
  const [createName, setCreateName] = useState('');
  const [primary, setPrimary] = useState('#5ba0ff');
  const [secondary, setSecondary] = useState('#2f436b');
  const [accent, setAccent] = useState('#98c2ff');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function onCreateCompany() {
    const name = createName.trim();
    if (!name) {
      setStatus('Company name is required.');
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const company = await createCompany({
        workspaceId: appContext.workspaceId,
        userId: appContext.userId,
        name,
        branding: { primary, secondary, accent },
      });
      setCreateName('');
      setActiveCompany(company.id);
      markCompanyGateSeen(true);
      setStatus(`Created ${company.name}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to create company');
    } finally {
      setLoading(false);
    }
  }

  if (!companies.length) {
    return (
      <section className="panel">
        <h3>No companies yet</h3>
        <p>Create your first company to unlock company-scoped analytics, assets, and invites.</p>
        <div className="form-grid two-col">
          <label className="two-col-span">
            <span>Company name</span>
            <input
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              placeholder="Acme Media Group"
            />
          </label>
          <label>
            <span>Primary color</span>
            <input type="color" value={primary} onChange={(event) => setPrimary(event.target.value)} />
          </label>
          <label>
            <span>Secondary color</span>
            <input type="color" value={secondary} onChange={(event) => setSecondary(event.target.value)} />
          </label>
          <label>
            <span>Accent color</span>
            <input type="color" value={accent} onChange={(event) => setAccent(event.target.value)} />
          </label>
        </div>
        <div className="button-row">
          <button type="button" className="btn-primary" onClick={onCreateCompany} disabled={loading}>
            {loading ? 'Creating...' : 'Create Company'}
          </button>
          <Link className="btn-ghost" href="/select-company">Open Selector</Link>
        </div>
        {status ? <p className="text-sm text-[var(--muted)]">{status}</p> : null}
      </section>
    );
  }

  return (
    <section className="company-grid">
      {companies.map((company) => {
        const entity: InspectorEntityPayload = {
          kind: 'company',
          id: company.id,
          title: company.name,
          subtitle: 'Brand Intelligence',
          status: `${company.completionScore}% complete`,
          summary: company.sections.identity.mission || 'Complete company sections to improve AI context quality.',
          versionHistory: [],
          approvals: [],
          auditLog: [`Updated ${new Date(company.updatedAt).toLocaleString()}`],
        };
        return (
          <EntityCard key={company.id} entity={entity} className="company-card">
            <div className="flex items-center justify-between gap-2">
              <h3>{company.name}</h3>
              <span className="badge">{company.completionScore}%</span>
            </div>
            <p className="text-sm text-[var(--muted)]">{company.sections.identity.tagline || 'No tagline set'}</p>

            <div className="company-section-pills">
              {sectionLabels.map((label, index) => {
                const Icon = sectionIcons[index];
                return (
                  <span key={label} className="chip">
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </span>
                );
              })}
            </div>

            <div className="button-row">
              <Link className="btn-ghost" href={`/companies/${company.id}`}>Open Profile</Link>
              <Link className="btn-primary" href={`/companies/${company.id}/intake`}>Open Intake</Link>
            </div>
          </EntityCard>
        );
      })}
    </section>
  );
}
