import fetch from 'node-fetch';

const API = 'https://api.frame.io/v2';

export async function listProjects(token) {
  const me = await fetch(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } }).then(r=>r.json());
  const team_id = me.teams?.[0]?.id;
  const projects = await fetch(`${API}/teams/${team_id}/projects`, { headers: { Authorization: `Bearer ${token}` } }).then(r=>r.json());
  return projects.map(p => ({ id: p.id, name: p.name }));
}

export async function listProjectAssets(token, project_id) {
  const root = await fetch(`${API}/projects/${project_id}`, { headers: { Authorization: `Bearer ${token}` } }).then(r=>r.json());
  const children = await fetch(`${API}/assets/${root.root_asset_id}/children`, { headers: { Authorization: `Bearer ${token}` } }).then(r=>r.json());
  // Map only files (not folders), include original file URL if present
  return children.filter(x => x.type === 'file').map(x => ({
    id: x.id,
    name: x.name,
    type: x.filetype || 'file',
    original: x.original || x.download_url || '',
    thumbnail: extractThumbnail(x),
    duration: x.duration || null,
    size: x.filesize || x.size || null
  }));
}

function extractThumbnail(asset) {
  if (!asset) return '';
  const candidates = [
    asset.poster,
    asset.thumbnail?.url,
    asset.thumbnail?.small,
    Array.isArray(asset.cover_images) ? asset.cover_images[0]?.url : null,
    asset.cover_image?.url,
    asset.poster_frame,
    asset.poster_frame?.url
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (typeof candidate === 'string') return candidate;
    if (candidate.url) return candidate.url;
  }
  return '';
}
