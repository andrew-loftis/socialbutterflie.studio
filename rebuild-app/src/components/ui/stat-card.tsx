"use client";

import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  delta?: string;
  deltaDir?: 'up' | 'down' | 'neutral';
  sub?: string;
  accent?: string; // CSS color
  children?: ReactNode;
}

export function StatCard({ label, value, icon: Icon, delta, deltaDir = 'neutral', sub, accent, children }: StatCardProps) {
  return (
    <article className="stat">
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        {Icon && (
          <div
            className="stat-icon-wrap"
            style={accent ? {
              borderColor: `${accent}60`,
              background: `${accent}12`,
              color: accent,
            } : undefined}
          >
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="stat-value">
        {value}
      </div>

      {(delta || sub) && (
        <div className={`stat-delta ${deltaDir}`}>
          {deltaDir === 'up'   && <span>↑</span>}
          {deltaDir === 'down' && <span>↓</span>}
          <span>{delta ?? sub}</span>
        </div>
      )}

      {children}
    </article>
  );
}
