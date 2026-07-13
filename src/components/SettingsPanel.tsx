import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

// Load/save tab order from localStorage
function loadTabOrder(): TabId[] {
  try {
    const saved = localStorage.getItem('redhawk_tab_order');
    if (saved) return JSON.parse(saved);
  } catch {}
  return ['recon', 'exploit', 'phish', 'payload', 'evade', 'privesc', 'c2', 'exfil', 'ops'];
}

function saveTabOrder(tabs: TabId[]) {
  try {
    localStorage.setItem('redhawk_tab_order', JSON.stringify(tabs));
  } catch {}
}

// Load/save split mode from localStorage
function loadSplitEnabled(): boolean {
  try {
    const saved = localStorage.getItem('redhawk_split_enabled');
    return saved !== 'false';
  } catch { return true; }
}

function saveSplitEnabled(enabled: boolean) {
  try {
    localStorage.setItem('redhawk_split_enabled', JSON.stringify(enabled));
  } catch {}
}

const TAB_LABELS: Record<TabId, { label: string; icon: string }> = {
  recon: { label: 'Recon', icon: '🔍' },
  exploit: { label: 'Exploit', icon: '💀' },
  phish: { label: 'Phish', icon: '🎣' },
  payload: { label: 'Payload', icon: '📦' },
  evade: { label: 'Evade', icon: '🛡️' },
  privesc: { label: 'Privesc', icon: '⬆️' },
  c2: { label: 'C2', icon: '📡' },
  exfil: { label: 'Exfil', icon: '📤' },
  ops: { label: 'Ops', icon: '📋' },
};

interface SettingsPanelProps {
  onClose: () => void;
  isSplit: boolean;
  onToggleSplit: (enabled: boolean) => void;
  onTabOrderChange: (order: TabId[]) => void;
}

