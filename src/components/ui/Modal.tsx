/**
 * 🎬 Modal Component - LUMEN Design System
 * Cinema Online - اونلاين سينما
 *
 * @description Modal component with animations and focus management
 * @author Cinema Online Team
 * @version 2.0.0
 *
 * Implements Requirements:
 * - 7.1: Modal backdrop styles (fixed positioning, void background with 80% opacity, backdrop-blur-xl)
 * - 7.2: Modal container styles (surface background, rounded-3xl, lumen-card shadow, max-width constraints)
 * - 7.3: Open animation (fade-in opacity + scale from 0.95 to 1 over 300ms with ease-out)
 * - 7.4: Close animation (fade-out opacity + scale from 1 to 0.95 over 200ms with ease-in)
 * - 7.5: Close button at top-right with minimum 44x44px touch target
 * - 7.6: Focus trap using custom hook
 * - 7.7: Escape key handler to close modal, restore focus to trigger element
 * - 15.3: Focus management and keyboard navigation
 */

import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal content */
  children: ReactNode;
  /** Modal size */
  size?: ModalSize;
  /** Whether clicking the backdrop closes the modal */
  closeOnBackdropClick?: boolean;
  /** Whether pressing escape closes the modal */
  closeOnEscape?: boolean;
  /** Additional className for the modal container */
  className?: string;
}

/**
 * Size styles with max-width constraints
 * - sm: max-w-md (28rem / 448px)
 * - md: max-w-lg (32rem / 512px)
 * - lg: max-w-2xl (42rem / 672px)
 * - xl: max-w-4xl (56rem / 896px)
 */
const sizeStyles: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className = '',
}: ModalProps) {
  // Focus trap with escape key handler
  const containerRef = useFocusTrap({
    isActive: isOpen,
    onEscape: closeOnEscape ? onClose : undefined,
    restoreFocus: true,
  });

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle backdrop click
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center p-4'
      onClick={handleBackdropClick}
      aria-modal='true'
      role='dialog'
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Backdrop */}
      <div
        className='absolute inset-0 bg-lumen-void/80 backdrop-blur-xl animate-in fade-in duration-300'
        aria-hidden='true'
      />

      {/* Modal Container */}
      <div
        ref={containerRef as React.RefObject<HTMLDivElement>}
        className={`
          relative w-full ${sizeStyles[size]}
          bg-lumen-surface rounded-3xl shadow-lumen-card
          p-6 md:p-8
          animate-in fade-in zoom-in-95 duration-300 ease-out
          ${className}
        `
          .trim()
          .replace(/\s+/g, ' ')}
      >
        {/* Header */}
        <div className='flex items-start justify-between mb-6'>
          {title && (
            <h2 id='modal-title' className='text-xl md:text-2xl font-semibold text-lumen-cream'>
              {title}
            </h2>
          )}

          {/* Close Button */}
          <button
            type='button'
            onClick={onClose}
            className='
              inline-flex items-center justify-center
              min-w-[2.75rem] min-h-[2.75rem]
              rounded-xl
              text-lumen-silver hover:text-lumen-cream
              hover:bg-white/10
              transition-all duration-normal
              focus:outline-none focus:ring-[3px] focus:ring-lumen-gold focus:ring-offset-2 focus:ring-offset-lumen-void
              -mt-1 -mr-1
            '
            aria-label='Close modal'
          >
            <X className='w-5 h-5' aria-hidden='true' />
          </button>
        </div>

        {/* Content */}
        <div className='text-lumen-cream'>{children}</div>
      </div>
    </div>
  );
}

export default Modal;
