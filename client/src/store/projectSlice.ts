import { StateCreator } from 'zustand';
import type { Project, User } from '@shared/schema';
import type { ProjectSlice, AppStore } from './types';

export const createProjectSlice: StateCreator<
  AppStore,
  [],
  [],
  ProjectSlice
> = (set, get) => ({
  // Initial project state
  currentProject: null,
  projects: [],
  projectMembers: [],
  isLoading: false,
  error: null,
  lastUpdated: null,

  // Project actions
  project: {
    setCurrentProject: (project: Project | null) => {
      set((state) => ({
        ...state,
        currentProject: project,
        error: null,
      }));

      // If project is set, load project members if needed
      if (project && project.teamMembers && project.teamMembers.length > 0) {
        // Note: In a real app, you might want to fetch full user details for team members
        // For now, we'll just clear the project members as they need to be loaded separately
        get().project.setProjectMembers([]);
      }
    },

    setProjects: (projects: Project[]) => {
      set((state) => ({
        ...state,
        projects,
        lastUpdated: Date.now(),
        error: null,
      }));
    },

    addProject: (project: Project) => {
      set((state) => ({
        ...state,
        projects: [project, ...state.projects],
        lastUpdated: Date.now(),
      }));
    },

    updateProject: (projectId: string, updates: Partial<Project>) => {
      set((state) => {
        const updatedProjects = state.projects.map((project) =>
          project.id === projectId ? { ...project, ...updates } : project
        );

        const updatedCurrentProject =
          state.currentProject?.id === projectId
            ? { ...state.currentProject, ...updates }
            : state.currentProject;

        return {
          ...state,
          projects: updatedProjects,
          currentProject: updatedCurrentProject,
          lastUpdated: Date.now(),
        };
      });
    },

    removeProject: (projectId: string) => {
      set((state) => {
        const filteredProjects = state.projects.filter(
          (project) => project.id !== projectId
        );

        const updatedCurrentProject =
          state.currentProject?.id === projectId ? null : state.currentProject;

        return {
          ...state,
          projects: filteredProjects,
          currentProject: updatedCurrentProject,
          projectMembers: updatedCurrentProject ? state.projectMembers : [],
          lastUpdated: Date.now(),
        };
      });
    },

    setProjectMembers: (members: User[]) => {
      set((state) => ({
        ...state,
        projectMembers: members,
      }));
    },

    addProjectMember: (member: User) => {
      set((state) => {
        const existingMember = state.projectMembers.find(
          (m) => m.id === member.id
        );
        
        if (!existingMember) {
          return {
            ...state,
            projectMembers: [...state.projectMembers, member],
          };
        }
        
        return state;
      });
    },

    removeProjectMember: (userId: string) => {
      set((state) => ({
        ...state,
        projectMembers: state.projectMembers.filter(
          (member) => member.id !== userId
        ),
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

    refreshProjects: () => {
      // This would typically trigger a refetch from the server
      // For now, we'll just clear the error state
      set((state) => ({
        ...state,
        error: null,
        lastUpdated: Date.now(),
      }));
    },
  },
});

// Utility functions for project management
export const projectUtils = {
  // Check if user is a member of the project
  isProjectMember: (project: Project | null, userId: string): boolean => {
    if (!project || !project.teamMembers) return false;
    return project.teamMembers.includes(userId);
  },

  // Check if user is the project creator
  isProjectCreator: (project: Project | null, userId: string): boolean => {
    return project?.createdBy === userId;
  },

  // Check if user can edit the project
  canEditProject: (project: Project | null, user: User | null): boolean => {
    if (!project || !user) return false;
    
    // Admin and lab managers can edit any project
    if (user.role === 'admin' || user.role === 'lab_manager') return true;
    
    // Project creator can edit their project
    return projectUtils.isProjectCreator(project, user.id);
  },

  // Check if user can delete the project
  canDeleteProject: (project: Project | null, user: User | null): boolean => {
    if (!project || !user) return false;
    
    // Only admin and lab managers can delete projects
    return user.role === 'admin' || user.role === 'lab_manager';
  },

  // Check if user can add members to the project
  canAddMembers: (project: Project | null, user: User | null): boolean => {
    if (!project || !user) return false;
    
    // Admin and lab managers can add members to any project
    if (user.role === 'admin' || user.role === 'lab_manager') return true;
    
    // Project creator can add members to their project
    return projectUtils.isProjectCreator(project, user.id);
  },

  // Get project status based on activity
  getProjectStatus: (project: Project): 'active' | 'inactive' => {
    if (!project.isActive) return 'inactive';
    
    // Could add more sophisticated logic here based on recent activity
    return 'active';
  },

  // Get project member count
  getMemberCount: (project: Project): number => {
    return project.teamMembers?.length || 0;
  },

  // Get formatted project creation date
  getFormattedCreationDate: (project: Project): string => {
    if (!project.createdAt) return 'Unknown';
    return new Date(project.createdAt).toLocaleDateString();
  },

  // Sort projects by various criteria
  sortProjects: (
    projects: Project[],
    sortBy: 'name' | 'createdAt' | 'updatedAt' | 'memberCount',
    order: 'asc' | 'desc' = 'asc'
  ): Project[] => {
    const sorted = [...projects].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
          break;
        case 'updatedAt':
          comparison = new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime();
          break;
        case 'memberCount':
          comparison = (a.teamMembers?.length || 0) - (b.teamMembers?.length || 0);
          break;
      }
      
      return order === 'desc' ? -comparison : comparison;
    });
    
    return sorted;
  },

  // Filter projects by various criteria
  filterProjects: (
    projects: Project[],
    filters: {
      search?: string;
      isActive?: boolean;
      userId?: string; // Projects where user is a member
    }
  ): Project[] => {
    return projects.filter((project) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          project.name.toLowerCase().includes(searchLower) ||
          project.description?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      // Active status filter
      if (filters.isActive !== undefined) {
        if (project.isActive !== filters.isActive) return false;
      }
      
      // User membership filter
      if (filters.userId) {
        const isMember = projectUtils.isProjectMember(project, filters.userId) ||
                        projectUtils.isProjectCreator(project, filters.userId);
        if (!isMember) return false;
      }
      
      return true;
    });
  },
};

