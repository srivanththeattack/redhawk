import React, { useEffect, useState, useCallback } from 'react';
import { useScan } from './hooks/useScan';
import { useSplitPanes } from './hooks/useSplitPanes';
import type { TabId } from './hooks/useSplitPanes';
import { Disclaimer } from './components/Disclaimer';
import { SplitPaneContainer } from './components/SplitPaneContainer';
import { HamburgerMenu } from './components/HamburgerMenu';
import { OperationsBar } from './components/OperationsBar';
import { ThemePicker } from './components/ThemePicker';
import { HistorySidebar } from './components/HistorySidebar';

interface TabDef {
  id: TabId;
  label: string;
  icon: string;
  description: string;
}

const TABS: TabDef[] = [
  { id: 'recon', label: 'Recon', icon: '🔍', description: 'Target recon, OSINT, port scanning' },
  { id: 'exploit', label: 'Exploit', icon: '💀', description: 'Metasploit integration, payload generation' },
  { id: 'phish', label: 'Phish', icon: '🎣', description: 'Phishing campaigns via evilginx2' },
  { id: 'payload', label: 'Payload', icon: '📦', description: 'Payload factory — generate, obfuscate, sign payloads' },
  { id: 'evade', label: 'Evade', icon: '🛡️', description: 'AV/EDR evasion — AMSI bypass, ETW patch, injection' },
  { id: 'privesc', label: 'Privesc', icon: '⬆️', description: 'Privilege escalation — WinPEAS, PowerUp, exploit suggester' },
  { id: 'c2', label: 'C2', icon: '📡', description: 'Command & control server' },
  { id: 'exfil', label: 'Exfil', icon: '📤', description: 'Data exfiltration' },
  { id: 'ops', label: 'Ops', icon: '📋', description: 'Operation dashboard — timeline, notes, findings, todos' },
];

function StatusBar({ phase, target }: { phase: string; target: string }) {
  return (
    <footer className="flex items-center justify-between px-6 py-2 bg-midnight-900/80 backdrop-blur-md border-t border-midnight-800/30 flex-shrink-0">
      <div className="flex items-center gap-3">
        <span className={`w-2 h-2 rounded-full transition-all duration-500 ${
          phase === 'idle' ? 'bg-gray-600' :
          phase === 'scanning' ? 'bg-redhawk-500 animate-pulse' :
          phase === 'complete' ? 'bg-green-500' : 'bg-redhawk-500'
        }`} />
        <span className="text-xs text-gray-500 font-medium">
          {phase === 'idle' && 'Ready'}
          {phase === 'scanning' && 'Scanning...'}
          {phase === 'complete' && 'Scan complete'}
          {phase === 'error' && 'Error occurred'}
        </span>
        {target && <span className="text-xs text-gray-600 font-mono hidden sm:block">Target: {target}</span>}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-gray-600">
        <span>For authorized testing only</span>
      </div>
    </footer>
  );
}

