"use client";

import { useEffect, useState } from 'react';
import { Copy, Send } from 'lucide-react';
import { useAppState } from '@/components/shell/app-state';
import { buildInviteUrl, createCompanyInvite, subscribeCompanyInvites } from '@/lib/firebase/invite-store';
import { subscribeCompanyMembers, updateMemberRole } from '@/lib/firebase/member-store';
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
    return subscribeCompanyMembers(
      appContext.workspaceId,
      companyId,
      (value) => {
        setMembers(value);
        setMembersByCompany((prev) => ({ ...prev, [companyId]: value }));
      },
      (message) => setStatus(message)
    );
  }, [appContext.workspaceId, companyId, setMembersByCompany]);

  useEffect(() => {
    return subscribeCompanyInvites(appContext.workspaceId, companyId, setInvites, (message) => setStatus(message));
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
      setStatus('Invite created. Share the invite link below.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not create invite');
    }
  }

  async function onUpdateMemberRole(memberId: string, nextRole: Role) {
    setStatus(null);
    try {
      await updateMemberRole(appContext.workspaceId, companyId, memberId, nextRole);
      setStatus('Member role updated.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not update member role');
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
              <div className="flex items-center gap-2">
                <select
                  value={member.role}
                  onChange={(event) => onUpdateMemberRole(member.id, event.target.value as Role)}
                  className="h-8 rounded-md border border-[var(--border)] bg-[var(--panel-soft)] px-2 text-xs"
                >
                  <option value="admin">Admin</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                  <option value="client">Client</option>
                </select>
                <span className="badge">{member.status}</span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-[var(--muted)]">No members yet for this company.</p>
        )}
      </div>
      {invites.length ? (
        <div className="member-management-list">
          {invites.slice(0, 8).map((invite) => {
            const inviteUrl = buildInviteUrl(invite.token);
            return (
              <div key={invite.id} className="selector-member-row">
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{invite.email}</span>
                <div className="flex items-center gap-2">
                  <span className="badge">{invite.role} | {invite.status}</span>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(inviteUrl);
                        setStatus(`Invite link copied for ${invite.email}.`);
                      } catch {
                        setStatus('Could not copy invite link.');
                      }
                    }}
                  >
                    <Copy className="h-4 w-4" /> Copy link
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
      {status ? <p className="text-sm text-[var(--muted)]">{status}</p> : null}
    </section>
  );
}
