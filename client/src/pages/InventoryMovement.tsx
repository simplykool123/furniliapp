import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useIsMobile, MobileCard, MobileHeading, MobileText } from "@/components/Mobile/MobileOptimizer";
import { authenticatedApiRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpCircle, ArrowDownCircle, Package, Calendar, User, Hash, Trash2, Eye } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { authService } from "@/lib/auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";

const movementSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  type: z.enum(["in", "out"]),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  reason: z.string().min(1, "Reason is required"),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type MovementFormData = z.infer<typeof movementSchema>;

export default function InventoryMovement() {
  const [showAddMovement, setShowAddMovement] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<any>(null);
  const { isMobile } = useIsMobile();
  const [activeTab, setActiveTab] = useState("recent");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      type: "in",
      quantity: 1,
    },
  });

  // Fetch products for dropdown
  const { data: products } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      return await authenticatedApiRequest('GET', '/api/products');
    },
  });
  


  // Fetch movements
  const { data: movements, isLoading, error } = useQuery({
    queryKey: ['/api/inventory/movements'],
    queryFn: async () => {
      try {
        const data = await authenticatedApiRequest('GET', '/api/inventory/movements');
        console.log('Movements API Response:', {
          dataLength: Array.isArray(data) ? data.length : 'Not an array',
          firstItem: Array.isArray(data) && data.length > 0 ? data[0] : 'No items',
          data: data
        });
        return data;
      } catch (error: any) {
        console.error('Error fetching movements:', error);
        throw error;
      }
    },
  });

  // Create movement mutation
  const createMovementMutation = useMutation({
    mutationFn: async (data: MovementFormData) => {
      return await authenticatedApiRequest('POST', '/api/inventory/movements', data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Inventory movement recorded successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/movements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setShowAddMovement(false);
      reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record movement",
        variant: "destructive",
      });
    },
  });

  // Delete movement mutation (Admin only)
  const deleteMovementMutation = useMutation({
    mutationFn: async (movementId: number) => {
      return await authenticatedApiRequest('DELETE', `/api/inventory/movements/${movementId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Movement deleted successfully. Stock has been adjusted accordingly.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory/movements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete movement",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: MovementFormData) => {
    createMovementMutation.mutate(data);
  };

  const handleDeleteMovement = (movementId: number) => {
    deleteMovementMutation.mutate(movementId);
  };

  // Get current user to check admin access
  const currentUser = authService.getUser();
  const isAdmin = currentUser?.role === 'admin';

  const getMovementTypeIcon = (type: string) => {
    return (type === 'in' || type === 'inward') ? (
      <ArrowUpCircle className="w-4 h-4 text-green-600" />
    ) : (
      <ArrowDownCircle className="w-4 h-4 text-red-600" />
    );
  };

  const getMovementTypeBadge = (type: string) => {
    return (
      <Badge variant={(type === 'in' || type === 'inward') ? 'default' : 'destructive'}>
        {(type === 'in' || type === 'inward') ? 'Inward' : 'Outward'}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getProductName = (productId: number) => {
    const product = products?.find((p: any) => p.id === productId);
    return product ? product.name : `Product #${productId}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <ResponsiveLayout
      title="Stock Movement"
      subtitle="Track and manage stock movements"
    >
      <div className="space-y-6">
        {/* Debug Info */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded text-red-700">
            Error: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        )}
        
        {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Movements</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{movements?.length || 0}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inward Today</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {movements?.filter((m: any) => 
                (m.movementType === 'in' || m.movementType === 'inward') && 
                new Date(m.createdAt).toDateString() === new Date().toDateString()
              ).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Today's inward movements</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outward Today</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {movements?.filter((m: any) => 
                (m.movementType === 'out' || m.movementType === 'outward') && 
                new Date(m.createdAt).toDateString() === new Date().toDateString()
              ).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Today's outward movements</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Movement Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Movement History</h3>
        <Button onClick={() => setShowAddMovement(true)}>
          <Package className="w-4 h-4 mr-2" />
          Record Movement
        </Button>
      </div>

      {/* Movements Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements && movements.length > 0 ? (
                  movements.map((movement: any) => (
                    <TableRow 
                      key={movement.id} 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedMovement(movement)}
                    >
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getMovementTypeIcon(movement.movementType)}
                          {getMovementTypeBadge(movement.movementType)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {movement.productName || 'Unknown Product'}
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${
                          (movement.movementType === 'in' || movement.movementType === 'inward') ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {(movement.movementType === 'in' || movement.movementType === 'inward') ? '+' : '-'}{movement.quantity}
                        </span>
                      </TableCell>
                      <TableCell>{movement.notes || '-'}</TableCell>
                      <TableCell>{movement.reference || '-'}</TableCell>
                      <TableCell>{formatDate(movement.createdAt)}</TableCell>
                      <TableCell>{movement.performedByName || 'System'}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMovement(movement);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {isAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Movement</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this movement? This will reverse the stock change and cannot be undone.
                                    <br /><br />
                                    <strong>Product:</strong> {movement.productName}<br />
                                    <strong>Type:</strong> {movement.movementType}<br />
                                    <strong>Quantity:</strong> {movement.quantity}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteMovement(movement.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No movements recorded yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Movement Dialog */}
      <Dialog open={showAddMovement} onOpenChange={setShowAddMovement}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Inventory Movement</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="productId">Product *</Label>
              <Select 
                value={watch("productId")}
                onValueChange={(value) => setValue("productId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products?.map((product: any) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name} (Stock: {product.currentStock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.productId && (
                <p className="text-sm text-red-600 mt-1">{errors.productId.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="type">Movement Type *</Label>
              <Select 
                value={watch("type")}
                onValueChange={(value) => setValue("type", value as "in" | "out")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Inward (Stock In)</SelectItem>
                  <SelectItem value="out">Outward (Stock Out)</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-red-600 mt-1">{errors.type.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="quantity">Quantity *</Label>
              <Input 
                type="number" 
                {...register("quantity")}
                placeholder="Enter quantity"
                min="1"
              />
              {errors.quantity && (
                <p className="text-sm text-red-600 mt-1">{errors.quantity.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="reason">Reason *</Label>
              <Select 
                value={watch("reason")}
                onValueChange={(value) => setValue("reason", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {watch("type") === "in" ? (
                    <>
                      <SelectItem value="Purchase">Purchase</SelectItem>
                      <SelectItem value="Return">Return</SelectItem>
                      <SelectItem value="Transfer In">Transfer In</SelectItem>
                      <SelectItem value="Adjustment">Adjustment</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="Sale">Sale</SelectItem>
                      <SelectItem value="Issue">Issue</SelectItem>
                      <SelectItem value="Transfer Out">Transfer Out</SelectItem>
                      <SelectItem value="Damage">Damage</SelectItem>
                      <SelectItem value="Adjustment">Adjustment</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              {errors.reason && (
                <p className="text-sm text-red-600 mt-1">{errors.reason.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="reference">Reference (Optional)</Label>
              <Input 
                {...register("reference")}
                placeholder="Invoice/PO number, etc."
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input 
                {...register("notes")}
                placeholder="Additional notes"
              />
            </div>



            <div className="flex items-center justify-end space-x-4 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddMovement(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMovementMutation.isPending}>
                {createMovementMutation.isPending ? "Recording..." : "Record Movement"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Movement Details Dialog */}
      <Dialog open={!!selectedMovement} onOpenChange={() => setSelectedMovement(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg">Movement Details</DialogTitle>
          </DialogHeader>
          {selectedMovement && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  {getMovementTypeIcon(selectedMovement.movementType)}
                  {getMovementTypeBadge(selectedMovement.movementType)}
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-600">Movement ID</div>
                  <div className="font-mono text-sm">#{selectedMovement.id}</div>
                </div>
              </div>

              <div className="space-y-2">
                {/* Product, Quantity, Date in one line */}
                <div>
                  <Label className="text-xs font-medium text-gray-600">Product</Label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <div>
                      <p className="font-medium text-xs">{selectedMovement.productName || 'Unknown Product'}</p>
                    </div>
                    <div className="text-center">
                      <p className={`font-bold text-xs ${
                        (selectedMovement.movementType === 'in' || selectedMovement.movementType === 'inward') ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {(selectedMovement.movementType === 'in' || selectedMovement.movementType === 'inward') ? '+' : '-'}{selectedMovement.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs">{formatDate(selectedMovement.createdAt)}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium text-gray-600">Previous Stock</Label>
                    <p className="text-xs font-medium">{selectedMovement.previousStock || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-gray-600">New Stock</Label>
                    <p className="text-xs font-medium">{selectedMovement.newStock || 'N/A'}</p>
                  </div>
                </div>

                {/* Performed By and Reference in one line */}
                <div>
                  <Label className="text-xs font-medium text-gray-600">Performed By & Reference</Label>
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <div>
                      <p className="text-xs font-medium">{selectedMovement.performedByName || 'System'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium">{selectedMovement.reference || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Material Request Details for Outward Movements */}
                {(selectedMovement.movementType === 'out' || selectedMovement.movementType === 'outward') && 
                 (selectedMovement.clientName || selectedMovement.requestOrderNumber || selectedMovement.extractedOrderNumber || 
                  (selectedMovement.reference && selectedMovement.reference.includes('Material Request'))) && (
                  <div className="border-t pt-2">
                    <Label className="text-xs font-medium text-gray-600">Material Request Details</Label>
                    <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0 text-xs">
                      {selectedMovement.clientName && (
                        <>
                          <span className="text-gray-600">Client:</span>
                          <span className="font-semibold text-blue-700 text-right">{selectedMovement.clientName}</span>
                        </>
                      )}
                      {selectedMovement.projectName && (
                        <>
                          <span className="text-gray-600">Project:</span>
                          <span className="font-semibold text-right">{selectedMovement.projectName}</span>
                        </>
                      )}
                      {(selectedMovement.requestOrderNumber || selectedMovement.extractedOrderNumber) && (
                        <>
                          <span className="text-gray-600">Order Number:</span>
                          <span className="font-semibold text-blue-700 text-right">
                            {selectedMovement.requestOrderNumber || selectedMovement.extractedOrderNumber}
                          </span>
                        </>
                      )}
                      {selectedMovement.requestStatus && (
                        <>
                          <span className="text-gray-600">Request Status:</span>
                          <span className="text-right">
                            <span className={`inline-block font-semibold px-1 py-0.5 rounded text-xs ${
                              selectedMovement.requestStatus === 'approved' ? 'bg-green-100 text-green-700' :
                              selectedMovement.requestStatus === 'issued' ? 'bg-blue-100 text-blue-700' :
                              selectedMovement.requestStatus === 'completed' ? 'bg-gray-100 text-gray-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {selectedMovement.requestStatus?.toUpperCase()}
                            </span>
                          </span>
                        </>
                      )}
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      This stock movement is related to material request{selectedMovement.clientName ? ' for the above client' : ''}.
                    </div>
                  </div>
                )}

                {/* Enhanced Movement Context */}
                {(selectedMovement.reason || selectedMovement.materialRequestId) && (
                  <div className="border-t pt-2">
                    <Label className="text-xs font-medium text-gray-600">Movement Context</Label>
                    <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0 text-xs">
                      {selectedMovement.reason && (
                        <>
                          <span className="text-gray-600">Reason:</span>
                          <span className="font-medium text-right">{selectedMovement.reason}</span>
                        </>
                      )}
                      {selectedMovement.materialRequestId && (
                        <>
                          <span className="text-gray-600">Material Request:</span>
                          <span className="font-medium text-right">#{selectedMovement.materialRequestId}</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {selectedMovement.notes && (
                  <div className="border-t pt-2">
                    <Label className="text-xs font-medium text-gray-600">Notes</Label>
                    <div className="mt-1">
                      <p className="text-xs text-gray-700">{selectedMovement.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </ResponsiveLayout>
  );
}