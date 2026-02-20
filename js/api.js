export async function apiGet(path) {
  const res = await fetch('/.netlify/functions/api?path=' + encodeURIComponent(path), { credentials: 'include' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
export async function apiPost(path, body = {}) {
  const res = await fetch('/.netlify/functions/api?path=' + encodeURIComponent(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
export function connect(provider) {
  window.location.href = '/.netlify/functions/auth?provider=' + encodeURIComponent(provider) + '&action=begin';
}
