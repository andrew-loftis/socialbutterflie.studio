"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, Command, Plus, Search, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAppState } from '@/components/shell/app-state';

type SearchResult = {
  id: string;
  kind: string;
  title: string;
  subtitle?: string;
  href: string;
};

export function CommandBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { appContext, companies } = useAppState();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);

  const activeCompany = useMemo(
    () => companies.find((c) => c.id === appContext.activeCompanyId) ?? null,
    [appContext.activeCompanyId, companies],
  );

  // ⌘K / / shortcut
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, []);

  // Live search
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = (await res.json()) as { data?: SearchResult[] };
      setResults(data.data ?? []);
    }, 160);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <header className="command-bar">
      <div className="command-bar-inner">
        {/* Search */}
        <div className="search-wrap">
          <span className="search-icon">
            <Search className="h-4 w-4" />
          </span>
          <input
            className="search-input"
            placeholder="Search or jump to…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value.trim()) setResults([]);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 180)}
          />
          <span className="search-kbd">
            <Command className="h-3 w-3" />K
          </span>

          {/* Dropdown results */}
          {open && results.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                zIndex: 60,
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'var(--panel-strong)',
                backdropFilter: 'blur(20px)',
                padding: 4,
                boxShadow: 'var(--shadow-3)',
              }}
            >
              {results.map((r) => (
                <button
                  key={`${r.kind}-${r.id}`}
                  type="button"
                  style={{
                    display: 'block',
                    width: '100%',
                    borderRadius: 8,
                    padding: '8px 12px',
                    textAlign: 'left',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.14s',
                  }}
                  onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseOut={(e)  => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  onClick={() => { router.push(r.href); setOpen(false); }}
                >
                  <div style={{ fontSize: '0.84rem', fontWeight: 500, color: 'var(--text)' }}>{r.title}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{r.kind}{r.subtitle ? ` · ${r.subtitle}` : ''}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Company switcher pill */}
        <button
          type="button"
          className="company-pill"
          onClick={() => {
            router.push(`/select-company?next=${encodeURIComponent(pathname)}`);
          }}
        >
          <span className="company-pill-dot" />
          <span>{activeCompany?.name ?? 'Select company'}</span>
          <ChevronDown className="company-pill-chevron h-3.5 w-3.5" />
        </button>

        {/* Primary actions */}
        <div className="topbar-actions">
          <Link href="/studio" className="btn-ghost btn-sm" style={{ gap: 5 }}>
            <Sparkles className="h-3.5 w-3.5" />
            AI Studio
          </Link>
          <Link href="/build" className="btn-primary btn-sm" style={{ gap: 5 }}>
            <Plus className="h-3.5 w-3.5" />
            New Post
          </Link>
        </div>
      </div>
    </header>
  );
}
