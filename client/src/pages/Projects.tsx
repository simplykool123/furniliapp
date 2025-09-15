import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Filter, Building2, Calendar, User, MapPin, Eye, Edit, FolderOpen, Trash2, Upload, FileImage, FileText, Download, X } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Project, Client, ProjectFile } from "@shared/schema";
import { insertClientSchema } from "@shared/schema";
import { getCitiesByState } from "@/data/indianCities";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";
import FurniliCard from "@/components/UI/FurniliCard";
import FurniliButton from "@/components/UI/FurniliButton";
import { useIsMobile, MobileCard } from "@/components/Mobile/MobileOptimizer";
import MobileTable from "@/components/Mobile/MobileTable";
import { authService } from "@/lib/auth";

const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  clientId: z.number().min(1, "Client is required"),
  stage: z.enum(["prospect", "recce-done", "design-in-progress", "design-approved", "estimate-given", "client-approved", "production", "installation", "handover", "completed", "on-hold", "lost"]).default("prospect"),
  budget: z.number().min(0).default(0),
  differentSiteLocation: z.boolean().default(false),
  siteAddressLine1: z.string().optional(),
  siteAddressLine2: z.string().optional(),
  siteState: z.string().optional(),
  siteCity: z.string().optional(),
  siteLocation: z.string().optional(),
  sitePincode: z.string().optional(),
});

