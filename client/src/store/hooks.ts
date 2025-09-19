import { useCallback } from 'react';
import { useStore } from './index';
import type { 
  AppStore, 
  AuthSelector, 
  ProjectSelector, 
  UISelector, 
  SettingsSelector,
  Notification,
  UserPreferences,
  Theme 
} from './types';
import type { User, Project } from '@shared/schema';

// Base store hook
export const useAppStore = useStore;

// =============================================================================
// Authentication Hooks
// =============================================================================

export const useAuth = () => {
  return useStore((state) => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    lastActivity: state.lastActivity,
    sessionExpiry: state.sessionExpiry,
    actions: state.auth,
  }));
};

export const useAuthUser = () => {
  return useStore((state) => state.user);
};

export const useIsAuthenticated = () => {
  return useStore((state) => state.isAuthenticated);
};

export const useAuthLoading = () => {
  return useStore((state) => state.isLoading);
};

export const useAuthError = () => {
  return useStore((state) => state.error);
};

export const useAuthActions = () => {
  return useStore((state) => state.auth);
};

// User role and permission hooks
export const useUserRole = () => {
  return useStore((state) => state.user?.role);
};

export const useUserPermissions = () => {
  const user = useStore((state) => state.user);
  
  return useCallback(() => {
    if (!user) return {
      hasAdminPrivileges: false,
      canManageProjects: false,
      canAssignTasks: false,
      canDeleteExperiments: false,
      canAccessAdmin: false,
    };

    const hasAdminPrivileges = user.role === 'admin' || user.role === 'lab_manager';
    
    return {
      hasAdminPrivileges,
      canManageProjects: hasAdminPrivileges,
      canAssignTasks: hasAdminPrivileges,
      canDeleteExperiments: hasAdminPrivileges,
      canAccessAdmin: user.role === 'admin',
    };
  }, [user]);
};

// Session management hooks
export const useSessionStatus = () => {
  return useStore((state) => {
    const now = Date.now();
    const isExpired = state.sessionExpiry ? now > state.sessionExpiry : false;
    const isExpiringSoon = state.sessionExpiry ? now > (state.sessionExpiry - 5 * 60 * 1000) : false;
    const timeUntilExpiry = state.sessionExpiry ? Math.max(0, state.sessionExpiry - now) : 0;

    return {
      isExpired,
      isExpiringSoon,
      timeUntilExpiry,
      sessionExpiry: state.sessionExpiry,
      lastActivity: state.lastActivity,
    };
  });
};

// =============================================================================
// Project Hooks
// =============================================================================

export const useProject = () => {
  return useStore((state) => ({
    currentProject: state.currentProject,
    projects: state.projects,
    projectMembers: state.projectMembers,
    isLoading: state.isLoading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    actions: state.project,
  }));
};

export const useCurrentProject = () => {
  return useStore((state) => state.currentProject);
};

export const useProjects = () => {
  return useStore((state) => state.projects);
};

export const useProjectMembers = () => {
  return useStore((state) => state.projectMembers);
};

export const useProjectActions = () => {
  return useStore((state) => state.project);
};

export const useProjectLoading = () => {
  return useStore((state) => state.isLoading);
};

// Project filtering and selection hooks
export const useUserProjects = () => {
  const user = useStore((state) => state.user);
  const projects = useStore((state) => state.projects);
  
  return useCallback(() => {
    if (!user) return [];
    
    return projects.filter((project) => 
      project.createdBy === user.id || 
      project.teamMembers?.includes(user.id)
    );
  }, [user, projects]);
};

export const useProjectById = (projectId: string | undefined) => {
  return useStore((state) => 
    projectId ? state.projects.find(p => p.id === projectId) : undefined
  );
};

export const useProjectPermissions = (project?: Project | null) => {
  const user = useStore((state) => state.user);
  const currentProject = useStore((state) => state.currentProject);
  const targetProject = project || currentProject;
  
  return useCallback(() => {
    if (!user || !targetProject) return {
      canEdit: false,
      canDelete: false,
      canAddMembers: false,
      isCreator: false,
      isMember: false,
    };

    const isCreator = targetProject.createdBy === user.id;
    const isMember = targetProject.teamMembers?.includes(user.id) || isCreator;
    const hasAdminPrivileges = user.role === 'admin' || user.role === 'lab_manager';
    
    return {
      canEdit: hasAdminPrivileges || isCreator,
      canDelete: hasAdminPrivileges,
      canAddMembers: hasAdminPrivileges || isCreator,
      isCreator,
      isMember,
    };
  }, [user, targetProject]);
};

// =============================================================================
// UI Hooks
// =============================================================================

export const useUI = () => {
  return useStore((state) => ({
    sidebarCollapsed: state.sidebarCollapsed,
    sidebarPinned: state.sidebarPinned,
    mobileMenuOpen: state.mobileMenuOpen,
    notifications: state.notifications,
    globalLoading: state.globalLoading,
    pageLoading: state.pageLoading,
    modals: state.modals,
    activeTab: state.activeTab,
    searchQuery: state.searchQuery,
    filters: state.filters,
    sortOrder: state.sortOrder,
    actions: state.ui,
  }));
};

export const useSidebar = () => {
  return useStore((state) => ({
    collapsed: state.sidebarCollapsed,
    pinned: state.sidebarPinned,
    toggle: state.ui.toggleSidebar,
    setCollapsed: state.ui.setSidebarCollapsed,
    setPinned: state.ui.setSidebarPinned,
  }));
};

export const useMobileMenu = () => {
  return useStore((state) => ({
    isOpen: state.mobileMenuOpen,
    setOpen: state.ui.setMobileMenuOpen,
  }));
};

