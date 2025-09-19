import type { 
  User, 
  Project, 
  Experiment, 
  Report, 
  Task, 
  ChatMessage,
  AuditLog 
} from '../schema';

// Base API Response Types
export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiError {
  message: string;
  code?: string;
  statusCode: number;
  details?: any;
}

// Experiment Types with Relations
export interface ExperimentWithReport extends Experiment {
  report?: Report;
  uploadedByUser?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
  project?: Pick<Project, 'id' | 'name'>;
}

export interface ExperimentListItem extends Pick<Experiment, 
  'id' | 'originalFilename' | 'analysisType' | 'status' | 'createdAt' | 'projectId' | 'fileSize'
> {
  flags?: Report['flags'];
  processingTime?: number;
  uploadedByUser?: Pick<User, 'firstName' | 'lastName'>;
}

// Dashboard Stats
export interface DashboardStats {
  activeAnalyses: number;
  criticalAlerts: number;
  completedToday: number;
  totalTimeSaved: number;
  recentExperiments: ExperimentListItem[];
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical';
    uptime: number;
    processingQueue: number;
  };
}

// Chat Types
export interface ChatMessageWithUser extends ChatMessage {
  user?: Pick<User, 'id' | 'firstName' | 'lastName' | 'profileImageUrl'>;
}

export interface ChatResponse extends ApiResponse<ChatMessageWithUser> {
  streamingId?: string;
}

// Task Types with Relations
export interface TaskWithRelations extends Task {
  requestedByUser?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
  assignedToUser?: Pick<User, 'id' | 'firstName' | 'lastName' | 'email'>;
  project?: Pick<Project, 'id' | 'name'>;
  experiment?: Pick<Experiment, 'id' | 'originalFilename' | 'status'>;
}

// Project Types
export interface ProjectWithMembers extends Project {
  memberDetails?: Array<Pick<User, 'id' | 'firstName' | 'lastName' | 'email' | 'role'>>;
  experimentCount?: number;
  taskCount?: number;
  lastActivity?: string;
}

// Upload Types
export interface FileUploadProgress {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  experimentId?: string;
  error?: string;
}

export interface UploadResponse extends ApiResponse<Experiment> {
  processingEstimate?: number;
}

// Report Types
export interface ReportWithExperiment extends Report {
  experiment?: Pick<Experiment, 'id' | 'originalFilename' | 'analysisType' | 'createdAt'>;
}

// Query Key Types for Type Safety
export type QueryKeys = {
  // Experiments
  experiments: ['experiments', { userId?: string; projectId?: string | null; page?: number; limit?: number }?];
  experiment: ['experiment', string];
  experimentReport: ['experiment', string, 'report'];
  
  // Dashboard
  dashboardStats: ['dashboard', 'stats', { userId?: string; projectId?: string | null }?];
  
  // Projects
  projects: ['projects', { userId?: string }?];
  project: ['project', string];
  
  // Tasks
  tasks: ['tasks', { userId?: string; projectId?: string | null; status?: string; page?: number }?];
  task: ['task', string];
  
  // Chat
  chatMessages: ['chat', 'messages', { projectId?: string | null; agentType?: string }?];
  
  // Users
  currentUser: ['user', 'current'];
  users: ['users'];
  
  // System
  health: ['system', 'health'];
};

// Mutation Types
export interface CreateTaskPayload {
  title: string;
  description: string;
  requestType: string;
  priority: 'low' | 'standard' | 'high' | 'critical';
  deadline?: string;
  notificationRecipients: string;
  projectId?: string;
  experimentId?: string;
}

export interface UpdateTaskPayload extends Partial<CreateTaskPayload> {
  status?: 'submitted' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo?: string;
}

export interface CreateProjectPayload {
  name: string;
  description?: string;
  teamMembers?: string[];
}

export interface SendChatMessagePayload {
  message: string;
  userId: string;
  projectId?: string;
  agentType?: 'chemistry_expert' | 'data_agent' | 'lab_assistant' | 'quality_control';
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }>;
}

// WebSocket Types for Real-time Updates
export interface WebSocketMessage {
  type: 'experiment_status' | 'chat_message' | 'task_update' | 'system_alert';
  payload: any;
  timestamp: string;
}

export interface ExperimentStatusUpdate {
  experimentId: string;
  status: Experiment['status'];
  progress?: number;
  error?: string;
}

// Performance Monitoring Types
export interface QueryMetrics {
  queryKey: string;
  duration: number;
  cacheHit: boolean;
  errorCount: number;
  lastUpdated: string;
}

export interface NetworkMetrics {
  requestCount: number;
  avgResponseTime: number;
  errorRate: number;
  cacheHitRate: number;
}