export default function Projects() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreateClientDialogOpen, setIsCreateClientDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("client");
  const [activeProjectTab, setActiveProjectTab] = useState("all");
  const [selectedState, setSelectedState] = useState("Maharashtra");
  const [availableCities, setAvailableCities] = useState<string[]>(getCitiesByState("Maharashtra"));

  // File management states
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
  const [selectedProjectForFiles, setSelectedProjectForFiles] = useState<Project | null>(null);
  const [fileTabActive, setFileTabActive] = useState("general");
  const [uploadingFiles, setUploadingFiles] = useState(false);
  
  // Authentication and role-based permissions
  const user = authService.getUser();
  const canManageProjects = user && ['admin', 'manager'].includes(user.role);

  // File upload mutations
  const manualQuoteUploadMutation = useMutation({
    mutationFn: async ({ projectId, files }: { projectId: number; files: File[] }) => {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      
      const response = await fetch(`/api/projects/${projectId}/files/manual-quotes/multiple`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', selectedProjectForFiles?.id, 'files'] });
      toast({ 
        title: "Manual quotes uploaded successfully",
        description: `${data.files?.length || 0} files uploaded`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error uploading manual quotes",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generalFileUploadMutation = useMutation({
    mutationFn: async ({ projectId, files }: { projectId: number; files: File[] }) => {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      
      const response = await fetch(`/api/projects/${projectId}/files/general/multiple`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', selectedProjectForFiles?.id, 'files'] });
      toast({ 
        title: "Files uploaded successfully",
        description: `${data.files?.length || 0} files uploaded`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error uploading files",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // File upload handlers
  const handleManualQuoteUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0 || !selectedProjectForFiles) return;

    // Validate file types for manual quotes
    const validTypes = ['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid file type",
        description: "Only PDF and Excel files are allowed for manual quotes",
        variant: "destructive",
      });
      return;
    }

    // Validate file sizes (50MB max)
    const oversizedFiles = files.filter(file => file.size > 50 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast({
        title: "Files too large",
        description: "Maximum file size is 50MB per file",
        variant: "destructive",
      });
      return;
    }

    setUploadingFiles(true);
    manualQuoteUploadMutation.mutate(
      { projectId: selectedProjectForFiles.id, files },
      {
        onSettled: () => setUploadingFiles(false)
      }
    );
  };

  const handleGeneralFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0 || !selectedProjectForFiles) return;

    // Validate file sizes (25MB max)
    const oversizedFiles = files.filter(file => file.size > 25 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast({
        title: "Files too large",
        description: "Maximum file size is 25MB per file",
        variant: "destructive",
      });
      return;
    }

    setUploadingFiles(true);
    generalFileUploadMutation.mutate(
      { projectId: selectedProjectForFiles.id, files },
      {
        onSettled: () => setUploadingFiles(false)
      }
    );
  };

  const handleDeleteFile = async (fileId: number) => {
    if (!selectedProjectForFiles) return;
    
    try {
      await apiRequest(`/api/projects/${selectedProjectForFiles.id}/files/${fileId}`, {
        method: 'DELETE',
      });
      
      queryClient.invalidateQueries({ 
        queryKey: ['/api/projects', selectedProjectForFiles.id, 'files'] 
      });
      
      toast({ title: "File deleted successfully" });
    } catch (error: any) {
      toast({
        title: "Error deleting file",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDownloadFile = async (fileId: number, fileName: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({ 
          title: "Authentication required", 
          description: "Please log in to download files",
          variant: "destructive" 
        });
        return;
      }
      
      const response = await fetch(`/api/files/${fileId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to download file');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      
      // Clean up the object URL
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Error downloading file",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const { data: projects = [], isLoading, error: projectsError } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const { data: clients = [], error: clientsError } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  // File management queries
  const { data: projectFiles = [] } = useQuery<ProjectFile[]>({
    queryKey: ['/api/projects', selectedProjectForFiles?.id, 'files'],
    queryFn: () => selectedProjectForFiles ? 
      apiRequest(`/api/projects/${selectedProjectForFiles.id}/files`) : Promise.resolve([]),
    enabled: !!selectedProjectForFiles,
  });

  // Filter files by category
  const generalFiles = projectFiles.filter(f => f.category === 'general' || !f.category);
  const deliveryChalans = projectFiles.filter(f => f.category === 'delivery_chalan');
  const manualQuotes = projectFiles.filter(f => f.category === 'manual_quote');

  const projectForm = useForm({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      clientId: "",
      stage: "prospect" as const,
      budget: 0,
      differentSiteLocation: false,
      siteAddressLine1: "",
      siteAddressLine2: "",
      siteState: "",
      siteCity: "",
      siteLocation: "",
      sitePincode: "",
    },
  });

  const clientForm = useForm({
    resolver: zodResolver(insertClientSchema),
    defaultValues: {
      name: "",
      email: "",
      mobile: "",
      city: "",
      contactPerson: "",
      phone: "",
      address1: "",
      address2: "",
      state: "Maharashtra",
      pinCode: "",
      gstNumber: "",
    },
  });

  // Handle state change and update available cities for client form
  const handleStateChange = (state: string) => {
    setSelectedState(state);
    const cities = getCitiesByState(state);
    setAvailableCities(cities);
    // Reset city selection when state changes
    clientForm.setValue("city", "");
  };

  const createProjectMutation = useMutation({
    mutationFn: (projectData: any) => 
      apiRequest('/api/projects', {
        method: 'POST',
        body: JSON.stringify(projectData),
      }),
    onSuccess: () => {
      toast({ title: "Project created successfully" });
      setIsCreateDialogOpen(false);
      projectForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create project",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createClientMutation = useMutation({
    mutationFn: (clientData: any) => 
      apiRequest('/api/clients', {
        method: 'POST',
        body: JSON.stringify(clientData),
      }),
    onSuccess: (newClient: Client) => {
      toast({ title: "Client created successfully" });
      setIsCreateClientDialogOpen(false);
      clientForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      
      // Auto-select the new client in the project form
      projectForm.setValue("clientId", newClient.id.toString());
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create client",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest(`/api/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast({ title: "Project updated successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setIsEditDialogOpen(false);
      setEditingProject(null);
      projectForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update project",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: number) => 
      apiRequest(`/api/projects/${projectId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      toast({ 
        title: activeProjectTab === "archive" 
          ? "Project deleted permanently" 
          : "Project archived successfully" 
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setProjectToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: activeProjectTab === "archive" 
          ? "Failed to delete project" 
          : "Failed to archive project",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmitProject = (data: any) => {
    if (editingProject) {
      updateProjectMutation.mutate({ id: editingProject.id, data });
    } else {
      createProjectMutation.mutate(data);
    }
  };

  const onSubmitClient = (data: any) => {
    createClientMutation.mutate(data);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    projectForm.reset({
      name: project.name,
      description: project.description || "",
      clientId: project.clientId.toString(),
      stage: project.stage as any,
      budget: project.budget || 0,
      differentSiteLocation: project.differentSiteLocation || false,
      siteAddressLine1: project.siteAddressLine1 || "",
      siteAddressLine2: project.siteAddressLine2 || "",
      siteState: project.siteState || "",
      siteCity: project.siteCity || "",
      siteLocation: project.siteLocation || "",
      sitePincode: project.sitePincode || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteProject = (project: Project) => {
    setProjectToDelete(project);
  };

  // Filter projects based on search, filters, and active tab
  const filteredProjects = projects.filter((project: Project) => {
    const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getClientName(project).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStage = stageFilter === "all" || project.stage === stageFilter;
    const matchesClient = clientFilter === "all" || project.clientId.toString() === clientFilter;
    
    // Filter based on active tab
    const matchesTab = (activeProjectTab === "all" && 
                       project.isActive !== false && 
                       !['completed', 'handover', 'lost'].includes(project.stage)) || 
                      (activeProjectTab === "completed" && 
                       project.isActive !== false &&
                       ['completed', 'handover', 'lost'].includes(project.stage)) ||
                      (activeProjectTab === "archive" && 
                       project.isActive === false);
    
    return matchesSearch && matchesStage && matchesClient && matchesTab;
  });

  const getStageColor = (stage: string) => {
    const stageColors = {
      prospect: "bg-blue-100 text-blue-800",
      "recce-done": "bg-indigo-100 text-indigo-800",
      "design-in-progress": "bg-purple-100 text-purple-800",
      "design-approved": "bg-violet-100 text-violet-800",
      "estimate-given": "bg-orange-100 text-orange-800",
      "client-approved": "bg-green-100 text-green-800",
      production: "bg-yellow-100 text-yellow-800",
      installation: "bg-amber-100 text-amber-800",
      handover: "bg-emerald-100 text-emerald-800",
      completed: "bg-gray-100 text-gray-800",
      "on-hold": "bg-slate-100 text-slate-800",
      lost: "bg-red-100 text-red-800",
    };
    return stageColors[stage as keyof typeof stageColors] || "bg-gray-100 text-gray-800";
  };

  const getClientName = (project: any) => {
    // Use client_name from the joined SQL query if available
    if (project && project.client_name) {
      return project.client_name;
    }
    // Fallback to client lookup if needed
    if (project && project.clientId) {
      const client = clients.find((c: Client) => c.id === project.clientId);
      return client?.name || "N/A";
    }
    return "N/A";
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (projectsError || clientsError) {
    const errorMessage = projectsError?.message || clientsError?.message || "Failed to load project data";
    const isAuthError = errorMessage.includes('401') || errorMessage.includes('Invalid token') || errorMessage.includes('Access token required');
    
    return (
      <div className="p-8">
        <div className="text-center py-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {isAuthError ? "Authentication Required" : "Error Loading Data"}
          </h3>
          <p className="text-gray-500 mb-4">
            {isAuthError 
              ? "Your session has expired. Please log in again to access project management features."
              : errorMessage
            }
          </p>
          {isAuthError ? (
            <Button onClick={() => {
              localStorage.removeItem('authToken');
              localStorage.removeItem('user');
              localStorage.removeItem('authUser');
              window.location.replace('/login');
            }}>
              Go to Login
            </Button>
          ) : (
            <Button onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
              queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
            }}>
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <ResponsiveLayout
      title="Project Studio"
      subtitle="Manage your projects, clients, and project details"
    >

      {/* Main Content */}
      <div className="p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Project Tabs */}
          <div className="border-b border-gray-200">
            <Tabs value={activeProjectTab} onValueChange={setActiveProjectTab}>
              <TabsList className="w-full justify-start rounded-none bg-transparent border-0 h-auto p-0">
                <TabsTrigger 
                  value="all" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-amber-900 rounded-none px-6 py-3"
                >
                  Ongoing Projects
                </TabsTrigger>
                <TabsTrigger 
                  value="completed" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-amber-900 rounded-none px-6 py-3"
                >
                  Completed
                </TabsTrigger>
                <TabsTrigger 
                  value="archive" 
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-amber-900 rounded-none px-6 py-3"
                >
                  Archive
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Filters Section */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search projects..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="recce-done">Recce Done</SelectItem>
                  <SelectItem value="design-in-progress">Design In Progress</SelectItem>
                  <SelectItem value="design-approved">Design Approved</SelectItem>
                  <SelectItem value="estimate-given">Estimate Given</SelectItem>
                  <SelectItem value="client-approved">Client Approved</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="installation">Installation</SelectItem>
                  <SelectItem value="handover">Handover</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>

              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="w-48">
                  <User className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients.map((client: Client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* New Project Button - Only for admin and manager */}
              {canManageProjects && (
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-[hsl(28,100%,25%)] hover:bg-[hsl(28,100%,20%)] text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Project</span>
                </Button>
              )}
            </div>
          </div>

          {/* Mobile Table */}
          <div className="block md:hidden">
            <MobileTable
              data={filteredProjects}
              columns={[
                {
                  key: 'project',
                  label: 'Project',
                  render: (value: any, project: Project) => (
                    <div>
                      <div className="font-medium text-sm">{project.name}</div>
                      <div className="text-xs text-furnili-brown font-medium">{project.code}</div>
                      <div className="text-xs text-gray-600 mt-1">{getClientName(project)}</div>
                      <div className="text-xs text-gray-500">
                        {(project as any).city || project.siteCity || (project as any).client_city || 'N/A'}
                      </div>
                    </div>
                  )
                },
                {
                  key: 'details',
                  label: 'Details',
                  render: (value: any, project: Project) => (
                    <div className="text-right">
                      <Badge variant="secondary" className={`text-xs mb-2 ${getStageColor(project.stage)}`}>
                        {project.stage.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                      <div className="text-xs text-gray-500">
                        {(project as any).formatted_created_at || (project.createdAt ? new Date(project.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: '2-digit', 
                          year: 'numeric'
                        }) : 'N/A')}
                      </div>
                    </div>
                  )
                }
              ]}
              onRowClick={(project) => setLocation(`/projects/${project.id}`)}
              actions={(project: Project) => (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocation(`/projects/${project.id}`);
                    }}
                    className="text-gray-500 p-1"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {canManageProjects && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditProject(project);
                        }}
                        className="text-blue-500 p-1"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project);
                        }}
                        className="text-red-500 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              )}
              emptyMessage="No projects found"
            />
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-gray-700 font-medium">Created On</TableHead>
                  <TableHead className="text-gray-700 font-medium">Project Code</TableHead>
                  <TableHead className="text-gray-700 font-medium">Project Name</TableHead>
                  <TableHead className="text-gray-700 font-medium">Client Name</TableHead>
                  <TableHead className="text-gray-700 font-medium">City</TableHead>
                  <TableHead className="text-gray-700 font-medium">Stage</TableHead>
                  <TableHead className="text-gray-700 font-medium text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project: Project) => (
                  <TableRow 
                    key={project.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setLocation(`/projects/${project.id}`)}
                  >
                    <TableCell className="text-gray-600">
                      {(project as any).formatted_created_at || (project.createdAt ? new Date(project.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit', 
                        year: 'numeric'
                      }) : 'N/A')}
                    </TableCell>
                    <TableCell className="font-medium text-amber-900">
                      {project.code}
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">
                      {project.name}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {getClientName(project)}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {(project as any).city || project.siteCity || (project as any).client_city || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getStageColor(project.stage)}>
                        {project.stage.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/projects/${project.id}`);
                          }}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4 text-gray-500" />
                        </Button>
                        {/* Edit and Delete buttons - Only for admin and manager */}
                        {canManageProjects && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditProject(project);
                              }}
                              title="Edit Project"
                            >
                              <Edit className="h-4 w-4 text-blue-500" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteProject(project);
                              }}
                              title="Delete Project"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Create Project Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-2xl lg:max-w-4xl max-h-[90vh] p-0">
          <div className="flex flex-col max-h-[90vh]">
          <DialogHeader className="p-4 border-b flex-shrink-0">
            <DialogTitle className="text-lg font-semibold">New Project</DialogTitle>
            <DialogDescription>Create a new project with client details and specifications</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4">
            <Form {...projectForm}>
              <form onSubmit={projectForm.handleSubmit(onSubmitProject)} className="space-y-4">
              {/* Client Details Section */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 rounded-full bg-amber-900 flex items-center justify-center text-white text-xs font-medium">
                    1
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">Client Details</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-end space-x-3">
                    <div className="flex-1">
                      <FormField
                        control={projectForm.control}
                        name="clientId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium text-gray-700 mb-1 block">
                              Client <span className="text-red-500">*</span>
                            </FormLabel>
                            <Select value={field.value?.toString() || ""} onValueChange={(value) => field.onChange(parseInt(value))}>
                              <FormControl>
                                <SelectTrigger className="h-8 bg-gray-100 border-gray-200">
                                  <SelectValue placeholder="Select a client" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {clients.map((client: Client) => (
                                  <SelectItem key={client.id} value={client.id.toString()}>
                                    {client.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Dialog open={isCreateClientDialogOpen} onOpenChange={setIsCreateClientDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          type="button"
                          size="sm"
                          className="bg-blue-500 hover:bg-blue-600 text-white h-8 px-3 text-xs"
                        >
                          <User className="h-3 w-3 mr-1" />
                          New Client
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-[90vw] max-h-[90vh] p-0">
                        <div className="flex flex-col max-h-[90vh]">
                          <DialogHeader className="p-3 border-b flex-shrink-0">
                            <DialogTitle className="text-base">Add New Client</DialogTitle>
                            <DialogDescription className="text-xs text-gray-600">
                              Create a new client with complete address information.
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="flex-1 overflow-y-auto p-3">
                            <Form {...clientForm}>
                              <form onSubmit={clientForm.handleSubmit(onSubmitClient)} className="space-y-2">
                                
                                {/* Basic Information */}
                                <div className="space-y-2">
                                  <h3 className="text-xs font-semibold text-gray-900 border-b pb-1">Basic Information</h3>
                                  
                                  {/* Client Name, Contact Person, GST Number in one line */}
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <FormField
                                      control={clientForm.control}
                                      name="name"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-xs font-medium text-gray-700">Client Name <span className="text-red-500">*</span></FormLabel>
                                          <FormControl>
                                            <Input className="h-8" placeholder="Enter client name" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    
                                    <FormField
                                      control={clientForm.control}
                                      name="contactPerson"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-xs font-medium text-gray-700">Contact Person</FormLabel>
                                          <FormControl>
                                            <Input className="h-8" placeholder="Enter contact person" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    <FormField
                                      control={clientForm.control}
                                      name="gstNumber"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-xs font-medium text-gray-700">GST Number</FormLabel>
                                          <FormControl>
                                            <Input className="h-8" placeholder="Enter GST number" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>

                                  {/* Mobile, Phone, Email in one line */}
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <FormField
                                      control={clientForm.control}
                                      name="mobile"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-xs font-medium text-gray-700">Mobile <span className="text-red-500">*</span></FormLabel>
                                          <FormControl>
                                            <Input className="h-8" placeholder="Enter mobile number" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    
                                    <FormField
                                      control={clientForm.control}
                                      name="phone"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-xs font-medium text-gray-700">Phone</FormLabel>
                                          <FormControl>
                                            <Input className="h-8" placeholder="Enter phone number" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    <FormField
                                      control={clientForm.control}
                                      name="email"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-xs font-medium text-gray-700">Email</FormLabel>
                                          <FormControl>
                                            <Input className="h-8" type="email" placeholder="Enter email address" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                </div>

                                {/* Address Information */}
                                <div className="space-y-2">
                                  <h3 className="text-xs font-semibold text-gray-900 border-b pb-1">Address Information</h3>
                                  
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <FormField
                                      control={clientForm.control}
                                      name="address1"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-xs font-medium text-gray-700">Address Line 1</FormLabel>
                                          <FormControl>
                                            <Input className="h-8" placeholder="Enter address line 1" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    
                                    <FormField
                                      control={clientForm.control}
                                      name="address2"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-xs font-medium text-gray-700">Address Line 2</FormLabel>
                                          <FormControl>
                                            <Input className="h-8" placeholder="Enter address line 2" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>

                                  {/* State, City, Pin Code in one line */}
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    <FormField
                                      control={clientForm.control}
                                      name="state"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-xs font-medium text-gray-700">State <span className="text-red-500">*</span></FormLabel>
                                          <Select 
                                            value={field.value} 
                                            onValueChange={(value) => {
                                              field.onChange(value);
                                              handleStateChange(value);
                                            }}
                                          >
                                            <FormControl>
                                              <SelectTrigger className="h-8">
                                                <SelectValue placeholder="Select state" />
                                              </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                              <SelectItem value="Maharashtra">Maharashtra</SelectItem>
                                              <SelectItem value="Gujarat">Gujarat</SelectItem>
                                              <SelectItem value="Karnataka">Karnataka</SelectItem>
                                              <SelectItem value="Tamil Nadu">Tamil Nadu</SelectItem>
                                              <SelectItem value="Telangana">Telangana</SelectItem>
                                              <SelectItem value="West Bengal">West Bengal</SelectItem>
                                              <SelectItem value="Rajasthan">Rajasthan</SelectItem>
                                              <SelectItem value="Uttar Pradesh">Uttar Pradesh</SelectItem>
                                              <SelectItem value="Madhya Pradesh">Madhya Pradesh</SelectItem>
                                              <SelectItem value="Bihar">Bihar</SelectItem>
                                              <SelectItem value="Andhra Pradesh">Andhra Pradesh</SelectItem>
                                              <SelectItem value="Odisha">Odisha</SelectItem>
                                              <SelectItem value="Punjab">Punjab</SelectItem>
                                              <SelectItem value="Haryana">Haryana</SelectItem>
                                              <SelectItem value="Kerala">Kerala</SelectItem>
                                              <SelectItem value="Assam">Assam</SelectItem>
                                              <SelectItem value="Jharkhand">Jharkhand</SelectItem>
                                              <SelectItem value="Chhattisgarh">Chhattisgarh</SelectItem>
                                              <SelectItem value="Himachal Pradesh">Himachal Pradesh</SelectItem>
                                              <SelectItem value="Uttarakhand">Uttarakhand</SelectItem>
                                              <SelectItem value="Goa">Goa</SelectItem>
                                              <SelectItem value="Tripura">Tripura</SelectItem>
                                              <SelectItem value="Manipur">Manipur</SelectItem>
                                              <SelectItem value="Meghalaya">Meghalaya</SelectItem>
                                              <SelectItem value="Nagaland">Nagaland</SelectItem>
                                              <SelectItem value="Mizoram">Mizoram</SelectItem>
                                              <SelectItem value="Arunachal Pradesh">Arunachal Pradesh</SelectItem>
                                              <SelectItem value="Sikkim">Sikkim</SelectItem>
                                              <SelectItem value="Delhi">Delhi</SelectItem>
                                              <SelectItem value="Puducherry">Puducherry</SelectItem>
                                              <SelectItem value="Chandigarh">Chandigarh</SelectItem>
                                              <SelectItem value="Andaman and Nicobar Islands">Andaman and Nicobar Islands</SelectItem>
                                              <SelectItem value="Dadra and Nagar Haveli and Daman and Diu">Dadra and Nagar Haveli and Daman and Diu</SelectItem>
                                              <SelectItem value="Lakshadweep">Lakshadweep</SelectItem>
                                              <SelectItem value="Ladakh">Ladakh</SelectItem>
                                              <SelectItem value="Jammu and Kashmir">Jammu and Kashmir</SelectItem>
                                            </SelectContent>
                                          </Select>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    
                                    <FormField
                                      control={clientForm.control}
                                      name="city"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-xs font-medium text-gray-700">City <span className="text-red-500">*</span></FormLabel>
                                          <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl>
                                              <SelectTrigger className="h-8">
                                                <SelectValue placeholder="Select city" />
                                              </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                              {availableCities.map((city) => (
                                                <SelectItem key={city} value={city}>
                                                  {city}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    <FormField
                                      control={clientForm.control}
                                      name="pinCode"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-xs font-medium text-gray-700">Pin Code</FormLabel>
                                          <FormControl>
                                            <Input className="h-8" placeholder="Enter pin code" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                </div>



                                <div className="flex justify-end space-x-2 pt-2 border-t">
                                  <Button type="button" variant="outline" onClick={() => setIsCreateClientDialogOpen(false)}>
                                    Cancel
                                  </Button>
                                  <Button type="submit" disabled={createClientMutation.isPending}>
                                    {createClientMutation.isPending ? "Creating..." : "Create Client"}
                                  </Button>
                                </div>
                              </form>
                            </Form>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </div>

              {/* Project Details Section */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 rounded-full bg-amber-900 flex items-center justify-center text-white text-xs font-medium">
                    2
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">Project Details</h3>
                </div>

                <div className="space-y-3">
                  <FormField
                    control={projectForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-gray-700 mb-1 block">
                          Project Name <span className="text-red-500">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input 
                            className="h-8 bg-gray-100 border-gray-200 text-sm" 
                            placeholder="Enter project name" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <FormField
                        control={projectForm.control}
                        name="stage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium text-gray-700 mb-1 block">
                              Project Stage <span className="text-red-500">*</span>
                            </FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger className="h-8 bg-gray-100 border-gray-200 text-sm">
                                    <SelectValue placeholder="Select stage" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="prospect">Prospect</SelectItem>
                                  <SelectItem value="recce-done">Recce Done</SelectItem>
                                  <SelectItem value="design-in-progress">Design In Progress</SelectItem>
                                  <SelectItem value="design-approved">Design Approved</SelectItem>
                                  <SelectItem value="estimate-given">Estimate Given</SelectItem>
                                  <SelectItem value="client-approved">Client Approved</SelectItem>
                                  <SelectItem value="production">Production</SelectItem>
                                  <SelectItem value="installation">Installation</SelectItem>
                                  <SelectItem value="handover">Handover</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="on-hold">On Hold</SelectItem>
                                  <SelectItem value="lost">Lost</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                    </div>

                    <FormField
                      control={projectForm.control}
                      name="budget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-gray-700 mb-1 block">
                            Budget <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              className="h-8 bg-gray-100 border-gray-200 text-sm" 
                              placeholder="Enter budget" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={projectForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-gray-700 mb-1 block">Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            className="min-h-16 bg-gray-100 border-gray-200 text-sm resize-none" 
                            placeholder="Enter project description" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Site Location Section */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                    3
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">Site Location</h3>
                </div>

                <div className="space-y-3">
                  <div className="text-xs text-gray-600 bg-blue-50 p-2 rounded border">
                    <strong>Note:</strong> Site address will use client address details unless you specify a different site location below.
                  </div>

                  <FormField
                    control={projectForm.control}
                    name="differentSiteLocation"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        </FormControl>
                        <div className="space-y-0">
                          <FormLabel className="text-sm font-medium text-gray-700">
                            Different Site Location
                          </FormLabel>
                          <FormDescription className="text-xs text-gray-500">
                            Check this if the project site address is different from client address
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  {projectForm.watch("differentSiteLocation") && (
                    <div className="space-y-3 border-l-2 border-blue-200 pl-4">
                      <h4 className="text-sm font-medium text-gray-700">Site Address Details</h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField
                          control={projectForm.control}
                          name="siteAddressLine1"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-gray-700 mb-1 block">Site Address Line 1</FormLabel>
                              <FormControl>
                                <Input 
                                  className="h-8 bg-gray-100 border-gray-200 text-sm" 
                                  placeholder="Enter site address line 1" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={projectForm.control}
                          name="siteAddressLine2"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-gray-700 mb-1 block">Site Address Line 2</FormLabel>
                              <FormControl>
                                <Input 
                                  className="h-8 bg-gray-100 border-gray-200 text-sm" 
                                  placeholder="Enter site address line 2" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <FormField
                          control={projectForm.control}
                          name="siteState"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-gray-700 mb-1 block">Site State</FormLabel>
                              <FormControl>
                                <Input 
                                  className="h-8 bg-gray-100 border-gray-200 text-sm" 
                                  placeholder="Enter site state" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={projectForm.control}
                          name="siteCity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-gray-700 mb-1 block">Site City</FormLabel>
                              <FormControl>
                                <Input 
                                  className="h-8 bg-gray-100 border-gray-200 text-sm" 
                                  placeholder="Enter site city" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={projectForm.control}
                          name="siteLocation"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-gray-700 mb-1 block">Site Location</FormLabel>
                              <FormControl>
                                <Input 
                                  className="h-8 bg-gray-100 border-gray-200 text-sm" 
                                  placeholder="Enter site location" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={projectForm.control}
                          name="sitePincode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-gray-700 mb-1 block">Site Pincode</FormLabel>
                              <FormControl>
                                <Input 
                                  className="h-8 bg-gray-100 border-gray-200 text-sm" 
                                  placeholder="Enter site pincode" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              </form>
            </Form>
          </div>
          
          <div className="p-4 border-t bg-white flex-shrink-0">
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="flex-1 h-9 text-sm">
                Cancel
              </Button>
              <Button type="submit" disabled={createProjectMutation.isPending} onClick={projectForm.handleSubmit(onSubmitProject)} className="furnili-gradient hover:opacity-90 text-white flex-1 h-9 text-sm">
                {createProjectMutation.isPending ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-2xl lg:max-w-4xl max-h-[90vh] p-0">
          <div className="flex flex-col max-h-[90vh]">
            <DialogHeader className="p-4 border-b flex-shrink-0">
              <DialogTitle className="text-lg font-semibold">Edit Project</DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                Update project details and information.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-4">
              <Form {...projectForm}>
                <form onSubmit={projectForm.handleSubmit(onSubmitProject)} className="space-y-4">
                  {/* Client Details Section */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 rounded-full bg-amber-900 flex items-center justify-center text-white text-xs font-medium">
                        1
                      </div>
                      <h3 className="text-base font-semibold text-gray-900">Client Details</h3>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-end space-x-3">
                        <div className="flex-1">
                          <FormField
                            control={projectForm.control}
                            name="clientId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium text-gray-700 mb-1 block">
                                  Client <span className="text-red-500">*</span>
                                </FormLabel>
                                <Select value={field.value?.toString() || ""} onValueChange={(value) => field.onChange(parseInt(value))}>
                                  <FormControl>
                                    <SelectTrigger className="h-8 bg-gray-100 border-gray-200">
                                      <SelectValue placeholder="Select a client" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {clients.map((client: Client) => (
                                      <SelectItem key={client.id} value={client.id.toString()}>
                                        {client.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <Dialog open={isCreateClientDialogOpen} onOpenChange={setIsCreateClientDialogOpen}>
                          <DialogTrigger asChild>
                            <Button 
                              type="button"
                              size="sm"
                              className="bg-blue-500 hover:bg-blue-600 text-white h-8 px-3 text-xs"
                            >
                              <User className="h-3 w-3 mr-1" />
                              New Client
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-[90vw] max-h-[90vh] p-0">
                            <div className="flex flex-col max-h-[90vh]">
                              <DialogHeader className="p-4 border-b">
                                <DialogTitle className="text-lg font-semibold">Add New Client</DialogTitle>
                              </DialogHeader>
                              <div className="flex-1 overflow-y-auto p-4">
                                <div className="space-y-4">
                                  <div className="text-sm text-gray-600 mb-4">
                                    Add a new client to the system. All fields marked with * are required.
                                  </div>
                                  {/* Client form fields would go here - simplified for now */}
                                  <div className="text-center py-8 text-gray-500">
                                    Client creation form will be implemented here
                                  </div>
                                </div>
                              </div>
                              <div className="p-4 border-t bg-white">
                                <div className="flex gap-3">
                                  <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => setIsCreateClientDialogOpen(false)}
                                    className="flex-1 h-9 text-sm"
                                  >
                                    Cancel
                                  </Button>
                                  <Button 
                                    type="submit" 
                                    disabled={createClientMutation.isPending}
                                    onClick={clientForm.handleSubmit(onSubmitClient)}
                                    className="bg-blue-500 hover:bg-blue-600 text-white flex-1 h-9 text-sm"
                                  >
                                    {createClientMutation.isPending ? "Creating..." : "Create Client"}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>

                  {/* Project Information Section */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 rounded-full bg-amber-900 flex items-center justify-center text-white text-xs font-medium">
                        2
                      </div>
                      <h3 className="text-base font-semibold text-gray-900">Project Information</h3>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField
                          control={projectForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-gray-700 mb-1 block">
                                Project Name <span className="text-red-500">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  className="h-8 bg-gray-100 border-gray-200 text-sm" 
                                  placeholder="Enter project name" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={projectForm.control}
                          name="stage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-medium text-gray-700 mb-1 block">Stage</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-8 bg-gray-100 border-gray-200">
                                    <SelectValue placeholder="Select project stage" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="prospect">Prospect</SelectItem>
                                  <SelectItem value="recce-done">Recce Done</SelectItem>
                                  <SelectItem value="design-in-progress">Design In Progress</SelectItem>
                                  <SelectItem value="design-approved">Design Approved</SelectItem>
                                  <SelectItem value="estimate-given">Estimate Given</SelectItem>
                                  <SelectItem value="client-approved">Client Approved</SelectItem>
                                  <SelectItem value="production">Production</SelectItem>
                                  <SelectItem value="installation">Installation</SelectItem>
                                  <SelectItem value="handover">Handover</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="on-hold">On Hold</SelectItem>
                                  <SelectItem value="lost">Lost</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={projectForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium text-gray-700 mb-1 block">Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                className="min-h-[60px] bg-gray-100 border-gray-200 text-sm resize-none" 
                                placeholder="Enter project description" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={projectForm.control}
                        name="budget"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium text-gray-700 mb-1 block">Budget (₹)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                className="h-8 bg-gray-100 border-gray-200 text-sm" 
                                placeholder="Enter project budget" 
                                {...field} 
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Site Location Section */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 rounded-full bg-amber-900 flex items-center justify-center text-white text-xs font-medium">
                        3
                      </div>
                      <h3 className="text-base font-semibold text-gray-900">Site Location</h3>
                    </div>

                    <FormField
                      control={projectForm.control}
                      name="differentSiteLocation"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-xs font-medium text-gray-700">
                            Different site location than client address
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    {projectForm.watch("differentSiteLocation") && (
                      <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <FormField
                            control={projectForm.control}
                            name="siteAddressLine1"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium text-gray-700 mb-1 block">Site Address Line 1</FormLabel>
                                <FormControl>
                                  <Input 
                                    className="h-8 bg-gray-100 border-gray-200 text-sm" 
                                    placeholder="Enter site address line 1" 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={projectForm.control}
                            name="siteAddressLine2"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium text-gray-700 mb-1 block">Site Address Line 2</FormLabel>
                                <FormControl>
                                  <Input 
                                    className="h-8 bg-gray-100 border-gray-200 text-sm" 
                                    placeholder="Enter site address line 2" 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <FormField
                            control={projectForm.control}
                            name="siteState"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium text-gray-700 mb-1 block">Site State</FormLabel>
                                <FormControl>
                                  <Input 
                                    className="h-8 bg-gray-100 border-gray-200 text-sm" 
                                    placeholder="Enter site state" 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={projectForm.control}
                            name="siteCity"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium text-gray-700 mb-1 block">Site City</FormLabel>
                                <FormControl>
                                  <Input 
                                    className="h-8 bg-gray-100 border-gray-200 text-sm" 
                                    placeholder="Enter site city" 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={projectForm.control}
                            name="siteLocation"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium text-gray-700 mb-1 block">Site Location</FormLabel>
                                <FormControl>
                                  <Input 
                                    className="h-8 bg-gray-100 border-gray-200 text-sm" 
                                    placeholder="Enter site location" 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={projectForm.control}
                            name="sitePincode"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs font-medium text-gray-700 mb-1 block">Site Pincode</FormLabel>
                                <FormControl>
                                  <Input 
                                    className="h-8 bg-gray-100 border-gray-200 text-sm" 
                                    placeholder="Enter site pincode" 
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                </form>
              </Form>
            </div>
            
            <div className="p-4 border-t bg-white flex-shrink-0">
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1 h-9 text-sm">
                  Cancel
                </Button>
                <Button type="submit" disabled={updateProjectMutation.isPending} onClick={projectForm.handleSubmit(onSubmitProject)} className="furnili-gradient hover:opacity-90 text-white flex-1 h-9 text-sm">
                  {updateProjectMutation.isPending ? "Updating..." : "Update Project"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!projectToDelete} onOpenChange={() => setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {activeProjectTab === "archive" ? "Delete Project Permanently?" : "Archive Project?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {activeProjectTab === "archive" 
                ? `This will permanently delete the project "${projectToDelete?.name}" and all associated data. This action cannot be undone.`
                : `This will archive the project "${projectToDelete?.name}" and move it to the Archive tab. You can restore it later if needed. This preserves all project data including tasks, quotes, and files.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProjectToDelete(null)}>
              No, Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => projectToDelete && deleteProjectMutation.mutate(projectToDelete.id)}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteProjectMutation.isPending}
            >
              {deleteProjectMutation.isPending 
                ? (activeProjectTab === "archive" ? "Deleting..." : "Archiving...") 
                : (activeProjectTab === "archive" ? "Yes, Delete" : "Yes, Archive")
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* File Management Dialog */}
      <Dialog open={isFileDialogOpen} onOpenChange={setIsFileDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Project Files - {selectedProjectForFiles?.name}</DialogTitle>
            <DialogDescription>
              Manage files for this project with organized categories
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={fileTabActive} onValueChange={setFileTabActive} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general" data-testid="tab-general-files">
                General Files
                {generalFiles.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{generalFiles.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="delivery_chalans" data-testid="tab-delivery-chalans">
                Delivery Chalans
                {deliveryChalans.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{deliveryChalans.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="manual_quotes" data-testid="tab-manual-quotes">
                Manual Quotes
                {manualQuotes.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{manualQuotes.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* General Files Tab */}
            <TabsContent value="general" className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="general-file-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Drop general files here, or click to browse
                      </span>
                      <span className="mt-1 block text-xs text-gray-500">
                        Any file type up to 25MB each
                      </span>
                    </label>
                    <input
                      id="general-file-upload"
                      type="file"
                      multiple
                      onChange={handleGeneralFileUpload}
                      className="hidden"
                      data-testid="input-general-files"
                    />
                  </div>
                  {uploadingFiles && fileTabActive === 'general' && (
                    <div className="mt-4">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-sm text-gray-600">Uploading files...</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {generalFiles.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {generalFiles.map((file) => (
                    <FileCard key={file.id} file={file} onDelete={handleDeleteFile} onDownload={handleDownloadFile} />
                  ))}
                </div>
              )}
              
              {generalFiles.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No general files uploaded yet.
                </div>
              )}
            </TabsContent>

            {/* Manual Quotes Tab */}
            <TabsContent value="manual_quotes" className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="manual-quote-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Drop manual quote files here, or click to browse
                      </span>
                      <span className="mt-1 block text-xs text-gray-500">
                        PDF and Excel files up to 50MB each
                      </span>
                    </label>
                    <input
                      id="manual-quote-upload"
                      type="file"
                      multiple
                      accept=".pdf,.xlsx,.xls"
                      onChange={handleManualQuoteUpload}
                      className="hidden"
                      data-testid="input-manual-quote-files"
                    />
                  </div>
                  {uploadingFiles && fileTabActive === 'manual_quotes' && (
                    <div className="mt-4">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-sm text-gray-600">Uploading files...</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {manualQuotes.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {manualQuotes.map((file) => (
                    <FileCard key={file.id} file={file} onDelete={handleDeleteFile} onDownload={handleDownloadFile} />
                  ))}
                </div>
              )}
              
              {manualQuotes.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No manual quotes uploaded yet.
                </div>
              )}
            </TabsContent>

            {/* Delivery Chalans Tab */}
            <TabsContent value="delivery_chalans" className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <FileImage className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      Delivery chalans are managed from the Production Planning module
                    </span>
                    <span className="mt-1 block text-xs text-gray-500">
                      Visit Production Planning to upload delivery chalan images
                    </span>
                  </div>
                </div>
              </div>
              
              {deliveryChalans.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {deliveryChalans.map((file) => (
                    <FileCard key={file.id} file={file} onDelete={handleDeleteFile} onDownload={handleDownloadFile} />
                  ))}
                </div>
              )}
              
              {deliveryChalans.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No delivery chalans uploaded yet.
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsFileDialogOpen(false);
                setSelectedProjectForFiles(null);
                setFileTabActive('general');
              }}
              data-testid="button-close-file-dialog"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ResponsiveLayout>
  );
}

// File Card Component
function FileCard({ 
  file, 
  onDelete, 
  onDownload 
}: { 
  file: ProjectFile; 
  onDelete: (id: number) => void; 
  onDownload: (id: number, name: string) => void; 
}) {
  const getFileIcon = (mimeType: string) => {
    if (mimeType?.startsWith('image/')) return <FileImage className="h-6 w-6 text-blue-500" />;
    if (mimeType?.includes('pdf')) return <FileText className="h-6 w-6 text-red-500" />;
    if (mimeType?.includes('excel') || mimeType?.includes('spreadsheet')) return <FileText className="h-6 w-6 text-green-500" />;
    return <FileText className="h-6 w-6 text-gray-500" />;
  };

  return (
    <div 
      className="flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-gray-50"
      data-testid={`file-card-${file.id}`}
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        {getFileIcon(file.mimeType || '')}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" title={file.originalName}>
            {file.originalName}
          </p>
          <p className="text-xs text-gray-500">
            {((file.fileSize || 0) / 1024 / 1024).toFixed(1)} MB
          </p>
        </div>
      </div>
      <div className="flex space-x-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onDownload(file.id, file.originalName)}
          data-testid={`button-download-${file.id}`}
        >
          <Download className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onDelete(file.id)}
          data-testid={`button-delete-${file.id}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}