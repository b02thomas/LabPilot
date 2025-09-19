import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import rateLimit from 'express-rate-limit';
import validator from 'validator';
import { storage } from '../storage';
import type { User } from '@shared/schema';

// Constants
const SALT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// Password hashing utilities
export const passwordUtils = {
  // Hash a password
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  },

  // Verify a password against its hash
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  },

  // Validate password strength
  validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    if (/(.)\1{2,}/.test(password)) {
      errors.push('Password cannot contain more than 2 consecutive identical characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

// Account security utilities
export const accountSecurity = {
  // Check if account is locked
  isAccountLocked(user: User): boolean {
    if (!user.lockedUntil) return false;
    return Date.now() < user.lockedUntil.getTime();
  },

  // Increment login attempts
  async incrementLoginAttempts(userId: string): Promise<void> {
    const user = await storage.getUser(userId);
    if (!user) return;

    const attempts = user.loginAttempts + 1;
    const updates: any = { loginAttempts: attempts };

    // Lock account if max attempts reached
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      updates.lockedUntil = new Date(Date.now() + LOCKOUT_TIME);
    }

    await storage.updateUser(userId, updates);
  },

  // Reset login attempts
  async resetLoginAttempts(userId: string): Promise<void> {
    await storage.updateUser(userId, {
      loginAttempts: 0,
      lockedUntil: null
    });
  },

  // Update last login time
  async updateLastLogin(userId: string): Promise<void> {
    await storage.updateUser(userId, {
      lastLoginAt: new Date()
    });
  }
};

// Input validation middleware
export const validateInput = {
  // Validate email format
  email: (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;
    
    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    // Sanitize email
    req.body.email = validator.normalizeEmail(email) || email;
    next();
  },

  // Validate password
  password: (req: Request, res: Response, next: NextFunction) => {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({
        error: 'Password is required'
      });
    }

    const validation = passwordUtils.validatePasswordStrength(password);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Password does not meet requirements',
        details: validation.errors
      });
    }

    next();
  },

  // Validate user input (names, etc.)
  userInfo: (req: Request, res: Response, next: NextFunction) => {
    const { firstName, lastName } = req.body;

    // Sanitize names if provided
    if (firstName) {
      req.body.firstName = validator.escape(firstName.trim());
    }
    
    if (lastName) {
      req.body.lastName = validator.escape(lastName.trim());
    }

    next();
  }
};

// Authentication middleware
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user is authenticated via session
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    // Get user from database
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      // Clear invalid session
      req.session.destroy((err) => {
        if (err) console.error('Session destruction error:', err);
      });
      return res.status(401).json({
        error: 'Invalid session'
      });
    }

    // Check if account is locked
    if (accountSecurity.isAccountLocked(user)) {
      return res.status(423).json({
        error: 'Account is temporarily locked due to too many failed login attempts'
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Authentication system error'
    });
  }
};

// Role-based authorization middleware factory
export const requireRole = (...roles: User['role'][]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Admin role requirement
export const requireAdmin = requireRole('admin');

// Lab manager or admin requirement
export const requireLabManager = requireRole('admin', 'lab_manager');

// Rate limiting configurations
export const rateLimiters = {
  // General API rate limiting
  general: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
  }),

  // Login attempts rate limiting
  login: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 login attempts per windowMs
    message: {
      error: 'Too many login attempts from this IP, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true
  }),

  // Registration rate limiting
  register: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // limit each IP to 3 registration attempts per hour
    message: {
      error: 'Too many registration attempts from this IP, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
  }),

  // Password reset rate limiting
  passwordReset: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // limit each IP to 3 password reset attempts per windowMs
    message: {
      error: 'Too many password reset attempts from this IP, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false
  })
};

// Session configuration
export const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'labpilot-default-secret-change-in-production',
  name: 'labpilot.sid',
  resave: false,
  saveUninitialized: false,
  rolling: true, // Reset expiration on activity
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS
    maxAge: 30 * 60 * 1000, // 30 minutes
    sameSite: 'strict' as const // CSRF protection
  }
};

// Audit logging utility
export const auditLog = {
  async logAuthEvent(
    action: string,
    userId: string | null,
    req: Request,
    additional?: Record<string, any>
  ): Promise<void> {
    try {
      await storage.createAuditLog({
        userId,
        action,
        entityType: 'authentication',
        entityId: userId,
        details: {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          ...additional
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }
};