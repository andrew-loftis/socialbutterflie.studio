import { apiGet, apiPost } from './api.js';

const selectedPlatforms = new Set();
const selectedMedia = [];
let campaigns = [];

async function init() {
  setupPlatformSelectors();
  setupMediaUpload();
  setupCaptionCounter();
  await loadCampaigns();
  hydrateDraft();
}

function setupPlatformSelectors() {
  const buttons = document.querySelectorAll('.platform-selector-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const platform = btn.dataset.platform;
      if (selectedPlatforms.has(platform)) {
        selectedPlatforms.delete(platform);
        btn.classList.remove('active');
      } else {
        selectedPlatforms.add(platform);
        btn.classList.add('active');
      }
    });
  });
}

function setupMediaUpload() {
  const zone = document.getElementById('mediaZone');
  const input = document.getElementById('mediaInput');
  if (!zone || !input) return;

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    handleFiles(Array.from(e.dataTransfer.files));
  });
  input.addEventListener('change', (e) => handleFiles(Array.from(e.target.files || [])));
}

function handleFiles(files) {
  files.forEach(file => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      alert('Only images and videos are supported');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      selectedMedia.push({
        file,
        url: e.target.result,
        type: file.type.startsWith('image/') ? 'image' : 'video'
      });
      renderMediaPreviews();
    };
    reader.readAsDataURL(file);
  });
}

function renderMediaPreviews() {
  const container = document.getElementById('mediaPreview');
  if (!container) return;
  if (!selectedMedia.length) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = selectedMedia.map((media, index) => `
    <div class="media-preview-item">
      ${media.type === 'image'
        ? `<img src="${media.url}" alt="Preview ${index + 1}" />`
        : `<video src="${media.url}" muted></video>`
      }
      <button class="media-preview-remove" onclick="removeMedia(${index})">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  `).join('');
}

window.removeMedia = function removeMedia(index) {
  selectedMedia.splice(index, 1);
  renderMediaPreviews();
};

