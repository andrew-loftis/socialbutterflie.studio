import crypto from 'crypto';
import fetch from 'node-fetch';
import { upsertConnection, removeConnection, resolveContextFromEvent, logAudit } from '../../shared/storage.js';
import { fbBegin, fbExchangeCode, fbLongLived, resolveIGBusiness } from '../../shared/connectors/instagram.js';

export async function handler(event) {
  try {
    const url = new URL(event.rawUrl);
    const provider = url.searchParams.get('provider');
    const action = url.searchParams.get('action') || 'begin';
    const requestContext = resolveContextFromEvent(event, { allowQuery: true });

    if (action === 'begin') {
      // Allow passing account_group_id via state for assignment after OAuth
      const groupId = url.searchParams.get('group_id') || '';
      const state = encodeState({
        nonce: crypto.randomBytes(8).toString('hex'),
        ts: Date.now(),
        groupId,
        user_id: requestContext.user_id,
        org_id: requestContext.org_id
      });
      if (provider === 'facebook' || provider === 'instagram') {
        const redirect = await fbBegin({
          FB_APP_ID: process.env.FB_APP_ID,
          FB_REDIRECT_URI: process.env.FB_REDIRECT_URI,
          state
        });
        return response302(redirect);
      } else if (provider === 'youtube') {
        const scope = [
          'openid','email','profile',
          'https://www.googleapis.com/auth/youtube.upload',
          'https://www.googleapis.com/auth/youtube'
        ].join(' ');
        const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        auth.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID);
        auth.searchParams.set('redirect_uri', process.env.GOOGLE_REDIRECT_URI);
        auth.searchParams.set('response_type', 'code');
        auth.searchParams.set('access_type', 'offline');
        auth.searchParams.set('prompt', 'consent');
        auth.searchParams.set('scope', scope);
        auth.searchParams.set('state', state);
        return response302(auth.toString());
      } else if (provider === 'tiktok') {
        const auth = new URL('https://www.tiktok.com/v2/auth/authorize/');
        auth.searchParams.set('client_key', process.env.TIKTOK_CLIENT_KEY);
        auth.searchParams.set('scope', 'user.info.basic,video.publish,video.upload');
        auth.searchParams.set('response_type', 'code');
        auth.searchParams.set('redirect_uri', process.env.TIKTOK_REDIRECT_URI);
        auth.searchParams.set('state', state);
        return response302(auth.toString());
      }
      return { statusCode: 400, body: 'Unknown provider' };
    }

    if (action === 'callback') {
      const code = url.searchParams.get('code');
      const stateParam = url.searchParams.get('state');
      const statePayload = decodeState(stateParam);
      const context = {
        user_id: statePayload?.user_id || requestContext.user_id,
        org_id: statePayload?.org_id || requestContext.org_id
      };
      const groupId = statePayload?.groupId || null;
      
      if (provider === 'facebook' || provider === 'instagram') {
        const tok = await fbExchangeCode({
          code,
          FB_APP_ID: process.env.FB_APP_ID,
          FB_APP_SECRET: process.env.FB_APP_SECRET,
          FB_REDIRECT_URI: process.env.FB_REDIRECT_URI
        });
        const longTok = await fbLongLived({ shortToken: tok.access_token, FB_APP_ID: process.env.FB_APP_ID, FB_APP_SECRET: process.env.FB_APP_SECRET });
        const resolved = await resolveIGBusiness({ userToken: longTok.access_token });
        if (!resolved) return { statusCode: 400, body: 'No IG Business Account connected to any Page on this user' };
        await upsertConnection({
          provider: 'facebook',
          access_token: longTok.access_token,
          page_id: resolved.page_id,
          page_token: resolved.page_token,
          ig_user_id: resolved.ig_user_id,
          label: 'FB+IG',
          expires_at: null,
          account_type: 'unspecified',
          account_group_id: groupId || null
        }, context);
        await safeAudit(context, {
          action: 'connection.connected',
          entity_type: 'connection',
          meta: { provider: 'facebook', label: 'FB+IG' }
        });
        return responseHtml('<script>window.opener?window.opener.location="/":location="/";</script>Connected.');
      } else if (provider === 'youtube') {
        const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI,
            grant_type: 'authorization_code',
            code
          })
        }).then(r=>r.json());
        await upsertConnection({
          provider: 'youtube',
          access_token: tokenResp.access_token,
          refresh_token: tokenResp.refresh_token,
          expires_at: Date.now() + (tokenResp.expires_in*1000),
          label: 'YouTube Channel',
          account_type: 'unspecified'
        }, context);
        await safeAudit(context, {
          action: 'connection.connected',
          entity_type: 'connection',
          meta: { provider: 'youtube', label: 'YouTube Channel' }
        });
        return responseHtml('<script>window.opener?window.opener.location="/":location="/";</script>Connected.');
      } else if (provider === 'tiktok') {
        const tokenResp = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_key: process.env.TIKTOK_CLIENT_KEY,
            client_secret: process.env.TIKTOK_CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
            redirect_uri: process.env.TIKTOK_REDIRECT_URI
          })
        }).then(r=>r.json());
        await upsertConnection({
          provider: 'tiktok',
          access_token: tokenResp.access_token,
          refresh_token: tokenResp.refresh_token,
          expires_at: Date.now() + (tokenResp.expires_in*1000),
          label: 'TikTok',
          account_type: 'unspecified'
        }, context);
        await safeAudit(context, {
          action: 'connection.connected',
          entity_type: 'connection',
          meta: { provider: 'tiktok', label: 'TikTok' }
        });
        return responseHtml('<script>window.opener?window.opener.location="/":location="/";</script>Connected.');
      }
      return { statusCode: 400, body: 'Unknown provider' };
    }

    if (action === 'disconnect') {
      const provider = url.searchParams.get('provider');
      await removeConnection(provider, requestContext);
      await safeAudit(requestContext, {
        action: 'connection.disconnected',
        entity_type: 'connection',
        entity_id: provider
      });
      return { statusCode: 200, body: 'ok' };
    }

    return { statusCode: 400, body: 'Bad action' };
  } catch (e) {
    return { statusCode: 500, body: e.stack || String(e) };
  }
}

function response302(loc) { return { statusCode: 302, headers: { Location: loc }, body: '' }; }
function responseHtml(html) { return { statusCode: 200, headers: {'Content-Type':'text/html'}, body: html }; }

function encodeState(payload) {
  const json = JSON.stringify(payload || {});
  return Buffer.from(json, 'utf8').toString('base64url');
}

function decodeState(stateValue) {
  if (!stateValue) return null;
  try {
    return JSON.parse(Buffer.from(stateValue, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

async function safeAudit(context, entry) {
  try {
    await logAudit(entry, context);
  } catch (e) {
    console.warn('Auth audit log failed', e?.message || e);
  }
}
