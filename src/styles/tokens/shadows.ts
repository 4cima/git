/**
 * 🌑 Shadow Tokens - LUMEN Design System
 * 4Cima - Design Token System
 * 
 * @description Elevation levels and shadow tokens with gold glow effects
 * @version 1.0.0
 */

// ==========================================
// Elevation Shadows - ظلال الارتفاع
// ==========================================
export const elevationShadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
} as const;

// ==========================================
// LUMEN Card Shadows - ظلال الكروت
// ==========================================
export const lumenCardShadow = {
  default: '0 4px 24px -4px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(28, 27, 31, 0.6)',
  hover: '0 24px 48px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(201, 169, 98, 0.35), 0 0 40px -8px rgba(201, 169, 98, 0.2)',
} as const;

// ==========================================
// Gold Glow Effects - تأثيرات التوهج الذهبي
// ==========================================
export const goldGlow = {
  sm: '0 0 10px rgba(201, 169, 98, 0.25)',
  md: '0 0 20px rgba(201, 169, 98, 0.35)',
  lg: '0 0 30px rgba(201, 169, 98, 0.45)',
} as const;

// ==========================================
// Complete Shadow Token System
// ==========================================
export const shadowTokens = {
  elevation: elevationShadows,
  lumenCard: lumenCardShadow,
  goldGlow,
} as const;

// ==========================================
// Type Exports
// ==========================================
export type ElevationShadows = typeof elevationShadows;
export type LumenCardShadow = typeof lumenCardShadow;
export type GoldGlow = typeof goldGlow;
export type ShadowTokens = typeof shadowTokens;

export default shadowTokens;
