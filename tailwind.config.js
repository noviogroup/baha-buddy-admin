/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ─── Brand ───────────────────────────────────────────────
        brand: {
          DEFAULT: '#2E78D2',
          blue: '#2E78D2',
          'blue-dark': '#1E5BA8',
          'blue-light': '#EAF2FB',
          gold: '#F5B731',
          'gold-light': '#FEF8E6',
        },
        // ─── Semantic neutrals ──────────────────────────────────
        ink: '#18181B',      // Primary text / strong UI
        body: '#3F3F46',     // Default body text
        muted: '#71717A',    // Captions, timestamps
        hairline: '#E4E4E7', // Borders, dividers
        surface: '#FAFAFA',  // Card / row alt bg
        // ─── Sidebar (warmer navy than V1 zinc) ─────────────────
        sidebar: {
          bg: '#0F1B2E',
          hover: '#172538',
          active: 'rgba(46,120,210,0.16)',
          accent: '#2E78D2',
        },
        // ─── Status palette ─────────────────────────────────────
        status: {
          success: '#16A34A',
          'success-bg': '#DCFCE7',
          warning: '#CA8A04',
          'warning-bg': '#FEF9C3',
          danger: '#DC2626',
          'danger-bg': '#FEE2E2',
          info: '#3730A3',
          'info-bg': '#E0E7FF',
        },
        // ─── Legacy aliases (keep until page.tsx full rebrand pass) ───
        accent: '#2E78D2',
      },
      fontFamily: {
        // CSS variables are wired up in layout.tsx via next/font/google.
        // Fraunces  = display (h1, KPI numbers)
        // DM Sans   = body (paragraphs, tables, UI)
        // JetBrains = mono (UUIDs, code, refs)
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        body:    ['var(--font-dm-sans)', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono:    ['var(--font-jetbrains)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans:    ['var(--font-dm-sans)', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        card:  '0 1px 2px rgba(24,24,27,0.04), 0 1px 1px rgba(24,24,27,0.02)',
        focus: '0 0 0 3px rgba(46,120,210,0.20)',
      },
      borderRadius: {
        xl: '0.75rem',
      },
    },
  },
  plugins: [],
};
