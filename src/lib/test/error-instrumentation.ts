/**
 * Error instrumentation for test events
 * Sets up global error handling to emit TEST_EVT:error events
 */

import { emitTestEvent } from './event-emitter';
import { TestEventKind, type ErrorTestEvent } from '@/types/test-events';

/**
 * Extract error code from error object
 */
function extractErrorCode(error: Error): string | undefined {
  // Check for common error code properties
  if ('code' in error && typeof error.code === 'string') {
    return error.code;
  }
  if ('name' in error && typeof error.name === 'string') {
    return error.name;
  }
  return undefined;
}

/**
 * Get correlation ID from current context
 * In practice, this could be extracted from current request headers or context
 */
function getCurrentCorrelationId(): string | undefined {
  // For now, try to find the most recent correlation ID from any ongoing request
  // This is a simplified implementation - in a real app you might have a context provider
  return undefined;
}

/**
 * Setup global error instrumentation to emit TEST_EVT:error events
 */
export function setupErrorInstrumentation(): () => void {
  // Handle unhandled errors
  const handleError = (event: ErrorEvent) => {
    const errorEvent: Omit<ErrorTestEvent, 'timestamp'> = {
      kind: TestEventKind.ERROR,
      scope: 'global',
      message: event.message,
      code: event.error ? extractErrorCode(event.error) : undefined,
      correlationId: getCurrentCorrelationId(),
    };

    emitTestEvent(errorEvent);
  };

  // Handle unhandled promise rejections
  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const error = event.reason;
    let message = 'Unhandled promise rejection';
    let code: string | undefined;

    if (error instanceof Error) {
      message = error.message;
      code = extractErrorCode(error);
    } else if (typeof error === 'string') {
      message = error;
    } else if (error && typeof error === 'object') {
      message = error.toString();
    }

    const errorEvent: Omit<ErrorTestEvent, 'timestamp'> = {
      kind: TestEventKind.ERROR,
      scope: 'promise',
      message,
      code,
      correlationId: getCurrentCorrelationId(),
    };

    emitTestEvent(errorEvent);
  };

  // Add event listeners
  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);

  // Return cleanup function
  return () => {
    window.removeEventListener('error', handleError);
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  };
}

/**
 * Emit a component-level error event
 * This can be called from error boundaries or catch blocks
 */
export function emitComponentError(
  error: Error,
  componentName?: string,
  correlationId?: string
): void {
  const errorEvent: Omit<ErrorTestEvent, 'timestamp'> = {
    kind: TestEventKind.ERROR,
    scope: componentName ? `component:${componentName}` : 'component',
    message: error.message,
    code: extractErrorCode(error),
    correlationId,
  };

  emitTestEvent(errorEvent);
}