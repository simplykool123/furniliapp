// Server-side performance optimization utilities
// Implements database query optimization, caching, and monitoring

import type { Request, Response, NextFunction } from 'express';

// Performance monitoring middleware
export class ServerPerformanceMonitor {
  private static metrics: Array<{
    endpoint: string;
    method: string;
    duration: number;
    timestamp: Date;
    statusCode: number;
  }> = [];

  // Express middleware for performance monitoring
  static middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        this.logRequest(req.path, req.method, duration, res.statusCode);
      });
      
      next();
    };
  }

  private static logRequest(endpoint: string, method: string, duration: number, statusCode: number) {
    this.metrics.push({
      endpoint,
      method,
      duration,
      timestamp: new Date(),
      statusCode
    });

    // Keep only last 1000 entries
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }

    // Log slow requests (>2000ms)
    if (duration > 2000) {
      console.warn(`Slow API request: ${method} ${endpoint} took ${duration}ms`);
    }
  }

  // Get performance statistics
  static getStats() {
    const recent = this.metrics.slice(-50);
    const avgDuration = recent.reduce((sum, metric) => sum + metric.duration, 0) / recent.length;
    
    const byEndpoint = recent.reduce((acc, metric) => {
      const key = `${metric.method} ${metric.endpoint}`;
      if (!acc[key]) {
        acc[key] = { count: 0, totalDuration: 0, avgDuration: 0 };
      }
      acc[key].count++;
      acc[key].totalDuration += metric.duration;
      acc[key].avgDuration = acc[key].totalDuration / acc[key].count;
      return acc;
    }, {} as Record<string, { count: number; totalDuration: number; avgDuration: number }>);

    return {
      totalRequests: this.metrics.length,
      recentRequests: recent.length,
      averageDuration: avgDuration.toFixed(2),
      slowRequests: this.metrics.filter(m => m.duration > 2000).slice(-10),
      endpointStats: byEndpoint
    };
  }

  // Clear metrics
  static clearMetrics() {
    this.metrics = [];
  }
}

// Database query optimization utilities
export class DatabaseOptimizer {
  // Query performance tracking
  private static queryLog: Array<{
    query: string;
    duration: number;
    timestamp: Date;
  }> = [];

  // Measure database query performance
  static async measureQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await queryFn();
      const duration = Date.now() - start;
      this.logQuery(queryName, duration);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.logQuery(`${queryName} (error)`, duration);
      throw error;
    }
  }

  private static logQuery(query: string, duration: number) {
    this.queryLog.push({
      query,
      duration,
      timestamp: new Date()
    });

    // Keep only last 200 entries
    if (this.queryLog.length > 200) {
      this.queryLog.shift();
    }

    // Log slow queries (>1000ms)
    if (duration > 1000) {
      console.warn(`Slow database query: ${query} took ${duration}ms`);
    }
  }

  // Get query performance stats
  static getQueryStats() {
    const recent = this.queryLog.slice(-30);
    const avgDuration = recent.reduce((sum, log) => sum + log.duration, 0) / recent.length;
    
    const byQuery = recent.reduce((acc, log) => {
      if (!acc[log.query]) {
        acc[log.query] = { count: 0, totalDuration: 0, avgDuration: 0 };
      }
      acc[log.query].count++;
      acc[log.query].totalDuration += log.duration;
      acc[log.query].avgDuration = acc[log.query].totalDuration / acc[log.query].count;
      return acc;
    }, {} as Record<string, { count: number; totalDuration: number; avgDuration: number }>);

    return {
      totalQueries: this.queryLog.length,
      recentQueries: recent.length,
      averageDuration: avgDuration.toFixed(2),
      slowQueries: this.queryLog.filter(q => q.duration > 1000).slice(-10),
      queryStats: byQuery
    };
  }
}

// Memory cache for frequently accessed data
export class MemoryCache {
  private static cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  // Set cache data with TTL (time to live in milliseconds)
  static set(key: string, data: any, ttl: number = 300000) { // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  // Get cache data
  static get(key: string): any {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check if expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  // Check if key exists and is valid
  static has(key: string): boolean {
    return this.get(key) !== null;
  }

  // Delete cache entry
  static delete(key: string): boolean {
    return this.cache.delete(key);
  }

  // Clear all cache
  static clear(): void {
    this.cache.clear();
  }

  // Get cache statistics
  static getStats() {
    const now = Date.now();
    const validEntries = Array.from(this.cache.entries()).filter(
      ([_, value]) => now - value.timestamp <= value.ttl
    );

    return {
      totalEntries: this.cache.size,
      validEntries: validEntries.length,
      expiredEntries: this.cache.size - validEntries.length,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  private static estimateMemoryUsage(): string {
    const entries = Array.from(this.cache.entries());
    const size = entries.reduce((total, [key, value]) => {
      return total + key.length + JSON.stringify(value).length;
    }, 0);
    
    if (size < 1024) return `${size} bytes`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  }
}

// Response compression middleware
export const compressionMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;
    
    res.json = function(data: any) {
      // Only compress large responses
      const jsonString = JSON.stringify(data);
      if (jsonString.length > 1024) { // 1KB threshold
        res.set('Content-Encoding', 'json-compressed');
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// Request rate limiting for performance protection
export class RateLimiter {
  private static requests = new Map<string, number[]>();

  static middleware(maxRequests: number = 100, windowMs: number = 60000) {
    return (req: Request, res: Response, next: NextFunction) => {
      const key = req.ip || 'unknown';
      const now = Date.now();
      
      if (!this.requests.has(key)) {
        this.requests.set(key, []);
      }
      
      const timestamps = this.requests.get(key)!;
      
      // Remove old timestamps outside the window
      const validTimestamps = timestamps.filter(timestamp => now - timestamp < windowMs);
      
      if (validTimestamps.length >= maxRequests) {
        res.status(429).json({ error: 'Too many requests' });
        return;
      }
      
      validTimestamps.push(now);
      this.requests.set(key, validTimestamps);
      
      next();
    };
  }
}

// Export classes and utilities for server performance monitoring