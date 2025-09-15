import { useState, useEffect } from "react";
import { Bell, AlertCircle, Clock, CheckCircle, AlertTriangle, Package, TrendingUp, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { authenticatedApiRequest } from "@/lib/auth";

interface Task {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: "low" | "medium" | "high";
  dueDate?: string;
  assignedByUser?: {
    id: number;
    name: string;
    username: string;
  };
}

interface DashboardStats {
  lowStockProducts: any[];
  pendingRequests: number;
  todayAttendance: number;
  monthlyExpenses: number;
}

export function AnimatedNotificationBell() {
  const [, setLocation] = useLocation();
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasNewTasks, setHasNewTasks] = useState(false);
  const [previousTaskCount, setPreviousTaskCount] = useState(0);
  const [showGlow, setShowGlow] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const { data: tasks = [], error, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/dashboard/tasks"],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch dashboard stats for other notifications
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
    queryFn: async () => {
      return await authenticatedApiRequest('GET', '/api/dashboard/stats');
    },
    refetchInterval: 30000,
  });

  // Count pending and in-progress tasks (using lowercase status values)
  const taskCount = tasks.filter(task => 
    task.status === 'pending' || task.status === 'in_progress'
  ).length;

  // Count other notifications
  const lowStockCount = Array.isArray(stats?.lowStockProducts) ? stats.lowStockProducts.length : 0;
  const pendingRequestsCount = stats?.pendingRequests || 0;
  
  // Total notification count
  const totalNotifications = taskCount + lowStockCount + (pendingRequestsCount > 0 ? 1 : 0);
  
  // Check for high priority notifications
  const hasHighPriorityTasks = tasks.some(task => task.priority === 'high');
  const hasLowStock = lowStockCount > 0;
  const hasPendingRequests = pendingRequestsCount > 0;
  const hasUrgentNotifications = hasHighPriorityTasks || hasLowStock;

  // Trigger animation when new tasks are added
  useEffect(() => {
    if (taskCount > previousTaskCount) {
      setHasNewTasks(true);
      setIsAnimating(true);
      setShowGlow(true);
      
      // Stop intensive animation after 3 seconds
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setHasNewTasks(false);
        setShowGlow(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
    setPreviousTaskCount(taskCount);
  }, [taskCount, previousTaskCount]);

  // Removed continuous animation - only animate on new tasks
  // useEffect(() => {
  //   if (taskCount > 0 && !isAnimating) {
  //     const interval = setInterval(() => {
  //       setIsAnimating(true);
  //       setTimeout(() => setIsAnimating(false), 800);
  //     }, 4000);
  //     return () => clearInterval(interval);
  //   }
  // }, [taskCount, isAnimating]);

  // Removed duplicate variable declaration

  // Always show the bell for consistency

  return (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className={cn(
              "relative group transition-colors hover:bg-amber-100 dark:hover:bg-amber-900/20 rounded-full p-3 min-w-[48px] min-h-[48px] bg-amber-50/50 dark:bg-amber-900/10",
              hasNewTasks && "animate-bell-bounce"
            )}
          >
            <div className="relative">
              {/* Bell Icon with dynamic animations - Larger and more visible */}
              <Bell 
                className={cn(
                  "h-7 w-7 transition-all duration-300 drop-shadow-sm",
                  hasUrgentNotifications ? "text-red-600" : "text-amber-700 dark:text-amber-500"
                )} 
              />
              
              {/* Total notification count badge - More prominent */}
              {totalNotifications > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-6 w-6 p-0 text-xs flex items-center justify-center font-bold border-2 border-white dark:border-gray-900 bg-red-500 text-white shadow-lg"
                >
                  {totalNotifications > 9 ? '9+' : totalNotifications}
                </Badge>
              )}
            </div>
            

          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
          {/* Simple header */}
          <div className="px-4 py-3 border-b">
            <span className="font-semibold text-gray-900">Notifications</span>
          </div>
          
          {/* Low Stock Alerts */}
          {hasLowStock && (
            <>
              <DropdownMenuItem
                onClick={() => setLocation('/products')}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
              >
                <Package className="h-4 w-4 text-gray-600" />
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">
                    {lowStockCount} products need restocking
                  </div>
                  <div className="text-xs text-gray-500">Low stock alerts</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {/* Pending Requests */}
          {hasPendingRequests && (
            <>
              <DropdownMenuItem
                onClick={() => setLocation('/requests')}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
              >
                <FileText className="h-4 w-4 text-gray-600" />
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">
                    {pendingRequestsCount} material requests pending
                  </div>
                  <div className="text-xs text-gray-500">Material requests</div>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          {/* Tasks */}
          {taskCount > 0 && (
            <>
              {tasks.slice(0, 3).map((task) => (
                <DropdownMenuItem
                  key={task.id}
                  onClick={() => setLocation(`/tasks/${task.id}`)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex-shrink-0">
                    <Clock className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {task.title}
                    </div>
                    <div className="text-xs text-gray-500">
                      {task.priority} priority • {task.status}
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
              {taskCount > 3 && (
                <DropdownMenuItem
                  onClick={() => setLocation('/tasks')}
                  className="px-4 py-3 text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  View all {taskCount} tasks →
                </DropdownMenuItem>
              )}
            </>
          )}

          {/* Empty state */}
          {totalNotifications === 0 && (
            <DropdownMenuItem disabled className="text-center py-8">
              <div className="flex flex-col items-center gap-2">
                <CheckCircle className="h-8 w-8 text-green-400" />
                <span className="text-gray-500">All caught up!</span>
              </div>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
  );
}