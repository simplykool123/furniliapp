// Temporary file to rewrite FurniliLayout properly

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import Header from './Header';
import Sidebar from './Sidebar';

interface FurniliLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  showAddButton?: boolean;
  onAddClick?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export default function FurniliLayout({
  children,
  title,
  subtitle,
  showAddButton = false,
  onAddClick,
  actions,
  className 
}: FurniliLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  
  // Robust mobile detection with proper initial state
  const [isMobile, setIsMobile] = useState(() => {
    // Check on initial render
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });
  
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      console.log('Mobile detection:', mobile, 'Width:', window.innerWidth);
      setIsMobile(mobile);
    };
    
    checkMobile();
    const handleResize = () => checkMobile();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Debug sidebar state
  useEffect(() => {
    console.log('FurniliLayout state:', {
      isMobile,
      sidebarOpen,
      sidebarCollapsed,
      windowWidth: typeof window !== 'undefined' ? window.innerWidth : 'undefined'
    });
  }, [isMobile, sidebarOpen, sidebarCollapsed]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, sidebarOpen]);

  return (
    <div className="furnili-page">
      {/* Background Pattern */}
      <div className="fixed inset-0 -z-10 opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2366451c' fill-opacity='0.4'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="flex min-h-screen">
        {/* Desktop Sidebar - Only show on desktop */}
        {!isMobile && (
          <div className={cn(
            "fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out",
            sidebarCollapsed ? "w-16" : "w-64"
          )}>
            <div className="furnili-sidebar h-full shadow-xl border-r border-border/50">
              <Sidebar 
                onItemClick={() => {}} 
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
              />
            </div>
          </div>
        )}

        {/* Mobile Sidebar */}
        {isMobile && (
          <>
            {/* Mobile overlay - only show when sidebar is open */}
            {sidebarOpen && (
              <div 
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" 
                onClick={() => {
                  console.log('Mobile overlay clicked - closing sidebar');
                  setSidebarOpen(false);
                }}
              />
            )}
            
            {/* Mobile sidebar - left-anchored panel only */}
            <div 
              className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 max-w-[85vw] transform transition-transform duration-300 ease-in-out bg-white shadow-xl",
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
              )}
              data-testid="main-sidebar"
            >
              <Sidebar 
                onItemClick={() => {
                  console.log('Sidebar item clicked - closing mobile sidebar');
                  setSidebarOpen(false);
                }} 
                collapsed={false}
                onToggleCollapse={() => {
                  console.log('Mobile sidebar collapse button clicked - closing sidebar');
                  setSidebarOpen(false);
                }}
              />
            </div>
          </>
        )}

        {/* Desktop Expand Button */}
        {!isMobile && sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="fixed left-4 top-1/2 -translate-y-1/2 z-40 w-8 h-12 bg-[hsl(28,100%,25%)] hover:bg-[hsl(28,100%,20%)] text-white rounded-r-lg shadow-lg transition-all duration-200 flex items-center justify-center"
            title="Expand Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Main content */}
        <div className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out",
          !isMobile && sidebarCollapsed ? "ml-16" : "",
          !isMobile && !sidebarCollapsed ? "ml-64" : "",
          isMobile ? "ml-0" : ""
        )}>
          {/* Header */}
          <div className="furnili-header sticky top-0 z-30">
            <Header
              title={title}
              subtitle={subtitle}
              showAddButton={showAddButton}
              onMenuClick={isMobile ? () => {
                console.log('Header menu toggle clicked, current state:', sidebarOpen);
                setSidebarOpen(!sidebarOpen);
              } : undefined}
              onAddClick={onAddClick}
              actions={actions}
            />
          </div>

          {/* Page content */}
          <main className={cn(
            "flex-1 overflow-auto",
            "px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5",
            "w-full",
            className
          )}>
            <div className="space-y-3 sm:space-y-4 lg:space-y-5">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}