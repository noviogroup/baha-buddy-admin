/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ─── Baha Buddy Brand ────────────────────────────────────
        // Brighter Bahamian palette: ocean blue, aqua, sun gold,
        // clean sand surfaces. Designed to feel tourism-forward,
        // not dark enterprise-template.
        brand: {
          DEFAULT: '#0077C8',
          blue: '#0077C8',
          'blue-dark': '#005EA8',
          'blue-light': '#E5F5FF',
          aqua: '#00AEEF',
          'aqua-light': '#DFF8FF',
          gold: '#FDBB30',
          'gold-light': '#FFF4D6',
          sand: '#FFF8EA',
          coral: '#FF7A59',
        },
        // ─── Semantic neutrals ──────────────────────────────────
        ink: '#102033',      // Primary text / strong UI
        body: '#34495E',     // Default body text
        muted: '#6B7A90',    // Captions, timestamps
        hairline: '#DDEAF4', // Borders, dividers
        surface: '#F4FAFF',  // Card / row alt bg
        // ─── Sidebar: light command center, branded not bland ───
        sidebar: {
          bg: '#F7FCFF',
          hover: '#E5F5FF',
          active: '#DFF4FF',
          accent: '#0077C8',
          border: '#D6ECFA',
          text: '#17324D',
          muted: '#6B7A90',
        },
        // ─── Status palette ─────────────────────────────────────
        status: {
          success: '#0E9F6E',
          'success-bg': '#DDFBEF',
          warning: '#B7791F',
          'warning-bg': '#FFF4D6',
          danger: '#DC2626',
          'danger-bg': '#FEE2E2',
          info: '#0077C8',
          'info-bg': '#E5F5FF',
        },
        // ─── Legacy aliases ─────────────────────────────────────
        accent: '#00AEEF',
      },
      fontFamily: {
        display: ['var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        body:    ['var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono:    ['var(--font-jetbrains)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans:    ['var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card:  '0 8px 24px rgba(0, 119, 200, 0.06), 0 1px 2px rgba(16, 32, 51, 0.04)',
        focus: '0 0 0 3px rgba(0, 174, 239, 0.22)',
      },
      borderRadius: {
        xl: '0.75rem',
      },
    },
  },
  plugins: [],
};
