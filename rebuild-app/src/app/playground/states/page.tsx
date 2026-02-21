"use client";

import { useState } from 'react';
import {
  Activity,
  BarChart3,
  CalendarDays,
  Check,
  Copy,
  Eye,
  FileImage,
  Plug2,
  Sparkles,
  Trash2,
  TrendingUp,
  WandSparkles,
  X,
} from 'lucide-react';

import { StatCard } from '@/components/ui/stat-card';
import { GlassCard, GlassCardContent, GlassCardHeader, GlassCardTitle } from '@/components/ui/glass-card';
import { AvatarStack } from '@/components/ui/avatar-stack';
import { Skeleton, SkeletonCard, SkeletonStat } from '@/components/ui/skeleton';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="playground-section">
      <h2 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted)', fontWeight: 700, marginBottom: 12 }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function Row({ children, label }: { children: React.ReactNode; label?: string }) {
  return (
    <div className="playground-row">
      {label && <span style={{ fontSize: '0.72rem', color: 'var(--muted)', minWidth: 100 }}>{label}</span>}
      {children}
    </div>
  );
}

const SAMPLE_AVATARS = [
  { id: '1', name: 'Alice Kim',   color: '#5ba0ff' },
  { id: '2', name: 'Bob Torres',  color: '#f5a623' },
  { id: '3', name: 'Cara Lam',   color: '#3dd68c' },
  { id: '4', name: 'Dan Wu',     color: '#e05f7e' },
  { id: '5', name: 'Emi Rossi',  color: '#a78bfa' },
];

