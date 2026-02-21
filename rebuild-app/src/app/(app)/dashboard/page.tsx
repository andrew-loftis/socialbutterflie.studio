"use client";

import Link from 'next/link';
import {
  Activity,
  BarChart3,
  CalendarDays,
  ChartNoAxesCombined,
  CheckCircle2,
  Clock,
  Edit3,
  FileStack,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { StatCard } from '@/components/ui/stat-card';
import { PageHeader } from '@/components/ui/page-header';
import { useActiveCompany } from '@/lib/hooks/use-active-company';
import { useCompanyAnalytics } from '@/lib/hooks/use-company-analytics';
import { useCompanyPosts } from '@/lib/hooks/use-company-posts';

/* ── Sparkline mock data (replaced by real data when available) ── */
const chartData = [
  { day: 'Mon', impressions: 2100, engagements: 340 },
  { day: 'Tue', impressions: 3400, engagements: 510 },
  { day: 'Wed', impressions: 2800, engagements: 420 },
  { day: 'Thu', impressions: 4200, engagements: 690 },
  { day: 'Fri', impressions: 3800, engagements: 580 },
  { day: 'Sat', impressions: 5100, engagements: 840 },
  { day: 'Sun', impressions: 4700, engagements: 770 },
];

const statusColors: Record<string, string> = {
  published:  '#3dd68c',
  scheduled:  '#5ba0ff',
  in_review:  '#f5a623',
  draft:      '#94a5c4',
};

function StatusDot({ status }: { status: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: statusColors[status] ?? 'var(--muted)',
        flexShrink: 0,
        boxShadow: `0 0 5px ${statusColors[status] ?? 'var(--muted)'}88`,
      }}
    />
  );
}

