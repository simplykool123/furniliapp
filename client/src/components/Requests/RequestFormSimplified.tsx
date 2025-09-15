import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Download, AlertTriangle, Search } from "lucide-react";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { insertMaterialRequestSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const requestFormSchema = z.object({
  projectId: z.number().min(1, "Project selection is required"),
  clientName: z.string().min(1, "Client name is required"),
  orderNumber: z.string().optional(),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  remarks: z.string().optional(),
  items: z.array(z.object({
    productId: z.number().optional(),
    category: z.string().optional(),
    description: z.string().min(1, "Description is required"),
    brand: z.string(),
    size: z.string(),
    thickness: z.string(),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    unit: z.string().default("pcs")
  })).min(1, "At least one item is required")
});

type RequestFormData = z.infer<typeof requestFormSchema>;

interface Product {
  id: number;
  name: string;
  brand?: string;
  category?: string;
  size?: string;
  thickness?: string;
  currentStock: number;
  unit: string;
  pricePerUnit?: number;
}

interface Category {
  id: number;
  name: string;
}

interface Client {
  id: number;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
}

interface Project {
  id: number;
  projectCode: string;
  name: string;
  stage: string;
  client_name: string;
  clientId: number;
}

interface RequestFormSimplifiedProps {
  onClose: () => void;
  onSuccess?: () => void;
  preSelectedProjectId?: number;
  isMobile?: boolean;
  initialData?: {
    projectId?: number;
    clientName?: string;
    orderNumber?: string;
    boqReference?: string;
    remarks?: string;
    priority?: "high" | "medium" | "low";
    prefilledItems?: Array<{
      productId: number;
      requestedQuantity: number;
      unitPrice: number;
    }>;
  };
}

export default function RequestFormSimplified({ onClose, onSuccess, preSelectedProjectId, isMobile = false, initialData }: RequestFormSimplifiedProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState("");

  // Fetch products and categories
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: eligibleProjects = [], error: projectsError } = useQuery<Project[]>({
    queryKey: ["/api/eligible-projects"],
    retry: false,
    staleTime: 0, // Always fetch fresh data
    refetchOnMount: true // Ensure fresh data on mount
  });

  // Debug projects loading
  useEffect(() => {
    console.log("Projects debug - eligibleProjects:", eligibleProjects);
    console.log("Projects debug - projectsError:", projectsError);
    if (projectsError) {
      console.error("Failed to fetch eligible projects:", projectsError);
    }
  }, [eligibleProjects, projectsError]);

  const form = useForm<RequestFormData>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      projectId: preSelectedProjectId || initialData?.projectId || 0,
      clientName: initialData?.clientName || "",
      orderNumber: initialData?.orderNumber || "",
      priority: initialData?.priority || "medium",
      remarks: initialData?.remarks || "",
      items: initialData?.prefilledItems?.length ? 
        initialData.prefilledItems.map(item => {
          const product = products.find(p => p.id === item.productId);
          return {
            productId: item.productId,
            description: product?.name || "",
            brand: product?.brand || "",
            category: product?.category || "",
            size: product?.size || "",
            thickness: product?.thickness || "",
            quantity: item.requestedQuantity,
            unit: product?.unit || "pcs"
          };
        }) : 
        [{ 
          description: "", 
          brand: "", 
          category: "",
          size: "", 
          thickness: "", 
          quantity: 1, 
          unit: "pcs" 
        }]
    }
  });

  const { register, control, handleSubmit, setValue, watch, formState: { errors }, reset } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });



  // Update form when products are loaded and we have initial data
  useEffect(() => {
    if (initialData?.prefilledItems?.length && products.length > 0) {
      const prefilledItems = initialData.prefilledItems.map(item => {
        const product = products.find(p => p.id === item.productId);
        return {
          productId: item.productId,
          description: product?.name || "",
          brand: product?.brand || "",
          category: product?.category || "",
          size: product?.size || "",
          thickness: product?.thickness || "",
          quantity: item.requestedQuantity,
          unit: product?.unit || "pcs"
        };
      });

      reset({
        clientName: initialData.clientName || "",
        orderNumber: initialData.orderNumber || "",
        priority: initialData.priority || "medium",
        remarks: initialData.remarks || "",
        items: prefilledItems
      });
    }
  }, [products, initialData, reset]);

  // Update project ID and client name when pre-selected project changes
  useEffect(() => {
    if (preSelectedProjectId && eligibleProjects.length > 0) {
      const selectedProject = eligibleProjects.find(p => p.id === preSelectedProjectId);
      if (selectedProject) {
        setValue('projectId', preSelectedProjectId);
        setValue('clientName', selectedProject.client_name, { 
          shouldValidate: true, 
          shouldDirty: true 
        });
      }
    }
  }, [preSelectedProjectId, eligibleProjects, setValue]);

  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: async (clientData: { name: string }) => {
      console.log("Creating client:", clientData);
      const response = await apiRequest("/api/clients", {
        method: "POST", 
        body: JSON.stringify(clientData)
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    },
    onError: (error) => {
      console.error("Client creation error:", error);
    }
  });

  const createRequestMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Creating request:", data);
      try {
        const response = await apiRequest("/api/requests", {
          method: "POST",
          body: JSON.stringify(data)
        });
        console.log("API Response received:", response);
        return response;
      } catch (error) {
        console.error("API Request failed:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Request creation successful:", data);
      toast({ 
        title: "Success", 
        description: "Material request created successfully" 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (error: any) => {
      console.error("Request creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create request",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RequestFormData) => {
    // Check if user is authenticated
    const token = localStorage.getItem('authToken');
    console.log('Form submission - Token exists:', !!token);
    
    if (!token) {
      toast({
        title: "Authentication Required",
        description: "Please log in again to create requests.",
        variant: "destructive",
      });
      return;
    }
    
    console.log('Form data:', data);
    
    const requestData = {
      request: {
        projectId: data.projectId,
        clientName: data.clientName,
        orderNumber: data.orderNumber,
        priority: data.priority,
        remarks: data.remarks || "",
        totalValue: 0 // Will be calculated by backend
      },
      items: data.items.map((item: any) => ({
        productId: item.productId || null,
        requestedQuantity: item.quantity,
        unitPrice: 0, // Will be set from product data
        totalPrice: 0 // Will be calculated by backend
      }))
    };

    createRequestMutation.mutate(requestData);
  };

  // Get filtered products based on category and brand selection
  const getFilteredProducts = (categoryFilter?: string, brandFilter?: string) => {
    return products.filter(product => {
      if (categoryFilter && product.category !== categoryFilter) return false;
      if (brandFilter && product.brand !== brandFilter) return false;
      return true;
    });
  };

  // Get unique brands for selected category
  const getBrandsForCategory = (categoryName?: string): string[] => {
    const filteredProducts = categoryName 
      ? products.filter(p => p.category === categoryName)
      : products;
    const brands = Array.from(new Set(filteredProducts.map(p => p.brand).filter(Boolean))) as string[];
    return brands;
  };

  const handleCategoryChange = (categoryName: string, index: number) => {
    setValue(`items.${index}.category`, categoryName);
    setValue(`items.${index}.brand`, "");
    setValue(`items.${index}.description`, "");
    setValue(`items.${index}.productId`, undefined);
    setValue(`items.${index}.size`, "");
    setValue(`items.${index}.thickness`, "");
  };

  const handleBrandChange = (brand: string, index: number) => {
    setValue(`items.${index}.brand`, brand);
    setValue(`items.${index}.description`, "");
    setValue(`items.${index}.productId`, undefined);
    setValue(`items.${index}.size`, "");
    setValue(`items.${index}.thickness`, "");
  };

  const handleProductSelect = (productId: string, index: number) => {
    const product = products.find(p => p.id === parseInt(productId));
    if (product) {
      setValue(`items.${index}.productId`, product.id);
      setValue(`items.${index}.description`, product.name);
      setValue(`items.${index}.unit`, product.unit || "pcs");
      
      // Handle size selection
      const availableSizes = getAvailableSizes(index);
      if (availableSizes.length === 1) {
        setValue(`items.${index}.size`, availableSizes[0]);
      } else {
        setValue(`items.${index}.size`, "");
      }
      
      // Handle thickness selection
      const availableThickness = getAvailableThickness(index);
      if (availableThickness.length === 1) {
        setValue(`items.${index}.thickness`, availableThickness[0]);
      } else {
        setValue(`items.${index}.thickness`, "");
      }
    }
  };

  const handleSizeChange = (size: string, index: number) => {
    setValue(`items.${index}.size`, size);
    
    // Auto-select thickness if only one option available
    const availableThickness = getAvailableThickness(index);
    if (availableThickness.length === 1) {
      setValue(`items.${index}.thickness`, availableThickness[0]);
    } else {
      setValue(`items.${index}.thickness`, "");
    }
  };

  const handleThicknessChange = (thickness: string, index: number) => {
    setValue(`items.${index}.thickness`, thickness);
  };

  // Get available sizes for current category/brand/product selection
  const getAvailableSizes = (index: number): string[] => {
    const formValues = watch();
    const item = formValues.items?.[index];
    if (!item?.category || !item?.brand) return [];
    
    const filteredProducts = products.filter(p => 
      p.category === item.category && 
      p.brand === item.brand &&
      p.size
    );
    return Array.from(new Set(filteredProducts.map(p => p.size).filter(Boolean))) as string[];
  };

  // Get available thickness for current category/brand/size selection
  const getAvailableThickness = (index: number): string[] => {
    const formValues = watch();
    const item = formValues.items?.[index];
    if (!item?.category || !item?.brand) return [];
    
    const filteredProducts = products.filter(p => 
      p.category === item.category && 
      p.brand === item.brand &&
      (!item.size || p.size === item.size) &&
      p.thickness
    );
    return Array.from(new Set(filteredProducts.map(p => p.thickness).filter(Boolean))) as string[];
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number, field: string) => {
    if (e.key === 'Tab' && field === 'quantity' && index === fields.length - 1) {
      e.preventDefault();
      append({ 
        description: "", 
        brand: "", 
        category: "",
        size: "", 
        thickness: "", 
        quantity: 1, 
        unit: "pcs" 
      });
    }
  };

  const downloadProductList = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "ID,Name,Brand,Category,Size,Thickness,Stock\n" +
      products.map(p => 
        `${p.id},"${p.name}","${p.brand || ''}","${p.category || ''}","${p.size || ''}","${p.thickness || ''}",${p.currentStock}`
      ).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "product_list.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Check if requested quantity exceeds stock
  const checkStockWarning = (productId: number | undefined, quantity: number) => {
    if (!productId) return false;
    const product = products.find(p => p.id === productId);
    return product && quantity > product.currentStock;
  };

  return (
    <div className={`${isMobile ? 'h-full flex flex-col' : ''}`}>
      <div className={`${isMobile ? 'flex-1 overflow-y-auto p-3' : ''}`}>
        <form onSubmit={handleSubmit(onSubmit)} className={`${isMobile ? 'space-y-3 pb-16' : 'space-y-6'}`}>
          <Card>
            <CardContent className={`${isMobile ? 'space-y-3 p-3' : 'space-y-4'}`}>
              {/* Responsive field layout */}
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-2' : 'grid-cols-12 gap-3'} items-end`}>
                <div className={isMobile ? '' : 'col-span-4'}>
                  <Label htmlFor="projectId" className={`${isMobile ? 'text-sm' : 'text-sm'} font-medium`}>Project ID *</Label>
                  <Select 
                    value={watch("projectId")?.toString() || ""}
                    onValueChange={(value) => {
                      const projectId = parseInt(value);
                      setValue("projectId", projectId);
                      
                      // Auto-fill client name based on selected project
                      const selectedProject = eligibleProjects.find(p => p.id === projectId);
                      if (selectedProject) {
                        setValue("clientName", selectedProject.client_name, { 
                          shouldValidate: true, 
                          shouldDirty: true 
                        });
                      }
                    }}
                  >
                    <SelectTrigger className={`${isMobile ? 'h-10 text-sm' : 'text-sm'}`}>
                      <SelectValue placeholder="Select project..." />
                    </SelectTrigger>
                <SelectContent>
                  {eligibleProjects.length === 0 ? (
                    <div className="px-2 py-2 text-sm text-amber-600">
                      No eligible projects found
                    </div>
                  ) : (
                    eligibleProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        <div className="flex flex-col">
                          <span className="font-medium">Project ID: {project.projectCode}</span>
                          <span className="text-xs text-gray-500">{project.name} | {project.client_name} | {project.stage}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.projectId && (
                <p className="text-sm text-red-600 mt-1">{errors.projectId.message}</p>
              )}
            </div>

                <div className={isMobile ? '' : 'col-span-3'}>
                  <Label htmlFor="clientName" className={`${isMobile ? 'text-sm' : 'text-sm'} font-medium`}>Client *</Label>
                  <Input
                    id="clientName"
                    {...register("clientName")}
                    placeholder="Auto-filled from project"
                    className={`${isMobile ? 'h-10 text-sm' : 'text-sm'} ${errors.clientName ? "border-red-500" : ""}`}
                    disabled={!watch("projectId")}
                  />
                  {errors.clientName && (
                    <p className="text-xs text-red-600 mt-1">{errors.clientName.message}</p>
                  )}
                </div>

                <div className={isMobile ? '' : 'col-span-3'}>
                  <Label htmlFor="orderNumber" className={`${isMobile ? 'text-sm' : 'text-sm'} font-medium`}>Order No</Label>
                  <Input
                    id="orderNumber"
                    {...register("orderNumber")}
                    placeholder="e.g., ORD-2024-001"
                    className={`${isMobile ? 'h-10 text-sm' : 'text-sm'} ${errors.orderNumber ? "border-red-500" : ""}`}
                  />
                  {errors.orderNumber && (
                    <p className="text-xs text-red-600 mt-1">{errors.orderNumber.message}</p>
                  )}
                </div>

                <div className={isMobile ? '' : 'col-span-2'}>
                  <Label htmlFor="priority" className={`${isMobile ? 'text-sm' : 'text-sm'} font-medium`}>Priority</Label>
                  <Select 
                    value={watch("priority")}
                    onValueChange={(value) => setValue("priority", value as "high" | "medium" | "low")}
                  >
                    <SelectTrigger className={`${isMobile ? 'h-10 text-sm' : 'text-sm'}`}>
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Remarks */}
              <div className={`${isMobile ? '' : 'grid grid-cols-12 gap-3 items-end'}`}>
                <div className={isMobile ? '' : 'col-span-2'}>
                  <Label htmlFor="remarks" className={`${isMobile ? 'text-sm' : 'text-sm'} font-medium`}>Remarks:</Label>
                </div>
                <div className={isMobile ? '' : 'col-span-10'}>
                  <Input
                    id="remarks"
                    {...register("remarks")}
                    placeholder="Any additional notes or requirements..."
                    className={isMobile ? 'h-10 text-sm' : ''}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Materials Table */}
          {errors.items && (
            <p className="text-sm text-red-600">{errors.items.message}</p>
          )}
          
          <div className="border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-12 bg-gray-50 border-b text-sm font-medium text-gray-700">
              <div className="px-2 py-2 border-r text-center">#</div>
              <div className="px-2 py-2 border-r col-span-2">Category</div>
              <div className="px-2 py-2 border-r col-span-2">Brand</div>
              <div className="px-2 py-2 border-r col-span-2">Product</div>
              <div className="px-2 py-2 border-r">Size</div>
              <div className="px-2 py-2 border-r">Thk.</div>
              <div className="px-2 py-2 border-r">Qty</div>
              <div className="px-2 py-2 text-center">Action</div>
            </div>
            
            {/* Data Rows */}
            {fields.map((field, index) => {
              const formValues = watch();
              const watchedCategory = formValues.items?.[index]?.category;
              const watchedBrand = formValues.items?.[index]?.brand;
              const watchedProductId = formValues.items?.[index]?.productId;
              const watchedQuantity = formValues.items?.[index]?.quantity || 0;
              const hasStockWarning = checkStockWarning(watchedProductId, watchedQuantity);
              
              return (
                <div key={field.id} className="grid grid-cols-12 border-b hover:bg-gray-50 text-sm">
                  {/* Row Number */}
                  <div className="px-2 py-1 border-r text-center text-gray-500 flex items-center justify-center">
                    {index + 1}
                  </div>
                  
                  {/* Category Selection */}
                  <div className="px-1 py-1 border-r col-span-2">
                    <Select 
                      value={watchedCategory || ""}
                      onValueChange={(value) => handleCategoryChange(value, index)}
                    >
                      <SelectTrigger className="border-0 h-8 text-xs focus:ring-1 focus:ring-blue-500">
                        <SelectValue placeholder="Select category..." />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.name}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Brand Selection */}
                  <div className="px-1 py-1 border-r col-span-2">
                    <Select 
                      value={watchedBrand || ""}
                      onValueChange={(value) => handleBrandChange(value, index)}
                      disabled={!watchedCategory}
                    >
                      <SelectTrigger className="border-0 h-8 text-xs focus:ring-1 focus:ring-blue-500">
                        <SelectValue placeholder="Select brand..." />
                      </SelectTrigger>
                      <SelectContent>
                        {getBrandsForCategory(watchedCategory).map((brand) => (
                          <SelectItem key={brand} value={brand}>
                            {brand}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Product Selection */}
                  <div className="px-1 py-1 border-r col-span-2">
                    <Select 
                      value={watchedProductId?.toString() || ""}
                      onValueChange={(value) => handleProductSelect(value, index)}
                      disabled={!watchedCategory || !watchedBrand}
                    >
                      <SelectTrigger className="border-0 h-8 text-xs focus:ring-1 focus:ring-blue-500">
                        <SelectValue placeholder="Select product..." />
                      </SelectTrigger>
                      <SelectContent>
                        {getFilteredProducts(watchedCategory, watchedBrand).map((product) => (
                          <SelectItem key={product.id} value={product.id.toString()}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Size Selection */}
                  <div className="px-1 py-1 border-r">
                    {(() => {
                      const availableSizes = getAvailableSizes(index);
                      const currentSize = formValues.items?.[index]?.size;
                      
                      if (availableSizes.length <= 1) {
                        return (
                          <Input
                            value={currentSize || ""}
                            placeholder="Auto"
                            className="border-0 h-8 text-xs focus:ring-1 focus:ring-blue-500"
                            readOnly
                          />
                        );
                      } else {
                        return (
                          <Select 
                            value={currentSize || ""}
                            onValueChange={(value) => handleSizeChange(value, index)}
                            disabled={!watchedCategory || !watchedBrand}
                          >
                            <SelectTrigger className="border-0 h-8 text-xs focus:ring-1 focus:ring-blue-500">
                              <SelectValue placeholder="Size..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableSizes.map((size) => (
                                <SelectItem key={size} value={size}>
                                  {size}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        );
                      }
                    })()}
                  </div>
                  
                  {/* Thickness Selection */}
                  <div className="px-1 py-1 border-r">
                    {(() => {
                      const availableThickness = getAvailableThickness(index);
                      const currentThickness = formValues.items?.[index]?.thickness;
                      
                      if (availableThickness.length <= 1) {
                        return (
                          <Input
                            value={currentThickness || ""}
                            placeholder="Auto"
                            className="border-0 h-8 text-xs focus:ring-1 focus:ring-blue-500"
                            readOnly
                          />
                        );
                      } else {
                        return (
                          <Select 
                            value={currentThickness || ""}
                            onValueChange={(value) => handleThicknessChange(value, index)}
                            disabled={!watchedCategory || !watchedBrand}
                          >
                            <SelectTrigger className="border-0 h-8 text-xs focus:ring-1 focus:ring-blue-500">
                              <SelectValue placeholder="Thk..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableThickness.map((thickness) => (
                                <SelectItem key={thickness} value={thickness}>
                                  {thickness}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        );
                      }
                    })()}
                  </div>
                  
                  {/* Quantity with Stock Warning */}
                  <div className="px-1 py-1 border-r">
                    <div className="flex items-center">
                      <Input
                        type="number"
                        {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                        min="1"
                        step="1"
                        className={`border-0 h-8 text-xs text-right focus:ring-1 focus:ring-blue-500 ${hasStockWarning ? 'bg-red-50' : ''}`}
                        onKeyDown={(e) => handleKeyDown(e, index, 'quantity')}
                      />
                      {hasStockWarning && (
                        <AlertTriangle className="w-4 h-4 text-red-500 ml-1" />
                      )}
                    </div>
                    {errors.items?.[index]?.quantity && (
                      <p className="text-xs text-red-600 mt-1">{errors.items[index]?.quantity?.message}</p>
                    )}
                    {hasStockWarning && (
                      <p className="text-xs text-red-600 mt-1">Exceeds stock!</p>
                    )}
                  </div>
                  
                  {/* Delete Action */}
                  <div className="px-1 py-1 text-center flex items-center justify-center">
                    {fields.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => append({ 
                          description: "", 
                          brand: "", 
                          category: "",
                          size: "", 
                          thickness: "", 
                          quantity: 1, 
                          unit: "pcs" 
                        })}
                        className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Row Button */}
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ 
                description: "", 
                brand: "", 
                category: "",
                size: "", 
                thickness: "", 
                quantity: 1, 
                unit: "pcs" 
              })}
              className={isMobile ? 'h-9 text-sm' : ''}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Row
            </Button>
          </div>
        </form>
      </div>
      
      {/* Mobile Action Buttons - Fixed at bottom */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 flex gap-2 z-50">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={createRequestMutation.isPending}
            className="flex-1 h-10 text-sm"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createRequestMutation.isPending}
            className="flex-1 h-10 text-sm furnili-gradient text-white"
            onClick={handleSubmit(onSubmit)}
          >
            {createRequestMutation.isPending ? "Creating..." : "Create"}
          </Button>
        </div>
      )}
      
      {/* Desktop Actions */}
      {!isMobile && (
        <div className="flex items-center justify-end space-x-4 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={createRequestMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createRequestMutation.isPending}
            className="furnili-gradient text-white"
            onClick={handleSubmit(onSubmit)}
          >
            {createRequestMutation.isPending ? "Creating..." : "Create Request"}
          </Button>
        </div>
      )}
    </div>
  );
}