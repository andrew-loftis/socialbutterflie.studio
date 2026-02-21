import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE;
const useSupabase = !!(supabaseUrl && supabaseKey);

let supabase = null;
if (useSupabase) {
  supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
}

const DEFAULT_USER_ID = process.env.DEFAULT_USER_ID || 'demo';
const DEFAULT_ORG_ID = process.env.DEFAULT_ORG_ID || null;
const CLAIM_TIMEOUT_SECONDS = Number(process.env.SCHEDULER_CLAIM_TIMEOUT_SECONDS || 900);

// In-memory storage for read-only environments (Netlify serverless)
const EMPTY_MEMORY_STORE = {
  orgs: [],
  workspace_members: [],
  connections: [],
  prefs: {},
  scheduled: [],
  campaigns: [],
  scheduled_log: [],
  account_groups: [],
  audit_log: []
};
let memoryStore = { ...EMPTY_MEMORY_STORE };

const localPath = path.join(process.cwd(), 'sql', 'local.json');
function createId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeLocalData(data = {}) {
  return {
    ...EMPTY_MEMORY_STORE,
    ...data,
    prefs: data && typeof data.prefs === 'object' && !Array.isArray(data.prefs) ? data.prefs : {}
  };
}

function readLocal() {
  // Try reading from file first
  try {
    const data = normalizeLocalData(JSON.parse(fs.readFileSync(localPath, 'utf-8')));
    // Populate memory store on first read
    if (memoryStore.connections.length === 0 && data.connections) {
      memoryStore = { ...data };
    }
    return data;
  } catch {
    // If file doesn't exist or can't be read, use memory store
    return normalizeLocalData(memoryStore);
  }
}
function writeLocal(data) {
  // Always update memory store
  memoryStore = normalizeLocalData(data);
  
  // Try writing to file (will fail in read-only environments, but that's OK)
  try {
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, JSON.stringify(memoryStore, null, 2));
  } catch (err) {
    // Silently fail in read-only environments (Netlify)
    console.log('[Storage] Running in read-only environment, using memory storage');
  }
}

function withOrg(query, org_id) {
  if (org_id) {
    return query.eq('org_id', org_id);
  }
  return query;
}

