import { apiGet, apiPost, connect } from './api.js';

window.connect = connect;

let calendar;
let campaigns = [];
let allPosts = [];
let brandVoice = '';
let defaultHashtags = [];
let aiSuggestionText = '';
let captionPreviewText = '';
let captionPreviewVariant = null;
let latestCalendarPlan = [];
let accountGroups = [];
let currentGroupId = null;
let selectedPost = null;

const platformColors = {
  instagram: '#e1306c',
  facebook: '#1877f2',
  youtube: '#ff0000',
  tiktok: '#010101'
};

const statusLabels = {
  draft: 'Draft',
  review: 'In Review',
  pending: 'Approved',
  rejected: 'Rejected',
  retry: 'Retrying',
  processing: 'Publishing',
  posted: 'Posted',
  failed: 'Failed'
};

function escapeHtml(text = '') {
  if (text == null) text = '';
  return String(text).replace(/[&<>"']/g, (match) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[match];
  });
}

window.closeAiModal = closeAiModal;
window.openCaptionStudio = openCaptionStudio;
window.openHashtagWorkshop = openHashtagWorkshop;
window.openAltTextLab = openAltTextLab;
window.openCalendarPlanner = openCalendarPlanner;
window.generateHashtagPack = generateHashtagPack;
window.copyHashtagOutput = copyHashtagOutput;
window.appendHashtagsToCaption = appendHashtagsToCaption;
window.generateAltTextSuggestion = generateAltTextSuggestion;
window.copyAltTextOutput = copyAltTextOutput;
window.generateContentCalendarPlan = generateContentCalendarPlan;
window.copyCalendarPlan = copyCalendarPlan;
window.copyCaptionPreview = copyCaptionPreview;
window.applyCaptionPreview = applyCaptionPreview;
function toggleModal(id, show) {
  const el = document.getElementById(id);
  if (!el) return;
  if (show) {
    el.classList.remove('hidden');
    el.classList.add('flex');
  } else {
    el.classList.add('hidden');
    el.classList.remove('flex');
  }
}

async function copyToClipboard(text) {
  if (!text) return false;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch (err) {
    document.body.removeChild(textarea);
    return false;
  }
}

function setSuggestionText(text, enableActions = false) {
  const suggestionEl = document.getElementById('aiSuggestion');
  if (suggestionEl) {
    suggestionEl.textContent = text;
  }
  const applyBtn = document.getElementById('aiApplySuggestion');
  const copyBtn = document.getElementById('aiCopySuggestion');
  if (applyBtn) applyBtn.disabled = !enableActions;
  if (copyBtn) copyBtn.disabled = !enableActions;
}

function setBrandSummary() {
  const summaryEl = document.getElementById('aiSummary');
  if (!summaryEl) return;
  if (!brandVoice && (!defaultHashtags || defaultHashtags.length === 0)) {
    summaryEl.textContent = 'Set your brand voice in Settings to unlock tailored AI copy and tags.';
    return;
  }
  const segments = [];
  if (brandVoice) segments.push(brandVoice);
  if (defaultHashtags?.length) segments.push(`Default hashtags: ${defaultHashtags.join(' ')}`);
  summaryEl.innerHTML = segments.map(seg => `<div>${escapeHtml(seg)}</div>`).join('');
}

