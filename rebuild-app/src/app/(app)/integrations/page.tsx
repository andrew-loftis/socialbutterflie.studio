"use client";

import { useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Link2,
  Search,
  XCircle,
  Zap,
} from 'lucide-react';

import { PageHeader } from '@/components/ui/page-header';

/* ── Integration catalog data ── */
const CATEGORIES = ['All', 'Social', 'Analytics', 'Notifications', 'Storage', 'AI'] as const;
type Category = typeof CATEGORIES[number];

interface Integration {
  id: string;
  name: string;
  description: string;
  category: Exclude<Category, 'All'>;
  icon: string; /* emoji fallback */
  color: string;
  connected: boolean;
  docsUrl?: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Publish posts, stories, and reels directly to Instagram Business accounts.',
    category: 'Social',
    icon: '📸',
    color: '#e1306c',
    connected: false,
  },
  {
    id: 'facebook',
    name: 'Facebook Pages',
    description: 'Manage and schedule content to your Facebook Pages and groups.',
    category: 'Social',
    icon: '📘',
    color: '#1877f2',
    connected: false,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Publish thought-leadership content and articles to LinkedIn Company Pages.',
    category: 'Social',
    icon: '💼',
    color: '#0a66c2',
    connected: false,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    description: 'Schedule and publish short-form video content to TikTok Business accounts.',
    category: 'Social',
    icon: '🎵',
    color: '#010101',
    connected: false,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    description: 'Upload and schedule YouTube Shorts and long-form video content.',
    category: 'Social',
    icon: '▶️',
    color: '#ff0000',
    connected: false,
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    description: 'Import web traffic and conversion data to correlate with post performance.',
    category: 'Analytics',
    icon: '📊',
    color: '#f4b400',
    connected: false,
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Receive approval requests, scheduling alerts, and post notifications in Slack.',
    category: 'Notifications',
    icon: '💬',
    color: '#4a154b',
    connected: false,
  },
  {
    id: 'frameio',
    name: 'Frame.io',
    description: 'Review and approve video assets from Frame.io directly within SocialButterflie.',
    category: 'Storage',
    icon: '🎬',
    color: '#5144d3',
    connected: false,
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    description: 'Import brand assets and creative files directly from Google Drive.',
    category: 'Storage',
    icon: '📁',
    color: '#34a853',
    connected: false,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Power caption generation, brand voice analysis, and smart scheduling via GPT-4.',
    category: 'AI',
    icon: '🤖',
    color: '#10a37f',
    connected: true,
  },
];

export default function IntegrationsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('All');
  const [integrations, setIntegrations] = useState(INTEGRATIONS);

  const filtered = integrations.filter((i) => {
    const matchCat = category === 'All' || i.category === category;
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) || i.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const connectedCount = integrations.filter((i) => i.connected).length;

  function toggle(id: string) {
    setIntegrations((prev) =>
      prev.map((i) => (i.id === id ? { ...i, connected: !i.connected } : i))
    );
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Integrations"
        subtitle={`${connectedCount} of ${integrations.length} channels connected.`}
        actions={
          <span className="badge badge-primary">
            <Zap className="h-3 w-3" /> {connectedCount} active
          </span>
        }
      />

      {/* Search + category filters */}
      <div className="panel" style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                className={`chip${category === c ? ' active' : ''}`}
                type="button"
                onClick={() => setCategory(c)}
              >{c}</button>
            ))}
          </div>
          <div className="search-wrap" style={{ width: 240 }}>
            <Search className="h-3.5 w-3.5" style={{ position: 'absolute', left: 10, color: 'var(--muted)', pointerEvents: 'none' }} />
            <input
              className="search-input"
              placeholder="Search integrations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 30 }}
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      {filtered.length ? (
        <section className="integrations-grid">
          {filtered.map((integration) => (
            <article key={integration.id} className={`integration-card${integration.connected ? ' connected' : ''}`}>
              {/* Header */}
              <div className="integration-header">
                <div
                  className="integration-icon"
                  style={{ background: `${integration.color}22`, border: `1px solid ${integration.color}44` }}
                >
                  <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{integration.icon}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div className="integration-name">{integration.name}</div>
                  <div className="integration-category">{integration.category}</div>
                </div>
                {integration.connected ? (
                  <CheckCircle2 className="h-4 w-4" style={{ color: '#3dd68c', flexShrink: 0 }} />
                ) : (
                  <XCircle className="h-4 w-4" style={{ color: 'var(--muted)', flexShrink: 0, opacity: 0.4 }} />
                )}
              </div>

              {/* Description */}
              <p className="integration-desc">{integration.description}</p>

              {/* Footer */}
              <div className="integration-footer">
                <button
                  className={integration.connected ? 'btn-ghost btn-sm' : 'btn-primary btn-sm'}
                  type="button"
                  onClick={() => toggle(integration.id)}
                >
                  <Link2 className="h-3.5 w-3.5" />
                  {integration.connected ? 'Disconnect' : 'Connect'}
                </button>
                {integration.docsUrl && (
                  <a
                    className="btn-ghost btn-icon"
                    href={integration.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Docs"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon"><Zap className="h-6 w-6" /></div>
          <h3>No integrations found</h3>
          <p>Try a different search term or category filter.</p>
        </div>
      )}
    </div>
  );
}
