"use client";

import { cn } from '@/lib/utils';
import { type HTMLAttributes, type ReactNode } from 'react';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Adds a hover lift + glow interaction */
  interactive?: boolean;
  /** Tighter padding variant */
  compact?: boolean;
  /** Company-accent glow border */
  accent?: boolean;
}

export function GlassCard({ children, interactive, compact, accent, className, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        'panel',
        compact && 'p-3',
        interactive && 'cursor-pointer',
        className,
      )}
      style={{
        padding: compact ? 10 : undefined,
        ...(accent ? { borderColor: 'var(--company-primary)', boxShadow: '0 0 0 1px var(--company-glow-soft) inset, 0 4px 14px var(--company-glow-soft)' } : {}),
        ...(props.style ?? {}),
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export function GlassCardHeader({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-start justify-between gap-3', className)}
      style={{ position: 'relative', zIndex: 1, ...(props.style ?? {}) }}
      {...props}
    >
      {children}
    </div>
  );
}

interface GlassCardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  icon?: ReactNode;
}

export function GlassCardTitle({ children, className, icon, ...props }: GlassCardTitleProps) {
  return (
    <h3
      className={cn('text-sm font-semibold tracking-tight text-[var(--text)]', className)}
      style={{ display: 'flex', alignItems: 'center', gap: 6, ...(props.style ?? {}) }}
      {...props}
    >
      {icon && <span style={{ color: 'var(--company-accent)', display: 'flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </h3>
  );
}

export function GlassCardContent({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('relative z-10', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function GlassCardFooter({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'relative z-10 flex items-center gap-2 border-t border-[var(--border-subtle)] pt-3',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
