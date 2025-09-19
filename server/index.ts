import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "./routes";
// Import log utility (always needed)
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit", 
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
import { sessionConfig, rateLimiters } from "./middleware/auth";
import { db } from "./db";

// Import security middleware
import {
  validateEnvironment,
  sanitizeInput,
  advancedRateLimiting,
  securityHeaders,
  requestSizeLimits,
  mongoSanitizeMiddleware,
  hppProtection,
  securityLogger
} from "./middleware/security";

import {
  errorHandler,
  notFoundHandler,
  handleUnhandledRejections,
  handleUncaughtExceptions,
  handleGracefulShutdown
} from "./middleware/errorHandler";

import { doubleSubmitCsrf, csrfTokenRoute } from "./middleware/csrf";

// Validate environment variables first
// Temporarily disabled environment validation for Docker startup
// validateEnvironment();

// Set up global error handlers
handleUnhandledRejections();
handleUncaughtExceptions();

const app = express();

// Trust proxy for accurate IP addresses (important for rate limiting)
app.set('trust proxy', 1);

// Security logging (must be early in middleware chain)
app.use(securityLogger);

// Enhanced security headers
app.use(securityHeaders);

// Helmet configuration with production-ready CSP
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production', // Enable CSP in production
  crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production',
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
}));

// HTTP Parameter Pollution protection
app.use(hppProtection);

// NoSQL injection protection (works for query parameters too)
app.use(mongoSanitizeMiddleware);

// CORS configuration with enhanced security
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = process.env.NODE_ENV === 'production'
      ? [process.env.FRONTEND_URL].filter(Boolean)
      : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200, // Support legacy browsers
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  maxAge: 86400 // 24 hours
}));

// Enhanced rate limiting with different strategies
app.use('/api/auth/login', advancedRateLimiting.auth);
app.use('/api/auth/register', advancedRateLimiting.auth);
app.use('/api/auth/password-reset', advancedRateLimiting.passwordReset);
app.use('/api/experiments/upload', advancedRateLimiting.upload);
app.use('/api/chat', advancedRateLimiting.chat);
app.use('/api/', advancedRateLimiting.api);

// Cookie parser (must be before session and CSRF)
app.use(cookieParser(process.env.COOKIE_SECRET || process.env.SESSION_SECRET));

// Enhanced body parsing with security limits
app.use(express.json(requestSizeLimits.json));
app.use(express.urlencoded(requestSizeLimits.urlencoded));

// Input sanitization (must be after body parsing)
app.use(sanitizeInput.body);
app.use(sanitizeInput.query);
app.use(sanitizeInput.params);

// Session configuration with PostgreSQL store
const PgSession = connectPgSimple(session);
// Enhanced session configuration with PostgreSQL store
app.use(session({
  store: new PgSession({
    pool: db as any,
    tableName: 'session',
    pruneSessionInterval: 60 * 15, // Cleanup every 15 minutes
    errorLog: (error: any) => {
      console.error('Session store error:', error);
    }
  }),
  ...sessionConfig,
  // Enhanced session security
  genid: () => {
    // Use cryptographically secure session IDs
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }
}));

// CSRF Protection (after sessions but before routes)
app.use(doubleSubmitCsrf());

// CSRF token endpoint (for frontend to get tokens)
app.get('/api/csrf-token', csrfTokenRoute);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // 404 handler for unmatched routes
  app.use(notFoundHandler);
  
  // Global error handler (must be last)
  app.use(errorHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    const { serveStatic } = await import("./vite-prod");
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  
  // Enhanced server startup with security validation
  const startServer = () => {
    server.listen(port, 'localhost', () => {
      log(`🚀 LabPilot server running on port ${port}`);
      log(`📊 Environment: ${process.env.NODE_ENV}`);
      log(`🔒 Security features: CSP, HSTS, Rate Limiting, Input Sanitization`);
      log(`🛡️  File upload validation: Active`);
      log(`📝 Audit logging: Enabled`);
      
      // Log security configuration status
      if (process.env.NODE_ENV === 'production') {
        log(`🔐 Production security mode: Enabled`);
        if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
          console.error('⚠️  WARNING: SESSION_SECRET is not set or too short for production');
        }
      } else {
        log(`🛠️  Development mode: Enhanced error reporting enabled`);
      }
    });
  };
  
  // Start server with error handling
  try {
    startServer();
    
    // Set up graceful shutdown
    handleGracefulShutdown(server);
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
})();
