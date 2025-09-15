import { useEffect, useRef, ReactNode } from "react";

interface SwipeGestureProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  className?: string;
}

export default function MobileSwipeGestures({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  className
}: SwipeGestureProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;

      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      // Determine if swipe is primarily horizontal or vertical
      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (absDeltaX > threshold) {
          if (deltaX > 0) {
            onSwipeRight?.();
          } else {
            onSwipeLeft?.();
          }
        }
      } else {
        // Vertical swipe
        if (absDeltaY > threshold) {
          if (deltaY > 0) {
            onSwipeDown?.();
          } else {
            onSwipeUp?.();
          }
        }
      }

      touchStartRef.current = null;
    };

    const handleTouchCancel = () => {
      touchStartRef.current = null;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold]);

  return (
    <div ref={elementRef} className={className}>
      {children}
    </div>
  );
}

// Pull-to-refresh component
interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
  threshold?: number;
  className?: string;
}

export function MobilePullToRefresh({
  children,
  onRefresh,
  disabled = false,
  threshold = 80,
  className
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const refreshIndicatorRef = useRef<HTMLDivElement>(null);
  const isRefreshingRef = useRef(false);
  const pullDistanceRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    const indicator = refreshIndicatorRef.current;
    if (!container || !indicator || disabled) return;

    let startY = 0;
    let currentY = 0;
    let isPulling = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (container.scrollTop > 0 || isRefreshingRef.current) return;
      
      startY = e.touches[0].clientY;
      isPulling = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling || isRefreshingRef.current) return;

      currentY = e.touches[0].clientY;
      const pullDistance = Math.max(0, currentY - startY);
      pullDistanceRef.current = pullDistance;

      if (pullDistance > 0) {
        e.preventDefault();
        const progress = Math.min(pullDistance / threshold, 1);
        const translateY = pullDistance * 0.5;
        
        container.style.transform = `translateY(${translateY}px)`;
        indicator.style.opacity = progress.toString();
        indicator.style.transform = `translateY(${translateY - 60}px) rotate(${progress * 360}deg)`;
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling || isRefreshingRef.current) return;

      isPulling = false;
      const pullDistance = pullDistanceRef.current;

      if (pullDistance >= threshold) {
        isRefreshingRef.current = true;
        indicator.style.opacity = '1';
        
        try {
          await onRefresh();
        } finally {
          isRefreshingRef.current = false;
        }
      }

      // Reset animations
      container.style.transform = 'translateY(0)';
      indicator.style.opacity = '0';
      indicator.style.transform = 'translateY(-60px) rotate(0deg)';
      pullDistanceRef.current = 0;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh, disabled, threshold]);

  return (
    <div className={`relative ${className || ''}`}>
      {/* Pull to refresh indicator */}
      <div
        ref={refreshIndicatorRef}
        className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full opacity-0 transition-all duration-300 z-10"
        style={{ transform: 'translateX(-50%) translateY(-60px) rotate(0deg)' }}
      >
        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
      </div>

      {/* Content container */}
      <div
        ref={containerRef}
        className="transition-transform duration-300 ease-out"
      >
        {children}
      </div>
    </div>
  );
}