export default function DashboardPage() {
  const { activeCompany } = useActiveCompany();
  const { analytics } = useCompanyAnalytics();
  const { posts } = useCompanyPosts();

  const scheduled  = posts.filter((p) => p.status === 'scheduled').length;
  const inReview   = posts.filter((p) => p.status === 'in_review').length;
  const published  = posts.filter((p) => p.status === 'published').length;
  const drafts     = posts.filter((p) => p.status === 'draft').length;

  /* ── Empty / no-company state ── */
  if (!activeCompany) {
    return (
      <div className="space-y-3">
        <div className="empty-state" style={{ minHeight: 300 }}>
          <div className="empty-state-icon">
            <Sparkles className="h-6 w-6" />
          </div>
          <h3>No company selected</h3>
          <p>Select or create a company workspace to load your dashboard analytics and publishing queue.</p>
          <Link className="btn-primary" href="/select-company">Choose a company</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Page header ── */}
      <PageHeader
        title={`${activeCompany.name}`}
        subtitle="Operational overview · Today"
        actions={
          <>
            <Link className="btn-ghost btn-sm" href="/analytics">
              <BarChart3 className="h-3.5 w-3.5" /> Analytics
            </Link>
            <Link className="btn-primary btn-sm" href="/build">
              <Edit3 className="h-3.5 w-3.5" /> Create Post
            </Link>
          </>
        }
      />

      {/* ── KPI row ── */}
      <section className="stats-grid">
        <StatCard
          label="Impressions"
          value={analytics?.impressions != null ? analytics.impressions.toLocaleString() : '--'}
          icon={ChartNoAxesCombined}
          delta={analytics ? '+12% vs last week' : 'No data yet'}
          deltaDir={analytics ? 'up' : 'neutral'}
        />
        <StatCard
          label="Engagements"
          value={analytics?.engagements != null ? analytics.engagements.toLocaleString() : '--'}
          icon={TrendingUp}
          delta={analytics ? '+8.4% rate' : 'No data yet'}
          deltaDir={analytics ? 'up' : 'neutral'}
        />
        <StatCard
          label="Scheduled"
          value={scheduled}
          icon={CalendarDays}
          delta={scheduled ? `${scheduled} posts queued` : 'Queue empty'}
          deltaDir="neutral"
        />
        <StatCard
          label="Brand Profile"
          value={`${activeCompany.completionScore ?? 0}%`}
          icon={Sparkles}
          delta={activeCompany.completionScore && activeCompany.completionScore >= 80 ? 'Great coverage' : 'Add more context'}
          deltaDir={activeCompany.completionScore && activeCompany.completionScore >= 80 ? 'up' : 'neutral'}
        />
      </section>

      {/* ── Chart + Activity ── */}
      <div className="grid-two">
        {/* Engagement sparkline */}
        <article className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
            <div>
              <p className="kicker">Performance</p>
              <h3>Engagement trend · 7 days</h3>
            </div>
            <span className="badge badge-success">Live</span>
          </div>
          <div style={{ height: 188, marginTop: 4, position: 'relative', zIndex: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
                <defs>
                  <linearGradient id="impGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"   stopColor="var(--company-primary)" stopOpacity={0.28} />
                    <stop offset="95%"  stopColor="var(--company-primary)" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"   stopColor="var(--company-accent)"  stopOpacity={0.22} />
                    <stop offset="95%"  stopColor="var(--company-accent)"  stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(152,176,218,0.08)" />
                <XAxis
                  dataKey="day"
                  tick={{ fill: 'var(--muted)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--muted)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--panel-strong)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    boxShadow: 'var(--shadow-2)',
                    fontSize: 12,
                  }}
                  labelStyle={{ color: 'var(--text)', fontWeight: 600 }}
                  itemStyle={{ color: 'var(--muted)' }}
                />
                <Area
                  type="monotone"
                  dataKey="impressions"
                  stroke="var(--company-primary)"
                  strokeWidth={2}
                  fill="url(#impGrad)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--company-primary)' }}
                />
                <Area
                  type="monotone"
                  dataKey="engagements"
                  stroke="var(--company-accent)"
                  strokeWidth={2}
                  fill="url(#engGrad)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--company-accent)' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, position: 'relative', zIndex: 1 }}>
            {[
              { color: 'var(--company-primary)', label: 'Impressions' },
              { color: 'var(--company-accent)',  label: 'Engagements' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 3, borderRadius: 2, background: color, display: 'inline-block' }} />
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{label}</span>
              </div>
            ))}
          </div>
        </article>

        {/* Publishing health */}
        <article className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
            <h3>Publishing Queue</h3>
            <Link className="btn-ghost btn-sm" href="/calendar">Calendar</Link>
          </div>

          {/* Status breakdown */}
          <div style={{ display: 'grid', gap: 8, position: 'relative', zIndex: 1 }}>
            {[
              { status: 'published',  icon: CheckCircle2,  label: 'Published',    count: published },
              { status: 'scheduled',  icon: CalendarDays,  label: 'Scheduled',    count: scheduled },
              { status: 'in_review',  icon: Activity,      label: 'In Review',    count: inReview  },
              { status: 'draft',      icon: FileStack,      label: 'Drafts',       count: drafts    },
            ].map(({ status, icon: Icon, label, count }) => (
              <div
                key={status}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: '1px solid var(--border-subtle)',
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <StatusDot status={status} />
                  <Icon className="h-3.5 w-3.5" style={{ color: statusColors[status] ?? 'var(--muted)' }} />
                  <span style={{ fontSize: '0.82rem', color: 'var(--text)' }}>{label}</span>
                </div>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>{count}</span>
              </div>
            ))}
          </div>

          {!posts.length && (
            <div className="empty-state" style={{ padding: '16px 12px' }}>
              <Clock className="h-5 w-5" style={{ color: 'var(--muted)' }} />
              <p>No posts created yet for {activeCompany.name}.</p>
              <Link className="btn-primary btn-sm" href="/build">Create first post</Link>
            </div>
          )}
        </article>
      </div>

      {/* ── Quick actions row ── */}
      <section className="panel">
        <h3 style={{ position: 'relative', zIndex: 1 }}>Quick Actions</h3>
        <div className="quick-links" style={{ position: 'relative', zIndex: 1 }}>
          <Link href="/build"><Edit3 className="h-3.5 w-3.5" /> Create Post</Link>
          <Link href="/calendar"><CalendarDays className="h-3.5 w-3.5" /> Schedule</Link>
          <Link href="/assets"><FileStack className="h-3.5 w-3.5" /> Asset Library</Link>
          <Link href="/analytics"><BarChart3 className="h-3.5 w-3.5" /> Analytics</Link>
          <Link href={`/companies/${activeCompany.id}`}><Sparkles className="h-3.5 w-3.5" /> Company Profile</Link>
          <Link href="/integrations"><Activity className="h-3.5 w-3.5" /> Integrations</Link>
        </div>
      </section>
    </div>
  );
}

