import fetch from 'node-fetch';
import {
  duePosts,
  listConnections,
  markPosted,
  markFailed,
  reschedulePost,
  logScheduledAttempt,
  getContextDefaults
} from '../../shared/storage.js';
import { publishInstagram } from '../../shared/connectors/instagram.js';
import { publishFacebook } from '../../shared/connectors/facebook.js';
import { uploadYouTube } from '../../shared/connectors/youtube.js';

export async function handler() {
  const context = getContextDefaults();
  const now = new Date().toISOString();
  const due = await duePosts(now, context);
  const conns = await listConnections(context);

  for (const post of due) {
    const attemptNumber = (post.retry_count || 0) + 1;
    try {
      if (post.provider === 'instagram') {
        const fb = conns.find(c => c.provider === 'facebook' && c.ig_user_id);
        if (!fb) throw new Error('No IG Business connection');
        const id = await publishInstagram({ ig_user_id: fb.ig_user_id, page_token: fb.page_token, media_url: post.media_url, caption: post.caption });
        await markPosted(post.id, id, context);
        await logScheduledAttempt({ scheduled_id: post.id, status: 'success', external_id: id, attempt: attemptNumber }, context);
      } else if (post.provider === 'facebook') {
        const fb = conns.find(c => c.provider === 'facebook');
        if (!fb) throw new Error('No Facebook Page connection');
        const unix = Math.floor(new Date(post.scheduled_at).getTime()/1000);
        const id = await publishFacebook({ page_id: fb.page_id, page_token: fb.page_token, message: post.caption, media_url: post.media_url, scheduled_unix: unix });
        await markPosted(post.id, id, context);
        await logScheduledAttempt({ scheduled_id: post.id, status: 'success', external_id: id, attempt: attemptNumber }, context);
      } else if (post.provider === 'youtube') {
        const yt = conns.find(c => c.provider === 'youtube');
        if (!yt) throw new Error('No YouTube connection');
        // Fetch media bytes
        const media = await fetch(post.media_url);
        const buf = Buffer.from(await media.arrayBuffer());
        const id = await uploadYouTube({ access_token: yt.access_token, title: post.caption.slice(0,80) || 'Upload', description: post.caption, publishAtIso: post.scheduled_at, mediaBuffer: buf, mimeType: media.headers.get('content-type') || 'video/mp4' });
        await markPosted(post.id, id, context);
        await logScheduledAttempt({ scheduled_id: post.id, status: 'success', external_id: id, attempt: attemptNumber }, context);
      } else if (post.provider === 'tiktok') {
        // TikTok direct post requires approved app; left as an exercise for configured apps.
        throw new Error('TikTok direct post requires app approval; integrate once your app is approved.');
      }
    } catch (e) {
      console.error('Post failed', post.provider, e);
  const retryCount = (await markFailed(post.id, e.message || String(e), context)) ?? ((post.retry_count || 0) + 1);
      const maxAttempts = 3;
      const status = retryCount >= maxAttempts ? 'failed' : 'retry';
      await logScheduledAttempt({ scheduled_id: post.id, status, error: e.message || String(e), attempt: retryCount }, context);

      if (retryCount < maxAttempts) {
        const retryDelayMs = 5 * 60 * 1000;
        const nextRun = new Date(Date.now() + retryDelayMs).toISOString();
  await reschedulePost(post.id, nextRun, context, { clearError: false });
      }
    }
  }

  return { statusCode: 200, body: 'ok' };
}
