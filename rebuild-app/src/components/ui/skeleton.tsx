import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: boolean;
  style?: CSSProperties;
}

export function Skeleton({ className, width, height, rounded, style }: SkeletonProps) {
  return (
    <div
      className={cn('skeleton', rounded && 'rounded-full', className)}
      style={{ width, height, ...style }}
    />
  );
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="panel space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton width={36} height={36} rounded />
        <div className="flex-1 grid gap-2">
          <Skeleton height={14} />
          <Skeleton height={11} width="60%" />
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} height={12} width={`${90 - i * 10}%`} className="skeleton-text" />
      ))}
    </div>
  );
}

export function SkeletonStat() {
  return (
    <article className="stat">
      <div className="flex justify-between items-center">
        <Skeleton height={10} width={80} />
        <Skeleton width={36} height={36} rounded />
      </div>
      <Skeleton height={36} width={110} />
      <Skeleton height={10} width={60} />
    </article>
  );
}
