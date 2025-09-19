import { StateCreator } from 'zustand';
import type { User } from '@shared/schema';
import type { AuthSlice, AppStore } from './types';

// Session timeout duration (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

export const createAuthSlice: StateCreator<
  AppStore,
  [],
  [],
  AuthSlice
> = (set, get) => ({
  // Initial auth state
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  lastActivity: null,
  sessionExpiry: null,

  // Auth actions
  auth: {
    setUser: (user: User | null) => {
      set((state) => {
        const now = Date.now();
        return {
          ...state,
          user,
          isAuthenticated: !!user,
          lastActivity: user ? now : null,
          sessionExpiry: user ? now + SESSION_TIMEOUT : null,
          error: null,
        };
      });
    },

    setAuthenticated: (isAuthenticated: boolean) => {
      set((state) => ({
        ...state,
        isAuthenticated,
        error: null,
      }));
    },

    setLoading: (isLoading: boolean) => {
      set((state) => ({
        ...state,
        isLoading,
      }));
    },

    setError: (error: string | null) => {
      set((state) => ({
        ...state,
        error,
        isLoading: false,
      }));
    },

    updateLastActivity: () => {
      const state = get();
      if (state.isAuthenticated) {
        const now = Date.now();
        set((state) => ({
          ...state,
          lastActivity: now,
          sessionExpiry: now + SESSION_TIMEOUT,
        }));
      }
    },

    setSessionExpiry: (expiry: number | null) => {
      set((state) => ({
        ...state,
        sessionExpiry: expiry,
      }));
    },

    logout: () => {
      set((state) => ({
        ...state,
        user: null,
        isAuthenticated: false,
        lastActivity: null,
        sessionExpiry: null,
        error: null,
        isLoading: false,
      }));

      // Clear any UI state that should reset on logout
      const { ui } = get();
      ui.clearNotifications();
      ui.resetUIState();

      // Reset project state
      const { project } = get();
      project.setCurrentProject(null);
      project.setProjects([]);
      project.setProjectMembers([]);
    },

    updateUserProfile: (updates: Partial<User>) => {
      set((state) => ({
        ...state,
        user: state.user ? { ...state.user, ...updates } : null,
      }));
    },
  },
});

// Utility functions for auth management
export const authUtils = {
  // Check if the current session is expired
  isSessionExpired: (sessionExpiry: number | null): boolean => {
    if (!sessionExpiry) return false;
    return Date.now() > sessionExpiry;
  },

  // Check if the session is about to expire (within 5 minutes)
  isSessionExpiringSoon: (sessionExpiry: number | null): boolean => {
    if (!sessionExpiry) return false;
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() > (sessionExpiry - fiveMinutes);
  },

  // Get time until session expires in milliseconds
  getTimeUntilExpiry: (sessionExpiry: number | null): number => {
    if (!sessionExpiry) return 0;
    return Math.max(0, sessionExpiry - Date.now());
  },

  // Format user display name
  getUserDisplayName: (user: User | null): string => {
    if (!user) return 'Unknown User';
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) return user.firstName;
    if (user.lastName) return user.lastName;
    return user.email || 'Unknown User';
  },

  // Get user initials for avatar
  getUserInitials: (user: User | null): string => {
    if (!user) return 'U';
    
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    
    if (user.firstName) {
      return user.firstName.charAt(0).toUpperCase();
    }
    
    if (user.lastName) {
      return user.lastName.charAt(0).toUpperCase();
    }
    
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    
    return 'U';
  },

  // Check if user has specific role
  hasRole: (user: User | null, role: User['role']): boolean => {
    return user?.role === role;
  },

  // Check if user has any of the specified roles
  hasAnyRole: (user: User | null, roles: User['role'][]): boolean => {
    return user ? roles.includes(user.role) : false;
  },

  // Check if user is admin or lab manager (higher privileges)
  hasAdminPrivileges: (user: User | null): boolean => {
    return authUtils.hasAnyRole(user, ['admin', 'lab_manager']);
  },

  // Check if user can manage projects
  canManageProjects: (user: User | null): boolean => {
    return authUtils.hasAnyRole(user, ['admin', 'lab_manager']);
  },

  // Check if user can assign tasks
  canAssignTasks: (user: User | null): boolean => {
    return authUtils.hasAnyRole(user, ['admin', 'lab_manager']);
  },

  // Check if user can delete experiments
  canDeleteExperiments: (user: User | null): boolean => {
    return authUtils.hasAnyRole(user, ['admin', 'lab_manager']);
  },

  // Check if user can access admin features
  canAccessAdmin: (user: User | null): boolean => {
    return authUtils.hasRole(user, 'admin');
  },
};

// Auth selectors for easy access in components
export const authSelectors = {
  // Get current user
  getUser: (state: AppStore) => state.user,
  
  // Get authentication status
  isAuthenticated: (state: AppStore) => state.isAuthenticated,
  
  // Get loading state
  isLoading: (state: AppStore) => state.isLoading,
  
  // Get error state
  getError: (state: AppStore) => state.error,
  
  // Get user display name
  getUserDisplayName: (state: AppStore) => authUtils.getUserDisplayName(state.user),
  
  // Get user initials
  getUserInitials: (state: AppStore) => authUtils.getUserInitials(state.user),
  
  // Get user role
  getUserRole: (state: AppStore) => state.user?.role,
  
  // Check if session is expired
  isSessionExpired: (state: AppStore) => authUtils.isSessionExpired(state.sessionExpiry),
  
  // Check if session is expiring soon
  isSessionExpiringSoon: (state: AppStore) => authUtils.isSessionExpiringSoon(state.sessionExpiry),
  
  // Get time until session expires
  getTimeUntilExpiry: (state: AppStore) => authUtils.getTimeUntilExpiry(state.sessionExpiry),
  
  // Permission checks
  hasAdminPrivileges: (state: AppStore) => authUtils.hasAdminPrivileges(state.user),
  canManageProjects: (state: AppStore) => authUtils.canManageProjects(state.user),
  canAssignTasks: (state: AppStore) => authUtils.canAssignTasks(state.user),
  canDeleteExperiments: (state: AppStore) => authUtils.canDeleteExperiments(state.user),
  canAccessAdmin: (state: AppStore) => authUtils.canAccessAdmin(state.user),
};