export default function App() {
  const scan = useScan();
  const split = useSplitPanes();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Update kill chain when active tab changes
  useEffect(() => {
    const tabToPhase: Record<TabId, string> = {
      recon: 'recon',
      exploit: 'exploit',
      phish: 'phish',
      c2: 'c2',
      exfil: 'exfil',
      payload: 'exploit',
      evade: 'exploit',
      ops: 'recon',
      privesc: 'exploit',
    };
    const phase = tabToPhase[split.activeTab];
    if (phase) {
      scan.setKillChainPhase(phase as any, 'active');
    }
  }, [split.activeTab]);

  useEffect(() => {
    scan.loadHistory();
  }, []);

  if (!scan.disclaimerAccepted) {
    return <Disclaimer onAccept={scan.acceptDisclaimer} />;
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-midnight-950 via-midnight-950 to-midnight-900">
      {/* ── HEADER ── */}
      <header className="flex items-center justify-between px-6 py-3 bg-midnight-900/80 backdrop-blur-md border-b border-midnight-800/50 flex-shrink-0 relative z-40">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-redhawk-600 to-redhawk-800 flex items-center justify-center shadow-lg shadow-redhawk-600/20">
              <span className="text-white font-bold text-sm tracking-tight">RH</span>
            </div>
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full shadow-[0_0_6px_rgba(34,197,94,0.6)] animate-pulse" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <h1 className="text-lg font-bold text-gray-100 leading-tight tracking-tight">RedHawk</h1>
              <span className="text-[10px] font-medium text-gray-600 bg-midnight-800 px-1.5 py-0.5 rounded uppercase tracking-wider">v0.1.1</span>
            </div>
            <p className="text-[11px] text-gray-600">Red Teaming Suite</p>
          </div>

          {/* Operations selector */}
          <OperationsBar />

          {/* Tab navigation — each tab can be added as a split pane */}
          <nav className="hidden md:flex items-center gap-1 ml-6 pl-6 border-l border-midnight-800">
            {TABS.map((tab) => {
              const isActive = split.panes.some((p) => p.tabId === tab.id);
              return (
                <div key={tab.id} className="flex items-center gap-0 group">
                  <button
                    onClick={() => {
                      // If this tab is already in a pane, focus it; otherwise add/replace
                      const existing = split.panes.find((p) => p.tabId === tab.id);
                      if (existing) {
                        split.setActivePaneId(existing.id);
                      } else if (split.isSplit) {
                        // Replace the active pane's tab
                        split.setPaneTab(split.activePaneId, tab.id);
                      } else {
                        // Add as new pane
                        split.addPane(tab.id);
                      }
                    }}
                    title={tab.description}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-redhawk-600/15 text-redhawk-400 border border-redhawk-600/20'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-midnight-800/50'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                  {/* Split button — opens this tab in a new side pane */}
                  {!isActive && (
                    <button
                      onClick={() => split.addPane(tab.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-gray-300 p-1"
                      title={`Open ${tab.label} in split pane`}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          {!scan.depsStatus?.all && !scan.depsChecking && (
            <button onClick={scan.installDeps} className="btn-secondary text-xs py-1.5 px-3">
              Install Deps
            </button>
          )}
          {scan.depsChecking && (
            <span className="text-xs text-gray-500 animate-pulse flex items-center gap-1">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Checking...
            </span>
          )}
          {/* Split mode indicator */}
          {split.isSplit && (
            <button
              onClick={split.collapseToSingle}
              className="text-[10px] text-gray-500 hover:text-gray-300 flex items-center gap-1 px-2 py-1 rounded"
              title="Collapse to single pane"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="hidden sm:inline">Collapse</span>
            </button>
          )}
          <ThemePicker />
          <HamburgerMenu onToggleHistory={() => setSidebarOpen(p => !p)} sidebarOpen={sidebarOpen} />
        </div>
      </header>

      {/* ── MOBILE TAB BAR ── */}
      <div className="md:hidden flex gap-0.5 px-2 pt-2 bg-midnight-950 flex-shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              split.panes.length > 0
                ? split.setPaneTab(split.panes[0].id, tab.id)
                : split.addPane(tab.id);
            }}
            className={`flex-1 py-2 rounded-t-lg text-[10px] font-medium transition-all ${
              split.panes.some((p) => p.tabId === tab.id)
                ? 'bg-midnight-900 text-redhawk-400 border-t border-l border-r border-midnight-800'
                : 'text-gray-600 hover:text-gray-400 bg-midnight-950'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Pane content */}
        <SplitPaneContainer
          panes={split.panes}
          dragging={split.dragging}
          scan={scan}
          onRemovePane={split.removePane}
          onCycleTab={split.cyclePaneTab}
          onStartResize={split.startResize}
        />

        {/* ── HISTORY SIDEBAR ── */}
        <div className={`
          transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 border-l border-midnight-800/50
          ${sidebarOpen ? 'w-80 opacity-100' : 'w-0 opacity-0'}
        `}>
          {sidebarOpen && (
            <aside className="w-80 h-full bg-midnight-900/50 backdrop-blur-sm overflow-y-auto">
              <HistorySidebar currentTab={split.activeTab} scan={scan} />
            </aside>
          )}
        </div>
      </div>

      {/* ── STATUS BAR ── */}
      <StatusBar phase={scan.phase} target={scan.target} />
    </div>
  );
}
