import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticatedApiRequest, authService } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";

const requestSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  priority: z.enum(["high", "medium", "low"]),
  remarks: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1, "Description is required"),
    brand: z.string().optional(),
    type: z.string().optional(),
    size: z.string().optional(),
    thickness: z.string().optional(),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    unit: z.string().default("pcs"),
  })).min(1, "At least one item is required"),
});

type RequestFormData = z.infer<typeof requestSchema>;

interface RequestFormProps {
  onClose: () => void;
}

export default function RequestForm({ onClose }: RequestFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const user = authService.getUser();

  const { data: products } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      return await authenticatedApiRequest('GET', '/api/products');
    },
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
    setValue,
  } = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      clientName: "",
      orderNumber: "",
      priority: "medium",
      remarks: "",
      items: [{ 
        description: "", 
        brand: "", 
        type: "", 
        size: "", 
        thickness: "", 
        quantity: 1, 
        unit: "pcs" 
      }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const createRequestMutation = useMutation({
    mutationFn: async (data: RequestFormData) => {
      // Filter out empty items and prepare data
      const validItems = data.items.filter(item => item.description.trim() !== "");
      
      if (validItems.length === 0) {
        throw new Error("At least one item is required");
      }

      const requestData = {
        request: {
          clientName: data.clientName,
          priority: data.priority,
          remarks: data.remarks || undefined,
        },
        items: validItems.map(item => ({
          description: item.description,
          brand: item.brand || "",
          type: item.type || "",
          size: item.size || "",
          thickness: item.thickness || "",
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: 0, // Will be set by backend
          totalPrice: 0, // Will be calculated by backend
        })),
      };

      return await authenticatedApiRequest('POST', '/api/requests', requestData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Request created",
        description: "Material request has been submitted successfully.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Request failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: RequestFormData) => {
    setIsLoading(true);
    try {
      await createRequestMutation.mutateAsync(data);
    } catch (error) {
      console.error('Request submission error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const watchedItems = watch("items");
  
  // Add new row automatically when tabbing from the last field
  const handleKeyDown = (e: React.KeyboardEvent, index: number, fieldName: string) => {
    if (e.key === 'Tab' && !e.shiftKey) {
      // If we're on the last field (quantity) of the last row, add a new row
      if (fieldName === 'quantity' && index === fields.length - 1) {
        e.preventDefault();
        append({ 
          description: "", 
          brand: "", 
          type: "", 
          size: "", 
          thickness: "", 
          quantity: 1, 
          unit: "pcs" 
        });
        // Focus will be handled by React automatically
        setTimeout(() => {
          const nextInput = document.querySelector(`input[name="items.${index + 1}.description"]`) as HTMLInputElement;
          if (nextInput) nextInput.focus();
        }, 50);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Request Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="clientName">Client Name *</Label>
              <Input
                id="clientName"
                {...register("clientName")}
                className={errors.clientName ? "border-red-500" : ""}
                placeholder="e.g., ABC Construction Ltd."
              />
              {errors.clientName && (
                <p className="text-sm text-red-600 mt-1">{errors.clientName.message}</p>
              )}
            </div>

            <div>
              <Label>Order Number</Label>
              <Input
                value="Auto-generated"
                disabled
                className="bg-gray-50 text-gray-500"
                placeholder="Auto-generated"
              />
              <p className="text-xs text-gray-500 mt-1">Order number will be automatically assigned</p>
            </div>
          </div>

          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select 
              value={watch("priority")}
              onValueChange={(value) => setValue("priority", value as "high" | "medium" | "low")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="low">Low Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              {...register("remarks")}
              placeholder="Any additional notes or requirements..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Goods Table - Compact Design */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Goods</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ 
                description: "", 
                brand: "", 
                type: "", 
                size: "", 
                thickness: "", 
                quantity: 1, 
                unit: "pcs" 
              })}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Row
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {errors.items && (
            <p className="text-sm text-red-600 mb-4 px-6">{errors.items.message}</p>
          )}
          
          {/* Compact Grid Layout */}
          <div className="border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-12 bg-gray-50 border-b text-sm font-medium text-gray-700">
              <div className="px-2 py-2 border-r text-center">#</div>
              <div className="px-2 py-2 border-r col-span-4">Description</div>
              <div className="px-2 py-2 border-r col-span-2">Brand</div>
              <div className="px-2 py-2 border-r">Type</div>
              <div className="px-2 py-2 border-r">Size</div>
              <div className="px-2 py-2 border-r">Thickness</div>
              <div className="px-2 py-2 border-r">Quantity</div>
              <div className="px-2 py-2 text-center">Action</div>
            </div>
            
            {/* Data Rows */}
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 border-b hover:bg-gray-50 text-sm">
                {/* Row Number */}
                <div className="px-2 py-1 border-r text-center text-gray-500 flex items-center justify-center">
                  {index + 1}
                </div>
                
                {/* Description */}
                <div className="px-1 py-1 border-r col-span-4">
                  <Input
                    {...register(`items.${index}.description`)}
                    placeholder="e.g., Gurjan Plywood - 18mm - 8 X 4 feet"
                    className="border-0 h-8 text-xs focus:ring-1 focus:ring-blue-500"
                    onKeyDown={(e) => handleKeyDown(e, index, 'description')}
                  />
                  {errors.items?.[index]?.description && (
                    <p className="text-xs text-red-600 mt-1">{errors.items[index]?.description?.message}</p>
                  )}
                </div>
                
                {/* Brand */}
                <div className="px-1 py-1 border-r col-span-2">
                  <Input
                    {...register(`items.${index}.brand`)}
                    placeholder="e.g., Master"
                    className="border-0 h-8 text-xs focus:ring-1 focus:ring-blue-500"
                    onKeyDown={(e) => handleKeyDown(e, index, 'brand')}
                  />
                </div>
                
                {/* Type */}
                <div className="px-1 py-1 border-r">
                  <Input
                    {...register(`items.${index}.type`)}
                    placeholder="e.g., Material"
                    className="border-0 h-8 text-xs focus:ring-1 focus:ring-blue-500"
                    onKeyDown={(e) => handleKeyDown(e, index, 'type')}
                  />
                </div>
                
                {/* Size */}
                <div className="px-1 py-1 border-r">
                  <Input
                    {...register(`items.${index}.size`)}
                    placeholder="e.g., 8x4"
                    className="border-0 h-8 text-xs focus:ring-1 focus:ring-blue-500"
                    onKeyDown={(e) => handleKeyDown(e, index, 'size')}
                  />
                </div>
                
                {/* Thickness */}
                <div className="px-1 py-1 border-r">
                  <Input
                    {...register(`items.${index}.thickness`)}
                    placeholder="e.g., 18mm"
                    className="border-0 h-8 text-xs focus:ring-1 focus:ring-blue-500"
                    onKeyDown={(e) => handleKeyDown(e, index, 'thickness')}
                  />
                </div>
                
                {/* Quantity */}
                <div className="px-1 py-1 border-r">
                  <Input
                    type="number"
                    {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                    min="1"
                    step="1"
                    className="border-0 h-8 text-xs text-right focus:ring-1 focus:ring-blue-500"
                    onKeyDown={(e) => handleKeyDown(e, index, 'quantity')}
                  />
                  {errors.items?.[index]?.quantity && (
                    <p className="text-xs text-red-600 mt-1">{errors.items[index]?.quantity?.message}</p>
                  )}
                </div>
                
                {/* Delete Action */}
                <div className="px-1 py-1 text-center flex items-center justify-center">
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      className="h-6 w-6 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end space-x-4 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading || createRequestMutation.isPending}
        >
          {isLoading || createRequestMutation.isPending ? "Creating..." : "Create Request"}
        </Button>
      </div>
    </form>
  );
}
