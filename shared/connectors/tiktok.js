import fetch from 'node-fetch';

/**
 * TikTok Content Posting API requires app approval and specific scopes.
 * This is a minimal placeholder that initializes a post with a media URL.
 */
export async function tiktokDirectPost({ client_key, client_secret, access_token, caption, media_url }) {
  // Placeholder: Your app must be approved and the account whitelisted.
  const endpoint = 'https://open.tiktokapis.com/v2/post/publish/content/init/';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${access_token}`,
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify({
      post_info: { caption },
      source_info: { source: 'PULL_FROM_URL', video_url: media_url }
    })
  }).then(r=>r.json());
  if (res.data?.post_id) return res.data.post_id;
  throw new Error('TikTok post failed or app not approved: ' + JSON.stringify(res));
}
