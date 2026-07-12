/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        redhawk: {
          50: '#fef2f2',
          100: '#fde3e3',
          200: '#fccccc',
          300: '#f9a8a8',
          400: '#f47575',
          500: '#ec4444',
          600: '#d92b2b',
          700: '#b71f1f',
          800: '#981c1c',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        midnight: {
          50: '#f0f4fa',
          100: '#dbe3ef',
          200: '#bfcee2',
          300: '#94b0cf',
          400: '#638db7',
          500: '#42719e',
          600: '#335984',
          700: '#2c486b',
          800: '#293e5a',
          900: '#0f172a',
          950: '#070b17',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
