"use client";

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Link2, Search, Unplug, XCircle, Zap } from 'lucide-react';
import { useAuth } from '@/lib/firebase/auth-provider';
import { useAppState } from '@/components/shell/app-state';
import {
  beginSocialConnect,
  disconnectSocialConnection,
  listSocialConnectionsByCompany,
  type SocialProvider,
} from '@/lib/social-gateway';

type Category = 'All' | 'Social' | 'Analytics' | 'Notifications' | 'Storage' | 'AI';
const CATEGORIES: Category[] = ['All', 'Social', 'Analytics', 'Notifications', 'Storage', 'AI'];

type IntegrationCard = {
  id: string;
  name: string;
  description: string;
  category: Exclude<Category, 'All'>;
  color: string;
  capabilities: string[];
  provider?: SocialProvider;
};

const INTEGRATIONS: IntegrationCard[] = [
  { id: 'instagram', name: 'Instagram', description: 'Connect Instagram Business via Meta OAuth.', category: 'Social', color: '#e1306c', capabilities: ['Posts', 'Stories (planned)', 'Reels (planned)'], provider: 'instagram' },
  { id: 'facebook', name: 'Facebook Pages', description: 'Connect Facebook Pages for post scheduling and publishing.', category: 'Social', color: '#1877f2', capabilities: ['Posts', 'Scheduled posts'], provider: 'facebook' },
  { id: 'linkedin', name: 'LinkedIn', description: 'OAuth support planned. Add organization posting after app review setup.', category: 'Social', color: '#0a66c2', capabilities: ['Posts (planned)', 'Company pages (planned)'] },
  { id: 'tiktok', name: 'TikTok', description: 'Connect TikTok Business. Publishing requires app approval.', category: 'Social', color: '#101010', capabilities: ['Videos', 'Direct publish (approved apps)'], provider: 'tiktok' },
  { id: 'youtube', name: 'YouTube', description: 'Connect YouTube for Shorts/video upload and scheduling.', category: 'Social', color: '#ff0000', capabilities: ['Shorts', 'Video upload', 'Scheduling'], provider: 'youtube' },
];

export function CompanyIntegrations({ companyId, companyName }: { companyId: string; companyName: string }) {
  const { user } = useAuth();
  const { appContext } = useAppState();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('All');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [connections, setConnections] = useState<Array<{ id?: string; provider?: string; label?: string }>>([]);

  async function refreshConnections() {
    if (!user) {
      setConnections([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await listSocialConnectionsByCompany(user, appContext.workspaceId, companyId);
      setConnections(rows.map((row) => ({ id: row.id, provider: row.provider, label: row.label })));
      setStatus(null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to load connections.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshConnections().catch(() => undefined);
  }, [appContext.workspaceId, companyId, user?.uid]);

  const connectedProviders = useMemo(
    () => new Set(connections.map((c) => (c.provider || '').toLowerCase()).filter(Boolean)),
    [connections]
  );

  const filtered = INTEGRATIONS.filter((integration) => {
    const matchCategory = category === 'All' || integration.category === category;
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      integration.name.toLowerCase().includes(q) ||
      integration.description.toLowerCase().includes(q) ||
      integration.capabilities.some((cap) => cap.toLowerCase().includes(q));
    return matchCategory && matchSearch;
  });

  const connectedCount = INTEGRATIONS.filter((integration) => integration.provider && connectedProviders.has(integration.provider)).length;

  async function onDisconnect(integration: IntegrationCard) {
    if (!integration.provider) return;
    try {
      const match = connections.find((entry) => entry.provider?.toLowerCase() === integration.provider);
      await disconnectSocialConnection(user, appContext.workspaceId, { id: match?.id, provider: integration.provider });
      await refreshConnections();
      setStatus(`${integration.name} disconnected for ${companyName}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Disconnect failed.');
    }
  }

  function onConnect(integration: IntegrationCard) {
    if (!integration.provider) {
      setStatus(`${integration.name} connector is planned but not wired yet.`);
      return;
    }
    try {
      beginSocialConnect(user, appContext.workspaceId, integration.provider, companyId);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Connect failed.');
    }
  }

  return (
    <>
      <p className="text-sm text-[var(--muted)]">Connections for <strong>{companyName}</strong> only.</p>
      <div className="panel" style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATEGORIES.map((entry) => (
              <button key={entry} className={`chip${category === entry ? ' active' : ''}`} type="button" onClick={() => setCategory(entry)}>{entry}</button>
            ))}
          </div>
          <div className="search-wrap" style={{ width: 280 }}>
            <Search className="h-3.5 w-3.5" style={{ position: 'absolute', left: 10, color: 'var(--muted)', pointerEvents: 'none' }} />
            <input className="search-input" placeholder="Search integrations..." value={search} onChange={(event) => setSearch(event.target.value)} style={{ paddingLeft: 30 }} />
          </div>
        </div>
      </div>

      {status ? <p className="text-sm text-[var(--muted)]">{status}</p> : null}
      <p className="text-xs text-[var(--muted)]"><Zap className="inline h-3 w-3" /> {connectedCount} connected for this company.</p>

      {loading ? (
        <div className="panel"><p>Loading connections...</p></div>
      ) : filtered.length ? (
        <section className="integrations-grid">
          {filtered.map((integration) => {
            const connected = integration.provider ? connectedProviders.has(integration.provider) : false;
            return (
              <article key={integration.id} className={`integration-card${connected ? ' connected' : ''}`}>
                <div className="integration-header">
                  <div className="integration-icon" style={{ background: `${integration.color}22`, border: `1px solid ${integration.color}44` }}>
                    <span style={{ width: 10, height: 10, borderRadius: 999, background: integration.color, display: 'inline-block' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="integration-name">{integration.name}</div>
                    <div className="integration-category">{integration.category}</div>
                  </div>
                  {connected ? <CheckCircle2 className="h-4 w-4" style={{ color: '#3dd68c', flexShrink: 0 }} /> : <XCircle className="h-4 w-4" style={{ color: 'var(--muted)', flexShrink: 0, opacity: 0.4 }} />}
                </div>
                <p className="integration-desc">{integration.description}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {integration.capabilities.map((cap) => <span key={cap} className="chip">{cap}</span>)}
                </div>
                <div className="integration-footer">
                  {connected ? (
                    <button className="btn-ghost btn-sm" type="button" onClick={() => onDisconnect(integration)}>
                      <Unplug className="h-3.5 w-3.5" /> Disconnect
                    </button>
                  ) : (
                    <button className="btn-primary btn-sm" type="button" onClick={() => onConnect(integration)}>
                      <Link2 className="h-3.5 w-3.5" /> Connect
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon"><Zap className="h-6 w-6" /></div>
          <h3>No integrations found</h3>
          <p>Try a different search term or category filter.</p>
        </div>
      )}
    </>
  );
}
