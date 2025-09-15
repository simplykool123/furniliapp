import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Plus, Edit, Trash2 } from "lucide-react";

const quoteFormSchema = z.object({
  title: z.string().min(1, "Quote title is required"),
  description: z.string().optional(),
  status: z.enum(["draft", "sent", "approved", "rejected", "expired"]).default("draft"),
  paymentTerms: z.string().min(1, "Payment terms are required"),
  furnitureSpecifications: z.string().optional(),
  packingChargesType: z.enum(["percentage", "fixed"]).default("percentage"),
  packingChargesValue: z.number().min(0).default(2),
  transportationCharges: z.number().min(0).default(5000),
});

const itemFormSchema = z.object({
  itemName: z.string().min(1, "Product name is required"),
  description: z.string().min(1, "Item description is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  uom: z.string().min(1, "Unit is required"),
  unitPrice: z.number().min(0, "Unit price must be positive"),
  discountPercentage: z.number().min(0).max(100).optional(),
  taxPercentage: z.number().min(0).max(100).optional(),
  size: z.string().optional(),
  salesProductId: z.number().optional(),
});

type QuoteFormData = z.infer<typeof quoteFormSchema>;
type ItemFormData = z.infer<typeof itemFormSchema>;

interface QuoteItem extends ItemFormData {
  lineTotal: number;
}

export default function EditQuote() {
  const [location, setLocation] = useLocation();
  const [match, params] = useRoute("/projects/:projectId/quotes/:quoteId/edit");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const projectId = parseInt(params?.projectId || "0");
  const quoteId = parseInt(params?.quoteId || "0");
  
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [editingItem, setEditingItem] = useState<QuoteItem | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Get project details
  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  // Get existing quote details
  const { data: existingQuote, isLoading: isLoadingQuote } = useQuery({
    queryKey: [`/api/quotes/${quoteId}/details-fresh`],
    enabled: !!quoteId,
  });

  // Get product categories
  const { data: categories } = useQuery({
    queryKey: ["/api/sales-products/categories"],
  });

  // Get sales products for dropdown - filtered by category
  const { data: salesProducts } = useQuery({
    queryKey: [selectedCategory ? `/api/sales-products?category=${selectedCategory}` : "/api/sales-products"],
  });

  // Main quote form
  const form = useForm<QuoteFormData>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "draft",
      paymentTerms: "100% advance",
      furnitureSpecifications: "All furniture will be manufactured using Said Materials\n- All hardware considered of standard make.\n- Standard laminates considered as per selection.\n- Any modifications or changes in material selection may result in additional charges.",
      packingChargesType: "percentage",
      packingChargesValue: 2,
      transportationCharges: 5000,
    },
  });

  // Item form
  const itemForm = useForm<ItemFormData>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      itemName: "",
      description: "",
      quantity: 1,
      uom: "pcs",
      unitPrice: 0,
      discountPercentage: 0,
      taxPercentage: 18,
      size: "",
      salesProductId: undefined,
    },
  });

  // Function to convert payment terms selection to detailed format
  const getPaymentTermsText = (selectedTerm: string): string => {
    switch (selectedTerm) {
      case "100% advance":
        return "Payment Terms\n100% Advance Payment: Due upon order confirmation.";
      case "50% advance, 50% on delivery":
        return "Payment Terms\n50% Advance Payment: Due upon order confirmation.\n50% Payment on Delivery: To be settled upon installation completion.";
      case "30% advance, 70% on delivery":
        return "Payment Terms\n30% Advance Payment: Due upon order confirmation.\n50% Payment Before Delivery: To be settled prior to dispatch.\n20% Payment on Delivery";
      default:
        return "Payment Terms\n" + selectedTerm;
    }
  };

  // Parse payment terms text for display
  const getPaymentTermsLines = (paymentTermsText: string): string[] => {
    const lines = paymentTermsText.split('\n').slice(1); // Remove "Payment Terms" header
    return lines.filter(line => line.trim().length > 0);
  };

  // Effect to populate form when quote data is loaded
  useEffect(() => {
    if (existingQuote && !isLoadingQuote) {
      console.log('Loading existing quote data for editing:', existingQuote);
      
      const quote = existingQuote as any;
      
      // Populate form with existing quote data
      form.reset({
        title: quote.title || '',
        description: quote.description || '',
        status: quote.status || 'draft',
        paymentTerms: quote.paymentTerms || '100% advance',
        furnitureSpecifications: quote.furnitureSpecifications || "All furniture will be manufactured using Said Materials\n- All hardware considered of standard make.\n- Standard laminates considered as per selection.\n- Any modifications or changes in material selection may result in additional charges.",
        packingChargesType: quote.packingChargesType || 'percentage',
        packingChargesValue: quote.packingChargesValue || 2,
        transportationCharges: quote.transportationCharges || 5000,
      });
      
      // Populate quote items
      if (quote.items && Array.isArray(quote.items)) {
        console.log('Loading existing quote items:', quote.items);
        const existingItems = quote.items.map((item: any) => ({
          itemName: item.itemName || item.salesProduct?.name || '',
          description: item.description || item.salesProduct?.description || '',
          quantity: item.quantity || 1,
          uom: item.uom || 'pcs',
          unitPrice: item.unitPrice || 0,
          discountPercentage: item.discountPercentage || 0,
          taxPercentage: item.taxPercentage || 18,
          size: item.size || '',
          salesProductId: item.salesProductId || null,
          lineTotal: item.lineTotal || 0,
        }));
        setItems(existingItems);
        console.log('Existing items loaded:', existingItems);
      }
    }
  }, [existingQuote, isLoadingQuote, form]);

  // Calculate line total for an item
  const calculateLineTotal = (item: ItemFormData): number => {
    const subtotal = item.quantity * item.unitPrice;
    const discountAmount = item.discountPercentage ? (subtotal * item.discountPercentage) / 100 : 0;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = item.taxPercentage ? (afterDiscount * item.taxPercentage) / 100 : 0;
    return afterDiscount + taxAmount;
  };

  // Add or update item
  const handleAddItem = (data: ItemFormData) => {
    const lineTotal = calculateLineTotal(data);
    const newItem: QuoteItem = { ...data, lineTotal };

    if (editingIndex >= 0) {
      // Update existing item
      const updatedItems = [...items];
      updatedItems[editingIndex] = newItem;
      setItems(updatedItems);
      setEditingIndex(-1);
      setEditingItem(null);
    } else {
      // Add new item
      setItems([...items, newItem]);
    }

    // Reset form
    itemForm.reset({
      itemName: "",
      description: "",
      quantity: 1,
      uom: "pcs",
      unitPrice: 0,
      discountPercentage: 0,
      taxPercentage: 18,
      size: "",
      salesProductId: undefined,
    });
  };

  // Edit item
  const handleEditItem = (index: number) => {
    const item = items[index];
    setEditingItem(item);
    setEditingIndex(index);
    itemForm.reset(item);
  };

  // Delete item
  const handleDeleteItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const totalDiscount = items.reduce((sum, item) => {
    const itemSubtotal = item.quantity * item.unitPrice;
    return sum + (item.discountPercentage ? (itemSubtotal * item.discountPercentage) / 100 : 0);
  }, 0);
  const afterDiscount = subtotal - totalDiscount;
  const totalTax = items.reduce((sum, item) => {
    const itemSubtotal = item.quantity * item.unitPrice;
    const itemDiscount = item.discountPercentage ? (itemSubtotal * item.discountPercentage) / 100 : 0;
    const itemAfterDiscount = itemSubtotal - itemDiscount;
    return sum + (item.taxPercentage ? (itemAfterDiscount * item.taxPercentage) / 100 : 0);
  }, 0);

  const packingCharges = form.watch("packingChargesType") === "percentage" 
    ? (afterDiscount * form.watch("packingChargesValue")) / 100
    : form.watch("packingChargesValue");
  
  const transportationCharges = form.watch("transportationCharges") || 0;
  const grandTotal = afterDiscount + totalTax + packingCharges + transportationCharges;

  // Update quote mutation
  const updateQuoteMutation = useMutation({
    mutationFn: async (data: QuoteFormData) => {
      const updateData = {
        ...data,
        items: items.map(item => ({
          itemName: item.itemName,
          description: item.description,
          quantity: item.quantity,
          uom: item.uom,
          unitPrice: item.unitPrice,
          discountPercentage: item.discountPercentage || 0,
          taxPercentage: item.taxPercentage || 18,
          size: item.size || '',
          salesProductId: item.salesProductId || null,
          lineTotal: item.lineTotal,
        })),
        subtotal,
        totalDiscount,
        totalTax,
        packingCharges,
        transportationCharges,
        grandTotal,
      };

      return apiRequest(`/api/quotes/${quoteId}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Quote updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/quotes`] });
      queryClient.invalidateQueries({ queryKey: [`/api/quotes/${quoteId}/details-fresh`] });
      setLocation(`/projects/${projectId}/quotes`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update quote",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: QuoteFormData) => {
    if (items.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item to the quote",
        variant: "destructive",
      });
      return;
    }
    updateQuoteMutation.mutate(data);
  };

  if (isLoadingQuote) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }



  return (
    <div className="p-2 max-w-[98vw] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <Button
          variant="ghost"
          onClick={() => setLocation(`/projects/${projectId}/quotes`)}
          className="text-xs h-7 px-2"
        >
          <ArrowLeft className="h-3 w-3 mr-1" />
          Back
        </Button>
        <div className="text-right">
          <h1 className="text-lg font-bold">Edit Quote</h1>
          <p className="text-xs text-muted-foreground">
            {(project as any)?.name || 'Project'} - {(project as any)?.code || ''}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
          {/* Quote Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quote Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Quote Title * (Editable)</FormLabel>
                      <FormControl>
                        <Input {...field} className="h-8 text-xs" />
                      </FormControl>
                      <p className="text-xs text-gray-400">
                        Auto-generated, but you can edit it
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Quote Status *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="sent">Sent</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Payment Terms *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select payment terms" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="100% advance">100% advance</SelectItem>
                          <SelectItem value="50% advance, 50% on delivery">50% advance, 50% on delivery</SelectItem>
                          <SelectItem value="30% advance, 70% on delivery">30% advance, 70% on delivery</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Quote Items */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quote Items</CardTitle>
              <p className="text-xs text-muted-foreground">Add products</p>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {/* Add New Item Form */}
              <div className="border rounded p-2 bg-gray-50">
                <h4 className="font-medium mb-2 text-xs">Add New Item</h4>
                <div className="grid grid-cols-12 gap-2 items-end">
                  {/* Category Selection */}
                  <div className="col-span-12 md:col-span-2">
                    <label className="text-xs text-gray-600 block mb-1">Category</label>
                    <Select onValueChange={setSelectedCategory} value={selectedCategory}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {Array.isArray(categories) && categories.map((cat: any) => (
                          <SelectItem key={cat.category} value={cat.category}>
                            {cat.category} ({cat.count})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Product Selection */}
                  <div className="col-span-12 md:col-span-3">
                    <label className="text-xs text-gray-600 block mb-1">Product</label>
                    <Select
                      onValueChange={(value) => {
                        const selectedProduct = Array.isArray(salesProducts) ? salesProducts.find(
                          (p: any) => p.id.toString() === value,
                        ) : null;
                        if (selectedProduct) {
                          itemForm.setValue("salesProductId", selectedProduct.id);
                          itemForm.setValue("itemName", selectedProduct.name);
                          itemForm.setValue(
                            "description",
                            selectedProduct.description ||
                              selectedProduct.specifications ||
                              `${selectedProduct.name} - Premium quality`,
                          );
                          itemForm.setValue("unitPrice", selectedProduct.unitPrice || 0);
                          itemForm.setValue("uom", selectedProduct.unit || "pcs");
                          itemForm.setValue("size", selectedProduct.size || "");
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(salesProducts) && salesProducts.map((product: any) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            <div className="flex flex-col">
                              <span className="font-medium">{product.name}</span>
                              <span className="text-xs text-muted-foreground">₹{product.unitPrice}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Item Description */}
                  <div className="col-span-12 md:col-span-3">
                    <label className="text-xs text-gray-600 block mb-1">Item Description</label>
                    <Input
                      placeholder="Auto-filled from product"
                      className="h-8 text-xs"
                      value={itemForm.watch("description") || ""}
                      onChange={(e) => itemForm.setValue("description", e.target.value)}
                    />
                  </div>

                  {/* Size */}
                  <div className="col-span-6 md:col-span-1">
                    <label className="text-xs text-gray-600 block mb-1">Size</label>
                    <Input
                      placeholder="-"
                      className="h-8 text-xs text-center"
                      value={itemForm.watch("size") || ""}
                      onChange={(e) => itemForm.setValue("size", e.target.value)}
                    />
                  </div>

                  {/* Quantity */}
                  <div className="col-span-6 md:col-span-1">
                    <label className="text-xs text-gray-600 block mb-1">Qty</label>
                    <Input
                      type="number"
                      placeholder="1"
                      className="h-8 text-xs text-center"
                      value={itemForm.watch("quantity") || ""}
                      onChange={(e) =>
                        itemForm.setValue("quantity", parseFloat(e.target.value) || 1)
                      }
                    />
                  </div>

                  {/* Unit Price */}
                  <div className="col-span-6 md:col-span-1">
                    <label className="text-xs text-gray-600 block mb-1">Rate</label>
                    <Input
                      type="number"
                      placeholder="0"
                      className="h-8 text-xs text-center"
                      value={itemForm.watch("unitPrice") || ""}
                      onChange={(e) =>
                        itemForm.setValue("unitPrice", parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>

                  {/* Total */}
                  <div className="col-span-6 md:col-span-1">
                    <label className="text-xs text-gray-600 block mb-1">Total</label>
                    <div className="h-8 text-xs bg-gray-100 border rounded flex items-center justify-center font-medium">
                      ₹{((itemForm.watch("quantity") || 0) * (itemForm.watch("unitPrice") || 0)).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-3">
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 text-xs bg-[hsl(28,100%,25%)] hover:bg-[hsl(28,100%,20%)]"
                    onClick={() => {
                      const formData = itemForm.getValues();
                      if (formData.itemName && formData.description && formData.quantity > 0) {
                        handleAddItem(formData);
                      }
                    }}
                  >
                    {editingIndex >= 0 ? "Update" : "Add"}
                  </Button>
                </div>
              </div>

              {/* Items List */}
              {items.length > 0 && (
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div key={index} className="border rounded p-3 bg-white">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="grid grid-cols-12 gap-2 text-xs">
                            <div className="col-span-3">
                              <strong>{item.itemName}</strong>
                              {item.size && <span className="text-gray-500 ml-1">({item.size})</span>}
                            </div>
                            <div className="col-span-4">{item.description}</div>
                            <div className="col-span-1 text-center">{item.quantity}</div>
                            <div className="col-span-1 text-center">{item.uom}</div>
                            <div className="col-span-2 text-center">₹{item.unitPrice?.toLocaleString()}</div>
                            <div className="col-span-1 text-center font-medium">₹{item.lineTotal?.toLocaleString()}</div>
                          </div>
                        </div>
                        <div className="flex space-x-1 ml-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleEditItem(index)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleDeleteItem(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Layout matching CreateQuote - Left: Specs & Payment Terms, Right: Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {/* Left Side - Furniture Specifications with Payment Terms below */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Furniture Specifications</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <FormField
                  control={form.control}
                  name="furnitureSpecifications"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="text-xs h-16"
                          placeholder="Furniture specifications..."
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Payment Terms section within same card */}
                <div className="mt-3 pt-3 border-t">
                  <h4 className="font-bold text-xs mb-1">Payment Terms</h4>
                  <div className="text-xs space-y-0.5 text-gray-600">
                    {getPaymentTermsLines(getPaymentTermsText(form.watch("paymentTerms"))).map((line, index) => (
                      <div key={index}>{line}</div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right Side - Calculations (will be Quote Summary) */}
            {items.length > 0 && (
              <Card>
                <CardContent className="p-0">
                  <div className="border rounded-lg overflow-hidden">
                    {/* Items Subtotal */}
                    <div className="flex justify-between items-center p-3 bg-gray-50 border-b">
                      <span className="font-medium text-sm">Total</span>
                      <span className="font-bold text-lg">₹{subtotal.toLocaleString()}</span>
                    </div>

                    {/* Packaging Charges - Editable */}
                    <div className="flex justify-between items-center p-3 border-b bg-white">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Packaging</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs">@</span>
                          <Select
                            value={form.watch("packingChargesType")}
                            onValueChange={(value) => form.setValue("packingChargesType", value as "percentage" | "fixed")}
                          >
                            <SelectTrigger className="h-6 w-16 text-xs border-0 p-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentage">%</SelectItem>
                              <SelectItem value="fixed">₹</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            value={form.watch("packingChargesValue")}
                            onChange={(e) => form.setValue("packingChargesValue", parseFloat(e.target.value) || 0)}
                            className="h-6 w-16 text-xs border-0 p-1 text-center"
                          />
                        </div>
                      </div>
                      <span className="font-medium text-sm">₹{packingCharges.toLocaleString()}</span>
                    </div>

                    {/* Transportation - Editable */}
                    <div className="flex justify-between items-center p-3 border-b bg-white">
                      <span className="text-sm">Transportation</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs">₹</span>
                        <Input
                          type="number"
                          value={form.watch("transportationCharges")}
                          onChange={(e) => form.setValue("transportationCharges", parseFloat(e.target.value) || 0)}
                          className="h-6 w-16 text-xs border-0 p-1 text-center"
                        />
                      </div>
                    </div>

                    {/* GST */}
                    <div className="flex justify-between items-center p-3 border-b bg-white">
                      <span className="text-sm">GST @ 18%</span>
                      <span className="font-medium text-sm">₹{totalTax.toLocaleString()}</span>
                    </div>

                    {/* Grand Total */}
                    <div className="flex justify-between items-center p-3 bg-[hsl(28,100%,25%)] text-white">
                      <span className="font-bold text-sm">Grand Total</span>
                      <span className="font-bold text-lg">₹{grandTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>





          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pb-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation(`/projects/${projectId}/quotes`)}
              className="h-8 text-xs px-3"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateQuoteMutation.isPending || items.length === 0}
              className="bg-[hsl(28,100%,25%)] hover:bg-[hsl(28,100%,20%)] h-8 text-xs px-3"
            >
              {updateQuoteMutation.isPending ? "Updating..." : "Update Quote"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}