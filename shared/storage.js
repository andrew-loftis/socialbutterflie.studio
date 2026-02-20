import { createClient } from '@supabase/supabase-js';
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

// In-memory storage for read-only environments (Netlify serverless)
let memoryStore = {
  connections: [],
  prefs: {},
  scheduled: [],
  campaigns: [],
  scheduled_log: [],
  account_groups: []
};

const localPath = path.join(process.cwd(), 'sql', 'local.json');
function readLocal() {
  // Try reading from file first
  try {
    const data = JSON.parse(fs.readFileSync(localPath, 'utf-8'));
    // Populate memory store on first read
    if (memoryStore.connections.length === 0 && data.connections) {
      memoryStore = { ...data };
    }
    return data;
  } catch {
    // If file doesn't exist or can't be read, use memory store
    return { ...memoryStore };
  }
}
function writeLocal(data) {
  // Always update memory store
  memoryStore = { ...data };
  
  // Try writing to file (will fail in read-only environments, but that's OK)
  try {
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, JSON.stringify(data, null, 2));
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
  conn = { id: conn.id || Math.random().toString(36).slice(2), ...conn, user_id, org_id };
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
  const created = { id: Math.random().toString(36).slice(2), created_at: nowIso(), ...payload };
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

export async function listScheduled({ user_id = DEFAULT_USER_ID, org_id = DEFAULT_ORG_ID } = {}) {
  if (useSupabase) {
    let query = supabase
      .from('scheduled')
      .select('*')
      .eq('user_id', user_id)
      .order('scheduled_at', { ascending: true });
    if (org_id) query = query.eq('org_id', org_id);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
  const db = readLocal();
  return db.scheduled.filter(p => (!org_id || p.org_id === org_id) && p.user_id === user_id);
}

export async function addScheduled(post, { user_id = DEFAULT_USER_ID, org_id = DEFAULT_ORG_ID } = {}) {
  const payload = decorateRecord({ ...post, user_id }, org_id);
  payload.updated_at = nowIso();
  if (useSupabase) {
    const { data, error } = await supabase.from('scheduled').insert(payload).select().single();
    if (error) throw error;
    return data;
  }
  const db = readLocal();
  const created = { id: Math.random().toString(36).slice(2), status: 'pending', retry_count: 0, ...payload };
  db.scheduled.push(created);
  writeLocal(db);
  return created;
}

export async function addScheduledBatch(posts = [], { user_id = DEFAULT_USER_ID, org_id = DEFAULT_ORG_ID } = {}) {
  if (!Array.isArray(posts) || posts.length === 0) return [];
  const now = nowIso();
  const payloads = posts.map(post => {
    const base = decorateRecord({ ...post, user_id }, org_id);
    return {
      status: post.status || 'pending',
      retry_count: 0,
      last_error: null,
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
    const record = { id: Math.random().toString(36).slice(2), created_at: now, ...payload };
    db.scheduled.push(record);
    return record;
  });
  writeLocal(db);
  return created;
}

export async function reschedulePost(id, whenIso, { user_id = DEFAULT_USER_ID, org_id = DEFAULT_ORG_ID } = {}, { clearError = false } = {}) {
  if (useSupabase) {
    const patch = { scheduled_at: whenIso, updated_at: nowIso(), status: clearError ? 'pending' : 'retry' };
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
  if (clearError) {
    post.last_error = null;
  }
  post.updated_at = nowIso();
  writeLocal(db);
  return post;
}

export async function markPosted(id, external_id, { user_id = DEFAULT_USER_ID, org_id = DEFAULT_ORG_ID } = {}) {
  if (useSupabase) {
    let query = supabase
      .from('scheduled')
      .update({ status: 'posted', external_id, last_error: null, retry_count: 0, updated_at: nowIso() })
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
      .update({ retry_count: retry, status, last_error: errorMsg, updated_at: nowIso() })
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
    post.updated_at = nowIso();
    if (post.retry_count >= 3) {
      post.status = 'failed';
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
      .lte('scheduled_at', nowIsoString);
    if (org_id) query = query.eq('org_id', org_id);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
  const db = readLocal();
  return db.scheduled.filter(p => p.user_id === user_id && (!org_id || p.org_id === org_id) && ['pending', 'retry'].includes(p.status || 'pending') && p.scheduled_at <= nowIsoString);
}

export async function updateConnection(provider, patch, { user_id = DEFAULT_USER_ID, org_id = DEFAULT_ORG_ID } = {}) {
  if (useSupabase) {
    let query = supabase
      .from('connections')
      .update(patch)
      .eq('user_id', user_id)
      .eq('provider', provider);
    if (org_id) query = query.eq('org_id', org_id);
    const { data, error } = await query.select().maybeSingle();
    if (error) throw error;
    return data;
  }
  const db = readLocal();
  const idx = db.connections.findIndex(c => c.provider === provider && c.user_id === user_id && (!org_id || c.org_id === org_id));
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
    const { data, error } = await supabase.from('scheduled_log').insert(payload);
    if (error) throw error;
    return data?.[0] || null;
  }
  const db = readLocal();
  db.scheduled_log.unshift({ id: Math.random().toString(36).slice(2), ...payload });
  writeLocal(db);
  return payload;
}

export async function listAnalytics({ org_id = DEFAULT_ORG_ID } = {}) {
  if (useSupabase) {
    let query = supabase
      .from('scheduled_log')
      .select(`
          id,
          scheduled_id,
          status,
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
  const created = { id: Math.random().toString(36).slice(2), created_at: nowIso(), ...payload };
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