function setupCaptionCounter() {
  const textarea = document.getElementById('caption');
  const charCount = document.getElementById('charCount');
  const hashtagCount = document.getElementById('hashtagCount');
  if (!textarea) return;
  textarea.addEventListener('input', () => {
    const text = textarea.value;
    const hashtags = (text.match(/#\w+/g) || []).length;
    if (charCount) charCount.textContent = `${text.length} characters`;
    if (hashtagCount) hashtagCount.textContent = `${hashtags} hashtags`;
  });
}

async function loadCampaigns() {
  try {
    campaigns = await apiGet('/campaigns');
    const select = document.getElementById('campaign');
    if (!select) return;
    campaigns.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Failed to load campaigns:', err);
  }
}

function collectFormData() {
  if (!selectedPlatforms.size) throw new Error('Please select at least one platform');
  if (!selectedMedia.length) throw new Error('Please add at least one media file');
  const caption = document.getElementById('caption').value;
  if (!caption.trim()) throw new Error('Please write a caption');

  const scheduleTime = document.getElementById('scheduleTime').value;
  const campaignId = document.getElementById('campaign').value;
  const firstMedia = selectedMedia[0];
  const mediaUrl = firstMedia.url || '';
  if (!mediaUrl) throw new Error('Media URL could not be resolved');

  const whenIso = scheduleTime
    ? new Date(scheduleTime).toISOString()
    : new Date(Date.now() + 30 * 60 * 1000).toISOString();

  return {
    platforms: [...selectedPlatforms],
    caption: caption.trim(),
    whenIso,
    campaignId: campaignId || null,
    mediaUrl
  };
}

async function createWorkflowPosts(workflowStatus = 'pending') {
  const data = collectFormData();
  const created = [];
  for (const provider of data.platforms) {
    const row = await apiPost('/schedule', {
      provider,
      caption: data.caption,
      mediaUrl: data.mediaUrl,
      when: data.whenIso,
      campaignId: data.campaignId,
      workflowStatus
    });
    created.push(row);
  }

  if (workflowStatus === 'draft') {
    localStorage.setItem('postDraft', JSON.stringify({
      ...data,
      createdIds: created.map(p => p.id),
      timestamp: Date.now()
    }));
    alert(`Saved ${created.length} draft post(s).`);
    return;
  }

  if (workflowStatus === 'review') {
    alert(`Submitted ${created.length} post(s) for review.`);
    window.location.href = './calendar.html';
    return;
  }

  alert(`Scheduled ${created.length} post(s).`);
  window.location.href = './calendar.html';
}

function hydrateDraft() {
  const raw = localStorage.getItem('postDraft');
  if (!raw) return;
  try {
    const draft = JSON.parse(raw);
    const captionEl = document.getElementById('caption');
    if (draft.caption && captionEl) {
      captionEl.value = draft.caption;
      captionEl.dispatchEvent(new Event('input'));
    }
    if (draft.whenIso) {
      const parsed = new Date(draft.whenIso);
      if (!Number.isNaN(parsed.valueOf())) {
        document.getElementById('scheduleTime').value = parsed.toISOString().slice(0, 16);
      }
    }
    if (draft.campaignId) {
      document.getElementById('campaign').value = draft.campaignId;
    }
    if (Array.isArray(draft.platforms)) {
      draft.platforms.forEach((platform) => {
        const btn = document.querySelector(`.platform-selector-btn[data-platform="${platform}"]`);
        if (btn) {
          selectedPlatforms.add(platform);
          btn.classList.add('active');
        }
      });
    }
    if (draft.mediaUrl) {
      selectedMedia.push({
        url: draft.mediaUrl,
        type: draft.mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image' : 'video'
      });
      renderMediaPreviews();
    }
  } catch {
    // ignore malformed draft payload
  }
}

window.saveDraft = function saveDraft() {
  createWorkflowPosts('draft').catch((err) => alert(`Failed to save draft: ${err.message}`));
};

window.submitForReview = function submitForReview() {
  createWorkflowPosts('review').catch((err) => alert(`Failed to submit for review: ${err.message}`));
};

window.preview = function preview() {
  if (!selectedPlatforms.size) {
    alert('Please select at least one platform');
    return;
  }
  alert('Preview modal would open here showing how your post looks on each platform');
};

window.openAIAssist = function openAIAssist() {
  alert('AI Assistant panel would expand with caption suggestions');
};

window.addEmoji = function addEmoji() {
  alert('Emoji picker would open here');
};

window.openStoragePicker = function openStoragePicker() {
  alert('Storage browser modal would open to select files from connected cloud storage');
};

window.pasteMediaUrl = function pasteMediaUrl() {
  const url = prompt('Enter media URL:');
  if (!url) return;
  selectedMedia.push({
    url,
    type: url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image' : 'video'
  });
  renderMediaPreviews();
};

window.generateCaption = function generateCaption() {
  const textarea = document.getElementById('caption');
  if (!textarea) return;
  textarea.value = 'Check out this creative drop. What do you think?';
  textarea.dispatchEvent(new Event('input'));
};

window.generateHashtags = function generateHashtags() {
  const textarea = document.getElementById('caption');
  if (!textarea) return;
  textarea.value += '\n\n#creative #content #socialmedia #marketing #design #inspiration';
  textarea.dispatchEvent(new Event('input'));
};

window.improveCaption = function improveCaption() {
  const textarea = document.getElementById('caption');
  if (textarea && textarea.value) {
    alert('AI would analyze and improve your caption here');
    return;
  }
  alert('Write a caption first, then click Improve');
};

window.generateAltText = function generateAltText() {
  if (!selectedMedia.length) {
    alert('Add media first to generate alt text');
    return;
  }
  alert('AI would analyze your images and generate accessible alt text descriptions');
};

document.getElementById('buildPostForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await createWorkflowPosts('pending');
  } catch (err) {
    alert(`Failed to schedule post: ${err.message}`);
  }
});

init();
