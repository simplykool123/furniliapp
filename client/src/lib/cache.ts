// Performance optimization: Client-side caching and query optimization
import { queryClient } from "./queryClient";

// Use the consolidated and optimized query client
export const optimizedQueryClient = queryClient;

// Cache keys for consistent invalidation
// Standardized cache keys for consistent invalidation
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
  workOrders: ['api', 'work-orders'],
  quotes: ['api', 'quotes'],
  users: ['api', 'users'],
  pettyCash: ['api', 'petty-cash'],
  production: ['api', 'production'],
} as const;

// Cache time constants for different data types
export const CACHE_TIMES = {
  // Static data (categories, users) - cache longer
  STATIC: 1000 * 60 * 30, // 30 minutes
  // Moderate data (projects, products) - medium cache
  MODERATE: 1000 * 60 * 10, // 10 minutes
  // Dynamic data (dashboard, stats) - shorter cache
  DYNAMIC: 1000 * 60 * 5, // 5 minutes
  // Real-time data (notifications) - minimal cache
  REALTIME: 1000 * 30, // 30 seconds
} as const;

// Prefetch commonly used data with VPS-optimized settings
export const prefetchCommonData = async () => {
  const promises = [
    optimizedQueryClient.prefetchQuery({
      queryKey: cacheKeys.categories,
      staleTime: 1000 * 60 * 30, // Categories change rarely - 30 minutes
    }),
    optimizedQueryClient.prefetchQuery({
      queryKey: cacheKeys.dashboard.stats,
      staleTime: 1000 * 60 * 5, // Stats update more frequently - 5 minutes
    }),
    optimizedQueryClient.prefetchQuery({
      queryKey: cacheKeys.projects,
      staleTime: 1000 * 60 * 10, // Projects change moderately - 10 minutes
    }),
  ];
  
  await Promise.allSettled(promises);
};

// Optimized batch invalidation functions for VPS performance
export const invalidateCache = {
  products: () => optimizedQueryClient.invalidateQueries({ queryKey: cacheKeys.products }),
  categories: () => optimizedQueryClient.invalidateQueries({ queryKey: cacheKeys.categories }),
  dashboard: () => {
    // Batch dashboard invalidations
    Promise.all([
      optimizedQueryClient.invalidateQueries({ queryKey: cacheKeys.dashboard.stats }),
      optimizedQueryClient.invalidateQueries({ queryKey: cacheKeys.dashboard.tasks }),
      optimizedQueryClient.invalidateQueries({ queryKey: cacheKeys.dashboard.activity }),
    ]);
  },
  materialRequests: () => optimizedQueryClient.invalidateQueries({ queryKey: cacheKeys.materialRequests }),
  projects: () => optimizedQueryClient.invalidateQueries({ queryKey: cacheKeys.projects }),
  inventory: () => optimizedQueryClient.invalidateQueries({ queryKey: cacheKeys.inventory }),
  all: () => optimizedQueryClient.invalidateQueries(),
  
  // Batch invalidation for related entities
  batchInvalidate: (keys: Array<keyof typeof cacheKeys>) => {
    Promise.all(
      keys.map(key => {
        const cacheKey = cacheKeys[key];
        if (Array.isArray(cacheKey)) {
          return optimizedQueryClient.invalidateQueries({ queryKey: cacheKey });
        } else {
          // Handle nested cache keys like dashboard
          return Promise.all(
            Object.values(cacheKey).map(nestedKey => 
              optimizedQueryClient.invalidateQueries({ queryKey: nestedKey })
            )
          );
        }
      })
    );
  },
};