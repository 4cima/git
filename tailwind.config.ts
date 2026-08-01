import type { Config } from 'tailwindcss'
// Removed rtl plugin due to compatibility issues with Tailwind v4
// import rtl from 'tailwindcss-rtl'
import { colorTokens } from './src/styles/tokens/colors'
import { spacingTokens } from './src/styles/tokens/spacing'
import { shadowTokens } from './src/styles/tokens/shadows'
import { animationTokens } from './src/styles/tokens/animations'
import { typographyTokens } from './src/styles/tokens/typography'

/**
 * LUMEN Design System — Light through darkness.
 * 4Cima. Premium, cinematic, universal (TV/tablet/mobile/desktop).
 *
 * Extended with Design Token System for consistency and maintainability.
 */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      gridTemplateColumns: {
        '15': 'repeat(15, minmax(0, 1fr))',
      },
      screens: {
        'xs': '480px',
        '3xl': '1920px',
        '4xl': '2560px',
        '5xl': '3840px',
      },
      colors: {
        /* LUMEN palette - Legacy compatibility */
        lumen: {
          void: colorTokens.background['950'],
          surface: colorTokens.background['900'],
          muted: colorTokens.background['800'],
          cream: colorTokens.text.white,
          silver: colorTokens.text['gray-300'],
          gold: colorTokens.primary.gold.main,
        },
        /* Design Token System - Semantic Colors */
        semantic: {
          primary: colorTokens.primary.cyan.main,
          'primary-light': colorTokens.primary.cyan.light,
          'primary-dark': colorTokens.primary.cyan.dark,
          success: colorTokens.status.success.main,
          'success-light': colorTokens.status.success.light,
          'success-dark': colorTokens.status.success.dark,
          warning: colorTokens.status.warn.main,
          'warning-light': colorTokens.status.warn.light,
          'warning-dark': colorTokens.status.warn.dark,
          error: colorTokens.status.error.main,
          'error-light': colorTokens.status.error.light,
          'error-dark': colorTokens.status.error.dark,
          info: colorTokens.status.info.main,
          'info-light': colorTokens.status.info.light,
          'info-dark': colorTokens.status.info.dark,
        },
        /* Legacy compatibility */
        primary: {
          DEFAULT: colorTokens.primary.cyan.main,
          glow: colorTokens.opacity['50'],
        },
        luxury: {
          obsidian: colorTokens.background['950'],
          charcoal: colorTokens.background['900'],
          emerald: colorTokens.primary.cyan.main,
          blue: colorTokens.status.info.main,
          frost: colorTokens.background['900'],
        },
        neon: {
          emerald: colorTokens.primary.cyan.main,
          blue: colorTokens.status.info.main,
          cyan: '#22D3EE',
        },
      },
      fontFamily: {
        syne: ['Syne', 'system-ui', 'sans-serif'],
        dm: typographyTokens.fontFamilies.english.split(', '),
        cairo: typographyTokens.fontFamilies.arabic.split(', '),
        inter: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        xs: typographyTokens.fontSizes.xs,
        sm: typographyTokens.fontSizes.sm,
        base: typographyTokens.fontSizes.base,
        lg: typographyTokens.fontSizes.lg,
        xl: typographyTokens.fontSizes.xl,
        '2xl': typographyTokens.fontSizes['2xl'],
        '3xl': typographyTokens.fontSizes['3xl'],
        '4xl': typographyTokens.fontSizes['4xl'],
        '5xl': typographyTokens.fontSizes['5xl'],
      },
      fontWeight: {
        normal: String(typographyTokens.fontWeights.normal),
        medium: String(typographyTokens.fontWeights.medium),
        semibold: String(typographyTokens.fontWeights.semibold),
        bold: String(typographyTokens.fontWeights.bold),
      },
      lineHeight: {
        tight: String(typographyTokens.lineHeights.tight),
        normal: String(typographyTokens.lineHeights.normal),
        relaxed: String(typographyTokens.lineHeights.relaxed),
      },
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        6: '24px',
        8: '32px',
        12: '48px',
        16: '64px',
        24: '96px',
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(232, 228, 220, 0.06) 0%, rgba(232, 228, 220, 0.02) 100%)',
        'luxury-gradient': 'linear-gradient(to bottom, transparent, #08080C)',
        'hero-gradient': 'linear-gradient(to right, #08080C 0%, rgba(8, 8, 12, 0.85) 35%, transparent 70%)',
        'hero-gradient-rtl': 'linear-gradient(to left, #08080C 0%, rgba(8, 8, 12, 0.85) 35%, transparent 70%)',
        'lumen-vignette': 'radial-gradient(ellipse 80% 60% at 50% 100%, transparent 40%, rgba(8, 8, 12, 0.95) 100%)',
        'lumen-mesh': 'linear-gradient(135deg, rgba(201, 169, 98, 0.03) 0%, transparent 50%, rgba(201, 169, 98, 0.02) 100%)',
      },
      boxShadow: {
        ...shadowTokens.elevation,
        glass: '0 12px 36px 0 rgba(0, 0, 0, 0.5)',
        'lumen-card': shadowTokens.lumenCard.default,
        'lumen-card-hover': shadowTokens.lumenCard.hover,
        'lumen-gold': '0 0 0 3px rgba(201, 169, 98, 0.5)',
        'lumen-glow': shadowTokens.goldGlow.sm,
        'lumen-glow-md': shadowTokens.goldGlow.md,
        'lumen-glow-lg': shadowTokens.goldGlow.lg,
        'neon-emerald': '0 0 18px rgba(201, 169, 98, 0.4)',
        'neon-blue': '0 0 18px rgba(59, 130, 246, 0.55)',
      },
      animation: {
        'lumen-breathe': 'lumen-breathe 8s ease-in-out infinite',
        'lumen-float': 'lumen-float 6s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'neon-flicker': 'neon-flicker 2s infinite alternate',
        'neon-flicker-cyan': 'neon-flicker-cyan 2s infinite alternate',
        'neon-flicker-cyan-alt': 'neon-flicker-cyan-alt 2.5s infinite alternate-reverse',
        'pulse-white': 'pulse-white 3s ease-in-out infinite',
        'neon-flash': 'neon-flash 1.5s infinite ease-in-out',
        'shimmer': 'shimmer 1.5s infinite',
        'wiggle': 'wiggle 3s ease-in-out infinite',
        'bounce': 'bounce 2s ease-in-out infinite',
        'swipe-hint': 'swipe-hint 5s ease-in-out 1s 1 forwards',
      },
      keyframes: {
        'lumen-breathe': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        'lumen-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg) translateY(0)' },
          '25%': { transform: 'rotate(-8deg) translateY(-3px)' },
          '50%': { transform: 'rotate(0deg) translateY(-6px)' },
          '75%': { transform: 'rotate(8deg) translateY(-3px)' },
        },
        bounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.5', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
        'neon-flicker': {
          '0%, 19%, 21%, 23%, 25%, 54%, 56%, 100%': {
            opacity: '1',
            textShadow: '0 0 5px rgba(255, 255, 255, 0.7), 0 0 10px rgba(255, 255, 255, 0.5), 0 0 20px rgba(255, 255, 255, 0.3)',
          },
          '20%, 24%, 55%': {
            opacity: '0.5',
            textShadow: 'none',
          },
        },
        'neon-flicker-cyan': {
          '0%, 19%, 21%, 23%, 25%, 54%, 56%, 100%': {
            opacity: '1',
            textShadow: '0 0 5px rgba(34, 211, 238, 0.7), 0 0 10px rgba(34, 211, 238, 0.5), 0 0 20px rgba(34, 211, 238, 0.3)',
          },
          '20%, 24%, 55%': {
            opacity: '0.5',
            textShadow: 'none',
          },
        },
        'neon-flicker-cyan-alt': {
          '0%, 34%, 36%, 38%, 40%, 69%, 71%, 100%': {
            opacity: '1',
            textShadow: '0 0 5px rgba(34, 211, 238, 0.7), 0 0 10px rgba(34, 211, 238, 0.5), 0 0 20px rgba(34, 211, 238, 0.3)',
          },
          '35%, 39%, 70%': {
            opacity: '0.5',
            textShadow: 'none',
          },
        },
        'pulse-white': {
          '0%, 100%': { opacity: '0.8', textShadow: '0 0 5px rgba(255, 255, 255, 0.5)' },
          '50%': { opacity: '1', textShadow: '0 0 15px rgba(255, 255, 255, 0.9)' },
        },
        'neon-flash': {
          '0%, 100%': { opacity: '1', textShadow: '0 0 5px #22d3ee, 0 0 10px #22d3ee' },
          '50%': { opacity: '0.5', textShadow: 'none' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      transitionTimingFunction: {
        lumen: animationTokens.easing['ease-lumen'],
        'ease-in-out': animationTokens.easing['ease-in-out'],
        'ease-out': animationTokens.easing['ease-out'],
        'ease-in': animationTokens.easing['ease-in'],
      },
      transitionDuration: {
        fast: animationTokens.durations.fast,
        normal: animationTokens.durations.normal,
        slow: animationTokens.durations.slow,
      },
    },
  },
  plugins: [
    // RTL plugin removed - Tailwind v4 handles RTL differently
    // Use dir="rtl" in HTML and logical properties (inline-start, inline-end)
  ],
} satisfies Config
