import { useEffect, useRef } from 'react';
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { authService } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, LogOut } from "lucide-react";
import { navigation } from "@/components/Layout/Sidebar";

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function MobileSidebar({ open, onClose }: MobileSidebarProps) {
  const [location] = useLocation();
  const user = authService.getUser();
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  // Focus management for accessibility
  useEffect(() => {
    if (open && sidebarRef.current) {
      sidebarRef.current.focus();
    }
  }, [open]);

  const handleLinkClick = () => {
    onClose();
  };

  const handleLogout = async () => {
    await authService.logout();
    onClose();
  };

  const filteredNavigation = navigation.filter(item => 
    !item.roles || item.roles.includes(user?.role || '')
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity cursor-pointer",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        onTouchEnd={onClose}
      />

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        tabIndex={-1}
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-background border-r shadow-2xl transform transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-furnili-brown rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <div>
                <h2 className="font-semibold text-furnili-brown">Furnili</h2>
                <p className="text-xs text-muted-foreground">Management System</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="hover:bg-red-100 hover:text-red-600"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* User Info */}
          {user && (
            <div className="p-4 border-b bg-muted/30">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-furnili-brown/10 rounded-full flex items-center justify-center">
                  <span className="text-furnili-brown font-semibold">
                    {user.name?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">
                    {user.name || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {user.role?.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <ScrollArea className="flex-1 p-2">
            <nav className="space-y-1">
              {filteredNavigation.map((item) => {
                const isActive = location === item.href;
                
                if (item.isCollapsible && item.subItems) {
                  return (
                    <div key={item.name} className="space-y-1">
                      <div className="px-3 py-2 text-sm font-medium text-muted-foreground">
                        {item.name}
                      </div>
                      {item.subItems
                        .filter(subItem => !subItem.roles || subItem.roles.includes(user?.role || ''))
                        .map((subItem) => {
                          const isSubActive = location === subItem.href;
                          return (
                            <Link
                              key={subItem.href}
                              href={subItem.href}
                              onClick={handleLinkClick}
                            >
                              <Button
                                variant={isSubActive ? "secondary" : "ghost"}
                                className={cn(
                                  "w-full justify-start pl-6 h-10 text-sm",
                                  isSubActive && "bg-furnili-brown/10 text-furnili-brown"
                                )}
                              >
                                <subItem.icon className="h-4 w-4 mr-3" />
                                {subItem.name}
                              </Button>
                            </Link>
                          );
                        })}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href || '#'}
                    onClick={handleLinkClick}
                  >
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start h-11 text-sm",
                        isActive && "bg-furnili-brown/10 text-furnili-brown"
                      )}
                    >
                      <item.icon className="h-4 w-4 mr-3" />
                      {item.name}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>

          {/* Logout */}
          <div className="p-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-3" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}