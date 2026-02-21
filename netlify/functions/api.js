import fetch from 'node-fetch';
import {
  listConnections,
  removeConnection,
  getPrefs,
  setPrefs,
  listScheduled,
  addScheduled,
  addScheduledBatch,
  updateScheduled,
  listCampaigns,
  createCampaign,
  listWorkspaces,
  createWorkspace,
  listWorkspaceMembers,
  upsertWorkspaceMember,
  getWorkspaceRole,
  reschedulePost,
  listAnalytics,
  logAudit,
  listAuditLogs,
  resolveContextFromEvent,
  listAccountGroups,
  createAccountGroup,
  updateAccountGroup,
  deleteAccountGroup
} from '../../shared/storage.js';
import { listProjects, listProjectAssets } from '../../shared/connectors/frameio.js';
import { generateCaption, generateHashtags, generateAltText, generateContentCalendar } from '../../shared/ai.js';
import { parseCsv, valueFor } from '../../public/js/csv.js';

const ALLOWED_PROVIDERS = new Set(['instagram', 'facebook', 'youtube', 'tiktok']);
const ALLOWED_WORKFLOW_STATUS = new Set(['draft', 'review', 'pending']);
const ROLE_RANK = { viewer: 1, editor: 2, admin: 3 };

export async function handler(event) {
  try {
    const url = new URL(event.rawUrl);
    const path = url.searchParams.get('path') || '/';
    const context = resolveContextFromEvent(event);
    const effectiveRole = await getWorkspaceRole({
      user_id: context.user_id,
      org_id: context.org_id,
      fallback_role: context.user_role
    });
    const authContext = { ...context, user_role: effectiveRole };
    const canReview = hasRole(authContext, 'editor');
    const canManageWorkspace = hasRole(authContext, 'admin');

    if (event.httpMethod === 'GET' && path === '/context') {
      return json({
        user_id: authContext.user_id,
        org_id: authContext.org_id,
        user_role: authContext.user_role,
        permissions: {
          can_review: canReview,
          can_manage_workspace: canManageWorkspace
        }
      });
    }
    if (event.httpMethod === 'GET' && path === '/connections') {
      const groupId = url.searchParams.get('group_id');
      const conns = await listConnections(context);
      const filtered = groupId ? conns.filter((entry) => String(entry.account_group_id || '') === String(groupId)) : conns;
      return json(filtered);
    }
    if (event.httpMethod === 'GET' && path === '/workspace/members') {
      if (!authContext.org_id) return json({ items: [] });
      const items = await listWorkspaceMembers({ org_id: authContext.org_id });
      return json({ items });
    }
    if (event.httpMethod === 'POST' && path === '/workspace/members') {
      if (!canManageWorkspace) return err(403, 'admin role required');
      const body = JSON.parse(event.body || '{}');
      const member = await upsertWorkspaceMember(
        { user_id: body.userId, role: body.role },
        { org_id: authContext.org_id }
      );
      await safeAudit(authContext, {
        action: 'workspace.member.upserted',
        entity_type: 'workspace_member',
        entity_id: member.user_id,
        meta: { role: member.role }
      });
      return json(member);
    }
    if (event.httpMethod === 'GET' && path === '/workspaces') {
      const items = await listWorkspaces();
      return json({ items });
    }
    if (event.httpMethod === 'POST' && path === '/workspaces') {
      if (!canManageWorkspace) return err(403, 'admin role required');
      const body = JSON.parse(event.body || '{}');
      if (!body.name || !String(body.name).trim()) return err(400, 'Workspace name is required');
      const created = await createWorkspace({ name: body.name });
      if (authContext.user_id) {
        await upsertWorkspaceMember(
          { user_id: authContext.user_id, role: 'admin' },
          { org_id: created.id }
        );
      }
      await safeAudit(authContext, {
        action: 'workspace.created',
        entity_type: 'workspace',
        entity_id: created.id,
        meta: { name: created.name }
      });
      return json(created, 201);
    }
    if (event.httpMethod === 'POST' && path === '/disconnect') {
      const body = JSON.parse(event.body || '{}');
      const idOrProvider = body.id || body.provider;
      await removeConnection(idOrProvider, context);
      await safeAudit(authContext, {
        action: 'connection.disconnected',
        entity_type: 'connection',
        entity_id: String(idOrProvider || ''),
        meta: { provider: body.provider || null, id: body.id || null }
      });
      return json({ ok: true });
    }
    if (event.httpMethod === 'GET' && path === '/prefs') {
      return json(await getPrefs(context));
    }
    if (event.httpMethod === 'POST' && path === '/prefs') {
      const body = JSON.parse(event.body || '{}');
      await setPrefs(body, context);
      await safeAudit(authContext, {
        action: 'prefs.updated',
        entity_type: 'prefs',
        entity_id: context.user_id,
        meta: { keys: Object.keys(body || {}) }
      });
      return json({ ok: true });
    }
    if (event.httpMethod === 'GET' && path === '/account-groups') {
      return json(await listAccountGroups(context));
    }
    if (event.httpMethod === 'POST' && path === '/account-groups') {
      const body = JSON.parse(event.body || '{}');
      if (!body.name) return err(400, 'Account group name is required');
      const created = await createAccountGroup({ name: body.name, type: body.type || 'company', color: body.color, meta: body.meta }, context);
      await safeAudit(authContext, {
        action: 'account_group.created',
        entity_type: 'account_group',
        entity_id: created.id,
        meta: { name: created.name, type: created.type }
      });
      return json(created, 201);
    }
    if (event.httpMethod === 'PATCH' && path.startsWith('/account-groups/')) {
      const id = path.replace('/account-groups/', '');
      const body = JSON.parse(event.body || '{}');
      const updated = await updateAccountGroup(id, body, context);
      if (updated) {
        await safeAudit(context, {
          action: 'account_group.updated',
          entity_type: 'account_group',
          entity_id: updated.id,
          meta: { keys: Object.keys(body || {}) }
        });
      }
      return json(updated || { error: 'Not found' }, updated ? 200 : 404);
    }
    if (event.httpMethod === 'DELETE' && path.startsWith('/account-groups/')) {
      const id = path.replace('/account-groups/', '');
      await deleteAccountGroup(id, context);
      await safeAudit(authContext, {
        action: 'account_group.deleted',
        entity_type: 'account_group',
        entity_id: id
      });
      return json({ ok: true });
    }
    if (event.httpMethod === 'GET' && path === '/scheduled') {
      return json(await listScheduled(context));
    }
    if (event.httpMethod === 'GET' && path === '/scheduled/my-drafts') {
      return json(await listScheduled({ ...context, statuses: ['draft', 'rejected'] }));
    }
    if (event.httpMethod === 'GET' && path === '/scheduled/review') {
      return json(await listScheduled({ ...context, statuses: ['review'], all_users: canReview }));
    }
    if (event.httpMethod === 'POST' && path === '/schedule') {
      const body = JSON.parse(event.body || '{}');
      const provider = String(body.provider || '').trim().toLowerCase();
      if (!ALLOWED_PROVIDERS.has(provider)) {
        return err(400, `provider must be one of: ${Array.from(ALLOWED_PROVIDERS).join(', ')}`);
      }
      if (!body.mediaUrl || !String(body.mediaUrl).trim()) {
        return err(400, 'mediaUrl is required');
      }
      const whenIso = parseDateTime(body.when);
      if (!whenIso) {
        return err(400, 'when must be a valid ISO date-time');
      }
      const workflowStatus = String(body.workflowStatus || 'pending').trim().toLowerCase();
      if (!ALLOWED_WORKFLOW_STATUS.has(workflowStatus)) {
        return err(400, `workflowStatus must be one of: ${Array.from(ALLOWED_WORKFLOW_STATUS).join(', ')}`);
      }
      const approvalStatus = workflowStatus === 'draft' ? 'draft' : workflowStatus === 'review' ? 'review' : 'approved';
      const approvedAt = workflowStatus === 'pending' ? new Date().toISOString() : null;
      const post = {
        provider,
        caption: body.caption || '',
        media_url: String(body.mediaUrl).trim(),
        scheduled_at: whenIso,
        status: workflowStatus,
        approval_status: approvalStatus,
        approved_by: workflowStatus === 'pending' ? context.user_id : null,
        approved_at: approvedAt,
        review_notes: body.reviewNotes ? String(body.reviewNotes) : null,
        campaign_id: body.campaignId || null
      };
      const saved = await addScheduled(post, context);
      await safeAudit(authContext, {
        action: workflowStatus === 'pending' ? 'post.scheduled' : workflowStatus === 'review' ? 'post.submitted_for_review' : 'post.saved_draft',
        entity_type: 'scheduled',
        entity_id: saved.id,
        meta: {
          provider: saved.provider,
          scheduled_at: saved.scheduled_at,
          campaign_id: saved.campaign_id || null,
          status: saved.status
        }
      });
      return json(saved);
    }
    if (event.httpMethod === 'POST' && path === '/schedule/submit-review') {
      const body = JSON.parse(event.body || '{}');
      if (!body.id) return err(400, 'id is required');
      const updated = await updateScheduled(body.id, {
        status: 'review',
        approval_status: 'review',
        approved_by: null,
        approved_at: null,
        review_notes: body.reviewNotes ? String(body.reviewNotes) : null
      }, context);
      if (!updated) return err(404, 'Scheduled post not found');
      await safeAudit(authContext, {
        action: 'post.submitted_for_review',
        entity_type: 'scheduled',
        entity_id: updated.id
      });
      return json(updated);
    }
    if (event.httpMethod === 'POST' && path === '/schedule/approve') {
      if (!canReview) return err(403, 'editor role required');
      const body = JSON.parse(event.body || '{}');
      if (!body.id) return err(400, 'id is required');
      const updated = await updateScheduled(body.id, {
        status: 'pending',
        approval_status: 'approved',
        approved_by: context.user_id,
        approved_at: new Date().toISOString(),
        review_notes: body.reviewNotes ? String(body.reviewNotes) : null
      }, { ...context, all_users: true });
      if (!updated) return err(404, 'Scheduled post not found');
      await safeAudit(authContext, {
        action: 'post.approved',
        entity_type: 'scheduled',
        entity_id: updated.id
      });
      return json(updated);
    }
    if (event.httpMethod === 'POST' && path === '/schedule/reject') {
      if (!canReview) return err(403, 'editor role required');
      const body = JSON.parse(event.body || '{}');
      if (!body.id) return err(400, 'id is required');
      const updated = await updateScheduled(body.id, {
        status: 'draft',
        approval_status: 'rejected',
        approved_by: null,
        approved_at: null,
        review_notes: body.reviewNotes ? String(body.reviewNotes) : 'Rejected in review'
      }, { ...context, all_users: true });
      if (!updated) return err(404, 'Scheduled post not found');
      await safeAudit(authContext, {
        action: 'post.rejected',
        entity_type: 'scheduled',
        entity_id: updated.id
      });
      return json(updated);
    }
    if (event.httpMethod === 'POST' && path === '/schedule/review/bulk') {
      if (!canReview) return err(403, 'editor role required');
      const body = JSON.parse(event.body || '{}');
      const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];
      const action = String(body.action || '').trim().toLowerCase();
      if (!ids.length) return err(400, 'ids is required');
      if (!['approve', 'reject'].includes(action)) return err(400, 'action must be approve or reject');
      const updated = [];
      for (const id of ids) {
        const patch = action === 'approve'
          ? {
              status: 'pending',
              approval_status: 'approved',
              approved_by: context.user_id,
              approved_at: new Date().toISOString(),
              review_notes: body.reviewNotes ? String(body.reviewNotes) : null
            }
          : {
              status: 'draft',
              approval_status: 'rejected',
              approved_by: null,
              approved_at: null,
              review_notes: body.reviewNotes ? String(body.reviewNotes) : 'Rejected in bulk review'
            };
        const row = await updateScheduled(id, patch, { ...context, all_users: true });
        if (row) updated.push(row.id);
      }
      await safeAudit(authContext, {
        action: `post.bulk_${action}`,
        entity_type: 'scheduled',
        meta: { count: updated.length }
      });
      return json({ updated });
    }
    if (event.httpMethod === 'POST' && path === '/schedule/reschedule') {
      const body = JSON.parse(event.body || '{}');
      if (!body.id || !body.when) return err(400, 'id and when are required');
      const whenIso = parseDateTime(body.when);
      if (!whenIso) return err(400, 'when must be a valid ISO date-time');
      const updated = await reschedulePost(body.id, whenIso, context, { clearError: true });
      if (updated) {
        await safeAudit(context, {
          action: 'post.rescheduled',
          entity_type: 'scheduled',
          entity_id: updated.id,
          meta: { scheduled_at: updated.scheduled_at }
        });
      }
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
      for (let i = 0; i < parsedRows.length; i += 1) {
        const row = parsedRows[i];
        const label = `Row ${i + 1}`;

        const providerRaw = `${valueFor(row, ['provider'])}`.trim().toLowerCase();
        if (!providerRaw) {
          errors.push(`${label}: provider missing`);
          continue;
        }
        if (!ALLOWED_PROVIDERS.has(providerRaw)) {
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
      await safeAudit(context, {
        action: 'post.bulk_scheduled',
        entity_type: 'scheduled',
        meta: {
          inserted: saved.length,
          errors: errors.length,
          created_campaigns: createdCampaigns.length
        }
      });
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
      await safeAudit(context, {
        action: 'campaign.created',
        entity_type: 'campaign',
        entity_id: created.id,
        meta: { name: created.name }
      });
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

    if (event.httpMethod === 'GET' && path === '/audit') {
      const rawLimit = Number(url.searchParams.get('limit') || 250);
      const limit = Number.isFinite(rawLimit) ? rawLimit : 250;
      const items = await listAuditLogs({ org_id: context.org_id }, { limit });
      return json({ items });
    }

    return err(404, 'Not found');
  } catch (e) {
    return err(500, e.stack || String(e));
  }
}

function json(obj, status = 200) { return { statusCode: status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) }; }
function err(code, msg) { return { statusCode: code, headers: { 'Content-Type': 'text/plain' }, body: msg }; }
function parseDateTime(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) return null;
  return parsed.toISOString();
}

async function safeAudit(context, entry) {
  try {
    await logAudit(entry, context);
  } catch (e) {
    console.warn('Audit log failed', e?.message || e);
  }
}

function hasRole(context, requiredRole) {
  const current = ROLE_RANK[context?.user_role] || ROLE_RANK.viewer;
  const required = ROLE_RANK[requiredRole] || ROLE_RANK.editor;
  return current >= required;
}

