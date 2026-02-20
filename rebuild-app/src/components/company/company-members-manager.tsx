"use client";

import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { useAppState } from '@/components/shell/app-state';
import { createCompanyInvite, subscribeCompanyInvites } from '@/lib/firebase/invite-store';
import { subscribeCompanyMembers } from '@/lib/firebase/member-store';
import type { CompanyInvite, CompanyMember, Role } from '@/types/interfaces';

type Props = {
  companyId: string;
};

export function CompanyMembersManager({ companyId }: Props) {
  const { appContext, setMembersByCompany } = useAppState();
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [invites, setInvites] = useState<CompanyInvite[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('client');
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    return subscribeCompanyMembers(appContext.workspaceId, companyId, (value) => {
      setMembers(value);
      setMembersByCompany((prev) => ({ ...prev, [companyId]: value }));
    });
  }, [appContext.workspaceId, companyId, setMembersByCompany]);

  useEffect(() => {
    return subscribeCompanyInvites(appContext.workspaceId, companyId, setInvites);
  }, [appContext.workspaceId, companyId]);

  async function onInvite() {
    if (!email.trim()) {
      setStatus('Email is required.');
      return;
    }
    setStatus(null);
    try {
      await createCompanyInvite(appContext.workspaceId, companyId, {
        email,
        role,
        createdBy: appContext.userId,
      });
      setEmail('');
      setStatus('Invite created.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not create invite');
    }
  }

  return (
    <section className="panel">
      <h3>Company members</h3>
      <div className="form-grid two-col">
        <label className="two-col-span">
          <span>Client email</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="client@company.com" />
        </label>
        <label>
          <span>Role</span>
          <select value={role} onChange={(event) => setRole(event.target.value as Role)}>
            <option value="admin">Admin</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
            <option value="client">Client</option>
          </select>
        </label>
        <label>
          <span>Pending invites</span>
          <input readOnly value={String(invites.filter((invite) => invite.status === 'pending').length)} />
        </label>
      </div>
      <div className="button-row">
        <button type="button" className="btn-primary" onClick={onInvite}>
          <Send className="h-4 w-4" /> Send invite
        </button>
      </div>
      <div className="member-management-list">
        {members.length ? (
          members.map((member) => (
            <div key={member.id} className="selector-member-row">
              <span>{member.name || member.email}</span>
              <span className="badge">{member.role} | {member.status}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-[var(--muted)]">No members yet for this company.</p>
        )}
      </div>
      {status ? <p className="text-sm text-[var(--muted)]">{status}</p> : null}
    </section>
  );
}
