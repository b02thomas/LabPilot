/**
 * Zustand Store Usage Examples for LabPilot
 * 
 * This file demonstrates how to use the Zustand store in your React components.
 * It includes practical examples for authentication, project management, UI state,
 * and settings management.
 */

import React from 'react';
import { 
  useAuth, 
  useCurrentProject, 
  useNotifications, 
  useTheme,
  useUserPermissions,
  useProjectPermissions,
  useSidebar,
  useLoading,
  useModals,
  useSettings
} from './hooks';
import { useStore } from './index';
import { uiUtils } from './uiSlice';

// =============================================================================
// Authentication Examples
// =============================================================================

export const AuthExample: React.FC = () => {
  const { user, isAuthenticated, isLoading, error, actions } = useAuth();
  const userPermissions = useUserPermissions();
  const permissions = userPermissions();

  const handleLogin = async (email: string, password: string) => {
    actions.setLoading(true);
    
    try {
      // Simulate API call
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      if (response.ok) {
        const userData = await response.json();
        actions.setUser(userData);
      } else {
        actions.setError('Invalid credentials');
      }
    } catch (error) {
      actions.setError('Login failed');
    }
  };

  const handleLogout = () => {
    actions.logout();
    // Navigation handled automatically by the store
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div>
        <h2>Login</h2>
        {error && <div className="error">{error}</div>}
        <button onClick={() => handleLogin('user@example.com', 'password')}>
          Login
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2>Welcome, {user?.firstName || user?.email}!</h2>
      <p>Role: {user?.role}</p>
      
      {permissions.hasAdminPrivileges && (
        <button>Access Admin Panel</button>
      )}
      
      {permissions.canManageProjects && (
        <button>Manage Projects</button>
      )}
      
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

// =============================================================================
// Project Management Examples
// =============================================================================

export const ProjectExample: React.FC = () => {
  const currentProject = useCurrentProject();
  const projectPermissions = useProjectPermissions();
  const permissions = projectPermissions();
  const { actions: projectActions } = useStore((state) => ({
    actions: state.project
  }));

  const handleSelectProject = (projectId: string) => {
    // In a real app, you'd fetch the project data
    const project = { 
      id: projectId, 
      name: 'Example Project',
      description: 'This is an example project',
      createdBy: 'user-id',
      teamMembers: ['user-id'],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    projectActions.setCurrentProject(project);
  };

  const handleCreateProject = async (name: string, description: string) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      
      if (response.ok) {
        const newProject = await response.json();
        projectActions.addProject(newProject);
        projectActions.setCurrentProject(newProject);
      }
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  return (
    <div>
      <h2>Project Management</h2>
      
      {currentProject ? (
        <div>
          <h3>Current Project: {currentProject.name}</h3>
          <p>{currentProject.description}</p>
          
          {permissions.canEdit && (
            <button>Edit Project</button>
          )}
          
          {permissions.canAddMembers && (
            <button>Add Members</button>
          )}
          
          {permissions.canDelete && (
            <button>Delete Project</button>
          )}
        </div>
      ) : (
        <div>
          <p>No project selected</p>
          <button onClick={() => handleSelectProject('project-1')}>
            Select Project 1
          </button>
        </div>
      )}
      
      <button onClick={() => handleCreateProject('New Project', 'Description')}>
        Create New Project
      </button>
    </div>
  );
};

// =============================================================================
// Notifications Examples
// =============================================================================

export const NotificationExample: React.FC = () => {
  const { notifications, add, remove, clear } = useNotifications();

  const showSuccessNotification = () => {
    add(uiUtils.createSuccessNotification(
      'Success!',
      'Your action was completed successfully.'
    ));
  };

  const showErrorNotification = () => {
    add(uiUtils.createErrorNotification(
      'Error!',
      'Something went wrong. Please try again.'
    ));
  };

  const showWarningNotification = () => {
    add(uiUtils.createWarningNotification(
      'Warning!',
      'Please review your settings.'
    ));
  };

  const showActionNotification = () => {
    add({
      type: 'info',
      title: 'Action Required',
      description: 'Please confirm your action.',
      duration: 0, // Don't auto-dismiss
      action: {
        label: 'Confirm',
        onClick: () => {
          console.log('Action confirmed');
          // Remove the notification after action
          clear();
        },
      },
    });
  };

  return (
    <div>
      <h2>Notifications</h2>
      
      <div className="flex gap-2 mb-4">
        <button onClick={showSuccessNotification}>Success</button>
        <button onClick={showErrorNotification}>Error</button>
        <button onClick={showWarningNotification}>Warning</button>
        <button onClick={showActionNotification}>Action Required</button>
        <button onClick={clear}>Clear All</button>
      </div>
      
      <div>
        <h3>Active Notifications ({notifications.length})</h3>
        {notifications.map((notification) => (
          <div key={notification.id} className={`notification ${notification.type}`}>
            <strong>{notification.title}</strong>
            {notification.description && <p>{notification.description}</p>}
            {notification.action && (
              <button onClick={notification.action.onClick}>
                {notification.action.label}
              </button>
            )}
            <button onClick={() => remove(notification.id)}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// UI State Examples
// =============================================================================

export const UIStateExample: React.FC = () => {
  const { collapsed, toggle, setCollapsed } = useSidebar();
  const { global, setGlobal, setPage, isPageLoading } = useLoading();
  const { isOpen, open, close } = useModals();

  const handleLongOperation = async () => {
    setGlobal(true);
    
    try {
      // Simulate long operation
      await new Promise(resolve => setTimeout(resolve, 2000));
    } finally {
      setGlobal(false);
    }
  };

  const handlePageLoad = async (page: string) => {
    setPage(page, true);
    
    try {
      // Simulate page load
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      setPage(page, false);
    }
  };

  return (
    <div>
      <h2>UI State Management</h2>
      
      {/* Sidebar Controls */}
      <div className="mb-4">
        <h3>Sidebar</h3>
        <p>Sidebar is {collapsed ? 'collapsed' : 'expanded'}</p>
        <button onClick={toggle}>Toggle Sidebar</button>
        <button onClick={() => setCollapsed(true)}>Collapse</button>
        <button onClick={() => setCollapsed(false)}>Expand</button>
      </div>
      
      {/* Loading States */}
      <div className="mb-4">
        <h3>Loading States</h3>
        <p>Global loading: {global ? 'Yes' : 'No'}</p>
        <p>Dashboard loading: {isPageLoading('dashboard') ? 'Yes' : 'No'}</p>
        <p>Projects loading: {isPageLoading('projects') ? 'Yes' : 'No'}</p>
        
        <button onClick={handleLongOperation} disabled={global}>
          {global ? 'Processing...' : 'Start Long Operation'}
        </button>
        <button onClick={() => handlePageLoad('dashboard')}>
          Load Dashboard
        </button>
        <button onClick={() => handlePageLoad('projects')}>
          Load Projects
        </button>
      </div>
      
      {/* Modal Controls */}
      <div className="mb-4">
        <h3>Modals</h3>
        <p>Settings modal: {isOpen('settings') ? 'Open' : 'Closed'}</p>
        <p>Confirm modal: {isOpen('confirm') ? 'Open' : 'Closed'}</p>
        
        <button onClick={() => open('settings')}>Open Settings</button>
        <button onClick={() => close('settings')}>Close Settings</button>
        <button onClick={() => open('confirm')}>Open Confirm</button>
        <button onClick={() => close('confirm')}>Close Confirm</button>
      </div>
    </div>
  );
};

// =============================================================================
// Settings Examples
// =============================================================================

export const SettingsExample: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { preferences, actions } = useSettings();

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
  };

  const handleLanguageChange = (language: 'en' | 'es' | 'fr' | 'de') => {
    actions.setLanguage(language);
  };

  const handleNotificationToggle = (setting: string, value: boolean) => {
    actions.updateNotificationSettings({ [setting]: value });
  };

  const handleSavePreferences = async () => {
    await actions.savePreferences();
  };

  const handleResetToDefaults = () => {
    actions.resetToDefaults();
  };

  return (
    <div>
      <h2>Settings Management</h2>
      
      {/* Theme Settings */}
      <div className="mb-4">
        <h3>Theme</h3>
        <p>Current theme: {theme}</p>
        <button 
          onClick={() => handleThemeChange('light')}
          className={theme === 'light' ? 'active' : ''}
        >
          Light
        </button>
        <button 
          onClick={() => handleThemeChange('dark')}
          className={theme === 'dark' ? 'active' : ''}
        >
          Dark
        </button>
        <button 
          onClick={() => handleThemeChange('system')}
          className={theme === 'system' ? 'active' : ''}
        >
          System
        </button>
      </div>
      
      {/* Language Settings */}
      <div className="mb-4">
        <h3>Language</h3>
        <p>Current language: {preferences.language}</p>
        <select 
          value={preferences.language} 
          onChange={(e) => handleLanguageChange(e.target.value as any)}
        >
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="fr">Français</option>
          <option value="de">Deutsch</option>
        </select>
      </div>
      
      {/* Notification Settings */}
      <div className="mb-4">
        <h3>Notifications</h3>
        <label>
          <input
            type="checkbox"
            checked={preferences.notificationSettings.email}
            onChange={(e) => handleNotificationToggle('email', e.target.checked)}
          />
          Email notifications
        </label>
        <label>
          <input
            type="checkbox"
            checked={preferences.notificationSettings.push}
            onChange={(e) => handleNotificationToggle('push', e.target.checked)}
          />
          Push notifications
        </label>
        <label>
          <input
            type="checkbox"
            checked={preferences.notificationSettings.desktop}
            onChange={(e) => handleNotificationToggle('desktop', e.target.checked)}
          />
          Desktop notifications
        </label>
      </div>
      
      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={handleSavePreferences}>
          Save Preferences
        </button>
        <button onClick={handleResetToDefaults}>
          Reset to Defaults
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// Combined Dashboard Example
// =============================================================================

export const DashboardExample: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const currentProject = useCurrentProject();
  const { notifications } = useNotifications();
  const { theme } = useTheme();
  const { collapsed } = useSidebar();

  if (!isAuthenticated) {
    return <div>Please log in to view the dashboard.</div>;
  }

  return (
    <div className={`dashboard ${theme} ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <h1>LabPilot Dashboard</h1>
      
      <div className="user-info">
        <h2>Welcome, {user?.firstName || user?.email}!</h2>
        <p>Role: {user?.role}</p>
      </div>
      
      {currentProject && (
        <div className="current-project">
          <h3>Current Project: {currentProject.name}</h3>
          <p>Members: {currentProject.teamMembers?.length || 0}</p>
        </div>
      )}
      
      <div className="notifications-summary">
        <h3>Notifications</h3>
        <p>Active: {notifications.length}</p>
        <p>Errors: {notifications.filter(n => n.type === 'error').length}</p>
        <p>Warnings: {notifications.filter(n => n.type === 'warning').length}</p>
      </div>
      
      {/* Add more dashboard widgets here */}
    </div>
  );
};

// Export all examples
export const StoreExamples = {
  AuthExample,
  ProjectExample,
  NotificationExample,
  UIStateExample,
  SettingsExample,
  DashboardExample,
};