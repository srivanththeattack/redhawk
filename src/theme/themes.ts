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
  // ── Defaults ──
  {
    id: 'dark',
    name: 'Dark',
    icon: '🌙',
    colors: {
      bgPrimary: '#070b17', bgSecondary: '#0f1525', bgCard: '#0f1525',
      bgInput: '#0d1220', border: '#1a2440', textPrimary: '#e0e8f0',
      textSecondary: '#c8d0e0', textMuted: '#4a5568', accent: '#ff4455',
      accentGlow: 'rgba(255,68,85,0.2)', success: '#22c55e',
      warning: '#f59e0b', error: '#ef4444', gradientFrom: '#1a1040',
      gradientTo: '#0d1b2a',
    },
  },
  {
    id: 'light',
    name: 'Light',
    icon: '☀️',
    colors: {
      bgPrimary: '#f5f5f0', bgSecondary: '#ffffff', bgCard: '#ffffff',
      bgInput: '#f0f0eb', border: '#d4d4c8', textPrimary: '#1a1a1a',
      textSecondary: '#333333', textMuted: '#888888', accent: '#d43a4a',
      accentGlow: 'rgba(212,58,74,0.12)', success: '#16a34a',
      warning: '#d97706', error: '#dc2626', gradientFrom: '#f0e6d6',
      gradientTo: '#e0d8c8',
    },
  },
  {
    id: 'dracula',
    name: 'Dracula',
    icon: '🧛',
    colors: {
      bgPrimary: '#1e1f29', bgSecondary: '#282a36', bgCard: '#282a36',
      bgInput: '#1e1f29', border: '#44475a', textPrimary: '#f8f8f2',
      textSecondary: '#e0e0e0', textMuted: '#6272a4', accent: '#ff5555',
      accentGlow: 'rgba(255,85,85,0.2)', success: '#50fa7b',
      warning: '#f1fa8c', error: '#ff5555', gradientFrom: '#282a36',
      gradientTo: '#1e1f29',
    },
  },
  {
    id: 'nord',
    name: 'Nord',
    icon: '❄️',
    colors: {
      bgPrimary: '#2e3440', bgSecondary: '#3b4252', bgCard: '#3b4252',
      bgInput: '#2e3440', border: '#4c566a', textPrimary: '#eceff4',
      textSecondary: '#d8dee9', textMuted: '#616e88', accent: '#bf616a',
      accentGlow: 'rgba(191,97,106,0.2)', success: '#a3be8c',
      warning: '#ebcb8b', error: '#bf616a', gradientFrom: '#3b4252',
      gradientTo: '#2e3440',
    },
  },
  {
    id: 'monokai',
    name: 'Monokai',
    icon: '🎨',
    colors: {
      bgPrimary: '#171717', bgSecondary: '#1e1e1e', bgCard: '#1e1e1e',
      bgInput: '#171717', border: '#333333', textPrimary: '#e0e0e0',
      textSecondary: '#c0c0c0', textMuted: '#666666', accent: '#f92672',
      accentGlow: 'rgba(249,38,114,0.2)', success: '#a6e22e',
      warning: '#e6db74', error: '#f92672', gradientFrom: '#1e1e1e',
      gradientTo: '#171717',
    },
  },

  // ── Gruvbox ──
  {
    id: 'gruvbox-dark',
    name: 'Gruvbox Dark',
    icon: '🪨',
    colors: {
      bgPrimary: '#1d2021', bgSecondary: '#282828', bgCard: '#282828',
      bgInput: '#1d2021', border: '#504945', textPrimary: '#ebdbb2',
      textSecondary: '#d5c4a1', textMuted: '#7c6f64', accent: '#fb4934',
      accentGlow: 'rgba(251,73,52,0.2)', success: '#b8bb26',
      warning: '#fabd2f', error: '#fb4934', gradientFrom: '#282828',
      gradientTo: '#1d2021',
    },
  },
  {
    id: 'gruvbox-light',
    name: 'Gruvbox Light',
    icon: '🪨',
    colors: {
      bgPrimary: '#fbf1c7', bgSecondary: '#f2e5bc', bgCard: '#f2e5bc',
      bgInput: '#ebdbb2', border: '#d5c4a1', textPrimary: '#3c3836',
      textSecondary: '#504945', textMuted: '#928374', accent: '#9d0006',
      accentGlow: 'rgba(157,0,6,0.12)', success: '#79740e',
      warning: '#b57614', error: '#9d0006', gradientFrom: '#f2e5bc',
      gradientTo: '#ebdbb2',
    },
  },

  // ── Solarized ──
  {
    id: 'solarized-dark',
    name: 'Solarized Dark',
    icon: '🌅',
    colors: {
      bgPrimary: '#002b36', bgSecondary: '#073642', bgCard: '#073642',
      bgInput: '#002b36', border: '#586e75', textPrimary: '#839496',
      textSecondary: '#93a1a1', textMuted: '#657b83', accent: '#dc322f',
      accentGlow: 'rgba(220,50,47,0.2)', success: '#859900',
      warning: '#b58900', error: '#dc322f', gradientFrom: '#073642',
      gradientTo: '#002b36',
    },
  },
  {
    id: 'solarized-light',
    name: 'Solarized Light',
    icon: '🌅',
    colors: {
      bgPrimary: '#fdf6e3', bgSecondary: '#eee8d5', bgCard: '#eee8d5',
      bgInput: '#fdf6e3', border: '#93a1a1', textPrimary: '#657b83',
      textSecondary: '#586e75', textMuted: '#839496', accent: '#dc322f',
      accentGlow: 'rgba(220,50,47,0.12)', success: '#859900',
      warning: '#b58900', error: '#dc322f', gradientFrom: '#eee8d5',
      gradientTo: '#fdf6e3',
    },
  },

  // ── Tokyo Night ──
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    icon: '🌃',
    colors: {
      bgPrimary: '#0f111b', bgSecondary: '#1a1b26', bgCard: '#1a1b26',
      bgInput: '#0f111b', border: '#565f89', textPrimary: '#a9b1d6',
      textSecondary: '#9aa5ce', textMuted: '#565f89', accent: '#f7768e',
      accentGlow: 'rgba(247,118,142,0.2)', success: '#9ece6a',
      warning: '#e0af68', error: '#f7768e', gradientFrom: '#1a1b26',
      gradientTo: '#0f111b',
    },
  },
  {
    id: 'tokyo-night-light',
    name: 'Tokyo Night Light',
    icon: '🌃',
    colors: {
      bgPrimary: '#e9e9ed', bgSecondary: '#d5d6db', bgCard: '#d5d6db',
      bgInput: '#e9e9ed', border: '#b4b5b9', textPrimary: '#343b58',
      textSecondary: '#565a6e', textMuted: '#8b8fa3', accent: '#8c4351',
      accentGlow: 'rgba(140,67,81,0.12)', success: '#485e30',
      warning: '#8f5e15', error: '#8c4351', gradientFrom: '#d5d6db',
      gradientTo: '#c0c0c5',
    },
  },

  // ── Catppuccin ──
  {
    id: 'catppuccin-mocha',
    name: 'Catppuccin Mocha',
    icon: '🐱',
    colors: {
      bgPrimary: '#11111b', bgSecondary: '#1e1e2e', bgCard: '#1e1e2e',
      bgInput: '#181825', border: '#45475a', textPrimary: '#cdd6f4',
      textSecondary: '#bac2de', textMuted: '#6c7086', accent: '#f38ba8',
      accentGlow: 'rgba(243,139,168,0.2)', success: '#a6e3a1',
      warning: '#f9e2af', error: '#f38ba8', gradientFrom: '#1e1e2e',
      gradientTo: '#11111b',
    },
  },
  {
    id: 'catppuccin-latte',
    name: 'Catppuccin Latte',
    icon: '🐱',
    colors: {
      bgPrimary: '#eff1f5', bgSecondary: '#e6e9ef', bgCard: '#e6e9ef',
      bgInput: '#dce0e8', border: '#bcc0cc', textPrimary: '#4c4f69',
      textSecondary: '#5c5f77', textMuted: '#9ca0b0', accent: '#d20f39',
      accentGlow: 'rgba(210,15,57,0.12)', success: '#40a02b',
      warning: '#df8e1d', error: '#d20f39', gradientFrom: '#e6e9ef',
      gradientTo: '#ccd0da',
    },
  },
  {
    id: 'catppuccin-frappe',
    name: 'Catppuccin Frappé',
    icon: '🐱',
    colors: {
      bgPrimary: '#232634', bgSecondary: '#303446', bgCard: '#303446',
      bgInput: '#292c3c', border: '#51576d', textPrimary: '#c6d0f5',
      textSecondary: '#b5bfe2', textMuted: '#737994', accent: '#e78284',
      accentGlow: 'rgba(231,130,132,0.2)', success: '#a6d189',
      warning: '#e5c890', error: '#e78284', gradientFrom: '#303446',
      gradientTo: '#232634',
    },
  },
  {
    id: 'catppuccin-macchiato',
    name: 'Catppuccin Macchiato',
    icon: '🐱',
    colors: {
      bgPrimary: '#181926', bgSecondary: '#24273a', bgCard: '#24273a',
      bgInput: '#1e2030', border: '#494d64', textPrimary: '#cad3f5',
      textSecondary: '#b8c0e0', textMuted: '#6e738d', accent: '#ed8796',
      accentGlow: 'rgba(237,135,150,0.2)', success: '#a6da95',
      warning: '#eed49f', error: '#ed8796', gradientFrom: '#24273a',
      gradientTo: '#181926',
    },
  },

  // ── One Dark / Light ──
  {
    id: 'one-dark',
    name: 'One Dark Pro',
    icon: '🔶',
    colors: {
      bgPrimary: '#0f1419', bgSecondary: '#1a1f29', bgCard: '#1a1f29',
      bgInput: '#0f1419', border: '#2c3340', textPrimary: '#abb2bf',
      textSecondary: '#9ca3b0', textMuted: '#565c64', accent: '#e06c75',
      accentGlow: 'rgba(224,108,117,0.2)', success: '#98c379',
      warning: '#e5c07b', error: '#e06c75', gradientFrom: '#1a1f29',
      gradientTo: '#0f1419',
    },
  },
  {
    id: 'one-light',
    name: 'One Light',
    icon: '🔶',
    colors: {
      bgPrimary: '#fafafa', bgSecondary: '#f0f0f0', bgCard: '#f0f0f0',
      bgInput: '#e8e8e8', border: '#d0d0d0', textPrimary: '#383a42',
      textSecondary: '#4f525e', textMuted: '#9d9d9f', accent: '#e45649',
      accentGlow: 'rgba(228,86,73,0.12)', success: '#50a14f',
      warning: '#c18401', error: '#e45649', gradientFrom: '#f0f0f0',
      gradientTo: '#e0e0e0',
    },
  },

  // ── Ayu ──
  {
    id: 'ayu-dark',
    name: 'Ayu Dark',
    icon: '🌲',
    colors: {
      bgPrimary: '#0b0e14', bgSecondary: '#131721', bgCard: '#131721',
      bgInput: '#0b0e14', border: '#2d3640', textPrimary: '#b3b1ad',
      textSecondary: '#a1a09c', textMuted: '#5c6166', accent: '#ff8a5c',
      accentGlow: 'rgba(255,138,92,0.2)', success: '#aad94c',
      warning: '#ffd580', error: '#ff8a5c', gradientFrom: '#131721',
      gradientTo: '#0b0e14',
    },
  },
  {
    id: 'ayu-light',
    name: 'Ayu Light',
    icon: '🌲',
    colors: {
      bgPrimary: '#fafafa', bgSecondary: '#f3f3f3', bgCard: '#f3f3f3',
      bgInput: '#eaeaea', border: '#d5d5d5', textPrimary: '#5c6166',
      textSecondary: '#6e7378', textMuted: '#a0a5aa', accent: '#ff6a00',
      accentGlow: 'rgba(255,106,0,0.12)', success: '#86b300',
      warning: '#f2ae49', error: '#ff6a00', gradientFrom: '#f3f3f3',
      gradientTo: '#e0e0e0',
    },
  },
  {
    id: 'ayu-mirage',
    name: 'Ayu Mirage',
    icon: '🌲',
    colors: {
      bgPrimary: '#1e2430', bgSecondary: '#242b38', bgCard: '#242b38',
      bgInput: '#1e2430', border: '#363e4a', textPrimary: '#d4d3cf',
      textSecondary: '#c0bfbc', textMuted: '#707a84', accent: '#ffcc66',
      accentGlow: 'rgba(255,204,102,0.2)', success: '#aad94c',
      warning: '#ffd580', error: '#ff3333', gradientFrom: '#242b38',
      gradientTo: '#1e2430',
    },
  },

  // ── Material ──
  {
    id: 'material-dark',
    name: 'Material Dark',
    icon: '🧩',
    colors: {
      bgPrimary: '#0e0e0e', bgSecondary: '#1e1e1e', bgCard: '#1e1e1e',
      bgInput: '#121212', border: '#333333', textPrimary: '#d4d4d4',
      textSecondary: '#b8b8b8', textMuted: '#6e6e6e', accent: '#569cd6',
      accentGlow: 'rgba(86,156,214,0.2)', success: '#6a9955',
      warning: '#ce9178', error: '#f44747', gradientFrom: '#1e1e1e',
      gradientTo: '#0e0e0e',
    },
  },
  {
    id: 'material-lighter',
    name: 'Material Lighter',
    icon: '🧩',
    colors: {
      bgPrimary: '#fafafa', bgSecondary: '#f0f0f0', bgCard: '#f0f0f0',
      bgInput: '#e6e6e6', border: '#d0d0d0', textPrimary: '#1e1e1e',
      textSecondary: '#333333', textMuted: '#7a7a7a', accent: '#1565c0',
      accentGlow: 'rgba(21,101,192,0.12)', success: '#2e7d32',
      warning: '#e65100', error: '#c62828', gradientFrom: '#f0f0f0',
      gradientTo: '#e0e0e0',
    },
  },
  {
    id: 'material-palenight',
    name: 'Material Palenight',
    icon: '🧩',
    colors: {
      bgPrimary: '#16161e', bgSecondary: '#20202a', bgCard: '#20202a',
      bgInput: '#16161e', border: '#3e3e4e', textPrimary: '#c3ccdb',
      textSecondary: '#adb6c8', textMuted: '#676e8a', accent: '#82aaff',
      accentGlow: 'rgba(130,170,255,0.2)', success: '#c3e88d',
      warning: '#ffcb6b', error: '#ff5370', gradientFrom: '#20202a',
      gradientTo: '#16161e',
    },
  },

  // ── Rose Pine ──
  {
    id: 'rose-pine',
    name: 'Rose Pine',
    icon: '🌹',
    colors: {
      bgPrimary: '#191724', bgSecondary: '#1f1d2e', bgCard: '#1f1d2e',
      bgInput: '#191724', border: '#393552', textPrimary: '#e0def4',
      textSecondary: '#c4c2da', textMuted: '#6e6a86', accent: '#eb6f92',
      accentGlow: 'rgba(235,111,146,0.2)', success: '#9ccfd8',
      warning: '#f6c177', error: '#eb6f92', gradientFrom: '#1f1d2e',
      gradientTo: '#191724',
    },
  },
  {
    id: 'rose-pine-moon',
    name: 'Rose Pine Moon',
    icon: '🌹',
    colors: {
      bgPrimary: '#232136', bgSecondary: '#2a273f', bgCard: '#2a273f',
      bgInput: '#232136', border: '#44415a', textPrimary: '#e0def4',
      textSecondary: '#c4c2da', textMuted: '#706e88', accent: '#ea9a97',
      accentGlow: 'rgba(234,154,151,0.2)', success: '#9ccfd8',
      warning: '#f6c177', error: '#ea9a97', gradientFrom: '#2a273f',
      gradientTo: '#232136',
    },
  },
  {
    id: 'rose-pine-dawn',
    name: 'Rose Pine Dawn',
    icon: '🌹',
    colors: {
      bgPrimary: '#faf4ed', bgSecondary: '#f2e9e1', bgCard: '#f2e9e1',
      bgInput: '#e5ddd5', border: '#cecacd', textPrimary: '#575279',
      textSecondary: '#6e6983', textMuted: '#9893a5', accent: '#b4637a',
      accentGlow: 'rgba(180,99,122,0.12)', success: '#56949f',
      warning: '#ea9d34', error: '#b4637a', gradientFrom: '#f2e9e1',
      gradientTo: '#e5ddd5',
    },
  },

  // ── Everforest ──
  {
    id: 'everforest-dark',
    name: 'Everforest Dark',
    icon: '🌲',
    colors: {
      bgPrimary: '#1e2326', bgSecondary: '#272e33', bgCard: '#272e33',
      bgInput: '#1e2326', border: '#4b565c', textPrimary: '#d3c6aa',
      textSecondary: '#c0b696', textMuted: '#6f7b83', accent: '#e67e80',
      accentGlow: 'rgba(230,126,128,0.2)', success: '#a7c080',
      warning: '#dbbc7f', error: '#e67e80', gradientFrom: '#272e33',
      gradientTo: '#1e2326',
    },
  },
  {
    id: 'everforest-light',
    name: 'Everforest Light',
    icon: '🌲',
    colors: {
      bgPrimary: '#fef6e9', bgSecondary: '#f2ebd5', bgCard: '#f2ebd5',
      bgInput: '#e8dfc7', border: '#c9c0ac', textPrimary: '#5c6a72',
      textSecondary: '#7a8880', textMuted: '#b3b3a3', accent: '#f85552',
      accentGlow: 'rgba(248,85,82,0.12)', success: '#8da101',
      warning: '#dfa000', error: '#f85552', gradientFrom: '#f2ebd5',
      gradientTo: '#e8dfc7',
    },
  },

  // ── Kanagawa ──
  {
    id: 'kanagawa',
    name: 'Kanagawa',
    icon: '🌊',
    colors: {
      bgPrimary: '#0f0f14', bgSecondary: '#1a1a22', bgCard: '#1a1a22',
      bgInput: '#0f0f14', border: '#363646', textPrimary: '#c8c3c3',
      textSecondary: '#b5b0b0', textMuted: '#72707a', accent: '#e46876',
      accentGlow: 'rgba(228,104,118,0.2)', success: '#6f9553',
      warning: '#dca36a', error: '#e46876', gradientFrom: '#1a1a22',
      gradientTo: '#0f0f14',
    },
  },
  {
    id: 'kanagawa-light',
    name: 'Kanagawa Light',
    icon: '🌊',
    colors: {
      bgPrimary: '#f5edd6', bgSecondary: '#e8dcc4', bgCard: '#e8dcc4',
      bgInput: '#ddd1b8', border: '#c7bca7', textPrimary: '#4a3b3b',
      textSecondary: '#5e4e4e', textMuted: '#9c8e86', accent: '#b1534b',
      accentGlow: 'rgba(177,83,75,0.12)', success: '#5f7655',
      warning: '#b88857', error: '#b1534b', gradientFrom: '#e8dcc4',
      gradientTo: '#ddd1b8',
    },
  },

  // ── Night Owl ──
  {
    id: 'night-owl',
    name: 'Night Owl',
    icon: '🦉',
    colors: {
      bgPrimary: '#011627', bgSecondary: '#0b2138', bgCard: '#0b2138',
      bgInput: '#011627', border: '#1d3b53', textPrimary: '#d6deeb',
      textSecondary: '#c1ccdc', textMuted: '#637d98', accent: '#ef5350',
      accentGlow: 'rgba(239,83,80,0.2)', success: '#22c55e',
      warning: '#f78c6c', error: '#ef5350', gradientFrom: '#0b2138',
      gradientTo: '#011627',
    },
  },

  // ── Synthwave ──
  {
    id: 'synthwave',
    name: 'Synthwave \'84',
    icon: '🌴',
    colors: {
      bgPrimary: '#120a1f', bgSecondary: '#1b1233', bgCard: '#1b1233',
      bgInput: '#120a1f', border: '#382b5e', textPrimary: '#e0d6ff',
      textSecondary: '#c8b8f0', textMuted: '#7a5dc7', accent: '#ff7edb',
      accentGlow: 'rgba(255,126,219,0.25)', success: '#00ffb0',
      warning: '#fefe22', error: '#fe4450', gradientFrom: '#1b1233',
      gradientTo: '#120a1f',
    },
  },

  // ── Cobalt2 ──
  {
    id: 'cobalt2',
    name: 'Cobalt2',
    icon: '💎',
    colors: {
      bgPrimary: '#0f1d2f', bgSecondary: '#15263b', bgCard: '#15263b',
      bgInput: '#0f1d2f', border: '#2c4056', textPrimary: '#c0cfff',
      textSecondary: '#a0b0e0', textMuted: '#5a7a9a', accent: '#ff9d00',
      accentGlow: 'rgba(255,157,0,0.2)', success: '#3ad900',
      warning: '#ffc600', error: '#ff628c', gradientFrom: '#15263b',
      gradientTo: '#0f1d2f',
    },
  },

  // ── Horizon ──
  {
    id: 'horizon-dark',
    name: 'Horizon Dark',
    icon: '🌅',
    colors: {
      bgPrimary: '#1a1c23', bgSecondary: '#232530', bgCard: '#232530',
      bgInput: '#1a1c23', border: '#3e4252', textPrimary: '#d5d8e0',
      textSecondary: '#c0c4d0', textMuted: '#6c6f80', accent: '#e95678',
      accentGlow: 'rgba(233,86,120,0.2)', success: '#29d398',
      warning: '#fab795', error: '#e95678', gradientFrom: '#232530',
      gradientTo: '#1a1c23',
    },
  },
  {
    id: 'horizon-light',
    name: 'Horizon Light',
    icon: '🌅',
    colors: {
      bgPrimary: '#fdf0ed', bgSecondary: '#f3dbd3', bgCard: '#f3dbd3',
      bgInput: '#eacbc0', border: '#d5b8ad', textPrimary: '#403c3c',
      textSecondary: '#5a5353', textMuted: '#9e8882', accent: '#e95678',
      accentGlow: 'rgba(233,86,120,0.12)', success: '#29d398',
      warning: '#f09383', error: '#e95678', gradientFrom: '#f3dbd3',
      gradientTo: '#eacbc0',
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
