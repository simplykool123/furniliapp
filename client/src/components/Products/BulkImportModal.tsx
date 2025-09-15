import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, FileSpreadsheet, AlertCircle } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BulkImportModalProps {
  onSuccess?: () => void;
}

export default function BulkImportModal({ onSuccess }: BulkImportModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const downloadTemplate = () => {
    // Create CSV template
    const headers = [
      'name',
      'category',
      'brand', 
      'size',
      'thickness',
      'sku',
      'pricePerUnit',
      'currentStock',
      'minStock',
      'unit'
    ];
    
    const sampleData = [
      'Sample Product,Electronics,Samsung,Medium,2mm,SAM001,299.99,50,10,pieces',
      'Another Product,Furniture,IKEA,Large,5mm,IKE002,199.50,25,5,units'
    ];
    
    const csvContent = [headers.join(','), ...sampleData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/products/bulk-import', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Import failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setImportResults(data);
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Import Completed",
        description: `Successfully imported ${data.successful} products. ${data.failed} failed.`,
      });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (allowedTypes.includes(selectedFile.type) || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please upload a CSV or Excel file",
          variant: "destructive",
        });
      }
    }
  };

  const handleImport = () => {
    if (!file) {
      toast({
        title: "No File Selected",
        description: "Please select a file to import",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    importMutation.mutate(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-amber-200 text-amber-800 hover:bg-amber-50">
          <Upload className="h-4 w-4 mr-2" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] sm:max-w-md max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-amber-900">Bulk Import Products</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="file-upload">Upload CSV/Excel File</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="mt-1"
            />
            {file && (
              <p className="text-sm text-gray-600 mt-1">
                Selected: {file.name}
              </p>
            )}
          </div>

          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="w-full border-green-200 text-green-800 hover:bg-green-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>

          {importResults && (
            <Alert>
              <FileSpreadsheet className="h-4 w-4" />
              <AlertDescription>
                Import Results: {importResults.successful} successful, {importResults.failed} failed
                {importResults.errors?.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium">Errors:</p>
                    <ul className="text-sm list-disc list-inside">
                      {importResults.errors.slice(0, 3).map((error: string, index: number) => (
                        <li key={index}>{error}</li>
                      ))}
                      {importResults.errors.length > 3 && <li>...and {importResults.errors.length - 3} more</li>}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleImport}
              disabled={!file || importMutation.isPending}
              className="flex-1 bg-amber-600 hover:bg-amber-700"
            >
              {importMutation.isPending ? "Importing..." : "Import Products"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Import Format:</strong> CSV/Excel with columns: name, category, brand, size, sku, pricePerUnit, currentStock, minStock, unit
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
}