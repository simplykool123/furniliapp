import { queryClient } from "./queryClient";

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

class AuthService {
  private user: User | null = null;
  private token: string | null = null;
  private isInitialized: boolean = false;

  constructor() {
    // Load user and token from localStorage on initialization
    this.initializeAuth();
  }

  private initializeAuth() {
    try {
      const storedToken = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('authUser');
      
      if (storedToken && storedUser) {
        this.token = storedToken;
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser && typeof parsedUser === 'object' && parsedUser.id) {
          this.user = parsedUser;
        } else {
          this.logout();
        }
      }
    } catch (e) {
      console.warn('Auth initialization failed:', e);
      this.logout();
    } finally {
      this.isInitialized = true;
    }
  }

  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    
    // Store token and user data
    this.token = data.token;
    this.user = data.user;
    
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('authUser', JSON.stringify(data.user));
    
    return data;
  }

  logout(): void {
    this.user = null;
    this.token = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    // Also clean any legacy token formats
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token');
    queryClient.clear();
  }

  getUser(): User | null {
    if (!this.isInitialized) {
      this.initializeAuth();
    }
    return this.user;
  }

  isAuthInitialized(): boolean {
    return this.isInitialized;
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return !!this.user && !!this.token;
  }

  hasRole(roles: string[]): boolean {
    return this.user ? roles.includes(this.user.role) : false;
  }
}

export const authService = new AuthService();

// Helper function for making authenticated API requests
export async function authenticatedApiRequest(method: string, url: string, data?: any): Promise<any> {
  const token = authService.getToken();
  
  if (!token) {
    throw new Error('No authentication token available');
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
  };
  
  if (data) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  if (response.status === 401) {
    authService.logout();
    window.location.href = '/login';
    throw new Error('401: Unauthorized - Session expired');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `Request failed with status ${response.status}`);
  }

  // Return JSON data instead of Response object
  return await response.json();
}

// Legacy exports for backward compatibility
export const getCurrentUser = () => authService.getUser();
export const getToken = () => authService.getToken();
export const setToken = (token: string) => {
  localStorage.setItem('authToken', token);
  (authService as any).token = token;
};
export const isAuthenticated = () => authService.isAuthenticated();
export const logout = () => authService.logout();
export const hasRole = (role: string) => authService.hasRole([role]);
export const isAdmin = () => authService.hasRole(['admin']);
export const isStaff = () => authService.hasRole(['admin', 'staff']);