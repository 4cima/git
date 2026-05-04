/**
 * 🌑 نظام الظلال - فور سيما
 * Elevation System with Shadows
 * 
 * @description نظام ظلال احترافي مستوحى من Material Design
 * @author 4Cima Team
 * @version 1.0.0
 */

// ==========================================
// Elevation Levels - مستويات الارتفاع
// ==========================================
export const shadows = {
  // No Shadow
  none: 'none',
  
  // Level 1 - Subtle elevation (Cards, Buttons)
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  
  // Level 2 - Low elevation (Dropdowns, Tooltips)
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  
  // Level 3 - Medium elevation (Modals, Popovers)
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  
  // Level 4 - High elevation (Sticky elements)
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  
  // Level 5 - Very high elevation (Dialogs, Drawers)
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  
  // Inner Shadow
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
} as const;

// ==========================================
// Colored Shadows - ظلال ملونة
// ==========================================
export const coloredShadows = {
  // Primary (Red) Shadow
  primary: {
    sm: '0 1px 2px 0 rgba(229, 9, 20, 0.1)',
    md: '0 4px 6px -1px rgba(229, 9, 20, 0.2), 0 2px 4px -1px rgba(229, 9, 20, 0.1)',
    lg: '0 10px 15px -3px rgba(229, 9, 20, 0.3), 0 4px 6px -2px rgba(229, 9, 20, 0.15)',
    xl: '0 20px 25px -5px rgba(229, 9, 20, 0.4), 0 10px 10px -5px rgba(229, 9, 20, 0.2)',
  },
  
  // Success (Green) Shadow
  success: {
    sm: '0 1px 2px 0 rgba(76, 175, 80, 0.1)',
    md: '0 4px 6px -1px rgba(76, 175, 80, 0.2), 0 2px 4px -1px rgba(76, 175, 80, 0.1)',
    lg: '0 10px 15px -3px rgba(76, 175, 80, 0.3), 0 4px 6px -2px rgba(76, 175, 80, 0.15)',
  },
  
  // Warning (Orange) Shadow
  warning: {
    sm: '0 1px 2px 0 rgba(255, 152, 0, 0.1)',
    md: '0 4px 6px -1px rgba(255, 152, 0, 0.2), 0 2px 4px -1px rgba(255, 152, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(255, 152, 0, 0.3), 0 4px 6px -2px rgba(255, 152, 0, 0.15)',
  },
  
  // Error (Red) Shadow
  error: {
    sm: '0 1px 2px 0 rgba(244, 67, 54, 0.1)',
    md: '0 4px 6px -1px rgba(244, 67, 54, 0.2), 0 2px 4px -1px rgba(244, 67, 54, 0.1)',
    lg: '0 10px 15px -3px rgba(244, 67, 54, 0.3), 0 4px 6px -2px rgba(244, 67, 54, 0.15)',
  },
  
  // Info (Blue) Shadow
  info: {
    sm: '0 1px 2px 0 rgba(33, 150, 243, 0.1)',
    md: '0 4px 6px -1px rgba(33, 150, 243, 0.2), 0 2px 4px -1px rgba(33, 150, 243, 0.1)',
    lg: '0 10px 15px -3px rgba(33, 150, 243, 0.3), 0 4px 6px -2px rgba(33, 150, 243, 0.15)',
  },
} as const;

// ==========================================
// Glow Effects - تأثيرات التوهج
// ==========================================
export const glowEffects = {
  // Primary Glow (Red)
  primary: {
    sm: '0 0 10px rgba(229, 9, 20, 0.3)',
    md: '0 0 20px rgba(229, 9, 20, 0.4)',
    lg: '0 0 30px rgba(229, 9, 20, 0.5)',
    xl: '0 0 40px rgba(229, 9, 20, 0.6)',
  },
  
  // Gold Glow (للتقييمات)
  gold: {
    sm: '0 0 10px rgba(255, 215, 0, 0.3)',
    md: '0 0 20px rgba(255, 215, 0, 0.4)',
    lg: '0 0 30px rgba(255, 215, 0, 0.5)',
  },
  
  // White Glow
  white: {
    sm: '0 0 10px rgba(255, 255, 255, 0.2)',
    md: '0 0 20px rgba(255, 255, 255, 0.3)',
    lg: '0 0 30px rgba(255, 255, 255, 0.4)',
  },
  
  // Cinematic Glow (للعناصر السينمائية)
  cinematic: {
    sm: '0 0 15px rgba(229, 9, 20, 0.2), 0 0 30px rgba(229, 9, 20, 0.1)',
    md: '0 0 20px rgba(229, 9, 20, 0.3), 0 0 40px rgba(229, 9, 20, 0.2)',
    lg: '0 0 30px rgba(229, 9, 20, 0.4), 0 0 60px rgba(229, 9, 20, 0.3)',
  },
} as const;

