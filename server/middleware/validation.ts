import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import validator from 'validator';

// Custom Zod validators for enhanced security
const createSecureStringSchema = (maxLength = 255) => 
  z.string()
    .trim()
    .max(maxLength)
    .refine(
      (val) => !val.includes('<script') && !val.includes('javascript:') && !val.includes('vbscript:'),
      { message: 'Invalid characters detected' }
    );

const createSecureEmailSchema = () =>
  z.string()
    .email('Invalid email format')
    .max(320) // RFC 5321 limit
    .transform(email => validator.normalizeEmail(email) || email)
    .refine(validator.isEmail, { message: 'Invalid email format' });

const createSecureUUIDSchema = () =>
  z.string()
    .uuid('Invalid UUID format')
    .refine(validator.isUUID, { message: 'Invalid UUID format' });

const createSecureFilenameSchema = () =>
  z.string()
    .trim()
    .min(1, 'Filename is required')
    .max(255, 'Filename too long')
    .refine(
      (filename) => {
        // Check for dangerous characters and patterns
        const dangerousPatterns = /[<>:"|?*\x00-\x1f]/;
        const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
        const pathTraversal = /\.\./;
        
        return !dangerousPatterns.test(filename) && 
               !reservedNames.test(filename) && 
               !pathTraversal.test(filename);
      },
      { message: 'Invalid filename' }
    );

// Request validation schemas
export const validationSchemas = {
  // User registration
  register: z.object({
    body: z.object({
      email: createSecureEmailSchema(),
      password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password too long')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
               'Password must contain uppercase, lowercase, number, and special character'),
      firstName: createSecureStringSchema(50),
      lastName: createSecureStringSchema(50),
      role: z.enum(['admin', 'lab_manager', 'technician', 'analyst']).optional()
    })
  }),

  // User login
  login: z.object({
    body: z.object({
      email: createSecureEmailSchema(),
      password: z.string().min(1, 'Password is required').max(128)
    })
  }),

  // Password change
  changePassword: z.object({
    body: z.object({
      currentPassword: z.string().min(1, 'Current password is required').max(128),
      newPassword: z.string()
        .min(8, 'New password must be at least 8 characters')
        .max(128, 'New password too long')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
               'New password must contain uppercase, lowercase, number, and special character')
    })
  }),

  // Password reset request
  passwordResetRequest: z.object({
    body: z.object({
      email: createSecureEmailSchema()
    })
  }),

  // Password reset
  passwordReset: z.object({
    body: z.object({
      token: z.string().min(20, 'Invalid token').max(50),
      password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password too long')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
               'Password must contain uppercase, lowercase, number, and special character')
    })
  }),

  // Project creation
  createProject: z.object({
    body: z.object({
      name: createSecureStringSchema(100),
      description: createSecureStringSchema(1000).optional(),
      createdBy: createSecureUUIDSchema(),
      teamMembers: z.array(createSecureEmailSchema()).max(50).optional()
    })
  }),

  // Project update
  updateProject: z.object({
    body: z.object({
      name: createSecureStringSchema(100).optional(),
      description: createSecureStringSchema(1000).optional(),
      teamMembers: z.array(createSecureEmailSchema()).max(50).optional(),
      isActive: z.boolean().optional()
    }),
    params: z.object({
      id: createSecureUUIDSchema()
    })
  }),

  // Experiment upload
  experimentUpload: z.object({
    body: z.object({
      projectId: createSecureUUIDSchema().optional()
    }),
    file: z.object({
      originalname: createSecureFilenameSchema(),
      size: z.number().min(1, 'File cannot be empty').max(50 * 1024 * 1024, 'File too large'), // 50MB
      mimetype: z.string().refine(
        (mimetype) => {
          const allowedTypes = [
            'text/csv',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'application/octet-stream', // For .cdf files
            'text/plain' // For .jdx/.dx files
          ];
          return allowedTypes.includes(mimetype);
        },
        { message: 'Invalid file type' }
      )
    })
  }),

  // Task creation
  createTask: z.object({
    body: z.object({
      title: createSecureStringSchema(200),
      description: createSecureStringSchema(2000).optional(),
      requestType: createSecureStringSchema(50),
      priority: z.enum(['low', 'standard', 'high', 'critical']),
      assignedTo: createSecureUUIDSchema().optional(),
      projectId: createSecureUUIDSchema().optional(),
      experimentId: createSecureUUIDSchema().optional(),
      deadline: z.string().datetime().optional(),
      notificationRecipients: z.array(createSecureEmailSchema()).max(20).optional()
    })
  }),

  // Task update
  updateTask: z.object({
    body: z.object({
      title: createSecureStringSchema(200).optional(),
      description: createSecureStringSchema(2000).optional(),
      status: z.enum(['submitted', 'in_progress', 'completed', 'cancelled']).optional(),
      priority: z.enum(['low', 'standard', 'high', 'critical']).optional(),
      assignedTo: createSecureUUIDSchema().optional(),
      deadline: z.string().datetime().optional(),
      completedAt: z.string().datetime().optional()
    }),
    params: z.object({
      id: createSecureUUIDSchema()
    })
  }),

  // Chat message
  chatMessage: z.object({
    body: z.object({
      userId: createSecureUUIDSchema(),
      projectId: createSecureUUIDSchema().optional(),
      agentType: z.enum(['chemistry_expert', 'data_agent', 'lab_assistant', 'quality_control']),
      message: createSecureStringSchema(5000),
      attachments: z.array(z.object({
        fileName: createSecureFilenameSchema(),
        fileUrl: z.string().url().optional(),
        fileType: z.string().max(50),
        fileSize: z.number().min(0).max(50 * 1024 * 1024)
      })).max(5).optional()
    })
  }),

  // Query parameters validation
  queryParams: {
    pagination: z.object({
      limit: z.string().regex(/^\d+$/).transform(Number).refine(n => n >= 1 && n <= 100).optional(),
      offset: z.string().regex(/^\d+$/).transform(Number).refine(n => n >= 0).optional(),
      page: z.string().regex(/^\d+$/).transform(Number).refine(n => n >= 1).optional()
    }),
    
    userFilter: z.object({
      userId: createSecureUUIDSchema().optional(),
      projectId: createSecureUUIDSchema().optional(),
      agentType: z.enum(['chemistry_expert', 'data_agent', 'lab_assistant', 'quality_control']).optional()
    }),
    
    timeframe: z.object({
      timeframe: z.enum(['recent', 'week', 'month', 'quarter', 'year']).optional()
    })
  },

  // URL parameters validation
  urlParams: {
    id: z.object({
      id: createSecureUUIDSchema()
    }),
    
    experimentId: z.object({
      experimentId: createSecureUUIDSchema()
    })
  }
};

