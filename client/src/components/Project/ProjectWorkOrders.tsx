import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, User, FileText, Factory, CheckCircle, AlertTriangle, Play, Upload, FileImage, Download, Plus, Eye, Trash2, Loader2, MoreVertical, Image, FolderOpen, X } from "lucide-react";
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

  // Files tab interface state management
  const [editingComment, setEditingComment] = useState<{
    fileId: number;
    comment: string;
  } | null>(null);
  const [groupTitles, setGroupTitles] = useState<Record<string, string>>({});
  const [editingGroupTitle, setEditingGroupTitle] = useState<string | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    name: string;
  } | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadContext, setUploadContext] = useState<{
    category: string;
    title: string;
  } | null>(null);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setUploadForm(prev => ({ ...prev, file: event.target.files![0] }));
    }
  };
  const queryClient = useQueryClient();

  // Helper function to get file icons based on MIME type - copied from Files tab
  const getFileIcon = (mimeType: string, fileName: string) => {
    if (mimeType?.includes("image"))
      return <Image className="h-5 w-5 text-blue-500" />;
    if (mimeType?.includes("pdf"))
      return <FileText className="h-5 w-5 text-red-500" />;
    if (
      mimeType?.includes("excel") ||
      mimeType?.includes("spreadsheet") ||
      fileName?.endsWith(".xlsx")
    )
      return <FileText className="h-5 w-5 text-green-500" />;
    if (fileName?.endsWith(".dwg"))
      return <FileText className="h-5 w-5 text-purple-500" />;
    return <FileText className="h-5 w-5 text-gray-500" />;
  };

  // Comment update mutation - copied from Files tab
  const updateCommentMutation = useMutation({
    mutationFn: async ({
      fileId,
      comment,
      newDescription,
    }: {
      fileId: number;
      comment: string;
      newDescription?: string;
    }) => {
      const updateData: any = { comment };
      if (newDescription !== undefined) {
        updateData.description = newDescription;
      }
      return apiRequest(`/api/files/${fileId}/comment`, { method: "PUT", body: JSON.stringify(updateData) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryNotesKey });
      setEditingComment(null);
    },
    onError: () => {
      toast({
        title: "Error updating comment",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  // Delete file function - copied from Files tab
  const handleDeleteFile = (fileId: number, fileName: string) => {
    if (window.confirm(`Are you sure you want to delete "${fileName}"?`)) {
      const deleteFileMutation = {
        mutationFn: async (fileId: number) => {
          return apiRequest(`/api/files/${fileId}`, { method: "DELETE" });
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: deliveryNotesKey });
          toast({
            title: "File deleted successfully",
          });
        },
        onError: () => {
          toast({
            title: "Error deleting file",
            description: "Please try again",
            variant: "destructive",
          });
        },
      };
      // Execute the delete
      apiRequest(`/api/files/${fileId}`, { method: "DELETE" })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: deliveryNotesKey });
          toast({
            title: "File deleted successfully",
          });
        })
        .catch(() => {
          toast({
            title: "Error deleting file",
            description: "Please try again",
            variant: "destructive",
          });
        });
    }
  };

  // Function to handle group title updates - copied from Files tab
  const updateGroupTitle = (category: string, oldTitle: string, newTitle: string) => {
    if (newTitle === oldTitle || !newTitle.trim()) return;

    // Update the local state to reflect the change immediately
    setGroupTitles(prev => ({
      ...prev,
      [`${category}-${oldTitle}`]: newTitle,
      [`${category}-${newTitle}`]: newTitle, // Add new mapping
    }));

    // Update all files in this group individually via API
    const filesToUpdate = deliveryNotes?.filter(
      (file: any) => file.category === category && (file.description === oldTitle || file.title === oldTitle)
    ) || [];

    // Update each file individually with new description
    filesToUpdate.forEach((file: any) => {
      updateCommentMutation.mutate({
        fileId: file.id,
        comment: file.comment || '',
        newDescription: newTitle
      });
    });
  };

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
          {/* Simplified Delivery Notes Interface */}
          {deliveryNotes.length > 0 ? (
            <div className="space-y-4">
              {/* Simple Header with Add Button */}
              <div className="flex items-center justify-between">
                <h3 className="text-base font-medium text-gray-900">Delivery Notes</h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setUploadContext({
                      category: 'delivery_chalan',
                      title: 'Delivery Note'
                    });
                    setIsUploadDialogOpen(true);
                  }}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50 h-6 px-2 text-xs"
                >
                  Add
                </Button>
              </div>

              {/* Simple File Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5">
                {deliveryNotes.map((file: any) => (
                  <div key={file.id} className="group relative">
                    {/* File Thumbnail - Click to View */}
                    <div 
                      className="aspect-square bg-gray-100 rounded-sm overflow-hidden relative border border-orange-400 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => {
                        if (file.mimeType?.includes("pdf") || file.originalName?.toLowerCase().endsWith('.pdf')) {
                          // Open PDF directly in new tab
                          window.open(file.filePath ? `/${file.filePath}` : `/api/files/${file.id}/download`, '_blank');
                        } else if (file.mimeType?.includes("image") || file.fileType?.includes("image")) {
                          // Show image preview
                          setPreviewImage({
                            src: file.filePath ? `/${file.filePath}` : `/api/files/${file.id}/download`,
                            name: file.originalName,
                          });
                          setShowImagePreview(true);
                        } else {
                          // Download other files
                          const link = document.createElement('a');
                          link.href = file.filePath ? `/${file.filePath}` : `/api/files/${file.id}/download`;
                          link.download = file.originalName;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }
                      }}
                    >
                      {file.mimeType?.includes("image") || file.fileType?.includes("image") ? (
                        <img
                          src={file.filePath ? `/${file.filePath}` : `/api/files/${file.id}/download`}
                          alt={file.originalName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2">
                          {getFileIcon(file.mimeType || file.fileType, file.originalName)}
                          <span className="text-xs text-gray-600 mt-1 text-center truncate w-full">
                            {file.originalName}
                          </span>
                        </div>
                      )}

                      {/* Simple Delete Button */}
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0 bg-red-500 hover:bg-red-600 text-white rounded-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFile(file.id, file.originalName);
                          }}
                        >
                          <X className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Simple Comment Input */}
                    <div className="mt-0.5">
                      <input
                        type="text"
                        value={
                          editingComment?.fileId === file.id
                            ? editingComment?.comment
                            : file.comment || ""
                        }
                        placeholder="Add comment"
                        onChange={(e) => {
                          setEditingComment({
                            fileId: file.id,
                            comment: e.target.value,
                          });
                        }}
                        onFocus={() => {
                          if (!editingComment || editingComment.fileId !== file.id) {
                            setEditingComment({
                              fileId: file.id,
                              comment: file.comment || "",
                            });
                          }
                        }}
                        onBlur={() => {
                          if (editingComment?.fileId === file.id && editingComment) {
                            updateCommentMutation.mutate({
                              fileId: file.id,
                              comment: editingComment.comment,
                            });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && editingComment?.fileId === file.id && editingComment) {
                            updateCommentMutation.mutate({
                              fileId: file.id,
                              comment: editingComment.comment,
                            });
                          }
                        }}
                        className="w-full text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 focus:bg-white focus:border-blue-300 outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <FolderOpen className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <h3 className="text-base font-medium text-gray-900 mb-2">
                No delivery notes uploaded
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Upload your first delivery note to get started
              </p>
              <Button
                onClick={() => {
                  setUploadContext({ category: 'delivery_chalan', title: 'Delivery Note' });
                  setIsUploadDialogOpen(true);
                }}
                className="bg-brown-600 hover:bg-brown-700 text-white"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Delivery Note
              </Button>
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

      {/* Image Preview Modal - Copied from Files tab */}
      {showImagePreview && previewImage && (
        <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white"
                onClick={() => setShowImagePreview(false)}
              >
                ✕
              </Button>
              <img
                src={previewImage.src}
                alt={previewImage.name}
                className="w-full h-auto max-h-[85vh] object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Upload Dialog for Adding to Specific Groups - Copied from Files tab */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Delivery Note</DialogTitle>
            <DialogDescription>
              {uploadContext 
                ? `Add files to "${uploadContext.title}" group`
                : "Upload new delivery notes"
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="upload-title">Title</Label>
              <Input
                id="upload-title"
                placeholder="Enter title for the files"
                value={uploadForm.title}
                onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="upload-files">Files</Label>
              <input
                id="upload-files"
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                accept="image/*,.pdf,.doc,.docx"
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsUploadDialogOpen(false);
                setUploadContext(null);
                setUploadForm({ title: '', file: null });
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSimpleUpload}
              disabled={!uploadForm.file || uploadingFiles}
              className="bg-brown-600 hover:bg-brown-700 text-white"
            >
              {uploadingFiles ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}