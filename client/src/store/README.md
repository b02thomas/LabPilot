# LabPilot Zustand Store Documentation

This document provides comprehensive documentation for the Zustand state management system implemented in LabPilot.

## Overview

The LabPilot store is built using Zustand with TypeScript and follows a modular slice-based architecture. It provides robust state management for authentication, project context, UI state, and user preferences with persistence.

## Features

- **Modular Architecture**: Separate slices for different concerns (auth, projects, UI, settings)
- **TypeScript Support**: Full type safety with comprehensive TypeScript types
- **Persistence**: User preferences and important state persisted to localStorage
- **Session Management**: Automatic session timeout and activity tracking
- **Theme Management**: System theme detection and preference persistence
- **Notifications**: Built-in notification system with different types and actions
- **Performance Optimized**: Selective subscriptions and optimized selectors
- **DevTools Integration**: Development tools for debugging (development only)

## File Structure

```
client/src/store/
├── index.ts          # Main store configuration and exports
├── types.ts          # TypeScript type definitions
├── authSlice.ts      # Authentication state and actions
├── projectSlice.ts   # Project management state and actions
├── uiSlice.ts        # UI state (sidebar, notifications, modals)
├── settingsSlice.ts  # User preferences and settings
├── hooks.ts          # Custom React hooks for easy store access
├── provider.tsx      # Store provider and initialization
├── examples.tsx      # Usage examples and patterns
└── README.md         # This documentation file
```

## Quick Start

### 1. Wrap your app with the StoreProvider

```tsx
import { StoreProvider } from '@/store/provider';
import App from './App';

function Root() {
  return (
    <StoreProvider>
      <App />
    </StoreProvider>
  );
}
```

### 2. Use hooks in your components

```tsx
import { useAuth, useCurrentProject, useNotifications } from '@/store/hooks';

function MyComponent() {
  const { user, isAuthenticated, actions } = useAuth();
  const currentProject = useCurrentProject();
  const { add: addNotification } = useNotifications();

  const handleLogin = async (email: string, password: string) => {
    actions.setLoading(true);
    try {
      // Your login logic here
      const userData = await loginAPI(email, password);
      actions.setUser(userData);
      
      addNotification({
        type: 'success',
        title: 'Login successful',
        description: `Welcome back, ${userData.firstName}!`
      });
    } catch (error) {
      actions.setError('Login failed');
    }
  };

  // ... rest of component
}
```

## Store Slices

### Authentication Slice (`authSlice.ts`)

Manages user authentication, session state, and permissions.

**State:**
- `user`: Current user object
- `isAuthenticated`: Authentication status
- `isLoading`: Loading state for auth operations
- `error`: Authentication errors
- `lastActivity`: Timestamp of last user activity
- `sessionExpiry`: Session expiration timestamp

**Actions:**
- `setUser(user)`: Set the current user
- `setAuthenticated(status)`: Set authentication status
- `setLoading(loading)`: Set loading state
- `setError(error)`: Set error message
- `updateLastActivity()`: Update last activity timestamp
- `logout()`: Log out the user and reset state

**Utilities:**
- Permission checking functions
- Session validation helpers
- User display name formatting

### Project Slice (`projectSlice.ts`)

Manages project selection, project list, and team members.

**State:**
- `currentProject`: Currently selected project
- `projects`: List of all projects
- `projectMembers`: Members of the current project
- `isLoading`: Loading state for project operations
- `error`: Project-related errors
- `lastUpdated`: Timestamp of last update

**Actions:**
- `setCurrentProject(project)`: Set the current project
- `setProjects(projects)`: Set the project list
- `addProject(project)`: Add a new project
- `updateProject(id, updates)`: Update a project
- `removeProject(id)`: Remove a project
- `setProjectMembers(members)`: Set project members

### UI Slice (`uiSlice.ts`)

Manages application UI state including sidebar, notifications, modals, and global loading states.

**State:**
- `sidebarCollapsed`: Sidebar collapse state
- `sidebarPinned`: Sidebar pin state
- `mobileMenuOpen`: Mobile menu state
- `notifications`: Array of active notifications
- `globalLoading`: Global loading state
- `pageLoading`: Per-page loading states
- `modals`: Modal open/close states
- `searchQuery`: Global search query
- `filters`: Active filters
- `sortOrder`: Sort preferences

**Actions:**
- `toggleSidebar()`: Toggle sidebar collapse
- `addNotification(notification)`: Add a notification
- `removeNotification(id)`: Remove a notification
- `setGlobalLoading(loading)`: Set global loading state
- `openModal(modalId)`: Open a modal
- `closeModal(modalId)`: Close a modal

### Settings Slice (`settingsSlice.ts`)

Manages user preferences and application settings with persistence.

**State:**
- `preferences`: User preference object
- `isLoading`: Loading state for settings operations
- `error`: Settings-related errors
- `lastSaved`: Timestamp of last save

