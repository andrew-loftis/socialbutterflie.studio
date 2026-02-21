import { apiGet, connect } from './api.js';

const dashboardState = {
  scheduled: [],
  campaigns: [],
  connections: [],
  insights: [
    {
      id: 'best-time',
      title: 'Best Time to Post',
      summary: 'Audience activity peaks on weekdays between 2 PM and 4 PM.',
      status: 'Recommendation',
      versions: ['v3 Timing model recalculated', 'v2 Weekend weights adjusted', 'v1 Baseline profile'],
      approvals: ['Approved by Strategy Lead'],
      audit: ['Insight refreshed 2h ago', 'Data source: 90-day engagement history']
    },
    {
      id: 'trending-content',
      title: 'Trending Content',
      summary: 'Short-form video currently drives higher engagement than static posts.',
      status: 'Opportunity',
      versions: ['v2 Trend confidence 88%', 'v1 Initial pattern'],
      approvals: ['Awaiting Content Director review'],
      audit: ['Trend model run at 9:10 AM']
    },
    {
      id: 'growth-opportunity',
      title: 'Growth Opportunity',
      summary: 'Instagram Stories are underutilized relative to follower response rate.',
      status: 'Actionable',
      versions: ['v2 Segmenting by campaign', 'v1 Initial recommendation'],
      approvals: ['Approved for March sprint'],
      audit: ['Assigned to Social Ops queue']
    }
  ]
};

function escapeHtml(text = '') {
  return String(text).replace(/[&<>"']/g, (match) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[match];
  });
}

function formatDateTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.valueOf())) return iso;
  return date.toLocaleString();
}

function setCurrentDate() {
  const dateEl = document.getElementById('currentDate');
  if (!dateEl) return;
  const now = new Date();
  const options = { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' };
  dateEl.textContent = now.toLocaleDateString('en-US', options);
}

function renderConnections(connections = []) {
  const grid = document.getElementById('connectionsGrid');
  if (!grid) return;
  const providers = [
    { key: 'instagram', label: 'Instagram', icon: 'fa-instagram', color: '#e1306c' },
    { key: 'facebook', label: 'Facebook', icon: 'fa-facebook', color: '#1877f2' },
    { key: 'youtube', label: 'YouTube', icon: 'fa-youtube', color: '#ff0000' },
    { key: 'tiktok', label: 'TikTok', icon: 'fa-tiktok', color: '#111111' }
  ];
  const connected = new Set((connections || []).map((c) => c.provider));
  if (connected.has('facebook')) connected.add('instagram');

  grid.innerHTML = providers
    .map((provider) => {
      const isConnected = connected.has(provider.key);
      const action = isConnected
        ? '<i class="fa-solid fa-check-circle connection-check"></i>'
        : `<button class="btn btn-sm" data-connect-provider="${provider.key === 'instagram' ? 'facebook' : provider.key}">Connect</button>`;
      return `
      <div class="connection-card" data-inspector-type="account" data-inspector-id="${provider.key}">
        <div class="connection-icon" style="color:${provider.color}">
          <i class="fa-brands ${provider.icon}"></i>
        </div>
        <div class="connection-details">
          <div class="connection-name">${provider.label}</div>
          <div class="connection-status">${isConnected ? 'Connected' : 'Not Connected'}</div>
        </div>
        ${action}
      </div>
    `;
    })
    .join('');
  grid.querySelectorAll('[data-connect-provider]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      connect(btn.getAttribute('data-connect-provider'));
    });
  });
}

function renderUpcoming(posts = []) {
  const el = document.getElementById('upcomingPosts');
  if (!el) return;
  if (!posts.length) {
    el.innerHTML = '<div class="text-sm text-muted">No upcoming posts yet.</div>';
    return;
  }
  const top = posts.filter((p) => ['pending', 'review', 'draft', 'retry'].includes(p.status)).slice(0, 6);
  el.innerHTML = top
    .map(
      (p, index) => `
    <div class="caption-card" data-inspector-type="post" data-inspector-id="${escapeHtml(p.id || `post-${index}`)}">
      <div class="flex items-center justify-between gap-2">
        <strong>${escapeHtml(p.provider)}</strong>
        <span class="badge">${escapeHtml(p.status)}</span>
      </div>
      <div class="text-xs text-muted mt-1">${escapeHtml(formatDateTime(p.scheduled_at))}</div>
      <div class="text-sm mt-2">${escapeHtml((p.caption || '').slice(0, 120) || '(No caption)')}</div>
    </div>
  `
    )
    .join('');
}

