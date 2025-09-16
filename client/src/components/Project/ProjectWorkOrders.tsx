import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, User, FileText, Factory, CheckCircle, AlertTriangle, Play, Upload, FileImage, Download, Plus, Eye, Trash2, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ProjectWorkOrdersProps {
  projectId: number;
}

interface WorkOrder {
  id: number;
  orderNumber: string;
  title: string;
  description: string;
  status: 'pending' | 'planned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  orderType: 'manufacturing' | 'assembly' | 'finishing' | 'packaging';
  totalQuantity: number;
  specifications: string;
  estimatedStartDate: string;
  estimatedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  createdAt: string;
  project?: {
    id: number;
    name: string;
    code: string;
  };
  client?: {
    id: number;
    name: string;
  };
  quote?: {
    id: number;
    quoteNumber: string;
    title: string;
  };
  createdByUser?: {
    id: number;
    name: string;
  };
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  planned: 'bg-blue-100 text-blue-800', 
  in_progress: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800'
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-red-100 text-red-800'
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending': return <Clock className="h-4 w-4" />;
    case 'planned': return <Calendar className="h-4 w-4" />;
    case 'in_progress': return <Play className="h-4 w-4" />;
    case 'completed': return <CheckCircle className="h-4 w-4" />;
    case 'cancelled': return <AlertTriangle className="h-4 w-4" />;
    default: return <Factory className="h-4 w-4" />;
  }
};

