import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, FileText, Factory, CheckCircle, AlertTriangle, Play, Upload, FileImage, Download, Trash2 } from "lucide-react";
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: workOrders = [], isLoading } = useQuery<WorkOrder[]>({
    queryKey: ['/api/work-orders', { projectId }],
    queryFn: () => apiRequest(`/api/work-orders?projectId=${projectId}`),
  });

  // Fetch delivery notes for this project
  const { data: deliveryNotesData } = useQuery<{ files: any[] }>({
    queryKey: ['/api/projects', projectId, 'files', 'delivery_chalan'],
    queryFn: () => apiRequest(`/api/projects/${projectId}/files?type=delivery_chalan`),
  });

  const deliveryNotes = deliveryNotesData?.files || [];

  // Delivery notes upload mutation
  const deliveryNotesUploadMutation = useMutation({
    mutationFn: async ({ files }: { files: File[] }) => {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });
      
      const response = await fetch(`/api/projects/${projectId}/files/delivery-chalans/multiple`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload delivery notes');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'files', 'delivery_chalan'] });
      setUploadingFiles(false);
      toast({
        title: "Delivery notes uploaded successfully",
        description: `${data.files?.length || 0} files uploaded`
      });
    },
    onError: (error: any) => {
      setUploadingFiles(false);
      toast({
        title: "Error uploading delivery notes",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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

  if (workOrders.length === 0) {
    return (
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
    );
  }

  return (
    <div className="space-y-6">
      {/* Delivery Notes Upload Section */}
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
          <div 
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 transition-colors hover:border-blue-400 mb-4"
            onPaste={(e) => {
              e.preventDefault();
              const items = Array.from(e.clipboardData?.items || []);
              const imageFiles = items
                .filter(item => item.type.startsWith('image/'))
                .map(item => item.getAsFile())
                .filter(file => file !== null) as File[];
              
              if (imageFiles.length > 0) {
                setUploadingFiles(true);
                deliveryNotesUploadMutation.mutate({ files: imageFiles });
                toast({
                  title: "Images pasted",
                  description: `${imageFiles.length} image(s) pasted from clipboard`
                });
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add('border-blue-400', 'bg-blue-50', 'dark:bg-blue-900/20');
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50', 'dark:bg-blue-900/20');
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50', 'dark:bg-blue-900/20');
              const files = Array.from(e.dataTransfer?.files || []);
              if (files.length > 0) {
                setUploadingFiles(true);
                deliveryNotesUploadMutation.mutate({ files });
              }
            }}
            tabIndex={0}
            data-testid="delivery-notes-production-drop-zone"
          >
            <div className="text-center">
              <Upload className="mx-auto h-8 w-8 text-gray-400" />
              <div className="mt-4">
                <label htmlFor="delivery-notes-production-upload" className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-gray-100">
                    Drop delivery notes here, click to browse, or paste images (Ctrl+V)
                  </span>
                  <span className="mt-1 block text-xs text-gray-500">
                    Images, PDFs, Excel files up to 10MB each • Supports clipboard paste for images
                  </span>
                </label>
                <input
                  id="delivery-notes-production-upload"
                  type="file"
                  multiple
                  accept="image/*,.pdf,.xlsx,.xls"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                      setUploadingFiles(true);
                      deliveryNotesUploadMutation.mutate({ files });
                      e.target.value = ''; // Reset input
                    }
                  }}
                  className="hidden"
                  data-testid="input-delivery-notes-production"
                />
              </div>
              {uploadingFiles && (
                <div className="mt-4">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Uploading delivery notes...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Display uploaded delivery notes */}
          {deliveryNotes.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {deliveryNotes.map((file: any) => (
                <div 
                  key={file.id} 
                  className="flex items-center justify-between p-3 border rounded-lg bg-white dark:bg-gray-800"
                  data-testid={`delivery-note-production-${file.id}`}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <FileImage className="h-5 w-5 text-blue-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {file.originalName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(file.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => window.open(`/api/files/${file.id}/download`, '_blank')}
                      data-testid={`button-download-production-${file.id}`}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {deliveryNotes.length === 0 && !uploadingFiles && (
            <p className="text-center text-gray-500 text-sm">
              No delivery notes uploaded yet. Upload your first delivery note above.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Work Orders Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Work Orders</h3>
        {workOrders.map((workOrder) => (
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
      ))}
    </div>
  </div>
  );
}