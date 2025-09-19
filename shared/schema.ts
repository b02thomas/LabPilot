import { sql } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  timestamp, 
  integer, 
  jsonb, 
  boolean,
  pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enums
export const analysisTypeEnum = pgEnum('analysis_type', ['chromatography', 'spectroscopy', 'csv_data', 'xlsx_data']);
export const analysisStatusEnum = pgEnum('analysis_status', ['pending', 'processing', 'completed', 'failed']);
export const taskStatusEnum = pgEnum('task_status', ['submitted', 'in_progress', 'completed', 'cancelled']);
export const taskPriorityEnum = pgEnum('task_priority', ['low', 'standard', 'high', 'critical']);
export const flagLevelEnum = pgEnum('flag_level', ['info', 'warning', 'critical']);
export const userRoleEnum = pgEnum('user_role', ['admin', 'lab_manager', 'technician', 'analyst']);
export const agentTypeEnum = pgEnum('agent_type', ['chemistry_expert', 'data_agent', 'lab_assistant', 'quality_control']);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  passwordHash: varchar("password_hash").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  role: userRoleEnum("role").notNull().default('technician'),
  profileImageUrl: varchar("profile_image_url"),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerificationToken: varchar("email_verification_token"),
  passwordResetToken: varchar("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  lastLoginAt: timestamp("last_login_at"),
  loginAttempts: integer("login_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Projects table
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  teamMembers: text("team_members").array(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Experiments table
export const experiments = pgTable("experiments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  filename: varchar("filename").notNull(),
  originalFilename: varchar("original_filename").notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: varchar("file_type").notNull(),
  analysisType: analysisTypeEnum("analysis_type").notNull(),
  status: analysisStatusEnum("status").notNull().default('pending'),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  projectId: varchar("project_id").references(() => projects.id),
  rawData: jsonb("raw_data"),
  processedData: jsonb("processed_data"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Analysis reports table
export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  experimentId: varchar("experiment_id").notNull().references(() => experiments.id),
  summary: text("summary"),
  flags: jsonb("flags").$type<Array<{
    level: 'info' | 'warning' | 'critical';
    message: string;
    parameter: string;
    value: any;
    expectedRange?: string;
  }>>(),
  recommendations: text("recommendations"),
  confidence: integer("confidence"), // 0-100
  processingTime: integer("processing_time_ms"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  requestType: varchar("request_type").notNull(),
  priority: taskPriorityEnum("priority").notNull().default('standard'),
  status: taskStatusEnum("status").notNull().default('submitted'),
  requestedBy: varchar("requested_by").notNull().references(() => users.id),
  assignedTo: varchar("assigned_to").references(() => users.id),
  projectId: varchar("project_id").references(() => projects.id),
  deadline: timestamp("deadline"),
  notificationRecipients: text("notification_recipients").array(),
  experimentId: varchar("experiment_id").references(() => experiments.id),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Chat messages table
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  projectId: varchar("project_id").references(() => projects.id),
  agentType: agentTypeEnum("agent_type").notNull().default('chemistry_expert'),
  message: text("message").notNull(),
  response: text("response"),
  attachments: jsonb("attachments").$type<Array<{
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }>>(),
  context: jsonb("context"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Audit logs table
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action").notNull(),
  entityType: varchar("entity_type").notNull(),
  entityId: varchar("entity_id"),
  details: jsonb("details"),
  ipAddress: varchar("ip_address"),
  userAgent: varchar("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Sessions table for express-session storage
export const sessions = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire", { mode: 'date' }).notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  experiments: many(experiments),
  requestedTasks: many(tasks, { relationName: "requestedTasks" }),
  assignedTasks: many(tasks, { relationName: "assignedTasks" }),
  chatMessages: many(chatMessages),
  auditLogs: many(auditLogs),
  projects: many(projects),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [projects.createdBy],
    references: [users.id],
  }),
  chatMessages: many(chatMessages),
  experiments: many(experiments),
  tasks: many(tasks),
}));

export const experimentsRelations = relations(experiments, ({ one, many }) => ({
  uploadedBy: one(users, {
    fields: [experiments.uploadedBy],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [experiments.projectId],
    references: [projects.id],
  }),
  reports: many(reports),
  tasks: many(tasks),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  experiment: one(experiments, {
    fields: [reports.experimentId],
    references: [experiments.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  requestedBy: one(users, {
    fields: [tasks.requestedBy],
    references: [users.id],
    relationName: "requestedTasks",
  }),
  assignedTo: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id],
    relationName: "assignedTasks",
  }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  experiment: one(experiments, {
    fields: [tasks.experimentId],
    references: [experiments.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [chatMessages.projectId],
    references: [projects.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  emailVerificationToken: true,
  passwordResetToken: true,
  passwordResetExpires: true,
  lastLoginAt: true,
  loginAttempts: true,
  lockedUntil: true,
});

export const insertSessionSchema = createInsertSchema(sessions);

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExperimentSchema = createInsertSchema(experiments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Experiment = typeof experiments.$inferSelect;
export type InsertExperiment = z.infer<typeof insertExperimentSchema>;

export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
