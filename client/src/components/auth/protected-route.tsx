import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LoginForm } from './login-form';
import { RegisterForm } from './register-form';
import { Loader2, Shield, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { User } from '@shared/schema';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: User['role'][];
  fallback?: React.ReactNode;
  showRegister?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requiredRoles = [], 
  fallback,
  showRegister = false 
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading, hasAnyRole } = useAuth();
  const [showLogin, setShowLogin] = React.useState(!showRegister);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show login/register if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="w-full max-w-md">
          {showLogin ? (
            <LoginForm
              onSuccess={() => {
                // Authentication state will update automatically
              }}
              onRegisterClick={() => setShowLogin(false)}
              onForgotPasswordClick={() => {
                // TODO: Implement forgot password modal
                console.log('Forgot password clicked');
              }}
            />
          ) : (
            <RegisterForm
              onSuccess={() => setShowLogin(true)}
              onLoginClick={() => setShowLogin(true)}
            />
          )}
        </div>
      </div>
    );
  }

  // Check role-based permissions
  if (requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl">Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access this page
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertDescription>
                This page requires one of the following roles: {requiredRoles.join(', ')}
              </AlertDescription>
            </Alert>
            <p className="text-sm text-muted-foreground">
              Your current role: <span className="font-medium">{user?.role}</span>
            </p>
            <Button 
              onClick={() => window.history.back()}
              variant="outline"
              className="w-full"
            >
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is authenticated and has required permissions
  return <>{children}</>;
}

// Specific role-based route wrappers
export function AdminRoute({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['admin']} fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}

export function ManagerRoute({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['admin', 'lab_manager']} fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}

export function StaffRoute({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={['admin', 'lab_manager', 'technician', 'analyst']} fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}