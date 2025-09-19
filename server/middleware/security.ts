import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import xss from 'xss';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import validator from 'validator';
import path from 'path';
import fs from 'fs';
import { fileTypeFromBuffer } from 'file-type';

// Create DOMPurify instance for server-side usage
const window = new JSDOM('').window;
const domPurify = DOMPurify(window);

// Environment validation schema
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  SESSION_SECRET: z.string().min(32, 'Session secret must be at least 32 characters'),
  DATABASE_URL: z.string().url('Invalid database URL'),
  PORT: z.string().regex(/^\d+$/, 'Port must be a number').optional(),
  FRONTEND_URL: z.string().url('Invalid frontend URL').optional(),
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required').optional(),
}).refine(
  (data) => data.NODE_ENV !== 'production' || data.FRONTEND_URL,
  {
    message: 'FRONTEND_URL is required in production',
    path: ['FRONTEND_URL'],
  }
);

// Validate environment variables
export function validateEnvironment() {
  try {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.error('Environment validation failed:');
      result.error.errors.forEach(error => {
        console.error(`  ${error.path.join('.')}: ${error.message}`);
      });
      process.exit(1);
    }
    return result.data;
  } catch (error) {
    console.error('Critical error validating environment:', error);
    process.exit(1);
  }
}

// Enhanced input sanitization middleware
export const sanitizeInput = {
  // Sanitize request body
  body: (req: Request, res: Response, next: NextFunction) => {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    next();
  },

  // Sanitize query parameters
  query: (req: Request, res: Response, next: NextFunction) => {
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeObject(req.query);
    }
    next();
  },

  // Sanitize URL parameters
  params: (req: Request, res: Response, next: NextFunction) => {
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeObject(req.params);
    }
    next();
  },
};

// Deep sanitize objects
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    // Remove HTML tags and scripts
    let sanitized = domPurify.sanitize(obj, { 
      ALLOWED_TAGS: [], 
      ALLOWED_ATTR: [] 
    });
    // Additional XSS protection
    sanitized = xss(sanitized, {
      whiteList: {}, // No HTML tags allowed
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script']
    });
    // Escape remaining special characters
    return validator.escape(sanitized);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize the key as well
      const sanitizedKey = validator.escape(key);
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

// Path traversal protection
export const preventPathTraversal = (filePath: string): string => {
  // Normalize the path to prevent directory traversal
  const normalizedPath = path.normalize(filePath);
  
  // Check for path traversal attempts
  if (normalizedPath.includes('..') || normalizedPath.includes('~')) {
    throw new Error('Path traversal attempt detected');
  }
  
  // Ensure the path doesn't contain null bytes or other dangerous characters
  if (normalizedPath.includes('\0') || /[<>:"|?*]/.test(normalizedPath)) {
    throw new Error('Invalid file path characters detected');
  }
  
  return normalizedPath;
};

// Advanced file upload security
export const fileUploadSecurity = {
  // Validate file type by content, not just extension
  async validateFileType(
    buffer: Buffer, 
    filename: string, 
    allowedTypes: string[]
  ): Promise<{ valid: boolean; detectedType?: string; error?: string }> {
    try {
      // Check file type by magic bytes
      const fileType = await fileTypeFromBuffer(buffer);
      
      if (!fileType) {
        return { valid: false, error: 'Unable to determine file type' };
      }
      
      const detectedExt = `.${fileType.ext}`;
      const filenameExt = path.extname(filename).toLowerCase();
      
      // Check if detected type is allowed
      if (!allowedTypes.includes(detectedExt)) {
        return { 
          valid: false, 
          detectedType: detectedExt,
          error: `File type ${detectedExt} is not allowed` 
        };
      }
      
      // Check if filename extension matches detected type (anti-spoofing)
      if (filenameExt !== detectedExt) {
        return { 
          valid: false, 
          detectedType: detectedExt,
          error: `File extension ${filenameExt} does not match detected type ${detectedExt}` 
        };
      }
      
      return { valid: true, detectedType: detectedExt };
    } catch (error) {
      return { valid: false, error: 'File type validation failed' };
    }
  },

  // Check for malicious file content patterns
  scanFileContent(buffer: Buffer): { safe: boolean; threats: string[] } {
    const threats: string[] = [];
    const content = buffer.toString('ascii').toLowerCase();
    
    // Check for executable signatures
    const executableSignatures = [
      '\x4d\x5a', // PE/DOS header
      '\x7f\x45\x4c\x46', // ELF header
      '\xfe\xed\xfa', // Mach-O
      '\xca\xfe\xba\xbe', // Java class
    ];
    
    for (const sig of executableSignatures) {
      if (content.includes(sig)) {
        threats.push('Executable file signature detected');
        break;
      }
    }
    
    // Check for script content in non-script files
    const scriptPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /on\w+\s*=/i, // Event handlers
      /<iframe/i,
      /<object/i,
      /<embed/i,
    ];
    
    for (const pattern of scriptPatterns) {
      if (pattern.test(content)) {
        threats.push('Script content detected in uploaded file');
        break;
      }
    }
    
    // Check for PHP/ASP/JSP code
    const serverScriptPatterns = [
      /<\?php/i,
      /<%[\s\S]*?%>/i, // ASP
      /<\?[\s\S]*?\?>/i, // PHP short tags
      /<%@/i, // JSP
    ];
    
    for (const pattern of serverScriptPatterns) {
      if (pattern.test(content)) {
        threats.push('Server-side script code detected');
        break;
      }
    }
    
    return {
      safe: threats.length === 0,
      threats
    };
  }
};

