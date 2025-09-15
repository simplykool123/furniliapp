import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Menu, ChevronLeft } from 'lucide-react';
import { useIsMobile, useTouchDevice } from './MobileOptimizer';
import { Button } from '@/components/ui/button';
import SimpleMobileSidebar from './SimpleMobileSidebar';

interface MobileLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export default function MobileLayout({
  children,
  title,
  subtitle,
  showBack,
  onBack,
  actions,
  className
}: MobileLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const isTouch = useTouchDevice();

  // Auto-close sidebar on route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [title]);

  // Mobile layout component - render for all devices
  // Parent component handles mobile detection

  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {/* Mobile Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 safe-area-inset-top">
        <div className="flex h-14 items-center px-4">
          {/* Menu Button */}
          <Button
            variant="ghost"
            size="sm"
            className="mr-2 px-2 hover:bg-furnili-brown/10"
            onClick={() => setSidebarOpen(true)}
            data-hamburger
          >
            <Menu className="h-5 w-5 text-furnili-brown" />
            <span className="sr-only">Open menu</span>
          </Button>

          {/* Back Button */}
          {showBack && onBack && (
            <Button
              variant="ghost"
              size="sm"
              className="mr-2 px-2"
              onClick={onBack}
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="sr-only">Go back</span>
            </Button>
          )}

          {/* Title */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate text-furnili-brown">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate">
                {subtitle}
              </p>
            )}
          </div>

          {/* Actions */}
          {actions && (
            <div className="flex items-center space-x-2">
              {actions}
            </div>
          )}
        </div>
      </header>

      {/* Mobile Sidebar */}
      <SimpleMobileSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
      />

      {/* Main Content */}
      <main className={cn(
        "flex-1 p-3 pb-20 min-h-0", // Reduced padding for mobile, min-h-0 for flex
        isTouch && "touch-manipulation", // Optimize touch interactions
        "overflow-x-hidden" // Prevent horizontal scroll
      )}>
        {children}
      </main>

      {/* Mobile Safe Area */}
      <div className="h-safe-area-inset-bottom" />
    </div>
  );
}