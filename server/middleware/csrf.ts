import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Extend Express Request type to include CSRF token
declare global {
  namespace Express {
    interface Request {
      csrfToken?: () => string;
    }
  }
}

interface CSRFOptions {
  ignoreMethods?: string[];
  cookieName?: string;
  headerName?: string;
  secret?: string;
  saltLength?: number;
  sessionKey?: string;
}

const DEFAULT_OPTIONS: Required<CSRFOptions> = {
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  cookieName: 'csrf-token',
  headerName: 'x-csrf-token',
  secret: process.env.CSRF_SECRET || 'csrf-secret-change-in-production',
  saltLength: 8,
  sessionKey: 'csrfSecret',
};

/**
 * Generate a random salt for CSRF token
 */
function generateSalt(length: number = 8): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate CSRF token hash
 */
function generateTokenHash(secret: string, salt: string): string {
  const hash = crypto.createHmac('sha256', secret);
  hash.update(salt);
  return hash.digest('hex');
}

/**
 * Create CSRF token (salt + hash)
 */
function createToken(secret: string, saltLength: number = 8): string {
  const salt = generateSalt(saltLength);
  const hash = generateTokenHash(secret, salt);
  return salt + hash;
}

/**
 * Verify CSRF token
 */
function verifyToken(token: string, secret: string, saltLength: number = 8): boolean {
  if (!token || token.length <= saltLength * 2) {
    return false;
  }
  
  const salt = token.slice(0, saltLength * 2);
  const hash = token.slice(saltLength * 2);
  const expectedHash = generateTokenHash(secret, salt);
  
  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(hash, 'hex'),
    Buffer.from(expectedHash, 'hex')
  );
}

/**
 * Get or create CSRF secret for the session
 */
function getOrCreateSecret(req: Request, sessionKey: string): string {
  if (!req.session) {
    throw new Error('CSRF protection requires sessions');
  }
  
  if (!req.session[sessionKey]) {
    req.session[sessionKey] = crypto.randomBytes(32).toString('hex');
  }
  
  return req.session[sessionKey];
}

/**
 * Main CSRF protection middleware
 */
export function csrfProtection(options: CSRFOptions = {}): (req: Request, res: Response, next: NextFunction) => void {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip CSRF protection for ignored methods
    if (opts.ignoreMethods.includes(req.method)) {
      // Still provide token generation for safe methods
      const secret = getOrCreateSecret(req, opts.sessionKey);
      req.csrfToken = () => createToken(secret, opts.saltLength);
      return next();
    }

    try {
      // Get session secret
      const secret = getOrCreateSecret(req, opts.sessionKey);
      
      // Add token generator to request
      req.csrfToken = () => createToken(secret, opts.saltLength);
      
      // Get token from various sources
      let token = req.headers[opts.headerName.toLowerCase()] as string;
      
      if (!token && req.body && req.body._csrf) {
        token = req.body._csrf;
        delete req.body._csrf; // Remove from body to prevent pollution
      }
      
      if (!token && req.query._csrf) {
        token = req.query._csrf as string;
        delete req.query._csrf; // Remove from query to prevent pollution
      }
      
      // Verify token
      if (!token || !verifyToken(token, secret, opts.saltLength)) {
        const error = new Error('Invalid CSRF token');
        (error as any).code = 'EBADCSRFTOKEN';
        (error as any).statusCode = 403;
        return next(error);
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to set CSRF token in cookie
 */
export function setCsrfCookie(cookieName: string = 'csrf-token'): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.csrfToken) {
      const token = req.csrfToken();
      res.cookie(cookieName, token, {
        httpOnly: false, // Allow client-side JavaScript to read for AJAX requests
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600000 // 1 hour
      });
    }
    next();
  };
}

/**
 * Route handler to get CSRF token
 */
export function csrfTokenRoute(req: Request, res: Response): void {
  if (!req.csrfToken) {
    return res.status(500).json({ error: 'CSRF protection not initialized' });
  }
  
  const token = req.csrfToken();
  res.json({ csrfToken: token });
}

/**
 * Double Submit Cookie CSRF protection (alternative to session-based)
 */
export function doubleSubmitCsrf(options: { cookieName?: string; headerName?: string } = {}): (req: Request, res: Response, next: NextFunction) => void {
  const cookieName = options.cookieName || 'csrf-token';
  const headerName = options.headerName || 'x-csrf-token';
  
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      // Generate and set cookie if not present
      if (!req.cookies[cookieName]) {
        const token = crypto.randomBytes(32).toString('hex');
        res.cookie(cookieName, token, {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 3600000 // 1 hour
        });
      }
      return next();
    }
    
    // For state-changing methods, verify token
    const cookieToken = req.cookies[cookieName];
    const headerToken = req.headers[headerName.toLowerCase()];
    
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      const error = new Error('Invalid CSRF token');
      (error as any).code = 'EBADCSRFTOKEN';
      (error as any).statusCode = 403;
      return next(error);
    }
    
    next();
  };
}

/**
 * Enhanced CSRF protection with additional security features
 */
export function enhancedCsrfProtection(options: CSRFOptions & {
  origin?: boolean;
  referer?: boolean;
  userAgent?: boolean;
} = {}): (req: Request, res: Response, next: NextFunction) => void {
  const baseMiddleware = csrfProtection(options);
  
  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return baseMiddleware(req, res, next);
    }
    
    // Origin header check
    if (options.origin !== false) {
      const origin = req.headers.origin;
      const host = req.headers.host;
      
      if (origin && host && !origin.includes(host)) {
        console.warn(`🚨 CSRF: Origin mismatch - Origin: ${origin}, Host: ${host}, IP: ${req.ip}`);
        const error = new Error('Origin header mismatch');
        (error as any).statusCode = 403;
        return next(error);
      }
    }
    
    // Referer header check (backup for browsers that don't send Origin)
    if (options.referer !== false && !req.headers.origin) {
      const referer = req.headers.referer;
      const host = req.headers.host;
      
      if (referer && host && !referer.includes(host)) {
        console.warn(`🚨 CSRF: Referer mismatch - Referer: ${referer}, Host: ${host}, IP: ${req.ip}`);
        const error = new Error('Referer header mismatch');
        (error as any).statusCode = 403;
        return next(error);
      }
    }
    
    // User-Agent consistency check (basic bot detection)
    if (options.userAgent && req.session) {
      const currentUA = req.headers['user-agent'];
      const sessionUA = req.session.userAgent;
      
      if (!sessionUA) {
        req.session.userAgent = currentUA;
      } else if (sessionUA !== currentUA) {
        console.warn(`🚨 CSRF: User-Agent change - Session: ${sessionUA}, Current: ${currentUA}, IP: ${req.ip}`);
        // Don't block, but log suspicious activity
      }
    }
    
    // Proceed with standard CSRF validation
    baseMiddleware(req, res, next);
  };
}

export default {
  csrfProtection,
  setCsrfCookie,
  csrfTokenRoute,
  doubleSubmitCsrf,
  enhancedCsrfProtection,
};