/**
 * 🎬 Card Component - LUMEN Design System
 * Cinema Online - اونلاين سينما
 *
 * @description Enhanced card component with hover effects, metadata, and loading states
 * @author Cinema Online Team
 * @version 2.0.0
 *
 * Implements Requirements:
 * - 4.1: Base styles (rounded-2xl, surface background, muted border, lumen-card shadow)
 * - 4.2: Hover state (scale 1.03, gold border 40% opacity, enhanced shadow with gold glow)
 * - 4.3: Focus state (gold outline 2px width, 2px offset)
 * - 4.4: Aspect ratio support (2:3 portrait, 16:9 landscape)
 * - 4.5: Loading skeleton with pulse animation
 * - 4.6: Metadata hierarchy (title, subtitle, meta info)
 * - 4.7: Rating display with gold star icon
 * - 4.8: Action buttons with fade-in animation on hover
 */

import { motion, type HTMLMotionProps } from 'framer-motion';
import { forwardRef, useState, type ReactNode } from 'react';
import { Star, Play, Plus } from 'lucide-react';
import Skeleton from './Skeleton';

export type CardVariant = 'default' | 'interactive' | 'static';
export type AspectRatio = '2/3' | '16/9';

export interface CardProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  /** Card variant - default (hover effects), interactive (clickable), static (no effects) */
  variant?: CardVariant;
  /** Poster image URL */
  poster?: string;
  /** Card title */
  title?: string;
  /** Card subtitle */
  subtitle?: string;
  /** Rating value (0-10) */
  rating?: number;
  /** Metadata array (e.g., year, duration, genre) */
  metadata?: string[];
  /** Action buttons to show on hover */
  actions?: ReactNode;
  /** Aspect ratio for poster image */
  aspectRatio?: AspectRatio;
  /** Loading state - shows skeleton */
  loading?: boolean;
  /** Custom className */
  className?: string;
  /** Children content (overrides default card content) */
  children?: ReactNode;
  /** Click handler for interactive cards */
  onClick?: () => void;
}

const aspectRatioStyles: Record<AspectRatio, string> = {
  '2/3': 'aspect-[2/3]',
  '16/9': 'aspect-video',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      poster,
      title,
      subtitle,
      rating,
      metadata,
      actions,
      aspectRatio = '2/3',
      loading = false,
      className = '',
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const isInteractive = variant === 'interactive' || onClick;
    const hasHoverEffects = variant !== 'static';

    // Loading skeleton
    if (loading) {
      return (
        <div
          ref={ref}
          className={`
            rounded-2xl overflow-hidden
            ${className}
          `
            .trim()
            .replace(/\s+/g, ' ')}
        >
          <Skeleton variant='card' aspectRatio={aspectRatio} />
        </div>
      );
    }

    // Custom children content
    if (children) {
      return (
        <motion.div
          ref={ref}
          className={`
            bg-lumen-surface border border-lumen-muted
            rounded-2xl overflow-hidden
            shadow-lumen-card
            ${isInteractive ? 'cursor-pointer' : ''}
            ${className}
          `
            .trim()
            .replace(/\s+/g, ' ')}
          onClick={onClick}
          whileHover={
            hasHoverEffects
              ? {
                  scale: 1.03,
                  borderColor: 'rgba(201, 169, 98, 0.4)',
                  boxShadow:
                    '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 0 20px rgba(201, 169, 98, 0.3)',
                }
              : undefined
          }
          whileTap={isInteractive ? { scale: 0.98 } : undefined}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          {...props}
        >
          {children}
        </motion.div>
      );
    }

    // Default card with poster and metadata
    return (
      <motion.div
        ref={ref}
        className={`
          group relative
          bg-lumen-surface border border-lumen-muted
          rounded-2xl overflow-hidden
          shadow-lumen-card
          focus:outline-none focus:ring-2 focus:ring-lumen-gold focus:ring-offset-2 focus:ring-offset-lumen-void
          ${isInteractive ? 'cursor-pointer' : ''}
          ${className}
        `
          .trim()
          .replace(/\s+/g, ' ')}
        onClick={onClick}
        tabIndex={isInteractive ? 0 : undefined}
        role={isInteractive ? 'button' : undefined}
        whileHover={
          hasHoverEffects
            ? {
                scale: 1.03,
                borderColor: 'rgba(201, 169, 98, 0.4)',
                boxShadow:
                  '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05), 0 0 20px rgba(201, 169, 98, 0.3)',
              }
            : undefined
        }
        whileTap={isInteractive ? { scale: 0.98 } : undefined}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        {...props}
      >
        {/* Poster Image */}
        {poster && (
          <div className={`relative ${aspectRatioStyles[aspectRatio]} bg-lumen-surface`}>
            {!imageLoaded && <div className='absolute inset-0 animate-pulse bg-lumen-muted' />}
            <img
              src={poster}
              alt={title || 'Card poster'}
              className={`
                w-full h-full object-cover
                transition-opacity duration-300
                ${imageLoaded ? 'opacity-100' : 'opacity-0'}
              `}
              onLoad={() => setImageLoaded(true)}
              loading='lazy'
            />

            {/* Action Buttons - Appear on Hover */}
            {actions && hasHoverEffects && (
              <motion.div
                className='absolute inset-0 flex items-center justify-center gap-2 bg-lumen-void/60 backdrop-blur-sm'
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                {actions}
              </motion.div>
            )}

            {/* Default Action Buttons */}
            {!actions && hasHoverEffects && (
              <motion.div className='absolute inset-0 flex items-center justify-center gap-2 bg-lumen-void/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
                <button
                  className='p-3 bg-lumen-gold text-lumen-void rounded-full hover:brightness-110 transition-all'
                  onClick={(e) => {
                    e.stopPropagation();
                    // Play action
                  }}
                  aria-label='Play'
                >
                  <Play className='w-5 h-5' fill='currentColor' />
                </button>
                <button
                  className='p-3 bg-lumen-surface text-lumen-cream rounded-full hover:bg-lumen-muted transition-all'
                  onClick={(e) => {
                    e.stopPropagation();
                    // Add to list action
                  }}
                  aria-label='Add to list'
                >
                  <Plus className='w-5 h-5' />
                </button>
              </motion.div>
            )}
          </div>
        )}

        {/* Metadata Section */}
        {(title || subtitle || rating !== undefined || metadata) && (
          <div className='p-3 space-y-1'>
            {/* Title */}
            {title && (
              <h3 className='text-sm font-semibold text-lumen-cream line-clamp-1'>{title}</h3>
            )}

            {/* Subtitle */}
            {subtitle && <p className='text-xs text-lumen-gold/80 line-clamp-1'>{subtitle}</p>}

            {/* Rating and Metadata */}
            <div className='flex items-center justify-between gap-2'>
              {/* Rating */}
              {rating !== undefined && (
                <div className='flex items-center gap-1'>
                  <Star className='w-3 h-3 text-lumen-gold fill-lumen-gold' />
                  <span className='text-xs font-medium text-lumen-gold'>{rating.toFixed(1)}</span>
                </div>
              )}

              {/* Metadata */}
              {metadata && metadata.length > 0 && (
                <div className='flex items-center gap-1.5 text-[9px] uppercase text-lumen-silver'>
                  {metadata.map((item, index) => (
                    <span key={index}>
                      {item}
                      {index < metadata.length - 1 && <span className='mx-1'>•</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
