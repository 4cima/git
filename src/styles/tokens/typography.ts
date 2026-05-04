/**
 * 📝 Typography Tokens - LUMEN Design System
 * 4Cima - Design Token System
 *
 * @description Typography tokens with support for Arabic (Cairo) and English (DM Sans)
 * @version 1.0.0
 */

// ==========================================
// Font Families - عائلات الخطوط
// ==========================================
export const fontFamilies = {
  arabic: '"Cairo", system-ui, sans-serif',
  english: '"DM Sans", system-ui, sans-serif',
  universal: '"DM Sans", "Cairo", system-ui, sans-serif',
  mono: '"Fira Code", "Consolas", monospace',
} as const;

// ==========================================
// Font Sizes - أحجام الخطوط
// ==========================================
export const fontSizes = {
  xs: '0.75rem',      // 12px
  sm: '0.875rem',     // 14px
  base: '1rem',       // 16px
  lg: '1.125rem',     // 18px
  xl: '1.25rem',      // 20px
  '2xl': '1.5rem',    // 24px
  '3xl': '1.875rem',  // 30px
  '4xl': '2.25rem',   // 36px
  '5xl': '3rem',      // 48px
} as const;

// ==========================================
// Font Weights - أوزان الخطوط
// ==========================================
export const fontWeights = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

// ==========================================
// Line Heights - ارتفاعات الأسطر
// ==========================================
export const lineHeights = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
} as const;

// ==========================================
// Complete Typography Token System
// ==========================================
export const typographyTokens = {
  fontFamilies,
  fontSizes,
  fontWeights,
  lineHeights,
} as const;

// ==========================================
// Type Exports
// ==========================================
export type FontFamilies = typeof fontFamilies;
export type FontSizes = typeof fontSizes;
export type FontWeights = typeof fontWeights;
export type LineHeights = typeof lineHeights;
export type TypographyTokens = typeof typographyTokens;

export default typographyTokens;