export default function PlaygroundPage() {
  const [checked, setChecked] = useState(false);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '32px 40px', fontFamily: 'var(--font-body)' }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--company-accent)', fontWeight: 700 }}>
          Dev Sandbox
        </p>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: 6 }}>
          Design System Playground
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          All primitive components and states in one view.
        </p>
      </div>

      <div style={{ display: 'grid', gap: 32 }}>

        {/* Buttons */}
        <Section title="Buttons">
          <Row label="Sizes">
            <button className="btn-primary btn-sm" type="button">Small</button>
            <button className="btn-primary" type="button">Default</button>
            <button className="btn-primary btn-lg" type="button">Large</button>
          </Row>
          <Row label="Variants">
            <button className="btn-primary" type="button"><Sparkles className="h-3.5 w-3.5" /> Primary</button>
            <button className="btn-ghost" type="button">Ghost</button>
            <button className="btn-danger" type="button"><Trash2 className="h-3.5 w-3.5" /> Danger</button>
            <button className="btn-success" type="button"><Check className="h-3.5 w-3.5" /> Success</button>
          </Row>
          <Row label="Icon-only">
            <button className="btn-ghost btn-icon" type="button"><Copy className="h-4 w-4" /></button>
            <button className="btn-ghost btn-icon" type="button"><Eye className="h-4 w-4" /></button>
            <button className="btn-ghost btn-icon" type="button"><X className="h-4 w-4" /></button>
          </Row>
        </Section>

        {/* Badges */}
        <Section title="Badges">
          <Row>
            <span className="badge">Default</span>
            <span className="badge badge-primary">Primary</span>
            <span className="badge badge-success">Success</span>
            <span className="badge badge-warning">Warning</span>
            <span className="badge badge-danger">Danger</span>
          </Row>
        </Section>

        {/* Chips */}
        <Section title="Chips / Filters">
          <Row>
            <span className="chip">Inactive</span>
            <span className="chip active">Active</span>
            <span className="chip">Draft</span>
            <span className="chip">Review</span>
            <span className="chip">Scheduled</span>
            <span className="chip">Published</span>
          </Row>
        </Section>

        {/* Stat cards */}
        <Section title="Stat Cards">
          <div className="stats-grid">
            <StatCard label="Impressions"  value="84,201"  icon={BarChart3}   delta="+12% vs last week" deltaDir="up"      />
            <StatCard label="Engagements" value="6,440"   icon={TrendingUp}  delta="7.6% rate"         deltaDir="up"      />
            <StatCard label="Scheduled"   value={12}      icon={CalendarDays} delta="2 expiring soon"  deltaDir="neutral" />
            <StatCard label="Brand Score" value="94%"     icon={Sparkles}    delta="Great coverage"    deltaDir="up"      />
          </div>
        </Section>

        {/* Glass cards */}
        <Section title="Glass Cards">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle>Default Panel</GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent>
                <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
                  Standard glass surface used across dashboards.
                </p>
              </GlassCardContent>
            </GlassCard>
            <GlassCard accent>
              <GlassCardHeader>
                <GlassCardTitle>Accent Panel</GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent>
                <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
                  Highlighted panel variant with company accent glow.
                </p>
              </GlassCardContent>
            </GlassCard>
            <GlassCard>
              <GlassCardHeader>
                <GlassCardTitle icon={<Activity className="h-4 w-4" />}>With Icon</GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent>
                <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
                  Panel header includes a Lucide icon.
                </p>
              </GlassCardContent>
            </GlassCard>
          </div>
        </Section>

        {/* Avatar stacks */}
        <Section title="Avatar Stacks">
          <Row label="Default (max 4)">
            <AvatarStack avatars={SAMPLE_AVATARS} max={4} />
          </Row>
          <Row label="Compact (max 3)">
            <AvatarStack avatars={SAMPLE_AVATARS} max={3} size={28} />
          </Row>
          <Row label="Full">
            <AvatarStack avatars={SAMPLE_AVATARS} max={10} />
          </Row>
        </Section>

        {/* Skeleton loading */}
        <Section title="Skeleton / Loading States">
          <Row label="Stat">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, width: '100%' }}>
              <SkeletonStat />
              <SkeletonStat />
              <SkeletonStat />
              <SkeletonStat />
            </div>
          </Row>
          <Row label="Card">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, width: '100%' }}>
              <SkeletonCard rows={3} />
              <SkeletonCard rows={2} />
              <SkeletonCard rows={4} />
            </div>
          </Row>
          <Row label="Inline">
            <Skeleton style={{ height: 12, width: 180, borderRadius: 6 }} />
            <Skeleton style={{ height: 12, width: 120, borderRadius: 6 }} />
            <Skeleton style={{ height: 12, width: 220, borderRadius: 6 }} />
          </Row>
        </Section>

        {/* Nav icon preview */}
        <Section title="Nav Icons">
          <Row>
            {[
              { icon: BarChart3,    label: 'Analytics'     },
              { icon: CalendarDays, label: 'Calendar'      },
              { icon: WandSparkles, label: 'Build'         },
              { icon: Eye,          label: 'Review'        },
              { icon: FileImage,    label: 'Assets'        },
              { icon: Sparkles,     label: 'Companies'     },
              { icon: Plug2,        label: 'Integrations'  },
            ].map(({ icon: Icon, label }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, fontSize: '0.65rem', color: 'var(--muted)' }}>
                <div style={{ padding: 8, borderRadius: 9, background: 'var(--panel)', border: '1px solid var(--border-subtle)' }}>
                  <Icon className="h-4 w-4" style={{ color: 'var(--text)' }} />
                </div>
                {label}
              </div>
            ))}
          </Row>
        </Section>

        {/* Form inputs */}
        <Section title="Form Inputs">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Text input</span>
              <input placeholder="Placeholder text…" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Textarea</span>
              <textarea rows={3} placeholder="Write something…" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Date / time</span>
              <input type="datetime-local" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Toggle</span>
              <button
                className={checked ? 'btn-success btn-sm' : 'btn-ghost btn-sm'}
                type="button"
                onClick={() => setChecked(!checked)}
              >
                {checked ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                {checked ? 'Enabled' : 'Disabled'}
              </button>
            </label>
          </div>
        </Section>

        {/* Calendar post pills */}
        <Section title="Post Status Pills">
          <Row>
            <span className="calendar-post-pill draft">Draft caption preview</span>
            <span className="calendar-post-pill review">In review</span>
            <span className="calendar-post-pill scheduled">Scheduled</span>
            <span className="calendar-post-pill published">Published!</span>
          </Row>
        </Section>

        {/* Empty state */}
        <Section title="Empty State">
          <div className="empty-state" style={{ maxWidth: 360 }}>
            <div className="empty-state-icon"><Sparkles className="h-6 w-6" /></div>
            <h3>Nothing here yet</h3>
            <p>This is the default empty state component. Shown when a list or resource is empty.</p>
            <button className="btn-primary btn-sm" type="button">Take action</button>
          </div>
        </Section>

      </div>
    </div>
  );
}
