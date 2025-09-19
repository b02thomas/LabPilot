import { useEffect, useCallback } from 'react';
import { useStore } from '@/store';
import { authService, type LoginCredentials, type RegisterCredentials } from '@/services/auth';
import type { User } from '@shared/schema';

export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    auth: {
      setUser,
      setLoading,
      setError,
      logout: logoutFromStore,
      updateUserProfile,
    },
    ui: { addNotification },
  } = useStore();

  // Initialize authentication state
  const initializeAuth = useCallback(async () => {
    setLoading(true);
    try {
      const currentUser = await authService.checkAuth();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [setUser, setLoading]);

  // Login function
  const login = useCallback(
    async (credentials: LoginCredentials) => {
      setLoading(true);
      setError(null);

      try {
        const response = await authService.login(credentials);
        setUser(response.user);
        
        addNotification({
          type: 'success',
          title: 'Welcome back!',
          description: 'You have been successfully logged in.',
        });

        return { success: true, user: response.user };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Login failed';
        setError(errorMessage);
        
        addNotification({
          type: 'error',
          title: 'Login Failed',
          description: errorMessage,
        });

        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [setUser, setLoading, setError, addNotification]
  );

  // Register function
  const register = useCallback(
    async (credentials: RegisterCredentials) => {
      setLoading(true);
      setError(null);

      try {
        const response = await authService.register(credentials);
        
        addNotification({
          type: 'success',
          title: 'Registration Successful',
          description: response.message,
        });

        return { success: true, user: response.user };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Registration failed';
        setError(errorMessage);
        
        addNotification({
          type: 'error',
          title: 'Registration Failed',
          description: errorMessage,
        });

        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, addNotification]
  );

  // Logout function
  const logout = useCallback(async () => {
    setLoading(true);
    
    try {
      await authService.logout();
      logoutFromStore();
      
      addNotification({
        type: 'info',
        title: 'Logged Out',
        description: 'You have been successfully logged out.',
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Logout failed';
      
      // Even if logout API fails, clear local state
      logoutFromStore();
      
      addNotification({
        type: 'warning',
        title: 'Logout Warning',
        description: 'You have been logged out, but there was an issue with the server.',
      });

      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [setLoading, logoutFromStore, addNotification]);

  // Change password function
  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await authService.changePassword({
          currentPassword,
          newPassword,
        });

        addNotification({
          type: 'success',
          title: 'Password Changed',
          description: response.message,
        });

        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Password change failed';
        setError(errorMessage);
        
        addNotification({
          type: 'error',
          title: 'Password Change Failed',
          description: errorMessage,
        });

        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, addNotification]
  );

  // Request password reset function
  const requestPasswordReset = useCallback(
    async (email: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await authService.requestPasswordReset({ email });
        
        addNotification({
          type: 'info',
          title: 'Reset Email Sent',
          description: response.message,
        });

        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Password reset request failed';
        setError(errorMessage);
        
        addNotification({
          type: 'error',
          title: 'Reset Request Failed',
          description: errorMessage,
        });

        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, addNotification]
  );

  // Reset password with token function
  const resetPassword = useCallback(
    async (token: string, password: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await authService.resetPassword({ token, password });
        
        addNotification({
          type: 'success',
          title: 'Password Reset',
          description: response.message,
        });

        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
        setError(errorMessage);
        
        addNotification({
          type: 'error',
          title: 'Password Reset Failed',
          description: errorMessage,
        });

        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, addNotification]
  );

  // Verify email function
  const verifyEmail = useCallback(
    async (token: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await authService.verifyEmail(token);
        
        // Update user's email verification status
        if (user) {
          updateUserProfile({ emailVerified: true });
        }
        
        addNotification({
          type: 'success',
          title: 'Email Verified',
          description: response.message,
        });

        return { success: true };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Email verification failed';
        setError(errorMessage);
        
        addNotification({
          type: 'error',
          title: 'Email Verification Failed',
          description: errorMessage,
        });

        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, addNotification, user, updateUserProfile]
  );

  // Refresh user data
  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authService.checkAuth();
      setUser(currentUser);
      return currentUser;
    } catch (error) {
      setUser(null);
      return null;
    }
  }, [setUser]);

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Helper functions for role checking
  const hasRole = useCallback((role: User['role']) => {
    return user?.role === role;
  }, [user]);

  const hasAnyRole = useCallback((roles: User['role'][]) => {
    return user ? roles.includes(user.role) : false;
  }, [user]);

  const hasAdminPrivileges = useCallback(() => {
    return hasAnyRole(['admin', 'lab_manager']);
  }, [hasAnyRole]);

  const canManageProjects = useCallback(() => {
    return hasAnyRole(['admin', 'lab_manager']);
  }, [hasAnyRole]);

  const canAssignTasks = useCallback(() => {
    return hasAnyRole(['admin', 'lab_manager']);
  }, [hasAnyRole]);

  const canDeleteExperiments = useCallback(() => {
    return hasAnyRole(['admin', 'lab_manager']);
  }, [hasAnyRole]);

  const canAccessAdmin = useCallback(() => {
    return hasRole('admin');
  }, [hasRole]);

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,

    // Actions
    login,
    register,
    logout,
    changePassword,
    requestPasswordReset,
    resetPassword,
    verifyEmail,
    refreshUser,

    // Utilities
    hasRole,
    hasAnyRole,
    hasAdminPrivileges,
    canManageProjects,
    canAssignTasks,
    canDeleteExperiments,
    canAccessAdmin,
  };
}