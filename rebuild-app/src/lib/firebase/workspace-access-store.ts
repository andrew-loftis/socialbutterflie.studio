import { doc, getDoc, setDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase/client';
import type { Role } from '@/types/interfaces';

type WorkspaceAccessDoc = {
  uid: string;
  email: string;
  workspaceRole: Role;
  status: 'active' | 'revoked';
  companyRoles: Record<string, Role>;
  createdAt: string;
  updatedAt: string;
};

const memoryAccess = new Map<string, WorkspaceAccessDoc>();

const ROLE_WEIGHT: Record<Role, number> = {
  client: 1,
  viewer: 2,
  editor: 3,
  admin: 4,
};

function accessKey(workspaceId: string, uid: string) {
  return `${workspaceId}:${uid}`;
}

function maxRole(a: Role, b: Role): Role {
  return ROLE_WEIGHT[a] >= ROLE_WEIGHT[b] ? a : b;
}

export async function upsertWorkspaceUserRole(input: {
  workspaceId: string;
  uid: string;
  email: string;
  companyId: string;
  role: Role;
  workspaceRoleHint?: Role;
}) {
  const now = new Date().toISOString();
  const key = accessKey(input.workspaceId, input.uid);

  if (!firestore) {
    const current = memoryAccess.get(key);
    const nextWorkspaceRole = current
      ? maxRole(current.workspaceRole, input.workspaceRoleHint || input.role)
      : (input.workspaceRoleHint || input.role);
    memoryAccess.set(key, {
      uid: input.uid,
      email: input.email.trim().toLowerCase(),
      workspaceRole: nextWorkspaceRole,
      status: 'active',
      companyRoles: {
        ...(current?.companyRoles || {}),
        [input.companyId]: input.role,
      },
      createdAt: current?.createdAt || now,
      updatedAt: now,
    });
    return;
  }

  const accessRef = doc(firestore, 'workspaces', input.workspaceId, 'user_roles', input.uid);
  const snapshot = await getDoc(accessRef);
  const current = snapshot.exists() ? (snapshot.data() as WorkspaceAccessDoc) : null;

  const nextWorkspaceRole = current
    ? maxRole(current.workspaceRole, input.workspaceRoleHint || input.role)
    : (input.workspaceRoleHint || input.role);

  await setDoc(
    accessRef,
    {
      uid: input.uid,
      email: input.email.trim().toLowerCase(),
      workspaceRole: nextWorkspaceRole,
      status: 'active',
      companyRoles: {
        ...(current?.companyRoles || {}),
        [input.companyId]: input.role,
      },
      createdAt: current?.createdAt || now,
      updatedAt: now,
    } satisfies WorkspaceAccessDoc,
    { merge: true }
  );
}

export async function ensureWorkspaceUserAccess(input: {
  workspaceId: string;
  uid: string;
  email: string;
}) {
  const now = new Date().toISOString();
  const key = accessKey(input.workspaceId, input.uid);

  if (!firestore) {
    if (!memoryAccess.has(key)) {
      memoryAccess.set(key, {
        uid: input.uid,
        email: input.email.trim().toLowerCase(),
        workspaceRole: 'viewer',
        status: 'active',
        companyRoles: {},
        createdAt: now,
        updatedAt: now,
      });
    }
    return;
  }

  const accessRef = doc(firestore, 'workspaces', input.workspaceId, 'user_roles', input.uid);
  const snap = await getDoc(accessRef);
  if (snap.exists()) return;

  await setDoc(
    accessRef,
    {
      uid: input.uid,
      email: input.email.trim().toLowerCase(),
      workspaceRole: 'viewer',
      status: 'active',
      companyRoles: {},
      createdAt: now,
      updatedAt: now,
    } satisfies WorkspaceAccessDoc
  );
}
