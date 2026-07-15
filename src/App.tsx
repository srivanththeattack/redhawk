import React, { useEffect, useState, useCallback } from 'react';
import { useScan } from './hooks/useScan';
import { useSplitPanes } from './hooks/useSplitPanes';
import type { TabId } from './hooks/useSplitPanes';
import type { ScanTaskState } from './store/scan-store';
import { Disclaimer } from './components/Disclaimer';
import { GuidedTour } from './components/GuidedTour';
import { SplitPaneContainer } from './components/SplitPaneContainer';
import { HamburgerMenu } from './components/HamburgerMenu';
import { SettingsPanel } from './components/SettingsPanel';
import { OperationsBar } from './components/OperationsBar';
import { ThemePicker } from './components/ThemePicker';
import { HistorySidebar } from './components/HistorySidebar';
import { TeamPanel } from './components/TeamPanel';

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  description: string;
}

// Clean SVG icons — 16px scale, 2px stroke, round caps/joins
function TabIcon({ tabId, className }: { tabId: TabId; className?: string }) {
  const cls = className || 'w-4 h-4';
  const icons: Record<TabId, React.ReactNode> = {
    recon: (
      <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
        <path d="M11 8v6" />
        <path d="M8 11h6" />
      </svg>
    ),
    exploit: (
      <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M12 2a10 10 0 1010 10 10 10 0 00-10-10z" />
        <path d="M7.5 15.5a5 5 0 019 0" />
        <circle cx="9" cy="9" r=".5" fill="currentColor" />
        <circle cx="15" cy="9" r=".5" fill="currentColor" />
      </svg>
    ),
    phish: (
      <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M4 6a16 16 0 0116 0" />
        <path d="M4 12a12 12 0 0116 0" />
        <path d="M8 18a8 8 0 018 0" />
        <path d="M12 2v4" />
        <path d="M12 14v8" />
        <path d="M9 19l3 3 3-3" />
      </svg>
    ),
    payload: (
      <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
        <path d="M12 13l3-3" />
        <path d="M12 13l-3-3" />
      </svg>
    ),
    evade: (
      <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M12 2l9 5v6c0 5.5-4.5 9.5-9 11-4.5-1.5-9-5.5-9-11V7z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    privesc: (
      <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M12 20V8" />
        <path d="M5 15l7-7 7 7" />
        <path d="M4 4h16" />
      </svg>
    ),
    c2: (
      <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M5 7a7 7 0 0114 0" />
        <path d="M8 11a4 4 0 018 0" />
        <circle cx="12" cy="16" r="1" fill="currentColor" />
        <path d="M12 17v3" />
        <path d="M8 22h8" />
      </svg>
    ),
    exfil: (
      <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <path d="M7 10l5-5 5 5" />
        <path d="M12 15V5" />
      </svg>
    ),
    ops: (
      <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    team: (
      <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  };
  return <>{icons[tabId]}</>;
}

const TABS: TabDef[] = [
  { id: 'recon', label: 'Recon', icon: <TabIcon tabId="recon" />, description: 'Target recon, OSINT, port scanning' },
  { id: 'exploit', label: 'Exploit', icon: <TabIcon tabId="exploit" />, description: 'Metasploit integration, payload generation' },
  { id: 'phish', label: 'Phish', icon: <TabIcon tabId="phish" />, description: 'Phishing campaigns via evilginx2' },
  { id: 'payload', label: 'Payload', icon: <TabIcon tabId="payload" />, description: 'Payload factory — generate, obfuscate, sign payloads' },
  { id: 'evade', label: 'Evade', icon: <TabIcon tabId="evade" />, description: 'AV/EDR evasion — AMSI bypass, ETW patch, injection' },
  { id: 'privesc', label: 'Privesc', icon: <TabIcon tabId="privesc" />, description: 'Privilege escalation — WinPEAS, PowerUp, exploit suggester' },
  { id: 'c2', label: 'C2', icon: <TabIcon tabId="c2" />, description: 'Command & control server' },
  { id: 'exfil', label: 'Exfil', icon: <TabIcon tabId="exfil" />, description: 'Data exfiltration' },
  { id: 'ops', label: 'Ops', icon: <TabIcon tabId="ops" />, description: 'Operation dashboard — timeline, notes, findings, todos' },
  { id: 'team', label: 'Team', icon: <TabIcon tabId="team" />, description: 'Team coordination — shared feed, findings, targets' },
];

function StatusBar({ phase, target, scanTasks, depsStatus, onInstallDeps }: {
  phase: string; target: string; scanTasks: ScanTaskState;
  depsStatus: any; onInstallDeps?: () => void;
}) {
  const [opName, setOpName] = React.useState<string | null>(null);
  const [opTargets, setOpTargets] = React.useState<number>(0);
  const [c2Running, setC2Running] = React.useState(false);
  const [c2Agents, setC2Agents] = React.useState(0);

  // Fetch operation info
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const op = await window.api.opGetCurrent();
        if (!cancelled && op) {
          setOpName(op.name);
          setOpTargets(op.targets?.length || 0);
        } else if (!cancelled) {
          setOpName(null);
          setOpTargets(0);
        }
      } catch { if (!cancelled) { setOpName(null); setOpTargets(0); } }
    })();
    return () => { cancelled = true; };
  }, []);

  // Fetch C2 status once on mount (live updates come from C2Panel when its tab is open)
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await window.api.c2Status();
        if (!cancelled) {
          setC2Running(status.running);
          setC2Agents(status.agents || 0);
        }
      } catch { if (!cancelled) { setC2Running(false); setC2Agents(0); } }
    })();
    return () => { cancelled = true; };
  }, []);

  // Scan progress: count running / non-idle tasks
  const taskValues = Object.values(scanTasks || {});
  const runningTasks = taskValues.filter((s) => s === 'running').length;
  const completedTasks = taskValues.filter((s) => s === 'complete' || s === 'error').length;
  const totalActive = taskValues.filter((s) => s !== 'idle').length;
  const scanActive = phase === 'scanning' || runningTasks > 0;

  return (
    <footer className="flex items-center justify-between px-4 py-1.5 bg-midnight-900/80 backdrop-blur-md border-t border-midnight-800/30 flex-shrink-0 text-[11px]">
      {/* Left: Phase + Operation context */}
      <div className="flex items-center gap-3 min-w-0">
        <span className={`flex-shrink-0 w-2 h-2 rounded-full transition-all duration-500 ${
          phase === 'idle' ? 'bg-gray-600' :
          phase === 'scanning' || scanActive ? 'bg-redhawk-500 animate-pulse' :
          phase === 'complete' ? 'bg-green-500' : 'bg-redhawk-500'
        }`} />
        <span className="text-gray-400 font-medium whitespace-nowrap">
          {scanActive ? 'Scanning…' : phase === 'complete' ? 'Complete' : phase === 'error' ? 'Error' : 'Ready'}
        </span>
        {opName && (
          <span className="text-gray-500 truncate hidden sm:block">
            <span className="text-gray-600">Op:</span> {opName}
            {opTargets > 0 && <span className="text-gray-600 ml-1">({opTargets} tgt)</span>}
          </span>
        )}
      </div>

      {/* Center: Scan progress bar */}
      {scanActive && totalActive > 0 && (
        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
          <div className="w-24 h-1.5 bg-midnight-800 rounded-full overflow-hidden hidden sm:block">
            <div className="h-full bg-redhawk-500 rounded-full transition-all duration-300"
              style={{ width: `${(completedTasks / totalActive) * 100}%` }} />
          </div>
          <span className="text-gray-500 whitespace-nowrap text-[10px]">{completedTasks}/{totalActive}</span>
        </div>
      )}

      {/* Right: Target + Service status */}
      <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
        {target && (
          <span className="text-gray-500 font-mono truncate max-w-[160px] hidden sm:block">{target}</span>
        )}

        {/* C2 status */}
        <span className="flex items-center gap-1" title={c2Running ? `C2 running (${c2Agents} agents)` : 'C2 stopped'}>
          <span className={`w-1.5 h-1.5 rounded-full ${c2Running ? 'bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]' : 'bg-gray-600'}`} />
          <span className="text-gray-600 hidden sm:inline">C2</span>
          {c2Running && c2Agents > 0 && <span className="text-gray-500 text-[10px]">{c2Agents}</span>}
        </span>

        {/* Dependency health */}
        {depsStatus && (
          <>
            <span className="text-[10px] text-gray-700 select-none">|</span>
            <button
              onClick={onInstallDeps}
              className="flex items-center gap-1 text-[10px] hover:text-gray-300 transition-colors"
              title={(() => {
                const missing = Object.entries(depsStatus)
                  .filter(([k, v]: any) => k !== 'all' && !v.installed)
                  .map(([k]) => k);
                return missing.length > 0
                  ? `Missing: ${missing.join(', ')}. Click to install.`
                  : 'All dependencies OK';
              })()}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${(depsStatus as any).all ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
              <span className="text-gray-600 hidden sm:inline">Deps</span>
              {!(depsStatus as any).all && (
                <span className="text-amber-400 font-medium">
                  {Object.entries(depsStatus).filter(([k, v]: any) => k !== 'all' && !v.installed).length}
                </span>
              )}
            </button>
          </>
        )}

        <span className="text-[10px] text-gray-700 select-none">|</span>
        <span className="text-[10px] text-gray-700">For authorized testing only</span>
      </div>
    </footer>
  );
}

