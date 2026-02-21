function getRequestContext() {
  const userId = localStorage.getItem('sb_user_id') || '';
  const orgId = localStorage.getItem('sb_org_id') || '';
  const userRole = localStorage.getItem('sb_user_role') || 'editor';
  return { userId: userId.trim(), orgId: orgId.trim(), userRole: userRole.trim() || 'editor' };
}

function contextHeaders() {
  const ctx = getRequestContext();
  const headers = {};
  if (ctx.userId) headers['X-User-Id'] = ctx.userId;
  if (ctx.orgId) headers['X-Org-Id'] = ctx.orgId;
  if (ctx.userRole) headers['X-User-Role'] = ctx.userRole;
  return headers;
}

export async function apiGet(path) {
  const res = await fetch('/.netlify/functions/api?path=' + encodeURIComponent(path), {
    credentials: 'include',
    headers: contextHeaders()
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
export async function apiPost(path, body = {}) {
  const res = await fetch('/.netlify/functions/api?path=' + encodeURIComponent(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...contextHeaders() },
    credentials: 'include',
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
export function connect(provider) {
  const ctx = getRequestContext();
  const userParam = ctx.userId ? '&user_id=' + encodeURIComponent(ctx.userId) : '';
  const orgParam = ctx.orgId ? '&org_id=' + encodeURIComponent(ctx.orgId) : '';
  const roleParam = ctx.userRole ? '&user_role=' + encodeURIComponent(ctx.userRole) : '';
  window.location.href =
    '/.netlify/functions/auth?provider=' +
    encodeURIComponent(provider) +
    '&action=begin' +
    userParam +
    orgParam +
    roleParam;
}