export default function ProjectWorkOrders({ projectId }: ProjectWorkOrdersProps) {
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCreateWorkOrderOpen, setIsCreateWorkOrderOpen] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', file: null as File | null });
  const [createWorkOrderForm, setCreateWorkOrderForm] = useState({ title: '', quantity: 1 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setUploadForm(prev => ({ ...prev, file: event.target.files![0] }));
    }
  };
  const queryClient = useQueryClient();

  // Delete work order mutation
  const deleteWorkOrderMutation = useMutation({
    mutationFn: async (workOrderId: number) => {
      const response = await apiRequest(`/api/work-orders/${workOrderId}`, { method: 'DELETE' });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders', { projectId }] });
      toast({ title: "Work order deleted successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to delete work order", variant: "destructive" });
    }
  });

  // Create work order mutation
  const createWorkOrderMutation = useMutation({
    mutationFn: async (data: { title: string; quantity: number }) => {
      const response = await apiRequest('/api/work-orders', { 
        method: 'POST', 
        body: JSON.stringify({ ...data, projectId })
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders', { projectId }] });
      setIsCreateWorkOrderOpen(false);
      setCreateWorkOrderForm({ title: '', quantity: 1 });
      toast({ title: "Work order created successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to create work order", variant: "destructive" });
    }
  });

  // Handle delete work order
  const handleDeleteWorkOrder = (workOrderId: number) => {
    if (window.confirm('Are you sure you want to delete this work order?')) {
      deleteWorkOrderMutation.mutate(workOrderId);
    }
  };

  // Handle create work order
  const handleCreateWorkOrder = () => {
    if (!createWorkOrderForm.title.trim()) {
      toast({ title: "Please enter a title for the work order", variant: "destructive" });
      return;
    }
    createWorkOrderMutation.mutate(createWorkOrderForm);
  };

  const { data: workOrders = [], isLoading } = useQuery<WorkOrder[]>({
    queryKey: ['/api/work-orders', { projectId }],
    queryFn: () => apiRequest(`/api/work-orders?projectId=${projectId}`),
  });

  // Delivery notes query key - consistent for cache invalidation
  const deliveryNotesKey = ['/api/projects', projectId, 'files', 'delivery_chalan'];
  
  // Fetch delivery notes for this project  
  const { data: deliveryNotesData } = useQuery<{ files: any[] }>({
    queryKey: deliveryNotesKey,
    queryFn: () => apiRequest(`/api/projects/${projectId}/files?category=delivery_chalan`),
    staleTime: 30000,
  });

  const deliveryNotes = deliveryNotesData?.files || [];

  // Simple delivery notes upload mutation
  const deliveryNotesUploadMutation = useMutation({
    mutationFn: async ({ title, file }: { title: string; file: File }) => {
      const formData = new FormData();
      formData.append('files', file);
      formData.append('category', 'delivery_chalan');
      formData.append('title', title);
      
      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload delivery note');
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryNotesKey });
      setUploadingFiles(false);
      setIsUploadModalOpen(false);
      setUploadForm({ title: '', file: null });
      toast({
        title: "Delivery note uploaded successfully",
      });
    },
    onError: (error: any) => {
      setUploadingFiles(false);
      toast({
        title: "Error uploading delivery note",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSimpleUpload = () => {
    if (!uploadForm.title || !uploadForm.file) {
      toast({
        title: "Missing fields",
        description: "Please enter a title and select a file",
        variant: "destructive",
      });
      return;
    }
    
    setUploadingFiles(true);
    deliveryNotesUploadMutation.mutate({ 
      title: uploadForm.title, 
      file: uploadForm.file 
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="flex space-x-2">
                <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                <div className="h-6 bg-gray-200 rounded-full w-16"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Delivery Notes Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileImage className="h-5 w-5" />
            <span>Delivery Notes</span>
            {deliveryNotes.length > 0 && (
              <Badge variant="secondary">{deliveryNotes.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Simple inline uploader - just like Files tab */}
          <div className="flex items-center gap-3 mb-4 p-3 border rounded-lg bg-gray-50">
            <input
              type="text"
              placeholder="Comment"
              value={uploadForm.title}
              onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
              className="flex-1 px-3 py-2 border rounded text-sm"
              data-testid="input-delivery-comment"
            />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              accept="image/*,.pdf,.doc,.docx"
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              size="sm"
              data-testid="button-select-files"
            >
              Add
            </Button>
            <Button
              onClick={handleSimpleUpload}
              disabled={!uploadForm.file || uploadingFiles}
              className="bg-brown-600 hover:bg-brown-700 text-white"
              size="sm"
              data-testid="button-upload"
            >
              {uploadingFiles ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            </Button>
          </div>

          {/* Display uploaded delivery notes */}
          {deliveryNotes.length > 0 ? (
            <div className="space-y-3">
              {deliveryNotes.map((file: any) => (
                <div 
                  key={file.id} 
                  className="flex items-start space-x-3 p-3 border rounded-lg bg-white dark:bg-gray-800"
                  data-testid={`delivery-note-production-${file.id}`}
                >
                  <div className="flex-shrink-0">
                    {file.fileType?.startsWith('image/') ? (
                      <img 
                        src={`/api/files/${file.id}/download`} 
                        alt={file.originalName}
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                        <FileText className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {file.title || file.originalName}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(file.createdAt).toLocaleDateString()}
                    </p>
                    {file.comments && (
                      <p className="text-xs text-gray-600 mt-1">{file.comments}</p>
                    )}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => window.open(`/api/files/${file.id}/download`, '_blank')}
                    data-testid={`button-download-production-${file.id}`}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileImage className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-sm">No delivery notes uploaded yet.</p>
              <p className="text-xs mt-1">Click "Quick Upload Delivery Challan" to add your first delivery note.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Work Orders Section - Compact */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Factory className="h-5 w-5" />
                <span>Work Orders</span>
                {workOrders.length > 0 && (
                  <Badge variant="secondary">{workOrders.length}</Badge>
                )}
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                A work order is a simple production task created after a quote is approved.
              </p>
            </div>
            <Button
              onClick={() => setIsCreateWorkOrderOpen(true)}
              className="bg-brown-600 hover:bg-brown-700 text-white"
              size="sm"
              data-testid="button-create-work-order"
            >
              <Plus className="h-4 w-4 mr-1" />
              Create Work Order
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {workOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Factory className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-sm">No work orders yet</p>
              <p className="text-xs mt-1">Click "Create Work Order" to add your first production task</p>
            </div>
          ) : (
            <div className="space-y-2">
              {workOrders.map((workOrder) => (
                <div key={workOrder.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(workOrder.status)}
                      <span className="font-medium">{workOrder.orderNumber}</span>
                    </div>
                    <span className="text-sm text-gray-600">{workOrder.title}</span>
                    <Badge className={`${statusColors[workOrder.status]} text-xs`}>
                      {workOrder.status.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs text-gray-500">Qty: {workOrder.totalQuantity}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(workOrder.estimatedStartDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`/production/work-orders/${workOrder.id}`, '_blank')}
                      data-testid={`button-view-${workOrder.id}`}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteWorkOrder(workOrder.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      data-testid={`button-delete-${workOrder.id}`}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Work Order Dialog */}
      <Dialog open={isCreateWorkOrderOpen} onOpenChange={setIsCreateWorkOrderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Work Order</DialogTitle>
            <DialogDescription>
              Create a new production task for this project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="wo-title">Title *</Label>
              <Input
                id="wo-title"
                placeholder="Enter work order title"
                value={createWorkOrderForm.title}
                onChange={(e) => setCreateWorkOrderForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="wo-quantity">Quantity *</Label>
              <Input
                id="wo-quantity"
                type="number"
                min="1"
                value={createWorkOrderForm.quantity}
                onChange={(e) => setCreateWorkOrderForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsCreateWorkOrderOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateWorkOrder}
              disabled={!createWorkOrderForm.title.trim() || createWorkOrderMutation.isPending}
              className="bg-brown-600 hover:bg-brown-700 text-white"
            >
              {createWorkOrderMutation.isPending ? "Creating..." : "Create Work Order"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}