import fetch from 'node-fetch';
import { listConnections, updateConnection } from '../../shared/storage.js';

/**
 * Refresh long/short lived tokens where supported (Google, TikTok; Meta uses 60-day tokens, refresh via extension).
 */
export async function handler() {
  const conns = await listConnections();
  const now = Date.now();

  for (const c of conns) {
    try {
      if (c.provider === 'youtube' && c.refresh_token && (c.expires_at && now > c.expires_at - 5*60*1000)) {
        const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            grant_type: 'refresh_token',
            refresh_token: c.refresh_token
          })
        }).then(r=>r.json());
        if (tokenResp.access_token) {
          await updateConnection('youtube', { access_token: tokenResp.access_token, expires_at: now + tokenResp.expires_in*1000 });
        }
      }
      // Meta: convert to long-lived whenever possible; no periodic refresh endpoint besides re-auth or debug token flow.
      // TikTok: similar refresh flow if refresh_token present (not implemented here).
    } catch (e) {
      console.error('Refresh failed', c.provider, e);
    }
  }

  return { statusCode: 200, body: 'ok' };
}
