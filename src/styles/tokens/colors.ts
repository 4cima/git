/**
 * 🎨 Color Tokens - LUMEN Design System
 * 4Cima - Design Token System
 *
 * @description Semantic color tokens for the LUMEN design system
 * @version 1.0.0
 */

// ==========================================
// Semantic Colors - الألوان الدلالية
// ==========================================
export const semanticColors = {
  primary: {
    main: '#C9A962',
    light: '#E8D5A3',
    dark: '#A88542',
    opacity: {
      10: 'rgba(201, 169, 98, 0.1)',
      20: 'rgba(201, 169, 98, 0.2)',
      50: 'rgba(201, 169, 98, 0.5)',
      100: 'rgba(201, 169, 98, 1)',
    },
  },
  success: {
    main: '#10B981',
    light: '#34D399',
    dark: '#059669',
    opacity: {
      10: 'rgba(16, 185, 129, 0.1)',
      20: 'rgba(16, 185, 129, 0.2)',
      50: 'rgba(16, 185, 129, 0.5)',
      100: 'rgba(16, 185, 129, 1)',
    },
  },
  warning: {
    main: '#F59E0B',
    light: '#FBBF24',
    dark: '#D97706',
    opacity: {
      10: 'rgba(245, 158, 11, 0.1)',
      20: 'rgba(245, 158, 11, 0.2)',
      50: 'rgba(245, 158, 11, 0.5)',
      100: 'rgba(245, 158, 11, 1)',
    },
  },
  error: {
    main: '#EF4444',
    light: '#F87171',
    dark: '#DC2626',
    opacity: {
      10: 'rgba(239, 68, 68, 0.1)',
      20: 'rgba(239, 68, 68, 0.2)',
      50: 'rgba(239, 68, 68, 0.5)',
      100: 'rgba(239, 68, 68, 1)',
    },
  },
  info: {
    main: '#3B82F6',
    light: '#60A5FA',
    dark: '#2563EB',
    opacity: {
      10: 'rgba(59, 130, 246, 0.1)',
      20: 'rgba(59, 130, 246, 0.2)',
      50: 'rgba(59, 130, 246, 0.5)',
      100: 'rgba(59, 130, 246, 1)',
    },
  },
} as const;

// ==========================================
// Surface Colors - ألوان الأسطح
// ==========================================
export const surfaceColors = {
  void: '#08080C',
  base: '#0F0F14',
  raised: '#1C1B1F',
  overlay: 'rgba(8, 8, 12, 0.9)',
} as const;

// ==========================================
// Text Colors - ألوان النصوص
// ==========================================
export const textColors = {
  primary: '#E8E4DC',
  secondary: '#A8A5A0',
  tertiary: '#71717A',
  disabled: 'rgba(232, 228, 220, 0.4)',
} as const;

// ==========================================
// Border Colors - ألوان الحدود
// ==========================================
export const borderColors = {
  default: 'rgba(255, 255, 255, 0.15)',
  muted: 'rgba(255, 255, 255, 0.08)',
  focus: '#C9A962',
  hover: 'rgba(255, 255, 255, 0.20)',
} as const;

// ==========================================
// Complete Color Token System
// ==========================================
export const colorTokens = {
  semantic: semanticColors,
  surface: surfaceColors,
  text: textColors,
  border: borderColors,
} as const;

// ==========================================
// Type Exports
// ==========================================
export type SemanticColors = typeof semanticColors;
export type SurfaceColors = typeof surfaceColors;
export type TextColors = typeof textColors;
export type BorderColors = typeof borderColors;
export type ColorTokens = typeof colorTokens;

export default colorTokens;
