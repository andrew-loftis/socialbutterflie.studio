import { apiGet, apiPost, connect } from './api.js';

const PROVIDER_META = {
  facebook: { label: 'Facebook + IG', icon: 'fa-facebook' },
  youtube: { label: 'YouTube', icon: 'fa-youtube' },
  tiktok: { label: 'TikTok', icon: 'fa-tiktok' }
};

let accountGroups = [];
let connections = [];
let pendingGroupId = null;

// ========== Render Functions ==========

function renderAccountGroups() {
  const container = document.getElementById('accountGroupsList');
  if (!container) return;

  if (!accountGroups.length) {
    container.innerHTML = `
      <div class="text-center py-8 text-sm text-slate-400">
        <i class="fa-solid fa-inbox text-3xl mb-3 opacity-50"></i>
        <p>No account groups yet. Create one to get started!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = accountGroups.map(group => {
    const groupConns = connections.filter(c => c.account_group_id === group.id);
    const typeIcon = group.type === 'personal' ? 'fa-user' : 'fa-building';
    const typeBadge = group.type === 'personal' ? 
      '<span class="badge" style="background:rgba(139,92,246,0.2);border:1px solid rgba(139,92,246,0.3);color:#c4b5fd">Personal</span>' :
      '<span class="badge" style="background:rgba(59,130,246,0.2);border:1px solid rgba(59,130,246,0.3);color:#93c5fd">Company</span>';

    const hasBrandVoice = group.brand_voice && Object.keys(group.brand_voice).length > 0;
    const brandVoiceIndicator = hasBrandVoice ? 
      '<span class="text-xs text-emerald-400"><i class="fa-solid fa-check-circle"></i> Brand voice configured</span>' :
      '<span class="text-xs text-slate-500"><i class="fa-regular fa-circle"></i> No brand voice yet</span>';

    return `
      <div class="caption-card" data-group-id="${group.id}">
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="flex items-center gap-2">
            <i class="fa-solid ${typeIcon} text-lg"></i>
            <div>
              <h3 class="font-semibold text-base">${escapeHtml(group.name)}</h3>
              ${typeBadge}
            </div>
          </div>
          <div class="flex items-center gap-1">
            <button class="btn btn-ghost text-xs px-2" data-edit-voice="${group.id}" title="Edit Brand Voice"><i class="fa-solid fa-microphone-lines"></i></button>
            <button class="btn btn-ghost text-xs px-2" data-add-account="${group.id}"><i class="fa-solid fa-plus"></i><span>Add</span></button>
            <button class="btn btn-ghost text-xs px-2" data-delete-group="${group.id}"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
        
        <div class="text-xs mb-3">${brandVoiceIndicator}</div>
        
        ${groupConns.length ? `
          <div class="grid gap-2 mt-3">
            ${groupConns.map(conn => renderConnection(conn)).join('')}
          </div>
        ` : '<div class="text-xs text-slate-500 italic">No social accounts linked yet</div>'}
      </div>
    `;
  }).join('');

  attachGroupListeners();
}

function renderConnection(conn) {
  const meta = PROVIDER_META[conn.provider] || { label: conn.provider, icon: 'fa-plug' };
  return `
    <div class="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10 group">
      <div class="flex items-center gap-2 text-sm">
        <i class="fa-brands ${meta.icon}"></i>
        <span>${meta.label}</span>
        ${conn.label ? `<span class="text-xs text-slate-400">• ${escapeHtml(conn.label)}</span>` : ''}
      </div>
      <button class="btn btn-ghost text-xs opacity-0 group-hover:opacity-100 transition" data-disconnect="${conn.id}"><i class="fa-solid fa-link-slash"></i></button>
    </div>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ========== Event Handlers ==========

function attachGroupListeners() {
  document.querySelectorAll('[data-edit-voice]').forEach(btn => {
    btn.addEventListener('click', () => openBrandVoiceModal(btn.getAttribute('data-edit-voice')));
  });

  document.querySelectorAll('[data-add-account]').forEach(btn => {
    btn.addEventListener('click', () => openAddAccountModal(btn.getAttribute('data-add-account')));
  });

  document.querySelectorAll('[data-delete-group]').forEach(btn => {
    btn.addEventListener('click', () => deleteGroup(btn.getAttribute('data-delete-group')));
  });

  document.querySelectorAll('[data-disconnect]').forEach(btn => {
    btn.addEventListener('click', () => disconnectAccount(btn.getAttribute('data-disconnect')));
  });
}

async function deleteGroup(groupId) {
  const group = accountGroups.find(g => g.id === groupId);
  if (!group) return;
  
  const groupConns = connections.filter(c => c.account_group_id === groupId);
  const message = groupConns.length
    ? `Delete "${group.name}"? This will disconnect ${groupConns.length} social account(s).`
    : `Delete "${group.name}"?`;
  
  if (!confirm(message)) return;

  try {
    await fetch('/.netlify/functions/api?path=' + encodeURIComponent(`/account-groups/${groupId}`), {
      method: 'DELETE',
      credentials: 'include'
    });
    await loadData();
  } catch (e) {
    alert('Failed to delete group: ' + e.message);
  }
}

async function disconnectAccount(connId) {
  if (!confirm('Disconnect this account?')) return;
  try {
    await apiPost('/disconnect', { id: connId });
    await loadData();
  } catch (e) {
    alert('Failed to disconnect: ' + e.message);
  }
}

// ========== Modals ==========

function openNewGroupModal() {
  const modal = document.getElementById('newGroupModal');
  console.log('[Profile] Opening modal:', modal);
  if (modal) {
    modal.style.display = 'flex';
    const input = document.getElementById('groupName');
    if (input) input.focus();
  }
}

function closeNewGroupModal() {
  document.getElementById('newGroupModal').style.display = 'none';
  document.getElementById('newGroupForm').reset();
}

function openAddAccountModal(groupId) {
  pendingGroupId = groupId;
  document.getElementById('targetGroupId').value = groupId;
  document.getElementById('addAccountModal').style.display = 'flex';
}

function closeAddAccountModal() {
  document.getElementById('addAccountModal').style.display = 'none';
  document.getElementById('addAccountForm').reset();
  pendingGroupId = null;
}

async function handleNewGroup(e) {
  e.preventDefault();
  const name = document.getElementById('groupName').value.trim();
  const type = document.getElementById('groupType').value;
  
  if (!name) return;

  try {
    await apiPost('/account-groups', { name, type });
    closeNewGroupModal();
    await loadData();
  } catch (err) {
    alert('Failed to create group: ' + err.message);
  }
}

async function handleAddAccount(e) {
  e.preventDefault();
  const provider = document.getElementById('accountProvider').value;
  const groupId = document.getElementById('targetGroupId').value;
  
  if (!groupId) return;

  // Store group ID in localStorage so callback can pick it up
  localStorage.setItem('pendingGroupId', groupId);
  closeAddAccountModal();
  
  console.log('[Profile] Connecting provider:', provider, 'for group:', groupId);
  connect(provider);
}

// ========== Data Loading ==========

async function loadData() {
  try {
    const [groups, conns] = await Promise.all([
      apiGet('/account-groups'),
      apiGet('/connections')
    ]);
    accountGroups = groups || [];
    connections = conns || [];
    renderAccountGroups();
  } catch (e) {
    console.error('Failed to load data:', e);
    document.getElementById('accountGroupsList').innerHTML = '<div class="text-sm text-red-400">Failed to load account groups.</div>';
  }
}

async function loadPrefs() {
  try {
    const prefs = await apiGet('/prefs');
    document.getElementById('brandVoiceP').value = prefs.brandVoice || '';
    document.getElementById('defaultHashtagsP').value = (prefs.defaultHashtags || []).join(' ');
  } catch (e) {
    // ignore
  }
}

async function savePrefs(e) {
  e.preventDefault();
  const brandVoice = document.getElementById('brandVoiceP').value;
  const defaultHashtags = document.getElementById('defaultHashtagsP').value.split(/\s+/).filter(Boolean);
  try {
    await apiPost('/prefs', { brandVoice, defaultHashtags });
    const btn = e.submitter || e.target.querySelector('button[type=submit]');
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-check"></i><span>Saved</span>';
      setTimeout(() => { btn.innerHTML = orig; }, 1600);
    }
  } catch (err) {
    alert('Save failed: ' + err.message);
  }
}

// ========== Brand Voice Modal ==========

function openBrandVoiceModal(groupId) {
  const group = accountGroups.find(g => g.id === groupId);
  if (!group) return;

  document.getElementById('bvGroupId').value = groupId;
  document.getElementById('bvGroupName').textContent = group.name;

  // Populate form with existing brand voice data
  const bv = group.brand_voice || {};
  document.getElementById('bvIndustry').value = bv.industry || '';
  document.getElementById('bvTargetAudience').value = bv.targetAudience || '';
  document.getElementById('bvBusinessDescription').value = bv.businessDescription || '';
  document.getElementById('bvUniqueValue').value = bv.uniqueValue || '';
  document.getElementById('bvTone').value = bv.tone || '';
  document.getElementById('bvEmotion').value = bv.emotion || '';
  document.getElementById('bvPerspective').value = bv.perspective || 'we';
  document.getElementById('bvVoiceDescription').value = bv.voiceDescription || '';
  document.getElementById('bvCaptionStyle').value = bv.captionStyle || 'medium';
  document.getElementById('bvEmojiUsage').value = bv.emojiUsage || 'minimal';
  document.getElementById('bvContentThemes').value = bv.contentThemes || '';
  document.getElementById('bvAvoidTopics').value = bv.avoidTopics || '';
  document.getElementById('bvDefaultCTA').value = bv.defaultCTA || '';
  document.getElementById('bvSecondaryCTA').value = bv.secondaryCTA || '';
  document.getElementById('bvEngagementStyle').value = bv.engagementStyle || '';
  document.getElementById('bvHashtagStyle').value = bv.hashtagStyle || 'separate';
  document.getElementById('bvHashtagCount').value = bv.hashtagCount || '8-12';
  document.getElementById('bvBrandHashtags').value = bv.brandHashtags || '';
  document.getElementById('bvIndustryHashtags').value = bv.industryHashtags || '';
  document.getElementById('bvNicheHashtags').value = bv.nicheHashtags || '';
  document.getElementById('bvVisualStyle').value = bv.visualStyle || '';
  document.getElementById('bvLineBreaks').value = bv.lineBreaks || 'moderate';
  document.getElementById('bvCapitalization').value = bv.capitalization || 'standard';
  document.getElementById('bvSignatureSign').value = bv.signatureSign || '';
  document.getElementById('bvRecurringPhrases').value = bv.recurringPhrases || '';
  document.getElementById('bvCustomNotes').value = bv.customNotes || '';

  document.getElementById('brandVoiceModal').style.display = 'block';
}

function closeBrandVoiceModal() {
  document.getElementById('brandVoiceModal').style.display = 'none';
  document.getElementById('brandVoiceForm').reset();
}

async function saveBrandVoice(e) {
  e.preventDefault();
  const groupId = document.getElementById('bvGroupId').value;
  if (!groupId) return;

  const brandVoice = {
    industry: document.getElementById('bvIndustry').value,
    targetAudience: document.getElementById('bvTargetAudience').value,
    businessDescription: document.getElementById('bvBusinessDescription').value,
    uniqueValue: document.getElementById('bvUniqueValue').value,
    tone: document.getElementById('bvTone').value,
    emotion: document.getElementById('bvEmotion').value,
    perspective: document.getElementById('bvPerspective').value,
    voiceDescription: document.getElementById('bvVoiceDescription').value,
    captionStyle: document.getElementById('bvCaptionStyle').value,
    emojiUsage: document.getElementById('bvEmojiUsage').value,
    contentThemes: document.getElementById('bvContentThemes').value,
    avoidTopics: document.getElementById('bvAvoidTopics').value,
    defaultCTA: document.getElementById('bvDefaultCTA').value,
    secondaryCTA: document.getElementById('bvSecondaryCTA').value,
    engagementStyle: document.getElementById('bvEngagementStyle').value,
    hashtagStyle: document.getElementById('bvHashtagStyle').value,
    hashtagCount: document.getElementById('bvHashtagCount').value,
    brandHashtags: document.getElementById('bvBrandHashtags').value,
    industryHashtags: document.getElementById('bvIndustryHashtags').value,
    nicheHashtags: document.getElementById('bvNicheHashtags').value,
    visualStyle: document.getElementById('bvVisualStyle').value,
    lineBreaks: document.getElementById('bvLineBreaks').value,
    capitalization: document.getElementById('bvCapitalization').value,
    signatureSign: document.getElementById('bvSignatureSign').value,
    recurringPhrases: document.getElementById('bvRecurringPhrases').value,
    customNotes: document.getElementById('bvCustomNotes').value
  };

  try {
    await fetch('/.netlify/functions/api?path=' + encodeURIComponent(`/account-groups/${groupId}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ brand_voice: brandVoice })
    });
    
    closeBrandVoiceModal();
    await loadData();
    
    // Show success feedback
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 glass-panel px-4 py-3 text-sm text-emerald-400 z-50';
    toast.innerHTML = '<i class="fa-solid fa-check-circle"></i> Brand voice saved successfully!';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  } catch (err) {
    alert('Failed to save brand voice: ' + err.message);
  }
}

// ========== Connection Refresh Handler ==========

window.addEventListener('connections:refresh', async () => {
  console.log('[Profile] Connection refresh triggered');
  
  // If we have a pending group ID, assign the new connection to that group
  const groupId = localStorage.getItem('pendingGroupId');
  if (groupId) {
    console.log('[Profile] Assigning new connection to group:', groupId);
    // Wait a moment for the backend to save the connection
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const freshConns = await apiGet('/connections');
      // Find connections without a group (newly added)
      const unassigned = freshConns.filter(c => !c.account_group_id);
      
      if (unassigned.length) {
        // Assign the most recent one to our group
        const newest = unassigned[unassigned.length - 1];
        console.log('[Profile] Updating connection', newest.id, 'to group', groupId);
        
        // We need an update endpoint - for now we'll just reload
        // TODO: Add PATCH /connections/:id endpoint
      }
    } catch (e) {
      console.error('Failed to assign connection to group:', e);
    }
    
    localStorage.removeItem('pendingGroupId');
  }
  
  loadData();
});

// ========== Initialization ==========

function init() {
  const newGroupBtn = document.getElementById('newGroupBtn');
  const cancelGroupBtn = document.getElementById('cancelGroupBtn');
  const newGroupForm = document.getElementById('newGroupForm');
  const cancelAccountBtn = document.getElementById('cancelAccountBtn');
  const addAccountForm = document.getElementById('addAccountForm');
  const closeBrandVoiceBtn = document.getElementById('closeBrandVoiceBtn');
  const cancelBrandVoiceBtn = document.getElementById('cancelBrandVoiceBtn');
  const brandVoiceForm = document.getElementById('brandVoiceForm');
  const aiForm = document.getElementById('aiFormProfile');

  console.log('[Profile] Initializing...');
  console.log('[Profile] newGroupBtn:', newGroupBtn);
  console.log('[Profile] modal:', document.getElementById('newGroupModal'));

  if (newGroupBtn) {
    newGroupBtn.addEventListener('click', () => {
      console.log('[Profile] New Group button clicked!');
      openNewGroupModal();
    });
  } else {
    console.warn('[Profile] newGroupBtn not found!');
  }
  
  if (cancelGroupBtn) cancelGroupBtn.addEventListener('click', closeNewGroupModal);
  if (newGroupForm) newGroupForm.addEventListener('submit', handleNewGroup);
  if (cancelAccountBtn) cancelAccountBtn.addEventListener('click', closeAddAccountModal);
  if (addAccountForm) addAccountForm.addEventListener('submit', handleAddAccount);
  if (closeBrandVoiceBtn) closeBrandVoiceBtn.addEventListener('click', closeBrandVoiceModal);
  if (cancelBrandVoiceBtn) cancelBrandVoiceBtn.addEventListener('click', closeBrandVoiceModal);
  if (brandVoiceForm) brandVoiceForm.addEventListener('submit', saveBrandVoice);
  if (aiForm) aiForm.addEventListener('submit', savePrefs);

  loadData();
  loadPrefs();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
