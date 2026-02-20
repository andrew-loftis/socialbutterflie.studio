import { apiGet } from './api.js';

const platformNames = {
  instagram: 'Instagram',
  facebook: 'Facebook Page',
  youtube: 'YouTube',
  tiktok: 'TikTok'
};

let logs = [];
let campaigns = [];
let chart;

function escapeHtml(text = '') {
  if (text == null) return '';
  return String(text).replace(/[&<>"']/g, (match) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[match];
  });
}

function renderTable(filterPlatform = '') {
  const tbody = document.getElementById('analyticsTable');
  tbody.innerHTML = logs
    .filter(row => !filterPlatform || row.provider === filterPlatform)
    .map(row => {
      const camp = campaigns.find(c => c.id === row.campaign_id);
      const campaignCell = camp
        ? `<span class="campaign-pill"><span class="campaign-dot" style="background:${camp.color || '#6c5ce7'}"></span>${escapeHtml(camp.name)}</span>`
        : '<span class="text-muted">—</span>';
      const statusClass = row.status === 'success' ? 'badge success' : row.status === 'retry' ? 'badge retry' : 'badge error';
      const statusLabel = row.status === 'success' ? 'Published' : row.status === 'retry' ? 'Retry queued' : 'Failed';
      const captionRaw = row.caption ? row.caption.trim() : '';
      const caption = captionRaw.length > 100 ? `${captionRaw.slice(0, 100)}…` : captionRaw;
      const publishedAt = new Date(row.published_at || row.created_at);
      return `
        <tr>
          <td>${escapeHtml(publishedAt.toLocaleString())}</td>
          <td>${escapeHtml(platformNames[row.provider] || row.provider)}</td>
          <td>${campaignCell}</td>
          <td><span class="${statusClass}">${statusLabel}</span></td>
          <td class="caption-cell">${escapeHtml(caption)}</td>
        </tr>
      `;
    })
    .join('');
}

function renderChart() {
  const ctx = document.getElementById('performanceChart');
  if (!ctx) return;
  const grouped = logs.reduce((acc, row) => {
    const key = row.provider;
    if (!acc[key]) acc[key] = { success: 0, failed: 0 };
    if (row.status === 'success') acc[key].success += 1; else acc[key].failed += 1;
    return acc;
  }, {});
  const labels = Object.keys(grouped).map(key => platformNames[key] || key);
  const successData = labels.map((_, idx) => {
    const providerKey = Object.keys(grouped)[idx];
    return grouped[providerKey].success;
  });
  const failedData = labels.map((_, idx) => {
    const providerKey = Object.keys(grouped)[idx];
    return grouped[providerKey].failed;
  });

  const data = {
    labels,
    datasets: [
      {
        label: 'Published',
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
        data: successData
      },
      {
        label: 'Failed',
        backgroundColor: 'rgba(248, 113, 113, 0.6)',
        borderColor: 'rgba(248, 113, 113, 1)',
        borderWidth: 1,
        data: failedData
      }
    ]
  };

  if (chart) {
    chart.data = data;
    chart.update();
  } else {
    chart = new Chart(ctx, {
      type: 'bar',
      data,
      options: {
        responsive: true,
        plugins: {
          legend: { labels: { color: '#e5e7eb' } }
        },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148, 163, 184, 0.1)' } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148, 163, 184, 0.08)' }, beginAtZero: true }
        }
      }
    });
  }
}

async function loadAnalytics() {
  const data = await apiGet('/analytics');
  logs = data.logs;
  campaigns = data.campaigns;
  renderTable();
  renderChart();
  const rangeEl = document.getElementById('analyticsRange');
  if (rangeEl && logs.length) {
    const dates = logs.map(r => new Date(r.created_at));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    rangeEl.textContent = `${minDate.toLocaleDateString()} – ${maxDate.toLocaleDateString()}`;
  }
}

loadAnalytics();

document.getElementById('platformFilter').addEventListener('change', (e) => {
  renderTable(e.target.value);
});
