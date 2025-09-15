import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authenticatedApiRequest } from "@/lib/auth";
import { ocrService } from "@/lib/ocr";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, CheckCircle, AlertCircle, Download, Eye, Zap, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { autoMatchBOQItems, findProductMatches, Product } from "@/lib/fuzzyMatch";
import RequestFormSimplified from "@/components/Requests/RequestFormSimplified";

interface BOQExtractedItem {
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  matchedProductId?: number;
  confidence?: number;
  matchedFields?: string[];
}

interface OCRResult {
  items: BOQExtractedItem[];
  projectName?: string;
  totalValue: number;
  client?: string;
  workOrderNumber?: string;
  workOrderDate?: string;
  description?: string;
}

export default function BOQUpload() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOCRProgress] = useState(0);
  const [extractedData, setExtractedData] = useState<OCRResult | null>(null);
  const [showExtractedData, setShowExtractedData] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [matchedItems, setMatchedItems] = useState<BOQExtractedItem[]>([]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch products for matching
  const { data: products } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', '/api/products');
      return response.json();
    },
  });

  // Fetch BOQ uploads
  const { data: boqUploads, isLoading: isLoadingUploads } = useQuery({
    queryKey: ['/api/boq'],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', '/api/boq');
      return response.json();
    },
  });

  const uploadBOQMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('boqFile', file);
      
      const response = await fetch('/api/boq/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Failed to upload BOQ');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/boq'] });
      toast({
        title: "BOQ uploaded successfully",
        description: "File has been uploaded and is being processed.",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createRequestMutation = useMutation({
    mutationFn: async (requestData: any) => {
      const response = await authenticatedApiRequest('POST', '/api/requests', requestData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/requests'] });
      toast({
        title: "Material request created",
        description: "Request has been created from BOQ data.",
      });
      setShowExtractedData(false);
      setExtractedData(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to create request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Auto-match BOQ items when products are loaded and extracted data changes
  useEffect(() => {
    if (extractedData && products && products.length > 0) {
      const matchedData = autoMatchBOQItems(extractedData.items, products as Product[]);
      setMatchedItems(matchedData);
    }
  }, [extractedData, products]);

  // Handle product selection change
  const handleProductMatch = (itemIndex: number, productId: number | null) => {
    const updatedItems = [...matchedItems];
    if (productId) {
      updatedItems[itemIndex].matchedProductId = productId;
      // Find match details if needed
      const product = products?.find((p: Product) => p.id === productId);
      if (product) {
        const matches = findProductMatches(updatedItems[itemIndex], [product]);
        if (matches.length > 0) {
          updatedItems[itemIndex].confidence = matches[0].confidence;
          updatedItems[itemIndex].matchedFields = matches[0].matchedFields;
        }
      }
    } else {
      delete updatedItems[itemIndex].matchedProductId;
      delete updatedItems[itemIndex].confidence;
      delete updatedItems[itemIndex].matchedFields;
    }
    setMatchedItems(updatedItems);
  };

  // Auto-match all unmatched items
  const autoMatchAll = () => {
    if (!products) return;
    
    const autoMatchedData = autoMatchBOQItems(matchedItems, products as Product[]);
    setMatchedItems(autoMatchedData);
    
    const matchedCount = autoMatchedData.filter(item => item.matchedProductId).length;
    toast({
      title: "Auto-matching completed",
      description: `Found matches for ${matchedCount} out of ${autoMatchedData.length} items`,
    });
  };

  // Clear all matches
  const clearAllMatches = () => {
    const clearedItems = matchedItems.map(item => {
      const { matchedProductId, confidence, matchedFields, ...rest } = item;
      return rest;
    });
    setMatchedItems(clearedItems);
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const validTypes = [
      'application/pdf', 
      'image/png', 
      'image/jpeg', 
      'image/jpg',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload Excel (.xlsx, .xls), PDF, or image file (PNG, JPG).",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      toast({
        title: "File too large",
        description: "File must be less than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setOCRProgress(0);

    try {
      // Upload file first
      await uploadBOQMutation.mutateAsync(file);

      // Process with appropriate method based on file type
      let result;
      if (file.type.includes('spreadsheetml') || file.type.includes('ms-excel')) {
        // Excel file processing
        result = await ocrService.processBOQExcel(file, (progress) => {
          setOCRProgress(progress * 100);
        });
      } else if (file.type === 'application/pdf') {
        // PDF processing
        result = await ocrService.processBOQPDF(file, (progress) => {
          setOCRProgress(progress * 100);
        });
      } else {
        // Image OCR processing  
        result = await ocrService.processBOQImage(file, (progress) => {
          setOCRProgress(progress * 100);
        });
      }

      setExtractedData(result);
      setShowExtractedData(true);
      
      // Immediately auto-match the extracted items
      if (products && products.length > 0) {
        const matchedData = autoMatchBOQItems(result.items, products as Product[]);
        setMatchedItems(matchedData);
      } else {
        // If products not loaded yet, set items without matches
        setMatchedItems(result.items);
      }
      
      toast({
        title: "OCR processing completed",
        description: `Extracted ${result.items.length} items from the BOQ.`,
      });
    } catch (error) {
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "Failed to process BOQ file",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setOCRProgress(0);
    }
  }, [uploadBOQMutation, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg']
    },
    multiple: false,
  });

  const updateExtractedItem = (index: number, field: string, value: any) => {
    if (!extractedData) return;
    
    const updatedItems = [...extractedData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Recalculate amount if quantity or rate changed
    if (field === 'quantity' || field === 'rate') {
      updatedItems[index].amount = updatedItems[index].quantity * updatedItems[index].rate;
    }
    
    const totalValue = updatedItems.reduce((sum, item) => sum + item.amount, 0);
    
    setExtractedData({
      ...extractedData,
      items: updatedItems,
      totalValue,
    });
  };

  const createMaterialRequest = () => {
    if (!matchedItems || matchedItems.length === 0) {
      toast({
        title: "No items to process",
        description: "No BOQ items found to create material request.",
        variant: "destructive",
      });
      return;
    }

    const validItems = matchedItems.filter(item => item.matchedProductId);
    
    if (validItems.length === 0) {
      toast({
        title: "No products matched",
        description: "Please match at least one item to a product before creating a request.",
        variant: "destructive",
      });
      return;
    }

    // Open the material request modal with pre-filled data
    setShowRequestModal(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-100 text-yellow-800">Processing</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Upload BOQ PDF
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-gray-300 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            {isDragActive ? (
              <p className="text-lg font-medium text-primary">Drop the file here...</p>
            ) : (
              <>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Drop your BOQ Excel, PDF or Image here
                </h3>
                <p className="text-gray-600 mb-4">or click to browse files</p>
                <Button type="button">Choose File</Button>
                <p className="text-sm text-gray-500 mt-4">
                  Supported: Excel (.xlsx, .xls), PDF, PNG, JPG (Max size: 10MB)
                  <br />
                  <span className="text-green-600">⭐ Best: Excel files for accurate data parsing</span>
                  <br />
                  <span className="text-blue-600">📄 PDF: Text extraction • 📷 Images: OCR processing</span>
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Processing Status */}
      {isProcessing && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">Processing BOQ...</h4>
                <p className="text-sm text-gray-600">Extracting data using OCR technology</p>
              </div>
            </div>
            <div className="mt-4">
              <Progress value={ocrProgress} className="w-full" />
              <p className="text-sm text-gray-600 mt-2">{Math.round(ocrProgress)}% complete</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Extracted Data */}
      {showExtractedData && extractedData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Extracted BOQ Data
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setShowExtractedData(false)}
                >
                  Close
                </Button>
                <Button onClick={createMaterialRequest}>
                  Create Material Request
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Project Information */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-3">Project Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Project:</span>
                  <p className="text-gray-900">{extractedData.projectName || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Client:</span>
                  <p className="text-gray-900">{extractedData.client || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Work Order #:</span>
                  <p className="text-gray-900">{extractedData.workOrderNumber || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Work Order Date:</span>
                  <p className="text-gray-900">{extractedData.workOrderDate || 'N/A'}</p>
                </div>
              </div>
              {extractedData.description && (
                <div className="mt-3">
                  <span className="font-medium text-gray-700">Description:</span>
                  <p className="text-gray-900 text-sm mt-1">{extractedData.description}</p>
                </div>
              )}
              <div className="mt-3">
                <span className="font-medium text-gray-700">Total Items Extracted:</span>
                <span className="text-gray-900 ml-2">{extractedData.items.length}</span>
              </div>
            </div>

            {/* Matching Controls */}
            <div className="mb-4 flex gap-3">
              <Button 
                onClick={autoMatchAll} 
                variant="outline" 
                className="flex items-center gap-2"
                disabled={!products || products.length === 0}
              >
                <Zap className="w-4 h-4" />
                Auto-Match All
              </Button>
              <Button 
                onClick={clearAllMatches} 
                variant="outline" 
                className="flex items-center gap-2"
              >
                <Target className="w-4 h-4" />
                Clear Matches
              </Button>
              <div className="text-sm text-gray-600 flex items-center">
                {matchedItems.filter(item => item.matchedProductId).length} of {matchedItems.length} items matched
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Match Product</TableHead>
                    <TableHead>Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matchedItems.map((item, index) => {
                    const matchedProduct = products?.find((p: Product) => p.id === item.matchedProductId);
                    const availableMatches = products ? findProductMatches(item, products as Product[]).slice(0, 5) : [];
                    
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="text-sm font-medium">{item.description}</p>
                            {item.matchedFields && item.matchedFields.length > 0 && (
                              <p className="text-xs text-gray-500 mt-1">
                                Matched: {item.matchedFields.join(', ')}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const updatedItems = [...matchedItems];
                              updatedItems[index].quantity = parseFloat(e.target.value) || 0;
                              setMatchedItems(updatedItems);
                            }}
                            className="w-20 p-2 border border-gray-300 rounded text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={item.matchedProductId?.toString() || ""}
                            onValueChange={(value) => handleProductMatch(index, value === 'none' ? null : parseInt(value))}
                          >
                            <SelectTrigger className="w-64">
                              <SelectValue placeholder="Select product">
                                {matchedProduct ? (
                                  <div className="flex items-center gap-2">
                                    <span className="truncate">{matchedProduct.name}</span>
                                    {item.confidence && (
                                      <Badge 
                                        variant={item.confidence > 80 ? "default" : item.confidence > 60 ? "secondary" : "outline"}
                                        className="text-xs"
                                      >
                                        {item.confidence.toFixed(0)}%
                                      </Badge>
                                    )}
                                  </div>
                                ) : (
                                  "Select product"
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                <span className="text-gray-500">No match</span>
                              </SelectItem>
                              {/* Show matched products first if any */}
                              {availableMatches.length > 0 && (
                                <>
                                  {availableMatches.map((match) => {
                                    const product = products?.find((p: Product) => p.id === match.productId);
                                    if (!product) return null;
                                    return (
                                      <SelectItem key={product.id} value={product.id.toString()}>
                                        <div className="flex items-center justify-between w-full">
                                          <span className="truncate">{product.name} - {product.brand}</span>
                                          <Badge 
                                            variant={match.confidence > 80 ? "default" : match.confidence > 60 ? "secondary" : "outline"}
                                            className="text-xs ml-2"
                                          >
                                            {match.confidence.toFixed(0)}%
                                          </Badge>
                                        </div>
                                      </SelectItem>
                                    );
                                  })}
                                  <div className="px-2 py-1 text-xs text-gray-500 border-t">All Products:</div>
                                </>
                              )}
                              {/* Show all products */}
                              {products && products.length > 0 && products.map((product: Product) => (
                                <SelectItem key={`all-${product.id}`} value={product.id.toString()}>
                                  <span className="truncate">{product.name} - {product.brand} - {product.size || product.thickness || product.unit}</span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {item.confidence ? (
                            <Badge 
                              variant={item.confidence > 80 ? "default" : item.confidence > 60 ? "secondary" : "outline"}
                              className="text-xs"
                            >
                              {item.confidence.toFixed(0)}%
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-xs">No match</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Matching Summary */}
            <div className="pt-4 border-t">
              <div className="text-sm text-gray-600">
                {matchedItems.filter(item => item.matchedProductId).length} of {matchedItems.length} items matched
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Material Request Modal */}
      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="max-h-[85vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Create Material Request from BOQ</DialogTitle>
              <DialogDescription>
                Generate a material request using the matched items from the uploaded BOQ document
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto mt-4">
            <RequestFormSimplified
              initialData={{
                clientName: extractedData?.client || extractedData?.projectName || 'BOQ Project',
                orderNumber: extractedData?.workOrderNumber || `BOQ-${Date.now()}`,
                boqReference: `${extractedData?.projectName || 'BOQ'}-${extractedData?.workOrderNumber || Date.now()}`,
                remarks: `Created from BOQ: ${extractedData?.projectName || 'Imported BOQ'} (${matchedItems.filter(item => item.matchedProductId).length} items)${extractedData?.description ? ` - ${extractedData.description}` : ''}`,
                priority: 'medium',
                prefilledItems: matchedItems.filter(item => item.matchedProductId).map(item => ({
                  productId: item.matchedProductId!,
                  requestedQuantity: item.quantity,
                  unitPrice: item.rate,
                }))
              }}
              onSuccess={() => {
                setShowRequestModal(false);
                setShowExtractedData(false);
                setExtractedData(null);
                setMatchedItems([]);
                toast({
                  title: "Material request created",
                  description: "Request has been created from BOQ data.",
                });
              }}
              onClose={() => setShowRequestModal(false)}
            />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recent Uploads */}
      <Card>
        <CardHeader>
          <CardTitle>Recent BOQ Uploads</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingUploads ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {boqUploads?.map((upload: any) => (
                <div key={upload.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium">{upload.originalName}</p>
                      <p className="text-sm text-gray-600">
                        Uploaded {new Date(upload.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(upload.status)}
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {(!boqUploads || boqUploads.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No BOQ files uploaded yet</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
