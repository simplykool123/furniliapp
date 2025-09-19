import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { queryClient } from '@/lib/queryClient';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  resetOnPropsChange?: boolean;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return { 
      hasError: true, 
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Enhanced error logging for production
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
    
    // Log error (in production, send to monitoring service)
    if (import.meta.env.PROD) {
      // In production, you would send this to your error monitoring service
      console.error('Production Error:', errorDetails);
    } else {
      console.error('Error caught by boundary:', error, errorInfo);
    }
    
    // Clear React Query cache to prevent stale data issues
    queryClient.clear();
    
    // Update state with error info
    this.setState({ errorInfo });
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    // Clear cache and reset state
    queryClient.clear();
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null
    });
  };
  
  handleGoHome = () => {
    // Clear cache and navigate to home
    queryClient.clear();
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="max-w-md mx-auto mt-8">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-lg">Something went wrong</CardTitle>
            <CardDescription>
              An unexpected error occurred. Please try refreshing the page.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={this.handleRetry} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={this.handleGoHome} variant="outline" className="flex-1">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </div>
            
            {this.state.errorId && (
              <p className="text-xs text-muted-foreground">
                Error ID: {this.state.errorId}
              </p>
            )}
            
            {import.meta.env.DEV && (
              <details className="text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground flex items-center gap-2">
                  <Bug className="h-4 w-4" />
                  Error Details (Development)
                </summary>
                <div className="mt-2 space-y-2">
                  <div className="text-xs bg-red-50 dark:bg-red-900/20 p-3 rounded border">
                    <strong>Error:</strong>
                    <pre className="mt-1 whitespace-pre-wrap">{this.state.error?.message}</pre>
                  </div>
                  {this.state.error?.stack && (
                    <div className="text-xs bg-gray-50 dark:bg-gray-900/50 p-3 rounded border">
                      <strong>Stack Trace:</strong>
                      <pre className="mt-1 whitespace-pre-wrap overflow-auto max-h-40">
                        {this.state.error.stack}
                      </pre>
                    </div>
                  )}
                  {this.state.errorInfo?.componentStack && (
                    <div className="text-xs bg-blue-50 dark:bg-blue-900/20 p-3 rounded border">
                      <strong>Component Stack:</strong>
                      <pre className="mt-1 whitespace-pre-wrap overflow-auto max-h-40">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}