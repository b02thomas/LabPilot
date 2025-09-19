import { StateCreator } from 'zustand';
import type { SettingsSlice, AppStore, UserPreferences, Theme } from './types';
import { DEFAULT_USER_PREFERENCES } from './types';

export const createSettingsSlice: StateCreator<
  AppStore,
  [],
  [],
  SettingsSlice
> = (set, get) => ({
  // Initial settings state
  preferences: DEFAULT_USER_PREFERENCES,
  isLoading: false,
  error: null,
  lastSaved: null,

  // Settings actions
  settings: {
    updatePreferences: (updates: Partial<UserPreferences>) => {
      set((state) => ({
        ...state,
        preferences: {
          ...state.preferences,
          ...updates,
        },
      }));
    },

    setTheme: (theme: Theme) => {
      set((state) => ({
        ...state,
        preferences: {
          ...state.preferences,
          theme,
        },
      }));

      // Apply theme to document
      settingsUtils.applyTheme(theme);
    },

    setLanguage: (language: UserPreferences['language']) => {
      set((state) => ({
        ...state,
        preferences: {
          ...state.preferences,
          language,
        },
      }));
    },

    setTimezone: (timezone: string) => {
      set((state) => ({
        ...state,
        preferences: {
          ...state.preferences,
          timezone,
        },
      }));
    },

    setDateFormat: (format: UserPreferences['dateFormat']) => {
      set((state) => ({
        ...state,
        preferences: {
          ...state.preferences,
          dateFormat: format,
        },
      }));
    },

    setTimeFormat: (format: UserPreferences['timeFormat']) => {
      set((state) => ({
        ...state,
        preferences: {
          ...state.preferences,
          timeFormat: format,
        },
      }));
    },

    updateNotificationSettings: (updates: Partial<UserPreferences['notificationSettings']>) => {
      set((state) => ({
        ...state,
        preferences: {
          ...state.preferences,
          notificationSettings: {
            ...state.preferences.notificationSettings,
            ...updates,
          },
        },
      }));
    },

    updateDashboardLayout: (updates: Partial<UserPreferences['dashboardLayout']>) => {
      set((state) => ({
        ...state,
        preferences: {
          ...state.preferences,
          dashboardLayout: {
            ...state.preferences.dashboardLayout,
            ...updates,
          },
        },
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

    savePreferences: async () => {
      const state = get();
      
      try {
        set((state) => ({ ...state, isLoading: true, error: null }));
        
        // In a real app, you would save to the server here
        // For now, we'll just simulate a save operation
        await new Promise((resolve) => setTimeout(resolve, 500));
        
        set((state) => ({
          ...state,
          isLoading: false,
          lastSaved: Date.now(),
        }));

        // Show success notification
        const { ui } = get();
        ui.addNotification({
          type: 'success',
          title: 'Preferences saved',
          description: 'Your preferences have been saved successfully.',
          duration: 3000,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to save preferences';
        
        set((state) => ({
          ...state,
          isLoading: false,
          error: errorMessage,
        }));

        // Show error notification
        const { ui } = get();
        ui.addNotification({
          type: 'error',
          title: 'Save failed',
          description: errorMessage,
          duration: 5000,
        });
      }
    },

    resetToDefaults: () => {
      set((state) => ({
        ...state,
        preferences: DEFAULT_USER_PREFERENCES,
        error: null,
      }));

      // Apply default theme
      settingsUtils.applyTheme(DEFAULT_USER_PREFERENCES.theme);

      // Show notification
      const { ui } = get();
      ui.addNotification({
        type: 'info',
        title: 'Preferences reset',
        description: 'All preferences have been reset to default values.',
        duration: 3000,
      });
    },
  },
});

// Utility functions for settings management
export const settingsUtils = {
  // Apply theme to document
  applyTheme: (theme: Theme) => {
    const root = document.documentElement;
    
    if (theme === 'system') {
      // Remove any manually set theme and let CSS media query handle it
      root.classList.remove('light', 'dark');
      
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(prefersDark ? 'dark' : 'light');
    } else {
      // Apply specific theme
      root.classList.remove('light', 'dark');
      root.classList.add(theme);
    }
  },

  // Get system theme preference
  getSystemTheme: (): 'light' | 'dark' => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },

  // Get effective theme (resolves 'system' to actual theme)
  getEffectiveTheme: (theme: Theme): 'light' | 'dark' => {
    return theme === 'system' ? settingsUtils.getSystemTheme() : theme;
  },

  // Format date according to user preference
  formatDate: (date: Date | string, format: UserPreferences['dateFormat']): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    switch (format) {
      case 'MM/dd/yyyy':
        return dateObj.toLocaleDateString('en-US');
      case 'dd/MM/yyyy':
        return dateObj.toLocaleDateString('en-GB');
      case 'yyyy-MM-dd':
        return dateObj.toISOString().split('T')[0];
      default:
        return dateObj.toLocaleDateString();
    }
  },

  // Format time according to user preference
  formatTime: (date: Date | string, format: UserPreferences['timeFormat']): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    switch (format) {
      case '12h':
        return dateObj.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
      case '24h':
        return dateObj.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
      default:
        return dateObj.toLocaleTimeString();
    }
  },

  // Format datetime according to user preferences
  formatDateTime: (
    date: Date | string, 
    dateFormat: UserPreferences['dateFormat'],
    timeFormat: UserPreferences['timeFormat']
  ): string => {
    const formattedDate = settingsUtils.formatDate(date, dateFormat);
    const formattedTime = settingsUtils.formatTime(date, timeFormat);
    return `${formattedDate} ${formattedTime}`;
  },

  // Get timezone-aware date
  getTimezoneDate: (date: Date | string, timezone: string): Date => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    try {
      // Create a new date in the specified timezone
      const utc = dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000);
      const targetTime = new Date(utc + (settingsUtils.getTimezoneOffset(timezone) * 60000));
      return targetTime;
    } catch (error) {
      console.warn('Invalid timezone:', timezone);
      return dateObj;
    }
  },

  // Get timezone offset in minutes
  getTimezoneOffset: (timezone: string): number => {
    try {
      const now = new Date();
      const utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
      const target = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
      return (utc.getTime() - target.getTime()) / 60000;
    } catch (error) {
      console.warn('Invalid timezone:', timezone);
      return 0;
    }
  },

  // Validate timezone
  isValidTimezone: (timezone: string): boolean => {
    try {
      Intl.DateTimeFormat('en-US', { timeZone: timezone });
      return true;
    } catch (error) {
      return false;
    }
  },

  // Get available timezones
  getAvailableTimezones: (): string[] => {
    return Intl.supportedValuesOf('timeZone');
  },

  // Check if notification permission is granted
  hasNotificationPermission: (): boolean => {
    return 'Notification' in window && Notification.permission === 'granted';
  },

  // Request notification permission
  requestNotificationPermission: async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  },

  // Send desktop notification
  sendDesktopNotification: (title: string, options?: NotificationOptions): void => {
    if (settingsUtils.hasNotificationPermission()) {
      new Notification(title, options);
    }
  },

  // Check if user preferences are modified from defaults
  hasModifiedPreferences: (preferences: UserPreferences): boolean => {
    return JSON.stringify(preferences) !== JSON.stringify(DEFAULT_USER_PREFERENCES);
  },

  // Get preferences diff from defaults
  getPreferencesDiff: (preferences: UserPreferences): Partial<UserPreferences> => {
    const diff: any = {};
    
    Object.keys(preferences).forEach((key) => {
      const prefKey = key as keyof UserPreferences;
      if (JSON.stringify(preferences[prefKey]) !== JSON.stringify(DEFAULT_USER_PREFERENCES[prefKey])) {
        diff[prefKey] = preferences[prefKey];
      }
    });
    
    return diff;
  },
};