// Validation middleware factory
export function validateRequest(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate the request
      const validation = await schema.safeParseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
        file: req.file,
        files: req.files
      });

      if (!validation.success) {
        const errors = validation.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          received: err.code === 'invalid_type' ? typeof err.received : err.received
        }));

        return res.status(400).json({
          error: 'Validation failed',
          details: errors
        });
      }

      // Replace request data with validated/transformed data
      if (validation.data.body) req.body = validation.data.body;
      if (validation.data.query) req.query = validation.data.query;
      if (validation.data.params) req.params = validation.data.params;

      next();
    } catch (error) {
      console.error('Validation error:', error);
      return res.status(500).json({
        error: 'Validation system error'
      });
    }
  };
}

// Combine multiple validation schemas
export function validateMultiple(...schemas: z.ZodSchema[]) {
  const combinedSchema = z.object({}).and(
    schemas.reduce((acc, schema) => acc.and(schema), z.object({}))
  );
  return validateRequest(combinedSchema);
}

// Specific validation middleware for common use cases
export const validation = {
  // Auth routes
  register: validateRequest(validationSchemas.register),
  login: validateRequest(validationSchemas.login),
  changePassword: validateRequest(validationSchemas.changePassword),
  passwordResetRequest: validateRequest(validationSchemas.passwordResetRequest),
  passwordReset: validateRequest(validationSchemas.passwordReset),

  // Project routes
  createProject: validateRequest(validationSchemas.createProject),
  updateProject: validateRequest(validationSchemas.updateProject),

  // Experiment routes
  experimentUpload: validateRequest(validationSchemas.experimentUpload),

  // Task routes
  createTask: validateRequest(validationSchemas.createTask),
  updateTask: validateRequest(validationSchemas.updateTask),

  // Chat routes
  chatMessage: validateRequest(validationSchemas.chatMessage),

  // Common parameter validations
  requireId: validateRequest(z.object({ params: validationSchemas.urlParams.id })),
  requireExperimentId: validateRequest(z.object({ params: validationSchemas.urlParams.experimentId })),
  
  // Query parameter validations
  paginationQuery: validateRequest(z.object({ query: validationSchemas.queryParams.pagination })),
  userFilterQuery: validateRequest(z.object({ query: validationSchemas.queryParams.userFilter })),
  timeframeQuery: validateRequest(z.object({ query: validationSchemas.queryParams.timeframe }))
};

// Additional custom validators
export const customValidators = {
  // Validate file content type matches extension
  validateFileConsistency: (filename: string, mimetype: string, buffer: Buffer): boolean => {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    const mimeTypeMap: Record<string, string[]> = {
      'csv': ['text/csv', 'application/csv'],
      'xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      'xls': ['application/vnd.ms-excel'],
      'cdf': ['application/octet-stream'],
      'jdx': ['text/plain', 'application/octet-stream'],
      'dx': ['text/plain', 'application/octet-stream']
    };

    if (!ext || !mimeTypeMap[ext]) {
      return false;
    }

    return mimeTypeMap[ext].includes(mimetype);
  },

  // Validate UUID format strictly
  isValidUUID: (uuid: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  },

  // Validate email domain (basic check)
  isValidEmailDomain: (email: string): boolean => {
    const domain = email.split('@')[1];
    if (!domain) return false;
    
    // Check for basic domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
  },

  // Validate that content doesn't contain malicious patterns
  isSafeContent: (content: string): boolean => {
    const dangerousPatterns = [
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi,
      /<iframe[\s\S]*?>/gi,
      /<object[\s\S]*?>/gi,
      /<embed[\s\S]*?>/gi,
      /data:text\/html/gi
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(content));
  }
};

export default {
  validationSchemas,
  validateRequest,
  validateMultiple,
  validation,
  customValidators
};