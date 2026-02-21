import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase/client';
import { mapFirebaseError } from '@/lib/firebase/errors';
import { activateMemberByEmail, addPendingMember } from '@/lib/firebase/member-store';
import { ensureWorkspaceUserAccess } from '@/lib/firebase/workspace-access-store';
import type { CompanyInvite, Role } from '@/types/interfaces';

const memoryInvites: Array<CompanyInvite & { workspaceId: string }> = [];
const memoryListeners = new Map<string, Set<(invites: CompanyInvite[]) => void>>();

function inviteKey(workspaceId: string, companyId: string) {
  return `${workspaceId}:${companyId}`;
}

function notify(workspaceId: string, companyId: string) {
  const key = inviteKey(workspaceId, companyId);
  const listeners = memoryListeners.get(key);
  if (!listeners) return;
  const value = memoryInvites.filter((entry) => entry.workspaceId === workspaceId && entry.companyId === companyId);
  for (const listener of listeners) listener(value);
}

export function subscribeCompanyInvites(
  workspaceId: string,
  companyId: string,
  callback: (invites: CompanyInvite[]) => void,
  onError?: (message: string) => void
): Unsubscribe {
  if (!firestore) {
    const key = inviteKey(workspaceId, companyId);
    const listeners = memoryListeners.get(key) || new Set();
    listeners.add(callback);
    memoryListeners.set(key, listeners);
    callback(memoryInvites.filter((entry) => entry.workspaceId === workspaceId && entry.companyId === companyId));
    return () => {
      const next = memoryListeners.get(key);
      if (!next) return;
      next.delete(callback);
    };
  }

  const invitesRef = collection(firestore, 'workspaces', workspaceId, 'companies', companyId, 'invites');
  return onSnapshot(
    invitesRef,
    (snapshot) => {
      const invites = snapshot.docs
        .map((entry) => entry.data() as CompanyInvite)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      callback(invites);
    },
    (error) => {
      onError?.(mapFirebaseError(error, 'firestore'));
    }
  );
}

export function buildInviteUrl(token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  if (!base) return `/invite/${token}`;
  return `${base.replace(/\/+$/, '')}/invite/${token}`;
}

export async function createCompanyInvite(
  workspaceId: string,
  companyId: string,
  input: { email: string; role: Role; createdBy: string }
): Promise<CompanyInvite> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7).toISOString();
  const invite: CompanyInvite = {
    id: '',
    companyId,
    email: input.email.trim().toLowerCase(),
    role: input.role,
    token: crypto.randomUUID().replace(/-/g, ''),
    status: 'pending',
    expiresAt,
    createdAt: now.toISOString(),
    createdBy: input.createdBy,
  };
  // Use token as doc id so we can address it deterministically from client + rules.
  invite.id = invite.token;

  await addPendingMember(workspaceId, companyId, {
    email: invite.email,
    role: invite.role,
    invitedBy: invite.createdBy,
  });

  if (!firestore) {
    memoryInvites.unshift({ ...invite, workspaceId });
    notify(workspaceId, companyId);
    return invite;
  }

  try {
    const inviteRef = doc(firestore, 'workspaces', workspaceId, 'companies', companyId, 'invites', invite.token);
    await setDoc(inviteRef, invite, { merge: true });

    // Mirror to a top-level collection for invite acceptance without requiring prior company read access.
    await setDoc(
      doc(firestore, 'invite_tokens', invite.token),
      {
        ...invite,
        workspaceId,
        companyId,
      },
      { merge: true }
    );
    return invite;
  } catch (error) {
    throw new Error(mapFirebaseError(error, 'firestore'));
  }
}

function mapInvite(docSnap: QueryDocumentSnapshot) {
  return docSnap.data() as CompanyInvite;
}