// Settings selectors for easy access in components
export const settingsSelectors = {
  // Get all preferences
  getPreferences: (state: AppStore) => state.preferences,
  
  // Get specific preference values
  getTheme: (state: AppStore) => state.preferences.theme,
  getEffectiveTheme: (state: AppStore) => settingsUtils.getEffectiveTheme(state.preferences.theme),
  getLanguage: (state: AppStore) => state.preferences.language,
  getTimezone: (state: AppStore) => state.preferences.timezone,
  getDateFormat: (state: AppStore) => state.preferences.dateFormat,
  getTimeFormat: (state: AppStore) => state.preferences.timeFormat,
  
  // Get notification settings
  getNotificationSettings: (state: AppStore) => state.preferences.notificationSettings,
  areEmailNotificationsEnabled: (state: AppStore) => state.preferences.notificationSettings.email,
  arePushNotificationsEnabled: (state: AppStore) => state.preferences.notificationSettings.push,
  areDesktopNotificationsEnabled: (state: AppStore) => state.preferences.notificationSettings.desktop,
  
  // Get dashboard layout
  getDashboardLayout: (state: AppStore) => state.preferences.dashboardLayout,
  getWidgetOrder: (state: AppStore) => state.preferences.dashboardLayout.widgetOrder,
  getHiddenWidgets: (state: AppStore) => state.preferences.dashboardLayout.hiddenWidgets,
  
  // Get loading and error states
  isLoading: (state: AppStore) => state.isLoading,
  getError: (state: AppStore) => state.error,
  getLastSaved: (state: AppStore) => state.lastSaved,
  
  // Utility selectors
  hasModifiedPreferences: (state: AppStore) => 
    settingsUtils.hasModifiedPreferences(state.preferences),
  getPreferencesDiff: (state: AppStore) => 
    settingsUtils.getPreferencesDiff(state.preferences),
  hasNotificationPermission: () => settingsUtils.hasNotificationPermission(),
  
  // Sidebar preference (from UI state)
  isSidebarCollapsed: (state: AppStore) => state.preferences.sidebarCollapsed,
};