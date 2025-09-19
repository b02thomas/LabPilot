import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileParserService } from "./services/fileParser";
import { chemistryExpertService } from "./services/openai";
import { insertExperimentSchema, insertTaskSchema, insertChatMessageSchema, insertProjectSchema } from "@shared/schema";
import authRoutes from "./routes/auth";
import { requireAuth, requireLabManager, requireAdmin } from "./middleware/auth";
import { validation } from "./middleware/validation";
import { fileUploadSecurity, secureFileOps } from "./middleware/security";
import { asyncHandler, SecurityError, ValidationError, AuthorizationError } from "./middleware/errorHandler";

// Enhanced multer configuration with security validation
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1, // Only allow single file uploads
    fields: 10, // Limit number of non-file fields
  },
  fileFilter: async (req, file, cb) => {
    try {
      const allowedTypes = ['.csv', '.xlsx', '.cdf', '.jdx', '.dx'];
      const ext = path.extname(file.originalname).toLowerCase();
      
      // Basic extension check
      if (!allowedTypes.includes(ext)) {
        return cb(new Error(`File type ${ext} not allowed`));
      }
      
      // Additional filename security checks
      const secureFilename = path.basename(file.originalname);
      if (secureFilename !== file.originalname || 
          secureFilename.includes('..') || 
          secureFilename.includes('/') ||
          secureFilename.includes('\\')) {
        return cb(new Error('Invalid filename detected'));
      }
      
      cb(null, true);
    } catch (error) {
      cb(error instanceof Error ? error : new Error('File validation failed'));
    }
  },
  // Ensure upload directory is secure
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        const uploadDir = secureFileOps.ensureSecureDirectory('uploads');
        cb(null, uploadDir);
      } catch (error) {
        cb(error instanceof Error ? error : new Error('Upload directory error'));
      }
    },
    filename: (req, file, cb) => {
      // Generate secure filename with timestamp and random suffix
      const timestamp = Date.now();
      const randomSuffix = Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      const secureFilename = `${timestamp}-${randomSuffix}${ext}`;
      cb(null, secureFilename);
    }
  })
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", async (req, res) => {
    try {
      // Check database connection
      await storage.testConnection();
      res.status(200).json({ 
        status: "healthy", 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || "1.0.0"
      });
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(503).json({ 
        status: "unhealthy", 
        timestamp: new Date().toISOString(),
        error: "Database connection failed"
      });
    }
  });

  // Authentication routes
  app.use('/api/auth', authRoutes);

  // Dashboard stats with validation
  app.get("/api/dashboard/stats", 
    requireAuth, 
    validation.userFilterQuery,
    asyncHandler(async (req, res) => {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    })
  );

  // Enhanced file upload with comprehensive security validation
  app.post("/api/experiments/upload", 
    requireAuth,
    upload.single('file'),
    validation.experimentUpload,
    asyncHandler(async (req, res) => {
      if (!req.file) {
        throw new ValidationError('No file uploaded');
      }

      const userId = req.user!.id;
      const file = req.file;
      
      // Read file for content validation
      const fileBuffer = fs.readFileSync(file.path);
      
      // Validate file type by content, not just extension
      const allowedTypes = ['.csv', '.xlsx', '.cdf', '.jdx', '.dx'];
      const typeValidation = await fileUploadSecurity.validateFileType(
        fileBuffer,
        file.originalname,
        allowedTypes
      );
      
      if (!typeValidation.valid) {
        // Clean up the uploaded file
        await secureFileOps.secureDelete(file.path);
        throw new SecurityError(`File validation failed: ${typeValidation.error}`);
      }
      
      // Scan for malicious content
      const contentScan = fileUploadSecurity.scanFileContent(fileBuffer);
      if (!contentScan.safe) {
        // Clean up the uploaded file
        await secureFileOps.secureDelete(file.path);
        throw new SecurityError(`Malicious content detected: ${contentScan.threats.join(', ')}`);
      }
      
      // Determine analysis type based on file extension
      const ext = path.extname(file.originalname).toLowerCase();
      let analysisType: 'chromatography' | 'spectroscopy' | 'csv_data' | 'xlsx_data';
      
      switch (ext) {
        case '.cdf':
          analysisType = 'chromatography';
          break;
        case '.jdx':
        case '.dx':
          analysisType = 'spectroscopy';
          break;
        case '.csv':
          analysisType = 'csv_data';
          break;
        case '.xlsx':
          analysisType = 'xlsx_data';
          break;
        default:
          analysisType = 'csv_data';
      }

      // Create experiment record with enhanced metadata
      const projectId = req.body.projectId || null;
      
      // If projectId provided, verify user has access
      if (projectId) {
        const project = await storage.getProject(projectId);
        if (!project || !project.teamMembers?.includes(userId)) {
          await secureFileOps.secureDelete(file.path);
          throw new AuthorizationError('Access denied to project');
        }
      }
      
      const experimentData = insertExperimentSchema.parse({
        filename: file.filename,
        originalFilename: file.originalname,
        fileSize: file.size,
        fileType: ext,
        analysisType,
        status: 'processing',
        uploadedBy: userId,
        projectId: projectId,
        metadata: {
          uploadTime: new Date().toISOString(),
          mimeType: file.mimetype,
          detectedFileType: typeValidation.detectedType,
          securityScanPassed: contentScan.safe,
          uploadIP: req.ip,
          userAgent: req.get('User-Agent')
        }
      });

      const experiment = await storage.createExperiment(experimentData);

      // Parse file in background
      setImmediate(async () => {
        try {
          const parsedData = await fileParserService.parseFile(
            file.path,
            file.originalname,
            file.size
          );

          // Analyze data with Chemistry Expert
          const analysis = await chemistryExpertService.analyzeChemicalData(
            parsedData.data,
            analysisType,
            parsedData.metadata
          );

          // Update experiment with processed data
          await storage.updateExperiment(experiment.id, {
            status: 'completed',
            rawData: parsedData.data,
            processedData: parsedData,
          });

          // Create analysis report
          await storage.createReport({
            experimentId: experiment.id,
            summary: analysis.summary,
            flags: analysis.flags,
            recommendations: analysis.recommendations,
            confidence: analysis.confidence,
            processingTime: parsedData.metadata.parseTime
          });

          // Securely clean up uploaded file
          await secureFileOps.secureDelete(file.path);

        } catch (error) {
          console.error("Error processing file:", error);
          await storage.updateExperiment(experiment.id, {
            status: 'failed',
            metadata: {
              ...(experiment.metadata || {}),
              error: error instanceof Error ? error.message : String(error)
            }
          });
          
          // Clean up file on processing failure
          try {
            await secureFileOps.secureDelete(file.path);
          } catch (cleanupError) {
            console.error('Failed to clean up file after processing error:', cleanupError);
          }
        }
      });

      res.json({ 
        message: "File uploaded successfully", 
        experimentId: experiment.id,
        status: 'processing',
        securityValidation: {
          fileTypeVerified: true,
          contentScanPassed: true
        }
      });
    })
  );

  // Get experiments with validation and authorization
  app.get("/api/experiments", 
    requireAuth,
    validation.userFilterQuery,
    validation.paginationQuery,
    asyncHandler(async (req, res) => {
      const userId = req.user!.id; // Use authenticated user, not query param
      const projectId = req.query.projectId as string;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100); // Cap at 100
      
      // If projectId specified, verify user has access
      if (projectId) {
        const project = await storage.getProject(projectId);
        if (!project || (!project.teamMembers?.includes(userId) && project.createdBy !== userId)) {
          throw new AuthorizationError('Access denied to project experiments');
        }
      }
      
      const experiments = await storage.getExperiments(userId, projectId, limit);
      res.json(experiments);
    })
  );

  // Get experiment details with authorization check
  app.get("/api/experiments/:id",
    requireAuth,
    validation.requireId,
    asyncHandler(async (req, res) => {
      const experiment = await storage.getExperiment(req.params.id);
      if (!experiment) {
        throw new ValidationError('Experiment not found');
      }
      
      // Authorization: User must be owner or project team member
      const userId = req.user!.id;
      let hasAccess = experiment.uploadedBy === userId;
      
      if (!hasAccess && experiment.projectId) {
        const project = await storage.getProject(experiment.projectId);
        hasAccess = project && (project.teamMembers?.includes(userId) || project.createdBy === userId);
      }
      
      if (!hasAccess) {
        throw new AuthorizationError('Access denied to experiment');
      }

      const report = await storage.getReport(experiment.id);
      
      res.json({ experiment, report });
    })
  );

  // Download report with authorization and secure headers
  app.get("/api/experiments/:id/report/download",
    requireAuth,
    validation.requireId,
    asyncHandler(async (req, res) => {
      const experiment = await storage.getExperiment(req.params.id);
      if (!experiment) {
        throw new ValidationError('Experiment not found');
      }
      
      // Authorization check
      const userId = req.user!.id;
      let hasAccess = experiment.uploadedBy === userId;
      
      if (!hasAccess && experiment.projectId) {
        const project = await storage.getProject(experiment.projectId);
        hasAccess = project && (project.teamMembers?.includes(userId) || project.createdBy === userId);
      }
      
      if (!hasAccess) {
        throw new AuthorizationError('Access denied to experiment report');
      }

      const report = await storage.getReport(experiment.id);
      if (!report) {
        throw new ValidationError('Report not found');
      }

      const downloadData = {
        experiment: {
          id: experiment.id,
          filename: experiment.originalFilename,
          analysisType: experiment.analysisType,
          status: experiment.status,
          createdAt: experiment.createdAt
        },
        report: {
          summary: report.summary,
          flags: report.flags,
          recommendations: report.recommendations,
          confidence: report.confidence,
          processingTime: report.processingTime,
          createdAt: report.createdAt
        },
        data: experiment.processedData
      };

      // Secure headers for file download
      const safeFilename = experiment.originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_');
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}_report.json"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.json(downloadData);
    })
  );

  // Task management with authorization
  app.get("/api/tasks",
    requireAuth,
    validation.userFilterQuery,
    validation.paginationQuery,
    asyncHandler(async (req, res) => {
      const userId = req.user!.id; // Use authenticated user
      const projectId = req.query.projectId as string;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      
      // If projectId specified, verify access
      if (projectId) {
        const project = await storage.getProject(projectId);
        if (!project || (!project.teamMembers?.includes(userId) && project.createdBy !== userId)) {
          throw new AuthorizationError('Access denied to project tasks');
        }
      }
      
      const tasks = await storage.getTasks(userId, projectId, limit);
      res.json(tasks);
    })
  );

  app.post("/api/tasks",
    requireAuth,
    validation.createTask,
    asyncHandler(async (req, res) => {
      const userId = req.user!.id;
      
      // Validate project access if projectId provided
      if (req.body.projectId) {
        const project = await storage.getProject(req.body.projectId);
        if (!project || (!project.teamMembers?.includes(userId) && project.createdBy !== userId)) {
          throw new AuthorizationError('Access denied to project');
        }
      }
      
      // Validate experiment access if experimentId provided
      if (req.body.experimentId) {
        const experiment = await storage.getExperiment(req.body.experimentId);
        if (!experiment || experiment.uploadedBy !== userId) {
          // Also check project access
          if (experiment?.projectId) {
            const project = await storage.getProject(experiment.projectId);
            if (!project || (!project.teamMembers?.includes(userId) && project.createdBy !== userId)) {
              throw new AuthorizationError('Access denied to experiment');
            }
          } else {
            throw new AuthorizationError('Access denied to experiment');
          }
        }
      }
      
      const taskData = insertTaskSchema.parse({
        ...req.body,
        requestedBy: userId,
        notificationRecipients: req.body.notificationRecipients || []
      });

      const task = await storage.createTask(taskData);
      
      // TODO: Send notifications to recipients (implement with rate limiting)
      
      res.status(201).json({ 
        message: "Task created successfully", 
        taskId: task.id 
      });
    })
  );

  app.patch("/api/tasks/:id",
    requireAuth,
    validation.updateTask,
    asyncHandler(async (req, res) => {
      // Get existing task for authorization
      const existingTask = await storage.getTask(req.params.id);
      if (!existingTask) {
        throw new ValidationError('Task not found');
      }
      
      const userId = req.user!.id;
      const userRole = req.user!.role;
      
      // Authorization: task creator, assignee, or admin/lab_manager can update
      const canUpdate = 
        existingTask.requestedBy === userId ||
        existingTask.assignedTo === userId ||
        ['admin', 'lab_manager'].includes(userRole);
        
      if (!canUpdate) {
        throw new AuthorizationError('Access denied to update task');
      }
      
      // Additional authorization for status changes
      if (req.body.status && req.body.status !== existingTask.status) {
        // Only assignee or admin/lab_manager can change status to completed
        if (req.body.status === 'completed' && 
            existingTask.assignedTo !== userId && 
            !['admin', 'lab_manager'].includes(userRole)) {
          throw new AuthorizationError('Only assignee or managers can mark tasks as completed');
        }
      }
      
      const task = await storage.updateTask(req.params.id, req.body);
      res.json({ message: "Task updated successfully", task });
    })
  );

  // Agent Chat Hub with authorization
  app.get("/api/chat/messages",
    requireAuth,
    validation.userFilterQuery,
    validation.paginationQuery,
    asyncHandler(async (req, res) => {
      const userId = req.user!.id; // Use authenticated user
      const projectId = req.query.projectId as string;
      const agentType = req.query.agentType as string;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      
      // If projectId specified, verify access
      if (projectId) {
        const project = await storage.getProject(projectId);
        if (!project || (!project.teamMembers?.includes(userId) && project.createdBy !== userId)) {
          throw new AuthorizationError('Access denied to project chat');
        }
      }
      
      const messages = await storage.getChatMessages(userId, projectId, agentType, limit);
      res.json(messages.reverse());
    })
  );

  app.post("/api/chat/messages",
    requireAuth,
    validation.chatMessage,
    asyncHandler(async (req, res) => {
      const userId = req.user!.id;
      const { message, projectId, agentType = 'chemistry_expert', attachments } = req.body;
      
      // Validate project access if specified
      if (projectId) {
        const project = await storage.getProject(projectId);
        if (!project || (!project.teamMembers?.includes(userId) && project.createdBy !== userId)) {
          throw new AuthorizationError('Access denied to project chat');
        }
      }
      
      // Validate message content for safety
      if (message.length > 5000) {
        throw new ValidationError('Message too long');
      }
      
      // Additional content safety check
      const dangerousPatterns = [
        /<script/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /data:text\/html/gi
      ];
      
      for (const pattern of dangerousPatterns) {
        if (pattern.test(message)) {
          throw new SecurityError('Message contains potentially dangerous content');
        }
      }

      // Get agent response based on agent type
      let response: string;
      switch (agentType) {
        case 'chemistry_expert':
          response = await chemistryExpertService.answerChemistryQuestion(message);
          break;
        case 'data_agent':
          response = `Data Agent: Analyzing your request "${message}". This would include statistical analysis and data visualization insights.`;
          break;
        case 'lab_assistant':
          response = `Lab Assistant: For "${message}", I recommend following standard lab protocols and safety procedures.`;
          break;
        case 'quality_control':
          response = `Quality Control Agent: Regarding "${message}", let me check compliance standards and QC procedures.`;
          break;
        default:
          response = await chemistryExpertService.answerChemistryQuestion(message);
      }

      // Save chat message
      const chatMessage = await storage.createChatMessage(
        insertChatMessageSchema.parse({
          userId,
          projectId: projectId || null,
          agentType,
          message,
          response,
          attachments: attachments || null,
          context: {}
        })
      );

      res.json({
        message: "Message sent successfully",
        response,
        chatId: chatMessage.id
      });
    })
  );

  // Analysis insights with authorization
  app.get("/api/analysis/insights",
    requireAuth,
    validation.timeframeQuery,
    asyncHandler(async (req, res) => {
      const userId = req.user!.id;
      const timeframe = req.query.timeframe as string || "recent";
      
      const experiments = await storage.getExperiments(userId, undefined, 20);
      const insights = await chemistryExpertService.generateAnalysisInsights(experiments, timeframe);
      
      res.json({ insights });
    })
  );

  // Projects API with authorization
  app.get("/api/projects",
    requireAuth,
    validation.paginationQuery,
    asyncHandler(async (req, res) => {
      const userId = req.user!.id;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      
      const projects = await storage.getProjects(userId, limit);
      res.json(projects);
    })
  );

  app.post("/api/projects",
    requireAuth,
    validation.createProject,
    asyncHandler(async (req, res) => {
      const userId = req.user!.id;
      const { name, description, teamMembers } = req.body;

      // Only lab managers and admins can create projects
      if (!['admin', 'lab_manager'].includes(req.user!.role)) {
        throw new AuthorizationError('Insufficient permissions to create projects');
      }

      const projectData = insertProjectSchema.parse({
        name,
        description,
        createdBy: userId, // Use authenticated user
        teamMembers: teamMembers || []
      });

      const project = await storage.createProject(projectData);

      res.status(201).json({ 
        message: "Project created successfully", 
        project 
      });
    })
  );

  app.get("/api/projects/:id",
    requireAuth,
    validation.requireId,
    asyncHandler(async (req, res) => {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        throw new ValidationError('Project not found');
      }
      
      const userId = req.user!.id;
      // Authorization: user must be creator or team member
      if (project.createdBy !== userId && !project.teamMembers?.includes(userId)) {
        throw new AuthorizationError('Access denied to project');
      }
      
      res.json(project);
    })
  );

  app.patch("/api/projects/:id",
    requireAuth,
    validation.updateProject,
    asyncHandler(async (req, res) => {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        throw new ValidationError('Project not found');
      }
      
      const userId = req.user!.id;
      const userRole = req.user!.role;
      
      // Authorization: project creator or admin/lab_manager can update
      if (project.createdBy !== userId && !['admin', 'lab_manager'].includes(userRole)) {
        throw new AuthorizationError('Access denied to update project');
      }
      
      const updateData = insertProjectSchema.partial().parse(req.body);
      const updatedProject = await storage.updateProject(req.params.id, updateData);
      
      res.json({ 
        message: "Project updated successfully", 
        project: updatedProject 
      });
    })
  );

  app.delete("/api/projects/:id",
    requireAuth,
    validation.requireId,
    asyncHandler(async (req, res) => {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        throw new ValidationError('Project not found');
      }
      
      const userId = req.user!.id;
      const userRole = req.user!.role;
      
      // Authorization: only project creator or admin can delete
      if (project.createdBy !== userId && userRole !== 'admin') {
        throw new AuthorizationError('Access denied to delete project');
      }
      
      await storage.deleteProject(req.params.id);
      
      res.json({ message: "Project deleted successfully" });
    })
  );

  const httpServer = createServer(app);
  return httpServer;
}
