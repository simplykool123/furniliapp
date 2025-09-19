import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { debugToken, cleanToken } from "../utils/tokenDebug";
import { setupGlobalErrorHandlers } from "./globalErrorHandler";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  options: {
    method?: string;
    body?: string;
    headers?: Record<string, string>;
  } = {}
): Promise<any> {
  // Debug and clean token before use
  debugToken();
  const token = cleanToken();
  
  // Clean the method string and validate
  const cleanMethod = String(options.method || 'GET').trim().toUpperCase();
  if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(cleanMethod)) {
    console.error('Invalid HTTP method provided:', options.method, 'typeof:', typeof options.method);
    throw new Error(`Invalid HTTP method: ${options.method}`);
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Only log in development
  if (import.meta.env.DEV) {
    console.log('API Request:', cleanMethod, url, 'Token exists:', !!token);
  }

  const res = await fetch(url, {
    method: cleanMethod,
    headers,
    body: options.body,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = localStorage.getItem('authToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(queryKey.join("/") as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      // Optimized for VPS deployment - reduce server load
      staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh longer
      gcTime: 1000 * 60 * 15, // 15 minutes - longer garbage collection
      // Prevent unnecessary refetching
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: true, // Only refetch on network reconnection
      refetchInterval: false,
      // Smart retry with exponential backoff
      retry: (failureCount, error: any) => {
        // Don't retry on client errors
        if (error?.status === 404 || error?.status === 401 || error?.status === 403) {
          return false;
        }
        // Retry up to 2 times for server errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      networkMode: 'online',
    },
    mutations: {
      // Don't retry mutations by default to avoid duplicate submissions
      retry: false,
      networkMode: 'online',
    },
  },
});

// Setup global error handlers for production-ready error handling
setupGlobalErrorHandlers(queryClient);

// Enhanced performance utilities
export const performanceUtils = {
  measureApiCall: async <T>(operation: string, fn: () => Promise<T>): Promise<T> => {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      if (duration > 500) { // Warn on anything over 500ms
        console.warn(`Slow API call: ${operation} took ${duration.toFixed(2)}ms`);
      }
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`Failed API call: ${operation} took ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  },

  batchInvalidate: (patterns: string[]) => {
    // Batch invalidations for better performance
    Promise.all(
      patterns.map(pattern => 
        queryClient.invalidateQueries({ queryKey: [pattern] })
      )
    );
  },

  // Preload critical data with VPS-optimized timing
  preloadData: () => {
    // Use longer stale times for VPS deployment to reduce server load
    queryClient.prefetchQuery({
      queryKey: ['/api/dashboard/stats'],
      staleTime: 1000 * 60 * 5, // 5 minutes
    });
    queryClient.prefetchQuery({
      queryKey: ['/api/projects'],
      staleTime: 1000 * 60 * 10, // 10 minutes
    });
    queryClient.prefetchQuery({
      queryKey: ['/api/quotes'],
      staleTime: 1000 * 60 * 10, // 10 minutes
    });
    queryClient.prefetchQuery({
      queryKey: ['/api/categories'],
      staleTime: 1000 * 60 * 30, // 30 minutes - categories rarely change
    });
  }
};

// Authenticated API request function for components
export const authenticatedApiRequest = async (method: string, url: string, data?: any): Promise<Response> => {
  const token = localStorage.getItem('authToken');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const options: RequestInit = {
    method,
    headers,
    credentials: 'include',
  };
  
  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }
  
  return fetch(url, options);
};
