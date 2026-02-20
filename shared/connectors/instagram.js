import fetch from 'node-fetch';
import { upsertConnection } from '../storage.js';

/**
 * Meta/Facebook OAuth gets the user access token.
 * From that, resolve Pages and the connected IG Business Account.
 */
export async function fbBegin({ FB_APP_ID, FB_REDIRECT_URI, state }) {
  const scopes = [
    'public_profile','email',
    'pages_show_list','pages_read_engagement','pages_manage_metadata','pages_manage_posts',
    'instagram_basic','instagram_content_publish'
  ].join(',');
  const url = new URL('https://www.facebook.com/v19.0/dialog/oauth');
  url.searchParams.set('client_id', FB_APP_ID);
  url.searchParams.set('redirect_uri', FB_REDIRECT_URI);
  url.searchParams.set('state', state);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scopes);
  return url.toString();
}

export async function fbExchangeCode({ code, FB_APP_ID, FB_APP_SECRET, FB_REDIRECT_URI }) {
  const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
  tokenUrl.searchParams.set('client_id', FB_APP_ID);
  tokenUrl.searchParams.set('client_secret', FB_APP_SECRET);
  tokenUrl.searchParams.set('redirect_uri', FB_REDIRECT_URI);
  tokenUrl.searchParams.set('code', code);
  const tok = await fetch(tokenUrl).then(r => r.json());
  return tok; // { access_token, token_type, expires_in }
}

export async function fbLongLived({ shortToken, FB_APP_ID, FB_APP_SECRET }) {
  const url = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', FB_APP_ID);
  url.searchParams.set('client_secret', FB_APP_SECRET);
  url.searchParams.set('fb_exchange_token', shortToken);
  return fetch(url).then(r => r.json()); // { access_token, token_type, expires_in }
}

export async function resolveIGBusiness({ userToken }) {
  // Get Pages
  const pages = await fetch('https://graph.facebook.com/v19.0/me/accounts?fields=name,access_token', {
    headers: { Authorization: `Bearer ${userToken}` }
  }).then(r => r.json());
  for (const p of pages.data || []) {
    const ig = await fetch(`https://graph.facebook.com/v19.0/${p.id}?fields=instagram_business_account`, {
      headers: { Authorization: `Bearer ${userToken}` }
    }).then(r => r.json());
    if (ig.instagram_business_account?.id) {
      return { page_id: p.id, page_token: p.access_token, ig_user_id: ig.instagram_business_account.id };
    }
  }
  return null;
}

export async function publishInstagram({ ig_user_id, page_token, media_url, caption }) {
  // 1) Create container
  const create = await fetch(`https://graph.facebook.com/v19.0/${ig_user_id}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: media_url, caption, access_token: page_token })
  }).then(r => r.json());
  if (!create.id) throw new Error('Failed to create IG container: ' + JSON.stringify(create));

  // 2) Publish
  const pub = await fetch(`https://graph.facebook.com/v19.0/${ig_user_id}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: create.id, access_token: page_token })
  }).then(r => r.json());
  if (!pub.id) throw new Error('Failed to publish IG media: ' + JSON.stringify(pub));
  return pub.id;
}
