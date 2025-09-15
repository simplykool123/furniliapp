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
    if (duration > 1000) {
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

// Optimized query hooks with performance monitoring
export const optimizedQueryHooks = {
  // Dashboard data with aggressive caching
  useDashboardData: () => {
    return {
      staleTime: 30000, // 30 seconds
      cacheTime: 300000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1
    };
  },

  // Product data with moderate caching
  useProductData: () => {
    return {
      staleTime: 60000, // 1 minute
      cacheTime: 600000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 2
    };
  },

  // Real-time data with minimal caching
  useRealTimeData: () => {
    return {
      staleTime: 0,
      cacheTime: 30000, // 30 seconds
      refetchOnWindowFocus: true,
      retry: 3
    };
  }
};

// Cache management utilities
export const cacheManager = {
  // Invalidate specific cache patterns
  invalidatePattern: (pattern: string) => {
    queryClient.invalidateQueries({ queryKey: [pattern] });
  },

  // Clear all cache
  clearAll: () => {
    queryClient.clear();
  },

  // Prefetch data
  prefetch: async (queryKey: string[], fetcher: () => Promise<any>) => {
    await queryClient.prefetchQuery({ 
      queryKey, 
      queryFn: fetcher,
      staleTime: 60000 
    });
  },

  // Set cache data manually
  setData: (queryKey: string[], data: any) => {
    queryClient.setQueryData(queryKey, data);
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