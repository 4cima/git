import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../../lib/logger';
import { ErrorMessage } from './ErrorMessage';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error using logger system
    logger.error('React ErrorBoundary caught error', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Update state with error info
    this.setState({ errorInfo });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Use enhanced ErrorMessage component
      return (
        <ErrorMessage
          type="generic"
          title="حدث خطأ غير متوقع"
          message="عذراً، حدث خطأ أثناء عرض هذا المحتوى. يرجى المحاولة مرة أخرى."
          error={this.state.error}
          onRetry={this.handleReset}
          showHomeButton
          showBackButton
        />
      );
    }

    return this.props.children;
  }
}