function renderCampaigns(campaigns = [], posts = []) {
  const grid = document.getElementById('campaignsGrid');
  if (!grid) return;
  if (!campaigns.length) {
    grid.innerHTML = '<div class="text-sm text-muted">No campaigns yet.</div>';
    return;
  }
  grid.innerHTML = campaigns
    .slice(0, 6)
    .map((campaign) => {
      const count = posts.filter((p) => p.campaign_id === campaign.id).length;
      return `
      <div class="campaign-card" data-inspector-type="campaign" data-inspector-id="${escapeHtml(campaign.id)}">
        <div class="campaign-header">
          <div class="campaign-marker" style="background:${campaign.color || '#4f46e5'}"></div>
          <div>
            <h3 class="campaign-name">${escapeHtml(campaign.name)}</h3>
            <p class="campaign-posts">${count} posts scheduled</p>
          </div>
        </div>
      </div>
    `;
    })
    .join('');
}

function renderStats(posts = []) {
  const scheduled = posts.filter((p) => ['pending', 'review', 'retry', 'processing'].includes(p.status)).length;
  const published = posts.filter((p) => p.status === 'posted').length;
  const review = posts.filter((p) => p.status === 'review').length;
  const drafts = posts.filter((p) => p.status === 'draft').length;

  const set = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
  };
  set('scheduledCount', scheduled);
  set('publishedCount', published);
  set('reviewCount', review);
  set('draftCount', drafts);
}

function renderContext(context) {
  const banner = document.getElementById('activeContextBanner');
  if (!banner) return;
  const ws = context.org_id ? context.org_id : 'No workspace selected';
  banner.innerHTML = `Active user <strong>${escapeHtml(context.user_id || 'demo')}</strong> · Role <strong>${escapeHtml(context.user_role || 'viewer')}</strong> · Workspace <strong>${escapeHtml(ws)}</strong>`;
}

function setList(listId, items = []) {
  const list = document.getElementById(listId);
  if (!list) return;
  list.innerHTML = '';
  if (!items.length) {
    const li = document.createElement('li');
    li.textContent = 'No events';
    list.appendChild(li);
    return;
  }
  items.slice(0, 4).forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    list.appendChild(li);
  });
}

function openInspector(record) {
  const panel = document.getElementById('inspectorPanel');
  if (!panel || !record) return;
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  setText('inspectorType', record.typeLabel || 'Inspector');
  setText('inspectorTitle', record.title || 'Untitled');
  setText('inspectorStatus', record.status || 'Ready');
  setText('inspectorUpdated', record.updated || 'Now');
  setText('inspectorSummary', record.summary || '');
  setList('inspectorVersions', record.versions || []);
  setList('inspectorApprovals', record.approvals || []);
  setList('inspectorAudit', record.audit || []);
  panel.classList.add('inspector-open');
}

function closeInspector() {
  const panel = document.getElementById('inspectorPanel');
  if (panel) panel.classList.remove('inspector-open');
}

