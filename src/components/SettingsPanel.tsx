import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { TabId } from '../hooks/useSplitPanes';
import { THEMES, loadTheme, saveTheme } from '../theme/themes';

function applySettingsTheme(themeId: string) {
  const theme = THEMES.find((t) => t.id === themeId);
  if (!theme) return;
  const root = document.documentElement;
  root.setAttribute('data-theme', themeId);
  const c = theme.colors;
  root.style.setProperty('--theme-bg-primary', c.bgPrimary);
  root.style.setProperty('--theme-bg-secondary', c.bgSecondary);
  root.style.setProperty('--theme-bg-card', c.bgCard);
  root.style.setProperty('--theme-bg-input', c.bgInput);
  root.style.setProperty('--theme-border', c.border);
  root.style.setProperty('--theme-text-primary', c.textPrimary);
  root.style.setProperty('--theme-text-secondary', c.textSecondary);
  root.style.setProperty('--theme-text-muted', c.textMuted);
  root.style.setProperty('--theme-accent', c.accent);
  root.style.setProperty('--theme-accent-glow', c.accentGlow);
  root.style.setProperty('--theme-success', c.success);
  root.style.setProperty('--theme-warning', c.warning);
  root.style.setProperty('--theme-error', c.error);
  root.style.setProperty('--theme-gradient-from', c.gradientFrom);
  root.style.setProperty('--theme-gradient-to', c.gradientTo);
}

function TabSettingsIcon({ tabId }: { tabId: TabId }) {
  const cls = 'w-4 h-4';
  const icons: Record<TabId, React.ReactNode> = {
    recon: <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /><path d="M11 8v6" /><path d="M8 11h6" /></svg>,
    exploit: <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 2a10 10 0 1010 10 10 10 0 00-10-10z" /><path d="M7.5 15.5a5 5 0 019 0" /><circle cx="9" cy="9" r=".5" fill="currentColor" /><circle cx="15" cy="9" r=".5" fill="currentColor" /></svg>,
    phish: <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M4 6a16 16 0 0116 0" /><path d="M4 12a12 12 0 0116 0" /><path d="M8 18a8 8 0 018 0" /><path d="M12 2v4" /><path d="M12 14v8" /><path d="M9 19l3 3 3-3" /></svg>,
    payload: <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /><path d="M12 13l3-3" /><path d="M12 13l-3-3" /></svg>,
    evade: <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 2l9 5v6c0 5.5-4.5 9.5-9 11-4.5-1.5-9-5.5-9-11V7z" /><path d="M9 12l2 2 4-4" /></svg>,
    privesc: <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 20V8" /><path d="M5 15l7-7 7 7" /><path d="M4 4h16" /></svg>,
    c2: <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 7a7 7 0 0114 0" /><path d="M8 11a4 4 0 018 0" /><circle cx="12" cy="16" r="1" fill="currentColor" /><path d="M12 17v3" /><path d="M8 22h8" /></svg>,
    exfil: <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><path d="M7 10l5-5 5 5" /><path d="M12 15V5" /></svg>,
    ops: <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
    team: <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>,
  };
  return <>{icons[tabId]}</>;
}

const TAB_INFO: Record<TabId, { label: string; icon: React.ReactNode; desc: string }> = {
  recon: { label: 'Recon', icon: <TabSettingsIcon tabId="recon" />, desc: 'Target recon, OSINT, port scanning' },
  exploit: { label: 'Exploit', icon: <TabSettingsIcon tabId="exploit" />, desc: 'Metasploit integration' },
  phish: { label: 'Phish', icon: <TabSettingsIcon tabId="phish" />, desc: 'Phishing campaigns via evilginx2' },
  payload: { label: 'Payload', icon: <TabSettingsIcon tabId="payload" />, desc: 'Payload factory — generate, obfuscate' },
  evade: { label: 'Evade', icon: <TabSettingsIcon tabId="evade" />, desc: 'AV/EDR evasion' },
  privesc: { label: 'Privesc', icon: <TabSettingsIcon tabId="privesc" />, desc: 'Privilege escalation' },
  c2: { label: 'C2', icon: <TabSettingsIcon tabId="c2" />, desc: 'Command & control server' },
  exfil: { label: 'Exfil', icon: <TabSettingsIcon tabId="exfil" />, desc: 'Data exfiltration' },
  ops: { label: 'Ops', icon: <TabSettingsIcon tabId="ops" />, desc: 'Operation dashboard' },
  team: { label: 'Team', icon: <TabSettingsIcon tabId="team" />, desc: 'Team coordination' },
};