// Project selectors for easy access in components
export const projectSelectors = {
  // Get current project
  getCurrentProject: (state: AppStore) => state.currentProject,
  
  // Get all projects
  getProjects: (state: AppStore) => state.projects,
  
  // Get project members
  getProjectMembers: (state: AppStore) => state.projectMembers,
  
  // Get loading state
  isLoading: (state: AppStore) => state.isLoading,
  
  // Get error state
  getError: (state: AppStore) => state.error,
  
  // Get last updated timestamp
  getLastUpdated: (state: AppStore) => state.lastUpdated,
  
  // Get project by ID
  getProjectById: (state: AppStore) => (id: string) => 
    state.projects.find((project) => project.id === id),
  
  // Get user's projects
  getUserProjects: (state: AppStore) => (userId: string) => 
    projectUtils.filterProjects(state.projects, { userId }),
  
  // Get active projects
  getActiveProjects: (state: AppStore) => 
    projectUtils.filterProjects(state.projects, { isActive: true }),
  
  // Check if user can edit current project
  canEditCurrentProject: (state: AppStore) => 
    projectUtils.canEditProject(state.currentProject, state.user),
  
  // Check if user can delete current project
  canDeleteCurrentProject: (state: AppStore) => 
    projectUtils.canDeleteProject(state.currentProject, state.user),
  
  // Check if user can add members to current project
  canAddMembersToCurrentProject: (state: AppStore) => 
    projectUtils.canAddMembers(state.currentProject, state.user),
  
  // Get current project member count
  getCurrentProjectMemberCount: (state: AppStore) => 
    state.currentProject ? projectUtils.getMemberCount(state.currentProject) : 0,
  
  // Check if current user is member of current project
  isCurrentUserProjectMember: (state: AppStore) => 
    state.user ? projectUtils.isProjectMember(state.currentProject, state.user.id) : false,
  
  // Check if current user created current project
  isCurrentUserProjectCreator: (state: AppStore) => 
    state.user ? projectUtils.isProjectCreator(state.currentProject, state.user.id) : false,
};