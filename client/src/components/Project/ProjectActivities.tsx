import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Clock,
  User,
  FileText,
  Package,
  CheckCircle,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  MessageCircle,
  ArrowUpDown,
  ShoppingCart,
  Quote,
  CreditCard,
  Users,
  Tag,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { authenticatedApiRequest } from "@/lib/auth";
import { format } from "date-fns";

const activitySchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  type: z.enum(["milestone", "task", "meeting", "note", "system"]),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

interface ProjectActivitiesProps {
  projectId: string;
}

interface Activity {
  id: number;
  title: string;
  description: string | null;
  type: string;
  priority: string;
  createdAt: string;
  createdBy: number;
  projectId: number;
  createdByUser?: {
    name: string;
    username: string;
  };
}

export default function ProjectActivities({ projectId }: ProjectActivitiesProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch activities
  const activitiesQuery = useQuery({
    queryKey: ["/api/projects", projectId, "activities"],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/projects/${projectId}/activities`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch activities');
      return response.json();
    },
    enabled: !!projectId,
  });

  // Create/Update activity mutation
  const activityMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = localStorage.getItem('authToken');
      const url = editingActivity
        ? `/api/projects/${projectId}/activities/${editingActivity.id}`
        : `/api/projects/${projectId}/activities`;
      const method = editingActivity ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { 
          'Authorization': `Bearer ${token}`,
          "Content-Type": "application/json" 
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to save activity');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", projectId, "activities"],
      });
      setIsDialogOpen(false);
      setEditingActivity(null);
      form.reset();
      toast({
        title: "Success",
        description: editingActivity ? "Activity updated" : "Activity added",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save activity",
        variant: "destructive",
      });
    },
  });

  // Delete activity mutation
  const deleteActivityMutation = useMutation({
    mutationFn: async (activityId: number) => {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/projects/${projectId}/activities/${activityId}`, {
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to delete activity');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", projectId, "activities"],
      });
      toast({
        title: "Success",
        description: "Activity deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete activity",
        variant: "destructive",
      });
    },
  });

  const form = useForm<z.infer<typeof activitySchema>>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      title: "",
      description: "",
      type: "note",
      priority: "medium",
    },
  });

  const onSubmit = (data: z.infer<typeof activitySchema>) => {
    activityMutation.mutate(data);
  };

  const handleEdit = (activity: Activity) => {
    setEditingActivity(activity);
    form.reset({
      title: activity.title,
      description: activity.description || "",
      type: activity.type as any,
      priority: activity.priority as any,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (activityId: number) => {
    if (confirm("Are you sure you want to delete this activity?")) {
      deleteActivityMutation.mutate(activityId);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "milestone":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "task":
        return <Clock className="h-5 w-5 text-blue-600" />;
      case "meeting":
        return <Users className="h-5 w-5 text-purple-600" />;
      case "note":
        return <FileText className="h-5 w-5 text-gray-600" />;
      case "system":
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      default:
        return <MessageCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "milestone":
        return "bg-green-100 text-green-800";
      case "task":
        return "bg-blue-100 text-blue-800";
      case "meeting":
        return "bg-purple-100 text-purple-800";
      case "note":
        return "bg-gray-100 text-gray-800";
      case "system":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const activities = activitiesQuery.data || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Activities Timeline</h2>
          <p className="text-gray-500">Track project activities and milestones</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-amber-900 hover:bg-amber-800"
              style={{ backgroundColor: "hsl(28, 100%, 25%)" }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = "hsl(28, 100%, 20%)"}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = "hsl(28, 100%, 25%)"}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Activity
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingActivity ? "Edit Activity" : "Add New Activity"}
              </DialogTitle>
              <DialogDescription>
                {editingActivity
                  ? "Update activity details"
                  : "Create a new activity for this project"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Activity title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Activity description (optional)"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select activity type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="milestone">Milestone</SelectItem>
                          <SelectItem value="task">Task</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="note">Note</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingActivity(null);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={activityMutation.isPending}
                    className="bg-amber-900 hover:bg-amber-800"
                    style={{ backgroundColor: "hsl(28, 100%, 25%)" }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = "hsl(28, 100%, 20%)"}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = "hsl(28, 100%, 25%)"}
                  >
                    {activityMutation.isPending
                      ? (editingActivity ? "Updating..." : "Adding...")
                      : (editingActivity ? "Update" : "Add")}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {activitiesQuery.isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : activities.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Calendar className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Activities Yet
              </h3>
              <p className="text-gray-500">
                Start by adding your first project activity or milestone
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activities.map((activity: Activity, index: number) => (
            <Card key={activity.id} className="relative">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex-shrink-0 mt-1">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {activity.title}
                        </h3>
                        <Badge className={getTypeColor(activity.type)}>
                          {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                        </Badge>
                        <Badge className={getPriorityColor(activity.priority)}>
                          {activity.priority.charAt(0).toUpperCase() + activity.priority.slice(1)}
                        </Badge>
                      </div>
                      {activity.description && (
                        <p className="text-gray-600 mb-3">{activity.description}</p>
                      )}
                      <div className="flex items-center text-sm text-gray-500 space-x-4">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {activity.createdByUser?.name || "System"}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {format(new Date(activity.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(activity)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(activity.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {index < activities.length - 1 && (
                  <div className="absolute left-8 top-14 bottom-0 w-0.5 bg-gray-200"></div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}