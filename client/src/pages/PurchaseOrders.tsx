import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Plus, Send, Package, FileText, Eye, CheckCircle, XCircle, Clock, AlertTriangle, Download, Edit, Trash2, MessageCircle, MoreVertical } from "lucide-react";
import { Autocomplete } from "@/components/ui/autocomplete";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";
import type { PurchaseOrderWithDetails, Supplier, Product } from "@shared/schema";
import { useIsMobile } from "@/components/Mobile/MobileOptimizer";
import MobileTable from "@/components/Mobile/MobileTable";
// @ts-ignore
import html2pdf from "html2pdf.js";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

export default function PurchaseOrders() {
  const [selectedTab, setSelectedTab] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrderWithDetails | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  // Fetch purchase orders
  const { data: pos = [], isLoading: posLoading } = useQuery<PurchaseOrderWithDetails[]>({
    queryKey: ["/api/purchase-orders", selectedTab],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedTab !== "all") {
        params.append("status", selectedTab);
      }
      return apiRequest(`/api/purchase-orders?${params}`);
    },
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
    refetchOnWindowFocus: false,
  });

  // Fetch suppliers for dropdown
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  // Auto-generate PO mutation
  const autoGenerateMutation = useMutation({
    mutationFn: () => apiRequest("/api/purchase-orders/auto-generate", {
      method: "POST",
    }),
    onSuccess: (data) => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      }, 100);
      toast({
        title: "Auto POs Generated",
        description: data.message,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate auto purchase orders",
        variant: "destructive",
      });
    },
  });

  // Send PO mutation
  const sendPOMutation = useMutation({
    mutationFn: (poId: number) => 
      apiRequest(`/api/purchase-orders/${poId}/send`, { 
        method: "POST",
      }),
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      }, 100);
      toast({
        title: "Success",
        description: "Purchase order sent successfully",
      });
    },
  });

  // Cancel PO mutation
  const cancelPOMutation = useMutation({
    mutationFn: (poId: number) => 
      apiRequest(`/api/purchase-orders/${poId}/cancel`, { 
        method: "POST",
      }),
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      }, 100);
      toast({
        title: "Success",
        description: "Purchase order cancelled",
      });
    },
  });

  // Delete PO mutation
  const deletePOMutation = useMutation({
    mutationFn: (poId: number) => 
      apiRequest(`/api/purchase-orders/${poId}`, { 
        method: "DELETE",
      }),
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
        queryClient.invalidateQueries({ queryKey: ["/api/inventory/movements"] });
        queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      }, 100);
      setShowDeleteDialog(false);
      setSelectedPO(null);
      toast({
        title: "Success",
        description: "Purchase order deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete purchase order",
        variant: "destructive",
      });
    },
  });

  // PDF Export Function
  const handleExportPDF = async (po: PurchaseOrderWithDetails) => {
    try {
      const response = await apiRequest(`/api/purchase-orders/${po.id}/pdf`);
      
      const opt = {
        margin: 1,
        filename: response.filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          allowTaint: true,
          letterRendering: true
        },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };

      html2pdf().set(opt).from(response.html).save();
      
      toast({
        title: "Success",
        description: "PDF generated successfully",
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  // WhatsApp Share Function
  const handleShareWhatsApp = async (po: PurchaseOrderWithDetails) => {
    try {
      const response = await apiRequest(`/api/purchase-orders/${po.id}/pdf`);
      
      const opt = {
        margin: 1,
        filename: response.filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          allowTaint: true,
          letterRendering: true
        },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };

      // Generate PDF blob instead of downloading
      const pdfBlob = await html2pdf().set(opt).from(response.html).outputPdf('blob');
      
      // Create a temporary URL for the PDF
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      // Create WhatsApp message
      const message = `Purchase Order ${po.poNumber} from Furnili\nSupplier: ${po.supplier?.name}\nTotal: ₹${po.totalAmount.toLocaleString()}\n\nPDF: ${pdfUrl}`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      
      // Open WhatsApp
      window.open(whatsappUrl, '_blank');
      
      toast({
        title: "Success",
        description: "WhatsApp opened with purchase order details",
      });
    } catch (error) {
      console.error("WhatsApp share error:", error);
      toast({
        title: "Error",
        description: "Failed to share via WhatsApp",
        variant: "destructive",
      });
    }
  };

  // Edit PO handler
  const handleEdit = (po: PurchaseOrderWithDetails) => {
    setSelectedPO(po);
    setShowEditModal(true);
  };

  // Delete PO handler
  const handleDelete = (po: PurchaseOrderWithDetails) => {
    setSelectedPO(po);
    setShowDeleteDialog(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'received': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <FileText className="h-3 w-3" />;
      case 'sent': return <Send className="h-3 w-3" />;
      case 'received': return <CheckCircle className="h-3 w-3" />;
      case 'cancelled': return <XCircle className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const canSendPO = (po: PurchaseOrderWithDetails) => {
    return po.status === 'draft';
  };

  const canReceivePO = (po: PurchaseOrderWithDetails) => {
    return po.status === 'sent';
  };

  const canCancelPO = (po: PurchaseOrderWithDetails) => {
    return po.status === 'draft' || po.status === 'sent';
  };

  return (
    <ResponsiveLayout 
      title="Purchase Orders" 
      subtitle="Manage your purchase orders and suppliers"
      actions={
        <div className="flex gap-2">
          <Button
            onClick={() => autoGenerateMutation.mutate()}
            disabled={autoGenerateMutation.isPending}
            variant="outline"
            size="sm"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            {autoGenerateMutation.isPending ? "Generating..." : "Auto Generate"}
          </Button>
          
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Create PO
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[85vw] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Purchase Order</DialogTitle>
                <DialogDescription>
                  Create a new purchase order for your suppliers
                </DialogDescription>
              </DialogHeader>
              <CreatePOForm 
                suppliers={suppliers}
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => {
                  setShowCreateModal(false);
                  setTimeout(() => {
                    queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
                  }, 100);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        {/* Mobile Tab Selector */}
        <div className="block md:hidden mb-4">
          <Select value={selectedTab} onValueChange={setSelectedTab}>
            <SelectTrigger className="w-full h-10 bg-white border-2 border-furnili-brown/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Desktop Tabs */}
        <div className="hidden md:block">
          <TabsList className="grid w-full grid-cols-5 bg-furnili-brown/5">
            <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:text-furnili-brown">All</TabsTrigger>
            <TabsTrigger value="draft" className="data-[state=active]:bg-white data-[state=active]:text-furnili-brown">Draft</TabsTrigger>
            <TabsTrigger value="sent" className="data-[state=active]:bg-white data-[state=active]:text-furnili-brown">Sent</TabsTrigger>
            <TabsTrigger value="received" className="data-[state=active]:bg-white data-[state=active]:text-furnili-brown">Received</TabsTrigger>
            <TabsTrigger value="cancelled" className="data-[state=active]:bg-white data-[state=active]:text-furnili-brown">Cancelled</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={selectedTab} className="mt-4">
          {posLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(28,100%,25%)]" />
            </div>
          ) : pos.length === 0 ? (
            <Card className="p-8 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No purchase orders</h3>
              <p className="text-gray-500 mb-4">
                {selectedTab === "all" 
                  ? "Get started by creating your first purchase order"
                  : `No ${selectedTab} purchase orders found`
                }
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create PO
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pos.map((po: PurchaseOrderWithDetails) => (
                <Card key={po.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-[hsl(28,100%,25%)]">{po.poNumber}</h3>
                          <Badge className={`${getStatusColor(po.status)} flex items-center space-x-1`}>
                            {getStatusIcon(po.status)}
                            <span className="capitalize">{po.status}</span>
                          </Badge>
                          {po.autoGenerated && (
                            <Badge variant="outline" className="text-xs">
                              Auto-generated
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          Supplier: {po.supplier?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Created: {po.createdAt ? format(new Date(po.createdAt), 'MMM d, yyyy') : 'N/A'} | 
                          Items: {po.items?.length || 0} | 
                          Total: ₹{(po.totalAmount || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* Main Action Buttons */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportPDF(po)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        PDF
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShareWhatsApp(po)}
                        className="text-green-600 hover:text-green-700 border-green-200 hover:border-green-300"
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        WhatsApp
                      </Button>
                      
                      {canSendPO(po) && (
                        <Button
                          size="sm"
                          onClick={() => sendPOMutation.mutate(po.id)}
                          disabled={sendPOMutation.isPending}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Send
                        </Button>
                      )}
                      
                      {canReceivePO(po) && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedPO(po);
                            setShowReceiveModal(true);
                          }}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Package className="h-4 w-4 mr-1" />
                          Receive
                        </Button>
                      )}

                      {/* More Actions Dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedPO(po);
                              // Open view modal - to be implemented
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleEdit(po)}
                            disabled={po.status === 'received' || po.status === 'cancelled'}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {canCancelPO(po) && (
                            <DropdownMenuItem
                              onClick={() => {
                                if (confirm(`Are you sure you want to cancel PO ${po.poNumber}?`)) {
                                  cancelPOMutation.mutate(po.id);
                                }
                              }}
                              className="text-orange-600 hover:text-orange-700"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDelete(po)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {po.items && po.items.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="grid gap-2">
                        {po.items.slice(0, 3).map((item, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              {item.description} (Qty: {item.qty})
                            </span>
                            <span className="font-medium">₹{(item.qty * item.unitPrice).toLocaleString()}</span>
                          </div>
                        ))}
                        {po.items.length > 3 && (
                          <div className="text-xs text-gray-500">
                            ... and {po.items.length - 3} more items
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Receive PO Modal */}
      {showReceiveModal && selectedPO && (
        <Dialog open={showReceiveModal} onOpenChange={setShowReceiveModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Receive Purchase Order</DialogTitle>
              <DialogDescription>
                Record the received quantities for PO {selectedPO.poNumber}
              </DialogDescription>
            </DialogHeader>
            <ReceivePOForm 
              po={selectedPO}
              onClose={() => {
                setShowReceiveModal(false);
                setSelectedPO(null);
              }}
              onSuccess={() => {
                setShowReceiveModal(false);
                setSelectedPO(null);
                setTimeout(() => {
                  queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/inventory/movements"] });
                  queryClient.invalidateQueries({ queryKey: ["/api/products"] });
                }, 100);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Edit PO Modal */}
      {showEditModal && selectedPO && (
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-[85vw] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Purchase Order</DialogTitle>
              <DialogDescription>
                Edit purchase order {selectedPO.poNumber}
              </DialogDescription>
            </DialogHeader>
            <EditPOForm 
              po={selectedPO}
              suppliers={suppliers}
              onClose={() => {
                setShowEditModal(false);
                setSelectedPO(null);
              }}
              onSuccess={() => {
                setShowEditModal(false);
                setSelectedPO(null);
                setTimeout(() => {
                  queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
                }, 100);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purchase Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete purchase order {selectedPO?.poNumber}? This action cannot be undone.
              <br />
              <br />
              <span className="font-medium text-red-600">
                This will permanently remove the purchase order and all its items.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedPO(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedPO && deletePOMutation.mutate(selectedPO.id)}
              disabled={deletePOMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deletePOMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </ResponsiveLayout>
  );
}

// Create PO Form Component
function CreatePOForm({ suppliers, onClose, onSuccess }: {
  suppliers: Supplier[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedSupplier, setSelectedSupplier] = useState<number | null>(null);
  const [suggestedSuppliers, setSuggestedSuppliers] = useState<Supplier[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [items, setItems] = useState<Array<{
    productId: number;
    description: string;
    qty: number;
    unitPrice: number;
    sku?: string;
    brand?: string;
    size?: string;
    thickness?: string;
    category?: string;
  }>>([]);
  const [notes, setNotes] = useState("");
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const { toast } = useToast();
  
  // Fetch supplier products when supplier is selected
  const { data: supplierProducts = [] } = useQuery({
    queryKey: ["/api/suppliers", selectedSupplier, "products"],
    queryFn: () => 
      apiRequest(`/api/suppliers/${selectedSupplier}/products`),
    enabled: !!selectedSupplier,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  // Search products for autocomplete
  const { data: productSearchResults = [] } = useQuery({
    queryKey: ["/api/products/search", productSearchQuery],
    queryFn: () => 
      apiRequest(`/api/products/search?query=${encodeURIComponent(productSearchQuery)}`),
    enabled: productSearchQuery.length > 0,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  // Auto-populate supplier products when supplier is selected
  const autoPopulateSupplierProducts = () => {
    if (supplierProducts.length > 0) {
      const newItems = supplierProducts.map((sp: any) => ({
        productId: sp.product.id,
        description: sp.product.name,
        qty: 1,
        unitPrice: sp.unitPrice || sp.product.pricePerUnit || 0, // Use relationship price or product price
        sku: sp.product.sku || "",
        brand: sp.product.brand || "",
        size: sp.product.size || "",
        thickness: sp.product.thickness || "",
        category: sp.product.category || ""
      }));
      setItems(newItems);
      toast({
        title: "Products Auto-Populated",
        description: `${supplierProducts.length} products loaded from supplier catalog`,
      });
    }
  };

  // Function to get supplier suggestions when products are selected
  const getSuggestedSuppliers = async () => {
    const productIds = items.filter(item => item.productId > 0).map(item => item.productId);
    
    if (productIds.length === 0) {
      setSuggestedSuppliers([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const suggestions = await apiRequest("/api/products/suggest-suppliers", {
        method: "POST",
        body: JSON.stringify({ productIds })
      });

      // Collect all unique suppliers from suggestions
      const allSuggestedSuppliers = new Map<number, Supplier>();
      
      suggestions.forEach((suggestion: any) => {
        suggestion.suppliers.forEach((supplier: Supplier) => {
          allSuggestedSuppliers.set(supplier.id, supplier);
        });
      });

      const uniqueSuppliers = Array.from(allSuggestedSuppliers.values());
      setSuggestedSuppliers(uniqueSuppliers);
      setShowSuggestions(uniqueSuppliers.length > 0);
    } catch (error) {
      console.error("Failed to get supplier suggestions:", error);
    }
  };

  const createPOMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest("/api/purchase-orders", { 
        method: "POST",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Purchase order created successfully",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create purchase order",
        variant: "destructive",
      });
    },
  });

  const addItem = () => {
    setItems([...items, {
      productId: 0,
      description: "",
      qty: 1,
      unitPrice: 0,
      sku: "",
      brand: "",
      size: "",
      thickness: "",
      category: ""
    }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updatedItems = items.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    );
    setItems(updatedItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedSupplier) {
      toast({
        title: "Error",
        description: "Please select a supplier",
        variant: "destructive",
      });
      return;
    }
    
    if (items.length === 0) {
      toast({
        title: "Error", 
        description: "Please add at least one item",
        variant: "destructive",
      });
      return;
    }

    const totalAmount = items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
    
    createPOMutation.mutate({
      supplierId: selectedSupplier,
      notes,
      items: items.map(item => ({
        productId: item.productId || null,
        sku: item.sku || "",
        description: item.description,
        qty: item.qty,
        unitPrice: item.unitPrice
      }))
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Header section matching Material Request layout */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs font-medium">Supplier *</Label>
          <Select 
            value={selectedSupplier?.toString() || ""} 
            onValueChange={(value) => {
              const supplierId = parseInt(value);
              setSelectedSupplier(supplierId);
              // Clear existing items when switching suppliers
              setItems([]);
              // Reset suggestions
              setSuggestedSuppliers([]);
              setShowSuggestions(false);
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select supplier" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id.toString()}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-1">
          <Label className="text-xs font-medium">Contact</Label>
          <Input
            className="h-8 text-xs bg-gray-50"
            value={selectedSupplier ? suppliers.find(s => s.id === selectedSupplier)?.contactPerson || "Auto-filled from supplier" : ""}
            disabled
            placeholder="Auto-filled from supplier"
          />
        </div>
        
        <div className="space-y-1">
          <Label className="text-xs font-medium">Status</Label>
          <Input
            className="h-8 text-xs bg-gray-50"
            value="Draft"
            disabled
          />
        </div>
      </div>

      {/* Auto-populate button when supplier is selected and has products */}
      {selectedSupplier && supplierProducts.length > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={autoPopulateSupplierProducts}
          className="w-full h-8 text-xs"
        >
          Auto-Populate {supplierProducts.length} Products
        </Button>
      )}

      {/* Items Table with Material Request Layout */}
      <div className="border rounded-lg overflow-x-auto">
        <div className="min-w-[1000px]">
          {/* Table Header */}
          <div className="flex gap-3 p-3 bg-gray-50 border-b text-xs font-medium text-gray-700">
            <div className="w-12 flex-shrink-0 text-center">#</div>
            <div className="w-36 flex-shrink-0">Category</div>
            <div className="w-36 flex-shrink-0">Brand</div>
            <div className="w-64 flex-shrink-0">Product</div>
            <div className="w-24 flex-shrink-0">Size</div>
            <div className="w-20 flex-shrink-0">Thk.</div>
            <div className="w-20 flex-shrink-0">Qty</div>
            <div className="w-32 flex-shrink-0">Price</div>
            <div className="w-20 flex-shrink-0 text-center">Action</div>
          </div>
        
          {/* Table Body */}
          {items.map((item, index) => (
            <div key={index} className="flex gap-3 p-3 border-b last:border-b-0 text-xs">
              <div className="w-12 flex-shrink-0 flex items-center justify-center font-medium">
                {index + 1}
              </div>
              
              <div className="w-36 flex-shrink-0">
                <Select 
                  value={item.category || ""} 
                  onValueChange={(value) => updateItem(index, 'category', value)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plywood">Plywood</SelectItem>
                    <SelectItem value="laminate">Laminate</SelectItem>
                    <SelectItem value="hardware">Hardware</SelectItem>
                    <SelectItem value="adhesives">Adhesives</SelectItem>
                    <SelectItem value="boards">Boards</SelectItem>
                    <SelectItem value="veneers">Veneers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="w-36 flex-shrink-0">
                <Select 
                  value={item.brand || ""} 
                  onValueChange={(value) => updateItem(index, 'brand', value)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select brand..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="century">Century</SelectItem>
                    <SelectItem value="greenply">Greenply</SelectItem>
                    <SelectItem value="hettich">Hettich</SelectItem>
                    <SelectItem value="godrej">Godrej</SelectItem>
                    <SelectItem value="fevicol">Fevicol</SelectItem>
                    <SelectItem value="asian paints">Asian Paints</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="w-64 flex-shrink-0">
                <Autocomplete
                  value={item.description}
                  onChange={(value) => updateItem(index, 'description', value)}
                  onSelect={(option: any) => {
                    // Batch all updates in a single state update to prevent infinite loops
                    const updatedItems = items.map((item, i) => 
                      i === index ? {
                        ...item,
                        productId: option.id,
                        description: option.name,
                        sku: option.sku || "",
                        unitPrice: option.pricePerUnit || 0,
                        category: option.category || "",
                        brand: option.brand || "",
                        size: option.size || "",
                        thickness: option.thickness || ""
                      } : item
                    );
                    setItems(updatedItems);
                  }}
                  options={productSearchResults}
                  placeholder="Select..."
                  className="h-8 text-xs"
                />
              </div>
              
              <div className="w-24 flex-shrink-0">
                <Input
                  value={item.size || ""}
                  onChange={(e) => updateItem(index, 'size', e.target.value)}
                  className="h-8 text-xs"
                  placeholder=""
                />
              </div>
              
              <div className="w-20 flex-shrink-0">
                <Input
                  value={item.thickness || ""}
                  onChange={(e) => updateItem(index, 'thickness', e.target.value)}
                  className="h-8 text-xs"
                  placeholder=""
                />
              </div>
              
              <div className="w-20 flex-shrink-0">
                <Input
                  type="number"
                  value={item.qty}
                  onChange={(e) => updateItem(index, 'qty', parseInt(e.target.value) || 0)}
                  className="h-8 text-xs"
                  min="1"
                  required
                />
              </div>
              
              <div className="w-32 flex-shrink-0">
                <Input
                  type="text"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                  className="h-8 text-xs"
                  placeholder="0.00"
                />
              </div>
              
              <div className="w-20 flex-shrink-0 flex items-center justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(index)}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {/* Add Item Row */}
          <div className="p-3 border-t bg-gray-50">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              className="h-8 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Item
            </Button>
          </div>
        </div>
      </div>
      
      {items.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No items added. Click "Add Item" to get started.
        </div>
      )}

      {items.length > 0 && (
        <div className="flex justify-end pt-4 border-t">
          <div className="text-right">
            <div className="text-lg font-semibold text-[hsl(28,100%,25%)]">
              Total: ₹{items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Remarks section - moved below products table */}
      <div className="space-y-1">
        <Label className="text-xs font-medium">Remarks:</Label>
        <textarea
          className="w-full h-16 px-3 py-2 text-xs border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-[hsl(28,100%,25%)] focus:border-transparent"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional notes or requirements..."
        />
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={createPOMutation.isPending}>
          {createPOMutation.isPending ? "Creating..." : "Create Purchase Order"}
        </Button>
      </div>
    </form>
  );
}

// Edit PO Form Component
function EditPOForm({ po, suppliers, onClose, onSuccess }: {
  po: PurchaseOrderWithDetails;
  suppliers: Supplier[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedSupplier, setSelectedSupplier] = useState<number | null>(po.supplierId);
  const [items, setItems] = useState<Array<{
    productId?: number;
    description: string;
    qty: number;
    unitPrice: number;
    sku?: string;
    brand?: string;
    size?: string;
    thickness?: string;
    category?: string;
  }>>(po.items?.map(item => ({
    productId: item.productId,
    description: item.description,
    qty: item.qty,
    unitPrice: item.unitPrice,
    sku: item.sku || undefined,
    brand: item.product?.brand || undefined,
    size: item.product?.size || undefined,
    thickness: item.product?.thickness || undefined,
    category: item.product?.category || undefined,
  })) || []);
  const [notes, setNotes] = useState(po.notes || "");
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const { toast } = useToast();

  // Search products for autocomplete
  const { data: productSearchResults = [] } = useQuery({
    queryKey: ["/api/products/search", productSearchQuery],
    queryFn: () => 
      apiRequest(`/api/products/search?query=${encodeURIComponent(productSearchQuery)}`),
    enabled: productSearchQuery.length > 0,
  });

  // Update PO mutation
  const updatePOMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest(`/api/purchase-orders/${po.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" }
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Purchase order updated successfully",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update purchase order",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item",
        variant: "destructive",
      });
      return;
    }

    if (!selectedSupplier) {
      toast({
        title: "Error", 
        description: "Please select a supplier",
        variant: "destructive",
      });
      return;
    }

    updatePOMutation.mutate({
      supplierId: selectedSupplier,
      notes,
      items,
    });
  };

  // Same item management functions as CreatePOForm
  const addItem = () => {
    setItems(prev => [...prev, {
      description: "",
      qty: 1,
      unitPrice: 0,
      sku: "",
      brand: "",
      size: "",
      thickness: "",
      category: "",
    }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3">
        <div>
          <Label className="text-xs font-medium">Supplier *</Label>
          <Select
            value={selectedSupplier?.toString() || ""}
            onValueChange={(value) => setSelectedSupplier(parseInt(value))}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select supplier..." />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id.toString()}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Items Table - Same structure as CreatePOForm but smaller for editing */}
      <div className="space-y-1">
        <Label className="text-xs font-medium">Items *</Label>
        <div className="border rounded-md overflow-hidden">
          {/* Table Headers */}
          <div className="grid grid-cols-[120px,120px,2fr,1fr,1fr,80px,120px,60px] gap-2 p-2 bg-gray-50 text-xs font-medium text-gray-700 border-b">
            <div>Category</div>
            <div>Brand</div>
            <div>Description *</div>
            <div>Size</div>
            <div>Thickness</div>
            <div>Qty *</div>
            <div>Unit Price *</div>
            <div></div>
          </div>
          
          {/* Item Rows */}
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-[120px,120px,2fr,1fr,1fr,80px,120px,60px] gap-2 p-2 border-b last:border-b-0 bg-white">
              <div>
                <Select 
                  value={item.category || ""} 
                  onValueChange={(value) => updateItem(index, 'category', value)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plywood">Plywood</SelectItem>
                    <SelectItem value="laminate">Laminate</SelectItem>
                    <SelectItem value="hardware">Hardware</SelectItem>
                    <SelectItem value="adhesives">Adhesives</SelectItem>
                    <SelectItem value="boards">Boards</SelectItem>
                    <SelectItem value="veneers">Veneers</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Select 
                  value={item.brand || ""} 
                  onValueChange={(value) => updateItem(index, 'brand', value)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="century">Century</SelectItem>
                    <SelectItem value="greenply">Greenply</SelectItem>
                    <SelectItem value="hettich">Hettich</SelectItem>
                    <SelectItem value="godrej">Godrej</SelectItem>
                    <SelectItem value="fevicol">Fevicol</SelectItem>
                    <SelectItem value="asian paints">Asian Paints</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Input
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                  className="h-8 text-xs"
                  placeholder="Product description"
                  required
                />
              </div>
              
              <div>
                <Input
                  value={item.size || ""}
                  onChange={(e) => updateItem(index, 'size', e.target.value)}
                  className="h-8 text-xs"
                  placeholder=""
                />
              </div>
              
              <div>
                <Input
                  value={item.thickness || ""}
                  onChange={(e) => updateItem(index, 'thickness', e.target.value)}
                  className="h-8 text-xs"
                  placeholder=""
                />
              </div>
              
              <div>
                <Input
                  type="number"
                  value={item.qty}
                  onChange={(e) => updateItem(index, 'qty', parseInt(e.target.value) || 0)}
                  className="h-8 text-xs"
                  min="1"
                  required
                />
              </div>
              
              <div>
                <Input
                  type="text"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                  className="h-8 text-xs"
                  placeholder="0.00"
                />
              </div>
              
              <div className="flex items-center justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeItem(index)}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {/* Add Item Row */}
          <div className="p-3 border-t bg-gray-50">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              className="h-8 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Item
            </Button>
          </div>
        </div>
      </div>
      
      {items.length > 0 && (
        <div className="flex justify-end">
          <div className="text-right">
            <div className="text-lg font-semibold text-[hsl(28,100%,25%)]">
              Total: ₹{items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {/* Remarks section */}
      <div className="space-y-1">
        <Label className="text-xs font-medium">Remarks:</Label>
        <textarea
          className="w-full h-16 px-3 py-2 text-xs border border-gray-300 rounded-md resize-none focus:ring-2 focus:ring-[hsl(28,100%,25%)] focus:border-transparent"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Additional notes or special instructions..."
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={updatePOMutation.isPending || items.length === 0}
          className="bg-[hsl(28,100%,25%)] hover:bg-[hsl(28,100%,20%)]"
        >
          {updatePOMutation.isPending ? "Updating..." : "Update Purchase Order"}
        </Button>
      </div>
    </form>
  );
}

// Receive PO Form Component
function ReceivePOForm({ po, onClose, onSuccess }: {
  po: PurchaseOrderWithDetails;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [receivedItems, setReceivedItems] = useState(
    po.items?.map(item => ({
      id: item.id,
      receivedQty: item.receivedQty || 0
    })) || []
  );
  const { toast } = useToast();

  const receivePOMutation = useMutation({
    mutationFn: (data: any) => 
      apiRequest(`/api/purchase-orders/${po.id}/receive`, { 
        method: "POST",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Purchase order received successfully",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to receive purchase order",
        variant: "destructive",
      });
    },
  });

  const updateReceivedQty = (itemId: number, qty: number) => {
    setReceivedItems(items => 
      items.map(item => 
        item.id === itemId ? { ...item, receivedQty: qty } : item
      )
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    receivePOMutation.mutate({ receivedItems });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        {po.items?.map((item, index) => {
          const receivedItem = receivedItems.find(r => r.id === item.id);
          return (
            <div key={item.id} className="grid grid-cols-12 gap-3 p-3 border rounded">
              <div className="col-span-5">
                <div className="font-medium text-sm">{item.description}</div>
                <div className="text-xs text-gray-500">SKU: {item.sku || 'N/A'}</div>
              </div>
              
              <div className="col-span-2 text-center">
                <div className="text-xs text-gray-500">Ordered</div>
                <div className="font-medium">{item.qty}</div>
              </div>
              
              <div className="col-span-2 text-center">
                <div className="text-xs text-gray-500">Previously Received</div>
                <div className="font-medium">{item.receivedQty || 0}</div>
              </div>
              
              <div className="col-span-3">
                <Label className="text-xs">Receiving Now</Label>
                <Input
                  type="number"
                  value={receivedItem?.receivedQty || 0}
                  onChange={(e) => updateReceivedQty(item.id, parseInt(e.target.value) || 0)}
                  className="h-8 text-xs"
                  min="0"
                  max={item.qty - (item.receivedQty || 0)}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={receivePOMutation.isPending}>
          {receivePOMutation.isPending ? "Receiving..." : "Receive Items"}
        </Button>
      </div>
    </form>
  );
}