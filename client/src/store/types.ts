import type { User, Project } from '@shared/schema';

// Loading states for various operations
export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
}

// Notification types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Theme preferences
export type Theme = 'light' | 'dark' | 'system';

// User preferences that should be persisted
export interface UserPreferences {
  theme: Theme;
  sidebarCollapsed: boolean;
  language: 'en' | 'es' | 'fr' | 'de';
  timezone: string;
  dateFormat: 'MM/dd/yyyy' | 'dd/MM/yyyy' | 'yyyy-MM-dd';
  timeFormat: '12h' | '24h';
  notificationSettings: {
    email: boolean;
    push: boolean;
    desktop: boolean;
    taskAssignments: boolean;
    experimentCompletion: boolean;
    projectUpdates: boolean;
  };
  dashboardLayout: {
    widgetOrder: string[];
    hiddenWidgets: string[];
  };
}

// Authentication state
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  lastActivity: number | null;
  sessionExpiry: number | null;
}

// Authentication actions
export interface AuthActions {
  setUser: (user: User | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  updateLastActivity: () => void;
  setSessionExpiry: (expiry: number | null) => void;
  logout: () => void;
  updateUserProfile: (updates: Partial<User>) => void;
}

// Project context state
export interface ProjectState {
  currentProject: Project | null;
  projects: Project[];
  projectMembers: User[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

// Project context actions
export interface ProjectActions {
  setCurrentProject: (project: Project | null) => void;
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  removeProject: (projectId: string) => void;
  setProjectMembers: (members: User[]) => void;
  addProjectMember: (member: User) => void;
  removeProjectMember: (userId: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  refreshProjects: () => void;
}

// UI state for application interface
export interface UIState {
  sidebarCollapsed: boolean;
  sidebarPinned: boolean;
  mobileMenuOpen: boolean;
  notifications: Notification[];
  globalLoading: boolean;
  pageLoading: Record<string, boolean>;
  modals: Record<string, boolean>;
  activeTab: string | null;
  searchQuery: string;
  filters: Record<string, any>;
  sortOrder: Record<string, 'asc' | 'desc'>;
}

// UI actions
export interface UIActions {
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarPinned: (pinned: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  setGlobalLoading: (loading: boolean) => void;
  setPageLoading: (page: string, loading: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: (modalId: string) => void;
  setActiveTab: (tab: string | null) => void;
  setSearchQuery: (query: string) => void;
  setFilter: (key: string, value: any) => void;
  clearFilters: () => void;
  setSortOrder: (key: string, order: 'asc' | 'desc') => void;
  resetUIState: () => void;
}

// Application settings state
export interface SettingsState {
  preferences: UserPreferences;
  isLoading: boolean;
  error: string | null;
  lastSaved: number | null;
}

// Settings actions
export interface SettingsActions {
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: UserPreferences['language']) => void;
  setTimezone: (timezone: string) => void;
  setDateFormat: (format: UserPreferences['dateFormat']) => void;
  setTimeFormat: (format: UserPreferences['timeFormat']) => void;
  updateNotificationSettings: (updates: Partial<UserPreferences['notificationSettings']>) => void;
  updateDashboardLayout: (updates: Partial<UserPreferences['dashboardLayout']>) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  savePreferences: () => Promise<void>;
  resetToDefaults: () => void;
}

// Combined store type
export interface AppStore extends AuthState, ProjectState, UIState, SettingsState {
  // Auth actions
  auth: AuthActions;
  
  // Project actions
  project: ProjectActions;
  
  // UI actions
  ui: UIActions;
  
  // Settings actions
  settings: SettingsActions;
  
  // Global actions
  reset: () => void;
  hydrate: () => void;
}

// Slice creators type helpers
export type AuthSlice = AuthState & { auth: AuthActions };
export type ProjectSlice = ProjectState & { project: ProjectActions };
export type UISlice = UIState & { ui: UIActions };
export type SettingsSlice = SettingsState & { settings: SettingsActions };

// State selector types for hooks
export type AuthSelector<T> = (state: AppStore) => T;
export type ProjectSelector<T> = (state: AppStore) => T;
export type UISelector<T> = (state: AppStore) => T;
export type SettingsSelector<T> = (state: AppStore) => T;

// Persisted state configuration
export interface PersistedState {
  preferences: UserPreferences;
  lastProject: string | null;
  recentProjects: string[];
}

// Default values
export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'system',
  sidebarCollapsed: false,
  language: 'en',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  dateFormat: 'MM/dd/yyyy',
  timeFormat: '12h',
  notificationSettings: {
    email: true,
    push: true,
    desktop: true,
    taskAssignments: true,
    experimentCompletion: true,
    projectUpdates: true,
  },
  dashboardLayout: {
    widgetOrder: ['recent-experiments', 'active-tasks', 'project-overview', 'notifications'],
    hiddenWidgets: [],
  },
};

// Error types for better error handling
export interface AppError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: number;
}

// Loading states for different operations
export interface LoadingStates {
  auth: LoadingState;
  projects: LoadingState;
  experiments: LoadingState;
  tasks: LoadingState;
  reports: LoadingState;
  settings: LoadingState;
}