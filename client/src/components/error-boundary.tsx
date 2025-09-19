import { Component, ReactNode, ErrorInfo } from 'react';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

// Generic Error Boundary for React errors
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Report to monitoring service
    this.reportError(error, errorInfo);
    
    this.props.onError?.(error, errorInfo);
  }

  private reportError(error: Error, errorInfo: ErrorInfo) {
    // Here you would integrate with your error reporting service
    // For example: Sentry, LogRocket, Bugsnag, etc.
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };
    
    // Send to your error reporting service
    console.error('Error Report:', errorReport);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle>Something went wrong</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  An unexpected error occurred. Please try refreshing the page.
                </AlertDescription>
              </Alert>
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => window.location.reload()} 
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Page
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => this.setState({ hasError: false, error: undefined })}
                  className="flex-1"
                >
                  Try Again
                </Button>
              </div>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    Error Details (Development)
                  </summary>
                  <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Query Error Boundary with automatic retry
interface QueryErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

export function QueryErrorBoundary({ children, fallback }: QueryErrorBoundaryProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onError={(error) => {
            console.error('Query error boundary triggered:', error);
          }}
          fallback={
            fallback ? (
              <div>Error occurred</div> // Simplified fallback
            ) : (
              <QueryErrorFallback onReset={reset} />
            )
          }
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

// Default fallback component for query errors
interface QueryErrorFallbackProps {
  onReset: () => void;
  error?: Error;
}

function QueryErrorFallback({ onReset, error }: QueryErrorFallbackProps) {
  return (
    <div className="min-h-[200px] flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6 space-y-4 text-center">
          <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          
          <div>
            <h3 className="font-semibold">Failed to load data</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {error?.message || 'There was a problem loading this information.'}
            </p>
          </div>
          
          <Button onClick={onReset} size="sm" className="w-full">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Specific error boundaries for different sections
export function ExperimentErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <QueryErrorBoundary
      fallback={(error, reset) => (
        <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-destructive">Failed to load experiments</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {error.message}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={reset}
                className="mt-3"
              >
                Retry
              </Button>
            </div>
          </div>
        </div>
      )}
    >
      {children}
    </QueryErrorBoundary>
  );
}

export function ChatErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <QueryErrorBoundary
      fallback={(error, reset) => (
        <Alert className="border-destructive/50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Chat temporarily unavailable: {error.message}</span>
            <Button variant="outline" size="sm" onClick={reset}>
              Reconnect
            </Button>
          </AlertDescription>
        </Alert>
      )}
    >
      {children}
    </QueryErrorBoundary>
  );
}

export function DashboardErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <QueryErrorBoundary
      fallback={(error, reset) => (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
              <div>
                <p className="font-medium">Dashboard data unavailable</p>
                <p className="text-sm text-muted-foreground">
                  {error.message}
                </p>
              </div>
              <Button onClick={reset} size="sm">
                Refresh Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    >
      {children}
    </QueryErrorBoundary>
  );
}