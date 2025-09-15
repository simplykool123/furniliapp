import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Building, Phone, Mail, MapPin, Edit, Trash2, Star, Package } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";
import type { Supplier } from "@shared/schema";

const supplierFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
  paymentTerms: z.string().optional(),
  gstin: z.string().optional(),
  preferred: z.boolean().default(false),
});

type SupplierFormData = z.infer<typeof supplierFormSchema>;

export default function Suppliers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch suppliers
  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers", searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      return apiRequest(`/api/suppliers?${params}`);
    }
  });

  // Create supplier mutation
  const createSupplierMutation = useMutation({
    mutationFn: (data: SupplierFormData) => 
      apiRequest("/api/suppliers", { 
        method: "POST",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({
        title: "Success",
        description: "Supplier created successfully",
      });
      setShowCreateModal(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create supplier",
        variant: "destructive",
      });
    },
  });

  // Update supplier mutation
  const updateSupplierMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<SupplierFormData> }) => 
      apiRequest(`/api/suppliers/${id}`, { 
        method: "PUT",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({
        title: "Success",
        description: "Supplier updated successfully",
      });
      setEditingSupplier(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update supplier",
        variant: "destructive",
      });
    },
  });

  // Delete supplier mutation
  const deleteSupplierMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/suppliers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({
        title: "Success",
        description: "Supplier deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete supplier",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (supplier: Supplier) => {
    if (confirm(`Are you sure you want to delete ${supplier.name}?`)) {
      deleteSupplierMutation.mutate(supplier.id);
    }
  };

  return (
    <ResponsiveLayout 
      title="Suppliers" 
      subtitle="Manage your supplier database"
      actions={
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Supplier
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Supplier</DialogTitle>
              <DialogDescription>
                Add a new supplier to your database
              </DialogDescription>
            </DialogHeader>
            <SupplierForm 
              onSubmit={(data) => createSupplierMutation.mutate(data)}
              onCancel={() => setShowCreateModal(false)}
              isLoading={createSupplierMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      }
    >
      <div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search suppliers by name, contact person, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Suppliers List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[hsl(28,100%,25%)]" />
        </div>
      ) : suppliers.length === 0 ? (
        <Card className="p-8 text-center">
          <Building className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No suppliers found</h3>
          <p className="text-gray-500 mb-4">
            {searchQuery 
              ? "No suppliers match your search criteria"
              : "Get started by adding your first supplier"
            }
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Supplier
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((supplier) => (
            <Card key={supplier.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start space-x-2">
                  <Building className="h-5 w-5 text-[hsl(28,100%,25%)] mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-[hsl(28,100%,25%)]">{supplier.name}</h3>
                    {supplier.contactPerson && (
                      <p className="text-sm text-gray-600">{supplier.contactPerson}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {supplier.preferred && (
                    <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Preferred
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {supplier.phone && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span>{supplier.phone}</span>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span>{supplier.email}</span>
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span className="line-clamp-2">{supplier.address}</span>
                  </div>
                )}
              </div>

              {supplier.paymentTerms && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-1">Payment Terms</p>
                  <p className="text-sm">{supplier.paymentTerms}</p>
                </div>
              )}

              {supplier.gstin && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-1">GSTIN</p>
                  <p className="text-sm font-mono">{supplier.gstin}</p>
                </div>
              )}

              <div className="flex justify-between items-center">
                <ProductLinkingButton supplier={supplier} />
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingSupplier(supplier)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(supplier)}
                    className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Supplier Modal */}
      {editingSupplier && (
        <Dialog open={!!editingSupplier} onOpenChange={() => setEditingSupplier(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Supplier</DialogTitle>
              <DialogDescription>
                Update supplier information
              </DialogDescription>
            </DialogHeader>
            <SupplierForm 
              supplier={editingSupplier}
              onSubmit={(data: SupplierFormData) => updateSupplierMutation.mutate({ 
                id: editingSupplier.id, 
                data 
              })}
              onCancel={() => setEditingSupplier(null)}
              isLoading={updateSupplierMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
      </div>
    </ResponsiveLayout>
  );
}

// Supplier Form Component
function SupplierForm({ 
  supplier, 
  onSubmit, 
  onCancel, 
  isLoading 
}: {
  supplier?: Supplier;
  onSubmit: (data: SupplierFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: supplier ? {
      name: supplier.name,
      contactPerson: supplier.contactPerson || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      paymentTerms: supplier.paymentTerms || "30 days",
      gstin: supplier.gstin || "",
      preferred: supplier.preferred,
    } : {
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      paymentTerms: "30 days",
      gstin: "",
      preferred: false,
    }
  });

  const preferred = watch("preferred");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Supplier Name *</Label>
          <Input
            id="name"
            {...register("name")}
            className={errors.name ? "border-red-500" : ""}
            placeholder="e.g., ABC Trading Co."
          />
          {errors.name && (
            <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="contactPerson">Contact Person</Label>
          <Input
            id="contactPerson"
            {...register("contactPerson")}
            placeholder="e.g., John Doe"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            {...register("phone")}
            placeholder="e.g., +91 9876543210"
          />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...register("email")}
            className={errors.email ? "border-red-500" : ""}
            placeholder="e.g., contact@supplier.com"
          />
          {errors.email && (
            <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          {...register("address")}
          placeholder="Complete address with city, state, pincode"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="paymentTerms">Payment Terms</Label>
          <Input
            id="paymentTerms"
            {...register("paymentTerms")}
            placeholder="e.g., 30 days, Net 15, COD"
          />
        </div>

        <div>
          <Label htmlFor="gstin">GSTIN</Label>
          <Input
            id="gstin"
            {...register("gstin")}
            placeholder="e.g., 22AAAAA0000A1Z5"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox 
          id="preferred"
          checked={preferred}
          onCheckedChange={(checked) => setValue("preferred", !!checked)}
        />
        <Label htmlFor="preferred" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          Mark as preferred supplier
        </Label>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : supplier ? "Update Supplier" : "Create Supplier"}
        </Button>
      </div>
    </form>
  );
}

// Product Linking Component for Suppliers
function ProductLinkingButton({ supplier }: { supplier: Supplier }) {
  const [showModal, setShowModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all products
  const { data: products = [] } = useQuery({
    queryKey: ["/api/products"],
  });

  // Fetch current supplier-product relationships
  const { data: supplierProducts = [] } = useQuery({
    queryKey: ["/api/suppliers", supplier.id, "products"],
    enabled: showModal,
  });

  // Create supplier-product relationship mutation
  const linkProductMutation = useMutation({
    mutationFn: (data: { supplierId: number; productId: number; unitPrice?: number; leadTimeDays?: number; minOrderQty?: number; isPreferred?: boolean }) => 
      apiRequest("/api/supplier-products", { 
        method: "POST",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers", supplier.id, "products"] });
      toast({
        title: "Success",
        description: "Product linked to supplier successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to link product to supplier",
        variant: "destructive",
      });
    },
  });

  const handleLinkProducts = () => {
    selectedProducts.forEach(productId => {
      linkProductMutation.mutate({
        supplierId: supplier.id,
        productId,
        unitPrice: 0,
        leadTimeDays: 7,
        minOrderQty: 1,
        isPreferred: false
      });
    });
    setSelectedProducts([]);
    setShowModal(false);
  };

  const linkedProductIds = (supplierProducts as any[]).map((sp: any) => sp.productId);
  
  // Get unique brands for filtering
  const availableBrands = Array.from(new Set(
    (products as any[])
      .filter((p: any) => !linkedProductIds.includes(p.id))
      .map((p: any) => p.brand)
      .filter(Boolean)
  )).sort();

  const availableProducts = (products as any[])
    .filter((p: any) => !linkedProductIds.includes(p.id))
    .filter((p: any) => 
      searchTerm === "" || 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .filter((p: any) => 
      selectedBrand === "all" || selectedBrand === "" || p.brand === selectedBrand
    )
    .sort((a: any, b: any) => a.name.localeCompare(b.name));

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowModal(true)}
        className="flex items-center gap-1 text-xs px-2"
      >
        <Package className="h-3 w-3" />
        Link Products
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">Link Products to {supplier.name}</DialogTitle>
            <DialogDescription className="text-sm">
              Link products that this supplier can provide. This helps with automatic Purchase Order generation and supplier selection.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Current linked products */}
            {(supplierProducts as any[]).length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3 text-green-700">✓ Currently Linked Products ({(supplierProducts as any[]).length})</h4>
                <div className="flex flex-wrap gap-2">
                  {(supplierProducts as any[]).map((sp: any) => (
                    <Badge key={sp.id} variant="secondary" className="bg-green-100 text-green-800">
                      {sp.product?.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium mb-2 text-blue-800">How to Link Products:</h4>
              <ol className="text-sm text-blue-700 space-y-1">
                <li>1. Select products below that this supplier can provide</li>
                <li>2. Click "Link Selected Products" to save the relationships</li>
                <li>3. These links will be used for automatic Purchase Order generation</li>
              </ol>
            </div>

            {/* Available products to link */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <h4 className="font-medium">Select Products to Link</h4>
                  <span className="text-sm text-gray-500">({availableProducts.length} available)</span>
                  {availableProducts.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const availableProductIds = availableProducts.map((p: any) => p.id);
                        const selectedFromAvailable = selectedProducts.filter(id => availableProductIds.includes(id));
                        
                        if (selectedFromAvailable.length === availableProducts.length) {
                          // Deselect all filtered products
                          setSelectedProducts(selectedProducts.filter(id => !availableProductIds.includes(id)));
                        } else {
                          // Select all filtered products
                          const newSelected = [...selectedProducts.filter(id => !availableProductIds.includes(id)), ...availableProductIds];
                          setSelectedProducts(newSelected);
                        }
                      }}
                      className="h-7 text-xs"
                    >
                      {(() => {
                        const availableProductIds = availableProducts.map((p: any) => p.id);
                        const selectedFromAvailable = selectedProducts.filter(id => availableProductIds.includes(id));
                        return selectedFromAvailable.length === availableProducts.length ? "Deselect All" : "Select All";
                      })()}
                    </Button>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                    <SelectTrigger className="w-40 h-8 text-sm">
                      <SelectValue placeholder="Filter by Brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Brands</SelectItem>
                      {availableBrands.map((brand: string) => (
                        <SelectItem key={brand} value={brand}>
                          {brand}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-48 h-8 text-sm"
                  />
                  {(searchTerm || (selectedBrand && selectedBrand !== "all")) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchTerm("");
                        setSelectedBrand("all");
                      }}
                      className="h-8 px-2"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
              {availableProducts.length > 0 ? (
                <div className="max-h-80 overflow-y-auto border rounded-lg p-2 space-y-1">
                  {availableProducts.map((product: any) => (
                    <div key={product.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded border-l-2 border-transparent hover:border-blue-200">
                      <Checkbox
                        id={`product-${product.id}`}
                        checked={selectedProducts.includes(product.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedProducts([...selectedProducts, product.id]);
                          } else {
                            setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                          }
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <Label htmlFor={`product-${product.id}`} className="text-sm font-medium cursor-pointer block truncate">
                          {product.name}
                        </Label>
                        <div className="text-xs text-gray-500 flex flex-wrap gap-2 mt-0.5">
                          <span>{product.category}</span>
                          {product.brand && <span>• {product.brand}</span>}
                          {product.size && <span>• {product.size}</span>}
                          <span>• Stock: {product.currentStock || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? (
                    <div>
                      <p className="text-sm">No products found matching "{searchTerm}"</p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setSearchTerm("")}
                        className="text-xs"
                      >
                        Clear search to see all available products
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm">All products are already linked to this supplier</p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleLinkProducts}
              disabled={selectedProducts.length === 0 || linkProductMutation.isPending}
            >
              {linkProductMutation.isPending ? "Linking..." : `Link ${selectedProducts.length} Product${selectedProducts.length !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}