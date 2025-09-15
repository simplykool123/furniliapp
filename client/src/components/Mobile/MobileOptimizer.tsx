import { useState, useEffect, useMemo } from 'react';
import { debounce } from 'lodash';

// Custom hook for mobile detection with performance optimization
export function useIsMobile(breakpoint: number = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    // Debounced resize handler to prevent excessive re-renders
    const debouncedCheck = debounce(checkMobile, 150);
    
    checkMobile(); // Initial check
    window.addEventListener('resize', debouncedCheck);
    
    return () => {
      window.removeEventListener('resize', debouncedCheck);
      debouncedCheck.cancel();
    };
  }, [breakpoint]);

  return isMobile;
}

// Hook for viewport dimensions with optimization
export function useViewport() {
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const updateViewport = debounce(() => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }, 100);

    window.addEventListener('resize', updateViewport);
    return () => {
      window.removeEventListener('resize', updateViewport);
      updateViewport.cancel();
    };
  }, []);

  return viewport;
}

// Performance optimization utility
export function usePerformanceOptimizer() {
  const [isLowPerformanceDevice, setIsLowPerformanceDevice] = useState(false);

  useEffect(() => {
    // Detect low-performance devices
    const connection = (navigator as any).connection;
    const hardwareConcurrency = navigator.hardwareConcurrency || 2;
    const deviceMemory = (navigator as any).deviceMemory || 2;

    const isLowPerf = 
      hardwareConcurrency <= 2 || 
      deviceMemory <= 2 ||
      (connection && connection.effectiveType === 'slow-2g') ||
      (connection && connection.effectiveType === '2g');

    setIsLowPerformanceDevice(isLowPerf);
  }, []);

  return { isLowPerformanceDevice };
}

// Mobile-first responsive utilities
export const mobileBreakpoints = {
  xs: 320,
  sm: 375,
  md: 414,
  lg: 768,
  xl: 1024,
} as const;

export function useMobileBreakpoint() {
  const { width } = useViewport();
  
  return useMemo(() => {
    if (width < mobileBreakpoints.xs) return 'xs';
    if (width < mobileBreakpoints.sm) return 'sm';
    if (width < mobileBreakpoints.md) return 'md';
    if (width < mobileBreakpoints.lg) return 'lg';
    return 'xl';
  }, [width]);
}

// Touch-friendly interaction detection
export function useTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    
    checkTouch();
    window.addEventListener('touchstart', checkTouch, { once: true });
    
    return () => {
      window.removeEventListener('touchstart', checkTouch);
    };
  }, []);

  return isTouch;
}

// Mobile UI Components for compatibility
export function MobileCard({ children, className, ...props }: any) {
  return (
    <div className={`bg-background border rounded-lg shadow-sm ${className || ''}`} {...props}>
      {children}
    </div>
  );
}

export function MobileHeading({ children, level = 2, className, ...props }: any) {
  const Component = `h${level}` as keyof JSX.IntrinsicElements;
  return (
    <Component className={`font-semibold text-foreground ${className || ''}`} {...props}>
      {children}
    </Component>
  );
}

export function MobileText({ children, className, ...props }: any) {
  return (
    <p className={`text-muted-foreground ${className || ''}`} {...props}>
      {children}
    </p>
  );
}