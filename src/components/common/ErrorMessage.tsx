'use client'

import React from 'react';
import { AlertCircle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '../../lib/utils';
import { useLang } from '../../state/useLang';

export type ErrorType = 'network' | 'notFound' | 'server' | 'validation' | 'generic';

interface ErrorMessageProps {
  type?: ErrorType;
  title?: string;
  message?: string;
  error?: Error | unknown;
  onRetry?: () => void;
  showHomeButton?: boolean;
  showBackButton?: boolean;
  className?: string;
}

const ERROR_CONFIGS: Record<ErrorType, { 
  icon: React.ReactNode; 
  defaultTitle: { ar: string; en: string }; 
  defaultMessage: { ar: string; en: string } 
}> = {
  network: {
    icon: <AlertCircle className="w-12 h-12 text-amber-500" />,
    defaultTitle: { ar: 'خطأ في الاتصال', en: 'Connection Error' },
    defaultMessage: { 
      ar: 'تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.',
      en: 'Unable to connect to the server. Please check your internet connection and try again.'
    },
  },
  notFound: {
    icon: <AlertCircle className="w-12 h-12 text-yellow-500" />,
    defaultTitle: { ar: 'المحتوى غير موجود', en: 'Content Not Found' },
    defaultMessage: { 
      ar: 'عذراً، لم نتمكن من العثور على المحتوى المطلوب.',
      en: 'Sorry, we could not find the requested content.'
    },
  },
  server: {
    icon: <AlertCircle className="w-12 h-12 text-red-500" />,
    defaultTitle: { ar: 'خطأ في الخادم', en: 'Server Error' },
    defaultMessage: { 
      ar: 'حدث خطأ في الخادم. يرجى المحاولة مرة أخرى لاحقاً.',
      en: 'A server error occurred. Please try again later.'
    },
  },
  validation: {
    icon: <AlertCircle className="w-12 h-12 text-orange-500" />,
    defaultTitle: { ar: 'خطأ في البيانات', en: 'Data Error' },
    defaultMessage: { 
      ar: 'البيانات المدخلة غير صحيحة. يرجى التحقق والمحاولة مرة أخرى.',
      en: 'The entered data is incorrect. Please check and try again.'
    },
  },
  generic: {
    icon: <AlertCircle className="w-12 h-12 text-amber-500" />,
    defaultTitle: { ar: 'حدث خطأ', en: 'An Error Occurred' },
    defaultMessage: { 
      ar: 'عذراً، حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.',
      en: 'Sorry, an unexpected error occurred. Please try again.'
    },
  },
};

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  type = 'generic',
  title,
  message,
  error,
  onRetry,
  showHomeButton = false,
  showBackButton = false,
  className,
}) => {
  const { lang } = useLang();
  const config = ERROR_CONFIGS[type];
  
  // Always call hooks unconditionally
  const router = useRouter();
  const pathname = usePathname();

  // Extract error message if error object is provided
  const errorMessage = error instanceof Error ? error.message : String(error || '');
  const displayMessage = message || config.defaultMessage[lang];
  const displayTitle = title || config.defaultTitle[lang];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-amber-950/20 backdrop-blur-md border border-amber-500/10 rounded-2xl',
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      {/* Icon */}
      <div className="mb-4" aria-hidden="true">
        {config.icon}
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-amber-400 mb-2 font-amiri">
        {displayTitle}
      </h2>

      {/* Message */}
      <p className="text-amber-100/60 mb-6 max-w-md">
        {displayMessage}
      </p>

      {/* Error details (only in development) */}
      {process.env.NODE_ENV === 'development' && errorMessage && (
        <details className="mb-6 text-left max-w-md w-full">
          <summary className="cursor-pointer text-sm text-amber-500/60 hover:text-amber-500">
            {lang === 'ar' ? 'تفاصيل الخطأ (للمطورين)' : 'Error Details (for developers)'}
          </summary>
          <pre className="mt-2 p-4 bg-amber-950/40 rounded-lg text-xs overflow-auto text-amber-300">
            {errorMessage}
          </pre>
        </details>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-center">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
            aria-label={lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            <span>{lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}</span>
          </button>
        )}

        {showBackButton && (
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-950/60 hover:bg-amber-950/80 text-amber-400 border border-amber-500/20 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            aria-label={lang === 'ar' ? 'العودة للخلف' : 'Go Back'}
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>{lang === 'ar' ? 'رجوع' : 'Back'}</span>
          </button>
        )}

        {showHomeButton && (
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-950/60 hover:bg-amber-950/80 text-amber-400 border border-amber-500/20 rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            aria-label={lang === 'ar' ? 'العودة للصفحة الرئيسية' : 'Go to Home'}
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            <span>{lang === 'ar' ? 'الصفحة الرئيسية' : 'Home'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;
