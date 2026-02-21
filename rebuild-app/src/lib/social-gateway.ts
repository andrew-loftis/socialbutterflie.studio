import type { User } from 'firebase/auth';

export type SocialProvider = 'instagram' | 'facebook' | 'youtube' | 'tiktok';

type ConnectionRecord = {
  id?: string;
  provider?: string;
  label?: string;
  page_id?: string;
  ig_user_id?: string;
  expires_at?: number | null;
};

function requireContext(user: User | null, workspaceId: string) {
  if (!user?.uid) throw new Error('Sign in is required.');
  if (!workspaceId) throw new Error('Workspace id is required.');
  return { userId: user.uid, workspaceId };
}

export async function listSocialConnections(user: User | null, workspaceId: string) {
  const { userId, workspaceId: orgId } = requireContext(user, workspaceId);
  const url = `/.netlify/functions/api?path=/connections&user_id=${encodeURIComponent(userId)}&org_id=${encodeURIComponent(orgId)}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as ConnectionRecord[];
  return data;
}

export async function listSocialConnectionsByCompany(user: User | null, workspaceId: string, companyId: string) {
  const { userId, workspaceId: orgId } = requireContext(user, workspaceId);
  if (!companyId) throw new Error('Company id is required.');
  const url = `/.netlify/functions/api?path=/connections&user_id=${encodeURIComponent(userId)}&org_id=${encodeURIComponent(orgId)}&group_id=${encodeURIComponent(companyId)}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as ConnectionRecord[];
  return data;
}

export function beginSocialConnect(user: User | null, workspaceId: string, provider: SocialProvider, companyId?: string) {
  const { userId, workspaceId: orgId } = requireContext(user, workspaceId);
  const url = new URL('/.netlify/functions/auth', window.location.origin);
  url.searchParams.set('action', 'begin');
  url.searchParams.set('provider', provider);
  url.searchParams.set('user_id', userId);
  url.searchParams.set('org_id', orgId);
  if (companyId) {
    url.searchParams.set('group_id', companyId);
  }
  window.location.href = url.toString();
}

export async function disconnectSocialConnection(
  user: User | null,
  workspaceId: string,
  payload: { id?: string; provider: string }
) {
  const { userId, workspaceId: orgId } = requireContext(user, workspaceId);
  const res = await fetch(
    '/.netlify/functions/api?path=/disconnect',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: payload.id,
        provider: payload.provider,
        user_id: userId,
        org_id: orgId,
      }),
    }
  );
  if (!res.ok) throw new Error(await res.text());
}
