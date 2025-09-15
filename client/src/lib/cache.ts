// Performance optimization: Client-side caching and query optimization
import { QueryClient } from "@tanstack/react-query";

// Optimized query client with better caching and performance
export const optimizedQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes for frequently accessed data
      staleTime: 1000 * 60 * 5, // 5 minutes
      // Cache data for 10 minutes before garbage collection
      gcTime: 1000 * 60 * 10, // 10 minutes (was cacheTime in v4)
      // Enable background refetching for fresh data
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      // Retry failed requests with exponential backoff
      retry: (failureCount, error: any) => {
        if (error?.status === 404 || error?.status === 401) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: false,
    },
  },
});

// Cache keys for consistent invalidation
export const cacheKeys = {
  products: ['api', 'products'],
  categories: ['api', 'categories'],
  dashboard: {
    stats: ['api', 'dashboard', 'stats'],
    tasks: ['api', 'dashboard', 'tasks'],
    activity: ['api', 'dashboard', 'activity'],
  },
  materialRequests: ['api', 'material-requests'],
  projects: ['api', 'projects'],
  suppliers: ['api', 'suppliers'],
  inventory: ['api', 'inventory', 'movements'],
} as const;

// Prefetch commonly used data
export const prefetchCommonData = async () => {
  const promises = [
    optimizedQueryClient.prefetchQuery({
      queryKey: cacheKeys.categories,
      staleTime: 1000 * 60 * 10, // Categories change rarely
    }),
    optimizedQueryClient.prefetchQuery({
      queryKey: cacheKeys.dashboard.stats,
      staleTime: 1000 * 60 * 2, // Stats update more frequently
    }),
  ];
  
  await Promise.allSettled(promises);
};

// Optimized invalidation functions
export const invalidateCache = {
  products: () => optimizedQueryClient.invalidateQueries({ queryKey: cacheKeys.products }),
  categories: () => optimizedQueryClient.invalidateQueries({ queryKey: cacheKeys.categories }),
  dashboard: () => {
    optimizedQueryClient.invalidateQueries({ queryKey: cacheKeys.dashboard.stats });
    optimizedQueryClient.invalidateQueries({ queryKey: cacheKeys.dashboard.tasks });
    optimizedQueryClient.invalidateQueries({ queryKey: cacheKeys.dashboard.activity });
  },
  materialRequests: () => optimizedQueryClient.invalidateQueries({ queryKey: cacheKeys.materialRequests }),
  projects: () => optimizedQueryClient.invalidateQueries({ queryKey: cacheKeys.projects }),
  inventory: () => optimizedQueryClient.invalidateQueries({ queryKey: cacheKeys.inventory }),
  all: () => optimizedQueryClient.invalidateQueries(),
};