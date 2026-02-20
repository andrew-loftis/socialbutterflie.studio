import { apiGet, apiPost, connect } from './api.js';

window.connect = connect;

let calendar;

function renderChips(conns) {
  const el = document.getElementById('connectedChips');
  el.innerHTML = conns.map(c => `<span class="chip">${c.provider}</span>`).join('');
}

async function loadCalendar() {
  const scheduled = await apiGet('/scheduled');
  const events = scheduled.map(p => ({
    id: p.id,
    title: `${p.provider}: ${p.caption?.slice(0, 20) || 'Post'}`,
    start: p.scheduled_at,
    backgroundColor: p.provider === 'instagram' ? '#e1306c' : p.provider === 'facebook' ? '#1877f2' : p.provider === 'youtube' ? '#ff0000' : '#fff',
    borderColor: '#1f2937'
  }));

  const calendarEl = document.getElementById('calendar');
  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    height: 680,
    events,
    headerToolbar: {
      left: 'title',
      center: '',
      right: 'prev,next today dayGridMonth,timeGridWeek,listWeek'
    },
    eventClick: (info) => {
      const id = info.event.id;
      showPost(id);
    }
  });
  calendar.render();
}

async function init() {
  const conns = await apiGet('/connections');
  renderChips(conns);
  loadCalendar();
}

function showModal() {
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('modal').classList.add('flex');
  const dt = new Date(Date.now() + 60 * 60 * 1000);
  document.getElementById('when').value = dt.toISOString().slice(0,16);
}
function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}

window.closeModal = closeModal;
window.openAICaption = async function() {
  const brand = (await apiGet('/prefs')).brandVoice || '';
  const res = await apiPost('/ai/caption', { brand });
  document.getElementById('caption').value = res.caption;
}
window.openAIHashtags = async function() {
  const res = await apiPost('/ai/hashtags', { topic: 'architecture render barndominium unreal engine' });
  const cap = document.getElementById('caption');
  cap.value = (cap.value + "\n\n" + res.hashtags.join(' ')).trim();
}

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
  el.innerHTML = data.items.map(a => `
    <div class="mt-2 p-2 rounded-xl border border-slate-800">
      <div class="text-sm">${a.name} <span class="text-xs text-slate-500">(${a.type})</span></div>
      <button class="mt-1 btn btn-secondary" onclick="pickMedia('${a.original}','${a.name}')">Use</button>
    </div>
  `).join('');
}

window.pickMedia = function(url, name) {
  const input = document.getElementById('mediaUrl');
  input.value = url;
  alert('Selected: ' + name);
  closeModal();
  showModal();
}

function showPost(id) { /* reserved for future — edit/delete */ }

document.getElementById('btn-new').addEventListener('click', showModal);

document.getElementById('postForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    provider: document.getElementById('platform').value,
    when: document.getElementById('when').value,
    caption: document.getElementById('caption').value,
    mediaUrl: document.getElementById('mediaUrl').value
  };
  await apiPost('/schedule', payload);
  alert('Scheduled!');
  window.location.reload();
});

init();
