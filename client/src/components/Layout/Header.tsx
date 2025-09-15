import { Bell, Plus, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authService } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { authenticatedApiRequest } from "@/lib/auth";
import NotificationBadge from "@/components/NotificationBadge";
import { AnimatedNotificationBell } from "@/components/AnimatedNotificationBell";

interface HeaderProps {
  title: string;
  subtitle: string;
  showAddButton?: boolean;
  onAddClick?: () => void;
  actions?: React.ReactNode;
  onMenuClick?: () => void;
}

export default function Header({ title, subtitle, showAddButton = false, onAddClick, actions, onMenuClick }: HeaderProps) {
  const user = authService.getUser();
  
  // Stats query removed - now handled by unified AnimatedNotificationBell

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 sticky top-0 z-40">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
          {/* Mobile Menu Button */}
          {onMenuClick && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="lg:hidden hover:bg-primary/10 dark:hover:bg-primary/20 p-3 min-w-[44px] min-h-[44px] touch-manipulation"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Mobile menu clicked!');
                onMenuClick();
              }}
            >
              <Menu className="w-5 h-5 text-foreground" />
            </Button>
          )}
          
          <div className="min-w-0 flex-1">
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-amber-900 dark:text-amber-100 truncate leading-tight">{title}</h1>
            <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-200 truncate mt-0.5 sm:mt-1">{subtitle}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 sm:space-x-4 lg:space-x-5">
          {/* Custom Actions */}
          {actions && (
            <div className="flex items-center space-x-2">
              {actions}
            </div>
          )}
          
          {/* Task Notifications for Staff - More visible with better spacing */}
          <div className="flex items-center">
            <AnimatedNotificationBell />
          </div>
          
          {/* User Profile - Better separated from notification */}
          <div className="flex items-center space-x-3 border-l border-border/30 pl-3 sm:pl-4">
            <div className="text-right hidden sm:block">
              <p className="font-semibold text-foreground text-sm lg:text-base truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 furnili-gradient rounded-full flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-sm">
                {user?.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </span>
            </div>
          </div>


        </div>
      </div>
    </header>
  );
}
