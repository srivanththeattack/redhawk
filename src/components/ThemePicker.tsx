import React, { useState, useCallback, useEffect } from 'react';
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

  const handleToggle = useCallback(() => setOpen((p) => !p), []);

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
        <div className="absolute right-0 top-full mt-2 w-56 z-50
          bg-midnight-800 border border-midnight-600/50 rounded-xl
          shadow-2xl shadow-black/50 backdrop-blur-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-midnight-700/50">
            <span className="text-sm font-medium text-white">Themes</span>
          </div>

          <div className="py-1">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleSelect(theme.id)}
                className={`w-full px-4 py-2.5 flex items-center gap-3 text-xs transition-all ${
                  current === theme.id
                    ? 'bg-redhawk-600/10 text-redhawk-400'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-midnight-700/30'
                }`}
              >
                <span className="text-base">{theme.icon}</span>
                <div className="flex-1 text-left">
                  <p className="font-medium">{theme.name}</p>
                  <div className="flex gap-1 mt-1">
                    {[theme.colors.accent, theme.colors.bgCard, theme.colors.textPrimary].map((color, i) => (
                      <span
                        key={i}
                        className="w-3 h-3 rounded-full border border-midnight-600/50"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                {current === theme.id && (
                  <svg className="w-4 h-4 text-redhawk-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
