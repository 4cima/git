/**
 * 📝 نظام الطباعة - فور سيما
 * Professional Typography System
 * 
 * @description نظام طباعة احترافي يدعم العربية والإنجليزية
 * @author 4Cima Team
 * @version 1.0.0
 */

// ==========================================
// Font Families - عائلات الخطوط
// ==========================================
export const fontFamilies = {
  // Arabic Fonts - الخطوط العربية
  arabic: {
    primary: '"Cairo", "Tajawal", sans-serif',
    secondary: '"Tajawal", "Cairo", sans-serif',
  },
  
  // English Fonts - الخطوط الإنجليزية
  english: {
    primary: '"Inter", "Roboto", sans-serif',
    secondary: '"Roboto", "Inter", sans-serif',
  },
  
  // Universal - للاستخدام العام
  universal: '"Inter", "Cairo", "Roboto", "Tajawal", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  
  // Monospace - للأكواد
  mono: '"Fira Code", "Consolas", "Monaco", monospace',
} as const;

// ==========================================
// Font Sizes - أحجام الخطوط
// ==========================================
export const fontSizes = {
  // Display - للعناوين الكبيرة جداً
  display: {
    xl: '4.5rem',    // 72px
    lg: '3.75rem',   // 60px
    md: '3rem',      // 48px
    sm: '2.5rem',    // 40px
  },
  
  // Headings - للعناوين
  h1: '2.25rem',     // 36px
  h2: '2rem',        // 32px
  h3: '1.75rem',     // 28px
  h4: '1.5rem',      // 24px
  h5: '1.25rem',     // 20px
  h6: '1.125rem',    // 18px
  
  // Body - للنصوص العادية
  body: {
    xl: '1.125rem',  // 18px
    lg: '1rem',      // 16px
    md: '0.875rem',  // 14px
    sm: '0.75rem',   // 12px
  },
  
  // Caption - للنصوص الصغيرة
  caption: {
    lg: '0.875rem',  // 14px
    md: '0.75rem',   // 12px
    sm: '0.625rem',  // 10px
  },
  
  // Button - لأزرار
  button: {
    lg: '1rem',      // 16px
    md: '0.875rem',  // 14px
    sm: '0.75rem',   // 12px
  },
} as const;

// ==========================================
// Font Weights - أوزان الخطوط
// ==========================================
export const fontWeights = {
  thin: 100,
  extraLight: 200,
  light: 300,
  regular: 400,
  medium: 500,
  semiBold: 600,
  bold: 700,
  extraBold: 800,
  black: 900,
} as const;

// ==========================================
// Line Heights - ارتفاعات الأسطر
// ==========================================
export const lineHeights = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
} as const;

// ==========================================
// Letter Spacing - المسافات بين الحروف
// ==========================================
export const letterSpacing = {
  tighter: '-0.05em',
  tight: '-0.025em',
  normal: '0',
  wide: '0.025em',
  wider: '0.05em',
  widest: '0.1em',
} as const;

// ==========================================
// Typography Variants - أنماط الطباعة الجاهزة
// ==========================================
export const typographyVariants = {
  // Display Variants
  displayXl: {
    fontSize: fontSizes.display.xl,
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacing.tight,
  },
  displayLg: {
    fontSize: fontSizes.display.lg,
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacing.tight,
  },
  displayMd: {
    fontSize: fontSizes.display.md,
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.snug,
    letterSpacing: letterSpacing.tight,
  },
  displaySm: {
    fontSize: fontSizes.display.sm,
    fontWeight: fontWeights.semiBold,
    lineHeight: lineHeights.snug,
    letterSpacing: letterSpacing.normal,
  },
  
  // Heading Variants
  h1: {
    fontSize: fontSizes.h1,
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacing.tight,
  },
  h2: {
    fontSize: fontSizes.h2,
    fontWeight: fontWeights.bold,
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacing.tight,
  },
  h3: {
    fontSize: fontSizes.h3,
    fontWeight: fontWeights.semiBold,
    lineHeight: lineHeights.snug,
    letterSpacing: letterSpacing.normal,
  },
  h4: {
    fontSize: fontSizes.h4,
    fontWeight: fontWeights.semiBold,
    lineHeight: lineHeights.snug,
    letterSpacing: letterSpacing.normal,
  },
  h5: {
    fontSize: fontSizes.h5,
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.normal,
  },
  h6: {
    fontSize: fontSizes.h6,
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.normal,
  },
  
  // Body Variants
  bodyXl: {
    fontSize: fontSizes.body.xl,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.relaxed,
    letterSpacing: letterSpacing.normal,
  },
  bodyLg: {
    fontSize: fontSizes.body.lg,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.normal,
  },
  bodyMd: {
    fontSize: fontSizes.body.md,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.normal,
  },
  bodySm: {
    fontSize: fontSizes.body.sm,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.wide,
  },
  
  // Caption Variants
  captionLg: {
    fontSize: fontSizes.caption.lg,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.wide,
  },
  captionMd: {
    fontSize: fontSizes.caption.md,
    fontWeight: fontWeights.regular,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.wide,
  },
  captionSm: {
    fontSize: fontSizes.caption.sm,
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.wider,
  },
  
  // Button Variants
  buttonLg: {
    fontSize: fontSizes.button.lg,
    fontWeight: fontWeights.semiBold,
    lineHeight: lineHeights.none,
    letterSpacing: letterSpacing.wide,
    textTransform: 'uppercase' as const,
  },
  buttonMd: {
    fontSize: fontSizes.button.md,
    fontWeight: fontWeights.semiBold,
    lineHeight: lineHeights.none,
    letterSpacing: letterSpacing.wide,
    textTransform: 'uppercase' as const,
  },
  buttonSm: {
    fontSize: fontSizes.button.sm,
    fontWeight: fontWeights.medium,
    lineHeight: lineHeights.none,
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase' as const,
  },
} as const;

// ==========================================
// Responsive Typography - الطباعة المتجاوبة
// ==========================================
export const responsiveTypography = {
  // Mobile (320px - 767px)
  mobile: {
    display: {
      xl: '2.5rem',   // 40px
      lg: '2.25rem',  // 36px
      md: '2rem',     // 32px
      sm: '1.75rem',  // 28px
    },
    h1: '1.75rem',    // 28px
    h2: '1.5rem',     // 24px
    h3: '1.25rem',    // 20px
    h4: '1.125rem',   // 18px
    h5: '1rem',       // 16px
    h6: '0.875rem',   // 14px
  },
  
  // Tablet (768px - 1023px)
  tablet: {
    display: {
      xl: '3.5rem',   // 56px
      lg: '3rem',     // 48px
      md: '2.5rem',   // 40px
      sm: '2rem',     // 32px
    },
    h1: '2rem',       // 32px
    h2: '1.75rem',    // 28px
    h3: '1.5rem',     // 24px
    h4: '1.25rem',    // 20px
    h5: '1.125rem',   // 18px
    h6: '1rem',       // 16px
  },
  
  // Desktop (1024px+)
  desktop: {
    display: fontSizes.display,
    h1: fontSizes.h1,
    h2: fontSizes.h2,
    h3: fontSizes.h3,
    h4: fontSizes.h4,
    h5: fontSizes.h5,
    h6: fontSizes.h6,
  },
} as const;

// ==========================================
// Typography Object - كائن الطباعة الكامل
// ==========================================
export const typography = {
  fontFamilies,
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacing,
  variants: typographyVariants,
  responsive: responsiveTypography,
} as const;

// ==========================================
// Type Exports
// ==========================================
export type Typography = typeof typography;
export type TypographyVariant = keyof typeof typographyVariants;

export default typography;
