import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type {
  DashboardStats,
  ExperimentListItem,
  ExperimentWithReport,
  TaskWithRelations,
  ChatMessageWithUser,
  ProjectWithMembers,
  ApiResponse,
  PaginatedResponse,
  CreateTaskPayload,
  UpdateTaskPayload,
  SendChatMessagePayload,
  CreateProjectPayload,
} from '@shared/types/api';

// Error handling hook
export function useApiError() {
  const { toast } = useToast();
  
  return (error: Error, context?: string) => {
    console.error(`API Error${context ? ` in ${context}` : ''}:`, error);
    
    toast({
      title: "Something went wrong",
      description: error.message || "An unexpected error occurred",
      variant: "destructive",
    });
  };
}

// Dashboard Queries
export function useDashboardStats(selectedProjectId?: string | null) {
  return useQuery({
    queryKey: ['dashboard', 'stats', { userId: 'user-1', projectId: selectedProjectId }],
    queryFn: async (): Promise<DashboardStats> => {
      const response = await apiRequest('GET', '/api/dashboard/stats');
      const data = await response.json();
      return data as DashboardStats;
    },
    // Configuration automatically applied via queryClient defaults
  });
}

// Experiment Queries
export function useExperiments(
  selectedProjectId?: string | null,
  options?: { page?: number; limit?: number }
) {
  const handleError = useApiError();
  
  return useQuery({
    queryKey: ['experiments', { 
      userId: 'user-1', 
      projectId: selectedProjectId,
      ...options 
    }],
    queryFn: async (): Promise<ExperimentListItem[]> => {
      const response = await apiRequest('GET', '/api/experiments');
      const data = await response.json();
      return data as ExperimentListItem[];
    },
    onError: (error: Error) => handleError(error, 'experiments'),
  });
}

export function useInfiniteExperiments(selectedProjectId?: string | null) {
  const handleError = useApiError();
  
  return useInfiniteQuery({
    queryKey: ['experiments', 'infinite', { userId: 'user-1', projectId: selectedProjectId }],
    queryFn: async ({ pageParam = 1 }): Promise<PaginatedResponse<ExperimentListItem>> => {
      const response = await apiRequest('GET', `/api/experiments?page=${pageParam}&limit=20`);
      const data = await response.json();
      return data as PaginatedResponse<ExperimentListItem>;
    },
    getNextPageParam: (lastPage) => 
      lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
    onError: (error: Error) => handleError(error, 'infinite experiments'),
  });
}

export function useExperiment(experimentId: string | null) {
  const handleError = useApiError();
  
  return useQuery({
    queryKey: ['experiment', experimentId],
    queryFn: async (): Promise<ExperimentWithReport> => {
      if (!experimentId) throw new Error('Experiment ID is required');
      const response = await apiRequest('GET', `/api/experiments/${experimentId}`);
      const data = await response.json();
      return data as ExperimentWithReport;
    },
    enabled: !!experimentId,
    onError: (error: Error) => handleError(error, 'experiment details'),
  });
}

export function useExperimentReport(experimentId: string | null) {
  const handleError = useApiError();
  
  return useQuery({
    queryKey: ['experiment', experimentId, 'report'],
    queryFn: async () => {
      if (!experimentId) throw new Error('Experiment ID is required');
      const response = await apiRequest('GET', `/api/experiments/${experimentId}/report`);
      const data = await response.json();
      return data;
    },
    enabled: !!experimentId,
    onError: (error: Error) => handleError(error, 'experiment report'),
  });
}

// Task Queries
export function useTasks(
  filters?: { 
    projectId?: string | null; 
    status?: string; 
    page?: number; 
    limit?: number;
  }
) {
  const handleError = useApiError();
  
  return useQuery({
    queryKey: ['tasks', { userId: 'user-1', ...filters }],
    queryFn: async (): Promise<TaskWithRelations[]> => {
      const response = await apiRequest('GET', '/api/tasks');
      const data = await response.json();
      return data as TaskWithRelations[];
    },
    onError: (error: Error) => handleError(error, 'tasks'),
  });
}

export function useTask(taskId: string | null) {
  const handleError = useApiError();
  
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async (): Promise<TaskWithRelations> => {
      if (!taskId) throw new Error('Task ID is required');
      const response = await apiRequest('GET', `/api/tasks/${taskId}`);
      const data = await response.json();
      return data as TaskWithRelations;
    },
    enabled: !!taskId,
    onError: (error: Error) => handleError(error, 'task details'),
  });
}

// Chat Queries
export function useChatMessages(
  projectId?: string | null,
  agentType?: string
) {
  const handleError = useApiError();
  
  return useQuery({
    queryKey: ['chat', 'messages', { projectId, agentType }],
    queryFn: async (): Promise<ChatMessageWithUser[]> => {
      const response = await apiRequest('GET', '/api/chat/messages');
      const data = await response.json();
      return data as ChatMessageWithUser[];
    },
    onError: (error: Error) => handleError(error, 'chat messages'),
  });
}

// Project Queries
export function useProjects() {
  const handleError = useApiError();
  
  return useQuery({
    queryKey: ['projects', { userId: 'user-1' }],
    queryFn: async (): Promise<ProjectWithMembers[]> => {
      const response = await apiRequest('GET', '/api/projects');
      const data = await response.json();
      return data as ProjectWithMembers[];
    },
    onError: (error: Error) => handleError(error, 'projects'),
  });
}

