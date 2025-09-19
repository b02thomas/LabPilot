import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useStore } from './index';
import { settingsUtils } from './settingsSlice';

// Create a context for store initialization
interface StoreProviderContextValue {
  isInitialized: boolean;
}

const StoreProviderContext = createContext<StoreProviderContextValue>({
  isInitialized: false,
});

export const useStoreProvider = () => {
  const context = useContext(StoreProviderContext);
  if (!context) {
    throw new Error('useStoreProvider must be used within a StoreProvider');
  }
  return context;
};

interface StoreProviderProps {
  children: ReactNode;
}

export const StoreProvider: React.FC<StoreProviderProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = React.useState(false);

  useEffect(() => {
    // Initialize the store
    const initStore = async () => {
      try {
        // The store automatically hydrates from localStorage
        // We just need to ensure the theme is applied
        const state = useStore.getState();
        
        // Apply the persisted theme
        settingsUtils.applyTheme(state.preferences.theme);
        
        // Sync sidebar state from preferences to UI state
        if (state.preferences.sidebarCollapsed !== state.sidebarCollapsed) {
          state.ui.setSidebarCollapsed(state.preferences.sidebarCollapsed);
        }

        // Request notification permission if enabled in preferences
        if (state.preferences.notificationSettings.desktop) {
          await settingsUtils.requestNotificationPermission();
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize store:', error);
        // Still mark as initialized to prevent infinite loading
        setIsInitialized(true);
      }
    };

    initStore();
  }, []);

  // Listen for theme changes from system
  useEffect(() => {
    if (!isInitialized) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = () => {
      const state = useStore.getState();
      if (state.preferences.theme === 'system') {
        settingsUtils.applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [isInitialized]);

  // Sync sidebar preference when it changes in UI
  useEffect(() => {
    if (!isInitialized) return;

    const unsubscribe = useStore.subscribe(
      (state) => state.sidebarCollapsed,
      (sidebarCollapsed) => {
        const state = useStore.getState();
        if (state.preferences.sidebarCollapsed !== sidebarCollapsed) {
          state.settings.updatePreferences({ sidebarCollapsed });
        }
      }
    );

    return unsubscribe;
  }, [isInitialized]);

  return (
    <StoreProviderContext.Provider value={{ isInitialized }}>
      {children}
    </StoreProviderContext.Provider>
  );
};

// Higher-order component for components that need the store to be initialized
export function withStoreProvider<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <StoreProvider>
      <Component {...props} />
    </StoreProvider>
  );

  WrappedComponent.displayName = `withStoreProvider(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook to wait for store initialization
export const useStoreInitialized = () => {
  const { isInitialized } = useStoreProvider();
  return isInitialized;
};

// Loading component for store initialization
export const StoreLoadingFallback: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <p className="text-sm text-muted-foreground">Initializing application...</p>
    </div>
  </div>
);

// Protected route wrapper that waits for store initialization
interface StoreProtectedProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const StoreProtected: React.FC<StoreProtectedProps> = ({ 
  children, 
  fallback = <StoreLoadingFallback /> 
}) => {
  const isInitialized = useStoreInitialized();
  
  if (!isInitialized) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};