import { apiGet, apiPost } from './api.js';

let reviewRows = [];
let campaigns = [];
let permissions = { can_review: false };

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

function selectedIds() {
  return Array.from(document.querySelectorAll('input[data-review-id]:checked'))
    .map(el => el.getAttribute('data-review-id'));
}

function renderPermissions() {
  const el = document.getElementById('reviewPermissions');
  if (!el) return;
  if (permissions.can_review) {
    el.innerHTML = 'Role allows approvals and rejections.';
  } else {
    el.innerHTML = 'Current role cannot approve/reject. Switch role in Settings.';
  }
  document.getElementById('bulkApproveBtn').disabled = !permissions.can_review;
  document.getElementById('bulkRejectBtn').disabled = !permissions.can_review;
}

function renderTable() {
  const tbody = document.getElementById('reviewQueueTable');
  if (!tbody) return;
  if (!reviewRows.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-muted">No posts awaiting review.</td></tr>';
    return;
  }
  tbody.innerHTML = reviewRows.map((row) => {
    const campaign = campaigns.find(c => c.id === row.campaign_id);
    const cap = (row.caption || '').trim();
    const short = cap.length > 120 ? `${cap.slice(0, 120)}...` : cap;
    return `
      <tr>
        <td><input type="checkbox" data-review-id="${row.id}" /></td>
        <td>${escapeHtml(formatDateTime(row.scheduled_at))}</td>
        <td>${escapeHtml(row.provider)}</td>
        <td>${escapeHtml(campaign?.name || '-')}</td>
        <td>${escapeHtml(short || '(No caption)')}</td>
        <td class="flex gap-2">
          <button class="btn btn-ghost" data-approve-id="${row.id}"><i class="fa-solid fa-check"></i></button>
          <button class="btn btn-ghost" data-reject-id="${row.id}"><i class="fa-solid fa-reply"></i></button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('[data-approve-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!permissions.can_review) return;
      await apiPost('/schedule/approve', { id: btn.getAttribute('data-approve-id') });
      await load();
    });
  });
  tbody.querySelectorAll('[data-reject-id]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!permissions.can_review) return;
      await apiPost('/schedule/reject', { id: btn.getAttribute('data-reject-id') });
      await load();
    });
  });
}

async function bulkAction(action) {
  const ids = selectedIds();
  if (!ids.length) {
    alert('Select at least one post.');
    return;
  }
  if (!permissions.can_review) {
    alert('Role does not have review permissions.');
    return;
  }
  await apiPost('/schedule/review/bulk', { ids, action });
  await load();
}

async function load() {
  const [ctx, review, campaignList] = await Promise.all([
    apiGet('/context'),
    apiGet('/scheduled/review'),
    apiGet('/campaigns')
  ]);
  permissions = ctx.permissions || { can_review: false };
  reviewRows = Array.isArray(review) ? review : [];
  campaigns = Array.isArray(campaignList) ? campaignList : [];
  renderPermissions();
  renderTable();
}

document.getElementById('refreshQueueBtn').addEventListener('click', load);
document.getElementById('bulkApproveBtn').addEventListener('click', () => bulkAction('approve'));
document.getElementById('bulkRejectBtn').addEventListener('click', () => bulkAction('reject'));
document.getElementById('selectAllReview').addEventListener('change', (e) => {
  const checked = e.target.checked;
  document.querySelectorAll('input[data-review-id]').forEach(el => {
    el.checked = checked;
  });
});

load().catch((e) => {
  alert(`Failed to load review queue: ${e.message}`);
});
