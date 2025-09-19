import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { MulterError } from 'multer';

// Custom error types
export class SecurityError extends Error {
  constructor(message: string, public code: string = 'SECURITY_ERROR') {
    super(message);
    this.name = 'SecurityError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string = 'Rate limit exceeded') {
    super(message);
    this.name = 'RateLimitError';
  }
}

// Safe error messages that don't leak sensitive information
const SAFE_ERROR_MESSAGES = {
  SECURITY_ERROR: 'Security validation failed',
  VALIDATION_ERROR: 'Invalid request data',
  AUTHENTICATION_ERROR: 'Authentication required',
  AUTHORIZATION_ERROR: 'Insufficient permissions',
  RATE_LIMIT_ERROR: 'Too many requests',
  FILE_UPLOAD_ERROR: 'File upload failed',
  DATABASE_ERROR: 'Database operation failed',
  EXTERNAL_SERVICE_ERROR: 'External service unavailable',
  INTERNAL_ERROR: 'Internal server error'
} as const;

// Error code mappings
const ERROR_CODES = {
  // Client errors (4xx)
  ValidationError: 400,
  ZodError: 400,
  SecurityError: 400,
  MulterError: 400,
  AuthenticationError: 401,
  AuthorizationError: 403,
  RateLimitError: 429,
  
  // Server errors (5xx)
  DatabaseError: 500,
  ExternalServiceError: 502,
  Error: 500,
} as const;

// Sensitive data patterns to scrub from error messages
const SENSITIVE_PATTERNS = [
  /password[s]?[:\s]*[^\s,}]+/gi,
  /token[s]?[:\s]*[^\s,}]+/gi,
  /key[s]?[:\s]*[^\s,}]+/gi,
  /secret[s]?[:\s]*[^\s,}]+/gi,
  /api[_\s]*key[s]?[:\s]*[^\s,}]+/gi,
  /bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi, // Email addresses
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, // IP addresses
];

// Database connection strings and similar sensitive info
const DATABASE_PATTERNS = [
  /postgresql:\/\/[^:\s]+:[^@\s]+@[^:\s]+:\d+\/[^\s]+/gi,
  /mysql:\/\/[^:\s]+:[^@\s]+@[^:\s]+:\d+\/[^\s]+/gi,
  /mongodb:\/\/[^:\s]+:[^@\s]+@[^:\s]+:\d+\/[^\s]+/gi,
];

// Function to sanitize error messages
function sanitizeErrorMessage(message: string): string {
  let sanitized = message;
  
  // Remove sensitive data patterns
  [...SENSITIVE_PATTERNS, ...DATABASE_PATTERNS].forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });
  
  // Remove file paths that might contain usernames or sensitive info
  sanitized = sanitized.replace(/\/[^\s:]+/g, (match) => {
    // Keep relative paths but remove absolute paths
    return match.startsWith('./') || match.startsWith('../') ? match : '[PATH_REDACTED]';
  });
  
  return sanitized;
}

// Function to determine if error details should be shown
function shouldShowErrorDetails(error: Error, environment: string): boolean {
  // Never show detailed errors for security-related issues
  if (error instanceof SecurityError || 
      error instanceof AuthenticationError || 
      error instanceof AuthorizationError) {
    return false;
  }
  
  // Show validation errors (they're safe and helpful for developers)
  if (error instanceof ValidationError || error instanceof ZodError) {
    return true;
  }
  
  // Show detailed errors in development, generic in production
  return environment === 'development';
}

// Function to log errors securely
function logError(error: Error, req: Request, context?: any) {
  const logData = {
    timestamp: new Date().toISOString(),
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    request: {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id,
    },
    context,
  };

  // Log different severity levels based on error type
  if (error instanceof SecurityError) {
    console.error('🚨 SECURITY ERROR:', JSON.stringify(logData, null, 2));
  } else if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
    console.warn('🔒 AUTH ERROR:', JSON.stringify(logData, null, 2));
  } else if (error instanceof ValidationError || error instanceof ZodError) {
    console.log('📋 VALIDATION ERROR:', JSON.stringify(logData, null, 2));
  } else {
    console.error('❌ APPLICATION ERROR:', JSON.stringify(logData, null, 2));
  }
}

