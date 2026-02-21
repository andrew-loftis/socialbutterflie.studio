"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { navItems } from '@/components/shell/nav-items';

export function LeftRail() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

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

      {/* Footer / collapse toggle */}
      <div className="rail-footer">
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


