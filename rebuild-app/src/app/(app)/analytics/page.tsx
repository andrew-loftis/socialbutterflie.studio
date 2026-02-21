"use client";

import Link from 'next/link';
import { useState } from 'react';
import {
  BarChart3,
  Download,
  Eye,
  MousePointerClick,
  Send,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { SkeletonStat } from '@/components/ui/skeleton';
import { useActiveCompany } from '@/lib/hooks/use-active-company';
import { useCompanyAnalytics } from '@/lib/hooks/use-company-analytics';

const PERIODS = ['This month', 'Last month', 'Last 3 months', 'Last 6 months'] as const;
type Period = typeof PERIODS[number];

const periodKeys: Record<Period, string> = {
  'This month':    'current-month',
  'Last month':    'last-month',
  'Last 3 months': 'last-3-months',
  'Last 6 months': 'last-6-months',
};

const trendData = [
  { week: 'W1',  impressions: 5200, engagements: 810 },
  { week: 'W2',  impressions: 7100, engagements: 1020 },
  { week: 'W3',  impressions: 6400, engagements: 890 },
  { week: 'W4',  impressions: 9300, engagements: 1540 },
];

const channelData = [
  { name: 'Instagram', impressions: 4800 },
  { name: 'LinkedIn',  impressions: 2900 },
  { name: 'Facebook',  impressions: 1600 },
  { name: 'TikTok',    impressions: 3200 },
];

function pct(v: number, t: number) {
  if (!t) return '—';
  return `${Math.round((v / t) * 100)}%`;
}

export default function AnalyticsPage() {
  const { activeCompany } = useActiveCompany();
  const [period, setPeriod] = useState<Period>('This month');
  const { analytics, loading } = useCompanyAnalytics(periodKeys[period]);

  if (!activeCompany) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><Sparkles className="h-6 w-6" /></div>
        <h3>No company selected</h3>
        <p>Select a company to view its analytics dashboard.</p>
        <Link className="btn-primary" href="/select-company">Choose company</Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title={`${activeCompany.name} Analytics`}
        subtitle="Performance metrics & publishing health."
        actions={
          <>
            {PERIODS.map((p) => (
              <button
                key={p}
                className={`chip${period === p ? ' active' : ''}`}
                type="button"
                onClick={() => setPeriod(p)}
              >{p}</button>
            ))}
          </>
        }
      />

      {/* KPI cards */}
      <section className="stats-grid">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)
        ) : analytics ? (
          <>
            <StatCard label="Impressions" value={analytics.impressions.toLocaleString()} icon={Eye} delta="+12% vs prev" deltaDir="up" />
            <StatCard label="Engagements" value={analytics.engagements.toLocaleString()} icon={TrendingUp} delta={pct(analytics.engagements, analytics.impressions) + ' rate'} deltaDir="up" />
            <StatCard label="Clicks" value={analytics.clicks.toLocaleString()} icon={MousePointerClick} delta={pct(analytics.clicks, analytics.impressions) + ' CTR'} deltaDir="neutral" />
            <StatCard label="Published" value={analytics.postsPublished} icon={Send} delta={`${analytics.postsScheduled} still queued`} deltaDir="neutral" />
          </>
        ) : (
          <div className="panel" style={{ gridColumn: '1/-1' }}>
            <div className="empty-state">
              <div className="empty-state-icon"><BarChart3 className="h-6 w-6" /></div>
              <h3>No analytics data</h3>
              <p>Publish content and connect social channels to start tracking metrics.</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link className="btn-primary btn-sm" href="/build">Create post</Link>
                <Link className="btn-ghost btn-sm" href="/integrations">Connect channels</Link>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Charts */}
      {(analytics || !loading) && (
        <div className="grid-two">
          {/* Trend line */}
          <article className="panel">
            <h3 style={{ position: 'relative', zIndex: 1 }}>Weekly trend</h3>
            <div style={{ height: 200, position: 'relative', zIndex: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
                  <defs>
                    <linearGradient id="impGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--company-primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--company-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(152,176,218,0.08)" />
                  <XAxis dataKey="week" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--panel-strong)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }} labelStyle={{ color: 'var(--text)', fontWeight: 600 }} itemStyle={{ color: 'var(--muted)' }} />
                  <Area type="monotone" dataKey="impressions" stroke="var(--company-primary)" strokeWidth={2} fill="url(#impGrad2)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>

          {/* Channel bar */}
          <article className="panel">
            <h3 style={{ position: 'relative', zIndex: 1 }}>By channel</h3>
            <div style={{ height: 200, position: 'relative', zIndex: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelData} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(152,176,218,0.08)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--panel-strong)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }} labelStyle={{ color: 'var(--text)', fontWeight: 600 }} itemStyle={{ color: 'var(--muted)' }} />
                  <Bar dataKey="impressions" fill="var(--company-primary)" radius={[4, 4, 0, 0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
        </div>
      )}

      {/* Export row */}
      <section className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <h3>Export Report</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost btn-sm" type="button"><Download className="h-3.5 w-3.5" /> CSV</button>
            <button className="btn-ghost btn-sm" type="button"><Download className="h-3.5 w-3.5" /> PDF</button>
            <button className="btn-primary btn-sm" type="button">Schedule report</button>
          </div>
        </div>
      </section>
    </div>
  );
}


