/**
 * 📏 نظام المسافات - فور سيما
 * Consistent Spacing System
 * 
 * @description نظام مسافات متناسق بناءً على 4px base unit
 * @author 4Cima Team
 * @version 1.0.0
 */

// ==========================================
// Base Unit - الوحدة الأساسية
// ==========================================
const BASE_UNIT = 4; // 4px

// ==========================================
// Spacing Scale - مقياس المسافات
// ==========================================
export const spacing = {
  0: '0',
  1: `${BASE_UNIT * 1}px`,      // 4px
  2: `${BASE_UNIT * 2}px`,      // 8px
  3: `${BASE_UNIT * 3}px`,      // 12px
  4: `${BASE_UNIT * 4}px`,      // 16px
  5: `${BASE_UNIT * 5}px`,      // 20px
  6: `${BASE_UNIT * 6}px`,      // 24px
  7: `${BASE_UNIT * 7}px`,      // 28px
  8: `${BASE_UNIT * 8}px`,      // 32px
  10: `${BASE_UNIT * 10}px`,    // 40px
  12: `${BASE_UNIT * 12}px`,    // 48px
  14: `${BASE_UNIT * 14}px`,    // 56px
  16: `${BASE_UNIT * 16}px`,    // 64px
  20: `${BASE_UNIT * 20}px`,    // 80px
  24: `${BASE_UNIT * 24}px`,    // 96px
  32: `${BASE_UNIT * 32}px`,    // 128px
  40: `${BASE_UNIT * 40}px`,    // 160px
  48: `${BASE_UNIT * 48}px`,    // 192px
  56: `${BASE_UNIT * 56}px`,    // 224px
  64: `${BASE_UNIT * 64}px`,    // 256px
} as const;

// ==========================================
// Named Spacing - مسافات مسماة
// ==========================================
export const namedSpacing = {
  // Extra Small
  xs: spacing[1],      // 4px
  
  // Small
  sm: spacing[2],      // 8px
  
  // Medium
  md: spacing[4],      // 16px
  
  // Large
  lg: spacing[6],      // 24px
  
  // Extra Large
  xl: spacing[8],      // 32px
  
  // 2X Large
  '2xl': spacing[12],  // 48px
  
  // 3X Large
  '3xl': spacing[16],  // 64px
  
  // 4X Large
  '4xl': spacing[24],  // 96px
  
  // 5X Large
  '5xl': spacing[32],  // 128px
} as const;

// ==========================================
// Component Spacing - مسافات المكونات
// ==========================================
export const componentSpacing = {
  // Button Padding
  button: {
    sm: {
      x: spacing[3],   // 12px
      y: spacing[2],   // 8px
    },
    md: {
      x: spacing[4],   // 16px
      y: spacing[3],   // 12px
    },
    lg: {
      x: spacing[6],   // 24px
      y: spacing[4],   // 16px
    },
  },
  
  // Card Padding
  card: {
    sm: spacing[3],    // 12px
    md: spacing[4],    // 16px
    lg: spacing[6],    // 24px
  },
  
  // Input Padding
  input: {
    sm: {
      x: spacing[3],   // 12px
      y: spacing[2],   // 8px
    },
    md: {
      x: spacing[4],   // 16px
      y: spacing[3],   // 12px
    },
    lg: {
      x: spacing[5],   // 20px
      y: spacing[4],   // 16px
    },
  },
  
  // Container Padding
  container: {
    mobile: spacing[4],    // 16px
    tablet: spacing[6],    // 24px
    desktop: spacing[8],   // 32px
  },
  
  // Section Spacing
  section: {
    sm: spacing[8],     // 32px
    md: spacing[12],    // 48px
    lg: spacing[16],    // 64px
    xl: spacing[24],    // 96px
  },
  
  // Gap (for Flexbox/Grid)
  gap: {
    xs: spacing[1],    // 4px
    sm: spacing[2],    // 8px
    md: spacing[4],    // 16px
    lg: spacing[6],    // 24px
    xl: spacing[8],    // 32px
  },
} as const;

// ==========================================
// Layout Spacing - مسافات التخطيط
// ==========================================
export const layoutSpacing = {
  // Navbar Height
  navbar: {
    mobile: '56px',
    desktop: '64px',
  },
  
  // Sidebar Width
  sidebar: {
    collapsed: '64px',
    expanded: '240px',
  },
  
  // Content Max Width
  contentMaxWidth: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
    full: '100%',
  },
  
  // Grid Columns
  gridColumns: {
    mobile: 4,
    tablet: 8,
    desktop: 12,
  },
  
  // Grid Gutter
  gridGutter: {
    mobile: spacing[4],    // 16px
    tablet: spacing[6],    // 24px
    desktop: spacing[8],   // 32px
  },
} as const;

// ==========================================
// Responsive Spacing - المسافات المتجاوبة
// ==========================================
export const responsiveSpacing = {
  // Mobile (320px - 767px)
  mobile: {
    container: spacing[4],   // 16px
    section: spacing[8],     // 32px
    gap: spacing[2],         // 8px
  },
  
  // Tablet (768px - 1023px)
  tablet: {
    container: spacing[6],   // 24px
    section: spacing[12],    // 48px
    gap: spacing[4],         // 16px
  },
  
  // Desktop (1024px+)
  desktop: {
    container: spacing[8],   // 32px
    section: spacing[16],    // 64px
    gap: spacing[6],         // 24px
  },
} as const;

// ==========================================
// Helper Functions - دوال مساعدة
// ==========================================

/**
 * تحويل رقم إلى قيمة spacing
 * @param value - الرقم المضاعف للوحدة الأساسية
 * @returns قيمة spacing بالبكسل
 */
export const sp = (value: number): string => {
  return `${BASE_UNIT * value}px`;
};

/**
 * إنشاء padding متناسق
 * @param all - padding لجميع الجوانب
 * @returns قيمة padding
 */
export const padding = (all: number): string => sp(all);

/**
 * إنشاء padding مخصص
 * @param vertical - padding عمودي (top & bottom)
 * @param horizontal - padding أفقي (left & right)
 * @returns قيمة padding
 */
export const paddingXY = (vertical: number, horizontal: number): string => {
  return `${sp(vertical)} ${sp(horizontal)}`;
};

/**
 * إنشاء margin متناسق
 * @param all - margin لجميع الجوانب
 * @returns قيمة margin
 */
export const margin = (all: number): string => sp(all);

/**
 * إنشاء margin مخصص
 * @param vertical - margin عمودي (top & bottom)
 * @param horizontal - margin أفقي (left & right)
 * @returns قيمة margin
 */
export const marginXY = (vertical: number, horizontal: number): string => {
  return `${sp(vertical)} ${sp(horizontal)}`;
};

// ==========================================
// Type Exports
// ==========================================
export type Spacing = typeof spacing;
export type SpacingKey = keyof typeof spacing;
export type NamedSpacing = typeof namedSpacing;
export type NamedSpacingKey = keyof typeof namedSpacing;

export default spacing;
