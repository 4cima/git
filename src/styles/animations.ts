/**
 * 🎬 نظام الحركات - فور سيما
 * Animation System with Framer Motion
 * 
 * @description نظام حركات احترافي باستخدام Framer Motion
 * @author 4Cima Team
 * @version 1.0.0
 */

import type { Variants, Transition } from 'framer-motion';

// ==========================================
// Timing Functions - دوال التوقيت
// ==========================================
export const easings = {
  // Standard easings
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0, 0, 0.58, 1],
  easeInOut: [0.42, 0, 0.58, 1],
  
  // Custom easings
  smooth: [0.4, 0, 0.2, 1],
  snappy: [0.8, 0, 0.2, 1],
  bounce: [0.68, -0.55, 0.265, 1.55],
  elastic: [0.175, 0.885, 0.32, 1.275],
  
  // Cinematic easings
  cinematic: [0.83, 0, 0.17, 1],
  dramatic: [0.95, 0.05, 0.795, 0.035],
} as const;

// ==========================================
// Duration - المدة الزمنية
// ==========================================
export const durations = {
  instant: 0,
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
  slower: 0.8,
  slowest: 1.2,
} as const;

// ==========================================
// Transitions - الانتقالات
// ==========================================
export const transitions: Record<string, Transition> = {
  // Default transition
  default: {
    duration: durations.normal,
    ease: easings.smooth,
  },
  
  // Fast transition
  fast: {
    duration: durations.fast,
    ease: easings.smooth,
  },
  
  // Slow transition
  slow: {
    duration: durations.slow,
    ease: easings.smooth,
  },
  
  // Bounce transition
  bounce: {
    duration: durations.normal,
    ease: easings.bounce,
  },
  
  // Spring transition
  spring: {
    type: 'spring',
    stiffness: 300,
    damping: 30,
  },
  
  // Smooth spring
  smoothSpring: {
    type: 'spring',
    stiffness: 100,
    damping: 20,
  },
  
  // Stiff spring
  stiffSpring: {
    type: 'spring',
    stiffness: 500,
    damping: 40,
  },
} as const;

// ==========================================
// Fade Variants - متغيرات التلاشي
// ==========================================
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: transitions.default,
  },
  exit: { 
    opacity: 0,
    transition: transitions.fast,
  },
};

// ==========================================
// Slide Variants - متغيرات الانزلاق
// ==========================================
export const slideVariants = {
  // Slide from left
  fromLeft: {
    hidden: { x: -100, opacity: 0 },
    visible: { 
      x: 0, 
      opacity: 1,
      transition: transitions.default,
    },
    exit: { 
      x: -100, 
      opacity: 0,
      transition: transitions.fast,
    },
  },
  
  // Slide from right
  fromRight: {
    hidden: { x: 100, opacity: 0 },
    visible: { 
      x: 0, 
      opacity: 1,
      transition: transitions.default,
    },
    exit: { 
      x: 100, 
      opacity: 0,
      transition: transitions.fast,
    },
  },
  
  // Slide from top
  fromTop: {
    hidden: { y: -100, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: transitions.default,
    },
    exit: { 
      y: -100, 
      opacity: 0,
      transition: transitions.fast,
    },
  },
  
  // Slide from bottom
  fromBottom: {
    hidden: { y: 100, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: transitions.default,
    },
    exit: { 
      y: 100, 
      opacity: 0,
      transition: transitions.fast,
    },
  },
} as const;

// ==========================================
// Scale Variants - متغيرات التكبير/التصغير
// ==========================================
export const scaleVariants: Variants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: { 
    scale: 1, 
    opacity: 1,
    transition: transitions.smoothSpring,
  },
  exit: { 
    scale: 0.8, 
    opacity: 0,
    transition: transitions.fast,
  },
  hover: {
    scale: 1.05,
    transition: transitions.fast,
  },
  tap: {
    scale: 0.95,
    transition: transitions.fast,
  },
};

// ==========================================
// Stagger Variants - متغيرات التتابع
// ==========================================
export const staggerVariants = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  },
  item: {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: transitions.default,
    },
  },
} as const;

// ==========================================
// Card Hover Variants - متغيرات تحويم الكروت
// ==========================================
export const cardHoverVariants: Variants = {
  rest: {
    scale: 1,
    y: 0,
    transition: transitions.default,
  },
  hover: {
    scale: 1.05,
    y: -8,
    transition: transitions.smoothSpring,
  },
  tap: {
    scale: 0.98,
    y: 0,
    transition: transitions.fast,
  },
};

