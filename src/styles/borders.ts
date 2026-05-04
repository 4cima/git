/**
 * 🔲 نظام الحدود - فور سيما
 * Border System
 * 
 * @description نظام حدود موحد للمكونات
 * @author 4Cima Team
 * @version 1.0.0
 */

// ==========================================
// Border Radius - نصف قطر الحدود
// ==========================================
export const borderRadius = {
  none: '0',
  sm: '0.25rem',      // 4px
  md: '0.375rem',     // 6px
  lg: '0.5rem',       // 8px
  xl: '0.75rem',      // 12px
  '2xl': '1rem',      // 16px
  '3xl': '1.5rem',    // 24px
  full: '9999px',     // للدوائر
} as const;

// ==========================================
// Border Width - عرض الحدود
// ==========================================
export const borderWidth = {
  0: '0',
  1: '1px',
  2: '2px',
  4: '4px',
  8: '8px',
} as const;

// ==========================================
// Border Style - نمط الحدود
// ==========================================
export const borderStyle = {
  solid: 'solid',
  dashed: 'dashed',
  dotted: 'dotted',
  double: 'double',
  none: 'none',
} as const;

// ==========================================
// Component Borders - حدود المكونات
// ==========================================
export const componentBorders = {
  // Button Borders
  button: {
    radius: borderRadius.lg,
    width: borderWidth[2],
  },
  
  // Card Borders
  card: {
    radius: borderRadius.xl,
    width: borderWidth[1],
  },
  
  // Input Borders
  input: {
    radius: borderRadius.md,
    width: borderWidth[1],
  },
  
  // Modal Borders
  modal: {
    radius: borderRadius['2xl'],
    width: borderWidth[0],
  },
  
  // Image Borders
  image: {
    radius: borderRadius.lg,
    width: borderWidth[0],
  },
  
  // Badge Borders
  badge: {
    radius: borderRadius.full,
    width: borderWidth[1],
  },
  
  // Chip Borders
  chip: {
    radius: borderRadius.full,
    width: borderWidth[1],
  },
  
  // Avatar Borders
  avatar: {
    radius: borderRadius.full,
    width: borderWidth[2],
  },
} as const;

// ==========================================
// Type Exports
// ==========================================
export type BorderRadius = typeof borderRadius;
export type BorderRadiusKey = keyof typeof borderRadius;
export type BorderWidth = typeof borderWidth;
export type BorderWidthKey = keyof typeof borderWidth;

export default {
  radius: borderRadius,
  width: borderWidth,
  style: borderStyle,
  component: componentBorders,
};
