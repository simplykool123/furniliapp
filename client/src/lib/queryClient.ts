import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { debugToken, cleanToken } from "../utils/tokenDebug";

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

  console.log('API Request:', cleanMethod, url, 'Token exists:', !!token);

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
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 15000, // 15 seconds for fresh data
      gcTime: 300000, // 5 minutes cache
      retry: 1,
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
    },
  },
});

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
    patterns.forEach(pattern => {
      queryClient.invalidateQueries({ queryKey: [pattern] });
    });
  },

  // Preload critical data
  preloadData: () => {
    queryClient.prefetchQuery({
      queryKey: ['/api/dashboard/stats'],
      staleTime: 10000, // 10 seconds
    });
    queryClient.prefetchQuery({
      queryKey: ['/api/projects'],
      staleTime: 30000, // 30 seconds
    });
    queryClient.prefetchQuery({
      queryKey: ['/api/quotes'],
      staleTime: 20000, // 20 seconds
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
