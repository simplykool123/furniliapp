import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, TrendingUp, Users, Calendar, Target, Eye, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";
import { authService } from "@/lib/auth";

const pipelineStageSchema = z.object({
  name: z.string().min(1, "Stage name is required"),
  description: z.string().optional(),
  order: z.number().min(0).default(0),
  probability: z.number().min(0).max(100).default(0),
  color: z.string().default("#6b7280"),
});

type PipelineStageFormData = z.infer<typeof pipelineStageSchema>;

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

interface Lead {
  id: number;
  name: string;
  email: string;
  company?: string;
  pipelineStageId?: number;
  estimatedValue?: number;
  createdAt: string;
}

export default function Pipeline() {
  const [isNewStageOpen, setIsNewStageOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null);
  const [isEditStageOpen, setIsEditStageOpen] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const user = authService.getUser();

  // Fetch pipeline stages
  const { data: stages = [], isLoading: stagesLoading } = useQuery<PipelineStage[]>({
    queryKey: ["/api/crm/pipeline-stages"],
  });

  // Fetch leads with pipeline data
  const { data: leads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/crm/leads"],
  });

  // Form setup
  const form = useForm<PipelineStageFormData>({
    resolver: zodResolver(pipelineStageSchema),
    defaultValues: {
      name: "",
      description: "",
      order: 0,
      probability: 0,
      color: "#6b7280",
    },
  });

  // Create pipeline stage mutation
  const createStageMutation = useMutation({
    mutationFn: (data: PipelineStageFormData) => 
      apiRequest("/api/crm/pipeline-stages", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crm/pipeline-stages"] });
      setIsNewStageOpen(false);
      form.reset();
      toast({ title: "Success", description: "Pipeline stage created successfully!" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create pipeline stage",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PipelineStageFormData) => {
    createStageMutation.mutate(data);
  };

  // Group leads by pipeline stage
  const leadsByStage = stages.map(stage => ({
    ...stage,
    leads: leads.filter(lead => lead.pipelineStageId === stage.id),
    totalValue: leads
      .filter(lead => lead.pipelineStageId === stage.id)
      .reduce((sum, lead) => sum + (lead.estimatedValue || 0), 0),
  }));

  // Pipeline metrics
  const totalLeads = leads.length;
  const totalValue = leads.reduce((sum, lead) => sum + (lead.estimatedValue || 0), 0);
  const conversionRates = stages.map(stage => {
    const stageLeads = leads.filter(lead => lead.pipelineStageId === stage.id).length;
    return {
      stageName: stage.name,
      conversion: totalLeads > 0 ? (stageLeads / totalLeads * 100).toFixed(1) : "0",
      leads: stageLeads,
    };
  });

  const canManageStages = user?.role === 'admin' || user?.role === 'manager';

  return (
    <ResponsiveLayout
      title="Sales Pipeline"
      subtitle="Track and manage your sales opportunities through each stage"
      showAddButton={canManageStages}
      onAddClick={() => setIsNewStageOpen(true)}
    >
      {/* Pipeline Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Opportunities</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-blue-600" data-testid="text-total-leads">{totalLeads}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pipeline Value</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-green-600" data-testid="text-total-value">
              ₹{totalValue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Stages</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-purple-600" data-testid="text-active-stages">
              {stages.filter(s => s.isActive).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search opportunities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-pipeline"
          />
        </div>
      </div>

      {/* Pipeline Kanban View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        {leadsByStage.map((stage) => (
          <Card key={stage.id} className="min-h-[400px]" data-testid={`card-stage-${stage.id}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: stage.color }}
                  ></div>
                  <CardTitle className="text-sm font-medium">{stage.name}</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {stage.leads.length}
                  </Badge>
                </div>
                {canManageStages && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedStage(stage);
                      setIsEditStageOpen(true);
                    }}
                    data-testid={`button-edit-stage-${stage.id}`}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="text-xs text-gray-500">
                {stage.probability}% probability • ₹{stage.totalValue.toLocaleString()}
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {stage.leads
                .filter(lead => 
                  lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (lead.company && lead.company.toLowerCase().includes(searchTerm.toLowerCase()))
                )
                .map((lead) => (
                  <Card key={lead.id} className="p-3 hover:shadow-md transition-shadow" data-testid={`card-lead-${lead.id}`}>
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{lead.name}</div>
                      <div className="text-xs text-gray-500">{lead.email}</div>
                      {lead.company && (
                        <div className="text-xs text-gray-500">{lead.company}</div>
                      )}
                      {lead.estimatedValue && (
                        <div className="text-xs font-medium text-green-600">
                          ₹{lead.estimatedValue.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              
              {stage.leads.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <Target className="h-8 w-8 mb-2" />
                  <div className="text-sm">No opportunities</div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Conversion Rates Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Stage Conversion Rates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stage</TableHead>
                <TableHead>Opportunities</TableHead>
                <TableHead>Conversion Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conversionRates.map((rate, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{rate.stageName}</TableCell>
                  <TableCell>{rate.leads}</TableCell>
                  <TableCell>{rate.conversion}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Stage Dialog */}
      <Dialog open={isNewStageOpen} onOpenChange={setIsNewStageOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Pipeline Stage</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stage Name *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-stage-name" />
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
                      <Textarea {...field} rows={3} data-testid="textarea-stage-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-stage-order" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="probability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Probability (%)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          min="0" 
                          max="100"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-stage-probability" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <FormControl>
                      <Input {...field} type="color" data-testid="input-stage-color" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsNewStageOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createStageMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700"
                  data-testid="button-create-stage"
                >
                  {createStageMutation.isPending ? "Creating..." : "Create Stage"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </ResponsiveLayout>
  );
}