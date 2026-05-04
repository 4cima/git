/**
 * 📏 Spacing Tokens - LUMEN Design System
 * 4Cima - Design Token System
 *
 * @description 4px-based spacing scale for consistent layout
 * @version 1.0.0
 */

// ==========================================
// Base Unit - الوحدة الأساسية
// ==========================================
const BASE_UNIT = 4; // 4px

// ==========================================
// Spacing Scale - مقياس المسافات
// ==========================================
export const spacingTokens = {
  1: `${BASE_UNIT * 1}px`,   // 4px
  2: `${BASE_UNIT * 2}px`,   // 8px
  3: `${BASE_UNIT * 3}px`,   // 12px
  4: `${BASE_UNIT * 4}px`,   // 16px
  6: `${BASE_UNIT * 6}px`,   // 24px
  8: `${BASE_UNIT * 8}px`,   // 32px
  12: `${BASE_UNIT * 12}px`, // 48px
  16: `${BASE_UNIT * 16}px`, // 64px
  24: `${BASE_UNIT * 24}px`, // 96px
} as const;

// ==========================================
// Type Exports
// ==========================================
export type SpacingTokens = typeof spacingTokens;
export type SpacingKey = keyof typeof spacingTokens;

export default spacingTokens;
