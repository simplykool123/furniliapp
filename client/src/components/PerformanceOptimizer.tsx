import { useState, useEffect, useMemo, useCallback } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

// Performance monitoring hook
export const usePerformanceMonitor = () => {
  const [loadTime, setLoadTime] = useState<number>(0);

  useEffect(() => {
    const startTime = performance.now();
    const handleLoad = () => {
      setLoadTime(performance.now() - startTime);
    };
    
    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, []);

  return { loadTime };
};

// Lazy component wrapper for better performance
export const LazyWrapper = ({ children, fallback }: { 
  children: React.ReactNode; 
  fallback?: React.ReactNode;
}) => {
  const [ref, isVisible] = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '100px',
  });

  return (
    <div ref={ref}>
      {isVisible ? children : (fallback || <div className="h-32 bg-gray-100 animate-pulse rounded" />)}
    </div>
  );
};

// Optimized table component for large datasets
export const OptimizedTable = ({ 
  data, 
  renderRow, 
  itemHeight = 60,
  visibleItems = 10 
}: {
  data: any[];
  renderRow: (item: any, index: number) => React.ReactNode;
  itemHeight?: number;
  visibleItems?: number;
}) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleData = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(startIndex + visibleItems, data.length);
    return data.slice(startIndex, endIndex).map((item, index) => ({
      ...item,
      index: startIndex + index
    }));
  }, [data, scrollTop, itemHeight, visibleItems]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div 
      className="overflow-auto max-h-96"
      onScroll={handleScroll}
      style={{ height: Math.min(data.length * itemHeight, visibleItems * itemHeight) }}
    >
      <div style={{ height: data.length * itemHeight, position: 'relative' }}>
        <div 
          style={{ 
            transform: `translateY(${Math.floor(scrollTop / itemHeight) * itemHeight}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleData.map((item) => (
            <div key={item.index} style={{ height: itemHeight }}>
              {renderRow(item, item.index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Memory optimization for form data
export const useOptimizedForm = <T extends Record<string, any>>(initialData: T) => {
  const [data, setData] = useState<T>(initialData);
  
  const updateField = useCallback((field: keyof T, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setData(initialData);
  }, [initialData]);

  return { data, updateField, resetForm };
};

// Debounced search hook for better performance
export const useDebouncedSearch = (searchTerm: string, delay: number = 300) => {
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, delay]);

  return debouncedTerm;
};