// ==========================================
// Component Shadows - ظلال المكونات
// ==========================================
export const componentShadows = {
  // Card Shadows
  card: {
    default: shadows.md,
    hover: shadows.lg,
    active: shadows.sm,
  },
  
  // Button Shadows
  button: {
    default: shadows.sm,
    hover: shadows.md,
    active: shadows.none,
    primary: coloredShadows.primary.md,
    primaryHover: coloredShadows.primary.lg,
  },
  
  // Modal/Dialog Shadows
  modal: shadows['2xl'],
  
  // Dropdown Shadows
  dropdown: shadows.lg,
  
  // Tooltip Shadows
  tooltip: shadows.md,
  
  // Navbar Shadows
  navbar: '0 2px 8px 0 rgba(0, 0, 0, 0.15)',
  
  // Sidebar Shadows
  sidebar: '2px 0 8px 0 rgba(0, 0, 0, 0.15)',
  
  // Image Shadows
  image: {
    default: shadows.md,
    hover: `${shadows.lg}, ${glowEffects.primary.sm}`,
  },
  
  // Input Shadows
  input: {
    default: shadows.sm,
    focus: `${shadows.md}, ${coloredShadows.primary.sm}`,
    error: `${shadows.md}, ${coloredShadows.error.sm}`,
  },
} as const;

// ==========================================
// Text Shadows - ظلال النصوص
// ==========================================
export const textShadows = {
  // Subtle text shadow
  sm: '0 1px 2px rgba(0, 0, 0, 0.5)',
  
  // Medium text shadow
  md: '0 2px 4px rgba(0, 0, 0, 0.6)',
  
  // Strong text shadow
  lg: '0 3px 6px rgba(0, 0, 0, 0.7)',
  
  // Cinematic text shadow (للعناوين الكبيرة)
  cinematic: '0 4px 8px rgba(0, 0, 0, 0.8), 0 2px 4px rgba(0, 0, 0, 0.6)',
  
  // Glow text shadow
  glow: '0 0 10px rgba(229, 9, 20, 0.5), 0 0 20px rgba(229, 9, 20, 0.3)',
  
  // Outline text shadow
  outline: '-1px -1px 0 rgba(0, 0, 0, 0.8), 1px -1px 0 rgba(0, 0, 0, 0.8), -1px 1px 0 rgba(0, 0, 0, 0.8), 1px 1px 0 rgba(0, 0, 0, 0.8)',
} as const;

// ==========================================
// Backdrop Filters - فلاتر الخلفية
// ==========================================
export const backdropFilters = {
  // Glass Morphism
  glass: {
    light: 'blur(8px) saturate(180%)',
    medium: 'blur(12px) saturate(180%)',
    heavy: 'blur(16px) saturate(180%)',
  },
  
  // Blur only
  blur: {
    sm: 'blur(4px)',
    md: 'blur(8px)',
    lg: 'blur(12px)',
    xl: 'blur(16px)',
  },
} as const;

// ==========================================
// Helper Functions - دوال مساعدة
// ==========================================

/**
 * إنشاء ظل مخصص
 * @param x - الإزاحة الأفقية
 * @param y - الإزاحة العمودية
 * @param blur - مقدار التمويه
 * @param spread - مقدار الانتشار
 * @param color - لون الظل
 * @returns قيمة box-shadow
 */
export const createShadow = (
  x: number,
  y: number,
  blur: number,
  spread: number,
  color: string
): string => {
  return `${x}px ${y}px ${blur}px ${spread}px ${color}`;
};

/**
 * دمج عدة ظلال
 * @param shadows - مصفوفة من الظلال
 * @returns قيمة box-shadow مدمجة
 */
export const combineShadows = (...shadows: string[]): string => {
  return shadows.join(', ');
};

// ==========================================
// Type Exports
// ==========================================
export type Shadows = typeof shadows;
export type ShadowKey = keyof typeof shadows;
export type ColoredShadows = typeof coloredShadows;
export type GlowEffects = typeof glowEffects;

export default shadows;
