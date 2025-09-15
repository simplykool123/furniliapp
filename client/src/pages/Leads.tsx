
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Filter, Users, Phone, Mail, Calendar, Star, LayoutGrid, Columns } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";

const leadFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required").optional(),
  mobile: z.string().min(10, "Valid mobile number is required"),
  city: z.string().min(1, "City is required"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  address1: z.string().optional(),
  address2: z.string().optional(),
  state: z.string().optional(),
  pinCode: z.string().optional(),
  leadSourceId: z.number().optional(),
  pipelineStageId: z.number().optional(),
});

type LeadFormData = z.infer<typeof leadFormSchema>;

interface Lead {
  id: number;
  name: string;
  email?: string;
  mobile: string;
  city: string;
  contactPerson?: string;
  phone?: string;
  address1?: string;
  address2?: string;
  state?: string;
  pinCode?: string;
  type: string;
  leadSourceId?: number;
  pipelineStageId?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  leadSource?: { id: number; name: string; type: string };
  pipelineStage?: { id: number; name: string; color: string; probability: number };
}

interface PipelineStage {
  id: number;
  name: string;
  description?: string;
  order: number;
  probability: number;
  color: string;
  isActive: boolean;
  createdAt: string;
}

interface LeadSource {
  id: number;
  name: string;
  type: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export default function Leads() {
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("kanban"); // Default to Kanban view

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch leads
  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/crm/leads", searchTerm, statusFilter, stageFilter],
  });

  // Fetch pipeline stages
  const { data: pipelineStages = [] } = useQuery<PipelineStage[]>({
    queryKey: ["/api/crm/pipeline-stages"],
  });

  // Fetch lead sources
  const { data: leadSources = [] } = useQuery<LeadSource[]>({
    queryKey: ["/api/crm/lead-sources"],
  });

  // Form setup
  const form = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      name: "",
      email: "",
      mobile: "",
      city: "",
      contactPerson: "",
      phone: "",
      address1: "",
      address2: "",
      state: "",
      pinCode: "",
      leadSourceId: undefined,
      pipelineStageId: undefined,
    },
  });

  // Create lead mutation
  const createLeadMutation = useMutation({
    mutationFn: (data: LeadFormData) => apiRequest("/api/crm/leads", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads"] });
      setIsNewLeadOpen(false);
      form.reset();
      toast({ title: "Success", description: "Lead created successfully!" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create lead",
        variant: "destructive",
      });
    },
  });

  // Convert lead to client mutation
  const convertToClientMutation = useMutation({
    mutationFn: (leadId: number) => apiRequest(`/api/crm/leads/${leadId}/convert`, "PUT"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads"] });
      toast({ title: "Success", description: "Lead converted to client successfully!" });
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to convert lead",
        variant: "destructive",
      });
    },
  });

  // Update lead pipeline stage mutation
  const updateStageMutation = useMutation({
    mutationFn: ({ leadId, stageId }: { leadId: number; stageId: number }) => 
      apiRequest(`/api/crm/leads/${leadId}`, "PUT", { pipelineStageId: stageId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/leads"] });
      toast({ title: "Success", description: "Lead stage updated successfully!" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update lead stage",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LeadFormData) => {
    createLeadMutation.mutate(data);
  };

  const handleConvertToClient = (leadId: number) => {
    convertToClientMutation.mutate(leadId);
  };

  // Filter leads
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (lead.email?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
                         (lead.contactPerson?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all"; // Simplified since status not in Lead type
    const matchesStage = stageFilter === "all" || lead.pipelineStage?.name === stageFilter;
    
    return matchesSearch && matchesStatus && matchesStage;
  });

  // Lead statistics  
  const leadStats = {
    total: leads.length,
    new: leads.filter(l => l.type === "lead" && !l.pipelineStageId).length,
    qualified: leads.filter(l => l.pipelineStage?.probability && l.pipelineStage.probability >= 60).length,
    converted: leads.filter(l => l.type === "client").length,
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 60) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  return (
    <ResponsiveLayout
      title="Lead Management"
      subtitle="Capture, qualify, and convert potential customers"
      showAddButton={true}
      onAddClick={() => setIsNewLeadOpen(true)}
    >
        
        <Dialog open={isNewLeadOpen} onOpenChange={setIsNewLeadOpen}>
          <DialogTrigger asChild>
            <Button className="bg-amber-600 hover:bg-amber-700" data-testid="button-new-lead">
              <Plus className="h-4 w-4 mr-2" />
              Add New Lead
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Lead</DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Name *</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-8" data-testid="input-lead-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" className="h-8" data-testid="input-lead-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="mobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Mobile *</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-8" data-testid="input-lead-mobile" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">City *</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-8" data-testid="input-lead-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="leadSourceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Lead Source</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString() || ""}>
                          <FormControl>
                            <SelectTrigger className="h-8" data-testid="select-lead-source">
                              <SelectValue placeholder="Select source" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {leadSources.map((source) => (
                              <SelectItem key={source.id} value={source.id.toString()}>
                                {source.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="pipelineStageId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Pipeline Stage</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString() || ""}>
                          <FormControl>
                            <SelectTrigger className="h-8" data-testid="select-pipeline-stage">
                              <SelectValue placeholder="Select stage" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {pipelineStages.map((stage) => (
                              <SelectItem key={stage.id} value={stage.id.toString()}>
                                {stage.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contactPerson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Contact Person</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-8" data-testid="input-lead-contact-person" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Phone</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-8" data-testid="input-lead-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="address1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Address Line 1</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-8" data-testid="input-lead-address1" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="address2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Address Line 2</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-8" data-testid="input-lead-address2" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">State</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-8" data-testid="input-lead-state" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="pinCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Pin Code</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-8" data-testid="input-lead-pincode" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsNewLeadOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createLeadMutation.isPending}
                    className="bg-amber-600 hover:bg-amber-700"
                    data-testid="button-create-lead"
                  >
                    {createLeadMutation.isPending ? "Creating..." : "Create Lead"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

      {/* Lead Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Leads</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-amber-600" data-testid="text-total-leads">{leadStats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">New Leads</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-blue-600" data-testid="text-new-leads">{leadStats.new}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Qualified</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-green-600" data-testid="text-qualified-leads">{leadStats.qualified}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Converted</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-purple-600" data-testid="text-converted-leads">{leadStats.converted}</div>
          </CardContent>
        </Card>
      </div>

      {/* View Toggle & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        {/* View Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="h-8 px-3"
            data-testid="button-list-view"
          >
            <LayoutGrid className="h-4 w-4 mr-1" />
            List
          </Button>
          <Button
            variant={viewMode === "kanban" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("kanban")}
            className="h-8 px-3"
            data-testid="button-kanban-view"
          >
            <Columns className="h-4 w-4 mr-1" />
            Kanban
          </Button>
        </div>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-leads"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={stageFilter} onValueChange={setStageFilter}>
          <SelectTrigger className="w-48" data-testid="select-stage-filter">
            <SelectValue placeholder="Filter by stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            {pipelineStages.map((stage) => (
              <SelectItem key={stage.id} value={stage.name}>
                {stage.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Leads View */}
      {leadsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4"></div>
                <div className="h-2 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredLeads.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No leads found</h3>
            <p className="text-gray-600 text-center">
              {searchTerm || statusFilter !== "all" || stageFilter !== "all" 
                ? "Try adjusting your search or filters" 
                : "Get started by adding your first lead"}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "kanban" ? (
        /* Kanban Board View */
        <div className="overflow-x-auto">
          <div className="flex gap-6 min-w-max pb-4">
            {pipelineStages.map((stage) => {
              const stageLeads = filteredLeads.filter(lead => lead.pipelineStageId === stage.id);
              return (
                <div key={stage.id} className="flex-shrink-0 w-80" data-testid={`kanban-column-${stage.id}`}>
                  {/* Stage Header */}
                  <div 
                    className="mb-4 p-3 rounded-lg border-l-4"
                    style={{ borderLeftColor: stage.color, backgroundColor: stage.color + "10" }}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900" style={{ color: stage.color }}>
                        {stage.name}
                      </h3>
                      <Badge variant="secondary" className="text-xs">
                        {stageLeads.length}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{stage.probability}% probability</p>
                  </div>
                  
                  {/* Lead Cards */}
                  <div className="space-y-3 min-h-96">
                    {stageLeads.map((lead) => (
                      <Card 
                        key={lead.id} 
                        className="cursor-move hover:shadow-md transition-shadow border-l-2"
                        style={{ borderLeftColor: stage.color }}
                        data-testid={`kanban-card-${lead.id}`}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', JSON.stringify({ leadId: lead.id, fromStage: stage.id }));
                        }}
                      >
                        <CardContent className="p-3">
                          <div className="mb-2">
                            <h4 className="font-medium text-sm text-gray-900" data-testid={`text-kanban-lead-name-${lead.id}`}>
                              {lead.name}
                            </h4>
                            <p className="text-xs text-gray-500">{lead.city}</p>
                          </div>
                          
                          <div className="space-y-1 mb-3">
                            <div className="flex items-center text-xs text-gray-600">
                              <Phone className="h-3 w-3 mr-1" />
                              {lead.mobile}
                            </div>
                            {lead.email && (
                              <div className="flex items-center text-xs text-gray-600">
                                <Mail className="h-3 w-3 mr-1" />
                                {lead.email}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-500">
                              {new Date(lead.createdAt).toLocaleDateString()}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleConvertToClient(lead.id)}
                              disabled={convertToClientMutation.isPending}
                              className="h-6 px-2 text-xs"
                              data-testid={`button-kanban-convert-${lead.id}`}
                            >
                              Convert
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {/* Drop Zone */}
                    <div 
                      className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center text-gray-400 text-sm min-h-20 flex items-center justify-center"
                      data-testid={`drop-zone-${stage.id}`}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        try {
                          const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                          if (data?.leadId && data.fromStage !== stage.id) {
                            updateStageMutation.mutate({ leadId: data.leadId, stageId: stage.id });
                          }
                        } catch (error) {
                          // Ignore invalid drops
                          console.warn('Invalid drop data:', error);
                        }
                      }}
                    >
                      Drop leads here
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Unassigned leads column */}
            <div className="flex-shrink-0 w-80" data-testid="kanban-column-unassigned">
              <div className="mb-4 p-3 rounded-lg border-l-4 border-gray-400 bg-gray-50">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-600">Unassigned</h3>
                  <Badge variant="secondary" className="text-xs">
                    {filteredLeads.filter(lead => !lead.pipelineStageId).length}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 mt-1">No stage assigned</p>
              </div>
              
              <div className="space-y-3 min-h-96">
                {filteredLeads.filter(lead => !lead.pipelineStageId).map((lead) => (
                  <Card 
                    key={lead.id} 
                    className="cursor-move hover:shadow-md transition-shadow border-l-2 border-gray-400"
                    data-testid={`kanban-card-unassigned-${lead.id}`}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', JSON.stringify({ leadId: lead.id, fromStage: null }));
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="mb-2">
                        <h4 className="font-medium text-sm text-gray-900">{lead.name}</h4>
                        <p className="text-xs text-gray-500">{lead.city}</p>
                      </div>
                      
                      <div className="space-y-1 mb-3">
                        <div className="flex items-center text-xs text-gray-600">
                          <Phone className="h-3 w-3 mr-1" />
                          {lead.mobile}
                        </div>
                        {lead.email && (
                          <div className="flex items-center text-xs text-gray-600">
                            <Mail className="h-3 w-3 mr-1" />
                            {lead.email}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500">
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleConvertToClient(lead.id)}
                          disabled={convertToClientMutation.isPending}
                          className="h-6 px-2 text-xs"
                        >
                          Convert
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* List View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLeads.map((lead) => (
            <Card key={lead.id} className="hover:shadow-lg transition-shadow" data-testid={`card-lead-${lead.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900" data-testid={`text-lead-name-${lead.id}`}>{lead.name}</h3>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    <span data-testid={`text-lead-email-${lead.id}`}>{lead.email || 'No email'}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    <span data-testid={`text-lead-phone-${lead.id}`}>{lead.mobile}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  {lead.pipelineStage && (
                    <Badge 
                      style={{ backgroundColor: lead.pipelineStage.color + "20", color: lead.pipelineStage.color }}
                      data-testid={`badge-stage-${lead.id}`}
                    >
                      {lead.pipelineStage.name}
                    </Badge>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                    Added {new Date(lead.createdAt).toLocaleDateString()}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleConvertToClient(lead.id)}
                    disabled={convertToClientMutation.isPending}
                    data-testid={`button-convert-${lead.id}`}
                  >
                    Convert
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </ResponsiveLayout>
  );
}