function formatFileSize(bytes) {
  const value = Number(bytes);
  if (!value || Number.isNaN(value)) return '';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(unit === 0 ? 0 : size < 10 ? 1 : 0)} ${units[unit]}`;
}

function formatDuration(totalSeconds) {
  const value = Number(totalSeconds);
  if (!value || Number.isNaN(value)) return '';
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60).toString().padStart(2, '0');
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remMinutes = (minutes % 60).toString().padStart(2, '0');
    return `${hours}:${remMinutes}:${seconds}`;
  }
  return `${minutes}:${seconds}`;
}

function formatDateTime(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.valueOf())) return isoString;
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

async function loadPreferences() {
  try {
    const [prefs, groups] = await Promise.all([
      apiGet('/prefs'),
      apiGet('/account-groups')
    ]);
    
    brandVoice = prefs.brandVoice || '';
    defaultHashtags = Array.isArray(prefs.defaultHashtags) ? prefs.defaultHashtags : [];
    accountGroups = groups || [];
    
    // Set current group to first group with brand voice, or first group, or null
    if (accountGroups.length > 0) {
      const groupWithVoice = accountGroups.find(g => g.brand_voice && Object.keys(g.brand_voice).length > 0);
      currentGroupId = groupWithVoice ? groupWithVoice.id : accountGroups[0].id;
    }
  } catch (err) {
    console.warn('Failed to load preferences', err);
    brandVoice = '';
    defaultHashtags = [];
    accountGroups = [];
  } finally {
    setBrandSummary();
  }
}

function setupAiAssistant() {
  const refreshBtn = document.getElementById('aiRefreshSuggestion');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => refreshCaptionSuggestion());
  }
  const applyBtn = document.getElementById('aiApplySuggestion');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => applySuggestionToCaption());
  }
  const copyBtn = document.getElementById('aiCopySuggestion');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => copySuggestionToClipboard());
  }

  const captionButtons = document.querySelectorAll('#captionVariantButtons button[data-variant]');
  captionButtons.forEach((btn) => {
    btn.addEventListener('click', () => generateCaptionVariant(btn.dataset.variant));
  });

  const captionField = document.getElementById('caption');
  if (captionField) {
    captionField.addEventListener('input', () => {
      const hasDraft = captionField.value.trim().length > 0;
      if (aiSuggestionText) {
        aiSuggestionText = '';
        setSuggestionText('Caption updated — refresh for a new suggestion.', false);
      }
      const applyEl = document.getElementById('aiApplySuggestion');
      if (applyEl && !aiSuggestionText) {
        applyEl.disabled = true;
      }
      const copyEl = document.getElementById('aiCopySuggestion');
      if (copyEl && !aiSuggestionText) {
        copyEl.disabled = true;
      }
      const topic = document.getElementById('hashtagTopic');
      if (topic && !topic.value) {
        topic.placeholder = hasDraft ? 'Use your caption as the topic or enter keywords…' : 'Topic or keywords (e.g. modern architecture render)';
      }
    });
  }
}

function formatVariantLabel(variant) {
  const labels = {
    short: 'Short punchy',
    standard: 'Standard',
    long: 'Longform',
    playful: 'Playful',
    improve: 'Improved draft'
  };
  return labels[variant] || variant;
}

function setActiveVariantButton(variant) {
  const buttons = document.querySelectorAll('#captionVariantButtons button[data-variant]');
  buttons.forEach((btn) => {
    const active = btn.dataset.variant === variant;
    btn.classList.toggle('btn-toggle-active', active);
    if (variant === null) {
      btn.classList.remove('opacity-70');
    } else {
      btn.classList.toggle('opacity-70', !active);
    }
  });
}

function getCaptionDraft() {
  return document.getElementById('caption')?.value || '';
}

async function refreshCaptionSuggestion() {
  setSuggestionText('Generating caption…');
  aiSuggestionText = '';
  try {
    const draft = getCaptionDraft();
    const variant = draft.trim().length ? 'improve' : 'standard';
    
    // Use current group's brand voice if available, otherwise fall back to legacy brandVoice string
    const payload = { variant, draft };
    if (currentGroupId) {
      payload.groupId = currentGroupId;
    } else {
      payload.brandVoice = { businessName: brandVoice };
    }
    
    const result = await apiPost('/ai/caption', payload);
    aiSuggestionText = result.caption || '';
    if (!aiSuggestionText) {
      const message = result.error || 'No suggestion available right now.';
      setSuggestionText(message, false);
      return;
    }
    setSuggestionText(aiSuggestionText, true);
  } catch (err) {
    setSuggestionText(`Failed to load suggestion: ${err.message}`, false);
  }
}

function applySuggestionToCaption() {
  if (!aiSuggestionText) return;
  const captionEl = document.getElementById('caption');
  if (!captionEl) return;
  captionEl.value = aiSuggestionText;
  captionEl.focus();
}

async function copySuggestionToClipboard() {
  if (!aiSuggestionText) return;
  const success = await copyToClipboard(aiSuggestionText);
  if (!success) {
    alert('Copy failed — your browser may block clipboard access.');
  }
}

function openAiModal(id) {
  toggleModal(id, true);
}

function closeAiModal(id) {
  toggleModal(id, false);
}

async function generateCaptionVariant(variant = 'standard') {
  const previewEl = document.getElementById('captionPreview');
  const metadataEl = document.getElementById('captionMetadata');
  if (!previewEl || !metadataEl) return;
  captionPreviewVariant = variant;
  captionPreviewText = '';
  setActiveVariantButton(variant);
  metadataEl.textContent = 'Generating caption…';
  previewEl.value = '';
  try {
    const draft = getCaptionDraft();
    const payload = { variant, draft };
    if (currentGroupId) {
      payload.groupId = currentGroupId;
    } else {
      payload.brandVoice = { businessName: brandVoice };
    }
    
    const result = await apiPost('/ai/caption', payload);
    captionPreviewText = result.caption || '';
    if (!captionPreviewText) {
      previewEl.value = result.error || 'No caption generated. Configure AI settings to enable magic.';
      metadataEl.textContent = 'Generation unavailable';
      return;
    }
    previewEl.value = captionPreviewText;
    metadataEl.textContent = `${formatVariantLabel(variant)} variant ready.`;
  } catch (err) {
    metadataEl.textContent = `Failed to generate: ${err.message}`;
  }
}

function openCaptionStudio() {
  const previewEl = document.getElementById('captionPreview');
  if (previewEl) {
    previewEl.value = getCaptionDraft();
    captionPreviewText = previewEl.value;
  }
  const metadataEl = document.getElementById('captionMetadata');
  if (metadataEl) metadataEl.textContent = 'Pick a variant to generate copy.';
  setActiveVariantButton(null);
  openAiModal('aiCaptionModal');
  generateCaptionVariant('standard');
}

async function copyCaptionPreview() {
  const previewEl = document.getElementById('captionPreview');
  const value = previewEl?.value?.trim();
  if (!value) return;
  const success = await copyToClipboard(value);
  if (!success) {
    alert('Copy failed — your browser may block clipboard access.');
  }
}

function applyCaptionPreview() {
  const previewEl = document.getElementById('captionPreview');
  const value = previewEl?.value;
  if (!value) return;
  const captionEl = document.getElementById('caption');
  if (!captionEl) return;
  captionEl.value = value;
  captionEl.focus();
  closeAiModal('aiCaptionModal');
}

function openHashtagWorkshop() {
  const topicEl = document.getElementById('hashtagTopic');
  const draft = getCaptionDraft();
  if (topicEl && !topicEl.value) {
    topicEl.value = '';
    topicEl.placeholder = draft ? 'Using caption context — tweak or replace keywords…' : 'Topic or keywords (e.g. modern architecture render)';
  }
  const outputEl = document.getElementById('hashtagOutput');
  if (outputEl && !outputEl.value.trim() && defaultHashtags?.length) {
    outputEl.value = defaultHashtags.join(' ');
  }
  openAiModal('aiHashtagModal');
}

function openAltTextLab() {
  const urlEl = document.getElementById('altTextUrl');
  const mediaUrl = document.getElementById('mediaUrl')?.value?.trim();
  if (urlEl && !urlEl.value && mediaUrl) {
    urlEl.value = mediaUrl;
  }
  openAiModal('aiAltModal');
}

function openCalendarPlanner() {
  const planEl = document.getElementById('calendarPlan');
  if (planEl && !planEl.innerHTML.trim()) {
    planEl.innerHTML = '<div class="text-sm text-slate-400">Add campaign events or click generate to start planning.</div>';
  }
  openAiModal('aiCalendarModal');
}

async function generateHashtagPack() {
  const topicEl = document.getElementById('hashtagTopic');
  const styleEl = document.getElementById('hashtagStyle');
  const outputEl = document.getElementById('hashtagOutput');
  if (!styleEl || !outputEl) return;
  const draft = getCaptionDraft();
  const topic = topicEl?.value?.trim() || draft || brandVoice || 'social media strategy';
  const style = styleEl.value || 'balanced';
  outputEl.value = 'Generating hashtags…';
  try {
    const payload = { topic, style };
    if (currentGroupId) {
      payload.groupId = currentGroupId;
    }
    
    const result = await apiPost('/ai/hashtags', payload);
    const tags = Array.isArray(result.hashtags) ? result.hashtags : [];
    if (!tags.length) {
      outputEl.value = result.error || 'Configure OpenAI API to enable hashtag generation.';
      return;
    }
    outputEl.value = tags.join(' ');
  } catch (err) {
    outputEl.value = `Failed to generate hashtags: ${err.message}`;
  }
}

async function copyHashtagOutput() {
  const outputEl = document.getElementById('hashtagOutput');
  const value = outputEl?.value?.trim();
  if (!value) return;
  const success = await copyToClipboard(value);
  if (!success) alert('Copy failed — clipboard access denied.');
}

function appendHashtagsToCaption() {
  const outputEl = document.getElementById('hashtagOutput');
  if (!outputEl || !outputEl.value.trim()) return;
  const captionEl = document.getElementById('caption');
  if (!captionEl) return;
  const base = captionEl.value.trim();
  const hashtags = outputEl.value.trim();
  captionEl.value = base ? `${base}\n\n${hashtags}` : hashtags;
  captionEl.focus();
  closeAiModal('aiHashtagModal');
}

async function generateAltTextSuggestion() {
  const urlEl = document.getElementById('altTextUrl');
  const outputEl = document.getElementById('altTextOutput');
  if (!outputEl) return;
  const urlValue = urlEl?.value?.trim() || document.getElementById('mediaUrl')?.value?.trim();
  if (!urlValue) {
    outputEl.value = 'Provide a media URL to describe.';
    return;
  }
  outputEl.value = 'Generating alt text…';
  try {
    const payload = { mediaUrl: urlValue };
    if (currentGroupId) {
      payload.groupId = currentGroupId;
    } else {
      payload.brandVoice = { businessName: brandVoice };
    }
    
    const result = await apiPost('/ai/alttext', payload);
    outputEl.value = result.altText || result.error || 'Alt text unavailable — configure OpenAI API.';
  } catch (err) {
    outputEl.value = `Failed to generate alt text: ${err.message}`;
  }
}

async function copyAltTextOutput() {
  const outputEl = document.getElementById('altTextOutput');
  const value = outputEl?.value?.trim();
  if (!value) return;
  const success = await copyToClipboard(value);
  if (!success) alert('Copy failed — clipboard access denied.');
}

async function generateContentCalendarPlan() {
  const eventsEl = document.getElementById('calendarEvents');
  const planEl = document.getElementById('calendarPlan');
  if (!planEl) return;
  const events = eventsEl?.value
    ?.split('\n')
    .map(s => s.trim())
    .filter(Boolean) || [];
  planEl.innerHTML = '<div class="text-sm text-slate-400">Generating plan…</div>';
  latestCalendarPlan = [];
  try {
    const payload = { upcomingEvents: events };
    if (currentGroupId) {
      payload.groupId = currentGroupId;
    } else {
      payload.brandVoice = { businessName: brandVoice };
    }
    
    const result = await apiPost('/ai/calendar', payload);
    const calendar = Array.isArray(result.calendar) ? result.calendar : [];
    if (!calendar.length) {
      planEl.innerHTML = `<div class="text-sm text-red-400">${escapeHtml(result.error || 'Configure OpenAI to generate a calendar plan.')}</div>`;
      return;
    }
    latestCalendarPlan = calendar;
    planEl.innerHTML = calendar.map((week, index) => `
      <div class="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
        <div class="text-xs uppercase tracking-wide text-slate-500">Week ${escapeHtml(String(week.week || index + 1))}</div>
        <div class="text-lg font-semibold mt-1">${escapeHtml(week.theme || week.title || 'Campaign concept')}</div>
        <p class="text-sm text-slate-300 mt-2 leading-relaxed">${escapeHtml(week.caption || '')}</p>
        <div class="text-xs text-indigo-200 mt-3">${escapeHtml((week.hashtags || []).join(' '))}</div>
      </div>
    `).join('');
  } catch (err) {
    planEl.innerHTML = `<div class="text-sm text-red-400">${escapeHtml(err.message)}</div>`;
  }
}

async function copyCalendarPlan() {
  if (!latestCalendarPlan.length) {
    alert('Generate a plan first.');
    return;
  }
  const text = latestCalendarPlan.map((week, idx) => {
    const title = week.theme || week.title || `Week ${idx + 1}`;
    const caption = week.caption || '';
    const hashtags = Array.isArray(week.hashtags) ? week.hashtags.join(' ') : '';
    return `Week ${idx + 1}: ${title}\n${caption}${hashtags ? `\n${hashtags}` : ''}`;
  }).join('\n\n');
  const success = await copyToClipboard(text);
  if (!success) alert('Copy failed — clipboard access denied.');
}

function renderChips(conns) {
  const el = document.getElementById('connectedChips');
  if (!el) return;
  if (!conns || !conns.length) {
    el.innerHTML = '<span class="chip chip-empty">No accounts</span>';
    return;
  }
  el.innerHTML = conns.map(c => `<span class="chip">${c.provider}</span>`).join('');
}

async function init() {
  setupAiAssistant();
  await loadPreferences();
  const conns = await apiGet('/connections');
  renderChips(conns);
  renderConnectionsPanel(conns);
  campaigns = await apiGet('/campaigns');
  renderCampaignOptions();
  renderCampaignFilter();
  setupFilters();
  await loadCalendar();
  await refreshCaptionSuggestion();
}

window.addEventListener('connections:refresh', async () => {
  try {
    const conns = await apiGet('/connections');
    renderChips(conns);
    renderConnectionsPanel(conns);
  } catch (e) {
    console.warn('Refresh connections failed', e);
  }
});

function renderConnectionsPanel(conns) {
  const list = document.getElementById('connectionsList');
  if (!list) return;
  const providers = [
    { key: 'facebook', label: 'Facebook + IG', icon: 'fa-facebook', supports: ['facebook','instagram'] },
    { key: 'youtube', label: 'YouTube', icon: 'fa-youtube' },
    { key: 'tiktok', label: 'TikTok', icon: 'fa-tiktok' }
  ];
  const connected = new Map();
  (conns||[]).forEach(c => connected.set(c.provider, c));
  list.innerHTML = providers.map(p => {
    const isFb = p.key === 'facebook';
    const active = connected.has(p.key) || (isFb && connected.has('facebook'));
    const status = active ? '<span class="badge" style="background:rgba(34,197,94,0.25);border:1px solid rgba(34,197,94,0.4);color:#bbf7d0">Connected</span>' : '<span class="badge" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:var(--text-muted)">Not linked</span>';
    const actionBtn = active ? `<button class="btn btn-ghost" data-disconnect="${p.key}"><i class="fa-solid fa-link-slash"></i><span>Disconnect</span></button>` : `<button class="btn btn-secondary" data-connect="${p.key}"><i class="fa-brands ${p.icon}"></i><span>Link ${p.label}</span></button>`;
    const extra = isFb ? '<div class="text-xs text-slate-500">Includes Instagram Business account if Page is linked.</div>' : '';
    return `
      <div class="caption-card" data-provider-card="${p.key}">
        <div class="flex items-center justify-between gap-3">
          <div class="text-sm font-medium flex items-center gap-2"><i class="fa-brands ${p.icon}"></i><span>${p.label}</span></div>
          ${status}
        </div>
        ${extra}
        <footer>${actionBtn}</footer>
      </div>
    `;
  }).join('');
  list.querySelectorAll('[data-connect]').forEach(btn => {
    btn.addEventListener('click', () => connect(btn.getAttribute('data-connect')));
  });
  list.querySelectorAll('[data-disconnect]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Disconnect this account?')) return;
      try { await apiPost('/disconnect', { provider: btn.getAttribute('data-disconnect') }); } catch(e){ alert('Disconnect failed'); }
      const refreshed = await apiGet('/connections');
      renderConnectionsPanel(refreshed);
      renderChips(refreshed);
    });
  });
}

function renderCampaignOptions() {
  const select = document.getElementById('campaign');
  if (!select) return;
  const value = select.value;
  select.innerHTML = '<option value="">No campaign</option>' + campaigns.map(c => `
    <option value="${c.id}">${c.name}</option>
  `).join('');
  if (value) {
    select.value = value;
  }
  renderCampaignFilter();
}

function renderCampaignFilter() {
  const select = document.getElementById('campaignFilter');
  if (!select) return;
  const current = select.value;
  select.innerHTML = '<option value="">All campaigns</option>' + campaigns.map(c => `
    <option value="${c.id}">${c.name}</option>
  `).join('');
  if (current) {
    select.value = current;
  }
}

function setButtonActive(btn, active) {
  btn.setAttribute('data-active', String(active));
  btn.classList.toggle('btn-toggle-active', active);
  btn.classList.toggle('opacity-50', !active);
}

function setupFilters() {
  const container = document.getElementById('platformFilters');
  if (container) {
    container.querySelectorAll('button[data-provider]').forEach((btn) => {
      setButtonActive(btn, btn.getAttribute('data-active') !== 'false');
      btn.addEventListener('click', () => {
        const nextActive = btn.getAttribute('data-active') !== 'true';
        setButtonActive(btn, nextActive);
        applyFilters();
      });
    });
  }
  const campaignFilter = document.getElementById('campaignFilter');
  if (campaignFilter) {
    campaignFilter.addEventListener('change', applyFilters);
  }
  const statusContainer = document.getElementById('statusFilters');
  if (statusContainer) {
    statusContainer.querySelectorAll('button[data-status]').forEach((btn) => {
      setButtonActive(btn, btn.getAttribute('data-active') !== 'false');
      btn.addEventListener('click', () => {
        const nextActive = btn.getAttribute('data-active') !== 'true';
        setButtonActive(btn, nextActive);
        applyFilters();
      });
    });
  }
  const bulkBtn = document.getElementById('bulkUploadBtn');
  const bulkInput = document.getElementById('bulkCsvInput');
  if (bulkBtn && bulkInput) {
    bulkBtn.addEventListener('click', () => bulkInput.click());
    bulkInput.addEventListener('change', handleBulkCsv);
  }
}

function getActiveStatuses() {
  const container = document.getElementById('statusFilters');
  if (!container) return [];
  return Array.from(container.querySelectorAll('button[data-status]'))
    .filter(btn => btn.getAttribute('data-active') !== 'false')
    .map(btn => btn.dataset.status);
}

function getActivePlatforms() {
  const container = document.getElementById('platformFilters');
  if (!container) return [];
  return Array.from(container.querySelectorAll('button[data-provider]'))
    .filter(btn => btn.getAttribute('data-active') !== 'false')
    .map(btn => btn.dataset.provider);
}

function filterPosts() {
  if (!Array.isArray(allPosts)) return [];
  const activePlatforms = getActivePlatforms();
  const activeStatuses = getActiveStatuses();
  const campaignValue = document.getElementById('campaignFilter')?.value || '';
  return allPosts.filter(post => {
    const platformMatch = !activePlatforms.length || activePlatforms.includes(post.provider);
    const normalizedStatus = post.status === 'retry' || post.status === 'processing' ? 'pending' : post.status;
    const statusMatch = !activeStatuses.length || activeStatuses.includes(normalizedStatus);
    const campaignMatch = !campaignValue || post.campaign_id === campaignValue;
    return platformMatch && campaignMatch && statusMatch;
  });
}

function renderCalendarEvents(posts) {
  if (!calendar) return;
  const events = posts.map(p => ({
    id: p.id,
    title: `${statusLabels[p.status] || p.status}: ${p.caption?.slice(0, 30) || 'Post'}`,
    start: p.scheduled_at,
    extendedProps: {
      provider: p.provider,
      caption: p.caption,
      campaign: campaigns.find(c => c.id === p.campaign_id) || null,
      status: p.status,
      review_notes: p.review_notes || ''
    },
    backgroundColor: platformColors[p.provider] || '#4f46e5',
    borderColor: '#1f2937'
  }));
  calendar.removeAllEvents();
  calendar.addEventSource(events);
}

function updateFailureNotifications() {
  const container = document.getElementById('statusAlerts');
  if (!container) return;
  const failed = allPosts.filter(p => p.status === 'failed');
  const retrying = allPosts.filter(p => p.status === 'retry');
  if (!failed.length && !retrying.length) {
    container.innerHTML = '';
    container.classList.add('hidden');
    return;
  }
  container.classList.remove('hidden');
  const cards = [];
  if (failed.length) {
    const sample = failed.slice(0, 3).map(p => {
      const provider = (p.provider || '').toUpperCase();
      const error = (p.last_error || 'See analytics for error details.').replace(/\s+/g, ' ').trim();
      const trimmed = error.length > 160 ? `${error.slice(0, 157)}…` : error;
      return `
        <li class="alert-item">
          <span class="alert-badge">${escapeHtml(provider)}</span>
          <span class="alert-text">${escapeHtml(trimmed)}</span>
          <span class="alert-meta">${escapeHtml(formatDateTime(p.scheduled_at))}</span>
        </li>
      `;
    }).join('');
    cards.push(`
      <div class="alert-card">
        <div class="flex items-start gap-3">
          <div class="mt-1 text-red-200"><i class="fa-solid fa-triangle-exclamation"></i></div>
          <div>
            <div class="font-semibold text-red-100">${failed.length} post${failed.length === 1 ? '' : 's'} failed after retries</div>
            <p class="text-sm text-red-100/80 mt-1">Try rescheduling from the calendar or review the logs in analytics.</p>
          </div>
        </div>
        <ul class="alert-list">${sample}</ul>
        <button class="btn btn-ghost mt-4" type="button" onclick="window.location='/analytics.html'"><i class="fa-solid fa-chart-line"></i><span>Review analytics</span></button>
      </div>
    `);
  }
  if (retrying.length) {
    cards.push(`
      <div class="alert-card warning">
        <div class="flex items-center gap-2 text-amber-100">
          <i class="fa-solid fa-arrows-rotate"></i>
          <div class="font-semibold">${retrying.length} post${retrying.length === 1 ? ' is' : 's are'} queued for retry</div>
        </div>
        <p class="text-sm text-amber-100/80 mt-2">We'll keep trying automatically for 15 minutes before marking as failed.</p>
      </div>
    `);
  }
  container.innerHTML = cards.join('');
}

function applyFilters() {
  if (!calendar) return;
  const filtered = filterPosts();
  renderCalendarEvents(filtered);
}

async function loadCalendar() {
  allPosts = await apiGet('/scheduled');
  updateFailureNotifications();
  const calendarEl = document.getElementById('calendar');
  if (!calendar) {
    calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      height: 680,
      events: [],
      editable: true,
      eventDisplay: 'block',
      headerToolbar: {
        left: 'title',
        center: '',
        right: 'prev,next today dayGridMonth,timeGridWeek,listWeek'
      },
      eventClick: (info) => {
        const id = info.event.id;
        showPost(id);
      },
      eventDrop: async (info) => {
        const current = allPosts.find(p => p.id === info.event.id);
        if (current && !['pending', 'retry', 'failed'].includes(current.status)) {
          alert('Only approved/retry/failed posts can be rescheduled.');
          info.revert();
          return;
        }
        try {
          await apiPost('/schedule/reschedule', { id: info.event.id, when: info.event.start.toISOString() });
          await loadCalendar();
        } catch (err) {
          alert('Failed to reschedule: ' + err.message);
          info.revert();
        }
      },
      eventDidMount: (info) => {
        const { campaign, status } = info.event.extendedProps;
        if (campaign) {
          const badge = document.createElement('span');
          badge.className = 'absolute top-2 right-2 text-xs px-2 py-1 rounded-full border border-slate-900';
          badge.style.background = campaign.color || 'rgba(15,23,42,0.8)';
          badge.textContent = campaign.name;
          info.el.style.position = 'relative';
          info.el.appendChild(badge);
        }
        const statusBadge = document.createElement('span');
        statusBadge.className = 'absolute left-2 top-2 text-[10px] px-2 py-0.5 rounded-full border border-slate-900 bg-slate-900/70';
        statusBadge.textContent = statusLabels[status] || status;
        info.el.style.position = 'relative';
        info.el.appendChild(statusBadge);
      }
    });
    calendar.render();
  }
  applyFilters();
}

function showModal() {
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('modal').classList.add('flex');
  const dt = new Date(Date.now() + 60 * 60 * 1000);
  document.getElementById('when').value = dt.toISOString().slice(0,16);
  renderCampaignOptions();
}
function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}

window.closeModal = closeModal;
window.loadFrameProjects = async function() {
  const box = document.getElementById('frameio');
  box.innerHTML = '<div class="text-sm text-slate-400">Loading projects…</div>';
  try {
    const data = await apiGet('/frameio/projects');
    box.innerHTML = data.items.map(p => `
      <div class="mt-2 p-3 glass rounded-xl">
        <div class="font-semibold">${p.name}</div>
        <button class="mt-2 btn btn-secondary" onclick="loadFrameAssets('${p.id}')">Browse</button>
        <div id="p-${p.id}"></div>
      </div>
    `).join('');
  } catch (e) {
    box.innerHTML = '<div class="text-sm text-red-400">Frame.io not configured</div>';
  }
}

window.loadFrameAssets = async function(projectId) {
  const el = document.getElementById('p-' + projectId);
  el.innerHTML = '<div class="text-sm text-slate-400">Loading assets…</div>';
  const data = await apiGet('/frameio/assets?project_id=' + projectId);
  if (!data.items?.length) {
    el.innerHTML = '<div class="text-sm text-slate-500">No assets found.</div>';
    return;
  }
  el.innerHTML = data.items.map(a => {
    const thumb = a.thumbnail ? `<img src="${escapeHtml(a.thumbnail)}" alt="${escapeHtml(a.name)}" class="w-20 h-20 object-cover rounded-xl border border-slate-900" loading="lazy" />` : '<div class="w-20 h-20 rounded-xl border border-dashed border-slate-700 grid place-items-center text-slate-600"><i class="fa-regular fa-file"></i></div>';
    const meta = [a.type ? a.type.toUpperCase() : null, formatDuration(a.duration), formatFileSize(a.size)].filter(Boolean).join(' • ');
    return `
      <div class="mt-3 p-3 rounded-xl border border-slate-800 bg-slate-900/40 flex gap-3 items-center">
        ${thumb}
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate">${escapeHtml(a.name)}</div>
          <div class="text-xs text-slate-500 mt-0.5">${escapeHtml(meta)}</div>
          <button class="mt-2 btn btn-secondary" onclick="pickMedia('${escapeHtml(a.original)}','${escapeHtml(a.name)}')"><i class="fa-solid fa-link mr-2"></i>Use</button>
        </div>
      </div>
    `;
  }).join('');
}

window.pickMedia = function(url, name) {
  const input = document.getElementById('mediaUrl');
  input.value = url;
  alert('Selected: ' + name);
  closeModal();
  showModal();
}

async function handleBulkCsv(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const result = await apiPost('/schedule/bulk', { csv: text });
    let message = `Imported ${result.inserted || 0} posts.`;
    if (result.errors && result.errors.length) {
      message += `\n${result.errors.length} rows skipped:\n- ${result.errors.join('\n- ')}`;
    }
    alert(message);
    if (result.createdCampaigns && result.createdCampaigns.length) {
      campaigns = await apiGet('/campaigns');
      renderCampaignOptions();
    }
    await loadCalendar();
  } catch (err) {
    alert('Bulk upload failed: ' + err.message);
  } finally {
    event.target.value = '';
  }
}

window.handleBulkCsv = handleBulkCsv;

window.applyFilters = applyFilters;

window.openCampaignManager = async function() {
  const name = prompt('Campaign name');
  if (!name) return;
  const color = prompt('Hex color (optional, e.g. #ff7849)') || '';
  const created = await apiPost('/campaigns', { name, color });
  campaigns.push(created);
  renderCampaignOptions();
  renderCampaignFilter();
  alert('Campaign created');
};

function showPost(id) {
  selectedPost = allPosts.find(p => p.id === id) || null;
  if (!selectedPost) return;
  const modal = document.getElementById('postDetailModal');
  const meta = document.getElementById('postDetailMeta');
  const caption = document.getElementById('postDetailCaption');
  const actions = document.getElementById('postDetailActions');
  const notes = document.getElementById('postDetailNotes');
  if (!modal || !meta || !caption || !actions || !notes) return;
  const campaign = campaigns.find(c => c.id === selectedPost.campaign_id);
  meta.innerHTML = `
    <div><strong>Platform:</strong> ${escapeHtml(selectedPost.provider)}</div>
    <div><strong>When:</strong> ${escapeHtml(formatDateTime(selectedPost.scheduled_at))}</div>
    <div><strong>Status:</strong> ${escapeHtml(statusLabels[selectedPost.status] || selectedPost.status)}</div>
    <div><strong>Campaign:</strong> ${escapeHtml(campaign?.name || 'None')}</div>
  `;
  caption.textContent = selectedPost.caption || '(No caption)';
  notes.value = selectedPost.review_notes || '';

  const buttons = [];
  if (selectedPost.status === 'draft') {
    buttons.push('<button type="button" class="btn btn-secondary" data-post-action="submit-review"><i class="fa-regular fa-eye"></i><span>Submit For Review</span></button>');
  }
  if (selectedPost.status === 'review') {
    buttons.push('<button type="button" class="btn btn-primary" data-post-action="approve"><i class="fa-solid fa-check"></i><span>Approve & Schedule</span></button>');
    buttons.push('<button type="button" class="btn btn-ghost" data-post-action="reject"><i class="fa-solid fa-reply"></i><span>Reject to Draft</span></button>');
  }
  if (!buttons.length) {
    buttons.push('<button type="button" class="btn btn-ghost" data-post-action="close"><span>Close</span></button>');
  }
  actions.innerHTML = buttons.join('');
  actions.querySelectorAll('[data-post-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.getAttribute('data-post-action');
      if (action === 'close') {
        closePostDetailModal();
        return;
      }
      await runPostAction(action);
    });
  });
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closePostDetailModal() {
  const modal = document.getElementById('postDetailModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  selectedPost = null;
}

async function runPostAction(action) {
  if (!selectedPost) return;
  const notes = document.getElementById('postDetailNotes')?.value?.trim() || '';
  try {
    if (action === 'submit-review') {
      await apiPost('/schedule/submit-review', { id: selectedPost.id, reviewNotes: notes });
    } else if (action === 'approve') {
      await apiPost('/schedule/approve', { id: selectedPost.id, reviewNotes: notes });
    } else if (action === 'reject') {
      await apiPost('/schedule/reject', { id: selectedPost.id, reviewNotes: notes });
    }
    await loadCalendar();
    applyFilters();
    closePostDetailModal();
  } catch (e) {
    alert(`Action failed: ${e.message}`);
  }
}

document.getElementById('btn-new').addEventListener('click', showModal);
const postDetailClose = document.getElementById('postDetailCloseBtn');
if (postDetailClose) {
  postDetailClose.addEventListener('click', closePostDetailModal);
}

document.getElementById('postForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    provider: document.getElementById('platform').value,
    when: document.getElementById('when').value,
    caption: document.getElementById('caption').value,
    mediaUrl: document.getElementById('mediaUrl').value,
    campaignId: document.getElementById('campaign').value || null
  };
  await apiPost('/schedule', payload);
  alert('Scheduled!');
  await loadCalendar();
  applyFilters();
  closeModal();
});

// Scroll to top button functionality
function initScrollToTop() {
  const scrollBtn = document.getElementById('scrollTopBtn');
  if (!scrollBtn) return;
  
  // Show/hide button based on scroll position
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    
    if (window.scrollY > 300) {
      scrollBtn.classList.add('show');
    } else {
      scrollBtn.classList.remove('show');
    }
    
    // Hide after scrolling stops (for cleaner UI)
    scrollTimeout = setTimeout(() => {
      if (window.scrollY > 300 && scrollBtn.classList.contains('show')) {
        scrollBtn.style.opacity = '0.6';
      }
    }, 1500);
  }, { passive: true });
  
  // Restore opacity on mouseover/touch
  scrollBtn.addEventListener('mouseenter', () => {
    scrollBtn.style.opacity = '1';
  });
  
  scrollBtn.addEventListener('touchstart', () => {
    scrollBtn.style.opacity = '1';
  }, { passive: true });
  
  // Scroll to top on click
  scrollBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

// Initialize scroll to top
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initScrollToTop);
} else {
  initScrollToTop();
}

init();
