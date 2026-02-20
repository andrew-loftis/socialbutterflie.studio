import fetch from 'node-fetch';
import {
  listConnections,
  upsertConnection,
  removeConnection,
  getPrefs,
  setPrefs,
  listScheduled,
  addScheduled,
  addScheduledBatch,
  listCampaigns,
  createCampaign,
  reschedulePost,
  listAnalytics,
  getContextDefaults,
  listAccountGroups,
  createAccountGroup,
  updateAccountGroup,
  deleteAccountGroup
} from '../../shared/storage.js';
import { listProjects, listProjectAssets } from '../../shared/connectors/frameio.js';
import { generateCaption, generateHashtags, generateAltText, generateContentCalendar } from '../../shared/ai.js';
import { parseCsv, valueFor } from '../../public/js/csv.js';

export async function handler(event) {
  try {
    const url = new URL(event.rawUrl);
    const path = url.searchParams.get('path') || '/';
    const context = getContextDefaults();

    if (event.httpMethod === 'GET' && path === '/connections') {
      const conns = await listConnections(context);
      return json(conns);
    }
    if (event.httpMethod === 'POST' && path === '/disconnect') {
      const body = JSON.parse(event.body || '{}');
      const idOrProvider = body.id || body.provider;
      await removeConnection(idOrProvider, context);
      return json({ ok: true });
    }
    if (event.httpMethod === 'GET' && path === '/prefs') {
      return json(await getPrefs(context));
    }
    if (event.httpMethod === 'POST' && path === '/prefs') {
      const body = JSON.parse(event.body || '{}');
      await setPrefs(body, context);
      return json({ ok: true });
    }
    if (event.httpMethod === 'GET' && path === '/account-groups') {
      return json(await listAccountGroups(context));
    }
    if (event.httpMethod === 'POST' && path === '/account-groups') {
      const body = JSON.parse(event.body || '{}');
      if (!body.name) return err(400, 'Account group name is required');
      const created = await createAccountGroup({ name: body.name, type: body.type || 'company', color: body.color, meta: body.meta }, context);
      return json(created, 201);
    }
    if (event.httpMethod === 'PATCH' && path.startsWith('/account-groups/')) {
      const id = path.replace('/account-groups/', '');
      const body = JSON.parse(event.body || '{}');
      const updated = await updateAccountGroup(id, body, context);
      return json(updated || { error: 'Not found' }, updated ? 200 : 404);
    }
    if (event.httpMethod === 'DELETE' && path.startsWith('/account-groups/')) {
      const id = path.replace('/account-groups/', '');
      await deleteAccountGroup(id, context);
      return json({ ok: true });
    }
    if (event.httpMethod === 'GET' && path === '/scheduled') {
      return json(await listScheduled(context));
    }
    if (event.httpMethod === 'POST' && path === '/schedule') {
      const body = JSON.parse(event.body || '{}');
      const post = {
        provider: body.provider,
        caption: body.caption || '',
        media_url: body.mediaUrl || '',
        scheduled_at: new Date(body.when).toISOString(),
        status: 'pending',
        campaign_id: body.campaignId || null
      };
      const saved = await addScheduled(post, context);
      return json(saved);
    }
    if (event.httpMethod === 'POST' && path === '/schedule/reschedule') {
      const body = JSON.parse(event.body || '{}');
      if (!body.id || !body.when) return err(400, 'id and when are required');
  const updated = await reschedulePost(body.id, new Date(body.when).toISOString(), context, { clearError: true });
      return json(updated);
    }
    if (event.httpMethod === 'POST' && path === '/schedule/bulk') {
      const body = JSON.parse(event.body || '{}');
  const rows = Array.isArray(body.rows) ? body.rows : null;
  const csvText = typeof body.csv === 'string' ? body.csv : null;
  if (!rows && !csvText) return err(400, 'Provide rows or csv payload.');

  const parsedRows = rows || parseCsv(csvText);
      if (!parsedRows.length) return json({ inserted: 0, errors: ['No rows to import'] });

  const existingCampaigns = await listCampaigns({ org_id: context.org_id });
      const campaignByName = new Map();
      existingCampaigns.forEach(c => campaignByName.set(c.name.toLowerCase(), c.id));
      const createdCampaigns = [];
      const prepared = [];
      const errors = [];
      const allowedProviders = new Set(['instagram', 'facebook', 'youtube', 'tiktok']);

      for (let i = 0; i < parsedRows.length; i += 1) {
        const row = parsedRows[i];
        const label = `Row ${i + 1}`;

  const providerRaw = `${valueFor(row, ['provider'])}`.trim().toLowerCase();
        if (!providerRaw) {
          errors.push(`${label}: provider missing`);
          continue;
        }
        if (!allowedProviders.has(providerRaw)) {
          errors.push(`${label}: unsupported provider "${providerRaw}"`);
          continue;
        }

  const scheduledRaw = valueFor(row, ['scheduled_at', 'scheduledAt', 'when', 'datetime']);
        const scheduledDate = scheduledRaw ? new Date(scheduledRaw) : null;
        if (!scheduledDate || Number.isNaN(scheduledDate.valueOf())) {
          errors.push(`${label}: invalid scheduled_at value`);
          continue;
        }

  const mediaUrl = valueFor(row, ['media_url', 'mediaUrl', 'media url', 'media']);
        if (!mediaUrl) {
          errors.push(`${label}: media_url missing`);
          continue;
        }

  const caption = valueFor(row, ['caption', 'text', 'message']) || '';
  let campaignId = valueFor(row, ['campaign_id', 'campaignId']);
  const campaignName = valueFor(row, ['campaign', 'campaign_name', 'campaignName']);
        if (!campaignId && campaignName) {
          const key = campaignName.trim().toLowerCase();
          if (key) {
            if (!campaignByName.has(key)) {
              const created = await createCampaign({ name: campaignName }, { org_id: context.org_id });
              campaignByName.set(key, created.id);
              createdCampaigns.push(created);
            }
            campaignId = campaignByName.get(key);
          }
        }

        prepared.push({
          provider: providerRaw,
          caption,
          media_url: mediaUrl,
          scheduled_at: scheduledDate.toISOString(),
          status: 'pending',
          campaign_id: campaignId || null
        });
      }

      if (!prepared.length) {
        return json({ inserted: 0, errors });
      }

      const saved = await addScheduledBatch(prepared, context);
      return json({ inserted: saved.length, errors, createdCampaigns });
    }

    if (event.httpMethod === 'GET' && path === '/campaigns') {
      const campaigns = await listCampaigns({ org_id: context.org_id });
      return json(campaigns);
    }
    if (event.httpMethod === 'POST' && path === '/campaigns') {
      const body = JSON.parse(event.body || '{}');
      if (!body.name) return err(400, 'Campaign name is required');
      const created = await createCampaign({ name: body.name, color: body.color || null, meta: body.meta || null }, { org_id: context.org_id });
      return json(created, 201);
    }

    if (event.httpMethod === 'GET' && path === '/frameio/projects') {
      const token = process.env.FRAMEIO_TOKEN;
      if (!token) return err(400, 'FRAMEIO_TOKEN not set');
      const items = await listProjects(token);
      return json({ items });
    }
    if (event.httpMethod === 'GET' && path === '/frameio/assets') {
      const token = process.env.FRAMEIO_TOKEN;
      if (!token) return err(400, 'FRAMEIO_TOKEN not set');
      const proj = url.searchParams.get('project_id');
      const items = await listProjectAssets(token, proj);
      return json({ items });
    }

    // AI endpoints
    if (event.httpMethod === 'POST' && path === '/ai/caption') {
      const body = JSON.parse(event.body || '{}');
      // Accept either brandVoice object or groupId to fetch brand voice
      let brandVoiceData = body.brandVoice || {};
      if (body.groupId && !body.brandVoice) {
        const groups = await listAccountGroups({ user_id: context.user_id, org_id: context.org_id });
        const group = groups.find(g => g.id === body.groupId);
        brandVoiceData = group?.brand_voice || {};
      }
      const result = await generateCaption(brandVoiceData, body.variant || 'standard', body.draft || '');
      return json(result);
    }
    if (event.httpMethod === 'POST' && path === '/ai/hashtags') {
      const body = JSON.parse(event.body || '{}');
      let brandVoiceData = body.brandVoice || {};
      if (body.groupId && !body.brandVoice) {
        const groups = await listAccountGroups({ user_id: context.user_id, org_id: context.org_id });
        const group = groups.find(g => g.id === body.groupId);
        brandVoiceData = group?.brand_voice || {};
      }
      const result = await generateHashtags(body.topic || '', body.style || 'broad', brandVoiceData);
      return json(result);
    }
    if (event.httpMethod === 'POST' && path === '/ai/alttext') {
      const body = JSON.parse(event.body || '{}');
      if (!body.mediaUrl) return err(400, 'mediaUrl is required');
      let brandVoiceData = body.brandVoice || {};
      if (body.groupId && !body.brandVoice) {
        const groups = await listAccountGroups({ user_id: context.user_id, org_id: context.org_id });
        const group = groups.find(g => g.id === body.groupId);
        brandVoiceData = group?.brand_voice || {};
      }
      const result = await generateAltText(body.mediaUrl, brandVoiceData);
      return json(result);
    }
    if (event.httpMethod === 'POST' && path === '/ai/calendar') {
      const body = JSON.parse(event.body || '{}');
      let brandVoiceData = body.brandVoice || {};
      if (body.groupId && !body.brandVoice) {
        const groups = await listAccountGroups({ user_id: context.user_id, org_id: context.org_id });
        const group = groups.find(g => g.id === body.groupId);
        brandVoiceData = group?.brand_voice || {};
      }
      const result = await generateContentCalendar(brandVoiceData, body.upcomingEvents || []);
      return json(result);
    }

    if (event.httpMethod === 'GET' && path === '/analytics') {
      const [logs, campaigns] = await Promise.all([
        listAnalytics({ org_id: context.org_id }),
        listCampaigns({ org_id: context.org_id })
      ]);
      return json({ logs, campaigns });
    }

    return err(404, 'Not found');
  } catch (e) {
    return err(500, e.stack || String(e));
  }
}

function json(obj, status = 200) { return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) }; }
function err(code, msg) { return { statusCode: code, headers: { 'Content-Type': 'text/plain' }, body: msg }; }