interface SettingsPanelProps {
  onClose: () => void;
  isSplit: boolean;
  onToggleSplit: (enabled: boolean) => void;
  onToggleCompact: (enabled: boolean) => void;
  onToggleStatusBar: (enabled: boolean) => void;
  onTabOrderChange: (order: TabId[]) => void;
}

type SettingsPage = 'general' | 'tabs' | 'appearance' | 'operations';

// ── Load/save helpers ──

function loadPref(key: string, defaultValue: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? v === 'true' : defaultValue;
  } catch { return defaultValue; }
}
function savePref(key: string, value: boolean) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function loadTabOrder(): TabId[] {
  const ALL_TABS: TabId[] = ['recon', 'exploit', 'phish', 'payload', 'evade', 'privesc', 'c2', 'exfil', 'ops', 'team'];
  try {
    const saved = localStorage.getItem('redhawk_tab_order');
    if (saved) {
      const parsed: TabId[] = JSON.parse(saved);
      for (const t of ALL_TABS) {
        if (!parsed.includes(t)) parsed.push(t);
      }
      return parsed;
    }
  } catch {}
  return ALL_TABS;
}
function saveTabOrder(tabs: TabId[]) {
  try { localStorage.setItem('redhawk_tab_order', JSON.stringify(tabs)); } catch {}
}

function SvgIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
      {children}
    </svg>
  );
}

const SIDEBAR_ITEMS: { id: SettingsPage; icon: React.ReactNode; label: string }[] = [
  { id: 'general', icon: <SvgIcon><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></SvgIcon>, label: 'General' },
  { id: 'tabs', icon: <SvgIcon><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></SvgIcon>, label: 'Tab Order' },
  { id: 'appearance', icon: <SvgIcon><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></SvgIcon>, label: 'Appearance' },
  { id: 'operations', icon: <SvgIcon><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><path d="M9 12h6M9 16h6" /></SvgIcon>, label: 'Operations' },
];