**Preferences Include:**
- Theme (light/dark/system)
- Language
- Timezone and date/time formats
- Notification settings
- Dashboard layout preferences
- Sidebar preferences

**Actions:**
- `updatePreferences(updates)`: Update preferences
- `setTheme(theme)`: Set theme preference
- `setLanguage(language)`: Set language preference
- `savePreferences()`: Save preferences to server
- `resetToDefaults()`: Reset to default preferences

## Custom Hooks

The store provides a comprehensive set of custom hooks for easy access to state and actions:

### Authentication Hooks
- `useAuth()`: Complete auth state and actions
- `useAuthUser()`: Current user
- `useIsAuthenticated()`: Authentication status
- `useUserRole()`: User role
- `useUserPermissions()`: User permissions
- `useSessionStatus()`: Session expiration status

### Project Hooks
- `useProject()`: Complete project state and actions
- `useCurrentProject()`: Current project
- `useProjects()`: All projects
- `useUserProjects()`: Projects for current user
- `useProjectPermissions()`: Project-specific permissions

### UI Hooks
- `useUI()`: Complete UI state and actions
- `useSidebar()`: Sidebar state and controls
- `useNotifications()`: Notification system
- `useLoading()`: Loading states
- `useModals()`: Modal controls
- `useSearch()`: Search functionality
- `useFilters()`: Filter management

### Settings Hooks
- `useSettings()`: Complete settings state and actions
- `useTheme()`: Theme preference
- `useLanguage()`: Language preference
- `useNotificationSettings()`: Notification preferences
- `useDateTimeSettings()`: Date/time format preferences

### Utility Hooks
- `useAppContext()`: Combined auth and project context
- `useDashboardData()`: Dashboard-specific data
- `useGlobalLoadingState()`: Aggregated loading state
- `useGlobalErrorState()`: Aggregated error state

## Persistence

The store automatically persists important user preferences to localStorage:

- User preferences (theme, language, notification settings)
- Last selected project ID
- Recent projects list
- Dashboard layout preferences

Persistence is handled by Zustand's persist middleware with:
- Automatic rehydration on app start
- Version management for migrations
- Error handling for corrupted data

## Session Management

The store includes automatic session management:
- Activity tracking with 30-minute timeout
- Session warning at 25 minutes
- Automatic logout on inactivity
- Session extension on user activity

## Theme Management

Comprehensive theme system with:
- Light/dark/system theme options
- Automatic system theme detection
- Theme persistence across sessions
- CSS class application to document root

## Notifications

Built-in notification system featuring:
- Multiple notification types (success, error, warning, info)
- Auto-dismissal with configurable duration
- Action buttons for user interaction
- Notification history and management

## Performance Optimizations

- **Selective Subscriptions**: Hooks only subscribe to relevant state slices
- **Optimized Selectors**: Memoized selectors for frequently accessed data
- **Minimal Re-renders**: Careful state structure to minimize unnecessary updates
- **Lazy Loading**: Examples and utilities loaded only when needed

## Development Tools

In development mode:
- Store instance attached to window for debugging
- Detailed logging for state changes
- TypeScript integration for better DX

## Best Practices

### Do's
- Use specific hooks instead of the base `useStore` hook
- Leverage TypeScript types for better development experience
- Use the notification system for user feedback
- Persist important user preferences
- Handle loading and error states appropriately

### Don'ts
- Don't mutate state directly; use provided actions
- Don't subscribe to entire store; use specific selectors
- Don't bypass the type system with `any` types
- Don't forget to handle error states
- Don't store sensitive data in persisted state

## Examples

See `examples.tsx` for comprehensive usage examples including:
- Authentication flows
- Project management
- Notification usage
- UI state management
- Settings configuration
- Dashboard implementation

## Migration Guide

When updating the store structure:
1. Update the version number in `index.ts`
2. Add migration logic in the `migrate` function
3. Update TypeScript types as needed
4. Test migration with existing user data

## Troubleshooting

### Common Issues

1. **Store not persisting**: Check localStorage permissions and quota
2. **Theme not applying**: Ensure CSS classes are properly configured
3. **TypeScript errors**: Check imports and type definitions
4. **Session not expiring**: Verify activity tracking is set up
5. **Notifications not appearing**: Check notification component integration

### Debug Commands

```typescript
// Access store in development
window.__labpilot_store__.getState();

// Reset store
window.__labpilot_store__.getState().reset();

// Check persistence
localStorage.getItem('labpilot-store');
```

## Contributing

When adding new state or actions:
1. Update the appropriate slice file
2. Add TypeScript types to `types.ts`
3. Create custom hooks in `hooks.ts`
4. Add examples to `examples.tsx`
5. Update this documentation
6. Test with TypeScript compiler (`npm run check`)

## Support

For questions or issues with the store implementation, refer to:
- This documentation
- Example implementations in `examples.tsx`
- TypeScript definitions in `types.ts`
- Zustand official documentation: https://github.com/pmndrs/zustand