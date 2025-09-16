import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, User, FileText, Factory, CheckCircle, AlertTriangle, Play, Upload, FileImage, Download, Plus } from "lucide-react";
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
  const [uploadForm, setUploadForm] = useState({ title: '', file: null as File | null });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: workOrders = [], isLoading } = useQuery<WorkOrder[]>({
    queryKey: ['/api/work-orders', { projectId }],
    queryFn: () => apiRequest(`/api/work-orders?projectId=${projectId}`),
  });

  // Fetch delivery notes for this project  
  const { data: deliveryNotesData } = useQuery<{ files: any[] }>({
    queryKey: ['/api/projects', projectId, 'files', 'delivery_chalan', 'v3'],
    queryFn: () => apiRequest(`/api/projects/${projectId}/files?category=delivery_chalan`),
    staleTime: 30000, // 30 seconds
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
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'files', 'delivery_chalan'] });
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <FileImage className="h-5 w-5" />
              <span>Delivery Notes</span>
              {deliveryNotes.length > 0 && (
                <Badge variant="secondary">{deliveryNotes.length}</Badge>
              )}
            </CardTitle>
            
            <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center space-x-2" data-testid="button-quick-upload-delivery">
                  <Plus className="h-4 w-4" />
                  <span>Quick Upload Delivery Challan</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Upload Delivery Challan</DialogTitle>
                  <DialogDescription>
                    Upload delivery challan files with subject and attach photos or documents.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="delivery-type">Type *</Label>
                    <Input 
                      id="delivery-type" 
                      value="Delivery Challan" 
                      disabled 
                      className="bg-gray-50"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="delivery-title">Subject *</Label>
                    <Input
                      id="delivery-title"
                      placeholder="Enter subject/description"
                      value={uploadForm.title}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                      data-testid="input-delivery-title"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="delivery-file">Select File * (or Ctrl+V to paste)</Label>
                    <Input
                      id="delivery-file"
                      type="file"
                      accept="image/*,.pdf,.xlsx,.xls"
                      onChange={(e) => setUploadForm(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                      onPaste={(e) => {
                        const items = e.clipboardData?.items;
                        if (items) {
                          for (let i = 0; i < items.length; i++) {
                            if (items[i].type.indexOf('image') !== -1) {
                              const file = items[i].getAsFile();
                              if (file) {
                                setUploadForm(prev => ({ ...prev, file }));
                                break;
                              }
                            }
                          }
                        }
                      }}
                      data-testid="input-delivery-file"
                    />
                    {uploadForm.file && (
                      <p className="text-xs text-green-600 mt-1">
                        File selected: {uploadForm.file.name}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsUploadModalOpen(false)}
                      disabled={uploadingFiles}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSimpleUpload}
                      disabled={uploadingFiles || !uploadForm.title || !uploadForm.file}
                      data-testid="button-upload-delivery"
                    >
                      {uploadingFiles ? "Uploading..." : "Upload File"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
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

      {/* Work Orders Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Work Orders</h3>
        {workOrders.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Factory className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Work Orders Yet</h3>
              <p className="text-gray-600 mb-4">
                Work orders will appear here once quotes are approved for production.
              </p>
              <p className="text-sm text-gray-500">
                Approve a quote to automatically create a work order and start the production process.
              </p>
            </CardContent>
          </Card>
        ) : (
          workOrders.map((workOrder) => (
        <Card key={workOrder.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(workOrder.status)}
                  <CardTitle className="text-lg">{workOrder.orderNumber}</CardTitle>
                </div>
                <h4 className="text-sm font-medium text-gray-800">{workOrder.title}</h4>
              </div>
              <div className="flex space-x-2">
                <Badge className={`${statusColors[workOrder.status]} text-xs`}>
                  {workOrder.status.replace('_', ' ')}
                </Badge>
                <Badge className={`${priorityColors[workOrder.priority]} text-xs`}>
                  {workOrder.priority}
                </Badge>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="space-y-3">
              {workOrder.description && (
                <p className="text-sm text-gray-600">{workOrder.description}</p>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Factory className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium capitalize">{workOrder.orderType}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Quantity:</span>
                  <span className="font-medium">{workOrder.totalQuantity}</span>
                </div>
                
                {workOrder.quote && (
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Quote:</span>
                    <span className="font-medium">{workOrder.quote.quoteNumber}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Estimated Start:</span>
                  <p className="font-medium">
                    {new Date(workOrder.estimatedStartDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Estimated End:</span>
                  <p className="font-medium">
                    {new Date(workOrder.estimatedEndDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {workOrder.actualStartDate && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Actual Start:</span>
                    <p className="font-medium text-green-600">
                      {new Date(workOrder.actualStartDate).toLocaleDateString()}
                    </p>
                  </div>
                  {workOrder.actualEndDate && (
                    <div>
                      <span className="text-gray-600">Actual End:</span>
                      <p className="font-medium text-green-600">
                        {new Date(workOrder.actualEndDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {workOrder.specifications && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <span className="text-sm font-medium text-gray-700">Specifications:</span>
                  <p className="text-sm text-gray-600 mt-1">{workOrder.specifications}</p>
                </div>
              )}
              
              <div className="flex justify-between items-center pt-2 border-t">
                <div className="text-xs text-gray-500">
                  Created {new Date(workOrder.createdAt).toLocaleDateString()} 
                  {workOrder.createdByUser && ` by ${workOrder.createdByUser.name}`}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`/production/work-orders/${workOrder.id}`, '_blank')}
                >
                  View Details
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
          ))
        )}
      </div>
    </div>
  );
}