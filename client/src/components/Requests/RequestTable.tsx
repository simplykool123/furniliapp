import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticatedApiRequest, authService } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Check, X, Truck, FileText, Download, Search, CheckCircle, XCircle, Package, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useIsMobile } from "@/components/Mobile/MobileOptimizer";
import MobileTable from "@/components/Mobile/MobileTable";
import MobileFilters from "@/components/Mobile/MobileFilters";

interface MaterialRequest {
  id: number;
  clientName: string;
  orderNumber: string;
  requestedBy: number;
  requestedByUser?: { name: string; email: string };
  status: string;
  priority: string;
  totalValue: number;
  boqReference?: string;
  createdAt: string;
  items: any[];
}

export default function RequestTable() {
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    clientName: "",
  });
  const [selectedRequest, setSelectedRequest] = useState<MaterialRequest | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const isMobile = useIsMobile();

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = authService.getUser();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['/api/requests', filters], // Revert to stable cache key
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') params.append(key, value);
      });
      // Add cache buster
      params.append('_t', Date.now().toString());
      
      const response = await authenticatedApiRequest('GET', `/api/requests?${params}`);
      return response;
    },
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await authenticatedApiRequest('PATCH', `/api/requests/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Status updated",
        description: "Request status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await authenticatedApiRequest('DELETE', `/api/requests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Request deleted",
        description: "Material request has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const exportRequests = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') params.append(key, value);
      });
      
      const response = await fetch(`/api/export/requests?${params}`, {
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`
        }
      });
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `requests_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export requests data",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
      approved: "bg-green-100 text-green-800 hover:bg-green-100",
      issued: "bg-blue-100 text-blue-800 hover:bg-blue-100",
      completed: "bg-green-100 text-green-800 hover:bg-green-100",
      rejected: "bg-red-100 text-red-800 hover:bg-red-100",
    };
    
    return (
      <Badge className={statusStyles[status as keyof typeof statusStyles] || "bg-gray-100 text-gray-800"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityStyles = {
      high: "bg-red-100 text-red-800 hover:bg-red-100",
      medium: "bg-blue-100 text-blue-800 hover:bg-blue-100",
      low: "bg-gray-100 text-gray-800 hover:bg-gray-100",
    };
    
    if (!priority) {
      return (
        <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
          Medium
        </Badge>
      );
    }
    
    return (
      <Badge className={priorityStyles[priority as keyof typeof priorityStyles] || "bg-gray-100 text-gray-800"}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </Badge>
    );
  };

  const filteredRequests = requests?.filter((request: MaterialRequest) => {
    if (activeTab === "all") return true;
    if (activeTab === "pending") return request.status === "pending";
    if (activeTab === "approved") return request.status === "approved";
    if (activeTab === "issued") return request.status === "issued";
    if (activeTab === "rejected") return request.status === "rejected";
    return true;
  }) || [];

  const getStatusCounts = () => {
    if (!requests) return { all: 0, pending: 0, approved: 0, issued: 0, rejected: 0 };
    
    return {
      all: requests.length,
      pending: requests.filter((r: MaterialRequest) => r.status === 'pending').length,
      approved: requests.filter((r: MaterialRequest) => r.status === 'approved').length,
      issued: requests.filter((r: MaterialRequest) => r.status === 'issued').length,
      rejected: requests.filter((r: MaterialRequest) => r.status === 'rejected').length,
    };
  };

  const statusCounts = getStatusCounts();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  // Mobile table columns configuration
  const mobileColumns = [
    {
      key: 'orderNumber',
      label: 'Order No',
      priority: 'high' as const,
    },
    {
      key: 'clientName',
      label: 'Client',
      priority: 'high' as const,
    },
    {
      key: 'status',
      label: 'Status',
      priority: 'high' as const,
      render: (value: string) => getStatusBadge(value),
    },
    {
      key: 'priority',
      label: 'Priority',
      priority: 'medium' as const,
      render: (value: string) => getPriorityBadge(value),
    },
    {
      key: 'totalValue',
      label: 'Total Value',
      priority: 'medium' as const,
      render: (value: number) => `₹${value?.toLocaleString() || 0}`,
    },
    {
      key: 'requestedByUser',
      label: 'Requested By',
      priority: 'low' as const,
      render: (value: any) => value?.name || '-',
    },
    {
      key: 'createdAt',
      label: 'Created',
      priority: 'low' as const,
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ];

  // Mobile filter configuration
  const mobileFilters = [
    {
      key: 'search',
      label: 'Search',
      type: 'search' as const,
      placeholder: 'Search by client, order number...',
      value: filters.search,
      onChange: (value: string) => setFilters(prev => ({ ...prev, search: value })),
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      value: filters.status,
      onChange: (value: string) => setFilters(prev => ({ ...prev, status: value })),
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'issued', label: 'Issued' },
        { value: 'completed', label: 'Completed' },
      ],
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Mobile Status Filter - Simple Select */}
      <div className="block md:hidden mb-4">
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger className="w-full h-10 text-sm bg-white border-2 border-furnili-brown/20 rounded-lg">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="border-2 border-furnili-brown/20">
            <SelectItem value="all" className="text-sm">All ({statusCounts.all})</SelectItem>
            <SelectItem value="pending" className="text-sm">Pending ({statusCounts.pending})</SelectItem>
            <SelectItem value="approved" className="text-sm">Approved ({statusCounts.approved})</SelectItem>
            <SelectItem value="issued" className="text-sm">Issued ({statusCounts.issued})</SelectItem>
            <SelectItem value="rejected" className="text-sm">Rejected ({statusCounts.rejected})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mobile Filters */}
      <div className="block md:hidden mb-4">
        <MobileFilters
          filters={mobileFilters}
          onClearAll={() => setFilters({ search: "", status: "", clientName: "" })}
          className="mb-4"
        />
      </div>

      {/* Desktop Status Tabs */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="pt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-5 bg-furnili-brown/5 p-1 rounded-lg">
                <TabsTrigger value="all" className="flex items-center gap-1 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-furnili-brown">
                  All
                  <Badge variant="secondary" className="ml-1 text-xs">{statusCounts.all}</Badge>
                </TabsTrigger>
                <TabsTrigger value="pending" className="flex items-center gap-1 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-furnili-brown">
                  Pending
                  <Badge className="bg-yellow-100 text-yellow-800 ml-1 text-xs">{statusCounts.pending}</Badge>
                </TabsTrigger>
                <TabsTrigger value="approved" className="flex items-center gap-1 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-furnili-brown">
                  Approved
                  <Badge className="bg-green-100 text-green-800 ml-1 text-xs">{statusCounts.approved}</Badge>
                </TabsTrigger>
                <TabsTrigger value="issued" className="flex items-center gap-1 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-furnili-brown">
                  Issued
                  <Badge className="bg-blue-100 text-blue-800 ml-1 text-xs">{statusCounts.issued}</Badge>
                </TabsTrigger>
                <TabsTrigger value="rejected" className="flex items-center gap-1 text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-furnili-brown">
                  Rejected
                  <Badge className="bg-red-100 text-red-800 ml-1 text-xs">{statusCounts.rejected}</Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Desktop Filters */}
      <div className="hidden md:block">
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search requests..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10"
                />
              </div>

              <Select 
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="issued">Issued</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Input
                placeholder="Client name..."
                value={filters.clientName}
                onChange={(e) => setFilters({ ...filters, clientName: e.target.value })}
              />

              <Button onClick={exportRequests} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Table */}
      <div className="block md:hidden">
        <MobileTable
          data={filteredRequests}
          columns={mobileColumns}
          onRowClick={(request) => {
            setSelectedRequest(request);
            setShowDetails(true);
          }}
          emptyMessage="No material requests found"
        />
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <Card>
          <CardHeader>
            <CardTitle>Material Requests ({filteredRequests.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Request Details</TableHead>
                    <TableHead>Client Info</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request: MaterialRequest) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">REQ-{request.id.toString().padStart(4, '0')}</p>
                          <p className="text-sm text-gray-600">
                            By: {request.requestedByUser?.name || `User ${request.requestedBy}`}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(request.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{request.clientName}</p>
                          <p className="text-sm text-gray-600">{request.orderNumber}</p>
                          {request.boqReference && (
                            <p className="text-sm text-blue-600">{request.boqReference}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{request.items?.length || 0} items</p>
                          <p className="text-sm text-gray-600">
                            {request.items?.slice(0, 2).map(item => item.product.name).join(', ')}
                            {(request.items?.length || 0) > 2 && '...'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>{getPriorityBadge(request.priority)}</TableCell>
                      <TableCell>
                        <p className="font-medium">₹{(request.totalValue || 0).toFixed(2)}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowDetails(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          
                          {user?.role === 'storekeeper' && request.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'approved' })}
                                className="text-green-600 hover:text-green-700"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'rejected' })}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          
                          {user?.role === 'storekeeper' && request.status === 'approved' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'issued' })}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Truck className="w-4 h-4" />
                            </Button>
                          )}
                          
                          {(user?.role === 'admin' || user?.role === 'manager') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this material request? This action cannot be undone.')) {
                                  deleteMutation.mutate(request.id);
                                }
                              }}
                              className="text-red-600 hover:text-red-700"
                              disabled={deleteMutation.isPending}
                            >
                              {deleteMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Request Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Request Details - REQ-{selectedRequest?.id.toString().padStart(4, '0')}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRequest && (
            <div className="space-y-6">
              {/* Request Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Request Information</h4>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Client:</span> {selectedRequest.clientName}</p>
                    <p><span className="font-medium">Order Number:</span> {selectedRequest.orderNumber || `REQ-${selectedRequest.id.toString().padStart(4, '0')}`}</p>
                    <p><span className="font-medium">Requested By:</span> {selectedRequest.requestedByUser?.name || `User ${selectedRequest.requestedBy}`}</p>
                    <p><span className="font-medium">Date:</span> {new Date(selectedRequest.createdAt).toLocaleDateString()}</p>
                    {selectedRequest.boqReference && (
                      <p><span className="font-medium">BOQ Reference:</span> {selectedRequest.boqReference}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Status Information</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Status:</span>
                      {getStatusBadge(selectedRequest.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Priority:</span>
                      {getPriorityBadge(selectedRequest.priority)}
                    </div>
                    <p className="text-sm">
                      <span className="font-medium">Total Value:</span> ₹{(selectedRequest.totalValue || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="font-medium mb-4">Requested Items</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Requested Qty</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedRequest.items?.map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.product.name}</p>
                            <p className="text-sm text-gray-600">{item.product.sku}</p>
                          </div>
                        </TableCell>
                        <TableCell>{item.requestedQuantity} {item.product.unit}</TableCell>
                        <TableCell>₹{(item.unitPrice || 0).toFixed(2)}</TableCell>
                        <TableCell>₹{(item.totalPrice || 0).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Action Buttons for Managers/Admins */}
              {selectedRequest && selectedRequest.status === 'pending' && user?.role !== 'staff' && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Actions</h4>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      onClick={() => {
                        updateStatusMutation.mutate({ 
                          id: selectedRequest.id, 
                          status: 'approved' 
                        });
                        setShowDetails(false);
                      }}
                      disabled={updateStatusMutation.isPending}
                      className="bg-green-600 hover:bg-green-700 text-white flex-1"
                    >
                      {updateStatusMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve Request
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        updateStatusMutation.mutate({ 
                          id: selectedRequest.id, 
                          status: 'rejected' 
                        });
                        setShowDetails(false);
                      }}
                      disabled={updateStatusMutation.isPending}
                      variant="destructive"
                      className="flex-1"
                    >
                      {updateStatusMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject Request
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Actions for Approved Requests */}
              {selectedRequest && selectedRequest.status === 'approved' && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Actions</h4>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {/* Issue Materials - Admin, Manager & Store Incharge */}
                    {(user?.role === 'admin' || user?.role === 'manager' || user?.role === 'store_incharge') && (
                      <Button
                        onClick={() => {
                          updateStatusMutation.mutate({ 
                            id: selectedRequest.id, 
                            status: 'issued' 
                          });
                          setShowDetails(false);
                        }}
                        disabled={updateStatusMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
                      >
                        {updateStatusMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Package className="mr-2 h-4 w-4" />
                            Issue Materials
                          </>
                        )}
                      </Button>
                    )}
                    
                    {/* Reject Approved Request - Admin/Manager */}
                    {(user?.role === 'admin' || user?.role === 'manager') && (
                      <Button
                        onClick={() => {
                          if (confirm('Are you sure you want to reject this approved request?')) {
                            updateStatusMutation.mutate({ 
                              id: selectedRequest.id, 
                              status: 'rejected' 
                            });
                            setShowDetails(false);
                          }
                        }}
                        disabled={updateStatusMutation.isPending}
                        variant="destructive"
                        className="flex-1"
                      >
                        {updateStatusMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject Request
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Complete Button for any authorized role when Issued */}
              {selectedRequest && selectedRequest.status === 'issued' && user?.role !== 'staff' && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Complete Request</h4>
                  <Button
                    onClick={() => {
                      updateStatusMutation.mutate({ 
                        id: selectedRequest.id, 
                        status: 'completed' 
                      });
                      setShowDetails(false);
                    }}
                    disabled={updateStatusMutation.isPending}
                    className="bg-gray-600 hover:bg-gray-700 text-white w-full sm:w-auto"
                  >
                    {updateStatusMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Mark as Completed
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