// ==========================================
// Button Variants - متغيرات الأزرار
// ==========================================
export const buttonVariants: Variants = {
  rest: {
    scale: 1,
    transition: transitions.default,
  },
  hover: {
    scale: 1.05,
    transition: transitions.fast,
  },
  tap: {
    scale: 0.95,
    transition: transitions.fast,
  },
};

// ==========================================
// Modal Variants - متغيرات النوافذ المنبثقة
// ==========================================
export const modalVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
    y: 50,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: transitions.smoothSpring,
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: 50,
    transition: transitions.fast,
  },
};

// ==========================================
// Backdrop Variants - متغيرات الخلفية
// ==========================================
export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: transitions.fast,
  },
  exit: { 
    opacity: 0,
    transition: transitions.fast,
  },
};

// ==========================================
// Page Transition Variants - متغيرات انتقال الصفحات
// ==========================================
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    x: -20,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: transitions.default,
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: transitions.fast,
  },
};

// ==========================================
// Shimmer Animation - حركة التلميع (للـ Skeleton)
// ==========================================
export const shimmerVariants: Variants = {
  initial: {
    backgroundPosition: '-200% 0',
  },
  animate: {
    backgroundPosition: '200% 0',
    transition: {
      duration: 1.5,
      ease: 'linear',
      repeat: Infinity,
    },
  },
};

// ==========================================
// Pulse Animation - حركة النبض
// ==========================================
export const pulseVariants: Variants = {
  initial: {
    scale: 1,
    opacity: 1,
  },
  animate: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      ease: 'easeInOut',
      repeat: Infinity,
    },
  },
};

// ==========================================
// Rotate Animation - حركة الدوران
// ==========================================
export const rotateVariants: Variants = {
  initial: {
    rotate: 0,
  },
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      ease: 'linear',
      repeat: Infinity,
    },
  },
};

// ==========================================
// Bounce Animation - حركة الارتداد
// ==========================================
export const bounceVariants: Variants = {
  initial: {
    y: 0,
  },
  animate: {
    y: [-10, 0, -10],
    transition: {
      duration: 1,
      ease: easings.bounce,
      repeat: Infinity,
    },
  },
};

// ==========================================
// Parallax Variants - متغيرات التأثير المتوازي
// ==========================================
export const parallaxVariants = {
  slow: {
    y: [0, -50],
    transition: {
      duration: 2,
      ease: 'linear',
    },
  },
  medium: {
    y: [0, -100],
    transition: {
      duration: 2,
      ease: 'linear',
    },
  },
  fast: {
    y: [0, -150],
    transition: {
      duration: 2,
      ease: 'linear',
    },
  },
} as const;

// ==========================================
// Cinematic Variants - متغيرات سينمائية
// ==========================================
export const cinematicVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 1.2,
    filter: 'blur(10px)',
  },
  visible: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: durations.slower,
      ease: easings.cinematic,
    },
  },
};

// ==========================================
// Glow Animation - حركة التوهج
// ==========================================
export const glowVariants: Variants = {
  initial: {
    boxShadow: '0 0 10px rgba(229, 9, 20, 0.3)',
  },
  animate: {
    boxShadow: [
      '0 0 10px rgba(229, 9, 20, 0.3)',
      '0 0 20px rgba(229, 9, 20, 0.5)',
      '0 0 10px rgba(229, 9, 20, 0.3)',
    ],
    transition: {
      duration: 2,
      ease: 'easeInOut',
      repeat: Infinity,
    },
  },
};

// ==========================================
// Export All
// ==========================================
export const animations = {
  easings,
  durations,
  transitions,
  variants: {
    fade: fadeVariants,
    slide: slideVariants,
    scale: scaleVariants,
    stagger: staggerVariants,
    cardHover: cardHoverVariants,
    button: buttonVariants,
    modal: modalVariants,
    backdrop: backdropVariants,
    page: pageVariants,
    shimmer: shimmerVariants,
    pulse: pulseVariants,
    rotate: rotateVariants,
    bounce: bounceVariants,
    parallax: parallaxVariants,
    cinematic: cinematicVariants,
    glow: glowVariants,
  },
} as const;

export default animations;
