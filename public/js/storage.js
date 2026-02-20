import { apiGet, apiPost } from './api.js';

const connectedProviders = new Set();

// Initialize storage page
async function init() {
  await loadConnectedStorage();
  initScrollToTop();
}

async function loadConnectedStorage() {
  try {
    // In a real app, fetch from your API
    // const connected = await apiGet('/storage/connected');
    
    // For now, check localStorage
    const stored = localStorage.getItem('connectedStorage');
    if (stored) {
      const providers = JSON.parse(stored);
      providers.forEach(p => connectedProviders.add(p));
      renderConnectedStorage();
      updateProviderCards();
    }
  } catch (err) {
    console.error('Failed to load connected storage:', err);
  }
}

function renderConnectedStorage() {
  const container = document.getElementById('connectedStorage');
  if (!container) return;
  
  if (connectedProviders.size === 0) {
    container.innerHTML = `
      <div class="caption-card" style="grid-column: 1/-1;">
        <div class="text-center text-muted">
          <i class="fa-solid fa-cloud-arrow-up text-4xl mb-3 opacity-30"></i>
          <p>No storage providers connected yet.</p>
          <p class="text-xs mt-2">Connect a provider below to get started.</p>
        </div>
      </div>
    `;
    return;
  }
  
  const providerInfo = {
    frameio: { name: 'Frame.io', icon: 'fa-film', gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
    gdrive: { name: 'Google Drive', icon: 'fa-google-drive', gradient: 'linear-gradient(135deg, #4285f4, #34a853)', brands: true },
    dropbox: { name: 'Dropbox', icon: 'fa-dropbox', gradient: 'linear-gradient(135deg, #0061ff, #0070ff)', brands: true },
    onedrive: { name: 'OneDrive', icon: 'fa-microsoft', gradient: 'linear-gradient(135deg, #0078d4, #00a2ed)', brands: true },
    box: { name: 'Box', icon: 'fa-box', gradient: 'linear-gradient(135deg, #0061d5, #0073ea)' },
    icloud: { name: 'iCloud Drive', icon: 'fa-apple', gradient: 'linear-gradient(135deg, #3b99fc, #5ac8fa)', brands: true },
    s3: { name: 'Amazon S3', icon: 'fa-aws', gradient: 'linear-gradient(135deg, #ff9900, #ff6600)', brands: true },
    vimeo: { name: 'Vimeo', icon: 'fa-vimeo-v', gradient: 'linear-gradient(135deg, #1ab7ea, #00adef)', brands: true }
  };
  
  let html = '';
  connectedProviders.forEach(provider => {
    const info = providerInfo[provider];
    if (!info) return;
    
    const iconClass = info.brands ? 'fa-brands' : 'fa-solid';
    html += `
      <div class="storage-card connected">
        <div class="storage-card-header">
          <div class="storage-icon" style="background: ${info.gradient};">
            <i class="${iconClass} ${info.icon}"></i>
          </div>
          <div class="flex-1">
            <h4 class="storage-title">${info.name}</h4>
            <p class="storage-subtitle">
              <i class="fa-solid fa-check-circle" style="color: #86efac;"></i>
              Connected
            </p>
          </div>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-secondary flex-1" onclick="browseStorage('${provider}')">
            <i class="fa-solid fa-folder-open"></i>
            <span>Browse</span>
          </button>
          <button class="btn btn-ghost" onclick="disconnectStorage('${provider}')" title="Disconnect">
            <i class="fa-solid fa-plug-circle-xmark"></i>
          </button>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

function updateProviderCards() {
  const cards = document.querySelectorAll('.storage-card[data-provider]');
  cards.forEach(card => {
    const provider = card.dataset.provider;
    if (connectedProviders.has(provider)) {
      card.classList.add('connected');
      const btn = card.querySelector('.btn');
      if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-check-circle"></i><span>Connected</span>';
        btn.onclick = () => disconnectStorage(provider);
      }
    }
  });
}

window.connectStorage = async function(provider) {
  try {
    // In a real app, initiate OAuth flow
    // const result = await apiPost('/storage/connect', { provider });
    
    // For demo, simulate connection
    alert(`Connecting to ${provider}...\n\nIn production, this would open an OAuth flow to authenticate.`);
    
    // Simulate successful connection
    connectedProviders.add(provider);
    localStorage.setItem('connectedStorage', JSON.stringify([...connectedProviders]));
    
    renderConnectedStorage();
    updateProviderCards();
  } catch (err) {
    alert('Failed to connect: ' + err.message);
  }
};

window.disconnectStorage = async function(provider) {
  const confirm = window.confirm(`Disconnect from ${provider}? This will not delete your files.`);
  if (!confirm) return;
  
  try {
    // In a real app, revoke OAuth token
    // await apiPost('/storage/disconnect', { provider });
    
    connectedProviders.delete(provider);
    localStorage.setItem('connectedStorage', JSON.stringify([...connectedProviders]));
    
    renderConnectedStorage();
    
    // Update the card in available providers
    const card = document.querySelector(`.storage-card[data-provider="${provider}"]`);
    if (card) {
      card.classList.remove('connected');
      const btn = card.querySelector('.btn');
      if (btn) {
        btn.innerHTML = `<i class="fa-solid fa-plug"></i><span>Connect ${provider}</span>`;
        btn.onclick = () => window.connectStorage(provider);
      }
    }
  } catch (err) {
    alert('Failed to disconnect: ' + err.message);
  }
};

window.browseStorage = function(provider) {
  alert(`Opening ${provider} file browser...\n\nIn production, this would show a file picker modal.`);
};

// Scroll to top button functionality
function initScrollToTop() {
  const scrollBtn = document.getElementById('scrollTopBtn');
  if (!scrollBtn) return;
  
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    
    if (window.scrollY > 300) {
      scrollBtn.classList.add('show');
    } else {
      scrollBtn.classList.remove('show');
    }
    
    scrollTimeout = setTimeout(() => {
      if (window.scrollY > 300 && scrollBtn.classList.contains('show')) {
        scrollBtn.style.opacity = '0.6';
      }
    }, 1500);
  }, { passive: true });
  
  scrollBtn.addEventListener('mouseenter', () => {
    scrollBtn.style.opacity = '1';
  });
  
  scrollBtn.addEventListener('touchstart', () => {
    scrollBtn.style.opacity = '1';
  }, { passive: true });
  
  scrollBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

init();
