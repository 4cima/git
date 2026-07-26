/**
 * 4CIMA Design System - Color Tokens
 * Dark Theme First (RTL Arabic Film Platform)
 */

export const colorTokens = {
  /* Primary Colors - Brand Identity */
  primary: {
    cyan: {
      main: '#06b6d4',
      light: '#22d3ee',
      dark: '#0891b2',
    },
    purple: {
      main: '#a855f7',
      light: '#c084fc',
      dark: '#9333ea',
    },
    gold: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
  },

  /* Secondary Colors - Accent */
  secondary: {
    green: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
    },
    red: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
    },
    orange: {
      main: '#f97316',
      light: '#fb923c',
      dark: '#ea580c',
    },
    blue: {
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#2563eb',
    },
    indigo: {
      main: '#6366f1',
      light: '#818cf8',
      dark: '#4f46e5',
    },
    pink: {
      main: '#ec4899',
      light: '#f472b6',
      dark: '#db2777',
    },
  },

  /* Background Levels (Dark Theme) */
  background: {
    950: '#020617', // Main background
    900: '#0f172a', // Secondary background
    800: '#1e293b', // Tertiary background
    700: '#334155', // Hover states
    600: '#475569', // Borders
    500: '#64748b', // Disabled
  },

  /* Text Levels */
  text: {
    white: '#ffffff',
    'gray-300': '#d1d5db',
    'gray-400': '#9ca3af',
    'gray-500': '#6b7280',
    'gray-600': '#4b5563',
  },

  /* Status Colors */
  status: {
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669',
    },
    warn: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
    },
    info: {
      main: '#3b82f6',
      light: '#60a5fa',
      dark: '#2563eb',
    },
  },

  /* Section Accents */
  section: {
    cyan: {
      main: '#06b6d4',
      hover: '#22d3ee',
      bg: 'rgba(6, 182, 212, 0.1)',
    },
    green: {
      main: '#10b981',
      hover: '#34d399',
      bg: 'rgba(16, 185, 129, 0.1)',
    },
    gold: {
      main: '#f59e0b',
      hover: '#fbbf24',
      bg: 'rgba(245, 158, 11, 0.1)',
    },
    purple: {
      main: '#a855f7',
      hover: '#c084fc',
      bg: 'rgba(168, 85, 247, 0.1)',
    },
    red: {
      main: '#ef4444',
      hover: '#f87171',
      bg: 'rgba(239, 68, 68, 0.1)',
    },
    orange: {
      main: '#f97316',
      hover: '#fb923c',
      bg: 'rgba(249, 115, 22, 0.1)',
    },
  },

  /* Gradients */
  gradients: {
    primary: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
    secondary: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
    gold: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
    dark: 'linear-gradient(180deg, #020617 0%, #0f172a 100%)',
    card: 'linear-gradient(to top, #0f172a 0%, #020617 100%)',
    overlay: 'linear-gradient(to top, #000000 0%, rgba(0,0,0,0.8) 50%, transparent 100%)',
    glow: 'radial-gradient(circle at center, rgba(6,182,212,0.5) 0%, transparent 70%)',
  },

  /* Opacity Layers */
  opacity: {
    5: '0.05',
    10: '0.10',
    20: '0.20',
    30: '0.30',
    40: '0.40',
    50: '0.50',
    60: '0.60',
    70: '0.70',
    80: '0.80',
    90: '0.90',
  },
}

export default colorTokens
