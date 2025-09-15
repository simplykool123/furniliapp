import { useEffect } from "react";
import { performanceUtils } from "@/lib/queryClient";

interface DataPreloaderProps {
  routes?: string[];
  children: React.ReactNode;
}

export function DataPreloader({ routes, children }: DataPreloaderProps) {
  useEffect(() => {
    // Preload critical data on app start
    performanceUtils.preloadData();
    
    // Preload specific routes if provided
    if (routes) {
      routes.forEach(route => {
        setTimeout(() => {
          // Preload with a slight delay to not block initial render
          import(`@/pages/${route}.tsx`).catch(() => {
            // Ignore preload failures
          });
        }, 100);
      });
    }
  }, [routes]);

  return <>{children}</>;
}