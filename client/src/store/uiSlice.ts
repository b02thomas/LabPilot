import { StateCreator } from 'zustand';
import type { UISlice, AppStore, Notification } from './types';
import { nanoid } from 'nanoid';

export const createUISlice: StateCreator<
  AppStore,
  [],
  [],
  UISlice
> = (set, get) => ({
  // Initial UI state
  sidebarCollapsed: false,
  sidebarPinned: true,
  mobileMenuOpen: false,
  notifications: [],
  globalLoading: false,
  pageLoading: {},
  modals: {},
  activeTab: null,
  searchQuery: '',
  filters: {},
  sortOrder: {},

  // UI actions
  ui: {
    toggleSidebar: () => {
      set((state) => ({
        ...state,
        sidebarCollapsed: !state.sidebarCollapsed,
      }));
    },

    setSidebarCollapsed: (collapsed: boolean) => {
      set((state) => ({
        ...state,
        sidebarCollapsed: collapsed,
      }));
    },

    setSidebarPinned: (pinned: boolean) => {
      set((state) => ({
        ...state,
        sidebarPinned: pinned,
      }));
    },

    setMobileMenuOpen: (open: boolean) => {
      set((state) => ({
        ...state,
        mobileMenuOpen: open,
      }));
    },

    addNotification: (notificationData: Omit<Notification, 'id'>) => {
      const notification: Notification = {
        id: nanoid(),
        ...notificationData,
      };

      set((state) => ({
        ...state,
        notifications: [notification, ...state.notifications],
      }));

      // Auto-remove notification after specified duration (default 5 seconds)
      const duration = notification.duration || 5000;
      if (duration > 0) {
        setTimeout(() => {
          const { ui } = get();
          ui.removeNotification(notification.id);
        }, duration);
      }
    },

    removeNotification: (id: string) => {
      set((state) => ({
        ...state,
        notifications: state.notifications.filter((n) => n.id !== id),
      }));
    },

    clearNotifications: () => {
      set((state) => ({
        ...state,
        notifications: [],
      }));
    },

    setGlobalLoading: (loading: boolean) => {
      set((state) => ({
        ...state,
        globalLoading: loading,
      }));
    },

    setPageLoading: (page: string, loading: boolean) => {
      set((state) => ({
        ...state,
        pageLoading: {
          ...state.pageLoading,
          [page]: loading,
        },
      }));
    },

    openModal: (modalId: string) => {
      set((state) => ({
        ...state,
        modals: {
          ...state.modals,
          [modalId]: true,
        },
      }));
    },

    closeModal: (modalId: string) => {
      set((state) => ({
        ...state,
        modals: {
          ...state.modals,
          [modalId]: false,
        },
      }));
    },

    setActiveTab: (tab: string | null) => {
      set((state) => ({
        ...state,
        activeTab: tab,
      }));
    },

    setSearchQuery: (query: string) => {
      set((state) => ({
        ...state,
        searchQuery: query,
      }));
    },

    setFilter: (key: string, value: any) => {
      set((state) => ({
        ...state,
        filters: {
          ...state.filters,
          [key]: value,
        },
      }));
    },

    clearFilters: () => {
      set((state) => ({
        ...state,
        filters: {},
      }));
    },

    setSortOrder: (key: string, order: 'asc' | 'desc') => {
      set((state) => ({
        ...state,
        sortOrder: {
          ...state.sortOrder,
          [key]: order,
        },
      }));
    },

    resetUIState: () => {
      set((state) => ({
        ...state,
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
  },
});

// Utility functions for UI management
export const uiUtils = {
  // Create notification helpers
  createSuccessNotification: (
    title: string,
    description?: string,
    duration?: number
  ): Omit<Notification, 'id'> => ({
    type: 'success',
    title,
    description,
    duration,
  }),

  createErrorNotification: (
    title: string,
    description?: string,
    duration = 8000
  ): Omit<Notification, 'id'> => ({
    type: 'error',
    title,
    description,
    duration,
  }),

  createWarningNotification: (
    title: string,
    description?: string,
    duration = 6000
  ): Omit<Notification, 'id'> => ({
    type: 'warning',
    title,
    description,
    duration,
  }),

  createInfoNotification: (
    title: string,
    description?: string,
    duration?: number
  ): Omit<Notification, 'id'> => ({
    type: 'info',
    title,
    description,
    duration,
  }),

  // Check if any page is loading
  isAnyPageLoading: (pageLoading: Record<string, boolean>): boolean => {
    return Object.values(pageLoading).some(Boolean);
  },

  // Check if any modal is open
  isAnyModalOpen: (modals: Record<string, boolean>): boolean => {
    return Object.values(modals).some(Boolean);
  },

  // Get notification count by type
  getNotificationCount: (
    notifications: Notification[],
    type?: Notification['type']
  ): number => {
    if (!type) return notifications.length;
    return notifications.filter((n) => n.type === type).length;
  },

  // Get unread notifications (for future implementation)
  getUnreadNotifications: (notifications: Notification[]): Notification[] => {
    // For now, return all notifications since we don't have read/unread state
    return notifications;
  },

  // Format search query for display
  formatSearchQuery: (query: string): string => {
    return query.trim();
  },

  // Check if filters are active
  hasActiveFilters: (filters: Record<string, any>): boolean => {
    return Object.keys(filters).length > 0;
  },

  // Get active filter count
  getActiveFilterCount: (filters: Record<string, any>): number => {
    return Object.keys(filters).filter((key) => {
      const value = filters[key];
      return value !== null && value !== undefined && value !== '';
    }).length;
  },

  // Responsive breakpoint helpers
  getBreakpoint: (width: number): 'mobile' | 'tablet' | 'desktop' => {
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  },

  // Check if screen is mobile size
  isMobile: (width: number): boolean => {
    return width < 768;
  },

  // Check if screen is tablet size
  isTablet: (width: number): boolean => {
    return width >= 768 && width < 1024;
  },

  // Check if screen is desktop size
  isDesktop: (width: number): boolean => {
    return width >= 1024;
  },
};

// UI selectors for easy access in components
export const uiSelectors = {
  // Sidebar state
  isSidebarCollapsed: (state: AppStore) => state.sidebarCollapsed,
  isSidebarPinned: (state: AppStore) => state.sidebarPinned,
  isMobileMenuOpen: (state: AppStore) => state.mobileMenuOpen,

  // Loading states
  isGlobalLoading: (state: AppStore) => state.globalLoading,
  getPageLoading: (state: AppStore) => state.pageLoading,
  isPageLoading: (state: AppStore) => (page: string) => state.pageLoading[page] || false,
  isAnyPageLoading: (state: AppStore) => uiUtils.isAnyPageLoading(state.pageLoading),

  // Modals
  getModals: (state: AppStore) => state.modals,
  isModalOpen: (state: AppStore) => (modalId: string) => state.modals[modalId] || false,
  isAnyModalOpen: (state: AppStore) => uiUtils.isAnyModalOpen(state.modals),

  // Navigation
  getActiveTab: (state: AppStore) => state.activeTab,

  // Search and filters
  getSearchQuery: (state: AppStore) => state.searchQuery,
  getFilters: (state: AppStore) => state.filters,
  getFilter: (state: AppStore) => (key: string) => state.filters[key],
  hasActiveFilters: (state: AppStore) => uiUtils.hasActiveFilters(state.filters),
  getActiveFilterCount: (state: AppStore) => uiUtils.getActiveFilterCount(state.filters),

  // Sort order
  getSortOrder: (state: AppStore) => state.sortOrder,
  getSortForKey: (state: AppStore) => (key: string) => state.sortOrder[key] || 'asc',

  // Notifications
  getNotifications: (state: AppStore) => state.notifications,
  getNotificationCount: (state: AppStore) => state.notifications.length,
  getNotificationsByType: (state: AppStore) => (type: Notification['type']) =>
    state.notifications.filter((n) => n.type === type),
  getUnreadNotifications: (state: AppStore) => uiUtils.getUnreadNotifications(state.notifications),
  hasNotifications: (state: AppStore) => state.notifications.length > 0,
  hasErrorNotifications: (state: AppStore) => 
    state.notifications.some((n) => n.type === 'error'),
  hasWarningNotifications: (state: AppStore) => 
    state.notifications.some((n) => n.type === 'warning'),
};