export const useNotifications = () => {
  return useStore((state) => ({
    notifications: state.notifications,
    add: state.ui.addNotification,
    remove: state.ui.removeNotification,
    clear: state.ui.clearNotifications,
  }));
};

export const useLoading = () => {
  return useStore((state) => ({
    global: state.globalLoading,
    pages: state.pageLoading,
    setGlobal: state.ui.setGlobalLoading,
    setPage: state.ui.setPageLoading,
    isPageLoading: (page: string) => state.pageLoading[page] || false,
  }));
};

export const useModals = () => {
  return useStore((state) => ({
    modals: state.modals,
    open: state.ui.openModal,
    close: state.ui.closeModal,
    isOpen: (modalId: string) => state.modals[modalId] || false,
  }));
};

export const useSearch = () => {
  return useStore((state) => ({
    query: state.searchQuery,
    setQuery: state.ui.setSearchQuery,
  }));
};

export const useFilters = () => {
  return useStore((state) => ({
    filters: state.filters,
    setFilter: state.ui.setFilter,
    clearFilters: state.ui.clearFilters,
    hasActiveFilters: Object.keys(state.filters).length > 0,
  }));
};

export const useSorting = () => {
  return useStore((state) => ({
    sortOrder: state.sortOrder,
    setSortOrder: state.ui.setSortOrder,
    getSortForKey: (key: string) => state.sortOrder[key] || 'asc',
  }));
};

// Navigation and tabs
export const useActiveTab = () => {
  return useStore((state) => ({
    activeTab: state.activeTab,
    setActiveTab: state.ui.setActiveTab,
  }));
};

// =============================================================================
// Settings Hooks
// =============================================================================

export const useSettings = () => {
  return useStore((state) => ({
    preferences: state.preferences,
    isLoading: state.isLoading,
    error: state.error,
    lastSaved: state.lastSaved,
    actions: state.settings,
  }));
};

export const usePreferences = () => {
  return useStore((state) => state.preferences);
};

export const useTheme = () => {
  return useStore((state) => ({
    theme: state.preferences.theme,
    setTheme: state.settings.setTheme,
  }));
};

export const useLanguage = () => {
  return useStore((state) => ({
    language: state.preferences.language,
    setLanguage: state.settings.setLanguage,
  }));
};

export const useNotificationSettings = () => {
  return useStore((state) => ({
    settings: state.preferences.notificationSettings,
    update: state.settings.updateNotificationSettings,
  }));
};

export const useDateTimeSettings = () => {
  return useStore((state) => ({
    dateFormat: state.preferences.dateFormat,
    timeFormat: state.preferences.timeFormat,
    timezone: state.preferences.timezone,
    setDateFormat: state.settings.setDateFormat,
    setTimeFormat: state.settings.setTimeFormat,
    setTimezone: state.settings.setTimezone,
  }));
};

export const useDashboardLayout = () => {
  return useStore((state) => ({
    layout: state.preferences.dashboardLayout,
    update: state.settings.updateDashboardLayout,
  }));
};

export const useSettingsActions = () => {
  return useStore((state) => state.settings);
};

// =============================================================================
// Combined and Utility Hooks
// =============================================================================

// Combined authentication and project context
export const useAppContext = () => {
  return useStore((state) => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    currentProject: state.currentProject,
    projects: state.projects,
    theme: state.preferences.theme,
    sidebarCollapsed: state.sidebarCollapsed,
  }));
};

// Dashboard data hook
export const useDashboardData = () => {
  return useStore((state) => ({
    user: state.user,
    currentProject: state.currentProject,
    projects: state.projects,
    notifications: state.notifications,
    isLoading: state.globalLoading,
    layout: state.preferences.dashboardLayout,
  }));
};

// Global loading state aggregator
export const useGlobalLoadingState = () => {
  return useStore((state) => {
    const hasGlobalLoading = state.globalLoading;
    const hasPageLoading = Object.values(state.pageLoading).some(Boolean);
    const hasAuthLoading = state.isLoading;
    
    return {
      isLoading: hasGlobalLoading || hasPageLoading || hasAuthLoading,
      globalLoading: hasGlobalLoading,
      pageLoading: hasPageLoading,
      authLoading: hasAuthLoading,
      loadingPages: Object.keys(state.pageLoading).filter(
        page => state.pageLoading[page]
      ),
    };
  });
};

// Error state aggregator
export const useGlobalErrorState = () => {
  return useStore((state) => {
    const authError = state.error;
    const errorNotifications = state.notifications.filter(n => n.type === 'error');
    
    return {
      hasErrors: !!authError || errorNotifications.length > 0,
      authError,
      errorNotifications,
      clearAuthError: state.auth.setError,
      clearNotifications: state.ui.clearNotifications,
    };
  });
};

// Performance optimized selectors for frequently accessed data
export const useOptimizedUserData = () => {
  return useStore(
    useCallback(
      (state: AppStore) => ({
        id: state.user?.id,
        name: state.user?.firstName && state.user?.lastName 
          ? `${state.user.firstName} ${state.user.lastName}`
          : state.user?.email,
        role: state.user?.role,
        profileImageUrl: state.user?.profileImageUrl,
      }),
      []
    )
  );
};

export const useOptimizedProjectData = () => {
  return useStore(
    useCallback(
      (state: AppStore) => ({
        id: state.currentProject?.id,
        name: state.currentProject?.name,
        memberCount: state.currentProject?.teamMembers?.length || 0,
        isActive: state.currentProject?.isActive,
      }),
      []
    )
  );
};