import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authenticatedApiRequest } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import type { Category } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Upload, X } from "lucide-react";
import { ImageViewer } from "@/components/ui/image-viewer";

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  category: z.string().min(1, "Category is required"),
  brand: z.string().optional(),
  size: z.string().optional(),
  thickness: z.string().optional(),
  sku: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be positive"),
  currentStock: z.coerce.number().int().min(0, "Stock must be non-negative"),
  minStock: z.coerce.number().int().min(0, "Minimum stock must be non-negative"),
  unit: z.string().min(1, "Unit is required"),
  productType: z.enum(['raw_material', 'finishing_good', 'assembly', 'seasonal']).default('raw_material'),
  imageUrl: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface Product {
  id: number;
  name: string;
  category: string;
  brand?: string;
  size?: string;
  thickness?: string;
  sku?: string;
  price: number;
  currentStock: number;
  minStock: number;
  unit: string;
  productType: 'raw_material' | 'finishing_good' | 'assembly' | 'seasonal';
  imageUrl?: string;
}

interface ProductFormProps {
  product?: Product | null;
  onClose: () => void;
  isMobile?: boolean;
}

export default function ProductForm({ product, onClose, isMobile = false }: ProductFormProps) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(product?.imageUrl || null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState(product?.name || "");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debounce search query to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || "",
      category: product?.category || "",
      brand: product?.brand || "",
      size: product?.size || "",
      thickness: product?.thickness || "",
      sku: product?.sku || "",
      price: product?.price || 0,
      currentStock: product?.currentStock || 0,
      minStock: product?.minStock || 10,
      unit: product?.unit || "pieces",
      productType: product?.productType || "raw_material",
    },
  });



  const onSubmit = async (data: ProductFormData) => {
    setIsLoading(true);
    
    try {
      let imageUrl = product?.imageUrl || null;
      
      // Upload image first if a new one is selected
      if (selectedImage) {
        const imageFormData = new FormData();
        imageFormData.append('image', selectedImage);
        
        // For editing existing products, include the productId
        if (product?.id) {
          imageFormData.append('productId', product.id.toString());
        } else {
          // For new products, use a temporary ID that will be replaced
          imageFormData.append('productId', 'temp-' + Date.now());
        }
        
        const token = localStorage.getItem('authToken');
        if (!token) {
          throw new Error('No authentication token found');
        }
        
        const imageResponse = await fetch('/api/products/upload-image', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: imageFormData,
        });
        
        if (!imageResponse.ok) {
          const errorData = await imageResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to upload image');
        }
        
        const imageResult = await imageResponse.json();
        imageUrl = imageResult.imageUrl;
      }
      
      // Create product data with image URL and ensure productType is valid
      const productData = {
        ...data,
        // Convert null imageUrl to undefined so it gets omitted from the request
        ...(imageUrl ? { imageUrl } : {}),
        // Ensure productType defaults to 'raw_material' if not set
        productType: data.productType || 'raw_material'
      };
      
      console.log('Final product data being sent:', productData);
      
      // Use regular JSON request for product data
      const url = product ? `/api/products/${product.id}` : '/api/products';
      const method = product ? 'PUT' : 'POST';
      
      const response = await authenticatedApiRequest(method, url, productData);
      
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: product ? "Product updated" : "Product created",
        description: product ? "Product has been successfully updated." : "Product has been successfully created.",
      });
      onClose();
      
    } catch (error) {
      console.error('Product save error:', error);
      
      let errorMessage = "Failed to save product";
      
      if (error instanceof Error) {
        errorMessage = error.message;
        // Check if it's a validation error from the server
        if (errorMessage.includes('Validation failed')) {
          errorMessage = "Please check all required fields are filled correctly";
        }
      }
      
      // Also log the full error for debugging
      console.error('Full error details:', error);
      
      toast({
        title: "Save failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  // Handle paste events for image upload
  const handleImagePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            processImageFile(file);
          }
          break;
        }
      }
    }
  };

  // Handle drag and drop events
  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        processImageFile(file);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Process image file with proper extension handling
  const processImageFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast({
        title: "File too large",
        description: "Image must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Create a new file with proper extension if needed
    let processedFile = file;
    
    // If file is pasted and doesn't have proper name/extension, generate one
    if (!file.name || file.name === 'image.png' || file.name === 'blob') {
      const extension = getExtensionFromMimeType(file.type);
      const newName = `pasted-image-${Date.now()}.${extension}`;
      processedFile = new File([file], newName, { type: file.type });
    }

    setSelectedImage(processedFile);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(processedFile);
  };

  // Get file extension from MIME type
  const getExtensionFromMimeType = (mimeType: string): string => {
    switch (mimeType) {
      case 'image/jpeg':
        return 'jpg';
      case 'image/png':
        return 'png';
      case 'image/gif':
        return 'gif';
      case 'image/webp':
        return 'webp';
      default:
        return 'jpg'; // fallback
    }
  };

  // Fetch categories from API
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Search for products based on debounced query
  const { data: searchResults = [], isLoading: isSearchLoading } = useQuery({
    queryKey: ["/api/products/search", debouncedSearchQuery],
    queryFn: () => authenticatedApiRequest("GET", `/api/products/search?query=${encodeURIComponent(debouncedSearchQuery)}`),
    enabled: debouncedSearchQuery.length > 0,
  });

  const units = [
    "pieces", "meters", "kg", "bags", "boxes", "liters", "tons", "feet", "inches", "sq.ft", "cubic.ft"
  ];

  return (
    <div className="h-full flex flex-col max-w-[90vw]">
      <div className="flex-1 overflow-y-auto py-2 px-3">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 pb-4">
          {/* Row 1: Product Name and Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="name" className="text-xs font-medium mb-1 !text-xs">Product Name *</Label>
              <Autocomplete
                value={watch("name") || ""}
                onChange={(value) => {
                  setValue("name", value);
                  setSearchQuery(value);
                }}
                onSelect={(option) => {
                  setValue("name", option.name);
                  // Optionally pre-fill category and brand if they match
                  if (option.category && !watch("category")) {
                    setValue("category", option.category);
                  }
                  if (option.brand && !watch("brand")) {
                    setValue("brand", option.brand);
                  }
                  setSearchQuery("");
                }}
                options={searchResults}
                isLoading={isSearchLoading}
                placeholder="e.g., Calibrated ply"
                className={`${errors.name ? "border-red-500" : ""} h-8 text-xs`}
                error={!!errors.name}
              />
              {errors.name && (
                <p className="text-xs text-red-600 mt-0.5">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="category" className="text-xs font-medium mb-1 !text-xs">Category *</Label>
              <Select 
                value={watch("category")}
                onValueChange={(value) => setValue("category", value)}
              >
                <SelectTrigger className={`${errors.category ? "border-red-500" : ""} h-8 text-xs`}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>{category.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-xs text-red-600 mt-0.5">{errors.category.message}</p>
              )}
            </div>
          </div>

          {/* Row 2: Brand, Size and Thickness */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label htmlFor="brand" className="text-xs font-medium mb-1 !text-xs">Brand</Label>
              <Input
                id="brand"
                {...register("brand")}
                className="h-8 text-xs"
                placeholder="e.g., ebco"
              />
            </div>

            <div>
              <Label htmlFor="size" className="text-xs font-medium mb-1 !text-xs">Size</Label>
              <Input
                id="size"
                {...register("size")}
                className="h-8 text-xs"
                placeholder="8 X 4 feet"
              />
            </div>

            <div>
              <Label htmlFor="thickness" className="text-xs font-medium mb-1 !text-xs">Thickness</Label>
              <Input
                id="thickness"
                {...register("thickness")}
                className="h-8 text-xs"
                placeholder="12 mm"
              />
            </div>
          </div>

          {/* Row 3: SKU, Price per unit, and Unit */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label htmlFor="sku" className="text-xs font-medium mb-1 !text-xs">SKU</Label>
              <Input
                id="sku"
                {...register("sku")}
                placeholder="Auto-generated if empty"
                className="h-8 text-xs"
              />
            </div>

            <div>
              <Label htmlFor="price" className="text-xs font-medium mb-1 !text-xs">Price per Unit *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                {...register("price")}
                className={`${errors.price ? "border-red-500" : ""} h-8 text-xs`}
                placeholder="0"
              />
              {errors.price && (
                <p className="text-xs text-red-600 mt-0.5">{errors.price.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="unit" className="text-xs font-medium mb-1 !text-xs">Unit *</Label>
              <Select 
                value={watch("unit")}
                onValueChange={(value) => setValue("unit", value)}
              >
                <SelectTrigger className={`${errors.unit ? "border-red-500" : ""} h-8 text-xs`}>
                  <SelectValue placeholder="pieces" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.unit && (
                <p className="text-xs text-red-600 mt-0.5">{errors.unit.message}</p>
              )}
            </div>
          </div>

          {/* Row 4: Product Type */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <Label htmlFor="productType" className="text-xs font-medium mb-1 !text-xs">Product Type *</Label>
              <Select 
                value={watch("productType")}
                onValueChange={(value) => setValue("productType", value as 'raw_material' | 'finishing_good' | 'assembly' | 'seasonal')}
              >
                <SelectTrigger className={`${errors.productType ? "border-red-500" : ""} h-8 text-xs`}>
                  <SelectValue placeholder="Select product type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="raw_material">Raw Material</SelectItem>
                  <SelectItem value="finishing_good">Finishing goods</SelectItem>
                  <SelectItem value="assembly">Assembly</SelectItem>
                  <SelectItem value="seasonal">Seasonal</SelectItem>
                </SelectContent>
              </Select>
              {errors.productType && (
                <p className="text-xs text-red-600 mt-0.5">{errors.productType.message}</p>
              )}
            </div>
          </div>

          {/* Stock Information - Two columns */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="currentStock" className="text-xs font-medium mb-1 !text-xs">Current Stock *</Label>
              <Input
                id="currentStock"
                type="number"
                {...register("currentStock")}
                className={`${errors.currentStock ? "border-red-500" : ""} h-8 text-xs`}
                placeholder="0"
              />
              {errors.currentStock && (
                <p className="text-xs text-red-600 mt-0.5">{errors.currentStock.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="minStock" className="text-xs font-medium mb-1 !text-xs">Minimum Stock Level *</Label>
              <Input
                id="minStock"
                type="number"
                {...register("minStock")}
                className={`${errors.minStock ? "border-red-500" : ""} h-8 text-xs`}
                placeholder="10"
              />
              {errors.minStock && (
                <p className="text-xs text-red-600 mt-0.5">{errors.minStock.message}</p>
              )}
            </div>
          </div>

          {/* Image Upload - Compact */}
          <div>
            <Label className="text-xs font-medium mb-1 !text-xs">Product Image</Label>
            <div className="mt-1">
              {imagePreview ? (
                <div className="relative inline-block">
                  <ImageViewer 
                    src={imagePreview} 
                    alt="Product Image Preview"
                    className="w-20 h-20"
                  >
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="object-contain rounded-lg border bg-gray-50 p-1 w-20 h-20"
                    />
                  </ImageViewer>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute -top-1 -right-1 h-5 w-5 p-0"
                    onClick={removeImage}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg text-center p-2 relative"
                  onPaste={handleImagePaste}
                  onDrop={handleImageDrop}
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  tabIndex={0}
                >
                  <Upload className="text-gray-400 mx-auto mb-1 w-5 h-5" />
                  <p className="text-gray-600 mb-1 text-xs">Upload product image</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="cursor-pointer inline-block">
                    <div className="inline-flex items-center justify-center rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-7 px-2">
                      Choose Image
                    </div>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">Max 5MB</p>
                </div>
              )}
            </div>
          </div>

        </form>
      </div>
      
      {/* Compact Action Buttons */}
      <div className="p-3 border-t bg-white flex-shrink-0">
        <div className="flex gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            className="flex-1 h-8 text-xs"
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading}
            className="furnili-gradient hover:opacity-90 text-white flex-1 h-8 text-xs"
            onClick={handleSubmit(onSubmit)}
          >
            {isLoading ? "Saving..." : product ? "Update" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}
