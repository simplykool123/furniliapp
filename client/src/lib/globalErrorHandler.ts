// Global error handler for React Query and application errors
import { QueryCache, MutationCache, QueryClient } from '@tanstack/react-query';
import { queryClient } from './queryClient';

// Global error types
export interface GlobalError {
  id: string;
  timestamp: Date;
  type: 'query' | 'mutation' | 'network' | 'unknown';
  error: Error;
  context?: any;
}

// Global error store
class GlobalErrorHandler {
  private errors: GlobalError[] = [];
  private maxErrors = 50; // Keep last 50 errors
  private errorListeners: Array<(error: GlobalError) => void> = [];

  // Add error to store
  addError(error: Error, type: GlobalError['type'], context?: any) {
    const globalError: GlobalError = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      error,
      context,
    };

    this.errors.unshift(globalError);
    
    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // Notify listeners
    this.errorListeners.forEach(listener => listener(globalError));

    // Log error based on environment
    if (import.meta.env.PROD) {
      // In production, send to monitoring service
      this.logProductionError(globalError);
    } else {
      // In development, log to console
      console.error(`Global ${type} error:`, error, context);
    }
  }

  private logProductionError(error: GlobalError) {
    // Enhanced logging for production monitoring
    const errorData = {
      errorId: error.id,
      timestamp: error.timestamp.toISOString(),
      type: error.type,
      message: error.error.message,
      stack: error.error.stack,
      url: window.location.href,
      userAgent: navigator.userAgent,
      context: error.context,
    };

    // In a real production app, send this to your monitoring service
    // e.g., Sentry, DataDog, CloudWatch, etc.
    console.error('Production Error Log:', errorData);
  }

  // Get recent errors
  getRecentErrors(limit = 10): GlobalError[] {
    return this.errors.slice(0, limit);
  }

  // Clear all errors
  clearErrors() {
    this.errors = [];
  }

  // Subscribe to error events
  onError(listener: (error: GlobalError) => void) {
    this.errorListeners.push(listener);
    
    return () => {
      const index = this.errorListeners.indexOf(listener);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  // Get error statistics
  getErrorStats() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const recentErrors = this.errors.filter(e => e.timestamp > oneHourAgo);
    
    const stats = {
      total: this.errors.length,
      lastHour: recentErrors.length,
      byType: {} as Record<string, number>,
    };

    this.errors.forEach(error => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
    });

    return stats;
  }
}

// Create global instance
export const globalErrorHandler = new GlobalErrorHandler();

// Enhanced query error handler
export const handleQueryError = (error: Error, query: any) => {
  globalErrorHandler.addError(error, 'query', {
    queryKey: query.queryKey,
    state: query.state,
  });

  // Handle specific error types
  if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
    // Handle authentication errors
    localStorage.removeItem('authToken');
    // Redirect to login if needed
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
    // Handle network errors - retry with exponential backoff is already handled in queryClient
    console.warn('Network error detected, retries will be handled automatically');
  }
};

// Enhanced mutation error handler
export const handleMutationError = (error: Error, variables: any, context: any) => {
  globalErrorHandler.addError(error, 'mutation', {
    variables,
    context,
  });

  // Handle specific mutation errors
  if (error.message?.includes('413') || error.message?.includes('too large')) {
    // Handle file size errors
    console.error('File too large for upload');
  } else if (error.message?.includes('422') || error.message?.includes('validation')) {
    // Handle validation errors
    console.error('Validation error in mutation');
  }
};

// Setup global error handlers for React Query
export const setupGlobalErrorHandlers = (client: QueryClient) => {
  // Query error handler
  client.getQueryCache().config.onError = handleQueryError;
  
  // Mutation error handler  
  client.getMutationCache().config.onError = handleMutationError;

  // Global unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    globalErrorHandler.addError(
      new Error(event.reason), 
      'unknown', 
      { type: 'unhandledrejection' }
    );
  });

  // Global error handler
  window.addEventListener('error', (event) => {
    globalErrorHandler.addError(
      new Error(event.error || event.message), 
      'unknown', 
      { type: 'globalError', filename: event.filename, lineno: event.lineno }
    );
  });
};

// Hook for components to access error state
export const useGlobalErrors = () => {
  const [errors, setErrors] = React.useState<GlobalError[]>([]);
  
  React.useEffect(() => {
    const unsubscribe = globalErrorHandler.onError((error) => {
      setErrors(current => [error, ...current.slice(0, 9)]); // Keep last 10
    });
    
    return unsubscribe;
  }, []);

  return {
    errors,
    clearErrors: () => {
      globalErrorHandler.clearErrors();
      setErrors([]);
    },
    stats: globalErrorHandler.getErrorStats(),
  };
};

// React import for the hook
import React from 'react';