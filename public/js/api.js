function getRequestContext() {
  const userId = localStorage.getItem('sb_user_id') || '';
  const orgId = localStorage.getItem('sb_org_id') || '';
  const userRole = localStorage.getItem('sb_user_role') || 'editor';
  return {
    userId: userId.trim(),
    orgId: orgId.trim(),
    userRole: userRole.trim() || 'editor'
  };
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
  console.log('[API] connect() called with provider:', provider);
  const w = 720; const h = 880;
  const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
  const top = window.screenY + Math.max(0, (window.outerHeight - h) / 2);
  const features = `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`;
  
  // Check if we have a pending group ID
  const groupId = localStorage.getItem('pendingGroupId');
  const groupParam = groupId ? '&group_id=' + encodeURIComponent(groupId) : '';
  const ctx = getRequestContext();
  const userParam = ctx.userId ? '&user_id=' + encodeURIComponent(ctx.userId) : '';
  const orgParam = ctx.orgId ? '&org_id=' + encodeURIComponent(ctx.orgId) : '';
  const roleParam = ctx.userRole ? '&user_role=' + encodeURIComponent(ctx.userRole) : '';
  const url =
    '/.netlify/functions/auth?provider=' +
    encodeURIComponent(provider) +
    '&action=begin' +
    groupParam +
    userParam +
    orgParam +
    roleParam;
  
  console.log('[API] Opening popup with URL:', url);
  const popup = window.open(url, 'auth_' + provider, features);
  if (!popup) {
    console.warn('[API] Popup blocked, redirecting...');
    // Fallback to full redirect if popup blocked
    window.location.href = url;
    return;
  }
  console.log('[API] Popup opened, polling...');
  const start = Date.now();
  const interval = setInterval(async () => {
    if (popup.closed) {
      clearInterval(interval);
      try {
        // Re-fetch connections to update UI (caller listens to event)
        const evt = new CustomEvent('connections:refresh');
        window.dispatchEvent(evt);
      } catch (e) { /* ignore */ }
    } else if (Date.now() - start > 5 * 60 * 1000) {
      // Timeout after 5 minutes
      clearInterval(interval);
      try { popup.close(); } catch (_) {}
    }
  }, 600);
}
