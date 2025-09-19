import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { subscribeWithSelector } from 'zustand/middleware';
import { createAuthSlice } from './authSlice';
import { createProjectSlice } from './projectSlice';
import { createUISlice } from './uiSlice';
import { createSettingsSlice } from './settingsSlice';
import { settingsUtils } from './settingsSlice';
import type { AppStore, PersistedState } from './types';

// Create the main store with all slices
export const useStore = create<AppStore>()(
  subscribeWithSelector(
    persist(
      (...args) => ({
        // Spread all slice states and actions
        ...createAuthSlice(...args),
        ...createProjectSlice(...args),
        ...createUISlice(...args),
        ...createSettingsSlice(...args),

        // Global actions
        reset: () => {
          const [set, get] = args;
          
          // Reset all slices to their initial state
          set((state) => ({
            ...state,
            // Auth reset
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            lastActivity: null,
            sessionExpiry: null,

            // Project reset
            currentProject: null,
            projects: [],
            projectMembers: [],

            // UI reset
            mobileMenuOpen: false,
            notifications: [],
            modals: {},
            activeTab: null,
            searchQuery: '',
            filters: {},
            sortOrder: {},
            pageLoading: {},
            globalLoading: false,
          }));
        },

        hydrate: () => {
          const [set, get] = args;
          const state = get();
          
          // Apply theme from persisted preferences
          settingsUtils.applyTheme(state.preferences.theme);
          
          // Sync sidebar state from preferences to UI state
          set((state) => ({
            ...state,
            sidebarCollapsed: state.preferences.sidebarCollapsed,
          }));
        },
      }),
      {
        name: 'labpilot-store',
        storage: createJSONStorage(() => localStorage),
        
        // Only persist specific parts of the state
        partialize: (state): PersistedState => ({
          preferences: state.preferences,
          lastProject: state.currentProject?.id || null,
          recentProjects: state.projects.slice(0, 5).map(p => p.id),
        }),

        // Merge persisted state with initial state
        onRehydrateStorage: () => {
          return (state, error) => {
            if (error) {
              console.error('Failed to rehydrate store:', error);
            } else if (state) {
              // Apply theme after rehydration
              state.hydrate();
            }
          };
        },

        // Version the storage for migrations
        version: 1,

        // Migration function for future updates
        migrate: (persistedState: any, version: number) => {
          if (version === 0) {
            // Migration from version 0 to 1
            // Add any necessary migrations here
          }
          return persistedState as PersistedState;
        },
      }
    )
  )
);

// Initialize store
const initializeStore = () => {
  // Listen for system theme changes
  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleThemeChange = () => {
      const state = useStore.getState();
      if (state.preferences.theme === 'system') {
        settingsUtils.applyTheme('system');
      }
    };

    // Add listener for system theme changes
    mediaQuery.addEventListener('change', handleThemeChange);

    // Session management
    let inactivityTimer: NodeJS.Timeout;
    const SESSION_WARNING_TIME = 25 * 60 * 1000; // 25 minutes
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer);
      
      const state = useStore.getState();
      if (state.isAuthenticated) {
        state.auth.updateLastActivity();
        
        inactivityTimer = setTimeout(() => {
          // Show session warning
          state.ui.addNotification({
            type: 'warning',
            title: 'Session expiring soon',
            description: 'Your session will expire in 5 minutes due to inactivity.',
            duration: 0, // Don't auto-dismiss
            action: {
              label: 'Stay logged in',
              onClick: () => {
                state.auth.updateLastActivity();
              },
            },
          });

          // Auto-logout after warning period
          setTimeout(() => {
            const currentState = useStore.getState();
            if (currentState.isAuthenticated) {
              currentState.auth.logout();
              currentState.ui.addNotification({
                type: 'info',
                title: 'Session expired',
                description: 'You have been logged out due to inactivity.',
                duration: 5000,
              });
            }
          }, 5 * 60 * 1000); // 5 minutes after warning
          
        }, SESSION_WARNING_TIME);
      }
    };

    // Track user activity
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      document.addEventListener(event, resetInactivityTimer, true);
    });

    // Cleanup function
    return () => {
      mediaQuery.removeEventListener('change', handleThemeChange);
      clearTimeout(inactivityTimer);
      activityEvents.forEach(event => {
        document.removeEventListener(event, resetInactivityTimer, true);
      });
    };
  }
};

// Initialize the store when the module loads
if (typeof window !== 'undefined') {
  initializeStore();
}

// Export selector hooks and utilities
export * from './types';
export { authSelectors, authUtils } from './authSlice';
export { projectSelectors, projectUtils } from './projectSlice';
export { uiSelectors, uiUtils } from './uiSlice';
export { settingsSelectors, settingsUtils } from './settingsSlice';

// Dev tools integration
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Add store to window for debugging
  (window as any).__labpilot_store__ = useStore;
}