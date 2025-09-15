import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Clock, User, Calendar, AlertTriangle, CheckCircle, Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import { authService, authenticatedApiRequest } from "@/lib/auth";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";

interface Task {
  id: number;
  title: string;
  description?: string;
  projectId?: number;
  status: string;
  priority: string;
  dueDate?: string;
  assignedTo: number;
  assignedBy: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  assignedUser?: { id: number; name: string; username: string };
  assignedByUser?: { id: number; name: string; username: string };
  project?: { id: number; name: string; code: string; stage: string };
}

export default function TaskDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();
  const currentUser = authService.getUser();
  const isAdmin = authService.hasRole(['admin']);

  const { data: task, isLoading } = useQuery<Task>({
    queryKey: ["/api/tasks", id],
    queryFn: async () => {
      const response = await fetch(`/api/tasks/${id}`, {
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch task');
      return response.json();
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ status }: { status: string }) => {
      return authenticatedApiRequest('PATCH', `/api/tasks/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/notifications"] });
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Task Not Found</h1>
          <Button onClick={() => setLocation('/tasks')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tasks
          </Button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "done": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canUpdateStatus = isAdmin || (currentUser && task.assignedTo === currentUser.id);

  return (
    <ResponsiveLayout
      title="Task Details"
      subtitle="View and manage task information"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={() => setLocation('/tasks')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tasks
        </Button>
      </div>

      {/* Task Details Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{task.title}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(task.status)}>
                  {task.status === 'in_progress' ? 'In Progress' : task.status}
                </Badge>
                <Badge className={getPriorityColor(task.priority)}>
                  {task.priority} Priority
                </Badge>
              </div>
            </div>
            {canUpdateStatus && (
              <Select
                value={task.status}
                onValueChange={(value) => updateStatusMutation.mutate({ status: value })}
                disabled={updateStatusMutation.isPending}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Description */}
          {task.description && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-700 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          {/* Project Information */}
          {task.project && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Linked to Project
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-blue-800">{task.project.code} - {task.project.name}</p>
                  <p className="text-sm text-blue-600">Stage: {task.project.stage}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setLocation(`/projects/${task.project?.id}`)}
                  className="border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  View Project
                </Button>
              </div>
            </div>
          )}

          {!task.project && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-700 mb-1">General Task</h3>
              <p className="text-sm text-gray-500">This task is not linked to any specific project.</p>
            </div>
          )}

          {/* Task Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Assigned To</p>
                  <p className="font-medium">
                    {task.assignedUser?.name || 'Unknown User'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Assigned By</p>
                  <p className="font-medium">
                    {task.assignedByUser?.name || 'Unknown User'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {task.dueDate && (
                <div className="flex items-center gap-3">
                  <CalendarIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Due Date</p>
                    <p className="font-medium">
                      {new Date(task.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-medium">
                    {formatDate(task.createdAt)}
                  </p>
                </div>
              </div>

              {task.completedAt && (
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-500">Completed</p>
                    <p className="font-medium">
                      {formatDate(task.completedAt)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status Update Section */}
          {canUpdateStatus && task.status !== 'done' && (
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="flex gap-2">
                {task.status === 'pending' && (
                  <Button
                    onClick={() => updateStatusMutation.mutate({ status: 'in_progress' })}
                    disabled={updateStatusMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Start Working
                  </Button>
                )}
                {task.status === 'in_progress' && (
                  <Button
                    onClick={() => updateStatusMutation.mutate({ status: 'done' })}
                    disabled={updateStatusMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Mark Complete
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </ResponsiveLayout>
  );
}