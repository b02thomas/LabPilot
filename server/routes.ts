import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileParserService } from "./services/fileParser";
import { chemistryExpertService } from "./services/openai";
import { insertExperimentSchema, insertTaskSchema, insertChatMessageSchema, insertProjectSchema } from "@shared/schema";

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx', '.cdf', '.jdx', '.dx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}`));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });

  // File upload and processing
  app.post("/api/experiments/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const userId = "user-1"; // TODO: Get from authenticated user
      const file = req.file;
      
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

      // Create experiment record
      const projectId = req.body.projectId || null;
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
          mimeType: file.mimetype
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

          // Clean up uploaded file
          fs.unlinkSync(file.path);

        } catch (error) {
          console.error("Error processing file:", error);
          await storage.updateExperiment(experiment.id, {
            status: 'failed',
            metadata: {
              ...(experiment.metadata || {}),
              error: error instanceof Error ? error.message : String(error)
            }
          });
        }
      });

      res.json({ 
        message: "File uploaded successfully", 
        experimentId: experiment.id,
        status: 'processing'
      });

    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Get experiments
  app.get("/api/experiments", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const projectId = req.query.projectId as string;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const experiments = await storage.getExperiments(userId, projectId, limit);
      res.json(experiments);
    } catch (error) {
      console.error("Error fetching experiments:", error);
      res.status(500).json({ message: "Failed to fetch experiments" });
    }
  });

  // Get experiment details with report
  app.get("/api/experiments/:id", async (req, res) => {
    try {
      const experiment = await storage.getExperiment(req.params.id);
      if (!experiment) {
        return res.status(404).json({ message: "Experiment not found" });
      }

      const report = await storage.getReport(experiment.id);
      
      res.json({
        experiment,
        report
      });
    } catch (error) {
      console.error("Error fetching experiment:", error);
      res.status(500).json({ message: "Failed to fetch experiment" });
    }
  });

  // Download report as JSON
  app.get("/api/experiments/:id/report/download", async (req, res) => {
    try {
      const experiment = await storage.getExperiment(req.params.id);
      if (!experiment) {
        return res.status(404).json({ message: "Experiment not found" });
      }

      const report = await storage.getReport(experiment.id);
      if (!report) {
        return res.status(404).json({ message: "Report not found" });
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

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${experiment.originalFilename}_report.json"`);
      res.json(downloadData);

    } catch (error) {
      console.error("Error downloading report:", error);
      res.status(500).json({ message: "Failed to download report" });
    }
  });

  // Task management
  app.get("/api/tasks", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const projectId = req.query.projectId as string;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const tasks = await storage.getTasks(userId, projectId, limit);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const userId = "user-1"; // TODO: Get from authenticated user
      
      const taskData = insertTaskSchema.parse({
        ...req.body,
        requestedBy: userId,
        notificationRecipients: req.body.notificationRecipients?.split(',').map((email: string) => email.trim())
      });

      const task = await storage.createTask(taskData);
      
      // TODO: Send notifications to recipients
      
      res.json({ message: "Task created successfully", taskId: task.id });
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(400).json({ message: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const task = await storage.updateTask(req.params.id, req.body);
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  // Agent Chat Hub
  app.get("/api/chat/messages", async (req, res) => {
    try {
      const userId = req.query.userId as string || "user-1";
      const projectId = req.query.projectId as string;
      const agentType = req.query.agentType as string;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const messages = await storage.getChatMessages(userId, projectId, agentType, limit);
      res.json(messages.reverse()); // Return in chronological order
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ message: "Failed to fetch chat messages" });
    }
  });

  app.post("/api/chat/messages", async (req, res) => {
    try {
      const userId = req.body.userId || "user-1";
      const { message, projectId, agentType = 'chemistry_expert', attachments } = req.body;

      if (!message) {
        return res.status(400).json({ message: "Message is required" });
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

    } catch (error) {
      console.error("Error processing chat message:", error);
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  // Analysis insights
  app.get("/api/analysis/insights", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const timeframe = req.query.timeframe as string || "recent";
      
      const experiments = await storage.getExperiments(userId, undefined, 20);
      const insights = await chemistryExpertService.generateAnalysisInsights(experiments, timeframe);
      
      res.json({ insights });
    } catch (error) {
      console.error("Error generating insights:", error);
      res.status(500).json({ message: "Failed to generate insights" });
    }
  });

  // Projects API
  app.get("/api/projects", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const projects = await storage.getProjects(userId, limit);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const { name, description, createdBy, teamMembers } = req.body;

      if (!name || !createdBy) {
        return res.status(400).json({ message: "Name and createdBy are required" });
      }

      const projectData = insertProjectSchema.parse({
        name,
        description,
        createdBy,
        teamMembers: teamMembers || []
      });

      const project = await storage.createProject(projectData);

      res.json({ message: "Project created successfully", project });
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      const updateData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(req.params.id, updateData);
      res.json({ message: "Project updated successfully", project });
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      await storage.deleteProject(req.params.id);
      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
