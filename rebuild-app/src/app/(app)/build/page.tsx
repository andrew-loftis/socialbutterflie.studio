"use client";

import Link from 'next/link';
import { useState } from 'react';
import { CalendarDays, Heart, ImagePlus, MessageCircle, MoreHorizontal, Send, Share2, Sparkles, WandSparkles } from 'lucide-react';

import { PageHeader } from '@/components/ui/page-header';
import { useAppState } from '@/components/shell/app-state';
import { useActiveCompany } from '@/lib/hooks/use-active-company';
import { useCompanyAssets } from '@/lib/hooks/use-company-assets';
import { useAuth } from '@/lib/firebase/auth-provider';

const PLATFORMS = ['Instagram', 'Facebook', 'LinkedIn', 'TikTok'] as const;
type Platform = typeof PLATFORMS[number];

export default function BuildPage() {
  const { user } = useAuth();
  const { appContext } = useAppState();
  const { activeCompany } = useActiveCompany();
  const { assets } = useCompanyAssets();

  const [platform, setPlatform] = useState<Platform>('Instagram');
  const [caption, setCaption] = useState('');
  const [campaign, setCampaign] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const providerMap: Record<Platform, 'instagram' | 'facebook' | 'tiktok' | null> = {
    Instagram: 'instagram',
    Facebook: 'facebook',
    TikTok: 'tiktok',
    LinkedIn: null,
  };

  async function submitPost(workflowStatus: 'draft' | 'review' | 'pending') {
    const provider = providerMap[platform];
    if (!provider) {
      setStatus(`${platform} scheduling is not wired yet. Connect Instagram/Facebook/TikTok for now.`);
      return;
    }
    if (!user?.uid) {
      setStatus('Sign in to schedule posts.');
      return;
    }
    if (!mediaUrl.trim()) {
      setStatus('Media URL is required for scheduling.');
      return;
    }
    if (workflowStatus === 'pending' && !scheduleAt) {
      setStatus('Schedule time is required.');
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      const when = workflowStatus === 'pending'
        ? new Date(scheduleAt).toISOString()
        : new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const res = await fetch('/.netlify/functions/api?path=/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.uid,
          org_id: appContext.workspaceId,
          provider,
          caption,
          mediaUrl: mediaUrl.trim(),
          when,
          workflowStatus,
          campaignId: campaign || undefined,
        }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      setStatus(
        workflowStatus === 'draft'
          ? 'Saved as draft.'
          : workflowStatus === 'review'
            ? 'Submitted for review.'
            : 'Post scheduled.'
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to save post.');
    } finally {
      setSaving(false);
    }
  }

  if (!activeCompany) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><WandSparkles className="h-6 w-6" /></div>
        <h3>No company selected</h3>
        <Link className="btn-primary" href="/select-company">Choose company</Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title={`Build Post`}
        subtitle={`Compose with ${activeCompany.name} context, then schedule.`}
        actions={
          <>
            <button className="btn-ghost btn-sm" type="button">
              <Sparkles className="h-3.5 w-3.5" /> AI assist
            </button>
            <button className="btn-primary btn-sm" type="button" onClick={() => submitPost('pending')} disabled={saving}>
              <CalendarDays className="h-3.5 w-3.5" /> Schedule Post
            </button>
          </>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 12 }}>
        {/* ── Composer ── */}
        <section className="panel">
          <h3 style={{ position: 'relative', zIndex: 1 }}>Composer</h3>

          {/* Platform tabs */}
          <div style={{ display: 'flex', gap: 6, position: 'relative', zIndex: 1 }}>
            {PLATFORMS.map((p) => (
              <button
                key={p}
                className={`chip${platform === p ? ' active' : ''}`}
                type="button"
                onClick={() => setPlatform(p)}
              >{p}</button>
            ))}
          </div>

          {/* Caption */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Caption</span>
              <textarea
                rows={6}
                placeholder={`Write your ${platform} caption for ${activeCompany.name}…`}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </label>
            <div style={{ textAlign: 'right', fontSize: '0.72rem', color: 'var(--muted)', marginTop: 4 }}>
              {caption.length} chars
            </div>
          </div>

          {/* Campaign + schedule row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, position: 'relative', zIndex: 1 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Campaign</span>
              <input placeholder="Campaign name" value={campaign} onChange={(e) => setCampaign(e.target.value)} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Schedule</span>
              <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
            </label>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', zIndex: 1 }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Media URL</span>
            <input
              placeholder="https://.../image-or-video.jpg"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
            />
          </label>

          {/* Upload zone */}
          <div
            className="upload-zone"
            style={{ position: 'relative', zIndex: 1 }}
          >
            <ImagePlus className="h-5 w-5" style={{ color: 'var(--muted)' }} />
            <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
              Drag &amp; drop media, or <span style={{ color: 'var(--company-primary)', cursor: 'pointer' }}>browse</span>
            </span>
            {assets.length > 0 && (
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{assets.length} company assets available</span>
            )}
          </div>

          {/* Action row */}
          <div className="button-row" style={{ position: 'relative', zIndex: 1 }}>
            <button className="btn-ghost" type="button" onClick={() => submitPost('draft')} disabled={saving}>Save draft</button>
            <button className="btn-ghost" type="button" onClick={() => submitPost('review')} disabled={saving}>Submit for review</button>
            <button className="btn-primary" type="button" onClick={() => submitPost('pending')} disabled={saving}>
              <Send className="h-3.5 w-3.5" /> Schedule Post
            </button>
          </div>
          {status ? <p className="text-sm text-[var(--muted)]">{status}</p> : null}
        </section>

        {/* ── Phone simulator ── */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="phone-outer">
            <div className="phone-frame">
              <div className="phone-notch" />
              <div className="phone-screen">
                <div className="phone-safe-top" />

                {platform === 'Instagram' && (
                  <>
                    {/* IG header */}
                    <div className="phone-ig-header">
                      <div className="phone-ig-avatar" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>
                          {activeCompany.name}
                        </div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>Sponsored</div>
                      </div>
                      <MoreHorizontal style={{ width: 14, color: 'rgba(255,255,255,0.5)' }} />
                    </div>

                    {/* Media area */}
                    <div className="phone-ig-media">
                      {assets[0]?.thumbnailUrl
                        ? <img src={assets[0].thumbnailUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ImagePlus style={{ width: 28, color: 'rgba(255,255,255,0.2)' }} />
                          </div>
                      }
                    </div>

                    {/* IG actions */}
                    <div className="phone-ig-actions">
                      <Heart style={{ width: 18, color: '#fff' }} />
                      <MessageCircle style={{ width: 18, color: '#fff' }} />
                      <Share2 style={{ width: 18, color: '#fff' }} />
                    </div>

                    {/* Caption preview */}
                    <div style={{ padding: '4px 10px 8px', fontSize: 10, color: '#fff', lineHeight: 1.4 }}>
                      <strong>{activeCompany.name}</strong>{' '}
                      {caption || <span style={{ opacity: 0.4 }}>Your caption will appear here…</span>}
                    </div>
                  </>
                )}

                {platform !== 'Instagram' && (
                  <div className="phone-content-area" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>{platform} preview</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>{caption || 'Caption preview'}</div>
                  </div>
                )}

                <div className="phone-safe-bottom" />
                <div className="phone-home-bar" />
              </div>
            </div>
          </div>

          {/* AI assist card */}
          <div className="panel" style={{ fontSize: '0.8rem' }}>
            <p className="kicker" style={{ position: 'relative', zIndex: 1 }}>AI Assist</p>
            <p style={{ color: 'var(--muted)', position: 'relative', zIndex: 1 }}>Generate a caption using {activeCompany.name}&apos;s brand voice and guidelines.</p>
            <button className="btn-ghost btn-sm" type="button" style={{ position: 'relative', zIndex: 1 }}>
              <Sparkles className="h-3.5 w-3.5" /> Generate caption
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
