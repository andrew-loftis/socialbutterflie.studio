"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, Plus, Send } from 'lucide-react';
import { CompanyTile } from '@/components/company/company-tile';
import { getSelectorPreset } from '@/components/company/company-selector-presets';
import { useAppState } from '@/components/shell/app-state';
import { createCompany } from '@/lib/firebase/company-store';
import { createCompanyInvite, subscribeCompanyInvites } from '@/lib/firebase/invite-store';
import { subscribeCompanyMembers } from '@/lib/firebase/member-store';
import type { CompanyInvite, CompanyMember, Role } from '@/types/interfaces';

const PAGE_SIZE = 10;

type Props = {
  nextHref?: string;
};

export function CompanySelector({ nextHref = '/dashboard' }: Props) {
  const router = useRouter();
  const {
    appContext,
    companies,
    membersByCompany,
    setMembersByCompany,
    setActiveCompany,
    markCompanyGateSeen,
  } = useAppState();
  const [page, setPage] = useState(0);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(appContext.activeCompanyId);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [primary, setPrimary] = useState('#5ba0ff');
  const [secondary, setSecondary] = useState('#2f436b');
  const [accent, setAccent] = useState('#98c2ff');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('client');
  const [invites, setInvites] = useState<CompanyInvite[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(companies.length / PAGE_SIZE));
  const pageStart = page * PAGE_SIZE;
  const pageCompanies = companies.slice(pageStart, pageStart + PAGE_SIZE);
  const preset = getSelectorPreset(pageCompanies.length);

  useEffect(() => {
    if (!pageCompanies.length) return;
    if (selectedCompanyId && pageCompanies.some((company) => company.id === selectedCompanyId)) return;
    setSelectedCompanyId(pageCompanies[0].id);
  }, [pageCompanies, selectedCompanyId]);

  useEffect(() => {
    if (!selectedCompanyId) return;
    const selected = companies.find((company) => company.id === selectedCompanyId);
    if (!selected) return;
    return subscribeCompanyMembers(appContext.workspaceId, selected.id, (members) => {
      setMembersByCompany((prev) => ({ ...prev, [selected.id]: members }));
    });
  }, [appContext.workspaceId, companies, selectedCompanyId, setMembersByCompany]);

  useEffect(() => {
    if (!selectedCompanyId) {
      setInvites([]);
      return;
    }
    return subscribeCompanyInvites(appContext.workspaceId, selectedCompanyId, setInvites);
  }, [appContext.workspaceId, selectedCompanyId]);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) || null,
    [companies, selectedCompanyId]
  );

  const selectedMembers: CompanyMember[] = selectedCompanyId ? membersByCompany[selectedCompanyId] || [] : [];

  async function onCreateCompany() {
    const name = createName.trim();
    const hadCompanies = companies.length > 0;
    if (!name) {
      setStatus('Company name is required.');
      return;
    }
    setLoadingCreate(true);
    setStatus(null);
    try {
      const company = await createCompany({
        workspaceId: appContext.workspaceId,
        userId: appContext.userId,
        name,
        branding: { primary, secondary, accent },
        coverFile,
      });
      setCreateName('');
      setCoverFile(null);
      setSelectedCompanyId(company.id);
      if (!hadCompanies) {
        setActiveCompany(company.id);
        markCompanyGateSeen(true);
        router.replace(nextHref);
        return;
      }
      setStatus('Company created. Select it to continue.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to create company');
    } finally {
      setLoadingCreate(false);
    }
  }

  async function onSendInvite() {
    if (!selectedCompanyId) {
      setStatus('Select a company first.');
      return;
    }
    if (!inviteEmail.trim()) {
      setStatus('Invite email is required.');
      return;
    }
    setStatus(null);
    try {
      await createCompanyInvite(appContext.workspaceId, selectedCompanyId, {
        email: inviteEmail,
        role: inviteRole,
        createdBy: appContext.userId,
      });
      setInviteEmail('');
      setStatus('Invite created and member added as pending.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to create invite');
    }
  }

  return (
    <div className="company-selector-page">
      <header className="selector-header">
        <div>
          <p className="kicker">Session setup</p>
          <h1>Select your company workspace</h1>
          <p>Choose the company you are working on. This scopes analytics, content, assets, and automation context.</p>
        </div>
      </header>

      {pageCompanies.length ? (
        <section
          className="company-select-grid"
          style={{
            gridTemplateColumns: `repeat(${preset.columns}, minmax(0, 1fr))`,
            gridAutoRows: `${preset.rowHeight}px`,
          }}
        >
          {pageCompanies.map((company, index) => {
            const layout = preset.items[index] || { colStart: 1, colSpan: 4, rowStart: index + 1, rowSpan: 1 };
            return (
              <CompanyTile
                key={company.id}
                company={company}
                selected={company.id === selectedCompanyId}
                members={membersByCompany[company.id] || []}
                featured={layout.featured}
                clipPath={layout.clipPath}
                style={{
                  gridColumn: `${layout.colStart} / span ${layout.colSpan}`,
                  gridRow: `${layout.rowStart} / span ${layout.rowSpan}`,
                }}
                onSelect={() => {
                  setSelectedCompanyId(company.id);
                  setActiveCompany(company.id);
                  markCompanyGateSeen(true);
                  router.replace(nextHref);
                }}
                onManage={() => router.push(`/companies/${company.id}`)}
              />
            );
          })}
        </section>
      ) : (
        <section className="selector-empty panel">
          <h3>No companies yet</h3>
          <p>Create your first company below to start a clean workspace.</p>
        </section>
      )}

      {companies.length > PAGE_SIZE ? (
        <div className="selector-pagination">
          <button type="button" className="btn-ghost" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <span>Page {page + 1} / {totalPages}</span>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <section className="selector-bottom-grid">
        <article className="panel">
          <h3>Create company</h3>
          <div className="form-grid two-col">
            <label className="two-col-span">
              <span>Company name</span>
              <input value={createName} onChange={(event) => setCreateName(event.target.value)} placeholder="Acme Media Group" />
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
            <label>
              <span>Cover image (optional)</span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setCoverFile(event.target.files?.[0] || null)}
              />
            </label>
          </div>
          <div className="button-row">
            <button type="button" className="btn-primary" onClick={onCreateCompany} disabled={loadingCreate}>
              <Plus className="h-4 w-4" /> {loadingCreate ? 'Creating...' : 'Create Company'}
            </button>
          </div>
        </article>

        <article className="panel">
          <h3>Manage members</h3>
          {selectedCompany ? <p>Selected company: <strong>{selectedCompany.name}</strong></p> : <p>Select a company to manage members.</p>}
          <div className="form-grid two-col">
            <label className="two-col-span">
              <span>Client email</span>
              <input value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="client@company.com" />
            </label>
            <label>
              <span>Role</span>
              <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as Role)}>
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
                <option value="client">Client</option>
              </select>
            </label>
            <label>
              <span>Invites pending</span>
              <input value={String(invites.filter((invite) => invite.status === 'pending').length)} readOnly />
            </label>
          </div>
          <div className="button-row">
            <button type="button" className="btn-ghost" onClick={onSendInvite}>
              <Send className="h-4 w-4" /> Send Invite
            </button>
            {selectedCompany ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setActiveCompany(selectedCompany.id);
                  markCompanyGateSeen(true);
                  router.replace(nextHref);
                }}
              >
                Continue with {selectedCompany.name}
              </button>
            ) : null}
          </div>
          <div className="selector-member-list">
            {(selectedMembers.length ? selectedMembers : []).slice(0, 8).map((member) => (
              <div key={member.id} className="selector-member-row">
                <span>{member.name || member.email}</span>
                <span className="badge">{member.role} | {member.status}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      {status ? <p className="selector-status">{status}</p> : null}
    </div>
  );
}
