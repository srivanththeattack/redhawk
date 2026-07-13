import { Fragment } from 'react';
import type { PaneConfig, TabId } from '../hooks/useSplitPanes';
import type { useScan } from '../hooks/useScan';
import { ReconContent } from './ReconContent';
import { MsfPanel } from './MsfPanel';
import { PhishingPanel } from './PhishingPanel';
import { C2Panel } from './C2Panel';
import { ExfilPanel } from './ExfilPanel';

interface SplitPaneContainerProps {
  panes: PaneConfig[];
  dragging: any;
  scan: ReturnType<typeof useScan>;
  onRemovePane: (id: string) => void;
  onCycleTab: (id: string) => void;
  onStartResize: (index: number, e: React.MouseEvent) => void;
}

const TAB_LABELS: Record<TabId, { label: string; icon: string }> = {
  recon: { label: 'Recon', icon: '🔍' },
  exploit: { label: 'Exploit', icon: '💀' },
  phish: { label: 'Phish', icon: '🎣' },
  c2: { label: 'C2', icon: '📡' },
  exfil: { label: 'Exfil', icon: '📤' },
};

function TabContent({ tabId, scan }: { tabId: TabId; scan: ReturnType<typeof useScan> }) {
  switch (tabId) {
    case 'recon':
      return <ReconContent scan={scan} />;
    case 'exploit':
      return <MsfPanel />;
    case 'phish':
      return <PhishingPanel />;
    case 'c2':
      return <C2Panel />;
    case 'exfil':
      return <ExfilPanel />;
  }
}

export function SplitPaneContainer({ panes, dragging, scan, onRemovePane, onCycleTab, onStartResize }: SplitPaneContainerProps) {
  if (panes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600">
        <p className="text-sm">No panes open. Select a tab above.</p>
      </div>
    );
  }

  // Single pane — no split UI needed
  if (panes.length === 1) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6">
          <TabContent tabId={panes[0].tabId} scan={scan} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {panes.map((pane, idx) => {
        const tabInfo = TAB_LABELS[pane.tabId];
        const flexGrow = dragging
          ? dragging.startFlex[idx]
          : pane.flex;
        const total = dragging
          ? dragging.startFlex.reduce((a: number, b: number) => a + b, 0)
          : panes.reduce((a, p) => a + p.flex, 0);
        const flexPercent = total > 0 ? (flexGrow / total) * 100 : 100 / panes.length;

        return (
          <Fragment key={pane.id}>
            <div
              className="flex flex-col overflow-hidden"
              style={{ flex: `0 0 ${flexPercent}%`, minWidth: 0 }}
            >
              {/* Pane header */}
              <div className="flex items-center justify-between px-3 py-1.5 bg-midnight-900/60 border-b border-midnight-800/50 flex-shrink-0">
                <div className="flex items-center gap-1.5 text-xs">
                  <span>{tabInfo.icon}</span>
                  <span className="text-gray-400 font-medium">{tabInfo.label}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => onCycleTab(pane.id)}
                    className="text-gray-600 hover:text-gray-300 p-0.5 rounded transition-colors"
                    title="Cycle tab"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  {panes.length > 1 && (
                    <button
                      onClick={() => onRemovePane(pane.id)}
                      className="text-gray-600 hover:text-redhawk-400 p-0.5 rounded transition-colors"
                      title="Close pane"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              {/* Pane content */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-4">
                  <TabContent tabId={pane.tabId} scan={scan} />
                </div>
              </div>
            </div>

            {/* Resize handle between panes */}
            {idx < panes.length - 1 && (
              <div
                onMouseDown={(e) => onStartResize(idx, e)}
                className="flex-shrink-0 w-1.5 cursor-col-resize bg-midnight-800/30 hover:bg-redhawk-600/50 active:bg-redhawk-600/70 transition-colors relative group"
              >
                <div className="absolute inset-y-0 -left-1 -right-1" />
              </div>
            )}
            </Fragment>
        );
      })}
    </div>
  );
}
