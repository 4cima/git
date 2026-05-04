/**
 * 🎬 UnifiedPlaceholder Component - Cinema Online
 * Unified SVG placeholder for all image failures
 * 
 * @description Provides consistent fallback UI when images fail to load
 * @author Cinema Online Team
 */

import React from 'react';
import { Film, Tv, Gamepad2, Monitor, Zap } from 'lucide-react';
import { useLang } from '../../state/useLang';

export interface UnifiedPlaceholderProps {
  contentType?: 'movie' | 'tv' | 'game' | 'software' | 'anime';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const CONTENT_TYPE_ICONS = {
  movie: Film,
  tv: Tv,
  software: Monitor,
  anime: Zap,
  game: Gamepad2
};

const SIZE_DIMENSIONS = {
  sm: { icon: 24, text: 10 },
  md: { icon: 32, text: 12 },
  lg: { icon: 48, text: 16 }
};

/**
 * UnifiedPlaceholder - Consistent fallback for failed images
 * 
 * Features:
 * - SVG-based (no external dependencies)
 * - Lumen design system colors
 * - Content type icons
 * - Bilingual text support
 * - Multiple size variants
 */
export const UnifiedPlaceholder: React.FC<UnifiedPlaceholderProps> = ({
  contentType = 'movie',
  size = 'md',
  showText = true,
  className = ''
}) => {
  const { lang } = useLang();
  const Icon = CONTENT_TYPE_ICONS[contentType];
  const dimensions = SIZE_DIMENSIONS[size];

  const text = lang === 'ar' ? 'فور سيما' : '4Cima';

  return (
    <div
      className={`relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 ${className}`}
      role="img"
      aria-label={`${contentType} placeholder`}
    >
      {/* Icon */}
      <Icon
        size={dimensions.icon}
        className="text-zinc-600 mb-2 opacity-50"
        strokeWidth={1.5}
      />

      {/* Text */}
      {showText && (
        <span
          className="text-zinc-600 font-medium opacity-50 text-center px-4"
          style={{ fontSize: `${dimensions.text}px` }}
        >
          {text}
        </span>
      )}

      {/* Subtle grain overlay */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat'
        }}
      />
    </div>
  );
};

export default UnifiedPlaceholder;
