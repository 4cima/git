import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { ErrorMessage } from './ErrorMessage';
import { logger } from '../../lib/logger';
import { useQueryClient } from '@tanstack/react-query';

interface PageErrorBoundaryProps {
  children: React.ReactNode;
  pageName: string;
}

export const PageErrorBoundary: React.FC<PageErrorBoundaryProps> = ({ 
  children, 
  pageName 
}) => {
  const queryClient = useQueryClient();
  
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <ErrorMessage
            type="generic"
            title="حدث خطأ غير متوقع"
            message={`عذراً، حدث خطأ أثناء عرض صفحة ${pageName}. يرجى المحاولة مرة أخرى.`}
            onRetry={() => window.location.reload()}
            showHomeButton
            showBackButton
          />
        </div>
      }
      onError={(error, errorInfo) => {
        logger.error(`${pageName} Error Boundary`, {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack
        });
      }}
      onReset={() => {
        queryClient.invalidateQueries();
      }}
    >
      {children}
    </ErrorBoundary>
  );
};
