import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { authenticatedApiRequest, authService } from "@/lib/auth";
import { Plus, CheckCircle2, Clock, AlertCircle, User, Calendar, Search, Filter, CalendarIcon, Trash2, Edit } from "lucide-react";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";
import TaskCalendar from "@/components/Calendar/TaskCalendar";

export default function TaskManagement() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const params = useParams();
  const taskId = params.taskId;
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assignedToFilter, setAssignedToFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTaskTab, setActiveTaskTab] = useState<string>("active");
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    assignedTo: "",
    priority: "medium",
    dueDate: "",
    projectId: "",
  });
  const [editTaskForm, setEditTaskForm] = useState({
    id: "",
    title: "",
    description: "",
    assignedTo: "",
    priority: "medium",
    dueDate: "",
    projectId: "",
    status: "pending",
  });

  const currentUser = authService.getUser();
  const isAdmin = currentUser?.role === 'admin';

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["/api/tasks"],
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: projects } = useQuery({
    queryKey: ["/api/projects"],
  });

  // Get specific task data if taskId is present
  const { data: currentTask } = useQuery({
    queryKey: ["/api/tasks", taskId],
    queryFn: async () => {
      if (!taskId) return null;
      return await authenticatedApiRequest('GET', `/api/tasks/${taskId}`);
    },
    enabled: !!taskId,
  });

  // Load task data into edit form when currentTask is loaded
  useEffect(() => {
    if (currentTask && taskId) {
      setEditTaskForm({
        id: currentTask.id.toString(),
        title: currentTask.title || "",
        description: currentTask.description || "",
        assignedTo: currentTask.assignedTo?.toString() || "",
        priority: currentTask.priority || "medium",
        dueDate: currentTask.dueDate ? currentTask.dueDate.split('T')[0] : "",
        // Normalize projectId: null/empty -> '0' for form, but keep actual values
        projectId: currentTask.projectId ? currentTask.projectId.toString() : "0",
        status: currentTask.status || "pending",
      });
      setIsEditingTask(true);
    }
  }, [currentTask, taskId]);

  // Filter staff users for assignment dropdown
  const staffUsers = Array.isArray(users) ? users.filter((user: any) => user.isActive) : [];

  // Filter and search tasks
  const filteredTasks = Array.isArray(tasks) ? tasks.filter((task: any) => {
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesAssignedTo = assignedToFilter === "all" || (task.assignedTo && task.assignedTo.toString() === assignedToFilter);
    const matchesSearch = searchQuery === "" || 
      task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.assignedUser?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter based on active tab
    const matchesTab = (activeTaskTab === "active" && task.status !== "done") || 
                      (activeTaskTab === "completed" && task.status === "done") ||
                      (activeTaskTab === "all");
    
    return matchesStatus && matchesAssignedTo && matchesSearch && matchesTab;
  }) : [];

  const addTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      return await authenticatedApiRequest('POST', '/api/tasks', taskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "Task created",
        description: "Task has been created successfully.",
      });
      setIsAddingTask(false);
      setTaskForm({
        title: "",
        description: "",
        assignedTo: "",
        priority: "medium",
        dueDate: "",
        projectId: "",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      const { id, ...updateData } = taskData;
      return await authenticatedApiRequest('PUT', `/api/tasks/${id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks', taskId] });
      toast({
        title: "Task updated",
        description: "Task has been updated successfully.",
      });
      setLocation('/tasks');
    },
    onError: (error) => {
      toast({
        title: "Failed to update task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: string }) => {
      return await authenticatedApiRequest('PATCH', `/api/tasks/${taskId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "Task updated",
        description: "Task status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return await authenticatedApiRequest('DELETE', `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      toast({
        title: "Task deleted",
        description: "Task has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title || !taskForm.assignedTo || !taskForm.priority) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    // Normalize projectId: convert '0' to empty string for "No Project"
    const normalizedTaskForm = {
      ...taskForm,
      projectId: taskForm.projectId === '0' ? '' : taskForm.projectId,
    };
    
    addTaskMutation.mutate(normalizedTaskForm);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTaskForm.title || !editTaskForm.assignedTo || !editTaskForm.priority) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    
    // Normalize projectId: convert '0' to empty string for "No Project"
    const normalizedEditForm = {
      ...editTaskForm,
      projectId: editTaskForm.projectId === '0' ? '' : editTaskForm.projectId,
    };
    
    updateTaskMutation.mutate(normalizedEditForm);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pending</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">In Progress</Badge>;
      case "done":
        return <Badge className="bg-green-100 text-green-800 border-green-300">Done</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge className="bg-red-500 text-white border-red-500 text-xs">High</Badge>;
      case "medium":
        return <Badge className="bg-orange-500 text-white border-orange-500 text-xs">Medium</Badge>;
      case "low":
        return <Badge className="bg-gray-500 text-white border-gray-500 text-xs">Low</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{priority}</Badge>;
    }
  };

  const handleStatusChange = (taskId: number, newStatus: string) => {
    updateTaskStatusMutation.mutate({ taskId, status: newStatus });
  };

  const handleDeleteTask = (taskId: number) => {
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "Only administrators can delete tasks.",
        variant: "destructive",
      });
      return;
    }
    
    if (confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  const handleTaskTitleClick = (task: any) => {
    setSelectedTask(task);
    setIsTaskDetailModalOpen(true);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "No due date";
    return new Date(dateString).toLocaleDateString();
  };

  const taskStats = {
    total: Array.isArray(tasks) ? tasks.length : 0,
    pending: Array.isArray(tasks) ? tasks.filter((t: any) => t.status === "pending").length : 0,
    inProgress: Array.isArray(tasks) ? tasks.filter((t: any) => t.status === "in_progress").length : 0,
    completed: Array.isArray(tasks) ? tasks.filter((t: any) => t.status === "done").length : 0,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  // If viewing/editing a specific task
  if (taskId && isEditingTask) {
    return (
      <ResponsiveLayout
        title={`Edit Task #${taskId}`}
        subtitle="Update task details"
      >
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Edit Task Details</CardTitle>
                <Button
                  variant="outline"
                  onClick={() => setLocation('/tasks')}
                  data-testid="button-back-to-tasks"
                >
                  Back to Tasks
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="edit-title">Task Title *</Label>
                  <Input
                    id="edit-title"
                    value={editTaskForm.title}
                    onChange={(e) => setEditTaskForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter task title"
                    required
                    data-testid="input-edit-task-title"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editTaskForm.description}
                    onChange={(e) => setEditTaskForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter task details..."
                    rows={4}
                    data-testid="input-edit-task-description"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-status">Status *</Label>
                  <Select 
                    value={editTaskForm.status}
                    onValueChange={(value) => setEditTaskForm(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger data-testid="select-edit-task-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isAdmin && (
                  <div>
                    <Label htmlFor="edit-assignedTo">Assign To *</Label>
                    <Select 
                      value={editTaskForm.assignedTo}
                      onValueChange={(value) => setEditTaskForm(prev => ({ ...prev, assignedTo: value }))}
                    >
                      <SelectTrigger data-testid="select-edit-task-assignee">
                        <SelectValue placeholder="Select staff..." />
                      </SelectTrigger>
                      <SelectContent>
                        {staffUsers.map((user: any) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.name} ({user.username})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-priority">Priority *</Label>
                    <Select 
                      value={editTaskForm.priority}
                      onValueChange={(value) => setEditTaskForm(prev => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger data-testid="select-edit-task-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="edit-dueDate">Due Date</Label>
                    <Input
                      id="edit-dueDate"
                      type="date"
                      value={editTaskForm.dueDate}
                      onChange={(e) => setEditTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                      data-testid="input-edit-task-due-date"
                    />
                  </div>
                </div>

                {isAdmin && (
                  <div>
                    <Label htmlFor="edit-projectId">Related Project (Optional)</Label>
                    <Select 
                      value={editTaskForm.projectId}
                      onValueChange={(value) => setEditTaskForm(prev => ({ ...prev, projectId: value }))}
                    >
                      <SelectTrigger data-testid="select-edit-task-project">
                        <SelectValue placeholder="Select project..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">No Project</SelectItem>
                        {Array.isArray(projects) && projects.map((project: any) => (
                          <SelectItem key={project.id} value={project.id.toString()}>
                            {project.code} - {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setLocation('/tasks')}
                    data-testid="button-cancel-edit-task"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-amber-600 hover:bg-amber-700"
                    disabled={updateTaskMutation.isPending}
                    data-testid="button-update-task"
                  >
                    {updateTaskMutation.isPending ? "Updating..." : "Update Task"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout
      title="Task Management"
      subtitle={isAdmin ? "Manage all tasks" : "Your assigned tasks"}
    >
      {/* Professional Task Layout */}
      <div className="space-y-6">
        {/* Integrated Header with Tabs, Search, and Add Button */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4">
          <Tabs value={activeTaskTab} onValueChange={setActiveTaskTab} className="flex-1">
            <TabsList className="bg-transparent h-auto p-0 space-x-8">
              <TabsTrigger 
                value="active" 
                className="bg-transparent border-b-2 border-transparent data-[state=active]:border-amber-600 data-[state=active]:bg-transparent rounded-none px-0 pb-3 text-sm font-medium"
              >
                Active Tasks ({Array.isArray(tasks) ? tasks.filter((t: any) => t.status !== "done").length : 0})
              </TabsTrigger>
              <TabsTrigger 
                value="completed"
                className="bg-transparent border-b-2 border-transparent data-[state=active]:border-amber-600 data-[state=active]:bg-transparent rounded-none px-0 pb-3 text-sm font-medium"
              >
                Completed ({taskStats.completed})
              </TabsTrigger>
              <TabsTrigger 
                value="all"
                className="bg-transparent border-b-2 border-transparent data-[state=active]:border-amber-600 data-[state=active]:bg-transparent rounded-none px-0 pb-3 text-sm font-medium"
              >
                All ({taskStats.total})
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Search and Add Task on Same Line */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
                data-testid="input-search-tasks"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32" data-testid="select-status-filter">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>

            {isAdmin && (
              <Select value={assignedToFilter} onValueChange={setAssignedToFilter}>
                <SelectTrigger className="w-32" data-testid="select-assigned-filter">
                  <SelectValue placeholder="All Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {staffUsers.map((user: any) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {isAdmin && (
              <Dialog open={isAddingTask} onOpenChange={setIsAddingTask}>
                <DialogTrigger asChild>
                  <Button className="bg-amber-600 hover:bg-amber-700" data-testid="button-create-task">
                    <Plus className="mr-2 h-4 w-4" />
                    New Task
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="title">Task Title *</Label>
                      <Input
                        id="title"
                        value={taskForm.title}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Enter task title"
                        required
                        data-testid="input-task-title"
                      />
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={taskForm.description}
                        onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Enter task details..."
                        rows={3}
                        data-testid="input-task-description"
                      />
                    </div>

                    <div>
                      <Label htmlFor="assignedTo">Assign To *</Label>
                      <Select 
                        value={taskForm.assignedTo}
                        onValueChange={(value) => setTaskForm(prev => ({ ...prev, assignedTo: value }))}
                      >
                        <SelectTrigger data-testid="select-task-assignee">
                          <SelectValue placeholder="Select staff..." />
                        </SelectTrigger>
                        <SelectContent>
                          {staffUsers.map((user: any) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.name} ({user.username})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="priority">Priority *</Label>
                        <Select 
                          value={taskForm.priority}
                          onValueChange={(value) => setTaskForm(prev => ({ ...prev, priority: value }))}
                        >
                          <SelectTrigger data-testid="select-task-priority">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="dueDate">Due Date</Label>
                        <Input
                          id="dueDate"
                          type="date"
                          value={taskForm.dueDate}
                          onChange={(e) => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                          data-testid="input-task-due-date"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="projectId">Related Project (Optional)</Label>
                      <Select 
                        value={taskForm.projectId}
                        onValueChange={(value) => setTaskForm(prev => ({ ...prev, projectId: value }))}
                      >
                        <SelectTrigger data-testid="select-task-project">
                          <SelectValue placeholder="Select project..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">No Project</SelectItem>
                          {Array.isArray(projects) && projects.map((project: any) => (
                            <SelectItem key={project.id} value={project.id.toString()}>
                              {project.code} - {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsAddingTask(false)}
                        data-testid="button-cancel-task"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        className="bg-amber-600 hover:bg-amber-700"
                        disabled={addTaskMutation.isPending}
                        data-testid="button-submit-task"
                      >
                        {addTaskMutation.isPending ? "Creating..." : "Create Task"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Professional Task Table */}
        <Tabs value={activeTaskTab} onValueChange={setActiveTaskTab}>
          <TabsContent value="active">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Tasks ({filteredTasks.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-200 dark:border-gray-700">
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Task Title</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-center">Project</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-center">Assigned To</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-center">Status</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-center">Priority</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-center">Due Date</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task: any) => (
                      <TableRow 
                        key={task.id} 
                        className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800"
                        data-testid={`row-task-${task.id}`}
                      >
                        <TableCell className="py-3">
                          <div className="max-w-xs">
                            <Button
                              variant="link"
                              className="p-0 h-auto font-semibold text-left justify-start text-amber-800 dark:text-amber-700 hover:text-amber-900 dark:hover:text-amber-600"
                              onClick={() => handleTaskTitleClick(task)}
                              data-testid={`text-task-title-${task.id}`}
                            >
                              {task.title}
                            </Button>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5" title={task.description}>
                              {task.description || "No description"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          {task.project ? (
                            <Badge variant="outline" className="text-xs">
                              {task.project.code}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">General Task</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          <span className="text-sm font-medium">
                            {task.assignedUser?.name || "Unknown"}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-center">{getStatusBadge(task.status)}</TableCell>
                        <TableCell className="py-3 text-center">
                          {getPriorityBadge(task.priority)}
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{formatDate(task.dueDate)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center justify-center gap-1">
                            {task.status !== "done" && (
                              <Select
                                value={task.status}
                                onValueChange={(value) => handleStatusChange(task.id, value)}
                              >
                                <SelectTrigger className="w-28 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="done">Done</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            {task.status === "done" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(task.id, "in_progress")}
                                data-testid={`button-reopen-task-${task.id}`}
                                className="h-8 text-xs"
                              >
                                Reopen
                              </Button>
                            )}
                            {isAdmin && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteTask(task.id)}
                                disabled={deleteTaskMutation.isPending}
                                data-testid={`button-delete-task-${task.id}`}
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {filteredTasks.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No tasks found matching your criteria.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Tasks ({filteredTasks.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-200 dark:border-gray-700">
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Task Title</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-center">Project</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-center">Assigned To</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-center">Status</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-center">Priority</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-center">Due Date</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task: any) => (
                      <TableRow 
                        key={task.id} 
                        className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800"
                        data-testid={`row-task-${task.id}`}
                      >
                        <TableCell className="py-3">
                          <div className="max-w-xs">
                            <Button
                              variant="link"
                              className="p-0 h-auto font-semibold text-left justify-start text-amber-800 dark:text-amber-700 hover:text-amber-900 dark:hover:text-amber-600"
                              onClick={() => handleTaskTitleClick(task)}
                              data-testid={`text-task-title-${task.id}`}
                            >
                              {task.title}
                            </Button>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5" title={task.description}>
                              {task.description || "No description"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          {task.project ? (
                            <Badge variant="outline" className="text-xs">
                              {task.project.code}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">General Task</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          <span className="text-sm font-medium">
                            {task.assignedUser?.name || "Unknown"}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-center">{getStatusBadge(task.status)}</TableCell>
                        <TableCell className="py-3 text-center">
                          {getPriorityBadge(task.priority)}
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{formatDate(task.dueDate)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center justify-center gap-1">
                            {task.status !== "done" && (
                              <Select
                                value={task.status}
                                onValueChange={(value) => handleStatusChange(task.id, value)}
                              >
                                <SelectTrigger className="w-28 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="done">Done</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            {task.status === "done" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(task.id, "in_progress")}
                                data-testid={`button-reopen-task-${task.id}`}
                                className="h-8 text-xs"
                              >
                                Reopen
                              </Button>
                            )}
                            {isAdmin && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteTask(task.id)}
                                disabled={deleteTaskMutation.isPending}
                                data-testid={`button-delete-task-${task.id}`}
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {filteredTasks.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No tasks found matching your criteria.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Tasks ({filteredTasks.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-200 dark:border-gray-700">
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300">Task Title</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-center">Project</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-center">Assigned To</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-center">Status</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-center">Priority</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-center">Due Date</TableHead>
                      <TableHead className="font-semibold text-gray-700 dark:text-gray-300 text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task: any) => (
                      <TableRow 
                        key={task.id} 
                        className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border-b border-gray-100 dark:border-gray-800"
                        data-testid={`row-task-${task.id}`}
                      >
                        <TableCell className="py-3">
                          <div className="max-w-xs">
                            <Button
                              variant="link"
                              className="p-0 h-auto font-semibold text-left justify-start text-amber-800 dark:text-amber-700 hover:text-amber-900 dark:hover:text-amber-600"
                              onClick={() => handleTaskTitleClick(task)}
                              data-testid={`text-task-title-${task.id}`}
                            >
                              {task.title}
                            </Button>
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5" title={task.description}>
                              {task.description || "No description"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          {task.project ? (
                            <Badge variant="outline" className="text-xs">
                              {task.project.code}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">General Task</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          <span className="text-sm font-medium">
                            {task.assignedUser?.name || "Unknown"}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-center">{getStatusBadge(task.status)}</TableCell>
                        <TableCell className="py-3 text-center">
                          {getPriorityBadge(task.priority)}
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{formatDate(task.dueDate)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center justify-center gap-1">
                            {task.status !== "done" && (
                              <Select
                                value={task.status}
                                onValueChange={(value) => handleStatusChange(task.id, value)}
                              >
                                <SelectTrigger className="w-28 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="in_progress">In Progress</SelectItem>
                                  <SelectItem value="done">Done</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            {task.status === "done" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(task.id, "in_progress")}
                                data-testid={`button-reopen-task-${task.id}`}
                                className="h-8 text-xs"
                              >
                                Reopen
                              </Button>
                            )}
                            {isAdmin && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteTask(task.id)}
                                disabled={deleteTaskMutation.isPending}
                                data-testid={`button-delete-task-${task.id}`}
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {filteredTasks.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No tasks found matching your criteria.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="calendar">
            <TaskCalendar tasks={filteredTasks} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Task Detail Modal */}
      <Dialog open={isTaskDetailModalOpen} onOpenChange={setIsTaskDetailModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Task Details</span>
              <div className="flex items-center gap-2">
                {selectedTask && getStatusBadge(selectedTask.status)}
                {selectedTask && getPriorityBadge(selectedTask.priority)}
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Title</Label>
                <p className="text-lg font-semibold">{selectedTask.title}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {selectedTask.description || "No description provided"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Assigned To</Label>
                  <p className="text-sm mt-1">{selectedTask.assignedUser?.name || "Unknown"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Due Date</Label>
                  <p className="text-sm mt-1">{formatDate(selectedTask.dueDate)}</p>
                </div>
              </div>

              {selectedTask.project && (
                <div>
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Project</Label>
                  <p className="text-sm mt-1">{selectedTask.project.code} - {selectedTask.project.name}</p>
                </div>
              )}

              {/* Status Change Section */}
              <div className="border-t pt-4">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Change Status</Label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={selectedTask.status === 'pending' ? 'default' : 'outline'}
                    onClick={() => handleStatusChange(selectedTask.id, 'pending')}
                    disabled={updateTaskStatusMutation.isPending}
                  >
                    Pending
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedTask.status === 'in_progress' ? 'default' : 'outline'}
                    onClick={() => handleStatusChange(selectedTask.id, 'in_progress')}
                    disabled={updateTaskStatusMutation.isPending}
                  >
                    In Progress
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedTask.status === 'done' ? 'default' : 'outline'}
                    onClick={() => handleStatusChange(selectedTask.id, 'done')}
                    disabled={updateTaskStatusMutation.isPending}
                  >
                    Done
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsTaskDetailModalOpen(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setIsTaskDetailModalOpen(false);
                    setLocation(`/tasks/${selectedTask.id}`);
                  }}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Edit Task
                </Button>
                {isAdmin && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setIsTaskDetailModalOpen(false);
                      handleDeleteTask(selectedTask.id);
                    }}
                    disabled={deleteTaskMutation.isPending}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ResponsiveLayout>
  );
}