function findRecord(type, id) {
  if (type === 'post') {
    const post = dashboardState.scheduled.find((p) => String(p.id || '') === String(id));
    if (!post) return null;
    return {
      typeLabel: 'Post',
      title: `${post.provider || 'Post'} delivery`,
      status: post.status || 'pending',
      updated: formatDateTime(post.updated_at || post.scheduled_at || new Date().toISOString()),
      summary: post.caption || 'No caption',
      versions: ['v3 AI polish', 'v2 Client edits', 'v1 Initial draft'],
      approvals: [post.status === 'review' ? 'Awaiting approval' : 'Approved for publishing'],
      audit: [`Scheduled for ${formatDateTime(post.scheduled_at)}`, 'Source: dashboard queue']
    };
  }
  if (type === 'campaign') {
    const campaign = dashboardState.campaigns.find((c) => String(c.id) === String(id));
    if (!campaign) return null;
    const count = dashboardState.scheduled.filter((p) => p.campaign_id === campaign.id).length;
    return {
      typeLabel: 'Campaign',
      title: campaign.name || 'Campaign',
      status: 'Active',
      updated: new Date().toLocaleString(),
      summary: `${count} scheduled posts linked to this campaign.`,
      versions: ['v2 Messaging update', 'v1 Campaign created'],
      approvals: ['Creative lead approved', 'Publishing rules active'],
      audit: ['Campaign opened from dashboard']
    };
  }
  if (type === 'account') {
    const live = dashboardState.connections.some((c) => c.provider === id || (id === 'instagram' && c.provider === 'facebook'));
    return {
      typeLabel: 'Account',
      title: `${id[0].toUpperCase()}${id.slice(1)}`,
      status: live ? 'Connected' : 'Not connected',
      updated: new Date().toLocaleString(),
      summary: live ? 'Account is ready for direct publishing.' : 'Connection required before scheduling.',
      versions: ['v1 Token snapshot'],
      approvals: [live ? 'Publishing access granted' : 'No scopes granted'],
      audit: [`Connection state checked for ${id}`]
    };
  }
  if (type === 'insight') {
    const insight = dashboardState.insights.find((i) => i.id === id);
    if (!insight) return null;
    return {
      typeLabel: 'Insight',
      title: insight.title,
      status: insight.status,
      updated: 'Updated today',
      summary: insight.summary,
      versions: insight.versions,
      approvals: insight.approvals,
      audit: insight.audit
    };
  }
  return null;
}

function initInspectorInteractions() {
  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-inspector-type]');
    if (target) {
      const type = target.getAttribute('data-inspector-type');
      const id = target.getAttribute('data-inspector-id');
      const record = findRecord(type, id);
      if (record) openInspector(record);
      return;
    }
    const commandButton = event.target.closest('[data-command]');
    if (!commandButton) return;
    const cmd = commandButton.getAttribute('data-command');
    if (cmd === 'new-post') window.location.href = './build.html';
    if (cmd === 'review') window.location.href = './review.html';
    if (cmd === 'reports') window.location.href = './analytics.html';
  });

  const closeBtn = document.getElementById('closeInspectorBtn');
  if (closeBtn) closeBtn.addEventListener('click', closeInspector);
}

function initCommandBar() {
  const input = document.getElementById('commandInput');
  if (!input) return;

  const search = () => {
    const q = input.value.trim().toLowerCase();
    if (!q) return;
    const post = dashboardState.scheduled.find(
      (p) =>
        String(p.caption || '')
          .toLowerCase()
          .includes(q) || String(p.provider || '').toLowerCase().includes(q)
    );
    if (post) {
      openInspector(findRecord('post', post.id));
      return;
    }
    const campaign = dashboardState.campaigns.find((c) => String(c.name || '').toLowerCase().includes(q));
    if (campaign) {
      openInspector(findRecord('campaign', campaign.id));
      return;
    }
    const provider = ['instagram', 'facebook', 'youtube', 'tiktok'].find((key) => key.includes(q));
    if (provider) {
      openInspector(findRecord('account', provider));
    }
  };

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      search();
    }
  });

  document.addEventListener('keydown', (event) => {
    const tag = document.activeElement?.tagName;
    const inInput = tag === 'INPUT' || tag === 'TEXTAREA';
    if (!inInput && event.key === '/') {
      event.preventDefault();
      input.focus();
    }
  });
}

async function init() {
  setCurrentDate();
  initInspectorInteractions();
  initCommandBar();
  try {
    const [context, scheduled, campaigns, connections] = await Promise.all([
      apiGet('/context'),
      apiGet('/scheduled'),
      apiGet('/campaigns'),
      apiGet('/connections')
    ]);
    dashboardState.scheduled = Array.isArray(scheduled) ? scheduled : [];
    dashboardState.campaigns = Array.isArray(campaigns) ? campaigns : [];
    dashboardState.connections = Array.isArray(connections) ? connections : [];
    renderContext(context || {});
    renderConnections(dashboardState.connections);
    renderUpcoming(dashboardState.scheduled);
    renderCampaigns(dashboardState.campaigns, dashboardState.scheduled);
    renderStats(dashboardState.scheduled);
  } catch (e) {
    const banner = document.getElementById('activeContextBanner');
    if (banner) banner.textContent = `Dashboard load failed: ${e.message}`;
  }
}

init();
