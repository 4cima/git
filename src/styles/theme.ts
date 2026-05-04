/**
 * 🎨 نظام الألوان - فور سيما
 * Netflix-inspired Dark Theme
 * 
 * @description نظام ألوان احترافي مستوحى من Netflix/Disney+/HBO Max
 * @author 4Cima Team
 * @version 1.0.0
 */

export const colors = {
  // ==========================================
  // Primary Colors - الألوان الأساسية
  // ==========================================
  primary: {
    main: '#E50914',      // Netflix Red - اللون الأساسي
    light: '#FF1F29',     // Lighter Red - للـ hover
    dark: '#B20710',      // Darker Red - للـ active
    50: '#FFEBEE',
    100: '#FFCDD2',
    200: '#EF9A9A',
    300: '#E57373',
    400: '#EF5350',
    500: '#E50914',       // Main
    600: '#D50812',
    700: '#C50711',
    800: '#B20710',
    900: '#8B0509',
  },

  // ==========================================
  // Secondary Colors - الألوان الثانوية
  // ==========================================
  secondary: {
    main: '#564D4D',      // Warm Gray
    light: '#6E6464',
    dark: '#3E3636',
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#564D4D',       // Main
    600: '#4E4545',
    700: '#463D3D',
    800: '#3E3636',
    900: '#2E2626',
  },

  // ==========================================
  // Gray Scale - تدرجات الرمادي
  // ==========================================
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },

  // ==========================================
  // Background Colors - ألوان الخلفيات
  // ==========================================
  background: {
    primary: '#000000',       // True Black - الخلفية الرئيسية
    secondary: '#141414',     // Dark Gray - الخلفية الثانوية
    tertiary: '#1F1F1F',      // Lighter Dark Gray
    card: '#181818',          // Card Background
    elevated: '#2A2A2A',      // Elevated Elements
    overlay: 'rgba(0, 0, 0, 0.8)',  // Overlay/Modal Background
    gradient: {
      hero: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,1) 100%)',
      card: 'linear-gradient(135deg, rgba(20,20,20,0.95) 0%, rgba(31,31,31,0.95) 100%)',
      navbar: 'linear-gradient(180deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
    },
  },

  // ==========================================
  // Text Colors - ألوان النصوص
  // ==========================================
  text: {
    primary: 'rgba(255, 255, 255, 0.87)',     // 87% opacity - النص الأساسي
    secondary: 'rgba(255, 255, 255, 0.60)',   // 60% opacity - النص الثانوي
    disabled: 'rgba(255, 255, 255, 0.38)',    // 38% opacity - النص المعطل
    hint: 'rgba(255, 255, 255, 0.50)',        // 50% opacity - النص التوضيحي
    inverse: 'rgba(0, 0, 0, 0.87)',           // للخلفيات الفاتحة
  },

  // ==========================================
  // Semantic Colors - الألوان الدلالية
  // ==========================================
  semantic: {
    success: {
      main: '#4CAF50',
      light: '#66BB6A',
      dark: '#388E3C',
      bg: 'rgba(76, 175, 80, 0.1)',
    },
    warning: {
      main: '#FF9800',
      light: '#FFB74D',
      dark: '#F57C00',
      bg: 'rgba(255, 152, 0, 0.1)',
    },
    error: {
      main: '#F44336',
      light: '#EF5350',
      dark: '#D32F2F',
      bg: 'rgba(244, 67, 54, 0.1)',
    },
    info: {
      main: '#2196F3',
      light: '#42A5F5',
      dark: '#1976D2',
      bg: 'rgba(33, 150, 243, 0.1)',
    },
  },

  // ==========================================
  // Border Colors - ألوان الحدود
  // ==========================================
  border: {
    primary: 'rgba(255, 255, 255, 0.12)',     // 12% opacity
    secondary: 'rgba(255, 255, 255, 0.08)',   // 8% opacity
    focus: '#E50914',                          // Primary color for focus
    hover: 'rgba(255, 255, 255, 0.20)',       // 20% opacity
  },

  // ==========================================
  // Special Colors - ألوان خاصة
  // ==========================================
  special: {
    gold: '#FFD700',          // للتقييمات والنجوم
    imdb: '#F5C518',          // IMDB Yellow
    tmdb: '#01B4E4',          // TMDB Blue
    netflix: '#E50914',       // Netflix Red
    disney: '#113CCF',        // Disney+ Blue
    hbo: '#8B5CF6',           // HBO Purple
    prime: '#00A8E1',         // Prime Video Blue
  },

  // ==========================================
  // Transparent Colors - ألوان شفافة
  // ==========================================
  transparent: {
    white: {
      5: 'rgba(255, 255, 255, 0.05)',
      10: 'rgba(255, 255, 255, 0.10)',
      15: 'rgba(255, 255, 255, 0.15)',
      20: 'rgba(255, 255, 255, 0.20)',
      30: 'rgba(255, 255, 255, 0.30)',
      40: 'rgba(255, 255, 255, 0.40)',
      50: 'rgba(255, 255, 255, 0.50)',
    },
    black: {
      5: 'rgba(0, 0, 0, 0.05)',
      10: 'rgba(0, 0, 0, 0.10)',
      20: 'rgba(0, 0, 0, 0.20)',
      30: 'rgba(0, 0, 0, 0.30)',
      40: 'rgba(0, 0, 0, 0.40)',
      50: 'rgba(0, 0, 0, 0.50)',
      60: 'rgba(0, 0, 0, 0.60)',
      70: 'rgba(0, 0, 0, 0.70)',
      80: 'rgba(0, 0, 0, 0.80)',
      90: 'rgba(0, 0, 0, 0.90)',
    },
  },
} as const;

// ==========================================
// Theme Object - كائن الثيم الكامل
// ==========================================
export const theme = {
  colors,
  
  // Dark Mode (Default)
  mode: 'dark' as const,
  
  // Contrast Ratios (WCAG 2.1 AA Compliance)
  contrast: {
    minimum: 4.5,  // للنصوص العادية
    enhanced: 7,   // للنصوص الكبيرة
  },
} as const;

// ==========================================
// Type Exports
// ==========================================
export type Theme = typeof theme;
export type Colors = typeof colors;
export type ColorKey = keyof typeof colors;

export default theme;
