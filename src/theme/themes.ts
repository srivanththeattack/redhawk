export interface ThemeDef {
  id: string;
  name: string;
  icon: string;
  colors: {
    bgPrimary: string;
    bgSecondary: string;
    bgCard: string;
    bgInput: string;
    border: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    accent: string;
    accentGlow: string;
    success: string;
    warning: string;
    error: string;
    gradientFrom: string;
    gradientTo: string;
  };
}

export const THEMES: ThemeDef[] = [
  {
    id: 'dark',
    name: 'Dark',
    icon: '🌙',
    colors: {
      bgPrimary: '#070b17',
      bgSecondary: '#0f1525',
      bgCard: '#0f1525',
      bgInput: '#0d1220',
      border: '#1a2440',
      textPrimary: '#e0e8f0',
      textSecondary: '#c8d0e0',
      textMuted: '#4a5568',
      accent: '#ff4455',
      accentGlow: 'rgba(255,68,85,0.2)',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      gradientFrom: '#1a1040',
      gradientTo: '#0d1b2a',
    },
  },
  {
    id: 'light',
    name: 'Light',
    icon: '☀️',
    colors: {
      bgPrimary: '#f5f5f0',
      bgSecondary: '#ffffff',
      bgCard: '#ffffff',
      bgInput: '#f0f0eb',
      border: '#d4d4c8',
      textPrimary: '#1a1a1a',
      textSecondary: '#333333',
      textMuted: '#888888',
      accent: '#d43a4a',
      accentGlow: 'rgba(212,58,74,0.12)',
      success: '#16a34a',
      warning: '#d97706',
      error: '#dc2626',
      gradientFrom: '#f0e6d6',
      gradientTo: '#e0d8c8',
    },
  },
  {
    id: 'dracula',
    name: 'Dracula',
    icon: '🧛',
    colors: {
      bgPrimary: '#1e1f29',
      bgSecondary: '#282a36',
      bgCard: '#282a36',
      bgInput: '#1e1f29',
      border: '#44475a',
      textPrimary: '#f8f8f2',
      textSecondary: '#e0e0e0',
      textMuted: '#6272a4',
      accent: '#ff5555',
      accentGlow: 'rgba(255,85,85,0.2)',
      success: '#50fa7b',
      warning: '#f1fa8c',
      error: '#ff5555',
      gradientFrom: '#282a36',
      gradientTo: '#1e1f29',
    },
  },
  {
    id: 'nord',
    name: 'Nord',
    icon: '❄️',
    colors: {
      bgPrimary: '#2e3440',
      bgSecondary: '#3b4252',
      bgCard: '#3b4252',
      bgInput: '#2e3440',
      border: '#4c566a',
      textPrimary: '#eceff4',
      textSecondary: '#d8dee9',
      textMuted: '#616e88',
      accent: '#bf616a',
      accentGlow: 'rgba(191,97,106,0.2)',
      success: '#a3be8c',
      warning: '#ebcb8b',
      error: '#bf616a',
      gradientFrom: '#3b4252',
      gradientTo: '#2e3440',
    },
  },
  {
    id: 'monokai',
    name: 'Monokai',
    icon: '🎨',
    colors: {
      bgPrimary: '#171717',
      bgSecondary: '#1e1e1e',
      bgCard: '#1e1e1e',
      bgInput: '#171717',
      border: '#333333',
      textPrimary: '#e0e0e0',
      textSecondary: '#c0c0c0',
      textMuted: '#666666',
      accent: '#f92672',
      accentGlow: 'rgba(249,38,114,0.2)',
      success: '#a6e22e',
      warning: '#e6db74',
      error: '#f92672',
      gradientFrom: '#1e1e1e',
      gradientTo: '#171717',
    },
  },
];

// Load theme from localStorage
export function loadTheme(): string {
  try {
    return localStorage.getItem('redhawk_theme') || 'dark';
  } catch {
    return 'dark';
  }
}

// Save theme to localStorage
export function saveTheme(themeId: string): void {
  try {
    localStorage.setItem('redhawk_theme', themeId);
  } catch {}
}
