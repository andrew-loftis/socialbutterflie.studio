import { apiGet, apiPost } from './api.js';

const selectedPlatforms = new Set();
const selectedMedia = [];
let campaigns = [];

// Initialize
async function init() {
  setupPlatformSelectors();
  setupMediaUpload();
  setupCaptionCounter();
  await loadCampaigns();
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
  
  // Click to upload
  zone.addEventListener('click', () => {
    input.click();
  });
  
  // Drag and drop
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  
  zone.addEventListener('dragleave', () => {
    zone.classList.remove('drag-over');
  });
  
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  });
  
  // File input change
  input.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  });
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
  
  if (selectedMedia.length === 0) {
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

window.removeMedia = function(index) {
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
    const chars = text.length;
    const hashtags = (text.match(/#\w+/g) || []).length;
    
    if (charCount) charCount.textContent = `${chars} characters`;
    if (hashtagCount) hashtagCount.textContent = `${hashtags} hashtags`;
  });
}

async function loadCampaigns() {
  try {
    campaigns = await apiGet('/campaigns');
    const select = document.getElementById('campaign');
    if (select) {
      campaigns.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        select.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('Failed to load campaigns:', err);
  }
}

window.saveDraft = function() {
  const caption = document.getElementById('caption').value;
  const draft = {
    platforms: [...selectedPlatforms],
    media: selectedMedia.map(m => m.url),
    caption,
    timestamp: Date.now()
  };
  
  localStorage.setItem('postDraft', JSON.stringify(draft));
  alert('Draft saved! ✓');
};

window.preview = function() {
  if (selectedPlatforms.size === 0) {
    alert('Please select at least one platform');
    return;
  }
  
  alert('Preview modal would open here showing how your post looks on each platform');
};

window.openAIAssist = function() {
  alert('AI Assistant panel would expand with caption suggestions');
};

window.addEmoji = function() {
  alert('Emoji picker would open here');
};

window.openStoragePicker = function() {
  alert('Storage browser modal would open to select files from connected cloud storage');
};

window.pasteMediaUrl = function() {
  const url = prompt('Enter media URL:');
  if (url) {
    selectedMedia.push({
      url,
      type: url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'image' : 'video'
    });
    renderMediaPreviews();
  }
};

window.generateCaption = function() {
  const textarea = document.getElementById('caption');
  if (textarea) {
    textarea.value = 'Check out this amazing content! 🎨 Creating something special today. What do you think? Let me know in the comments! 💭';
    textarea.dispatchEvent(new Event('input'));
  }
};

window.generateHashtags = function() {
  const textarea = document.getElementById('caption');
  if (textarea) {
    textarea.value += '\n\n#creative #content #socialmedia #marketing #design #inspiration #digital #branding';
    textarea.dispatchEvent(new Event('input'));
  }
};

window.improveCaption = function() {
  const textarea = document.getElementById('caption');
  if (textarea && textarea.value) {
    alert('AI would analyze and improve your caption here');
  } else {
    alert('Write a caption first, then click Improve');
  }
};

window.generateAltText = function() {
  if (selectedMedia.length === 0) {
    alert('Add media first to generate alt text');
    return;
  }
  alert('AI would analyze your images and generate accessible alt text descriptions');
};

// Form submission
document.getElementById('buildPostForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (selectedPlatforms.size === 0) {
    alert('Please select at least one platform');
    return;
  }
  
  if (selectedMedia.length === 0) {
    alert('Please add at least one media file');
    return;
  }
  
  const caption = document.getElementById('caption').value;
  if (!caption.trim()) {
    alert('Please write a caption');
    return;
  }
  
  const scheduleTime = document.getElementById('scheduleTime').value;
  const campaignId = document.getElementById('campaign').value;
  
  try {
    // In production, upload media and create posts
    const payload = {
      platforms: [...selectedPlatforms],
      caption,
      scheduleTime,
      campaignId: campaignId || null,
      mediaCount: selectedMedia.length
    };
    
    // await apiPost('/posts/create', payload);
    
    alert('Post scheduled successfully! ✓\n\nRedirecting to calendar...');
    window.location.href = './index.html';
  } catch (err) {
    alert('Failed to schedule post: ' + err.message);
  }
});

init();
