import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import validator from 'validator';
import { z } from 'zod';
import { 
  passwordUtils, 
  accountSecurity, 
  validateInput,
  rateLimiters,
  auditLog
} from '../middleware/auth';
import { storage } from '../storage';
import { insertUserSchema } from '@shared/schema';

const router = Router();

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  role: z.enum(['admin', 'lab_manager', 'technician', 'analyst']).optional()
});

const passwordResetRequestSchema = z.object({
  email: z.string().email('Invalid email format')
});

const passwordResetSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
});

// POST /api/auth/register - User registration
router.post('/register', 
  rateLimiters.register,
  validateInput.email,
  validateInput.password,
  validateInput.userInfo,
  async (req: Request, res: Response) => {
    try {
      const validation = registerSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid input',
          details: validation.error.errors
        });
      }

      const { email, password, firstName, lastName, role = 'technician' } = validation.data;

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        await auditLog.logAuthEvent('register_attempt_duplicate_email', null, req, { email });
        return res.status(409).json({
          error: 'User with this email already exists'
        });
      }

      // Hash password
      const passwordHash = await passwordUtils.hashPassword(password);

      // Generate email verification token
      const emailVerificationToken = nanoid(32);

      // Create user
      const userData = {
        email,
        passwordHash,
        firstName,
        lastName,
        role,
        emailVerificationToken,
        emailVerified: false
      };

      const user = await storage.createUser(userData);

      // Log successful registration
      await auditLog.logAuthEvent('register_success', user.id, req, { 
        email: user.email, 
        role: user.role 
      });

      // TODO: Send email verification email
      // await emailService.sendVerificationEmail(user.email, emailVerificationToken);

      res.status(201).json({
        message: 'Registration successful. Please check your email to verify your account.',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          emailVerified: user.emailVerified
        }
      });

    } catch (error) {
      console.error('Registration error:', error);
      await auditLog.logAuthEvent('register_error', null, req, { error: String(error) });
      
      res.status(500).json({
        error: 'Registration failed'
      });
    }
  }
);

// POST /api/auth/login - User login
router.post('/login',
  rateLimiters.login,
  validateInput.email,
  async (req: Request, res: Response) => {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid input',
          details: validation.error.errors
        });
      }

      const { email, password } = validation.data;

      // Get user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        await auditLog.logAuthEvent('login_attempt_invalid_email', null, req, { email });
        return res.status(401).json({
          error: 'Invalid credentials'
        });
      }

      // Check if account is locked
      if (accountSecurity.isAccountLocked(user)) {
        await auditLog.logAuthEvent('login_attempt_locked_account', user.id, req);
        return res.status(423).json({
          error: 'Account is temporarily locked due to too many failed login attempts'
        });
      }

      // Verify password
      const isPasswordValid = await passwordUtils.verifyPassword(password, user.passwordHash);
      if (!isPasswordValid) {
        // Increment failed login attempts
        await accountSecurity.incrementLoginAttempts(user.id);
        await auditLog.logAuthEvent('login_attempt_invalid_password', user.id, req);
        
        return res.status(401).json({
          error: 'Invalid credentials'
        });
      }

      // Check email verification (optional - can be disabled in development)
      if (!user.emailVerified && process.env.NODE_ENV === 'production') {
        await auditLog.logAuthEvent('login_attempt_unverified_email', user.id, req);
        return res.status(401).json({
          error: 'Please verify your email address before logging in',
          requiresEmailVerification: true
        });
      }

      // Reset login attempts on successful login
      await accountSecurity.resetLoginAttempts(user.id);
      
      // Update last login time
      await accountSecurity.updateLastLogin(user.id);

      // Create session
      req.session.userId = user.id;
      req.session.email = user.email;
      req.session.role = user.role;

      // Log successful login
      await auditLog.logAuthEvent('login_success', user.id, req);

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          emailVerified: user.emailVerified,
          profileImageUrl: user.profileImageUrl,
          lastLoginAt: user.lastLoginAt
        }
      });

    } catch (error) {
      console.error('Login error:', error);
      await auditLog.logAuthEvent('login_error', null, req, { error: String(error) });
      
      res.status(500).json({
        error: 'Login failed'
      });
    }
  }
);

// POST /api/auth/logout - User logout
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId;
    
    if (userId) {
      await auditLog.logAuthEvent('logout_success', userId, req);
    }

    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
        return res.status(500).json({
          error: 'Logout failed'
        });
      }

      // Clear session cookie
      res.clearCookie('labpilot.sid');
      
      res.json({
        message: 'Logout successful'
      });
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed'
    });
  }
});