export async function getInviteByToken(token: string) {
  if (!firestore) {
    const invite = memoryInvites.find((entry) => entry.token === token);
    if (!invite) return null;
    return { workspaceId: invite.workspaceId, invite };
  }

  try {
    const tokenRef = doc(firestore, 'invite_tokens', token);
    const tokenSnap = await getDoc(tokenRef);
    if (tokenSnap.exists()) {
      const data = tokenSnap.data() as CompanyInvite & { workspaceId: string; companyId: string };
      return {
        workspaceId: data.workspaceId,
        companyId: data.companyId,
        inviteId: token,
        ref: tokenRef,
        invite: data as CompanyInvite,
      };
    }

    // Legacy fallback: invites stored only as a subcollection, resolved via collectionGroup.
    const q = query(collectionGroup(firestore, 'invites'), where('token', '==', token), limit(1));
    const snap = await getDocs(q);
    if (!snap.docs.length) return null;
    const inviteDoc = snap.docs[0];
    const invite = mapInvite(inviteDoc);
    const companyRef = inviteDoc.ref.parent.parent;
    const workspaceRef = companyRef?.parent.parent;
    if (!companyRef || !workspaceRef) return null;

    return {
      workspaceId: workspaceRef.id,
      companyId: companyRef.id,
      inviteId: inviteDoc.id,
      ref: inviteDoc.ref,
      invite,
    };
  } catch {
    return null;
  }
}

export async function acceptInviteByToken(token: string, user: { uid: string; email: string; name?: string }) {
  const resolved = await getInviteByToken(token);
  if (!resolved) {
    return { ok: false as const, reason: 'Invite not found' };
  }

  const invite = resolved.invite;
  if (invite.status !== 'pending') {
    return { ok: false as const, reason: 'Invite already used or revoked' };
  }

  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return { ok: false as const, reason: 'Signed-in email does not match invite email' };
  }

  if (new Date(invite.expiresAt).getTime() < Date.now()) {
    if (firestore) {
      // Best-effort: mark expired in both token mirror + company invite doc (if present).
      try {
        await updateDoc(doc(firestore, 'invite_tokens', token), { status: 'expired' });
      } catch {
        // ignore
      }
      try {
        const workspaceId = resolved.workspaceId;
        const companyId = ('companyId' in resolved && resolved.companyId) ? resolved.companyId : invite.companyId;
        if (companyId) {
          await updateDoc(doc(firestore, 'workspaces', workspaceId, 'companies', companyId, 'invites', token), { status: 'expired' });
        }
      } catch {
        // ignore
      }
    }
    return { ok: false as const, reason: 'Invite expired' };
  }

  const workspaceId = resolved.workspaceId;
  const companyId = ('companyId' in resolved && resolved.companyId) ? resolved.companyId : invite.companyId;
  if (!companyId) {
    return { ok: false as const, reason: 'Invite is missing company id' };
  }

  // Ensure the user has workspace access doc so company-level rules can be evaluated.
  await ensureWorkspaceUserAccess({
    workspaceId,
    uid: user.uid,
    email: user.email || `${user.uid}@local.test`,
  });

  // Create/merge uid-based membership doc. This is the source of truth for company authorization + listing.
  if (firestore) {
    const memberRef = doc(firestore, 'workspaces', workspaceId, 'companies', companyId, 'members', user.uid);
    await setDoc(
      memberRef,
      {
        id: user.uid,
        workspaceId,
        companyId,
        email: invite.email.toLowerCase(),
        uid: user.uid,
        name: user.name || '',
        role: invite.role,
        status: 'active',
        invitedBy: invite.createdBy,
        invitedAt: invite.createdAt,
        joinedAt: new Date().toISOString(),
        inviteToken: token,
      },
      { merge: true }
    );

    // Mark accepted in both token mirror + company invite doc (token-id) for admin UI.
    await updateDoc(doc(firestore, 'invite_tokens', token), { status: 'accepted', acceptedByUid: user.uid });
    await updateDoc(doc(firestore, 'workspaces', workspaceId, 'companies', companyId, 'invites', token), {
      status: 'accepted',
      acceptedByUid: user.uid,
    });
  } else {
    // Legacy memory flow.
    await activateMemberByEmail(workspaceId, companyId, invite.email, user.uid, user.name || '', invite.role);
    const memoryInvite = memoryInvites.find((entry) => entry.token === token);
    if (memoryInvite) {
      memoryInvite.status = 'accepted';
      memoryInvite.acceptedByUid = user.uid;
      notify(workspaceId, companyId);
    }
  }

  return { ok: true as const, workspaceId, companyId };
}
