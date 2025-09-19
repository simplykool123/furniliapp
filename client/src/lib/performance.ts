// Performance optimization utilities for Furnili Management System
// Implements comprehensive caching, debouncing, and optimization strategies

import { queryClient } from './queryClient';

// Performance monitoring and optimization
export class PerformanceOptimizer {
  private static performanceLog: Array<{ operation: string; duration: number; timestamp: Date }> = [];
  private static cacheHitRate: { hits: number; misses: number } = { hits: 0, misses: 0 };

  // Debounce utility for expensive operations
  static debounce<T extends (...args: any[]) => void>(
    func: T,
    delay: number
  ): T {
    let timeoutId: NodeJS.Timeout;
    return ((...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    }) as T;
  }

  // Throttle for high-frequency events
  static throttle<T extends (...args: any[]) => void>(
    func: T,
    limit: number
  ): T {
    let inThrottle: boolean;
    return ((...args: any[]) => {
      if (!inThrottle) {
        func.apply(null, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    }) as T;
  }

  // Memoization for expensive calculations
  static memoize<T extends (...args: any[]) => any>(fn: T): T {
    const cache = new Map();
    return ((...args: any[]) => {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        this.cacheHitRate.hits++;
        return cache.get(key);
      }
      this.cacheHitRate.misses++;
      const result = fn(...args);
      cache.set(key, result);
      return result;
    }) as T;
  }

  // Performance timing wrapper
  static async measurePerformance<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.logPerformance(operation, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.logPerformance(`${operation} (error)`, duration);
      throw error;
    }
  }

  // Log performance metrics
  private static logPerformance(operation: string, duration: number) {
    this.performanceLog.push({
      operation,
      duration,
      timestamp: new Date()
    });

    // Keep only last 100 entries
    if (this.performanceLog.length > 100) {
      this.performanceLog.shift();
    }

    // Log slow operations (>1000ms)
    // Only log slow operations in development
    if (duration > 1000 && import.meta.env.DEV) {
      console.warn(`Slow operation detected: ${operation} took ${duration.toFixed(2)}ms`);
    }
  }

  // Get performance stats
  static getPerformanceStats() {
    const recent = this.performanceLog.slice(-20);
    const avgDuration = recent.reduce((sum, log) => sum + log.duration, 0) / recent.length;
    
    return {
      recentOperations: recent,
      averageDuration: avgDuration.toFixed(2),
      cacheHitRate: {
        hits: this.cacheHitRate.hits,
        misses: this.cacheHitRate.misses,
        percentage: (this.cacheHitRate.hits / (this.cacheHitRate.hits + this.cacheHitRate.misses) * 100).toFixed(2)
      },
      slowOperations: this.performanceLog.filter(log => log.duration > 1000)
    };
  }

  // Clear performance logs
  static clearLogs() {
    this.performanceLog = [];
    this.cacheHitRate = { hits: 0, misses: 0 };
  }
}

// VPS-optimized query configurations for different data types
export const optimizedQueryHooks = {
  // Dashboard data - balanced caching for VPS
  useDashboardData: () => {
    return {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: false, // Use global retry logic
    };
  },

  // Product data - longer caching for VPS efficiency
  useProductData: () => {
    return {
      staleTime: 1000 * 60 * 10, // 10 minutes
      gcTime: 1000 * 60 * 20, // 20 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: false, // Use global retry logic
    };
  },

  // Static data - maximum caching for VPS
  useStaticData: () => {
    return {
      staleTime: 1000 * 60 * 30, // 30 minutes
      gcTime: 1000 * 60 * 60, // 1 hour
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: false,
    };
  },

  // Real-time data - minimal but optimized caching
  useRealTimeData: () => {
    return {
      staleTime: 1000 * 30, // 30 seconds
      gcTime: 1000 * 60 * 2, // 2 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: true,
      retry: false, // Use global retry logic
    };
  }
};

// VPS-optimized cache management utilities
export const cacheManager = {
  // Invalidate specific cache patterns with batching
  invalidatePattern: (pattern: string) => {
    return queryClient.invalidateQueries({ queryKey: [pattern] });
  },

  // Batch invalidate multiple patterns
  batchInvalidate: (patterns: string[]) => {
    return Promise.all(
      patterns.map(pattern => 
        queryClient.invalidateQueries({ queryKey: [pattern] })
      )
    );
  },

  // Clear all cache (use sparingly in production)
  clearAll: () => {
    if (import.meta.env.DEV) {
      console.warn('Clearing all cache - this should be rare in production');
    }
    queryClient.clear();
  },

  // VPS-optimized prefetch with longer stale times
  prefetch: async (queryKey: string[], fetcher: () => Promise<any>, staleTime = 1000 * 60 * 5) => {
    await queryClient.prefetchQuery({ 
      queryKey, 
      queryFn: fetcher,
      staleTime // Default 5 minutes for VPS
    });
  },

  // Set cache data manually with optimized GC time
  setData: (queryKey: string[], data: any, gcTime = 1000 * 60 * 15) => {
    queryClient.setQueryData(queryKey, data);
    // Ensure the data persists with longer GC time
    queryClient.setQueryDefaults(queryKey, { gcTime });
  },

  // Get cache statistics for monitoring
  getCacheStats: () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    return {
      totalQueries: queries.length,
      staleQueries: queries.filter(q => q.isStale()).length,
      loadingQueries: queries.filter(q => q.state.fetchStatus === 'fetching').length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
    };
  }
};

// Batch operations for improved performance
export const batchOperations = {
  // Batch multiple API calls
  batchAPICalls: async <T>(calls: Array<() => Promise<T>>): Promise<T[]> => {
    const promises = calls.map(call => call());
    return Promise.all(promises);
  },

  // Batch state updates
  batchStateUpdates: (updates: Array<() => void>) => {
    // Use React 18's automatic batching
    updates.forEach(update => update());
  }
};

// Export performance optimization decorators
export const withPerformanceMonitoring = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  operationName: string
): T => {
  return (async (...args: any[]) => {
    return PerformanceOptimizer.measurePerformance(operationName, () => fn(...args));
  }) as T;
};

export const withDebounce = <T extends (...args: any[]) => void>(
  fn: T,
  delay: number = 300
): T => {
  return PerformanceOptimizer.debounce(fn, delay);
};

export const withThrottle = <T extends (...args: any[]) => void>(
  fn: T,
  limit: number = 100
): T => {
  return PerformanceOptimizer.throttle(fn, limit);
};

export const withMemoization = <T extends (...args: any[]) => any>(fn: T): T => {
  return PerformanceOptimizer.memoize(fn);
};