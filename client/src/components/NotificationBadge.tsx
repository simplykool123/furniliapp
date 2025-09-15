import { useState, useEffect, useRef } from "react";
import { Bell, Clock, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { authService } from "@/lib/auth";

interface Task {
  id: number;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  assignedTo: string;
}

export default function NotificationBadge() {
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentUser = authService.getUser();

  // Fetch pending/in-progress tasks for the current user
  const { data: pendingTasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks/notifications"],
    enabled: !!currentUser,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const pendingCount = Array.isArray(pendingTasks) ? pendingTasks.length : 0;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTaskClick = (taskId: number) => {
    setLocation(`/tasks/${taskId}`);
    setIsOpen(false);
  };

  const formatDueDate = (dueDate?: string) => {
    if (!dueDate) return "No due date";
    const date = new Date(dueDate);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "Overdue";
    if (diffDays === 0) return "Due today";
    if (diffDays === 1) return "Due tomorrow";
    return `Due in ${diffDays} days`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "text-yellow-600 bg-yellow-100";
      case "in_progress": return "text-blue-600 bg-blue-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high": return <AlertCircle className="h-3 w-3 text-red-500" />;
      case "medium": return <Clock className="h-3 w-3 text-yellow-500" />;
      default: return <Clock className="h-3 w-3 text-green-500" />;
    }
  };

  if (!currentUser || currentUser.role === 'admin') {
    return null; // Don't show notifications for admin users
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
        title={`${pendingCount} pending tasks`}
      >
        <Bell className="h-5 w-5 text-amber-800" />
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
            {pendingCount > 9 ? "9+" : pendingCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden">
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Bell className="h-4 w-4" />
              My Pending Tasks ({pendingCount})
            </h3>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {Array.isArray(pendingTasks) && pendingTasks.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {pendingTasks.map((task: Task) => (
                  <div
                    key={task.id}
                    onClick={() => handleTaskClick(task.id)}
                    className="p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getPriorityIcon(task.priority)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn(
                            "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                            getStatusColor(task.status)
                          )}>
                            {task.status === 'in_progress' ? 'In Progress' : 'Pending'}
                          </span>
                          {task.priority === 'high' && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              High Priority
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDueDate(task.dueDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No pending tasks</p>
                <p className="text-xs mt-1">You're all caught up!</p>
              </div>
            )}
          </div>
          
          {Array.isArray(pendingTasks) && pendingTasks.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setLocation('/tasks');
                  setIsOpen(false);
                }}
                className="w-full text-center text-sm text-amber-700 hover:text-amber-900 font-medium"
              >
                View All Tasks →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}