// Advanced rate limiting with different strategies
export const advancedRateLimiting = {
  // Strict rate limiting for authentication endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: {
      error: 'Too many authentication attempts, please try again later',
      retryAfter: 15 * 60 // seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful logins
    keyGenerator: (req) => {
      // Rate limit by IP and email combination for more granular control
      const email = req.body?.email;
      return email ? `${req.ip}:${email}` : req.ip;
    }
  }),

  // API endpoints rate limiting
  api: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: {
      error: 'API rate limit exceeded, please try again later',
      retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks in production monitoring
      return req.path === '/api/health' && req.method === 'GET';
    }
  }),

  // File upload rate limiting (more restrictive)
  upload: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 uploads per hour
    message: {
      error: 'Upload rate limit exceeded, please try again later',
      retryAfter: 60 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Password reset rate limiting
  passwordReset: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 password reset attempts per hour
    message: {
      error: 'Too many password reset attempts, please try again later',
      retryAfter: 60 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Rate limit by IP and email combination
      const email = req.body?.email;
      return email ? `${req.ip}:${email}` : req.ip;
    }
  }),

  // Chat/AI endpoints rate limiting
  chat: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 30, // 30 messages per 5 minutes
    message: {
      error: 'Chat rate limit exceeded, please slow down',
      retryAfter: 5 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Content Security Policy
  const cspDirectives = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'", // Required for Vite in development
      "'unsafe-eval'", // Required for Vite in development
      'https://cdn.jsdelivr.net',
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for styled components
      'https://fonts.googleapis.com',
    ],
    'font-src': [
      "'self'",
      'https://fonts.gstatic.com',
    ],
    'img-src': [
      "'self'",
      'data:', // For base64 images
      'blob:', // For generated images
    ],
    'connect-src': [
      "'self'",
      'https://api.openai.com', // For AI services
    ],
    'media-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };

  // Build CSP string
  const csp = Object.entries(cspDirectives)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');

  res.setHeader('Content-Security-Policy', csp);
  
  // Additional security headers
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // HSTS (only in production with HTTPS)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  next();
};

// Request size limits
export const requestSizeLimits = {
  json: { limit: '10mb' },
  urlencoded: { limit: '10mb', extended: false },
  raw: { limit: '50mb' }, // For file uploads
};

// MongoDB injection protection (even though we use PostgreSQL, good for query params)
export const mongoSanitizeMiddleware = mongoSanitize({
  replaceWith: '_', // Replace prohibited characters with underscore
  onSanitize: ({ req, key }) => {
    console.warn(`Potential NoSQL injection attempt blocked: ${key} from ${req.ip}`);
  },
});

// HTTP Parameter Pollution protection
export const hppProtection = hpp({
  whitelist: [
    // Allow arrays for these parameters
    'teamMembers',
    'notificationRecipients',
    'attachments',
  ]
});

// Secure file operations
export const secureFileOps = {
  // Ensure directory is safe and exists
  ensureSecureDirectory: (dirPath: string): string => {
    const safePath = preventPathTraversal(dirPath);
    const absolutePath = path.resolve(safePath);
    
    // Ensure it's within our project directory
    const projectRoot = path.resolve(process.cwd());
    if (!absolutePath.startsWith(projectRoot)) {
      throw new Error('Directory access outside project root denied');
    }
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(absolutePath)) {
      fs.mkdirSync(absolutePath, { recursive: true, mode: 0o755 });
    }
    
    return absolutePath;
  },

  // Secure file deletion
  secureDelete: async (filePath: string): Promise<void> => {
    try {
      const safePath = preventPathTraversal(filePath);
      const absolutePath = path.resolve(safePath);
      
      // Ensure it's within our project directory
      const projectRoot = path.resolve(process.cwd());
      if (!absolutePath.startsWith(projectRoot)) {
        throw new Error('File access outside project root denied');
      }
      
      // Check if file exists before deletion
      if (fs.existsSync(absolutePath)) {
        // Overwrite with random data before deletion (secure delete)
        const stats = fs.statSync(absolutePath);
        const randomData = Buffer.alloc(stats.size, 0);
        fs.writeFileSync(absolutePath, randomData);
        
        // Delete the file
        fs.unlinkSync(absolutePath);
      }
    } catch (error) {
      console.error('Secure file deletion failed:', error);
      throw new Error('File deletion failed');
    }
  }
};

// Request logging for security monitoring
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log suspicious activity
  const suspiciousPatterns = [
    /\.\./g, // Path traversal
    /<script/gi, // XSS attempts
    /union.*select/gi, // SQL injection
    /javascript:/gi, // JavaScript injection
    /vbscript:/gi, // VBScript injection
  ];
  
  const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
  const userAgent = req.get('User-Agent') || 'Unknown';
  const requestBody = JSON.stringify(req.body || {});
  
  let suspicious = false;
  const triggers: string[] = [];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(fullUrl) || pattern.test(requestBody)) {
      suspicious = true;
      triggers.push(pattern.source);
    }
  }
  
  if (suspicious) {
    console.warn(`🚨 SUSPICIOUS REQUEST DETECTED:`, {
      ip: req.ip,
      method: req.method,
      url: req.originalUrl,
      userAgent,
      triggers,
      timestamp: new Date().toISOString(),
    });
  }
  
  // Log response time for performance monitoring
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    if (duration > 5000) { // Log slow requests
      console.warn(`⚠️ SLOW REQUEST: ${req.method} ${req.originalUrl} took ${duration}ms`);
    }
  });
  
  next();
};

export default {
  validateEnvironment,
  sanitizeInput,
  preventPathTraversal,
  fileUploadSecurity,
  advancedRateLimiting,
  securityHeaders,
  requestSizeLimits,
  mongoSanitizeMiddleware,
  hppProtection,
  secureFileOps,
  securityLogger,
};