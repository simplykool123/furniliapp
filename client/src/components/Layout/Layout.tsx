import { ReactNode, useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { authService } from "@/lib/auth";
import { useIsMobile } from "@/components/Mobile/MobileOptimizer";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showAddButton?: boolean;
  onAddClick?: () => void;
}

export default function Layout({ 
  children, 
  title = "", 
  subtitle = "", 
  showAddButton = false, 
  onAddClick 
}: LayoutProps) {
  const user = authService.getUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Load collapsed state from localStorage
    return localStorage.getItem('sidebarCollapsed') === 'true';
  });

  // Listen for mobile sidebar toggle events
  useEffect(() => {
    const handleToggleSidebar = () => {
      setSidebarOpen(prev => !prev);
    };

    window.addEventListener('toggleMobileSidebar', handleToggleSidebar);
    return () => {
      window.removeEventListener('toggleMobileSidebar', handleToggleSidebar);
    };
  }, []);
  
  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen flex" data-testid="main-layout" style={{backgroundColor: '#F5F0E8'}}>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onToggleCollapse={() => {
            const newCollapsed = !sidebarCollapsed;
            setSidebarCollapsed(newCollapsed);
            localStorage.setItem('sidebarCollapsed', newCollapsed.toString());
          }} 
        />
      </div>
        
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 animate-fade-in" 
              onClick={() => setSidebarOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 w-64 animate-slide-up">
              <Sidebar onItemClick={() => setSidebarOpen(false)} />
            </div>
          </div>
        )}
        
        <main className={cn("flex-1 flex flex-col overflow-hidden transition-all duration-300", 
          sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
        )}>
          {title && (
            <Header 
              title={title}
              subtitle={subtitle}
              showAddButton={showAddButton}
              onAddClick={onAddClick}
              onMenuClick={() => setSidebarOpen(!sidebarOpen)}
            />
          )}
          
          <div className="flex-1 overflow-auto mobile-scroll mobile-safe-area-bottom p-3 sm:p-4 lg:p-6" style={{backgroundColor: '#F5F0E8'}}>
            {children}
          </div>
      </main>
    </div>
  );
}
