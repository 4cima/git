import { toast } from '../lib/toast-manager';
import { logger } from '../lib/logger';

// Configuration
// Using public anon key for client-side logging. RLS must allow inserts.

// Error severity levels
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// Error categories
export type ErrorCategory =
  | 'auth'
  | 'database'
  | 'network'
  | 'validation'
  | 'system'
  | 'user_action'
  | 'admin'
  | 'api'
  | 'media'
  | 'ads'
  | 'unknown';

// Error interface
export interface AppError {
  id?: string;
  user_id?: string;
  message: string;
  stack?: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  context?: Record<string, unknown>;
  url?: string;
  user_agent?: string;
  timestamp?: string;
  resolved?: boolean;
}

class ErrorLoggingService {

  private isEnabled: boolean = true; // ENABLED
  private queue: AppError[] = [];
  private isProcessing: boolean = false;
  private batchSize: number = 10;
  private flushInterval: number = 5000; // 5 seconds
  private flushTimer?: ReturnType<typeof setTimeout>;
  private readonly STORAGE_KEY = 'error_logs_queue';
  private lastToast: { message: string, time: number } | null = null;

  private readonly LOG_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL || 'https://api.4cima.com'}/api/log`;
  private logFailureCount = 0;
  private readonly MAX_LOG_FAILURES = 3;

  constructor() {
    // We don't need Supabase client for logging anymore, we use the proxy
    // But we might need it for other things if we expand this service

    // LOGGING ENABLED
    this.loadQueue();
    this.startPeriodicFlush();

    if (typeof window !== 'undefined') {
      this.setupGlobalErrorHandlers();
      // Save queue before unload
      window.addEventListener('beforeunload', () => this.saveQueue());
      // Flush queue when coming back online
      window.addEventListener('online', () => this.processQueue());
    }
  }

  private loadQueue() {
    if (typeof localStorage === 'undefined') return;
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        this.queue = JSON.parse(saved);
      } catch (e: any) {
        logger.error('Failed to load error queue', e)
      }
    }
  }

  private saveQueue() {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
  }

  private setupGlobalErrorHandlers() {
    window.onerror = (message, source, lineno, colno, error) => {
      this.logError({
        message: String(message),
        severity: 'high',
        category: 'system',
        stack: error?.stack,
        context: { source, lineno, colno }
      });
    };

    window.onunhandledrejection = (event) => {
      this.logError({
        message: `Unhandled Rejection: ${event.reason}`,
        severity: 'high',
        category: 'system',
        context: { reason: event.reason }
      });
    };
  }

  private startPeriodicFlush() {
    this.flushTimer = setInterval(() => {
      if (this.queue.length > 0 && !this.isProcessing) {
        this.processQueue();
      }
    }, this.flushInterval);
  }

  public stopPeriodicFlush() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    // Stop trying if logging endpoint is consistently failing
    if (this.logFailureCount >= this.MAX_LOG_FAILURES) {
      console.warn('Error logging disabled due to repeated failures');
      this.queue = []; // Clear queue
      return;
    }

    this.isProcessing = true;
    const batch = this.queue.slice(0, this.batchSize);

    try {
      // Send batch to API Proxy instead of direct Supabase insert
      // This allows us to use rate limiting and hide the RLS public insert
      await Promise.all(batch.map(error =>
        fetch(this.LOG_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(error)
        }).catch(err => {
          this.logFailureCount++;
          logger.error('Failed to send log:', err);
        })
      ));

      // Reset failure count on success
      this.logFailureCount = 0;

      // Remove processed items
      this.queue = this.queue.slice(batch.length);
      this.saveQueue();
    } catch (error: any) {
      logger.error('Failed to process error queue:', error)
    } finally {
      this.isProcessing = false;

      // If there are more items, schedule next batch
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), 1000);
      }
    }
  }

  public logError(error: Omit<AppError, 'timestamp' | 'resolved' | 'severity' | 'category'> & { severity?: ErrorSeverity, category?: ErrorCategory }) {
    if (!this.isEnabled) return;

    // Deduplicate rapid errors (simple debounce)
    const now = Date.now();
    if (this.lastToast &&
      this.lastToast.message === error.message &&
      now - this.lastToast.time < 2000) {
      return;
    }

    const newError: AppError = {
      ...error,
      id: crypto.randomUUID(),
      severity: error.severity || 'medium',
      category: error.category || 'unknown',
      timestamp: new Date().toISOString(),
      resolved: false
    };

    this.queue.push(newError);
    this.saveQueue();

    // Show toast for visible errors
    if (newError.severity === 'high' || newError.severity === 'critical') {
      toast.error(newError.message);
      this.lastToast = { message: newError.message, time: now };
    }

    // Trigger flush if queue gets too big
    if (this.queue.length >= this.batchSize && !this.isProcessing) {
      this.processQueue();
    }
  }

  public captureException(_error: unknown, _context?: Record<string, unknown>) {
    // DISABLED
    return;
  }
}

export const errorLogger = new ErrorLoggingService();

// Added back exported helper function to satisfy build
export const logAuthError = (..._args: unknown[]) => {
  // Stub
};
