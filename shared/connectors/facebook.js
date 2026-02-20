import fetch from 'node-fetch';

export async function publishFacebook({ page_id, page_token, message, link, media_url, scheduled_unix }) {
  // If media_url is an image, upload photo; else use /feed
  if (media_url) {
    // Schedule photo
    const form = new URLSearchParams();
    form.set('published', scheduled_unix ? 'false' : 'true');
    if (scheduled_unix) form.set('scheduled_publish_time', String(scheduled_unix));
    form.set('caption', message || '');
    form.set('url', media_url);
    form.set('access_token', page_token);
    const res = await fetch(`https://graph.facebook.com/v19.0/${page_id}/photos`, { method: 'POST', body: form }).then(r=>r.json());
    if (!res.id) throw new Error('FB publish error: ' + JSON.stringify(res));
    return res.id;
  } else {
    const form = new URLSearchParams();
    form.set('message', message || '');
    form.set('published', scheduled_unix ? 'false' : 'true');
    if (scheduled_unix) form.set('scheduled_publish_time', String(scheduled_unix));
    if (link) form.set('link', link);
    form.set('access_token', page_token);
    const res = await fetch(`https://graph.facebook.com/v19.0/${page_id}/feed`, { method: 'POST', body: form }).then(r=>r.json());
    if (!res.id) throw new Error('FB publish error: ' + JSON.stringify(res));
    return res.id;
  }
}
