import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";

interface BulkExportModalProps {
  onSuccess?: () => void;
}

export default function BulkExportModal({ onSuccess }: BulkExportModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('csv');
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'name', 'category', 'brand', 'sku', 'pricePerUnit', 'currentStock', 'minStock'
  ]);
  const [filterBy, setFilterBy] = useState<'all' | 'low-stock' | 'category'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  const { toast } = useToast();

  const { data: categories } = useQuery({
    queryKey: ['/api/categories'],
  });

  const availableFields = [
    { key: 'name', label: 'Product Name' },
    { key: 'category', label: 'Category' },
    { key: 'brand', label: 'Brand' },
    { key: 'size', label: 'Size' },
    { key: 'sku', label: 'SKU' },
    { key: 'pricePerUnit', label: 'Price per Unit' },
    { key: 'currentStock', label: 'Current Stock' },
    { key: 'minStock', label: 'Minimum Stock' },
    { key: 'unit', label: 'Unit' },
    { key: 'stockStatus', label: 'Stock Status' },
    { key: 'createdAt', label: 'Created Date' },
  ];

  const exportMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams({
        format: exportFormat,
        fields: selectedFields.join(','),
        filter: filterBy,
        ...(filterBy === 'category' && selectedCategory && { category: selectedCategory }),
      });

      const response = await fetch(`/api/products/bulk-export?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Export failed');
      }
      
      return response;
    },
    onSuccess: async (response) => {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products_export_${new Date().toISOString().split('T')[0]}.${exportFormat === 'excel' ? 'xlsx' : 'csv'}`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Completed",
        description: `Products exported successfully as ${exportFormat.toUpperCase()}`,
      });
      
      setIsOpen(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFieldToggle = (field: string) => {
    setSelectedFields(prev => 
      prev.includes(field) 
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  const handleExport = () => {
    if (selectedFields.length === 0) {
      toast({
        title: "No Fields Selected",
        description: "Please select at least one field to export",
        variant: "destructive",
      });
      return;
    }
    exportMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-green-200 text-green-800 hover:bg-green-50">
          <Download className="h-4 w-4 mr-2" />
          Bulk Export
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] sm:max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-amber-900">Bulk Export Products</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Export Format */}
          <div>
            <Label className="text-sm font-medium">Export Format</Label>
            <div className="flex gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="csv"
                  name="format"
                  checked={exportFormat === 'csv'}
                  onChange={() => setExportFormat('csv')}
                />
                <Label htmlFor="csv" className="flex items-center">
                  <FileText className="h-4 w-4 mr-1" />
                  CSV
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="excel"
                  name="format"
                  checked={exportFormat === 'excel'}
                  onChange={() => setExportFormat('excel')}
                />
                <Label htmlFor="excel" className="flex items-center">
                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                  Excel
                </Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Filter Options */}
          <div>
            <Label className="text-sm font-medium">Filter Products</Label>
            <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="low-stock">Low Stock Only</SelectItem>
                <SelectItem value="category">By Category</SelectItem>
              </SelectContent>
            </Select>
            
            {filterBy === 'category' && (
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(categories) && categories.map((category: any) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Separator />

          {/* Field Selection */}
          <div>
            <Label className="text-sm font-medium">Select Fields to Export</Label>
            <div className="grid grid-cols-2 gap-2 mt-2 max-h-40 overflow-y-auto">
              {availableFields.map((field) => (
                <div key={field.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={field.key}
                    checked={selectedFields.includes(field.key)}
                    onCheckedChange={() => handleFieldToggle(field.key)}
                  />
                  <Label htmlFor={field.key} className="text-sm">
                    {field.label}
                  </Label>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedFields(availableFields.map(f => f.key))}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedFields([])}
              >
                Clear All
              </Button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleExport}
              disabled={selectedFields.length === 0 || exportMutation.isPending}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {exportMutation.isPending ? "Exporting..." : `Export as ${exportFormat.toUpperCase()}`}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}