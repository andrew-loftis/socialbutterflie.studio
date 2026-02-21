"use client";

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { ArrowRight, Users } from 'lucide-react';
import { CompanyMemberStrip } from '@/components/company/company-member-strip';
import type { CompanyMember, CompanyProfile } from '@/types/interfaces';

type CompanyTileProps = {
  company: CompanyProfile;
  selected: boolean;
  members: CompanyMember[];
  style?: CSSProperties;
  clipPath?: string;
  featured?: boolean;
  onSelect: () => void;
  onManage: () => void;
};

function fallbackBackground(company: CompanyProfile) {
  const primary = company.branding.primary || '#5ba0ff';
  const secondary = company.branding.secondary || '#323f67';
  return `radial-gradient(70% 80% at 20% 15%, ${primary}88, transparent 65%), radial-gradient(75% 95% at 80% 100%, ${secondary}7a, transparent 68%), linear-gradient(145deg, #0f1529, #0b1020)`;
}

export function CompanyTile({
  company,
  selected,
  members,
  style,
  clipPath,
  featured,
  onSelect,
  onManage,
}: CompanyTileProps) {
  return (
    <article
      className={`company-select-tile ${selected ? 'selected' : 'tile-deemphasized'} ${featured ? 'featured' : ''}`}
      style={{
        ...style,
        clipPath: clipPath || undefined,
      }}
    >
      <div
        className="company-select-bg"
        style={{
          backgroundImage: company.coverAssetUrl
            ? `linear-gradient(180deg, rgba(8,12,24,0.25), rgba(8,12,24,0.88)), url(${company.coverAssetUrl})`
            : fallbackBackground(company),
        }}
      />
      <div className="company-select-overlay" />

      <div className="company-select-content">
        <div className="company-select-top">
          <div>
            <p className="kicker">Company</p>
            <h3>{company.name}</h3>
            <p className="company-select-status">{company.memberCount || 0} members</p>
          </div>
          <button type="button" className="tile-icon-btn" onClick={onManage}>
            <Users className="h-4 w-4" />
          </button>
        </div>

        <div className="company-select-actions">
          <button type="button" className="btn-primary" onClick={onSelect}>
            Select <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <Link className="btn-ghost" href={`/companies/${company.id}`}>
            Open
          </Link>
        </div>

        {selected ? <CompanyMemberStrip members={members} /> : null}
      </div>
    </article>
  );
}

