/**
 * 🎬 Animation Tokens - LUMEN Design System
 * 4Cima - Design Token System
 * 
 * @description Animation durations and easing functions
 * @version 1.0.0
 */

// ==========================================
// Animation Durations - مدة الحركات
// ==========================================
export const animationDurations = {
  fast: '150ms',
  normal: '300ms',
  slow: '500ms',
} as const;

// ==========================================
// Easing Functions - دوال التسهيل
// ==========================================
export const easingFunctions = {
  'ease-lumen': 'cubic-bezier(0.22, 1, 0.36, 1)',
  'ease-in-out': 'cubic-bezier(0.42, 0, 0.58, 1)',
  'ease-out': 'cubic-bezier(0, 0, 0.58, 1)',
  'ease-in': 'cubic-bezier(0.42, 0, 1, 1)',
} as const;

// ==========================================
// Complete Animation Token System
// ==========================================
export const animationTokens = {
  durations: animationDurations,
  easing: easingFunctions,
} as const;

// ==========================================
// Type Exports
// ==========================================
export type AnimationDurations = typeof animationDurations;
export type EasingFunctions = typeof easingFunctions;
export type AnimationTokens = typeof animationTokens;

export default animationTokens;
