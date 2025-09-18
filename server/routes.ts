import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileParserService } from "./services/fileParser";
import { chemistryExpertService } from "./services/openai";
import { insertExperimentSchema, insertTaskSchema, insertChatMessageSchema } from "@shared/schema";

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
      const experimentData = insertExperimentSchema.parse({
        filename: file.filename,
        originalFilename: file.originalname,
        fileSize: file.size,
        fileType: ext,
        analysisType,
        status: 'processing',
        uploadedBy: userId,
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
              ...experiment.metadata,
              error: error.message
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
      const limit = parseInt(req.query.limit as string) || 50;
      
      const experiments = await storage.getExperiments(userId, limit);
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
      const limit = parseInt(req.query.limit as string) || 50;
      
      const tasks = await storage.getTasks(userId, limit);
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

  // Chemistry Expert Chat
  app.get("/api/chat/messages", async (req, res) => {
    try {
      const userId = req.query.userId as string || "user-1";
      const limit = parseInt(req.query.limit as string) || 50;
      
      const messages = await storage.getChatMessages(userId, limit);
      res.json(messages.reverse()); // Return in chronological order
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ message: "Failed to fetch chat messages" });
    }
  });

  app.post("/api/chat/messages", async (req, res) => {
    try {
      const userId = req.body.userId || "user-1";
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      // Get chemistry expert response
      const response = await chemistryExpertService.answerChemistryQuestion(message);

      // Save chat message
      const chatMessage = await storage.createChatMessage(
        insertChatMessageSchema.parse({
          userId,
          message,
          response,
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
      
      const experiments = await storage.getExperiments(userId, 20);
      const insights = await chemistryExpertService.generateAnalysisInsights(experiments, timeframe);
      
      res.json({ insights });
    } catch (error) {
      console.error("Error generating insights:", error);
      res.status(500).json({ message: "Failed to generate insights" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
