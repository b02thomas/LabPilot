import {
  users,
  projects,
  experiments,
  reports,
  tasks,
  chatMessages,
  auditLogs,
  type User,
  type InsertUser,
  type Project,
  type InsertProject,
  type Experiment,
  type InsertExperiment,
  type Report,
  type InsertReport,
  type Task,
  type InsertTask,
  type ChatMessage,
  type InsertChatMessage,
  type AuditLog,
  type InsertAuditLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;
  
  // Project operations
  getProject(id: string): Promise<Project | undefined>;
  getProjects(userId?: string, limit?: number): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  
  // Experiment operations
  getExperiment(id: string): Promise<Experiment | undefined>;
  getExperiments(userId?: string, projectId?: string, limit?: number): Promise<Experiment[]>;
  createExperiment(experiment: InsertExperiment): Promise<Experiment>;
  updateExperiment(id: string, experiment: Partial<InsertExperiment>): Promise<Experiment>;
  
  // Report operations
  getReport(experimentId: string): Promise<Report | undefined>;
  createReport(report: InsertReport): Promise<Report>;
  
  // Task operations
  getTask(id: string): Promise<Task | undefined>;
  getTasks(userId?: string, projectId?: string, limit?: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task>;
  
  // Chat operations
  getChatMessages(userId: string, projectId?: string, agentType?: string, limit?: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  
  // Audit operations
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  
  // Dashboard statistics
  getDashboardStats(userId?: string): Promise<{
    activeAnalyses: number;
    criticalAlerts: number;
    completedToday: number;
    totalTimeSaved: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjects(userId?: string, limit = 50): Promise<Project[]> {
    if (userId) {
      return await db.select().from(projects)
        .where(eq(projects.createdBy, userId))
        .orderBy(desc(projects.createdAt))
        .limit(limit);
    }
    
    return await db.select().from(projects)
      .orderBy(desc(projects.createdAt))
      .limit(limit);
  }

  async createProject(projectData: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(projectData).returning();
    return project;
  }

  async updateProject(id: string, projectData: Partial<InsertProject>): Promise<Project> {
    const [project] = await db
      .update(projects)
      .set({ ...projectData, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  async getExperiment(id: string): Promise<Experiment | undefined> {
    const [experiment] = await db
      .select()
      .from(experiments)
      .where(eq(experiments.id, id));
    return experiment;
  }

  async getExperiments(userId?: string, projectId?: string, limit = 50): Promise<Experiment[]> {
    let conditions = [];
    
    if (userId) {
      conditions.push(eq(experiments.uploadedBy, userId));
    }
    
    if (projectId) {
      conditions.push(eq(experiments.projectId, projectId));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(experiments)
        .where(and(...conditions))
        .orderBy(desc(experiments.createdAt))
        .limit(limit);
    }
    
    return await db.select().from(experiments)
      .orderBy(desc(experiments.createdAt))
      .limit(limit);
  }

  async createExperiment(experimentData: InsertExperiment): Promise<Experiment> {
    const [experiment] = await db
      .insert(experiments)
      .values(experimentData)
      .returning();
    return experiment;
  }

  async updateExperiment(id: string, experimentData: Partial<InsertExperiment>): Promise<Experiment> {
    const [experiment] = await db
      .update(experiments)
      .set({ ...experimentData, updatedAt: new Date() })
      .where(eq(experiments.id, id))
      .returning();
    return experiment;
  }

  async getReport(experimentId: string): Promise<Report | undefined> {
    const [report] = await db
      .select()
      .from(reports)
      .where(eq(reports.experimentId, experimentId));
    return report;
  }

  async createReport(reportData: InsertReport): Promise<Report> {
    const [report] = await db.insert(reports).values([reportData]).returning();
    return report;
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async getTasks(userId?: string, projectId?: string, limit = 50): Promise<Task[]> {
    let conditions = [];
    
    if (userId) {
      conditions.push(
        or(
          eq(tasks.requestedBy, userId),
          eq(tasks.assignedTo, userId)
        )
      );
    }
    
    if (projectId) {
      conditions.push(eq(tasks.projectId, projectId));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(tasks)
        .where(and(...conditions))
        .orderBy(desc(tasks.createdAt))
        .limit(limit);
    }
    
    return await db.select().from(tasks)
      .orderBy(desc(tasks.createdAt))
      .limit(limit);
  }

  async createTask(taskData: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(taskData).returning();
    return task;
  }

  async updateTask(id: string, taskData: Partial<InsertTask>): Promise<Task> {
    const [task] = await db
      .update(tasks)
      .set({ ...taskData, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async getChatMessages(
    userId: string, 
    projectId?: string, 
    agentType?: string, 
    limit = 50
  ): Promise<ChatMessage[]> {
    let conditions = [eq(chatMessages.userId, userId)];

    if (projectId) {
      conditions.push(eq(chatMessages.projectId, projectId));
    }

    if (agentType) {
      conditions.push(eq(chatMessages.agentType, agentType as any));
    }

    return await db
      .select()
      .from(chatMessages)
      .where(and(...conditions))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
  }

  async createChatMessage(messageData: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db
      .insert(chatMessages)
      .values([messageData])
      .returning();
    return message;
  }

  async createAuditLog(logData: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(logData).returning();
    return log;
  }

  async getDashboardStats(userId?: string): Promise<{
    activeAnalyses: number;
    criticalAlerts: number;
    completedToday: number;
    totalTimeSaved: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Active analyses
    const [activeAnalysesResult] = await db
      .select({ count: count() })
      .from(experiments)
      .where(
        and(
          or(
            eq(experiments.status, 'pending'),
            eq(experiments.status, 'processing')
          ),
          userId ? eq(experiments.uploadedBy, userId) : sql`1=1`
        )
      );

    // Critical alerts - count reports with critical flags
    const criticalAlertsQuery = db
      .select({ count: count() })
      .from(reports)
      .innerJoin(experiments, eq(reports.experimentId, experiments.id))
      .where(
        and(
          sql`jsonb_path_exists(${reports.flags}, '$[*] ? (@.level == "critical")')`,
          userId ? eq(experiments.uploadedBy, userId) : sql`1=1`
        )
      );
    
    const [criticalAlertsResult] = await criticalAlertsQuery;

    // Completed today
    const [completedTodayResult] = await db
      .select({ count: count() })
      .from(experiments)
      .where(
        and(
          eq(experiments.status, 'completed'),
          sql`${experiments.updatedAt} >= ${today}`,
          userId ? eq(experiments.uploadedBy, userId) : sql`1=1`
        )
      );

    // Calculate time saved (mock calculation: assume 4.5 hours saved per completed analysis)
    const totalTimeSaved = completedTodayResult.count * 4.5;

    return {
      activeAnalyses: activeAnalysesResult.count,
      criticalAlerts: criticalAlertsResult.count,
      completedToday: completedTodayResult.count,
      totalTimeSaved,
    };
  }

  async testConnection(): Promise<void> {
    try {
      await db.select().from(users).limit(1);
    } catch (error) {
      throw new Error("Database connection test failed");
    }
  }
}

export const storage = new DatabaseStorage();
