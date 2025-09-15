import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarIcon, Package, Plus, Search, Filter, Edit, Trash2, Eye, CheckCircle2, Clock, AlertCircle, Play, Pause } from "lucide-react";
import { format } from "date-fns";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { authenticatedApiRequest, authService } from "@/lib/auth";
import type { WorkOrderWithDetails } from "@shared/schema";

export default function WorkOrders() {
  const { toast } = useToast();
  const currentUser = authService.getUser();
  const isAdmin = currentUser?.role === 'admin';
  const canManage = ['admin', 'manager'].includes(currentUser?.role || '');
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [isAddingOrder, setIsAddingOrder] = useState(false);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrderWithDetails | null>(null);
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);
  
  const [orderForm, setOrderForm] = useState({
    title: "",
    description: "",
    projectId: "",
    clientId: "",
    orderType: "standard",
    priority: "medium",
    estimatedStartDate: "",
    estimatedEndDate: "",
    estimatedHours: "",
    specialInstructions: "",
    requiredSkills: "",
    qualityStandards: ""
  });

  const [editOrderForm, setEditOrderForm] = useState({
    id: "",
    title: "",
    description: "",
    projectId: "",
    clientId: "",
    orderType: "standard",
    priority: "medium",
    estimatedStartDate: "",
    estimatedEndDate: "",
    estimatedHours: "",
    specialInstructions: "",
    requiredSkills: "",
    qualityStandards: "",
    status: "pending"
  });

  const { data: workOrders, isLoading } = useQuery<WorkOrderWithDetails[]>({
    queryKey: ['/api/work-orders', { search: searchTerm, status: statusFilter, priority: priorityFilter }],
  });

  const { data: projects } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: clients } = useQuery({
    queryKey: ["/api/clients"],
  });

  // Mutations for work order management
  const addOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return await authenticatedApiRequest('POST', '/api/work-orders', orderData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders'] });
      toast({
        title: "Work Order Created",
        description: "Work order has been created successfully.",
      });
      setIsAddingOrder(false);
      setOrderForm({
        title: "",
        description: "",
        projectId: "",
        clientId: "",
        orderType: "standard",
        priority: "medium",
        estimatedStartDate: "",
        estimatedEndDate: "",
        estimatedHours: "",
        specialInstructions: "",
        requiredSkills: "",
        qualityStandards: ""
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create work order",
        variant: "destructive",
      });
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, ...updateData }: any) => {
      return await authenticatedApiRequest('PATCH', `/api/work-orders/${id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders'] });
      toast({
        title: "Work Order Updated",
        description: "Work order has been updated successfully.",
      });
      setIsEditingOrder(false);
      setSelectedOrder(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update work order",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await authenticatedApiRequest('PATCH', `/api/work-orders/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders'] });
      toast({
        title: "Status Updated",
        description: "Work order status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (id: number) => {
      return await authenticatedApiRequest('DELETE', `/api/work-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/work-orders'] });
      toast({
        title: "Work Order Deleted",
        description: "Work order has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete work order",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const handleAddOrder = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orderForm.title || !orderForm.projectId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const orderData = {
      ...orderForm,
      projectId: parseInt(orderForm.projectId),
      clientId: orderForm.clientId ? parseInt(orderForm.clientId) : undefined,
      estimatedHours: orderForm.estimatedHours ? parseFloat(orderForm.estimatedHours) : undefined,
      estimatedStartDate: orderForm.estimatedStartDate ? new Date(orderForm.estimatedStartDate) : undefined,
      estimatedEndDate: orderForm.estimatedEndDate ? new Date(orderForm.estimatedEndDate) : undefined,
    };

    addOrderMutation.mutate(orderData);
  };

  const handleEditOrder = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editOrderForm.title || !editOrderForm.projectId) {
      toast({
        title: "Validation Error", 
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const updateData = {
      id: parseInt(editOrderForm.id),
      title: editOrderForm.title,
      description: editOrderForm.description,
      projectId: parseInt(editOrderForm.projectId),
      clientId: editOrderForm.clientId ? parseInt(editOrderForm.clientId) : undefined,
      orderType: editOrderForm.orderType,
      priority: editOrderForm.priority,
      estimatedHours: editOrderForm.estimatedHours ? parseFloat(editOrderForm.estimatedHours) : undefined,
      estimatedStartDate: editOrderForm.estimatedStartDate ? new Date(editOrderForm.estimatedStartDate) : undefined,
      estimatedEndDate: editOrderForm.estimatedEndDate ? new Date(editOrderForm.estimatedEndDate) : undefined,
      specialInstructions: editOrderForm.specialInstructions,
      requiredSkills: editOrderForm.requiredSkills,
      qualityStandards: editOrderForm.qualityStandards,
    };

    updateOrderMutation.mutate(updateData);
  };

  const handleStatusChange = (id: number, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  const handleEditClick = (order: WorkOrderWithDetails) => {
    setEditOrderForm({
      id: order.id.toString(),
      title: order.title,
      description: order.description || "",
      projectId: order.projectId.toString(),
      clientId: order.clientId?.toString() || "",
      orderType: order.orderType,
      priority: order.priority as "low" | "medium" | "high" | "urgent",
      estimatedStartDate: order.estimatedStartDate ? (typeof order.estimatedStartDate === 'string' ? order.estimatedStartDate.split('T')[0] : order.estimatedStartDate.toISOString().split('T')[0]) : "",
      estimatedEndDate: order.estimatedEndDate ? (typeof order.estimatedEndDate === 'string' ? order.estimatedEndDate.split('T')[0] : order.estimatedEndDate.toISOString().split('T')[0]) : "",
      estimatedHours: order.estimatedHours?.toString() || "",
      specialInstructions: (order as any).specialInstructions || "",
      requiredSkills: (order as any).requiredSkills || "",
      qualityStandards: (order as any).qualityStandards || "",
      status: order.status
    });
    setSelectedOrder(order);
    setIsEditingOrder(true);
  };

  const handleViewClick = (order: WorkOrderWithDetails) => {
    setSelectedOrder(order);
    setIsOrderDetailOpen(true);
  };

  const handleDeleteClick = (id: number) => {
    if (confirm("Are you sure you want to delete this work order? This action cannot be undone.")) {
      deleteOrderMutation.mutate(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500 text-white';
      case 'in_progress': return 'bg-blue-500 text-white';
      case 'pending': return 'bg-yellow-500 text-white';
      case 'planned': return 'bg-purple-500 text-white';
      case 'paused': return 'bg-orange-500 text-white';
      case 'cancelled': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredOrders = workOrders?.filter(order => {
    const matchesSearch = searchTerm === "" || 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.project.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || order.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  if (isLoading) {
    return (
      <ResponsiveLayout title="Work Orders" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout
      title="Work Orders"
      subtitle="Manage production work orders and manufacturing workflows"
      showAddButton={canManage}
      onAddClick={() => setIsAddingOrder(true)}
    >
      {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search work orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-orders"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="planned">Planned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger data-testid="select-priority-filter">
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" className="w-full">
                <Filter className="mr-2 h-4 w-4" />
                More Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Work Orders Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Work Orders</CardTitle>
                <CardDescription>
                  {filteredOrders?.length || 0} work orders found
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Number</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders?.map((order) => (
                    <TableRow key={order.id} data-testid={`work-order-row-${order.id}`}>
                      <TableCell className="font-medium">
                        {order.orderNumber}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{order.title}</div>
                          {order.description && (
                            <div className="text-sm text-muted-foreground">
                              {order.description.substring(0, 50)}...
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{order.project.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {order.project.code}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(order.priority)}>
                          {order.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="capitalize">{order.orderType}</span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            {order.completionPercentage}%
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{width: `${order.completionPercentage}%`}}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.estimatedStartDate ? (
                          <div className="space-y-1">
                            <div className="text-sm">
                              {format(new Date(order.estimatedStartDate), 'MMM dd, yyyy')}
                            </div>
                            {order.actualStartDate && (
                              <div className="text-xs text-muted-foreground">
                                Started: {format(new Date(order.actualStartDate), 'MMM dd')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Not scheduled</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewClick(order)}
                            data-testid={`button-view-order-${order.id}`}
                          >
                            <Eye className="mr-1 h-3 w-3" />
                            View
                          </Button>
                          {canManage && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditClick(order)}
                              data-testid={`button-edit-order-${order.id}`}
                            >
                              <Edit className="mr-1 h-3 w-3" />
                              Edit
                            </Button>
                          )}
                          {order.status !== 'completed' && order.status !== 'cancelled' && (
                            <Select value={order.status} onValueChange={(value) => handleStatusChange(order.id, value)}>
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="planned">Planned</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="paused">Paused</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          {isAdmin && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteClick(order.id)}
                              className="text-red-600 hover:text-red-700"
                              data-testid={`button-delete-order-${order.id}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="space-y-2">
                          <Package className="mx-auto h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            No work orders found. Create your first work order to get started.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Create Work Order Dialog */}
        <Dialog open={isAddingOrder} onOpenChange={setIsAddingOrder}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Work Order</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddOrder} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={orderForm.title}
                    onChange={(e) => setOrderForm({ ...orderForm, title: e.target.value })}
                    placeholder="Work order title"
                    required
                    data-testid="input-work-order-title"
                  />
                </div>
                <div>
                  <Label htmlFor="project">Project *</Label>
                  <Select
                    value={orderForm.projectId}
                    onValueChange={(value) => setOrderForm({ ...orderForm, projectId: value })}
                  >
                    <SelectTrigger data-testid="select-project">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(projects) && projects.map((project: any) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name} ({project.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={orderForm.priority}
                    onValueChange={(value) => setOrderForm({ ...orderForm, priority: value })}
                  >
                    <SelectTrigger data-testid="select-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="orderType">Order Type</Label>
                  <Select
                    value={orderForm.orderType}
                    onValueChange={(value) => setOrderForm({ ...orderForm, orderType: value })}
                  >
                    <SelectTrigger data-testid="select-order-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="rush">Rush</SelectItem>
                      <SelectItem value="prototype">Prototype</SelectItem>
                      <SelectItem value="repair">Repair</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={orderForm.description}
                  onChange={(e) => setOrderForm({ ...orderForm, description: e.target.value })}
                  placeholder="Detailed description of the work order"
                  rows={3}
                  data-testid="textarea-description"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="estimatedStartDate">Estimated Start Date</Label>
                  <Input
                    id="estimatedStartDate"
                    type="date"
                    value={orderForm.estimatedStartDate}
                    onChange={(e) => setOrderForm({ ...orderForm, estimatedStartDate: e.target.value })}
                    data-testid="input-start-date"
                  />
                </div>
                <div>
                  <Label htmlFor="estimatedEndDate">Estimated End Date</Label>
                  <Input
                    id="estimatedEndDate"
                    type="date"
                    value={orderForm.estimatedEndDate}
                    onChange={(e) => setOrderForm({ ...orderForm, estimatedEndDate: e.target.value })}
                    data-testid="input-end-date"
                  />
                </div>
                <div>
                  <Label htmlFor="estimatedHours">Estimated Hours</Label>
                  <Input
                    id="estimatedHours"
                    type="number"
                    step="0.5"
                    value={orderForm.estimatedHours}
                    onChange={(e) => setOrderForm({ ...orderForm, estimatedHours: e.target.value })}
                    placeholder="Hours"
                    data-testid="input-estimated-hours"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="specialInstructions">Special Instructions</Label>
                <Textarea
                  id="specialInstructions"
                  value={orderForm.specialInstructions}
                  onChange={(e) => setOrderForm({ ...orderForm, specialInstructions: e.target.value })}
                  placeholder="Special instructions or requirements"
                  rows={2}
                  data-testid="textarea-special-instructions"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddingOrder(false)}
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addOrderMutation.isPending}
                  data-testid="button-submit-create"
                >
                  {addOrderMutation.isPending ? "Creating..." : "Create Work Order"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Work Order Dialog */}
        <Dialog open={isEditingOrder} onOpenChange={setIsEditingOrder}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Work Order</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditOrder} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editTitle">Title *</Label>
                  <Input
                    id="editTitle"
                    value={editOrderForm.title}
                    onChange={(e) => setEditOrderForm({ ...editOrderForm, title: e.target.value })}
                    placeholder="Work order title"
                    required
                    data-testid="input-edit-title"
                  />
                </div>
                <div>
                  <Label htmlFor="editProject">Project *</Label>
                  <Select
                    value={editOrderForm.projectId}
                    onValueChange={(value) => setEditOrderForm({ ...editOrderForm, projectId: value })}
                  >
                    <SelectTrigger data-testid="select-edit-project">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(projects) && projects.map((project: any) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name} ({project.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editPriority">Priority</Label>
                  <Select
                    value={editOrderForm.priority}
                    onValueChange={(value) => setEditOrderForm({ ...editOrderForm, priority: value })}
                  >
                    <SelectTrigger data-testid="select-edit-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="editOrderType">Order Type</Label>
                  <Select
                    value={editOrderForm.orderType}
                    onValueChange={(value) => setEditOrderForm({ ...editOrderForm, orderType: value })}
                  >
                    <SelectTrigger data-testid="select-edit-order-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="rush">Rush</SelectItem>
                      <SelectItem value="prototype">Prototype</SelectItem>
                      <SelectItem value="repair">Repair</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="editDescription">Description</Label>
                <Textarea
                  id="editDescription"
                  value={editOrderForm.description}
                  onChange={(e) => setEditOrderForm({ ...editOrderForm, description: e.target.value })}
                  placeholder="Detailed description of the work order"
                  rows={3}
                  data-testid="textarea-edit-description"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditingOrder(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateOrderMutation.isPending}
                  data-testid="button-submit-edit"
                >
                  {updateOrderMutation.isPending ? "Updating..." : "Update Work Order"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
    </ResponsiveLayout>
  );
}