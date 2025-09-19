import type { User } from '@shared/schema';

// Types for authentication
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: User['role'];
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordReset {
  token: string;
  password: string;
}

export interface ChangePassword {
  currentPassword: string;
  newPassword: string;
}

export interface AuthResponse {
  user: User;
  message: string;
}

export interface AuthError {
  error: string;
  details?: string[];
  requiresEmailVerification?: boolean;
}

// API endpoints
const API_BASE = '/api/auth';

// Utility function to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }
  
  return data;
}

// Auth service class
export class AuthService {
  private static instance: AuthService;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Login user
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(credentials),
    });

    return handleResponse<AuthResponse>(response);
  }

  // Register new user
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(credentials),
    });

    return handleResponse<AuthResponse>(response);
  }

  // Logout user
  async logout(): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/logout`, {
      method: 'POST',
      credentials: 'include',
    });

    return handleResponse<{ message: string }>(response);
  }

  // Get current user information
  async me(): Promise<{ user: User }> {
    const response = await fetch(`${API_BASE}/me`, {
      credentials: 'include',
    });

    return handleResponse<{ user: User }>(response);
  }

  // Request password reset
  async requestPasswordReset(data: PasswordResetRequest): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/password-reset-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    return handleResponse<{ message: string }>(response);
  }

  // Reset password with token
  async resetPassword(data: PasswordReset): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/password-reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    return handleResponse<{ message: string }>(response);
  }

  // Change password for authenticated user
  async changePassword(data: ChangePassword): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    return handleResponse<{ message: string }>(response);
  }

  // Verify email address
  async verifyEmail(token: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ token }),
    });

    return handleResponse<{ message: string }>(response);
  }

  // Check if user is authenticated by trying to get user info
  async checkAuth(): Promise<User | null> {
    try {
      const result = await this.me();
      return result.user;
    } catch (error) {
      return null;
    }
  }

  // Validate password strength
  static validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
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

  // Validate email format
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Get password strength score (0-4)
  static getPasswordStrength(password: string): number {
    let score = 0;
    
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;
    
    return Math.min(score, 4);
  }

  // Get password strength label
  static getPasswordStrengthLabel(score: number): string {
    switch (score) {
      case 0:
      case 1:
        return 'Very Weak';
      case 2:
        return 'Weak';
      case 3:
        return 'Good';
      case 4:
        return 'Strong';
      default:
        return 'Very Weak';
    }
  }

  // Get password strength color for UI
  static getPasswordStrengthColor(score: number): string {
    switch (score) {
      case 0:
      case 1:
        return 'text-red-500';
      case 2:
        return 'text-orange-500';
      case 3:
        return 'text-yellow-500';
      case 4:
        return 'text-green-500';
      default:
        return 'text-red-500';
    }
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();

// Error handling utilities
export const isAuthError = (error: unknown): error is AuthError => {
  return typeof error === 'object' && error !== null && 'error' in error;
};

export const getAuthErrorMessage = (error: unknown): string => {
  if (isAuthError(error)) {
    return error.error;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
};

export const getAuthErrorDetails = (error: unknown): string[] => {
  if (isAuthError(error) && error.details) {
    return error.details;
  }
  
  return [];
};