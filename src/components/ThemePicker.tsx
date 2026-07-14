import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { THEMES, loadTheme, saveTheme } from '../theme/themes';

function applyTheme(themeId: string) {
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

// Initialize theme on load
const initialTheme = loadTheme();
applyTheme(initialTheme);

export function ThemePicker() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(initialTheme);
  const [search, setSearch] = useState('');

  const handleToggle = useCallback(() => {
    setOpen((p) => !p);
    setSearch('');
  }, []);

  const handleSelect = useCallback((themeId: string) => {
    setCurrent(themeId);
    saveTheme(themeId);
    applyTheme(themeId);
    setOpen(false);
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-theme-picker]')) setOpen(false);
    };
    setTimeout(() => document.addEventListener('click', handler), 0);
    return () => document.removeEventListener('click', handler);
  }, [open]);

  const currentTheme = THEMES.find((t) => t.id === current);

  const filtered = useMemo(() => {
    if (!search.trim()) return THEMES;
    const q = search.toLowerCase();
    return THEMES.filter((t) => t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
  }, [search]);

  return (
    <div data-theme-picker className="relative">
      <button
        onClick={handleToggle}
        title="Change theme"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs
          text-gray-400 hover:text-white hover:bg-midnight-700/50
          transition-all duration-150"
      >
        <span>{currentTheme?.icon || '🌙'}</span>
        <span className="hidden sm:inline">{currentTheme?.name || 'Theme'}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 z-50
          bg-midnight-800 border border-midnight-600/50 rounded-xl
          shadow-2xl shadow-black/50 backdrop-blur-sm flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-midnight-700/50 flex-shrink-0">
            <span className="text-sm font-medium text-white">Themes ({filtered.length})</span>
          </div>

          {/* Search */}
          <div className="px-3 py-2 border-b border-midnight-700/50 flex-shrink-0">
            <div className="relative">
              <svg className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search themes..."
                className="w-full pl-7 pr-2 py-1.5 text-xs bg-midnight-900 border border-midnight-600/50 rounded-lg
                  text-gray-200 placeholder-gray-500 focus:outline-none focus:border-redhawk-500/50"
              />
            </div>
          </div>

          <div className="overflow-y-auto max-h-72 py-1">
            {filtered.length === 0 ? (
              <p className="text-center text-xs text-gray-500 py-6">No themes matching "{search}"</p>
            ) : (
              filtered.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => handleSelect(theme.id)}
                  className={`w-full px-4 py-2.5 flex items-center gap-3 text-xs transition-all ${
                    current === theme.id
                      ? 'bg-redhawk-600/10 text-white'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-midnight-700/30'
                  }`}
                >
                  <span className="text-base">{theme.icon}</span>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium truncate">{theme.name}</p>
                    <div className="flex gap-1 mt-1">
                      {[theme.colors.accent, theme.colors.bgCard, theme.colors.textPrimary].map((color, i) => (
                        <span
                          key={i}
                          className="w-3 h-3 rounded-full border border-midnight-600/50 flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  {current === theme.id && (
                    <svg className="w-4 h-4 text-redhawk-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