function decorateRecord(record, org_id) {
  if (org_id && !record.org_id) record.org_id = org_id;
  return record;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeContextValue(value, fallback = null) {
  if (value == null) return fallback;
  const normalized = String(value).trim();
  if (!normalized || normalized.toLowerCase() === 'null' || normalized.toLowerCase() === 'undefined') {
    return fallback;
  }
  return normalized;
}

function normalizeUserRole(value, fallback = 'editor') {
  const role = normalizeContextValue(value, fallback);
  if (!role) return 'editor';
  const normalized = role.toLowerCase();
  if (['admin', 'editor', 'viewer'].includes(normalized)) return normalized;
  return fallback;
}

function looksLikeId(value) {
  if (!value) return false;
  const v = String(value);
  return v.length > 16 || v.includes('-');
}

export function resolveContextFromEvent(event, { allowQuery = true } = {}) {
  const headers = event?.headers || {};
  const rawUrl = event?.rawUrl || '';
  const url = rawUrl ? new URL(rawUrl) : null;
  const userFromHeader = headers['x-user-id'] || headers['X-User-Id'];
  const orgFromHeader = headers['x-org-id'] || headers['X-Org-Id'];
  const roleFromHeader = headers['x-user-role'] || headers['X-User-Role'];
  const userFromQuery = allowQuery && url ? url.searchParams.get('user_id') : null;
  const orgFromQuery = allowQuery && url ? url.searchParams.get('org_id') : null;
  const roleFromQuery = allowQuery && url ? url.searchParams.get('user_role') : null;

  return {
    user_id: normalizeContextValue(userFromHeader, normalizeContextValue(userFromQuery, DEFAULT_USER_ID)),
    org_id: normalizeContextValue(orgFromHeader, normalizeContextValue(orgFromQuery, DEFAULT_ORG_ID)),
    user_role: normalizeUserRole(roleFromHeader, normalizeUserRole(roleFromQuery, 'editor'))
  };
}

export async function listConnections({ user_id = DEFAULT_USER_ID, org_id = DEFAULT_ORG_ID } = {}) {
  if (useSupabase) {
    const query = withOrg(supabase.from('connections').select('*').eq('user_id', user_id), org_id);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
  const db = readLocal();
  return db.connections.filter(c => (!org_id || c.org_id === org_id) && c.user_id === user_id);
}

export async function upsertConnection(conn, { user_id = DEFAULT_USER_ID, org_id = DEFAULT_ORG_ID } = {}) {
  // Allow multiple accounts per provider; assign id if not present
  conn = { id: conn.id || createId(), ...conn, user_id, org_id };
  if (useSupabase) {
    // Tentative: requires schema change (remove unique, add id PK). For now we attempt insert.
    const { data, error } = await supabase.from('connections').insert(conn).select().single();
    if (error) throw error;
    return data;
  }
  const db = readLocal();
  db.connections.push(conn);
  writeLocal(db);
  return conn;
}

export async function removeConnection(idOrProvider, { user_id = DEFAULT_USER_ID, org_id = DEFAULT_ORG_ID } = {}) {
  if (useSupabase) {
    // If id provided use id, else legacy provider removal removes all for that provider
    let query = supabase.from('connections').delete().eq('user_id', user_id);
    if (idOrProvider.startsWith && idOrProvider.length > 10) {
      query = query.eq('id', idOrProvider);
    } else {
      query = query.eq('provider', idOrProvider);
    }
    if (org_id) query = query.eq('org_id', org_id);
    const { error } = await query;
    if (error) throw error;
    return;
  }
  const db = readLocal();
  db.connections = db.connections.filter(c => {
    const match = (c.id && c.id === idOrProvider) || (!c.id && c.provider === idOrProvider);
    return !(match && c.user_id === user_id && (!org_id || c.org_id === org_id));
  });
  writeLocal(db);
}

export async function getPrefs({ user_id = DEFAULT_USER_ID, org_id = DEFAULT_ORG_ID } = {}) {
  if (useSupabase) {
    let query = supabase.from('prefs').select('*').eq('user_id', user_id);
    if (org_id) query = query.eq('org_id', org_id);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data?.data || {};
  }
  const db = readLocal();
  if (db.prefs && !db.prefs[user_id] && typeof db.prefs === 'object' && !Array.isArray(db.prefs) && Object.keys(db.prefs).length && !db.prefs.connections) {
    // legacy shape where prefs was stored as a single object
    return user_id === DEFAULT_USER_ID ? db.prefs : {};
  }
  return (db.prefs && db.prefs[user_id]) || {};
}

export async function setPrefs(data, { user_id = DEFAULT_USER_ID, org_id = DEFAULT_ORG_ID } = {}) {
  if (useSupabase) {
    const payload = decorateRecord({ user_id, data }, org_id);
    const { error } = await supabase.from('prefs').upsert(payload, { onConflict: 'user_id' });
    if (error) throw error;
    return;
  }
  const db = readLocal();
  if (typeof db.prefs !== 'object' || Array.isArray(db.prefs)) {
    db.prefs = {};
  }
  db.prefs[user_id] = data;
  writeLocal(db);
}

export async function listCampaigns({ org_id = DEFAULT_ORG_ID } = {}) {
  if (useSupabase) {
    let query = supabase.from('campaigns').select('*').order('created_at', { ascending: true });
    if (org_id) query = query.eq('org_id', org_id);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
  const db = readLocal();
  return db.campaigns.filter(c => !org_id || c.org_id === org_id);
}

export async function createCampaign(campaign, { org_id = DEFAULT_ORG_ID } = {}) {
  const payload = decorateRecord({ ...campaign }, org_id);
  if (useSupabase) {
    const { data, error } = await supabase.from('campaigns').insert(payload).select().single();
    if (error) throw error;
    return data;
  }
  const db = readLocal();
  const created = { id: createId(), created_at: nowIso(), ...payload };
  db.campaigns.push(created);
  writeLocal(db);
  return created;
}

export async function updateCampaign(id, patch, { org_id = DEFAULT_ORG_ID } = {}) {
  if (useSupabase) {
    let query = supabase.from('campaigns').update(patch).eq('id', id);
    if (org_id) query = query.eq('org_id', org_id);
    const { data, error } = await query.select().maybeSingle();
    if (error) throw error;
    return data;
  }
  const db = readLocal();
  const idx = db.campaigns.findIndex(c => c.id === id && (!org_id || c.org_id === org_id));
  if (idx === -1) return null;
  db.campaigns[idx] = { ...db.campaigns[idx], ...patch };
  writeLocal(db);
  return db.campaigns[idx];
}

export async function deleteCampaign(id, { org_id = DEFAULT_ORG_ID } = {}) {
  if (useSupabase) {
    let query = supabase.from('campaigns').delete().eq('id', id);
    if (org_id) query = query.eq('org_id', org_id);
    const { error } = await query;
    if (error) throw error;
    return;
  }
  const db = readLocal();
  db.campaigns = db.campaigns.filter(c => !(c.id === id && (!org_id || c.org_id === org_id)));
  writeLocal(db);
}

export async function listWorkspaces() {
  if (useSupabase) {
    const { data, error } = await supabase
      .from('orgs')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  }
  const db = readLocal();
  return db.orgs || [];
}

export async function createWorkspace(workspace) {
  const payload = { name: String(workspace?.name || '').trim() };
  if (!payload.name) throw new Error('Workspace name is required');
  if (useSupabase) {
    const { data, error } = await supabase.from('orgs').insert(payload).select().single();
    if (error) throw error;
    return data;
  }
  const db = readLocal();
  db.orgs = db.orgs || [];
  const created = { id: createId(), name: payload.name, created_at: nowIso() };
  db.orgs.push(created);
  writeLocal(db);
  return created;
}

export async function listWorkspaceMembers({ org_id = DEFAULT_ORG_ID } = {}) {
  if (!org_id) return [];
  if (useSupabase) {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('org_id', org_id)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  }
  const db = readLocal();
  return (db.workspace_members || []).filter(m => m.org_id === org_id);
}

export async function upsertWorkspaceMember(
  member,
  { org_id = DEFAULT_ORG_ID } = {}
) {
  const payload = {
    org_id: org_id || member.org_id || null,
    user_id: String(member.user_id || '').trim(),
    role: String(member.role || 'viewer').trim().toLowerCase(),
    updated_at: nowIso()
  };
  if (!payload.org_id) throw new Error('org_id is required');
  if (!payload.user_id) throw new Error('user_id is required');
  if (!['admin', 'editor', 'viewer'].includes(payload.role)) throw new Error('invalid role');
  if (useSupabase) {
    const { data, error } = await supabase
      .from('workspace_members')
      .upsert(payload, { onConflict: 'org_id,user_id' })
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  }
  const db = readLocal();
  db.workspace_members = db.workspace_members || [];
  const idx = db.workspace_members.findIndex(
    m => m.org_id === payload.org_id && m.user_id === payload.user_id
  );
  if (idx >= 0) {
    db.workspace_members[idx] = { ...db.workspace_members[idx], ...payload };
    writeLocal(db);
    return db.workspace_members[idx];
  }
  const created = { ...payload, created_at: nowIso() };
  db.workspace_members.push(created);
  writeLocal(db);
  return created;
}

export async function getWorkspaceRole(
  { user_id = DEFAULT_USER_ID, org_id = DEFAULT_ORG_ID, fallback_role = 'viewer' } = {}
) {
  if (!org_id || !user_id) return fallback_role;
  if (useSupabase) {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('org_id', org_id)
      .eq('user_id', user_id)
      .maybeSingle();
    if (error) throw error;
    return data?.role || fallback_role;
  }
  const db = readLocal();
  const row = (db.workspace_members || []).find(
    m => m.org_id === org_id && m.user_id === user_id
  );
  return row?.role || fallback_role;
}

export async function listScheduled(
  { user_id = DEFAULT_USER_ID, org_id = DEFAULT_ORG_ID, statuses = null, all_users = false } = {}
) {
  const statusFilter = Array.isArray(statuses) && statuses.length ? statuses : null;
  if (useSupabase) {
    let query = supabase
      .from('scheduled')
      .select('*')
      .order('scheduled_at', { ascending: true });
    if (!all_users) query = query.eq('user_id', user_id);
    if (org_id) query = query.eq('org_id', org_id);
    if (statusFilter) query = query.in('status', statusFilter);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
  const db = readLocal();
  return db.scheduled
    .filter(
      p =>
        (!org_id || p.org_id === org_id) &&
        (all_users || p.user_id === user_id) &&
        (!statusFilter || statusFilter.includes(p.status))
    )
    .sort((a, b) => new Date(a.scheduled_at).valueOf() - new Date(b.scheduled_at).valueOf());
}

export async function addScheduled(post, { user_id = DEFAULT_USER_ID, org_id = DEFAULT_ORG_ID } = {}) {
  const payload = decorateRecord({ ...post, user_id }, org_id);
  payload.updated_at = nowIso();
  payload.approval_status =
    payload.approval_status || (payload.status === 'draft' ? 'draft' : payload.status === 'review' ? 'review' : 'approved');
  if (useSupabase) {
    const { data, error } = await supabase.from('scheduled').insert(payload).select().single();
    if (error) throw error;
    return data;
  }
  const db = readLocal();
  const created = {
    id: createId(),
    status: payload.status || 'pending',
    retry_count: 0,
    approval_status: payload.approval_status,
    approved_by: payload.approved_by || null,
    approved_at: payload.approved_at || null,
    review_notes: payload.review_notes || null,
    processing_started_at: null,
    lock_token: null,
    last_idempotency_key: null,
    ...payload
  };
  db.scheduled.push(created);
  writeLocal(db);
  return created;
}

export async function addScheduledBatch(posts = [], { user_id = DEFAULT_USER_ID, org_id = DEFAULT_ORG_ID } = {}) {
  if (!Array.isArray(posts) || posts.length === 0) return [];
  const now = nowIso();
  const payloads = posts.map(post => {
    const base = decorateRecord({ ...post, user_id }, org_id);
    const approvalStatus =
      post.approval_status || (post.status === 'draft' ? 'draft' : post.status === 'review' ? 'review' : 'approved');
    return {
      status: post.status || 'pending',
      retry_count: 0,
      last_error: null,
      approval_status: approvalStatus,
      approved_by: post.approved_by || null,
      approved_at: post.approved_at || null,
      review_notes: post.review_notes || null,
      processing_started_at: null,
      lock_token: null,
      last_idempotency_key: null,
      updated_at: now,
      ...base
    };
  });

  if (useSupabase) {
    const { data, error } = await supabase.from('scheduled').insert(payloads).select();
    if (error) throw error;
    return data;
  }

  const db = readLocal();
  const created = payloads.map(payload => {
    const record = { id: createId(), created_at: now, ...payload };
    db.scheduled.push(record);
    return record;
  });
  writeLocal(db);
  return created;
}

export async function reschedulePost(id, whenIso, { user_id = DEFAULT_USER_ID, org_id = DEFAULT_ORG_ID } = {}, { clearError = false } = {}) {
  if (useSupabase) {
    const patch = {
      scheduled_at: whenIso,
      updated_at: nowIso(),
      status: clearError ? 'pending' : 'retry',
      lock_token: null,
      processing_started_at: null
    };
    if (clearError) patch.last_error = null;
    let query = supabase
      .from('scheduled')
      .update(patch)
      .eq('id', id)
      .eq('user_id', user_id);
    if (org_id) query = query.eq('org_id', org_id);
    const { data, error } = await query.select().maybeSingle();
    if (error) throw error;
    return data;
  }
  const db = readLocal();
  const post = db.scheduled.find(p => p.id === id && p.user_id === user_id && (!org_id || p.org_id === org_id));
  if (!post) throw new Error('Scheduled post not found');
  post.scheduled_at = whenIso;
  post.status = clearError ? 'pending' : 'retry';
  post.lock_token = null;
  post.processing_started_at = null;
  if (clearError) {
    post.last_error = null;
  }
  post.updated_at = nowIso();
  writeLocal(db);
  return post;
}

export async function updateScheduled(
  id,
  patch,
  { user_id = DEFAULT_USER_ID, org_id = DEFAULT_ORG_ID, all_users = false } = {}
) {
  const safePatch = { ...patch, updated_at: nowIso() };
  if (useSupabase) {
    let query = supabase
      .from('scheduled')
      .update(safePatch)
      .eq('id', id);
    if (!all_users) query = query.eq('user_id', user_id);
    if (org_id) query = query.eq('org_id', org_id);
    const { data, error } = await query.select().maybeSingle();
    if (error) throw error;
    return data || null;
  }
  const db = readLocal();
  const idx = db.scheduled.findIndex(
    p => p.id === id && (all_users || p.user_id === user_id) && (!org_id || p.org_id === org_id)
  );
  if (idx === -1) return null;
  db.scheduled[idx] = { ...db.scheduled[idx], ...safePatch };
  writeLocal(db);
  return db.scheduled[idx];
}

export async function markPosted(
  id,
  external_id,
  { user_id = DEFAULT_USER_ID, org_id = DEFAULT_ORG_ID } = {},
  { idempotencyKey = null } = {}
) {
  if (useSupabase) {
    let query = supabase
      .from('scheduled')
      .update({
        status: 'posted',
        external_id,
        last_error: null,
        retry_count: 0,
        last_idempotency_key: idempotencyKey,
        lock_token: null,
        processing_started_at: null,
        updated_at: nowIso()
      })
      .eq('id', id)
      .eq('user_id', user_id);
    if (org_id) query = query.eq('org_id', org_id);
    const { error } = await query;
    if (error) throw error;
  } else {
    const db = readLocal();
    const post = db.scheduled.find(p => p.id === id && p.user_id === user_id && (!org_id || p.org_id === org_id));
    if (post) {
      post.status = 'posted';
      post.external_id = external_id;
      post.retry_count = 0;
      post.last_error = null;
      post.last_idempotency_key = idempotencyKey;
      post.lock_token = null;
      post.processing_started_at = null;
      post.updated_at = nowIso();
      writeLocal(db);
    }
  }
}

export async function markFailed(id, errorMsg, { user_id = DEFAULT_USER_ID, org_id = DEFAULT_ORG_ID } = {}) {
  if (useSupabase) {
    let selectQuery = supabase
      .from('scheduled')
      .select('retry_count')
      .eq('id', id)
      .eq('user_id', user_id);
    if (org_id) selectQuery = selectQuery.eq('org_id', org_id);
    const { data: current, error: selectError } = await selectQuery.maybeSingle();
    if (selectError) throw selectError;
    if (!current) throw new Error('Scheduled post not found');
    const retry = (current.retry_count || 0) + 1;
    const status = retry >= 3 ? 'failed' : 'retry';
    let updateQuery = supabase
      .from('scheduled')
      .update({
        retry_count: retry,
        status,
        last_error: errorMsg,
        lock_token: null,
        processing_started_at: null,
        updated_at: nowIso()
      })
      .eq('id', id)
      .eq('user_id', user_id);
    if (org_id) updateQuery = updateQuery.eq('org_id', org_id);
    const { error: updateError } = await updateQuery;
    if (updateError) throw updateError;
    return retry;
  }
  const db = readLocal();
  const post = db.scheduled.find(p => p.id === id && p.user_id === user_id && (!org_id || p.org_id === org_id));
  if (post) {
    post.retry_count = (post.retry_count || 0) + 1;
    post.last_error = errorMsg;
    post.lock_token = null;
    post.processing_started_at = null;
    post.updated_at = nowIso();
    if (post.retry_count >= 3) {
      post.status = 'failed';
    } else {
      post.status = 'retry';
    }
    writeLocal(db);
    return post.retry_count;
  }
}

export async function duePosts(nowIsoString, { user_id = DEFAULT_USER_ID, org_id = DEFAULT_ORG_ID } = {}) {
  if (useSupabase) {
    let query = supabase
      .from('scheduled')
      .select('*')
      .eq('user_id', user_id)
      .in('status', ['pending', 'retry'])
      .lte('scheduled_at', nowIsoString)
      .order('scheduled_at', { ascending: true });
    if (org_id) query = query.eq('org_id', org_id);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
  const db = readLocal();
  return db.scheduled
    .filter(
      p =>
        p.user_id === user_id &&
        (!org_id || p.org_id === org_id) &&
        ['pending', 'retry'].includes(p.status || 'pending') &&
        p.scheduled_at <= nowIsoString
    )
    .sort((a, b) => new Date(a.scheduled_at).valueOf() - new Date(b.scheduled_at).valueOf());
}

export async function duePostsAll(nowIsoString, { limit = 500 } = {}) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 500, 5000));
  if (useSupabase) {
    const { data, error } = await supabase
      .from('scheduled')
      .select('*')
      .in('status', ['pending', 'retry'])
      .lte('scheduled_at', nowIsoString)
      .order('scheduled_at', { ascending: true })
      .limit(safeLimit);
    if (error) throw error;
    return data;
  }
  const db = readLocal();
  return db.scheduled
    .filter(p => ['pending', 'retry'].includes(p.status || 'pending') && p.scheduled_at <= nowIsoString)
    .sort((a, b) => new Date(a.scheduled_at).valueOf() - new Date(b.scheduled_at).valueOf())
    .slice(0, safeLimit);
}

export async function requeueStaleProcessing(
  { user_id = null, org_id = null } = {},
  { timeoutSeconds = CLAIM_TIMEOUT_SECONDS } = {}
) {
  const cutoff = new Date(Date.now() - timeoutSeconds * 1000).toISOString();
  const patch = {
    status: 'retry',
    last_error: `Recovered from stale processing lock after ${timeoutSeconds}s`,
    lock_token: null,
    processing_started_at: null,
    updated_at: nowIso()
  };
  if (useSupabase) {
    let query = supabase
      .from('scheduled')
      .update(patch)
      .eq('status', 'processing')
      .lte('processing_started_at', cutoff)
      .select('id');
    if (user_id) query = query.eq('user_id', user_id);
    if (org_id) query = query.eq('org_id', org_id);
    const { data, error } = await query;
    if (error) throw error;
    return data?.length || 0;
  }
  const db = readLocal();
  let recovered = 0;
  for (const post of db.scheduled) {
    if (user_id && post.user_id !== user_id) continue;
    if (org_id && post.org_id !== org_id) continue;
    if (post.status !== 'processing') continue;
    if (!post.processing_started_at || post.processing_started_at > cutoff) continue;
    post.status = 'retry';
    post.last_error = patch.last_error;
    post.lock_token = null;
    post.processing_started_at = null;
    post.updated_at = patch.updated_at;
    recovered += 1;
  }
  if (recovered > 0) writeLocal(db);
  return recovered;
}

export async function claimScheduledPost(
  id,
  { user_id = DEFAULT_USER_ID, org_id = DEFAULT_ORG_ID } = {},
  { lockToken = createId() } = {}
) {
  const patch = {
    status: 'processing',
    lock_token: lockToken,
    processing_started_at: nowIso(),
    updated_at: nowIso()
  };
  if (useSupabase) {
    let query = supabase
      .from('scheduled')
      .update(patch)
      .eq('id', id)
      .eq('user_id', user_id)
      .in('status', ['pending', 'retry'])
      .select('*')
      .maybeSingle();
    if (org_id) query = query.eq('org_id', org_id);
    const { data, error } = await query;
    if (error) throw error;
    return data || null;
  }
  const db = readLocal();
  const post = db.scheduled.find(p => p.id === id && p.user_id === user_id && (!org_id || p.org_id === org_id));
  if (!post || !['pending', 'retry'].includes(post.status || 'pending')) {
    return null;
  }
  post.status = 'processing';
  post.lock_token = lockToken;
  post.processing_started_at = patch.processing_started_at;
  post.updated_at = patch.updated_at;
  writeLocal(db);
  return post;
}

export async function updateConnection(idOrProvider, patch, { user_id = DEFAULT_USER_ID, org_id = DEFAULT_ORG_ID } = {}) {
  if (useSupabase) {
    let query = supabase
      .from('connections')
      .update(patch)
      .eq('user_id', user_id);
    if (looksLikeId(idOrProvider)) {
      query = query.eq('id', idOrProvider);
    } else {
      query = query.eq('provider', idOrProvider);
    }
    if (org_id) query = query.eq('org_id', org_id);
    const { data, error } = await query.select().maybeSingle();
    if (error) throw error;
    return data;
  }
  const db = readLocal();
  const idx = db.connections.findIndex(
    c =>
      c.user_id === user_id &&
      (!org_id || c.org_id === org_id) &&
      ((looksLikeId(idOrProvider) && c.id === idOrProvider) || c.provider === idOrProvider)
  );
  if (idx >= 0) {
    db.connections[idx] = { ...db.connections[idx], ...patch };
    writeLocal(db);
    return db.connections[idx];
  }
  return null;
}

export async function logScheduledAttempt(entry, { org_id = DEFAULT_ORG_ID } = {}) {
  const payload = decorateRecord({ ...entry }, org_id);
  payload.created_at = payload.created_at || nowIso();
  if (useSupabase) {
    const { data, error } = await supabase.from('scheduled_log').insert(payload).select().maybeSingle();
    if (error) throw error;
    return data || null;
  }
  const db = readLocal();
  db.scheduled_log.unshift({ id: createId(), ...payload });
  writeLocal(db);
  return payload;
}

export async function listConnectionsForRefresh({ refreshBefore = Date.now() + 5 * 60 * 1000 } = {}) {
  if (useSupabase) {
    const { data, error } = await supabase
      .from('connections')
      .select('*')
      .not('refresh_token', 'is', null)
      .or(`expires_at.is.null,expires_at.lte.${Math.floor(refreshBefore)}`);
    if (error) throw error;
    return data;
  }
  const db = readLocal();
  return db.connections.filter(c => {
    if (!c.refresh_token) return false;
    if (!c.expires_at) return true;
    return Number(c.expires_at) <= refreshBefore;
  });
}

export async function logAudit(
  entry,
  { user_id = DEFAULT_USER_ID, org_id = DEFAULT_ORG_ID } = {}
) {
  if (!entry || !entry.action) {
    throw new Error('audit entry action is required');
  }
  const payload = decorateRecord(
    {
      user_id,
      action: entry.action,
      entity_type: entry.entity_type || null,
      entity_id: entry.entity_id || null,
      meta: entry.meta || null,
      created_at: entry.created_at || nowIso()
    },
    org_id
  );
  if (useSupabase) {
    const { data, error } = await supabase.from('audit_log').insert(payload).select().maybeSingle();
    if (error) throw error;
    return data || null;
  }
  const db = readLocal();
  db.audit_log.unshift({ id: createId(), ...payload });
  writeLocal(db);
  return payload;
}

export async function listAuditLogs(
  { org_id = DEFAULT_ORG_ID } = {},
  { limit = 250 } = {}
) {
  const safeLimit = Math.max(1, Math.min(limit, 1000));
  if (useSupabase) {
    let query = supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(safeLimit);
    if (org_id) query = query.eq('org_id', org_id);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
  const db = readLocal();
  return (db.audit_log || [])
    .filter(l => !org_id || l.org_id === org_id)
    .slice(0, safeLimit);
}

export async function listAnalytics({ org_id = DEFAULT_ORG_ID } = {}) {
  if (useSupabase) {
    let query = supabase
      .from('scheduled_log')
      .select(`
          id,
          scheduled_id,
          status,
          idempotency_key,
          external_id,
          error,
          attempt,
          created_at,
          org_id,
          scheduled:scheduled_id (
            id,
            provider,
            caption,
            campaign_id,
            scheduled_at
          )
        `)
      .order('created_at', { ascending: false })
      .limit(250);
    if (org_id) query = query.eq('org_id', org_id);
    const { data, error } = await query;
    if (error) throw error;
    return data.map(row => ({
      id: row.id,
      scheduled_id: row.scheduled?.id,
      provider: row.scheduled?.provider,
      caption: row.scheduled?.caption,
      campaign_id: row.scheduled?.campaign_id,
      scheduled_at: row.scheduled?.scheduled_at,
      status: row.status,
      idempotency_key: row.idempotency_key,
      external_id: row.external_id,
      error: row.error,
      attempt: row.attempt,
      created_at: row.created_at
    }));
  }
  const db = readLocal();
  return db.scheduled_log
    .filter(l => !org_id || l.org_id === org_id)
    .map((row) => {
      const scheduled = db.scheduled.find(p => p.id === row.scheduled_id) || {};
      return {
        ...row,
        provider: scheduled.provider,
        caption: scheduled.caption,
        campaign_id: scheduled.campaign_id,
        scheduled_at: scheduled.scheduled_at
      };
    });
}

export function getContextDefaults() {
  return { user_id: DEFAULT_USER_ID, org_id: DEFAULT_ORG_ID };
}

// ========== Account Groups ==========

export async function listAccountGroups({ user_id = DEFAULT_USER_ID, org_id = DEFAULT_ORG_ID } = {}) {
  if (useSupabase) {
    let query = supabase.from('account_groups').select('*').eq('user_id', user_id).order('created_at', { ascending: true });
    if (org_id) query = query.eq('org_id', org_id);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
  const db = readLocal();
  return (db.account_groups || []).filter(g => g.user_id === user_id && (!org_id || g.org_id === org_id));
}

export async function createAccountGroup(group, { user_id = DEFAULT_USER_ID, org_id = DEFAULT_ORG_ID } = {}) {
  const payload = decorateRecord({ ...group, user_id }, org_id);
  if (useSupabase) {
    const { data, error } = await supabase.from('account_groups').insert(payload).select().single();
    if (error) throw error;
    return data;
  }
  const db = readLocal();
  if (!db.account_groups) db.account_groups = [];
  const created = { id: createId(), created_at: nowIso(), ...payload };
  db.account_groups.push(created);
  writeLocal(db);
  return created;
}

export async function updateAccountGroup(id, patch, { user_id = DEFAULT_USER_ID, org_id = DEFAULT_ORG_ID } = {}) {
  if (useSupabase) {
    let query = supabase.from('account_groups').update(patch).eq('id', id).eq('user_id', user_id);
    if (org_id) query = query.eq('org_id', org_id);
    const { data, error } = await query.select().maybeSingle();
    if (error) throw error;
    return data;
  }
  const db = readLocal();
  const idx = (db.account_groups || []).findIndex(g => g.id === id && g.user_id === user_id && (!org_id || g.org_id === org_id));
  if (idx === -1) return null;
  db.account_groups[idx] = { ...db.account_groups[idx], ...patch };
  writeLocal(db);
  return db.account_groups[idx];
}

export async function deleteAccountGroup(id, { user_id = DEFAULT_USER_ID, org_id = DEFAULT_ORG_ID } = {}) {
  if (useSupabase) {
    let query = supabase.from('account_groups').delete().eq('id', id).eq('user_id', user_id);
    if (org_id) query = query.eq('org_id', org_id);
    const { error } = await query;
    if (error) throw error;
    return;
  }
  const db = readLocal();
  db.account_groups = (db.account_groups || []).filter(g => !(g.id === id && g.user_id === user_id && (!org_id || g.org_id === org_id)));
  writeLocal(db);
}