export function SettingsPanel({ onClose, isSplit, onToggleSplit, onTabOrderChange }: SettingsPanelProps) {
  const [section, setSection] = useState<'tabs' | 'split' | 'theme' | 'ops'>('tabs');
  const [tabOrder, setTabOrder] = useState<TabId[]>(loadTabOrder);
  const [currentTheme, setCurrentTheme] = useState(loadTheme());
  const [themeSearch, setThemeSearch] = useState('');
  const [splitEnabled, setSplitEnabled] = useState(loadSplitEnabled());

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const moveTab = useCallback((index: number, direction: -1 | 1) => {
    setTabOrder((prev) => {
      const arr = [...prev];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= arr.length) return prev;
      [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
      saveTabOrder(arr);
      return arr;
    });
  }, []);

  const handleSaveOrder = useCallback(() => {
    onTabOrderChange(tabOrder);
    onClose();
  }, [tabOrder, onTabOrderChange, onClose]);

  const handleToggleSplit = useCallback(() => {
    const next = !splitEnabled;
    setSplitEnabled(next);
    saveSplitEnabled(next);
    onToggleSplit(next);
  }, [splitEnabled, onToggleSplit]);

  const handleThemeSelect = useCallback((themeId: string) => {
    setCurrentTheme(themeId);
    saveTheme(themeId);
    applySettingsTheme(themeId);
  }, []);

  const filtered = useMemo(() => {
    if (!themeSearch.trim()) return THEMES;
    const q = themeSearch.toLowerCase();
    return THEMES.filter((t) => t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
  }, [themeSearch]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-midnight-800 border border-midnight-600/50 rounded-2xl shadow-2xl shadow-black/60
        w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden mx-4">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-midnight-700/50 flex-shrink-0">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar nav */}
          <nav className="w-36 flex-shrink-0 border-r border-midnight-700/50 p-2 space-y-1">
            {[
              { id: 'tabs' as const, label: 'Tab Order', icon: '🔀' },
              { id: 'split' as const, label: 'Split Pane', icon: '📐' },
              { id: 'theme' as const, label: 'Theme', icon: '🎨' },
              { id: 'ops' as const, label: 'Operations', icon: '📋' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                  section === s.id
                    ? 'bg-redhawk-600/15 text-redhawk-400 border border-redhawk-600/20'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-midnight-700/30'
                }`}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            {/* ── Tab Order ── */}
            {section === 'tabs' && (
              <div className="space-y-3">
                <p className="text-[11px] text-gray-500">Drag or use arrows to reorder tabs in the navigation bar.</p>
                <div className="space-y-1">
                  {tabOrder.map((tabId, idx) => {
                    const info = TAB_LABELS[tabId];
                    return (
                      <div key={tabId}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-midnight-900/60 border border-midnight-700/30">
                        <span className="text-xs text-gray-600 w-5 text-right">{idx + 1}</span>
                        <span className="text-sm">{info.icon}</span>
                        <span className="flex-1 text-xs text-gray-300">{info.label}</span>
                        <div className="flex gap-0.5">
                          <button onClick={() => moveTab(idx, -1)} disabled={idx === 0}
                            className="p-1 rounded text-gray-600 hover:text-white hover:bg-midnight-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button onClick={() => moveTab(idx, 1)} disabled={idx === tabOrder.length - 1}
                            className="p-1 rounded text-gray-600 hover:text-white hover:bg-midnight-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button onClick={handleSaveOrder}
                  className="btn-primary w-full text-xs mt-2">Apply Tab Order</button>
              </div>
            )}

            {/* ── Split Pane ── */}
            {section === 'split' && (
              <div className="space-y-4">
                <p className="text-[11px] text-gray-500">Control how multiple panes behave in the workspace.</p>
                <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-midnight-900/60 border border-midnight-700/30">
                  <div>
                    <p className="text-xs text-gray-300 font-medium">Split Panes</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">Allow opening tabs in side-by-side panes</p>
                  </div>
                  <button
                    onClick={handleToggleSplit}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      splitEnabled ? 'bg-redhawk-600' : 'bg-midnight-700'
                    }`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      splitEnabled ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
                <div className="px-4 py-3 rounded-lg bg-midnight-900/60 border border-midnight-700/30">
                  <p className="text-xs text-gray-300 font-medium mb-1">Current Layout</p>
                  <p className="text-[10px] text-gray-500">
                    {isSplit ? `${splitEnabled ? 'Split mode active' : 'Split mode disabled — collapsing panes...'}` : 'Single pane view'}
                  </p>
                </div>
              </div>
            )}

            {/* ── Theme ── */}
            {section === 'theme' && (
              <div className="space-y-2">
                <div className="relative mb-2">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input type="text" value={themeSearch} onChange={(e) => setThemeSearch(e.target.value)}
                    placeholder="Search themes..."
                    className="w-full pl-8 pr-3 py-2 text-xs bg-midnight-900 border border-midnight-600/50 rounded-lg
                      text-gray-200 placeholder-gray-500 focus:outline-none focus:border-redhawk-500/50" />
                </div>
                <div className="space-y-1 max-h-80 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <p className="text-center text-xs text-gray-500 py-6">No themes found</p>
                  ) : (
                    filtered.map((theme) => (
                      <button key={theme.id} onClick={() => handleThemeSelect(theme.id)}
                        className={`w-full px-3 py-2.5 flex items-center gap-3 rounded-lg text-xs transition-all ${
                          currentTheme === theme.id
                            ? 'bg-redhawk-600/10 text-redhawk-400 border border-redhawk-600/20'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-midnight-700/30 border border-transparent'
                        }`}>
                        <span className="text-base">{theme.icon}</span>
                        <div className="flex-1 text-left">
                          <p className="font-medium">{theme.name}</p>
                          <div className="flex gap-1 mt-1">
                            {[theme.colors.accent, theme.colors.bgCard, theme.colors.textPrimary].map((color, i) => (
                              <span key={i} className="w-3 h-3 rounded-full border border-midnight-600/50"
                                style={{ backgroundColor: color }} />
                            ))}
                          </div>
                        </div>
                        {currentTheme === theme.id && (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ── Operations ── */}
            {section === 'ops' && (
              <OpsSettings />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Operations sub-component ── */
function OpsSettings() {
  const [ops, setOps] = useState<any[]>([]);
  const [currentOp, setCurrentOp] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  useEffect(() => {
    loadOps();
  }, []);

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
      setName('');
      setDesc('');
      setCreating(false);
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-gray-500">Manage reconnaissance operations.</p>
        <button onClick={() => setCreating(!creating)} className="btn-secondary text-[10px] py-1.5 px-2.5">
          {creating ? 'Cancel' : '+ New'}
        </button>
      </div>

      {creating && (
        <div className="p-3 rounded-lg bg-midnight-900/60 border border-midnight-700/30 space-y-2">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Operation name" className="input-field h-8 text-xs" />
          <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)}
            placeholder="Description (optional)" className="input-field h-8 text-xs" />
          <button onClick={handleCreate} disabled={!name.trim()}
            className="btn-primary w-full text-xs py-1.5">Create Operation</button>
        </div>
      )}

      <div className="space-y-1 max-h-60 overflow-y-auto">
        {ops.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-4">No operations yet</p>
        ) : (
          ops.map((op: any) => (
            <div key={op.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-all cursor-pointer ${
                currentOp?.id === op.id
                  ? 'bg-redhawk-600/10 border-redhawk-600/20 text-redhawk-400'
                  : 'bg-midnight-900/40 border-midnight-700/30 text-gray-400 hover:bg-midnight-700/30'
              }`}
              onClick={() => handleSwitch(op.id)}
            >
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                op.status === 'active' ? 'bg-green-500' : 'bg-gray-600'
              }`} />
              <span className="flex-1 truncate">{op.name}</span>
              <span className="text-[10px] text-gray-600">{op.targets?.length || 0} targets</span>
              {currentOp?.id === op.id && (
                <span className="text-[9px] text-redhawk-400/60">active</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