// Main error handler middleware
export function errorHandler(
  error: Error, 
  req: Request, 
  res: Response, 
  next: NextFunction
): void {
  // Don't handle if response already sent
  if (res.headersSent) {
    return next(error);
  }

  const environment = process.env.NODE_ENV || 'development';
  let statusCode = 500;
  let message = SAFE_ERROR_MESSAGES.INTERNAL_ERROR;
  let details: any = undefined;

  // Handle different error types
  if (error instanceof SecurityError) {
    statusCode = 400;
    message = SAFE_ERROR_MESSAGES.SECURITY_ERROR;
    
    // Log security errors but don't expose details
    logError(error, req, { securityCode: error.code });
    
  } else if (error instanceof ValidationError) {
    statusCode = 400;
    message = SAFE_ERROR_MESSAGES.VALIDATION_ERROR;
    details = error.details;
    
  } else if (error instanceof ZodError) {
    statusCode = 400;
    message = SAFE_ERROR_MESSAGES.VALIDATION_ERROR;
    details = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      received: err.code === 'invalid_type' ? typeof err.received : err.received
    }));
    
  } else if (error instanceof MulterError) {
    statusCode = 400;
    message = SAFE_ERROR_MESSAGES.FILE_UPLOAD_ERROR;
    
    // Provide specific multer error details
    if (error.code === 'LIMIT_FILE_SIZE') {
      message = 'File size exceeds limit';
    } else if (error.code === 'LIMIT_FILE_COUNT') {
      message = 'Too many files uploaded';
    } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Unexpected file field';
    }
    
  } else if (error instanceof AuthenticationError) {
    statusCode = 401;
    message = SAFE_ERROR_MESSAGES.AUTHENTICATION_ERROR;
    
  } else if (error instanceof AuthorizationError) {
    statusCode = 403;
    message = SAFE_ERROR_MESSAGES.AUTHORIZATION_ERROR;
    
  } else if (error instanceof RateLimitError) {
    statusCode = 429;
    message = SAFE_ERROR_MESSAGES.RATE_LIMIT_ERROR;
    
  } else if (error.message && error.message.includes('database')) {
    statusCode = 500;
    message = SAFE_ERROR_MESSAGES.DATABASE_ERROR;
    
  } else {
    // Generic error handling
    statusCode = ERROR_CODES[error.constructor.name as keyof typeof ERROR_CODES] || 500;
    
    if (shouldShowErrorDetails(error, environment)) {
      message = sanitizeErrorMessage(error.message);
    }
  }

  // Log the error (with full details for debugging)
  logError(error, req);

  // Prepare response
  const errorResponse: any = {
    error: message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
  };

  // Add details if appropriate
  if (details && shouldShowErrorDetails(error, environment)) {
    errorResponse.details = details;
  }

  // Add error ID for tracking (useful for support)
  const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  errorResponse.errorId = errorId;

  // Add stack trace in development (sanitized)
  if (environment === 'development' && error.stack) {
    errorResponse.stack = sanitizeErrorMessage(error.stack);
  }

  res.status(statusCode).json(errorResponse);
}

// Async error handler wrapper
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// 404 handler (should be used before error handler)
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  const error = new Error(`Route ${req.method} ${req.originalUrl} not found`);
  error.name = 'NotFoundError';
  (error as any).statusCode = 404;
  next(error);
}

// Unhandled promise rejection handler
export function handleUnhandledRejections() {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('🚨 UNHANDLED PROMISE REJECTION:', {
      timestamp: new Date().toISOString(),
      reason: reason instanceof Error ? {
        name: reason.name,
        message: sanitizeErrorMessage(reason.message),
        stack: reason.stack
      } : reason,
      promise: promise.toString()
    });
    
    // Exit gracefully
    process.exit(1);
  });
}

// Uncaught exception handler
export function handleUncaughtExceptions() {
  process.on('uncaughtException', (error: Error) => {
    console.error('🚨 UNCAUGHT EXCEPTION:', {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: sanitizeErrorMessage(error.message),
        stack: error.stack
      }
    });
    
    // Exit gracefully
    process.exit(1);
  });
}

// Graceful shutdown handler
export function handleGracefulShutdown(server: any) {
  const shutdown = (signal: string) => {
    console.log(`📴 Received ${signal}. Starting graceful shutdown...`);
    
    server.close((err: any) => {
      if (err) {
        console.error('❌ Error during server shutdown:', err);
        process.exit(1);
      }
      
      console.log('✅ Server closed successfully');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

export default {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  handleUnhandledRejections,
  handleUncaughtExceptions,
  handleGracefulShutdown,
  SecurityError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError
};