export default function App() {
  const scan = useScan();
  const split = useSplitPanes();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tabOrder, setTabOrder] = useState<TabId[]>(() => {
    const ALL_TABS: TabId[] = ['recon', 'exploit', 'phish', 'payload', 'evade', 'privesc', 'c2', 'exfil', 'ops', 'team'];
    try {
      const saved = localStorage.getItem('redhawk_tab_order');
      if (saved) {
        const parsed: TabId[] = JSON.parse(saved);
        // Append any new tabs that aren't in the saved order
        for (const t of ALL_TABS) {
          if (!parsed.includes(t)) parsed.push(t);
        }
        return parsed;
      }
    } catch {}
    return ALL_TABS;
  });
  const [splitEnabled, setSplitEnabled] = useState(() => {
    try { return localStorage.getItem('redhawk_split_enabled') !== 'false'; }
    catch { return true; }
  });
  const [compactMode, setCompactMode] = useState(() => {
    try { return localStorage.getItem('redhawk_compact') === 'true'; }
    catch { return false; }
  });
  const [showStatusBar, setShowStatusBar] = useState(() => {
    try { return localStorage.getItem('redhawk_show_status') !== 'false'; }
    catch { return true; }
  });
  const [showTour, setShowTour] = useState(() => {
    try { return localStorage.getItem('redhawk_tour_completed') !== 'true'; }
    catch { return true; }
  });

  const handleTourComplete = useCallback(() => {
    setShowTour(false);
    try { localStorage.setItem('redhawk_tour_completed', 'true'); } catch {}
  }, []);

  const handleTourSkip = useCallback(() => {
    setShowTour(false);
    try { localStorage.setItem('redhawk_tour_completed', 'true'); } catch {}
  }, []);

  const handleActivateTab = useCallback((tabId: TabId) => {
    const existing = split.panes.find((p) => p.tabId === tabId);
    if (existing) {
      split.setActivePaneId(existing.id);
    } else {
      split.setPaneTab(split.activePaneId, tabId);
    }
  }, [split]);

  // When split is disabled, collapse to single pane
  const handleSplitToggle = useCallback((enabled: boolean) => {
    setSplitEnabled(enabled);
    if (!enabled) split.collapseToSingle();
  }, [split]);
  const handleCompactToggle = useCallback((enabled: boolean) => {
    setCompactMode(enabled);
  }, []);
  const handleStatusBarToggle = useCallback((enabled: boolean) => {
    setShowStatusBar(enabled);
  }, []);

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
      team: 'recon',
    };
    const phase = tabToPhase[split.activeTab];
    if (phase) {
      scan.setKillChainPhase(phase as any, 'active');
    }
  }, [split.activeTab]);

  useEffect(() => {
    scan.loadHistory();
  }, []);

  // Ctrl+Tab / Ctrl+Shift+Tab — cycle through tabs
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Tab') {
        e.preventDefault();
        const idx = tabOrder.indexOf(split.activeTab);
        if (idx === -1) return;
        const next = e.shiftKey
          ? (idx - 1 + tabOrder.length) % tabOrder.length
          : (idx + 1) % tabOrder.length;
        const nextTab = tabOrder[next];
        // If the tab is already open somewhere, activate that pane
        const existing = split.panes.find((p) => p.tabId === nextTab);
        if (existing) {
          split.setActivePaneId(existing.id);
        } else {
          split.setPaneTab(split.activePaneId, nextTab);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [tabOrder, split.activeTab, split.panes, split.activePaneId]);

  if (!scan.disclaimerAccepted) {
    return <Disclaimer onAccept={scan.acceptDisclaimer} />;
  }

  if (showTour) {
    return (
      <>
        <GuidedTour
          onComplete={handleTourComplete}
          onSkip={handleTourSkip}
          onActivateTab={handleActivateTab}
          activeTab={split.activeTab}
          isFirstLaunch={true}
        />
        {renderApp()}
      </>
    );
  }

  return renderApp();

  function renderApp() {
  return (
    <div className={`h-screen flex flex-col animate-fade-in bg-gradient-to-b from-midnight-950 via-midnight-950 to-midnight-900${compactMode ? ' compact' : ''}`}>
      {/* ── HEADER ── */}
      <header className="flex items-center justify-between px-6 py-3 bg-midnight-900/80 backdrop-blur-md border-b border-midnight-800/50 flex-shrink-0 relative z-40">
        <div className="flex items-center gap-4">
          <div data-tour="logo" className="relative">
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

          {/* Tab navigation — ordered via settings */}
          <nav className="hidden md:flex items-center gap-1 ml-6 pl-6 border-l border-midnight-800">
            {tabOrder.map((tabId) => {
              const tab = TABS.find(t => t.id === tabId);
              if (!tab) return null;
              const isActive = split.panes.some((p) => p.tabId === tab.id);
              return (
                  <div key={tab.id} className="flex items-center gap-0 group">
                  <button
                    data-tour={`tab-${tab.id}`}
                    onClick={() => {
                      const existing = split.panes.find((p) => p.tabId === tab.id);
                      if (existing) {
                        split.setActivePaneId(existing.id);
                      } else if (split.isSplit && splitEnabled) {
                        split.setPaneTab(split.activePaneId, tab.id);
                      } else if (splitEnabled) {
                        split.addPane(tab.id);
                      } else {
                        split.setPaneTab(split.activePaneId, tab.id);
                      }
                    }}
                    title={tab.description}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-redhawk-600/15 text-white border border-redhawk-600/20'
                        : 'text-gray-400 hover:text-white hover:bg-midnight-800/50'
                    }`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                  {/* Split button — only visible when split is enabled */}
                  {!isActive && splitEnabled && (
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
            <button data-tour="deps" onClick={scan.installDeps} className="btn-secondary text-xs py-1.5 px-3">
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
          <span data-tour="hamburger"><HamburgerMenu onToggleHistory={() => setSidebarOpen(p => !p)} onOpenSettings={() => setSettingsOpen(true)} sidebarOpen={sidebarOpen} /></span>
        </div>
      </header>

      {/* ── MOBILE TAB BAR ── */}
      <div className="md:hidden flex gap-0.5 px-2 pt-2 bg-midnight-950 flex-shrink-0">
        {tabOrder.map((tabId) => {
          const tab = TABS.find(t => t.id === tabId);
          if (!tab) return null;
          return (
            <button
              key={tab.id}
              onClick={() => {
                split.panes.length > 0
                  ? split.setPaneTab(split.panes[0].id, tab.id)
                  : split.addPane(tab.id);
              }}
              className={`flex-1 py-2 rounded-t-lg text-[10px] font-medium transition-all ${
                split.panes.some((p) => p.tabId === tab.id)
                  ? 'bg-midnight-900 text-white border-t border-l border-r border-midnight-800'
                  : 'text-gray-500 hover:text-gray-300 bg-midnight-950'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          );
        })}
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

      {/* ── SETTINGS MODAL ── */}
      {settingsOpen && (
        <SettingsPanel
          onClose={() => setSettingsOpen(false)}
          isSplit={split.isSplit}
          onToggleSplit={handleSplitToggle}
          onToggleCompact={handleCompactToggle}
          onToggleStatusBar={handleStatusBarToggle}
          onTabOrderChange={(order) => {
            setTabOrder(order);
            localStorage.setItem('redhawk_tab_order', JSON.stringify(order));
          }}
        />
      )}

      {/* ── STATUS BAR ── */}
      {showStatusBar && (
        <div data-tour="statusbar"><StatusBar
          phase={scan.phase}
          target={scan.target}
          scanTasks={scan.scanTasks}
          depsStatus={scan.depsStatus}
          onInstallDeps={scan.depsStatus && !scan.depsStatus.all ? scan.installDeps : undefined}
        /></div>
      )}
    </div>
  );
  }
}
