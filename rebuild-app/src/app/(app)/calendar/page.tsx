"use client";

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Sparkles } from 'lucide-react';

import { PageHeader } from '@/components/ui/page-header';
import { useActiveCompany } from '@/lib/hooks/use-active-company';
import type { CompanyPost } from '@/lib/hooks/use-company-posts';
import { useCompanyPosts } from '@/lib/hooks/use-company-posts';

const FILTERS = ['All', 'Draft', 'Review', 'Scheduled', 'Published'] as const;
type Filter = typeof FILTERS[number];

const FILTER_STATUS: Record<Filter, string | null> = {
  All:       null,
  Draft:     'draft',
  Review:    'in_review',
  Scheduled: 'scheduled',
  Published: 'published',
};

const PILL_CLASS: Record<string, string> = {
  draft:     'draft',
  in_review: 'review',
  scheduled: 'scheduled',
  published: 'published',
};

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_HEADERS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function buildMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const cells: { date: Date; current: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrev - i), current: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), current: true });
  }
  while (cells.length < 35) {
    cells.push({ date: new Date(year, month + 1, cells.length - firstDay - daysInMonth + 1), current: false });
  }
  return cells;
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function postDateKey(post: CompanyPost) {
  if (!post.scheduledFor) return null;
  return post.scheduledFor.slice(0, 10);
}

export default function CalendarPage() {
  const { activeCompany } = useActiveCompany();
  const { posts } = useCompanyPosts();

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [filter, setFilter] = useState<Filter>('All');

  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const filteredPosts = useMemo(() => {
    const status = FILTER_STATUS[filter];
    return status ? posts.filter((p) => p.status === status) : posts;
  }, [posts, filter]);

  const postsByDay = useMemo(() => {
    const map: Record<string, CompanyPost[]> = {};
    for (const p of filteredPosts) {
      const k = postDateKey(p);
      if (!k) continue;
      if (!map[k]) map[k] = [];
      map[k].push(p);
    }
    return map;
  }, [filteredPosts]);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  if (!activeCompany) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><CalendarDays className="h-6 w-6" /></div>
        <h3>No company selected</h3>
        <Link className="btn-primary" href="/select-company">Choose company</Link>
      </div>
    );
  }

  const todayKey = dateKey(today);

  return (
    <div className="space-y-3">
      <PageHeader
        title={`${activeCompany.name} Calendar`}
        subtitle="Schedule and visualise your publishing queue."
        actions={
          <Link className="btn-primary btn-sm" href="/build">
            <Plus className="h-3.5 w-3.5" /> New Post
          </Link>
        }
      />

      <section className="panel">
        {/* Month nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="btn-ghost btn-icon" type="button" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h3 style={{ margin: 0 }}>{MONTH_NAMES[viewMonth]} {viewYear}</h3>
            <button className="btn-ghost btn-icon" type="button" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {FILTERS.map((f) => (
              <button
                key={f}
                className={`chip${filter === f ? ' active' : ''}`}
                type="button"
                onClick={() => setFilter(f)}
              >{f}</button>
            ))}
          </div>
        </div>

        {/* Day headers */}
        <div className="calendar-grid" style={{ position: 'relative', zIndex: 1 }}>
          {DAY_HEADERS.map((d) => (
            <div key={d} className="calendar-day-header">{d}</div>
          ))}

          {/* Day cells */}
          {cells.map(({ date, current }) => {
            const key = dateKey(date);
            const dayPosts = postsByDay[key] || [];
            const isToday = key === todayKey;
            return (
              <div
                key={key}
                className={`calendar-day${isToday ? ' today' : ''}${!current ? ' other-month' : ''}`}
              >
                <span className="calendar-day-num">{date.getDate()}</span>
                {dayPosts.slice(0, 3).map((p) => (
                  <span key={p.id} className={`calendar-post-pill ${PILL_CLASS[p.status] || ''}`}>
                    {p.caption?.slice(0, 18) || p.platform || 'Post'}
                  </span>
                ))}
                {dayPosts.length > 3 && (
                  <span className="calendar-more">+{dayPosts.length - 3} more</span>
                )}
              </div>
            );
          })}
        </div>

        {!posts.length && (
          <div className="empty-state" style={{ marginTop: 24 }}>
            <div className="empty-state-icon"><Sparkles className="h-5 w-5" /></div>
            <p>No posts yet. Start building your content calendar.</p>
            <Link className="btn-primary" href="/build">Create first post</Link>
          </div>
        )}
      </section>
    </div>
  );
}

