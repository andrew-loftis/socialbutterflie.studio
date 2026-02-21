import fetch from 'node-fetch';
import {
  claimScheduledPost,
  duePostsAll,
  requeueStaleProcessing,
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

const MAX_ATTEMPTS = Number(process.env.SCHEDULER_MAX_ATTEMPTS || 3);
const BASE_RETRY_DELAY_MS = Number(process.env.SCHEDULER_RETRY_BASE_MS || 5 * 60 * 1000);
const MAX_RETRY_DELAY_MS = Number(process.env.SCHEDULER_RETRY_MAX_MS || 60 * 60 * 1000);
const RETRY_JITTER_MS = Number(process.env.SCHEDULER_RETRY_JITTER_MS || 60 * 1000);

function retryDelayMsForAttempt(attemptNumber) {
  const safeAttempt = Math.max(1, Number(attemptNumber) || 1);
  const growth = 2 ** (safeAttempt - 1);
  const base = Math.min(BASE_RETRY_DELAY_MS * growth, MAX_RETRY_DELAY_MS);
  const jitter = Math.floor(Math.random() * (RETRY_JITTER_MS + 1));
  return base + jitter;
}

export async function handler() {
  const now = new Date().toISOString();
  const defaultContext = getContextDefaults();
  await requeueStaleProcessing({ user_id: null, org_id: null });
  const due = await duePostsAll(now);
  const connectionsByContext = new Map();

  for (const duePost of due) {
    const context = { user_id: duePost.user_id || defaultContext.user_id, org_id: duePost.org_id || defaultContext.org_id };
    const post = await claimScheduledPost(duePost.id, context);
    if (!post) {
      continue;
    }
    const contextKey = `${context.user_id}::${context.org_id || ''}`;
    let conns = connectionsByContext.get(contextKey);
    if (!conns) {
      conns = await listConnections(context);
      connectionsByContext.set(contextKey, conns);
    }
    const attemptNumber = (post.retry_count || 0) + 1;
    const idempotencyKey = `scheduled:${post.id}:attempt:${attemptNumber}`;
    try {
      if (post.provider === 'instagram') {
        const fb = conns.find(c => c.provider === 'facebook' && c.ig_user_id);
        if (!fb) throw new Error('No IG Business connection');
        const id = await publishInstagram({ ig_user_id: fb.ig_user_id, page_token: fb.page_token, media_url: post.media_url, caption: post.caption });
        await markPosted(post.id, id, context, { idempotencyKey });
        await logScheduledAttempt({ scheduled_id: post.id, status: 'success', external_id: id, attempt: attemptNumber, idempotency_key: idempotencyKey }, context);
      } else if (post.provider === 'facebook') {
        const fb = conns.find(c => c.provider === 'facebook');
        if (!fb) throw new Error('No Facebook Page connection');
        const unix = Math.floor(new Date(post.scheduled_at).getTime()/1000);
        const id = await publishFacebook({ page_id: fb.page_id, page_token: fb.page_token, message: post.caption, media_url: post.media_url, scheduled_unix: unix });
        await markPosted(post.id, id, context, { idempotencyKey });
        await logScheduledAttempt({ scheduled_id: post.id, status: 'success', external_id: id, attempt: attemptNumber, idempotency_key: idempotencyKey }, context);
      } else if (post.provider === 'youtube') {
        const yt = conns.find(c => c.provider === 'youtube');
        if (!yt) throw new Error('No YouTube connection');
        // Fetch media bytes
        const media = await fetch(post.media_url);
        if (!media.ok) throw new Error(`Unable to fetch media (${media.status} ${media.statusText})`);
        const buf = Buffer.from(await media.arrayBuffer());
        const id = await uploadYouTube({ access_token: yt.access_token, title: post.caption.slice(0,80) || 'Upload', description: post.caption, publishAtIso: post.scheduled_at, mediaBuffer: buf, mimeType: media.headers.get('content-type') || 'video/mp4' });
        await markPosted(post.id, id, context, { idempotencyKey });
        await logScheduledAttempt({ scheduled_id: post.id, status: 'success', external_id: id, attempt: attemptNumber, idempotency_key: idempotencyKey }, context);
      } else if (post.provider === 'tiktok') {
        // TikTok direct post requires approved app; left as an exercise for configured apps.
        throw new Error('TikTok direct post requires app approval; integrate once your app is approved.');
      } else {
        throw new Error(`Unsupported provider: ${post.provider}`);
      }
    } catch (e) {
      console.error('Post failed', post.provider, e);
      const message = e?.message || String(e);
      const retryCount = (await markFailed(post.id, message, context)) ?? attemptNumber;
      const status = retryCount >= MAX_ATTEMPTS ? 'failed' : 'retry';
      await logScheduledAttempt({
        scheduled_id: post.id,
        status,
        error: message,
        attempt: retryCount,
        idempotency_key: idempotencyKey
      }, context);

      if (retryCount < MAX_ATTEMPTS) {
        const retryDelayMs = retryDelayMsForAttempt(retryCount);
        const nextRun = new Date(Date.now() + retryDelayMs).toISOString();
        await reschedulePost(post.id, nextRun, context, { clearError: false });
      }
    }
  }

  return { statusCode: 200, body: 'ok' };
}
