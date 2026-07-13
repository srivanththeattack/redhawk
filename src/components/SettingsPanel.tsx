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

const TAB_INFO: Record<TabId, { label: string; icon: string; desc: string }> = {
  recon: { label: 'Recon', icon: '🔍', desc: 'Target recon, OSINT, port scanning' },
  exploit: { label: 'Exploit', icon: '💀', desc: 'Metasploit integration' },
  phish: { label: 'Phish', icon: '🎣', desc: 'Phishing campaigns via evilginx2' },
  payload: { label: 'Payload', icon: '📦', desc: 'Payload factory — generate, obfuscate' },
  evade: { label: 'Evade', icon: '🛡️', desc: 'AV/EDR evasion' },
  privesc: { label: 'Privesc', icon: '⬆️', desc: 'Privilege escalation' },
  c2: { label: 'C2', icon: '📡', desc: 'Command & control server' },
  exfil: { label: 'Exfil', icon: '📤', desc: 'Data exfiltration' },
  ops: { label: 'Ops', icon: '📋', desc: 'Operation dashboard' },
};

interface SettingsPanelProps {
  onClose: () => void;
  isSplit: boolean;
  onToggleSplit: (enabled: boolean) => void;
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
  try {
    const saved = localStorage.getItem('redhawk_tab_order');
    if (saved) return JSON.parse(saved);
  } catch {}
  return ['recon', 'exploit', 'phish', 'payload', 'evade', 'privesc', 'c2', 'exfil', 'ops'];
}
function saveTabOrder(tabs: TabId[]) {
  try { localStorage.setItem('redhawk_tab_order', JSON.stringify(tabs)); } catch {}
}

const SIDEBAR_ITEMS: { id: SettingsPage; icon: string; label: string }[] = [
  { id: 'general', icon: '⚙️', label: 'General' },
  { id: 'tabs', icon: '🔀', label: 'Tab Order' },
  { id: 'appearance', icon: '🎨', label: 'Appearance' },
  { id: 'operations', icon: '📋', label: 'Operations' },
];

export function SettingsPanel({ onClose, isSplit, onToggleSplit, onTabOrderChange }: SettingsPanelProps) {
  const [page, setPage] = useState<SettingsPage>('general');

  // Preferences
  const [splitEnabled, setSplitEnabled] = useState(() => loadPref('redhawk_split_enabled', true));
  const [liveOutput, setLiveOutput] = useState(() => loadPref('redhawk_live_output', true));
  const [autoSave, setAutoSave] = useState(() => loadPref('redhawk_auto_save', true));
  const [showStatusBar, setShowStatusBar] = useState(() => loadPref('redhawk_show_status', true));
  const [compactMode, setCompactMode] = useState(() => loadPref('redhawk_compact', false));

  const handleToggle = useCallback((key: string, setter: (v: boolean) => void, value: boolean) => {
    setter(value);
    savePref(key, value);
    if (key === 'redhawk_split_enabled') onToggleSplit(value);
  }, [onToggleSplit]);

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
                    ? 'bg-redhawk-600/15 text-redhawk-400 border border-redhawk-600/20'
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
                liveOutput={liveOutput}
                autoSave={autoSave}
                showStatusBar={showStatusBar}
                compactMode={compactMode}
                onToggle={(key, setter, val) => handleToggle(key, setter, val)}
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
function GeneralSettings({ splitEnabled, liveOutput, autoSave, showStatusBar, compactMode, onToggle }: {
  splitEnabled: boolean; liveOutput: boolean; autoSave: boolean;
  showStatusBar: boolean; compactMode: boolean;
  onToggle: (key: string, setter: (v: boolean) => void, value: boolean) => void;
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
          enabled={splitEnabled} onToggle={(v) => onToggle('redhawk_split_enabled', () => {}, v)} />
        <ToggleRow label="Live Output" desc="Stream real-time scan output to the terminal view"
          enabled={liveOutput} onToggle={(v) => onToggle('redhawk_live_output', () => {}, v)} />
        <ToggleRow label="Compact Mode" desc="Tighter spacing for more content per view"
          enabled={compactMode} onToggle={(v) => onToggle('redhawk_compact', () => {}, v)} />
      </div>

      <div className="space-y-2">
        <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold px-1">Data</p>
        <ToggleRow label="Auto-Save Results" desc="Automatically save scan results to history"
          enabled={autoSave} onToggle={(v) => onToggle('redhawk_auto_save', () => {}, v)} />
        <ToggleRow label="Status Bar" desc="Show the status bar at the bottom of the window"
          enabled={showStatusBar} onToggle={(v) => onToggle('redhawk_show_status', () => {}, v)} />
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
              <span className="text-base">{info.icon}</span>
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
                  ? 'bg-redhawk-600/10 text-redhawk-400 border-redhawk-600/30'
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
                  ? 'bg-redhawk-600/10 border-redhawk-600/30 text-redhawk-400'
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
