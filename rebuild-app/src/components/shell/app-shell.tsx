"use client";

import { CommandBar } from '@/components/shell/command-bar';
import { InspectorPanel } from '@/components/shell/inspector-panel';
import { LeftRail } from '@/components/shell/left-rail';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <LeftRail />
      <div className="shell-main">
        <CommandBar />
        <div className="shell-inner">
          <div className="shell-grid">
            <main className="shell-content">{children}</main>
            <InspectorPanel />
          </div>
        </div>
      </div>
    </div>
  );
}