// GET /api/auth/me - Get current user information
router.get('/me', async (req: Request, res: Response) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({
        error: 'Not authenticated'
      });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      // Clear invalid session
      req.session.destroy(() => {});
      return res.status(401).json({
        error: 'Invalid session'
      });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        emailVerified: user.emailVerified,
        profileImageUrl: user.profileImageUrl,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to get user information'
    });
  }
});

// POST /api/auth/password-reset-request - Request password reset
router.post('/password-reset-request',
  rateLimiters.passwordReset,
  validateInput.email,
  async (req: Request, res: Response) => {
    try {
      const validation = passwordResetRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid input',
          details: validation.error.errors
        });
      }

      const { email } = validation.data;

      // Always return success (don't reveal if email exists)
      const user = await storage.getUserByEmail(email);
      
      if (user) {
        // Generate reset token
        const resetToken = nanoid(32);
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Update user with reset token
        await storage.updateUser(user.id, {
          passwordResetToken: resetToken,
          passwordResetExpires: resetExpires
        });

        // Log password reset request
        await auditLog.logAuthEvent('password_reset_requested', user.id, req);

        // TODO: Send password reset email
        // await emailService.sendPasswordResetEmail(user.email, resetToken);
      }

      res.json({
        message: 'If an account with that email exists, a password reset link has been sent.'
      });

    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({
        error: 'Password reset request failed'
      });
    }
  }
);

// POST /api/auth/password-reset - Reset password with token
router.post('/password-reset',
  rateLimiters.passwordReset,
  validateInput.password,
  async (req: Request, res: Response) => {
    try {
      const validation = passwordResetSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid input',
          details: validation.error.errors
        });
      }

      const { token, password } = validation.data;

      // Find user by reset token  
      // Note: This would need to be implemented in storage service
      // For now, we'll need to add a method to find user by reset token
      const user = null; // TODO: Implement getUserByResetToken in storage
      
      if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
        await auditLog.logAuthEvent('password_reset_invalid_token', null, req, { token });
        return res.status(400).json({
          error: 'Invalid or expired reset token'
        });
      }

      // Hash new password
      const passwordHash = await passwordUtils.hashPassword(password);

      // Update user password and clear reset token
      await storage.updateUser(user.id, {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        loginAttempts: 0, // Reset login attempts
        lockedUntil: null
      });

      // Log successful password reset
      await auditLog.logAuthEvent('password_reset_success', user.id, req);

      res.json({
        message: 'Password reset successful'
      });

    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({
        error: 'Password reset failed'
      });
    }
  }
);

// POST /api/auth/change-password - Change password (authenticated users)
router.post('/change-password',
  validateInput.password,
  async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({
          error: 'Authentication required'
        });
      }

      const validation = changePasswordSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid input',
          details: validation.error.errors
        });
      }

      const { currentPassword, newPassword } = validation.data;

      // Get current user
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({
          error: 'Invalid session'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await passwordUtils.verifyPassword(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        await auditLog.logAuthEvent('change_password_invalid_current', user.id, req);
        return res.status(400).json({
          error: 'Current password is incorrect'
        });
      }

      // Hash new password
      const passwordHash = await passwordUtils.hashPassword(newPassword);

      // Update password
      await storage.updateUser(user.id, { passwordHash });

      // Log successful password change
      await auditLog.logAuthEvent('change_password_success', user.id, req);

      res.json({
        message: 'Password changed successfully'
      });

    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({
        error: 'Password change failed'
      });
    }
  }
);

// POST /api/auth/verify-email - Verify email address
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Verification token is required'
      });
    }

    // Find user by verification token
    // TODO: Implement getUserByEmailVerificationToken in storage
    const user = null;

    if (!user) {
      await auditLog.logAuthEvent('email_verification_invalid_token', null, req, { token });
      return res.status(400).json({
        error: 'Invalid verification token'
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        error: 'Email is already verified'
      });
    }

    // Mark email as verified
    await storage.updateUser(user.id, {
      emailVerified: true,
      emailVerificationToken: null
    });

    // Log successful email verification
    await auditLog.logAuthEvent('email_verification_success', user.id, req);

    res.json({
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      error: 'Email verification failed'
    });
  }
});

export default router;