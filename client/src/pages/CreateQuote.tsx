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

export default function CreateQuote() {
  const [location, setLocation] = useLocation();
  const [match, params] = useRoute("/projects/:projectId/quotes/create");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const projectId = parseInt(params?.projectId || "0");
  
  // Check for duplicate query parameter
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const duplicateQuoteId = urlParams.get('duplicate');
  
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [editingItem, setEditingItem] = useState<QuoteItem | null>(null);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Get project details
  const { data: project } = useQuery({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId,
  });

  // Get product categories
  const { data: categories } = useQuery({
    queryKey: ["/api/sales-products/categories"],
  });

  // Get sales products for dropdown - filtered by category
  const { data: salesProducts } = useQuery({
    queryKey: [selectedCategory ? `/api/sales-products?category=${selectedCategory}` : "/api/sales-products"],
  });
  
  // Get original quote details for duplication
  const { data: originalQuote } = useQuery({
    queryKey: [`/api/quotes/${duplicateQuoteId}/details`],
    enabled: !!duplicateQuoteId,
  });
  
  console.log('CreateQuote Debug:', {
    location,
    urlParams: location.split('?')[1],
    duplicateQuoteId,
    hasOriginalQuote: !!originalQuote
  });

  // Main quote form
  const form = useForm<QuoteFormData>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      title: "",
      description: "",
      paymentTerms: "100% advance",
      furnitureSpecifications: "All furniture will be manufactured using Said Materials\n- All hardware considered of standard make.\n- Standard laminates considered as per selection.\n- Any modifications or changes in material selection may result in additional charges.",
      packingChargesType: "percentage",
      packingChargesValue: 2,
      transportationCharges: 5000,
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

  // Effect to populate form when duplicating a quote
  useEffect(() => {
    if (originalQuote && duplicateQuoteId) {
      console.log('Loading quote data for duplication:', originalQuote);
      
      const quote = originalQuote as any; // Type assertion to avoid TS errors
      
      // Populate form with original quote data
      form.reset({
        title: project ? generateQuoteTitle((project as any).name) : 'New Quote',
        description: quote.description || '',
        paymentTerms: quote.paymentTerms || '100% advance',
        furnitureSpecifications: quote.furnitureSpecifications || "All furniture will be manufactured using Said Materials\n- All hardware considered of standard make.\n- Standard laminates considered as per selection.\n- Any modifications or changes in material selection may result in additional charges.",
        packingChargesType: quote.packingChargesType || 'percentage',
        packingChargesValue: quote.packingChargesValue || 2,
        transportationCharges: quote.transportationCharges || 5000,
      });
      
      // Populate quote items
      if (quote.items && Array.isArray(quote.items)) {
        console.log('Loading quote items:', quote.items);
        const duplicatedItems = quote.items.map((item: any) => ({
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
        setItems(duplicatedItems);
        console.log('Duplicated items set:', duplicatedItems);
      } else {
        console.log('No items found in original quote');
      }
    } else {
      console.log('Missing data for duplication:', { originalQuote: !!originalQuote, duplicateQuoteId });
    }
  }, [originalQuote, duplicateQuoteId, project, form]);

  // Function to generate quote title from project name
  const generateQuoteTitle = (projectName: string): string => {
    if (!projectName) return 'Estimate for Project';
    // Use the full project name as requested by the user
    return `Estimate for ${projectName}`;
  };

  // Auto-populate quote title when project data is available
  useEffect(() => {
    if (project && !form.watch("title")) {
      const autoTitle = generateQuoteTitle((project as any)?.name || '');
      form.setValue("title", autoTitle);
    }
  }, [project, form]);

  // Get current payment terms text for display
  const currentPaymentTermsText = getPaymentTermsText(form.watch("paymentTerms"));
  
  // Parse payment terms text for display
  const getPaymentTermsLines = (paymentTermsText: string): string[] => {
    const lines = paymentTermsText.split('\n').slice(1); // Remove "Payment Terms" header
    return lines.filter(line => line.trim().length > 0);
  };

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
      salesProductId: 0,
    },
  });

  // Calculate totals
  const totals = items.reduce(
    (acc, item) => {
      const lineTotal = item.lineTotal || 0;
      const discountAmount = (lineTotal * (item.discountPercentage || 0)) / 100;
      const taxableAmount = lineTotal - discountAmount;
      const taxAmount = (taxableAmount * (item.taxPercentage || 0)) / 100;

      return {
        subtotal: acc.subtotal + lineTotal,
        totalDiscountAmount: acc.totalDiscountAmount + discountAmount,
        totalTaxAmount: acc.totalTaxAmount + taxAmount,
        total: acc.total + taxableAmount + taxAmount,
      };
    },
    { subtotal: 0, totalDiscountAmount: 0, totalTaxAmount: 0, total: 0 }
  );

  // Create quote mutation
  const createMutation = useMutation({
    mutationFn: async (data: QuoteFormData) => {
      // Calculate totals for packaging and final amounts
      const packingChargesAmount = data.packingChargesType === "percentage" 
        ? (totals.subtotal * data.packingChargesValue) / 100 
        : data.packingChargesValue;
      
      const finalTotal = totals.total + packingChargesAmount + data.transportationCharges;
      const gstAmount = (finalTotal * 18) / 100; // 18% GST
      const grandTotal = finalTotal + gstAmount;

      // Ensure we have a valid clientId - this is required
      const clientId = (project as any)?.clientId || (project as any)?.client_id;
      if (!clientId) {
        throw new Error("Client ID is required. Please ensure the project has an associated client.");
      }

      const quoteData = {
        ...data,
        projectId,
        clientId,
        subtotal: totals.subtotal,
        taxAmount: totals.totalTaxAmount + gstAmount,
        totalAmount: grandTotal,
        packingChargesAmount,
        items: items.map(item => ({
          itemName: item.itemName,
          description: item.description,
          quantity: item.quantity,
          uom: item.uom,
          unitPrice: item.unitPrice,
          discountPercentage: item.discountPercentage || 0,
          discountAmount: ((item.lineTotal || 0) * (item.discountPercentage || 0)) / 100,
          taxPercentage: item.taxPercentage || 18,
          taxAmount: (((item.lineTotal || 0) - (((item.lineTotal || 0) * (item.discountPercentage || 0)) / 100)) * (item.taxPercentage || 18)) / 100,
          lineTotal: item.lineTotal || 0,
          size: item.size || "",
          salesProductId: item.salesProductId || null,
        })),
      };
      return apiRequest(`/api/quotes`, {
        method: "POST",
        body: JSON.stringify(quoteData),
      });
    },
    onSuccess: () => {
      toast({ title: "Quote created successfully!" });
      // Invalidate both general quotes and project-specific quotes
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "quotes"] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/quotes`] });
      // Force refetch by clearing all quote-related queries
      queryClient.removeQueries({ queryKey: ["/api/projects", projectId, "quotes"] });
      setLocation(`/projects/${projectId}/quotes`);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to create quote",
        description: error.message,
      });
    },
  });

  const handleSaveItem = (data: ItemFormData) => {
    const lineTotal = data.quantity * data.unitPrice;
    const newItem: QuoteItem = { ...data, lineTotal };

    if (editingIndex >= 0) {
      const updatedItems = [...items];
      updatedItems[editingIndex] = newItem;
      setItems(updatedItems);
      setEditingIndex(-1);
    } else {
      setItems([...items, newItem]);
    }

    setEditingItem(null);
    itemForm.reset({
      itemName: "",
      description: "",
      quantity: 1,
      uom: "pcs",
      unitPrice: 0,
      discountPercentage: 0,
      taxPercentage: 18,
      size: "",
      salesProductId: 0,
    });
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const editItem = (item: QuoteItem, index: number) => {
    setEditingItem(item);
    setEditingIndex(index);
    itemForm.reset(item);
  };

  const onSubmit = (data: QuoteFormData) => {
    if (items.length === 0) {
      toast({
        variant: "destructive",
        title: "Add items to quote",
        description: "Please add at least one item to create a quote.",
      });
      return;
    }
    createMutation.mutate(data);
  };

  if (!match) return null;

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setLocation(`/projects/${projectId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Project
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {duplicateQuoteId ? 'Duplicate Quote' : 'Create New Quote'}
          </h1>
          <p className="text-muted-foreground">
            {(project as any)?.name || 'Project'} - {(project as any)?.code || ''}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Quote Details */}
          <Card>
            <CardHeader>
              <CardTitle>Quote Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Quote Title * (Editable)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className="h-8 text-xs"
                          placeholder="Auto-generated from project name"
                        />
                      </FormControl>
                      <div className="text-[10px] text-gray-500 mt-1">
                        Auto-generated, but you can edit it
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paymentTerms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">
                        Payment Terms *

                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Select payment terms" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="100% advance">100% advance</SelectItem>
                          <SelectItem value="50% advance, 50% on delivery">
                            50% advance, 50% on delivery
                          </SelectItem>
                          <SelectItem value="30% advance, 70% on delivery">
                            30% advance, 70% on delivery
                          </SelectItem>
                          <SelectItem value="Net 30">Net 30</SelectItem>
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
            <CardHeader>
              <CardTitle>Quote Items</CardTitle>
              <p className="text-xs text-muted-foreground">
                Add products matching PDF layout
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Item Form - Compact Mobile Layout */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <h4 className="text-sm font-medium">Add New Item</h4>
                
                {/* Mobile-first responsive grid */}
                <div className="grid grid-cols-12 gap-2 items-end">
                  {/* Category Selection */}
                  <div className="col-span-12 md:col-span-2">
                    <label className="text-xs text-gray-600 block mb-1">Category</label>
                    <Select
                      value={selectedCategory}
                      onValueChange={(value) => {
                        setSelectedCategory(value === "all" ? "" : value);
                        // Reset product selection when category changes
                        itemForm.setValue("salesProductId", 0);
                        itemForm.setValue("itemName", "");
                        itemForm.setValue("description", "");
                        itemForm.setValue("unitPrice", 0);
                        itemForm.setValue("uom", "pcs");
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {Array.isArray(categories) && categories.map((category: string) => (
                          <SelectItem key={category} value={category}>
                            {category}
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

                  {/* Rate */}
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

                  {/* Total Amount (Auto-calculated) */}
                  <div className="col-span-6 md:col-span-1">
                    <label className="text-xs text-gray-600 block mb-1">Total</label>
                    <div className="h-8 flex items-center justify-center text-xs font-medium text-[hsl(28,100%,25%)]">
                      ₹{((itemForm.watch("quantity") || 0) * (itemForm.watch("unitPrice") || 0)).toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Add Button */}
                  <div className="col-span-12 md:col-span-1">
                    <Button
                      type="button"
                      onClick={() => {
                        const formData = itemForm.getValues();
                        if (formData.itemName && formData.quantity && formData.unitPrice) {
                          handleSaveItem(formData);
                        }
                      }}
                      className="h-8 w-full text-xs bg-[hsl(28,100%,25%)] hover:bg-[hsl(28,100%,20%)]"
                    >
                      {editingIndex >= 0 ? "Update" : "Add"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Items List */}
              {items.length > 0 && (
                <div className="space-y-2">
                  {/* Desktop Header */}
                  <div className="hidden md:grid grid-cols-12 gap-2 bg-[hsl(28,100%,25%)] text-white p-2 rounded text-xs font-medium">
                    <div className="col-span-1 text-center">Sr. No.</div>
                    <div className="col-span-2 text-center">Product</div>
                    <div className="col-span-3 text-center">Item Description</div>
                    <div className="col-span-1 text-center">Size</div>
                    <div className="col-span-1 text-center">Qty</div>
                    <div className="col-span-1 text-center">Rate</div>
                    <div className="col-span-1 text-center">Total</div>
                    <div className="col-span-2 text-center">Action</div>
                  </div>

                  {/* Items */}
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="border rounded p-2 space-y-2 md:space-y-0"
                    >
                      {/* Mobile Card Layout */}
                      <div className="md:hidden space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="flex gap-3">
                            <div>
                              <div className="font-medium text-sm">{item.itemName}</div>
                              <div className="text-xs text-gray-600">{item.description}</div>
                              {item.size && (
                                <div className="text-xs text-gray-500">Size: {item.size}</div>
                              )}
                            </div>
                            {item.salesProductId && (
                              <img 
                                src={`/api/sales-products/${item.salesProductId}/image`}
                                alt={item.itemName}
                                className="w-12 h-9 object-contain rounded border flex-shrink-0 bg-gray-50"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => editItem(item, index)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => removeItem(index)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>Qty: {item.quantity} | Rate: ₹{item.unitPrice?.toLocaleString('en-IN')}</span>
                          <span className="font-medium text-[hsl(28,100%,25%)]">
                            ₹{item.lineTotal?.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Desktop Grid Layout */}
                      <div className="hidden md:grid grid-cols-12 gap-2 items-center text-xs">
                        <div className="col-span-1 text-center font-medium">
                          {index + 1}
                        </div>
                        <div className="col-span-2 text-center">
                          <div className="font-medium">{item.itemName}</div>
                          {item.salesProductId && (
                            <img 
                              src={`/api/sales-products/${item.salesProductId}/image`}
                              alt={item.itemName}
                              className="w-16 h-12 object-contain mx-auto mt-1 rounded border bg-gray-50"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          )}
                        </div>
                        <div className="col-span-3 text-xs">
                          {item.description}
                        </div>
                        <div className="col-span-1 text-center">
                          {item.size || "-"}
                        </div>
                        <div className="col-span-1 text-center">
                          {item.quantity}
                        </div>
                        <div className="col-span-1 text-center">
                          ₹{item.unitPrice?.toLocaleString('en-IN')}
                        </div>
                        <div className="col-span-1 text-center font-medium text-[hsl(28,100%,25%)]">
                          ₹{item.lineTotal?.toLocaleString('en-IN')}
                        </div>
                        <div className="col-span-2 flex justify-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => editItem(item, index)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Enhanced Totals Calculation Section - Matching Image Layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border-t pt-4">
                    {/* Left Side - Furniture Specifications */}
                    <Card className="h-fit">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-bold">Furniture Specifications</CardTitle>
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
                                  className="min-h-[120px] text-xs border-gray-300 resize-none"
                                  placeholder="Enter furniture specifications..."
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Dynamic Payment Terms */}
                        <div className="mt-4 pt-4 border-t">
                          <h4 className="font-bold text-sm mb-2">Payment Terms</h4>
                          <div className="text-xs space-y-1 text-gray-600">
                            {getPaymentTermsLines(currentPaymentTermsText).map((line, index) => (
                              <div key={index}>{line}</div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Right Side - Calculations */}
                    <Card className="h-fit">
                      <CardContent className="p-0">
                        {/* Total Calculation Table */}
                        <div className="border rounded-lg overflow-hidden">
                          {/* Items Subtotal */}
                          <div className="flex justify-between items-center p-3 bg-gray-50 border-b">
                            <span className="font-medium text-sm">Total</span>
                            <span className="font-bold text-lg">
                              ₹{(totals.subtotal || 0).toLocaleString('en-IN')}
                            </span>
                          </div>

                          {/* Packaging Charges */}
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
                                  step="0.01"
                                />
                              </div>
                            </div>
                            <span className="font-medium text-sm">
                              ₹{
                                form.watch("packingChargesType") === "percentage" 
                                  ? (((totals.subtotal || 0) * (form.watch("packingChargesValue") || 0)) / 100).toLocaleString('en-IN')
                                  : (form.watch("packingChargesValue") || 0).toLocaleString('en-IN')
                              }
                            </span>
                          </div>

                          {/* Transportation */}
                          <div className="flex justify-between items-center p-3 border-b bg-white">
                            <span className="text-sm">Transportation</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs">₹</span>
                              <Input
                                type="number"
                                value={form.watch("transportationCharges")}
                                onChange={(e) => form.setValue("transportationCharges", parseFloat(e.target.value) || 0)}
                                className="h-6 w-20 text-xs border-0 p-1 text-center font-medium"
                                step="1"
                              />
                            </div>
                          </div>

                          {/* GST */}
                          <div className="flex justify-between items-center p-3 border-b bg-white">
                            <span className="text-sm">GST @ 18%</span>
                            <span className="font-medium text-sm">
                              ₹{(
                                ((totals.subtotal || 0) + 
                                 (form.watch("packingChargesType") === "percentage" 
                                   ? ((totals.subtotal || 0) * (form.watch("packingChargesValue") || 0)) / 100
                                   : (form.watch("packingChargesValue") || 0)) + 
                                 (form.watch("transportationCharges") || 0)) * 0.18
                              ).toLocaleString('en-IN')}
                            </span>
                          </div>

                          {/* Grand Total */}
                          <div className="flex justify-between items-center p-3 bg-[hsl(28,100%,25%)] text-white">
                            <span className="font-bold text-sm">Grand Total</span>
                            <span className="font-bold text-lg">
                              ₹{(
                                (totals.subtotal || 0) + 
                                (form.watch("packingChargesType") === "percentage" 
                                  ? ((totals.subtotal || 0) * (form.watch("packingChargesValue") || 0)) / 100
                                  : (form.watch("packingChargesValue") || 0)) + 
                                (form.watch("transportationCharges") || 0) +
                                (((totals.subtotal || 0) + 
                                  (form.watch("packingChargesType") === "percentage" 
                                    ? ((totals.subtotal || 0) * (form.watch("packingChargesValue") || 0)) / 100
                                    : (form.watch("packingChargesValue") || 0)) + 
                                  (form.watch("transportationCharges") || 0)) * 0.18)
                              ).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        {/* Bank Details */}
                        <div className="mt-4 p-3 bg-gray-50 text-xs">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-bold mb-1">Bank Details</h4>
                              <div className="space-y-0.5 text-gray-600">
                                <div>A/C Name: Furnili</div>
                                <div>Bank: ICICI Bank</div>
                                <div>Branch: Nigdi</div>
                                <div>A/C No.: 230505006647</div>
                                <div>IFSC: ICIC0002305</div>
                              </div>
                            </div>
                            <div className="flex items-center justify-center">
                              <div className="text-center">
                                <div className="text-[hsl(28,100%,25%)] font-bold text-lg">FURNILI</div>
                                <div className="text-xs text-gray-500">BESPOKE MODULAR FURNITURE</div>
                                <div className="text-xs mt-2">Authorised Signatory</div>
                                <div className="text-xs font-medium">for FURNILI</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>



          {/* Form Actions */}
          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation(`/projects/${projectId}`)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || items.length === 0}
              className="bg-[hsl(28,100%,25%)] hover:bg-[hsl(28,100%,20%)]"
            >
              {createMutation.isPending ? "Creating..." : "Create Quote"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}