export function SettingsPanel({ onClose, isSplit, onToggleSplit, onToggleCompact, onToggleStatusBar, onTabOrderChange }: SettingsPanelProps) {
  const [page, setPage] = useState<SettingsPage>('general');

  // Preferences
  const [splitEnabled, setSplitEnabled] = useState(() => loadPref('redhawk_split_enabled', true));
  const [autoSave, setAutoSave] = useState(() => loadPref('redhawk_auto_save', true));
  const [showStatusBar, setShowStatusBar] = useState(() => loadPref('redhawk_show_status', true));
  const [compactMode, setCompactMode] = useState(() => loadPref('redhawk_compact', false));

  const handleTabOrderChangeInner = useCallback((order: TabId[]) => {
    saveTabOrder(order);
    onTabOrderChange(order);
  }, [onTabOrderChange]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-midnight-950">
      {/* ── Top bar ── */}
      <header className="flex items-center justify-between px-6 py-3 bg-midnight-900/80 backdrop-blur-md border-b border-midnight-800/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1.5 rounded-lg hover:bg-midnight-800/50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Back</span>
          </button>
          <div className="w-px h-5 bg-midnight-700/50" />
          <h1 className="text-sm font-semibold text-white">Settings</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-600">RedHawk v0.1.1</span>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-52 flex-shrink-0 border-r border-midnight-800/50 bg-midnight-950/50 p-3 overflow-y-auto">
          <nav className="space-y-0.5">
            {SIDEBAR_ITEMS.map((item) => (
              <button key={item.id} onClick={() => setPage(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs transition-all ${
                  page === item.id
                    ? 'bg-redhawk-600/15 text-white border border-redhawk-600/20'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-midnight-800/40 border border-transparent'
                }`}>
                <span className="text-sm">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto min-h-0">
          <div className="max-w-2xl mx-auto p-8">
            {page === 'general' && (
              <GeneralSettings
                splitEnabled={splitEnabled}
                autoSave={autoSave}
                showStatusBar={showStatusBar}
                compactMode={compactMode}
                onSetSplitEnabled={(v) => { setSplitEnabled(v); savePref('redhawk_split_enabled', v); onToggleSplit(v); }}
                onSetAutoSave={(v) => { setAutoSave(v); savePref('redhawk_auto_save', v); }}
                onSetShowStatusBar={(v) => { setShowStatusBar(v); savePref('redhawk_show_status', v); onToggleStatusBar(v); }}
                onSetCompactMode={(v) => { setCompactMode(v); savePref('redhawk_compact', v); onToggleCompact(v); }}
              />
            )}
            {page === 'tabs' && (
              <TabOrderSettings
                onTabOrderChange={handleTabOrderChangeInner}
              />
            )}
            {page === 'appearance' && <AppearanceSettings />}
            {page === 'operations' && <OperationsSettings />}
          </div>
        </main>
      </div>
    </div>
  );
}

// ── Toggle row component ──
function ToggleRow({ label, desc, enabled, onToggle }: { label: string; desc: string; enabled: boolean; onToggle: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-midnight-900/60 border border-midnight-800/30">
      <div className="flex-1 min-w-0 pr-4">
        <p className="text-sm text-gray-200 font-medium">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
      </div>
      <button onClick={() => onToggle(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
          enabled ? 'bg-redhawk-600' : 'bg-midnight-700'
        }`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`} />
      </button>
    </div>
  );
}

// ── General ──
function GeneralSettings({ splitEnabled, autoSave, showStatusBar, compactMode,
  onSetSplitEnabled, onSetAutoSave, onSetShowStatusBar, onSetCompactMode }: {
  splitEnabled: boolean; autoSave: boolean;
  showStatusBar: boolean; compactMode: boolean;
  onSetSplitEnabled: (v: boolean) => void;
  onSetAutoSave: (v: boolean) => void;
  onSetShowStatusBar: (v: boolean) => void;
  onSetCompactMode: (v: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white mb-1">General</h2>
        <p className="text-xs text-gray-500">Configure app-wide behavior and preferences.</p>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold px-1">Workspace</p>
        <ToggleRow label="Split Panes" desc="Allow opening tabs in side-by-side panes"
          enabled={splitEnabled} onToggle={(v) => onSetSplitEnabled(v)} />
        <ToggleRow label="Compact Mode" desc="Tighter spacing for more content per view"
          enabled={compactMode} onToggle={(v) => onSetCompactMode(v)} />
      </div>

      <div className="space-y-2">
        <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold px-1">Data</p>
        <ToggleRow label="Auto-Save Results" desc="Automatically save scan results to history"
          enabled={autoSave} onToggle={(v) => onSetAutoSave(v)} />
        <ToggleRow label="Status Bar" desc="Show the status bar at the bottom of the window"
          enabled={showStatusBar} onToggle={(v) => onSetShowStatusBar(v)} />
      </div>
    </div>
  );
}

// ── Tab Order (Drag & Drop) ──
function TabOrderSettings({ onTabOrderChange }: { onTabOrderChange: (order: TabId[]) => void }) {
  const [tabs, setTabs] = useState<TabId[]>(loadTabOrder);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleDragStart = useCallback((index: number) => {
    dragItem.current = index;
  }, []);

  const handleDragOver = useCallback((index: number) => {
    dragOverItem.current = index;
  }, []);

  const handleDrop = useCallback(() => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) return;
    setTabs((prev) => {
      const arr = [...prev];
      const [dragged] = arr.splice(dragItem.current!, 1);
      arr.splice(dragOverItem.current!, 0, dragged);
      return arr;
    });
    dragItem.current = null;
    dragOverItem.current = null;
  }, []);

  const moveTab = useCallback((index: number, dir: -1 | 1) => {
    setTabs((prev) => {
      const arr = [...prev];
      const to = index + dir;
      if (to < 0 || to >= arr.length) return prev;
      [arr[index], arr[to]] = [arr[to], arr[index]];
      return arr;
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white mb-1">Tab Order</h2>
          <p className="text-xs text-gray-500">Drag and drop tabs to reorder them in the navigation bar.</p>
        </div>
        <button onClick={() => { onTabOrderChange(tabs); }}
          className="btn-primary text-xs py-1.5 px-4">Apply</button>
      </div>

      <div className="space-y-1.5" onDragOver={(e) => e.preventDefault()}>
        {tabs.map((tabId, idx) => {
          const info = TAB_INFO[tabId];
          const isDragging = dragItem.current === idx;
          const isOver = dragOverItem.current === idx && dragItem.current !== idx;
          return (
            <div key={tabId}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={() => handleDragOver(idx)}
              onDragEnd={handleDrop}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing select-none ${
                isDragging
                  ? 'opacity-50 border-redhawk-600/40 bg-redhawk-600/10'
                  : isOver
                    ? 'border-redhawk-600/30 bg-midnight-800/60'
                    : 'border-midnight-800/30 bg-midnight-900/60 hover:border-midnight-700/50'
              }`}>
              {/* Drag handle */}
              <div className="flex flex-col gap-0.5 text-gray-600">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><circle cx="8" cy="6" r="1.5"/><circle cx="16" cy="6" r="1.5"/><circle cx="8" cy="12" r="1.5"/><circle cx="16" cy="12" r="1.5"/><circle cx="8" cy="18" r="1.5"/><circle cx="16" cy="18" r="1.5"/></svg>
              </div>

              <span className="text-xs text-gray-600 w-5 text-right font-mono">{idx + 1}</span>
              <span className="flex items-center text-gray-400">{info.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 font-medium">{info.label}</p>
                <p className="text-[10px] text-gray-500 truncate">{info.desc}</p>
              </div>

              <div className="flex gap-0.5">
                <button onClick={() => moveTab(idx, -1)} disabled={idx === 0}
                  className="p-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-midnight-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button onClick={() => moveTab(idx, 1)} disabled={idx === tabs.length - 1}
                  className="p-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-midnight-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Appearance ──
function AppearanceSettings() {
  const [current, setCurrent] = useState(loadTheme());
  const [search, setSearch] = useState('');

  const handleSelect = useCallback((themeId: string) => {
    setCurrent(themeId);
    saveTheme(themeId);
    applySettingsTheme(themeId);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return THEMES;
    const q = search.toLowerCase();
    return THEMES.filter((t) => t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
  }, [search]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white mb-1">Appearance</h2>
        <p className="text-xs text-gray-500">Customize the look and feel of RedHawk.</p>
      </div>

      <div className="relative mb-2">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search themes..."
          className="w-full pl-9 pr-4 py-2.5 text-sm bg-midnight-900 border border-midnight-700/50 rounded-xl
            text-gray-200 placeholder-gray-500 focus:outline-none focus:border-redhawk-500/50" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8 col-span-2">No themes matching "{search}"</p>
        ) : (
          filtered.map((theme) => (
            <button key={theme.id} onClick={() => handleSelect(theme.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all border ${
                current === theme.id
                  ? 'bg-redhawk-600/10 text-white border-redhawk-600/30'
                  : 'bg-midnight-900/60 text-gray-400 border-midnight-800/30 hover:border-midnight-700/50'
              }`}>
              <span className="text-xl">{theme.icon}</span>
              <div className="flex-1 text-left min-w-0">
                <p className="font-medium text-sm">{theme.name}</p>
                <div className="flex gap-1 mt-1">
                  {[theme.colors.accent, theme.colors.bgCard, theme.colors.textPrimary].map((color, i) => (
                    <span key={i} className="w-3.5 h-3.5 rounded-full border border-midnight-600/50"
                      style={{ backgroundColor: color }} />
                  ))}
                </div>
              </div>
              {current === theme.id && (
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ── Operations ──
function OperationsSettings() {
  const [ops, setOps] = useState<any[]>([]);
  const [currentOp, setCurrentOp] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  useEffect(() => { loadOps(); }, []);

  async function loadOps() {
    try {
      const list = await window.api.opList();
      setOps(list || []);
      const cur = await window.api.opGetCurrent();
      setCurrentOp(cur);
    } catch {}
  }

  async function handleCreate() {
    if (!name.trim()) return;
    try {
      await window.api.opCreate(name.trim(), desc.trim());
      setName(''); setDesc(''); setCreating(false);
      await loadOps();
    } catch {}
  }

  async function handleSwitch(id: string) {
    try {
      await window.api.opSetCurrent(id);
      await loadOps();
    } catch {}
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white mb-1">Operations</h2>
          <p className="text-xs text-gray-500">Manage reconnaissance operations and their targets.</p>
        </div>
        <button onClick={() => setCreating(!creating)}
          className="btn-secondary text-xs py-1.5 px-3">
          {creating ? 'Cancel' : '+ New Operation'}
        </button>
      </div>

      {creating && (
        <div className="p-4 rounded-xl bg-midnight-900/60 border border-midnight-800/30 space-y-3">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Operation name" className="input-field h-9 text-sm" />
          <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)}
            placeholder="Description (optional)" className="input-field h-9 text-sm" />
          <button onClick={handleCreate} disabled={!name.trim()}
            className="btn-primary w-full text-sm py-2">Create Operation</button>
        </div>
      )}

      <div className="space-y-1.5">
        {ops.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-8">No operations yet. Create one to get started.</p>
        ) : (
          ops.map((op: any) => (
            <div key={op.id} onClick={() => handleSwitch(op.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm border cursor-pointer transition-all ${
                currentOp?.id === op.id
                  ? 'bg-redhawk-600/10 border-redhawk-600/30 text-white'
                  : 'bg-midnight-900/60 border-midnight-800/30 text-gray-400 hover:border-midnight-700/50'
              }`}>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                op.status === 'active' ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]' : 'bg-gray-600'
              }`} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{op.name}</p>
                <p className="text-xs text-gray-500 truncate">{op.description || 'No description'}</p>
              </div>
              <span className="text-xs text-gray-600">{op.targets?.length || 0} targets</span>
              {currentOp?.id === op.id && (
                <span className="text-[10px] text-redhawk-400/60 font-medium">Active</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
