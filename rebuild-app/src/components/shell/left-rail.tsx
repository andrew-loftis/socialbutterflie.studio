"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { navItems } from '@/components/shell/nav-items';
import { useAuth } from '@/lib/firebase/auth-provider';

export function LeftRail() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();

  const initials = (user?.displayName ?? user?.email ?? '?')
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0].toUpperCase())
    .join('');

  return (
    <aside className={`rail ${collapsed ? 'rail-collapsed' : ''}`}>
      {/* Brand mark */}
      <div className="rail-brand">
        <div className="rail-brand-mark">SB</div>
        <span className="rail-brand-name">SocialButterflie</span>
      </div>

      {/* Section label */}
      <div className="rail-section-label">Navigation</div>

      {/* Main nav */}
      <nav className="rail-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rail-item ${active ? 'active' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <span className="rail-item-icon">
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span className="rail-item-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer: user + collapse toggle */}
      <div className="rail-footer">
        <Link href="/profile" className="rail-user" title={collapsed ? (user?.displayName ?? user?.email ?? 'Profile') : undefined}>
          <div className="rail-user-avatar" style={{ overflow: 'hidden' }}>
            {user?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt={user.displayName || user.email || 'Profile'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              initials
            )}
          </div>
          <div className="rail-user-info">
            <span className="rail-user-name">{user?.displayName ?? 'Account'}</span>
            <span className="rail-user-email">{user?.email ?? ''}</span>
          </div>
        </Link>
        <button
          type="button"
          className="rail-toggle"
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="rail-item-label" style={{ fontSize: '0.76rem' }}>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