export function useProject(projectId: string | null) {
  const handleError = useApiError();
  
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async (): Promise<ProjectWithMembers> => {
      if (!projectId) throw new Error('Project ID is required');
      const response = await apiRequest('GET', `/api/projects/${projectId}`);
      const data = await response.json();
      return data as ProjectWithMembers;
    },
    enabled: !!projectId,
    onError: (error: Error) => handleError(error, 'project details'),
  });
}

// User Queries
export function useCurrentUser() {
  return useQuery({
    queryKey: ['user', 'current'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/auth/me');
      const data = await response.json();
      return data;
    },
  });
}

// System Health Query
export function useSystemHealth() {
  return useQuery({
    queryKey: ['system', 'health'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/health');
      const data = await response.json();
      return data;
    },
  });
}

// Mutation Hooks with Optimistic Updates

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const handleError = useApiError();
  
  return useMutation({
    mutationFn: async (data: CreateTaskPayload) => {
      const response = await apiRequest('POST', '/api/tasks', data);
      return response.json();
    },
    onMutate: async (newTask) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      
      // Snapshot previous value
      const previousTasks = queryClient.getQueryData(['tasks', { userId: 'user-1' }]);
      
      // Optimistically update
      queryClient.setQueryData(['tasks', { userId: 'user-1' }], (old: any) => {
        if (!old) return [{ ...newTask, id: 'temp-' + Date.now(), status: 'submitted' }];
        return [...old, { ...newTask, id: 'temp-' + Date.now(), status: 'submitted' }];
      });
      
      return { previousTasks };
    },
    onError: (error: Error, newTask, context) => {
      // Rollback optimistic update
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', { userId: 'user-1' }], context.previousTasks);
      }
      handleError(error, 'creating task');
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
      
      toast({
        title: "Task created",
        description: "Your task has been successfully created.",
      });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const handleError = useApiError();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTaskPayload }) => {
      const response = await apiRequest('PUT', `/api/tasks/${id}`, data);
      return response.json();
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      await queryClient.cancelQueries({ queryKey: ['task', id] });
      
      const previousTasks = queryClient.getQueryData(['tasks', { userId: 'user-1' }]);
      const previousTask = queryClient.getQueryData(['task', id]);
      
      // Update task in list
      queryClient.setQueryData(['tasks', { userId: 'user-1' }], (old: any) => {
        if (!old) return old;
        return old.map((task: any) => 
          task.id === id ? { ...task, ...data } : task
        );
      });
      
      // Update individual task
      queryClient.setQueryData(['task', id], (old: any) => {
        if (!old) return old;
        return { ...old, ...data };
      });
      
      return { previousTasks, previousTask };
    },
    onError: (error: Error, { id }, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', { userId: 'user-1' }], context.previousTasks);
      }
      if (context?.previousTask) {
        queryClient.setQueryData(['task', id], context.previousTask);
      }
      handleError(error, 'updating task');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
      
      toast({
        title: "Task updated",
        description: "Task has been successfully updated.",
      });
    },
  });
}

export function useSendChatMessage() {
  const queryClient = useQueryClient();
  const handleError = useApiError();
  
  return useMutation({
    mutationFn: async (data: SendChatMessagePayload) => {
      const response = await apiRequest('POST', '/api/chat/messages', data);
      return response.json();
    },
    onMutate: async (newMessage) => {
      await queryClient.cancelQueries({ queryKey: ['chat', 'messages'] });
      
      const previousMessages = queryClient.getQueryData(['chat', 'messages']);
      
      // Optimistically add user message
      queryClient.setQueryData(['chat', 'messages'], (old: any) => {
        if (!old) return [{ 
          ...newMessage, 
          id: 'temp-' + Date.now(), 
          createdAt: new Date().toISOString() 
        }];
        return [...old, { 
          ...newMessage, 
          id: 'temp-' + Date.now(), 
          createdAt: new Date().toISOString() 
        }];
      });
      
      return { previousMessages };
    },
    onError: (error: Error, newMessage, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['chat', 'messages'], context.previousMessages);
      }
      handleError(error, 'sending message');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages'] });
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const handleError = useApiError();
  
  return useMutation({
    mutationFn: async (data: CreateProjectPayload) => {
      const response = await apiRequest('POST', '/api/projects', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast({
        title: "Project created",
        description: "Your project has been successfully created.",
      });
    },
    onError: (error: Error) => handleError(error, 'creating project'),
  });
}

// File Upload with Progress Tracking
export function useFileUpload() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const handleError = useApiError();
  
  return useMutation({
    mutationFn: async ({ 
      file, 
      projectId, 
      onProgress 
    }: { 
      file: File; 
      projectId?: string; 
      onProgress?: (progress: number) => void;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (projectId) formData.append('projectId', projectId);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['experiments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
      
      toast({
        title: "File uploaded",
        description: "Your file has been uploaded and analysis has started.",
      });
    },
    onError: (error: Error) => handleError(error, 'uploading file'),
  });
}

// Query invalidation helpers
export function useQueryInvalidation() {
  const queryClient = useQueryClient();
  
  return {
    invalidateExperiments: () => queryClient.invalidateQueries({ queryKey: ['experiments'] }),
    invalidateTasks: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
    invalidateChat: () => queryClient.invalidateQueries({ queryKey: ['chat'] }),
    invalidateDashboard: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    invalidateProjects: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
    invalidateAll: () => queryClient.invalidateQueries(),
  };
}