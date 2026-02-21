"use client";

import Link from 'next/link';
import { useState } from 'react';
import { Copy, Download, ExternalLink, FileImage, Plus, Search, Tag, Trash2, Upload } from 'lucide-react';

import { PageHeader } from '@/components/ui/page-header';
import { useActiveCompany } from '@/lib/hooks/use-active-company';
import { useCompanyAssets } from '@/lib/hooks/use-company-assets';
import type { CompanyAssetRef } from '@/types/interfaces';

const TYPE_LABELS: Record<string, string> = {
  logo:      'Logo',
  mascot:    'Mascot',
  banner:    'Banner',
  reference: 'Reference',
};

const FILTER_TYPES = ['All', 'logo', 'mascot', 'banner', 'reference'] as const;
type FilterType = typeof FILTER_TYPES[number];

export default function AssetsPage() {
  const { activeCompany } = useActiveCompany();
  const { assets } = useCompanyAssets();
  const [filter, setFilter] = useState<FilterType>('All');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CompanyAssetRef | null>(null);

  if (!activeCompany) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><FileImage className="h-6 w-6" /></div>
        <h3>No company selected</h3>
        <Link className="btn-primary" href="/select-company">Choose company</Link>
      </div>
    );
  }

  const filtered = assets.filter((a) => {
    const matchType = filter === 'All' || a.type === filter;
    const matchSearch = !search || a.tags.some((t) => t.includes(search.toLowerCase())) || a.type.includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div className="space-y-3">
      <PageHeader
        title={`${activeCompany.name} Assets`}
        subtitle="Brand asset library — logos, banners, mascots and references."
        actions={
          <Link className="btn-primary btn-sm" href={`/companies/${activeCompany.id}/intake`}>
            <Upload className="h-3.5 w-3.5" /> Upload
          </Link>
        }
      />

      {/* Filter + search row */}
      <div className="panel" style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {FILTER_TYPES.map((f) => (
              <button
                key={f}
                className={`chip${filter === f ? ' active' : ''}`}
                type="button"
                onClick={() => setFilter(f)}
              >{f === 'All' ? 'All' : TYPE_LABELS[f]}</button>
            ))}
          </div>
          <div className="search-wrap" style={{ width: 220 }}>
            <Search className="h-3.5 w-3.5" style={{ position: 'absolute', left: 10, color: 'var(--muted)', pointerEvents: 'none' }} />
            <input
              className="search-input"
              placeholder="Search tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 30 }}
            />
          </div>
        </div>
      </div>

      {filtered.length ? (
        <section className="asset-grid">
          {filtered.map((asset) => (
            <article
              key={asset.id}
              className="asset-card"
              onClick={() => setSelected(selected?.id === asset.id ? null : asset)}
              style={{ cursor: 'pointer', outline: selected?.id === asset.id ? '2px solid var(--company-primary)' : undefined }}
            >
              <div
                className="asset-thumb"
                style={asset.thumbnailUrl
                  ? { backgroundImage: `url(${asset.thumbnailUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : { display: 'flex', alignItems: 'center', justifyContent: 'center' }
                }
              >
                {!asset.thumbnailUrl && <FileImage className="h-8 w-8" style={{ opacity: 0.3 }} />}
                <div className="asset-thumb-overlay">
                  <button className="btn-ghost btn-icon" type="button" title="Copy URL"
                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(asset.downloadUrl); }}>
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <a className="btn-ghost btn-icon" href={asset.downloadUrl} download title="Download"
                    onClick={(e) => e.stopPropagation()}>
                    <Download className="h-3.5 w-3.5" />
                  </a>
                  <a className="btn-ghost btn-icon" href={asset.downloadUrl} target="_blank" rel="noreferrer" title="Open"
                    onClick={(e) => e.stopPropagation()}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
              <div className="asset-meta">
                <span className="badge">{TYPE_LABELS[asset.type] ?? asset.type}</span>
                {asset.tags.length > 0 && (
                  <div className="asset-tags">
                    {asset.tags.map((t) => <span key={t} className="asset-tag"><Tag className="h-2.5 w-2.5" />{t}</span>)}
                  </div>
                )}
              </div>
            </article>
          ))}

          {/* Upload tile */}
          <Link href={`/companies/${activeCompany.id}/intake`} className="asset-card" style={{ border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', minHeight: 140, color: 'var(--muted)', flexDirection: 'column', gap: 8, textDecoration: 'none' }}>
            <Plus className="h-6 w-6" />
            <span style={{ fontSize: '0.78rem' }}>Upload asset</span>
          </Link>
        </section>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon"><FileImage className="h-6 w-6" /></div>
          <h3>{search || filter !== 'All' ? 'No assets match your filter' : 'No assets yet'}</h3>
          <p>Upload logos, banners, mascots, and creative references for {activeCompany.name}.</p>
          <Link className="btn-primary" href={`/companies/${activeCompany.id}/intake`}>
            <Upload className="h-3.5 w-3.5" /> Open intake uploads
          </Link>
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
            <h3>{TYPE_LABELS[selected.type]} Details</h3>
            <button className="btn-ghost btn-icon" type="button" onClick={() => setSelected(null)}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div style={{ position: 'relative', zIndex: 1, display: 'grid', gap: 6, fontSize: '0.82rem', color: 'var(--muted)' }}>
            <div><strong style={{ color: 'var(--text)' }}>Type:</strong> {selected.type}</div>
            <div><strong style={{ color: 'var(--text)' }}>Tags:</strong> {selected.tags.join(', ') || 'None'}</div>
            <div><strong style={{ color: 'var(--text)' }}>Uploaded:</strong> {selected.createdAt}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <a className="btn-ghost btn-sm" href={selected.downloadUrl} download><Download className="h-3.5 w-3.5" /> Download</a>
              <button className="btn-ghost btn-sm" type="button" onClick={() => navigator.clipboard.writeText(selected.downloadUrl)}><Copy className="h-3.5 w-3.5" /> Copy URL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

