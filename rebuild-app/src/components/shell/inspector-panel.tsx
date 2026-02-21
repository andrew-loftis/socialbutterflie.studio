"use client";

import { Clock, FileText, GitBranch, Shield, X } from 'lucide-react';
import { useAppState } from '@/components/shell/app-state';

export function InspectorPanel() {
  const { inspector, setInspector } = useAppState();

  return (
    <aside className="inspector">
      {/* Header */}
      <div className="inspector-header">
        <div>
          <p className="inspector-kicker">Inspector</p>
          <h3>{inspector?.title ?? 'Select an entity'}</h3>
          {inspector?.subtitle && (
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 2 }}>
              {inspector.subtitle}
            </p>
          )}
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={() => setInspector(null)}
          title="Clear inspector"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Meta row */}
      <div className="inspector-meta">
        <span className={`badge ${inspector ? 'badge-primary' : ''}`}>
          {inspector?.status ?? 'Ready'}
        </span>
        <span style={{ fontSize: '0.70rem', color: 'var(--dim)' }}>
          {inspector?.kind ?? 'No selection'}
        </span>
      </div>

      {/* Summary */}
      <section>
        <h4><FileText className="inline h-3 w-3 mr-1" />Summary</h4>
        <p>
          {inspector?.summary ?? 'Click any card, row, or asset to load entity context here.'}
        </p>
      </section>

      {/* Version history */}
      <section>
        <h4><GitBranch className="inline h-3 w-3 mr-1" />Version History</h4>
        <ul>
          {(inspector?.versionHistory.length ? inspector.versionHistory : ['No versions yet']).map(
            (item) => <li key={item}>{item}</li>
          )}
        </ul>
      </section>

      {/* Approvals */}
      <section>
        <h4><Shield className="inline h-3 w-3 mr-1" />Approvals</h4>
        <ul>
          {(inspector?.approvals.length ? inspector.approvals : ['No approvals']).map(
            (item) => <li key={item}>{item}</li>
          )}
        </ul>
      </section>

      {/* Audit log */}
      <section>
        <h4><Clock className="inline h-3 w-3 mr-1" />Audit Log</h4>
        <ul>
          {(inspector?.auditLog.length ? inspector.auditLog : ['No audit entries']).map(
            (item) => <li key={item}>{item}</li>
          )}
        </ul>
      </section>

      {/* Extra meta */}
      {inspector?.meta && Object.keys(inspector.meta).length > 0 && (
        <section>
          <h4>Metadata</h4>
          <div style={{ display: 'grid', gap: 4 }}>
            {Object.entries(inspector.meta).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>{k}</span>
                <span style={{ fontSize: '0.76rem', color: 'var(--text)' }}>{String(v)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </aside>
  );
}


