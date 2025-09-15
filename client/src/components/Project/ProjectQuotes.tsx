import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Eye, Edit, Trash2, Download, Share, CheckCircle, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Quote Client Info Component  
function QuoteClientInfo({ quoteId }: { quoteId: number }) {
  const { data: quoteDetails } = useQuery({
    queryKey: ["/api/quotes", quoteId, "details-fresh"],
    queryFn: () => apiRequest(`/api/quotes/${quoteId}/details-fresh`),
    enabled: !!quoteId,
  });

  // Debug logging
  console.log("QuoteClientInfo - Full response:", quoteDetails);
  console.log("QuoteClientInfo - Client exists:", !!quoteDetails?.client);
  console.log("QuoteClientInfo - Client data:", JSON.stringify(quoteDetails?.client, null, 2));
  if (quoteDetails?.client) {
    console.log("QuoteClientInfo - Client keys:", Object.keys(quoteDetails.client));
    console.log("QuoteClientInfo - Client name:", quoteDetails.client.name);
  }

  if (!quoteDetails?.client) {
    return (
      <div style={{ fontSize: '11px', fontWeight: 'bold', lineHeight: '1.3' }}>
        <p style={{ margin: '0 0 3px 0' }}>To:</p>
        <p style={{ margin: '0' }}>Loading client information...</p>
      </div>
    );
  }

  const client = quoteDetails.client;
  return (
    <div style={{ fontSize: '11px', fontWeight: 'bold', lineHeight: '1.3' }}>
      <p style={{ margin: '0 0 3px 0' }}>To:</p>
      <p style={{ margin: '0' }}>{client.name || 'Client Name'}</p>
      {client.address1 && <p style={{ margin: '0' }}>{client.address1}</p>}
      {client.address2 && <p style={{ margin: '0' }}>{client.address2}</p>}
      <p style={{ margin: '0' }}>{client.city || 'City'}, {client.state || 'State'} - {client.pinCode || client.pin_code || 'Pin Code'}</p>
      {client.mobile && <p style={{ margin: '0' }}>Mobile: {client.mobile}</p>}
      {client.email && <p style={{ margin: '0' }}>Email: {client.email}</p>}
      {(client.gstNumber || client.gst_number) && <p style={{ margin: '0' }}>GST: {client.gstNumber || client.gst_number}</p>}
    </div>
  );
}

// Quote Items Table Component for PDF Preview
function QuoteItemsTable({ quoteId }: { quoteId: number }) {
  const { data: quoteDetails } = useQuery({
    queryKey: ["/api/quotes", quoteId, "details-fresh"],
    queryFn: () => apiRequest(`/api/quotes/${quoteId}/details-fresh`),
    enabled: !!quoteId,
  });

  if (!quoteDetails?.items) {
    return <div style={{ textAlign: 'center', padding: '20px', fontSize: '11px' }}>Loading items...</div>;
  }

  const items = quoteDetails.items;
  const subtotal = items.reduce((sum: number, item: any) => sum + (item.lineTotal || 0), 0);
  const packingCharges = quoteDetails.packingChargesAmount || 0;
  const transportationCharges = quoteDetails.transportationCharges || 0;
  const totalBeforeTax = subtotal + packingCharges + transportationCharges;
  const taxAmount = quoteDetails.taxAmount || 0;
  const grandTotal = quoteDetails.totalAmount || 0;

  return (
    <div style={{ fontSize: '10px', marginBottom: '15px' }}>
      {/* Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000' }}>
        <thead>
          <tr style={{ backgroundColor: '#f0f0f0' }}>
            <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', fontWeight: 'bold' }}>S.No</th>
            <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'left', fontWeight: 'bold' }}>Item Description</th>
            <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>Qty</th>
            <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>UOM</th>
            <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Rate</th>
            <th style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any, index: number) => (
            <tr key={index}>
              <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{index + 1}</td>
              <td style={{ border: '1px solid #000', padding: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {item.salesProduct?.imageUrl && (
                    <img 
                      src={item.salesProduct.imageUrl} 
                      alt={item.salesProduct?.name || item.itemName} 
                      style={{ width: '30px', height: '30px', objectFit: 'cover', border: '1px solid #ddd' }}
                    />
                  )}
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{item.salesProduct?.name || item.itemName}</div>
                    {(item.salesProduct?.description || item.description) && (
                      <div style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>
                        {item.salesProduct?.description || item.description}
                      </div>
                    )}
                    {item.size && (
                      <div style={{ fontSize: '9px', fontStyle: 'italic', marginTop: '1px' }}>
                        Size: {item.size}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>{item.quantity}</td>
              <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>pcs</td>
              <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>₹{item.unitPrice?.toLocaleString()}</td>
              <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>₹{item.lineTotal?.toLocaleString()}</td>
            </tr>
          ))}

          {/* Totals Section */}
          <tr>
            <td colSpan={5} style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
              Sub Total:
            </td>
            <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
              ₹{subtotal.toLocaleString()}
            </td>
          </tr>
          
          <tr>
            <td colSpan={5} style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>
              Packaging ({quoteDetails.packingChargesValue}%):
            </td>
            <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>
              ₹{packingCharges.toLocaleString()}
            </td>
          </tr>
          
          <tr>
            <td colSpan={5} style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>
              Transportation:
            </td>
            <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>
              ₹{transportationCharges.toLocaleString()}
            </td>
          </tr>
          
          <tr>
            <td colSpan={5} style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
              Total Before Tax:
            </td>
            <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
              ₹{totalBeforeTax.toLocaleString()}
            </td>
          </tr>
          
          <tr>
            <td colSpan={5} style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>
              GST (18%):
            </td>
            <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right' }}>
              ₹{taxAmount.toLocaleString()}
            </td>
          </tr>
          
          <tr style={{ backgroundColor: '#f0f0f0' }}>
            <td colSpan={5} style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '12px' }}>
              Grand Total:
            </td>
            <td style={{ border: '1px solid #000', padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '12px' }}>
              ₹{grandTotal.toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

interface ProjectQuotesProps {
  projectId: string;
}

interface Quote {
  id: number;
  quoteNumber: string;
  title: string;
  description?: string;
  clientId: number;
  clientName?: string;
  projectId?: number;
  subtotal: number;
  discountType: "percentage" | "fixed";
  discountValue: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  status: "draft" | "sent" | "approved" | "rejected" | "expired";
  validUntil?: string;
  expirationDate?: string;
  paymentTerms: string;
  pricelist: string;
  terms?: string;
  notes?: string;
  furnitureSpecifications?: string;
  createdAt: string;
  updatedAt: string;
}

interface QuoteItem {
  id?: number;
  quoteId?: number;
  salesProductId?: number;
  itemName: string;
  description?: string;
  quantity: number;
  uom: string;
  unitPrice: number;
  discountPercentage: number;
  discountAmount: number;
  taxPercentage: number;
  taxAmount: number;
  lineTotal: number;
  sortOrder?: number;
  notes?: string;
  size?: string; // Add size field for quote items
}

interface QuoteFormData {
  clientId: number;
  title: string;
  description?: string;
  validUntil?: string;
  expirationDate?: string;
  paymentTerms: string;
  pricelist: string;
  status?: string; // Add status field
  terms?: string;
  notes?: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
}

const quoteSchema = z.object({
  clientId: z.number().min(1, "Client is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  validUntil: z.string().optional(),
  expirationDate: z.string().optional(),
  paymentTerms: z.string().min(1, "Payment terms are required"),
  pricelist: z.string().min(1, "Pricelist is required"),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.number().min(0),
  terms: z.string().optional(),
  notes: z.string().optional(),
  status: z.string().optional(),
});

const quoteItemSchema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  uom: z.string().min(1, "UOM is required"),
  unitPrice: z.number().min(0, "Unit price must be positive"),
  discountPercentage: z.number().min(0).max(100),
  taxPercentage: z.number().min(0).max(100),
  size: z.string().optional(),
  salesProductId: z.number().optional(),
});

export default function ProjectQuotes({ projectId }: ProjectQuotesProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [uploadingQuotes, setUploadingQuotes] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [quoteFiles, setQuoteFiles] = useState<Record<number, any[]>>({});
  
  // Simplified upload states
  const [showSimpleUploadDialog, setShowSimpleUploadDialog] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [editingItem, setEditingItem] = useState<QuoteItem | null>(null);
  const [showItemDialog, setShowItemDialog] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Fetch files for a specific quote
  const fetchQuoteFiles = async (quoteId: number) => {
    try {
      const files = await apiRequest(`/api/quotes/${quoteId}/files`);
      setQuoteFiles(prev => ({ ...prev, [quoteId]: files }));
      return files;
    } catch (error) {
      console.error("Failed to fetch quote files:", error);
      return [];
    }
  };

  // Handle viewing uploaded file
  const handleViewFile = async (fileId: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({ 
          title: "Authentication required", 
          description: "Please log in to view files",
          variant: "destructive" 
        });
        return;
      }
      
      // Create a temporary URL with auth for viewing
      const response = await fetch(`/api/files/${fileId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch file');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // For PDFs, open in new tab with proper content type
      if (blob.type === 'application/pdf') {
        const newWindow = window.open(url, '_blank');
        if (newWindow) {
          newWindow.focus();
        }
      } else {
        // For images and other files, open in new tab
        window.open(url, '_blank');
      }
      
      // Clean up the object URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (error: any) {
      toast({
        title: "Error viewing file",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Handle downloading uploaded file  
  const handleDownloadFile = async (fileId: number, fileName: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({ 
          title: "Authentication required", 
          description: "Please log in to download files",
          variant: "destructive" 
        });
        return;
      }
      
      const response = await fetch(`/api/files/${fileId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to download file');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      
      // Clean up the object URL
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Error downloading file",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Fetch project quotes
  const {
    data: quotes = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["/api/projects", projectId, "quotes", searchTerm, statusFilter],
    queryFn: () =>
      apiRequest(
        `/api/projects/${projectId}/quotes?search=${searchTerm}&status=${statusFilter}`,
      ),
  });

  // Fetch files for uploaded quotes
  useEffect(() => {
    if (quotes && quotes.length > 0) {
      quotes.forEach((quote: Quote) => {
        if (quote.pricelist === "Uploaded Quote") {
          fetchQuoteFiles(quote.id);
        }
      });
    }
  }, [quotes]);

  // Fetch project client data
  const { data: projectData } = useQuery({
    queryKey: ["/api/projects", projectId],
    queryFn: () => apiRequest(`/api/projects/${projectId}`),
  });

  // Fetch sales products for items
  const { data: salesProducts = [] } = useQuery({
    queryKey: ["/api/quotes/products/list"],
    queryFn: () => apiRequest("/api/quotes/products/list"),
  });

  // Create quote mutation
  const createMutation = useMutation({
    mutationFn: (data: QuoteFormData & { items: QuoteItem[] }) =>
      apiRequest("/api/quotes", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          projectId: parseInt(projectId),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "quotes"] });
      setShowCreateDialog(false);
      setQuoteItems([]);
      toast({ title: "Quote created successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating quote",
        description: error.message,
        variant: "destructive",
      });
    },
  });



  // Delete quote mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/quotes/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "quotes"] });
      setShowDeleteDialog(false);
      setSelectedQuote(null);
      toast({ title: "Quote deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting quote",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Approve quote mutation - creates work order
  const approveQuoteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/quotes/${id}/approve`, {
        method: "POST",
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/work-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/production/dashboard"] });
      
      const description = data.workOrder 
        ? `Work order ${data.workOrder.orderNumber} has been created for production.`
        : "Quote has been approved successfully.";
        
      toast({ 
        title: "Quote approved successfully", 
        description 
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error approving quote",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Upload form setup
  const uploadForm = useForm({
    resolver: zodResolver(z.object({
      title: z.string().min(1, "Title is required"),
      totalAmount: z.number().min(0, "Total amount must be positive"),
      status: z.enum(["draft", "sent", "approved"]),
      description: z.string().optional(),
      paymentTerms: z.string().min(1, "Payment terms required"),
    })),
    defaultValues: {
      title: "",
      totalAmount: 0,
      status: "draft" as const,
      description: "",
      paymentTerms: "100% advance",
    },
  });

  // Quote upload mutation  
  const quoteUploadMutation = useMutation({
    mutationFn: async (data: any) => {
      const formData = new FormData();
      
      // Add quote details
      formData.append('quoteData', JSON.stringify({
        title: data.title,
        totalAmount: data.totalAmount,
        status: data.status,
        description: data.description,
        paymentTerms: data.paymentTerms,
        clientId: projectData?.clientId,
        projectId: parseInt(projectId),
      }));
      
      // Add files
      data.files.forEach((file: File) => {
        formData.append('files', file);
      });
      
      const response = await fetch(`/api/projects/${projectId}/quote-upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      toast({
        title: "Quote uploaded successfully",
        description: `Quote created with ${uploadFiles.length} attached file(s).`,
      });
      setUploadingQuotes(false);
      setShowUploadDialog(false);
      setUploadFiles([]);
      uploadForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error uploading quote",
        description: error.message,
        variant: "destructive",
      });
      setUploadingQuotes(false);
    },
  });

  // Handle file selection for upload
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Validate file types
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      toast({
        title: "Invalid file type",
        description: "Only PDF, JPG, and PNG files are allowed",
        variant: "destructive",
      });
      return;
    }

    // Validate file sizes (50MB max)
    const oversizedFiles = files.filter(file => file.size > 50 * 1024 * 1024);
    
    if (oversizedFiles.length > 0) {
      toast({
        title: "File too large",
        description: "Files must be under 50MB each",
        variant: "destructive",
      });
      return;
    }

    setUploadFiles(files);
    setShowUploadDialog(true);
    
    // Reset the input
    event.target.value = '';
  };

  // Submit quote upload
  const handleUploadSubmit = (data: any) => {
    if (uploadFiles.length === 0) {
      toast({
        title: "Please select files to upload",
        variant: "destructive",
      });
      return;
    }

    setUploadingQuotes(true);
    quoteUploadMutation.mutate({
      ...data,
      files: uploadFiles,
    });
  };

  // Simplified upload drag/drop handlers (like petty cash)
  const handleSimpleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleSimpleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleSimpleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    const validFile = files.find(file => 
      file.type === 'application/pdf' || 
      file.type === 'image/jpeg' ||
      file.type === 'image/jpg' ||
      file.type === 'image/png'
    );
    
    if (validFile) {
      // Check file size (50MB limit)
      if (validFile.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Files must be under 50MB",
          variant: "destructive",
        });
        return;
      }
      setUploadFile(validFile);
    } else {
      toast({ 
        title: "Invalid file", 
        description: "Please upload PDF, JPG, or PNG files only", 
        variant: "destructive" 
      });
    }
  };

  const handleSimplePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const fileItem = items.find(item => 
      item.type === 'application/pdf' || 
      item.type === 'image/jpeg' ||
      item.type === 'image/jpg' ||
      item.type === 'image/png'
    );
    
    if (fileItem) {
      const file = fileItem.getAsFile();
      if (file) {
        // Create a proper filename for pasted files
        const timestamp = Date.now();
        const extension = file.type.includes('pdf') ? '.pdf' : 
                         file.type.includes('png') ? '.png' : '.jpg';
        const renamedFile = new File([file], `quote-${timestamp}${extension}`, {
          type: file.type,
          lastModified: Date.now(),
        });
        
        setUploadFile(renamedFile);
        toast({ 
          title: "File pasted", 
          description: "Quote file added successfully" 
        });
      }
    }
  };

  // Form setup
  const form = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      title: "",
      description: "",
      paymentTerms: "Immediate Payment",
      pricelist: "Public Pricelist (EGP)",
      discountType: "percentage",
      discountValue: 0,
      terms: "",
      notes: "",
      clientId: projectData?.clientId || 0,
    },
  });

  const itemForm = useForm({
    resolver: zodResolver(quoteItemSchema),
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

  // Calculate line total for item
  const calculateLineTotal = (item: QuoteItem): number => {
    const baseAmount = item.quantity * item.unitPrice;
    const discountAmount = (baseAmount * item.discountPercentage) / 100;
    const afterDiscount = baseAmount - discountAmount;
    const taxAmount = (afterDiscount * item.taxPercentage) / 100;
    return afterDiscount + taxAmount;
  };

  // Handle product selection from dropdown
  const handleProductSelection = (productId: string) => {
    if (!productId) return;

    const selectedProduct = salesProducts.find(
      (p: any) => p.id.toString() === productId,
    );
    if (selectedProduct) {
      // Auto-populate product details
      itemForm.setValue("itemName", selectedProduct.name);
      itemForm.setValue(
        "description",
        selectedProduct.description ||
          selectedProduct.specifications ||
          `${selectedProduct.name} - Premium quality furniture product`,
      );
      itemForm.setValue("unitPrice", selectedProduct.unitPrice || 0);
      itemForm.setValue("uom", selectedProduct.unit || "pcs");

      // Set default quantity to 1 if not already set
      if (!itemForm.watch("quantity")) {
        itemForm.setValue("quantity", 1);
      }
    }
  };

  // Add item to quote
  const handleSaveItem = (data: any) => {
    const newItem: QuoteItem = {
      ...data,
      discountAmount:
        (data.quantity * data.unitPrice * data.discountPercentage) / 100,
      taxAmount:
        ((data.quantity * data.unitPrice -
          (data.quantity * data.unitPrice * data.discountPercentage) / 100) *
          data.taxPercentage) /
        100,
      lineTotal: 0,
    };
    newItem.lineTotal = calculateLineTotal(newItem);

    if (editingItem) {
      // Update existing item
      const itemIndex = quoteItems.findIndex((item, index) =>
        editingItem.id
          ? item.id === editingItem.id
          : index === quoteItems.indexOf(editingItem),
      );
      if (itemIndex !== -1) {
        const updatedItems = [...quoteItems];
        updatedItems[itemIndex] = { ...editingItem, ...newItem };
        setQuoteItems(updatedItems);
      }
      setEditingItem(null);
    } else {
      // Add new item
      setQuoteItems([...quoteItems, newItem]);
    }

    setShowItemDialog(false);
    itemForm.reset();
  };

  // Remove item from quote
  const removeItem = (index: number) => {
    const newItems = quoteItems.filter((_, i) => i !== index);
    setQuoteItems(newItems);
  };

  // Add from sales product
  const addFromSalesProduct = (product: any) => {
    const newItem: QuoteItem = {
      itemName: product.name,
      description: product.description || "",
      quantity: 1,
      uom: product.uom || "pcs",
      unitPrice: product.unitPrice || 0,
      discountPercentage: 0,
      discountAmount: 0,
      taxPercentage: 18,
      taxAmount: 0,
      lineTotal: 0,
      salesProductId: product.id,
    };
    newItem.lineTotal = calculateLineTotal(newItem);
    setQuoteItems([...quoteItems, newItem]);
  };

  // Function to generate quote title from project name
  const generateQuoteTitle = (projectName: string): string => {
    if (!projectName) return 'Estimate for Project';
    // Use the full project name as requested by the user
    return `Estimate for ${projectName}`;
  };



  // Calculate quote totals
  const calculateTotals = () => {
    const subtotal = quoteItems.reduce((sum, item) => {
      return sum + (item.quantity || 0) * (item.unitPrice || 0);
    }, 0);

    const totalDiscountAmount = quoteItems.reduce((sum, item) => {
      return sum + (item.discountAmount || 0);
    }, 0);

    const totalTaxAmount = quoteItems.reduce((sum, item) => {
      return sum + (item.taxAmount || 0);
    }, 0);

    const total = quoteItems.reduce(
      (sum, item) => sum + (item.lineTotal || 0),
      0,
    );

    return {
      subtotal: subtotal || 0,
      totalDiscountAmount: totalDiscountAmount || 0,
      totalTaxAmount: totalTaxAmount || 0,
      total: total || 0,
      // Also provide alternative names for compatibility
      totalDiscount: totalDiscountAmount || 0,
      totalTax: totalTaxAmount || 0,
      grandTotal: total || 0,
    };
  };

  const totals = calculateTotals();

  // Export PDF function with professional Furnili format
  const handleExportPDF = async (quote: Quote) => {
    try {
      // Fetch complete quote details including client and items
      const quoteDetailsResponse = await apiRequest(
        `/api/quotes/${quote.id}/details-fresh`,
      );

      // Extract client data from the quote details response
      const client = quoteDetailsResponse.client || {};
      const items = quoteDetailsResponse.items || [];

      console.log("=== FRONTEND DEBUG ===");
      console.log("Full API Response:", JSON.stringify(quoteDetailsResponse, null, 2));
      console.log("Client field exists:", !!quoteDetailsResponse.client);
      console.log("Client data:", JSON.stringify(quoteDetailsResponse.client, null, 2));
      console.log("=== END FRONTEND DEBUG ===");

      // Create professional PDF content matching Furnili format
      const element = document.createElement("div");
      element.innerHTML = `
        <div style="font-family: Arial, sans-serif; font-size: 12px; margin: 0; padding: 15px;">
          <!-- Header with Logo Only -->
          <div style="display: flex; justify-content: flex-start; align-items: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px;">
            <img src="${window.location.origin}/assets/furnili-logo.png" style="height: 45px;" alt="Furnili Logo" />
          </div>

          <!-- Quotation Title -->
          <div style="text-align: center; margin: 12px 0;">
            <h2 style="font-size: 20px; font-weight: bold; margin: 0; border-bottom: 2px solid #000; display: inline-block; padding-bottom: 3px;">Quotation</h2>
          </div>

          <!-- Client and Quote Details -->
          <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
            <div style="width: 60%;">
              <p style="margin: 0; line-height: 1.3;"><strong>To,</strong></p>
              <p style="margin: 0; font-weight: bold; line-height: 1.3;">${client.name || "N/A"}</p>
              ${client.address1 ? `<p style="margin: 0; line-height: 1.3;">${client.address1}</p>` : (client.address ? `<p style="margin: 0; line-height: 1.3;">${client.address}</p>` : '')}
              ${client.address2 ? `<p style="margin: 0; line-height: 1.3;">${client.address2}</p>` : ''}
              <p style="margin: 0; line-height: 1.3;">${client.city || "Pune"}, ${client.state || "MH"} - ${client.pinCode || client.pin_code || ""}</p>
              ${client.mobile ? `<p style="margin: 0; line-height: 1.3;">Mobile: ${client.mobile}</p>` : ''}
              ${client.email ? `<p style="margin: 0; line-height: 1.3;">Email: ${client.email}</p>` : ''}
              ${client.gstNumber || client.gst_number ? `<p style="margin: 0; line-height: 1.3;">GST: ${client.gstNumber || client.gst_number}</p>` : ''}
            </div>
            <div style="width: 35%; text-align: right;">
              <p style="margin: 0; line-height: 1.3;"><strong>Date :-</strong> ${new Date(quote.createdAt).toLocaleDateString("en-GB")}</p>
              <p style="margin: 0; line-height: 1.3;"><strong>Est. No. :-</strong> ${quote.quoteNumber}</p>
              <p style="margin: 0; line-height: 1.3;"><strong>GSTN :-</strong> 27AAKFF2192A1ZO</p>
              <p style="margin: 0; line-height: 1.3;"><strong>PAN :-</strong> AAKFF2192A</p>
              <p style="margin: 0; line-height: 1.3;"><strong>Contact Person :-</strong> ${client.contactPerson || client.name || "N/A"}</p>
            </div>
          </div>

          <!-- Subject Line -->
          <div style="margin: 10px 0; display: flex; justify-content: center;">
            <div style="width: 75%; padding: 6px 0; border-bottom: 1px solid #000;">
              <p style="font-size: 12px; margin: 0; font-weight: bold;">Subject: ${quote.title || "Furniture Quotation"}</p>
            </div>
          </div>

          <!-- Items Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 0px; font-size: 11px;">
            <thead>
              <tr style="background-color: #f0f0f0;">
                <th style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle; width: 40px;">Sr. No.</th>
                <th style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle; width: 120px;">Product </th>
                <th style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle;">Item Description</th>
                <th style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle; width: 80px;">Size</th>
                <th style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle; width: 50px;">Qty</th>
                <th style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle; width: 60px;">Rate</th>
                <th style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle; width: 90px;">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map((itemData: any, index: number) => {
                  const item = itemData.item || itemData; // Handle both nested and flat structures
                  const product = itemData.salesProduct || {};
                  const productImageUrl =
                    product.imageUrl && product.imageUrl.startsWith("/")
                      ? `${window.location.origin}${product.imageUrl}`
                      : product.imageUrl;

                  return `
                <tr>
                  <td style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle;">${index + 1}</td>
                  <td style="border: 1px solid #000; padding: 4px; vertical-align: middle;">
                    <div style="font-weight: bold; margin-bottom: 3px;">${item.itemName || product.name || "Product"}</div>
                    ${productImageUrl ? `<img src="${productImageUrl}" style="width: 70px; height: 50px; object-fit: cover; border: 1px solid #ccc;" onerror="this.style.display='none'" />` : '<div style="width: 70px; height: 50px; background-color: #f5f5f5; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #999;">No Image</div>'}
                  </td>
                  <td style="border: 1px solid #000; padding: 4px; vertical-align: middle;">${item.description || product.description || ""}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle;">${item.size || "-"}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle;">${item.quantity || 0}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: right; vertical-align: middle;">₹${(item.unitPrice || 0).toFixed(0)}</td>
                  <td style="border: 1px solid #000; padding: 4px; text-align: right; vertical-align: middle;">₹${((item.quantity || 0) * (item.unitPrice || 0)).toFixed(0)}</td>
                </tr>
              `;
                })
                .join("")}
              <!-- Blank row to continue table format -->
              <tr>
                <td style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle; height: 31px;"></td>
                <td style="border: 1px solid #000; padding: 4px; vertical-align: middle;"></td>
                <td style="border: 1px solid #000; padding: 4px; vertical-align: middle;"></td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle;"></td>
                <td style="border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle;"></td>
                <td style="border: 1px solid #000; padding: 4px; text-align: right; vertical-align: middle;"></td>
                <td style="border: 1px solid #000; padding: 4px; text-align: right; vertical-align: middle;"></td>
              </tr>
            </tbody>
          </table>

          <!-- Unified Totals Table with Professional Layout -->
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <!-- Total Row with Total in Words -->
            <tr>
              <td style="border: 1px solid #000; border-top: none; padding: 6px 8px; vertical-align: middle; width: calc(100% - 280px); height: 31px;">
                <div style="display: flex; align-items: center; height: 100%; justify-content: flex-start;">
                  <span style="font-size: 12px; font-weight: bold;">Total in Words: </span>
                  <span style="font-size: 11px; font-style: italic; margin-left: 4px; font-weight: bold;">
                  ${(() => {
                    // Calculate grand total for words conversion
                    const itemsTotal = items.reduce((sum: number, item: any) => sum + (item.lineTotal || (item.quantity * item.unitPrice) || 0), 0);
                    const packagingAmount = Math.round(itemsTotal * 0.02);
                    const transportationAmount = 5000;
                    const gstAmount = Math.round(itemsTotal * 0.18);
                    const grandTotal = itemsTotal + packagingAmount + transportationAmount + gstAmount;
                    
                    // Comprehensive number to words conversion
                    function numberToWords(num: number) {
                      if (num === 0) return 'Zero';
                      
                      const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
                      const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
                      const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
                      
                      function convertHundreds(n: number) {
                        let result = '';
                        if (n >= 100) {
                          result += ones[Math.floor(n / 100)] + ' Hundred';
                          n %= 100;
                          if (n > 0) result += ' ';
                        }
                        if (n >= 20) {
                          result += tens[Math.floor(n / 10)];
                          n %= 10;
                          if (n > 0) result += '-' + ones[n];
                        } else if (n >= 10) {
                          result += teens[n - 10];
                        } else if (n > 0) {
                          result += ones[n];
                        }
                        return result;
                      }
                      
                      let result = '';
                      
                      // Handle crores (10,000,000s)
                      if (num >= 10000000) {
                        result += convertHundreds(Math.floor(num / 10000000)) + ' Crore';
                        num %= 10000000;
                        if (num > 0) result += ' ';
                      }
                      
                      // Handle lakhs (100,000s)
                      if (num >= 100000) {
                        result += convertHundreds(Math.floor(num / 100000)) + ' Lakh';
                        num %= 100000;
                        if (num > 0) result += ' ';
                      }
                      
                      // Handle thousands
                      if (num >= 1000) {
                        result += convertHundreds(Math.floor(num / 1000)) + ' Thousand';
                        num %= 1000;
                        if (num > 0) result += ' ';
                      }
                      
                      // Handle remaining hundreds
                      if (num > 0) {
                        result += convertHundreds(num);
                      }
                      
                      return result.trim();
                    }
                    
                    const wordsAmount = numberToWords(grandTotal);
                    return wordsAmount + ' Rupees Only';
                  })()}
                  </span>
                </div>
              </td>
              <td style="border: 1px solid #000; border-left: none; border-top: none; padding: 6px 8px; text-align: right; vertical-align: middle; width: 190px; font-size: 11px;">Total</td>
              <td style="border: 1px solid #000; border-left: none; border-top: none; padding: 6px 8px; text-align: right; vertical-align: middle; width: 90px; font-size: 11px;">
                ₹${(() => {
                  const itemsTotal = items.reduce((sum: number, item: any) => sum + (item.lineTotal || (item.quantity * item.unitPrice) || 0), 0);
                  return itemsTotal.toLocaleString('en-IN');
                })()}
              </td>
            </tr>
            
            <!-- Furniture Specifications Row with Other Calculations -->
            <tr>
              <td style="border: 1px solid #000; border-top: none; padding: 6px 8px; vertical-align: middle; width: calc(100% - 280px);" rowspan="4">
                <h3 style="font-size: 12px; font-weight: bold; margin: 0 0 6px 0;">Furniture Specifications</h3>
                <p style="font-size: 10px; margin: 2px 0; line-height: 1.3;">- All furniture will be manufactured using Said Materials</p>
                <p style="font-size: 10px; margin: 2px 0; line-height: 1.3;">- All hardware considered of standard make.</p>
                <p style="font-size: 10px; margin: 2px 0; line-height: 1.3;">- Standard laminates considered as per selection.</p>
                <p style="font-size: 10px; margin: 2px 0; line-height: 1.3;">- Any modifications or changes in material selection may result in additional charges.</p>
              </td>
              <td style="border: 1px solid #000; border-left: none; border-top: none; padding: 6px 8px; text-align: right; vertical-align: middle; font-size: 11px;">Packaging @ 2%</td>
              <td style="border: 1px solid #000; border-left: none; border-top: none; padding: 6px 8px; text-align: right; vertical-align: middle; font-size: 11px;">
                ₹${(() => {
                  const itemsTotal = items.reduce((sum: number, item: any) => sum + (item.lineTotal || (item.quantity * item.unitPrice) || 0), 0);
                  const packagingAmount = Math.round(itemsTotal * 0.02);
                  return packagingAmount.toLocaleString('en-IN');
                })()}
              </td>
            </tr>
            
            <tr>
              <td style="border: 1px solid #000; border-left: none; border-top: none; padding: 6px 8px; text-align: right; vertical-align: middle; font-size: 11px;">Transportation</td>
              <td style="border: 1px solid #000; border-left: none; border-top: none; padding: 6px 8px; text-align: right; vertical-align: middle; font-size: 11px;">₹5,000</td>
            </tr>
            
            <tr>
              <td style="border: 1px solid #000; border-left: none; border-top: none; padding: 6px 8px; text-align: right; vertical-align: middle; font-size: 11px;">GST @ 18%</td>
              <td style="border: 1px solid #000; border-left: none; border-top: none; padding: 6px 8px; text-align: right; vertical-align: middle; font-size: 11px;">
                ₹${(() => {
                  const itemsTotal = items.reduce((sum: number, item: any) => sum + (item.lineTotal || (item.quantity * item.unitPrice) || 0), 0);
                  const gstAmount = Math.round(itemsTotal * 0.18);
                  return gstAmount.toLocaleString('en-IN');
                })()}
              </td>
            </tr>
            
            <tr style="font-weight: bold;">
              <td style="border: 1px solid #000; border-left: none; border-top: none; padding: 6px 8px; text-align: right; vertical-align: middle; background-color: #f0f0f0; font-size: 11px; font-weight: bold;">Grand Total</td>
              <td style="border: 1px solid #000; border-left: none; border-top: none; padding: 6px 8px; text-align: right; vertical-align: middle; background-color: #f0f0f0; font-size: 11px; font-weight: bold;">
                ₹${(() => {
                  const itemsTotal = items.reduce((sum: number, item: any) => sum + (item.lineTotal || (item.quantity * item.unitPrice) || 0), 0);
                  const packagingAmount = Math.round(itemsTotal * 0.02);
                  const transportationAmount = 5000;
                  const gstAmount = Math.round(itemsTotal * 0.18);
                  const grandTotal = itemsTotal + packagingAmount + transportationAmount + gstAmount;
                  return grandTotal.toLocaleString('en-IN');
                })()}
              </td>
            </tr>
          </table>

          <!-- Bottom Section: 3-Part Layout with Borders - Aligned with Table Columns -->
          <div style="display: flex; align-items: stretch;">
            <!-- Left: Payment Terms - Matches Furniture Specifications Width -->
            <div style="border: 1px solid #000; border-top: none; padding: 4px; flex: 1; border-right: none; display: flex; flex-direction: column; justify-content: center;">
              <div>
                <h3 style="font-size: 11px; font-weight: bold; margin: 0 0 2px 0;">Payment Terms</h3>
                <p style="font-size: 9px; margin: 0px 0; line-height: 1.1;">30% Advance Payment: Due upon order confirmation.</p>
                <p style="font-size: 9px; margin: 0px 0; line-height: 1.1;">50% Payment Before Delivery: To be settled prior to dispatch.</p>
                <p style="font-size: 9px; margin: 0px 0; line-height: 1.1;">20% Payment on Delivery</p>
              </div>
            </div>
            
            <!-- Middle: Bank Details - Exactly matches Size + Qty column widths (130px) -->
            <div style="border: 1px solid #000; border-top: none; padding: 4px; width: 130px; border-right: none; display: flex; flex-direction: column; justify-content: center;">
              <div>
                <h3 style="font-size: 11px; font-weight: bold; margin: 0 0 2px 0;">Bank Details</h3>
                <p style="font-size: 9px; margin: 0px 0; line-height: 1.1;">A/C Name: Furnili</p>
                <p style="font-size: 9px; margin: 0px 0; line-height: 1.1;">Bank: ICICI Bank</p>
                <p style="font-size: 9px; margin: 0px 0; line-height: 1.1;">Branch: Nigdi</p>
                <p style="font-size: 9px; margin: 0px 0; line-height: 1.1;">A/C No.: 230505006647</p>
                <p style="font-size: 9px; margin: 0px 0; line-height: 1.1;">IFSC: ICIC0002305</p>
              </div>
            </div>
            
            <!-- Right: Authorised Signatory - Matches Rate + Total Amount columns (150px) -->
            <div style="border: 1px solid #000; border-top: none; padding: 4px; width: 150px; display: flex; flex-direction: column; justify-content: center; align-items: center;">
              <!-- Company stamp at top -->
              <div style="margin-bottom: 4px;">
                <img src="${window.location.origin}/assets/furnili-signature-stamp.png" style="width: 70px; height: auto;" alt="Furnili Signature Stamp" onerror="this.style.display='none'" />
              </div>
              
              <!-- Text without signature line -->
              <div style="text-align: center;">
                <p style="font-size: 9px; margin: 0 0 1px 0; font-weight: bold; line-height: 1.0;">Authorised Signatory</p>
                <p style="font-size: 9px; margin: 0; font-weight: bold; line-height: 1.0;">for FURNILI</p>
              </div>
            </div>
          </div>

          <!-- Black Footer -->
          <div style="background-color: #000; color: white; padding: 8px; margin-top: 0px; text-align: center;">
            <h3 style="margin: 0; font-size: 14px; font-weight: bold; letter-spacing: 1px; color: white;">Furnili - Bespoke Modular Furniture</h3>
            <p style="margin: 4px 0 0 0; font-size: 10px;">Sr.no - 31/1, Pisoli Road, Near Mohan Marbel, Pisoli,, Pune - 411048</p>
            <p style="margin: 2px 0 0 0; font-size: 10px; font-weight: bold;">+91 9823 011 223 &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp; info@furnili.com</p>
          </div>
        </div>
      `;

      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5] as [number, number, number, number],
        filename: `${quote.quoteNumber}_Furnili_Quote.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: false, letterRendering: false },
        jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
      };

      // Import html2pdf dynamically
      const { default: html2pdf } = await import("html2pdf.js");
      html2pdf().set(opt).from(element).save();

      toast({
        title: "Professional PDF Generated",
        description: "Furnili branded quote PDF downloaded successfully.",
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Share quote function - Generate PDF and share on WhatsApp
  const handleShareQuote = async (quote: Quote) => {
    try {
      toast({
        title: "Generating PDF for sharing...",
        description: "Please wait while we prepare your quote PDF for WhatsApp sharing.",
      });

      // Load quote details for PDF generation
      const quoteDetails = await apiRequest(`/api/quotes/${quote.id}/details-fresh`);
      
      // Generate PDF content (same as handleExportPDF but for sharing)
      const element = document.createElement('div');
      element.innerHTML = `
        <div style="font-family: Arial, sans-serif; background: white; color: black; padding: 20px; max-width: 800px; margin: 0 auto;">
          <!-- Header Section -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #000;">
            <div>
              <img src="${window.location.origin}/assets/furnili-logo.png" style="height: 45px; margin-bottom: 8px;" alt="Furnili Logo" />
              <div style="font-size: 11px; font-weight: bold; line-height: 1.2;">
                <p style="margin: 0;">Sr.no - 31/1, Pisoli Road, Near Mohan Marbel,</p>
                <p style="margin: 0;">Pisoli, Pune - 411048</p>
                <p style="margin: 2px 0 0 0;">+91 9823 011 223 | info@furnili.com</p>
              </div>
            </div>
            <div style="text-align: right;">
              <h1 style="font-size: 22px; font-weight: bold; margin: 0 0 8px 0; color: #8B4513;">QUOTATION</h1>
              <div style="font-size: 11px; font-weight: bold;">
                <p style="margin: 0;">Quote No: ${quote.quoteNumber}</p>
                <p style="margin: 2px 0 0 0;">Date: ${new Date(quote.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <!-- Client Information -->
          <div style="margin-bottom: 15px; font-size: 11px; font-weight: bold; line-height: 1.3;">
            <p style="margin: 0 0 3px 0;">To:</p>
            <p style="margin: 0;">${quoteDetails.client?.name || 'Client Name'}</p>
            ${quoteDetails.client?.address1 ? `<p style="margin: 0;">${quoteDetails.client.address1}</p>` : ''}
            ${quoteDetails.client?.address2 ? `<p style="margin: 0;">${quoteDetails.client.address2}</p>` : ''}
            <p style="margin: 0;">${quoteDetails.client?.city || 'City'}, ${quoteDetails.client?.state || 'State'} - ${quoteDetails.client?.pinCode || 'Pin Code'}</p>
            ${quoteDetails.client?.mobile ? `<p style="margin: 0;">Mobile: ${quoteDetails.client.mobile}</p>` : ''}
            ${quoteDetails.client?.email ? `<p style="margin: 0;">Email: ${quoteDetails.client.email}</p>` : ''}
            <p style="margin: 0;">Mobile: ${quoteDetails.client?.mobile || 'Mobile'}</p>
          </div>

          <!-- Project Details -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px; font-size: 11px; font-weight: bold;">
            <div>Subject: ${quote.title}</div>
            <div style="text-align: right;">Price List: ${quote.pricelist}</div>
          </div>

          <!-- Items Table -->
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 10px; margin-bottom: 15px;">
            <thead>
              <tr style="background-color: #f0f0f0;">
                <th style="border: 1px solid #000; padding: 8px; text-align: left; font-weight: bold;">S.No</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: left; font-weight: bold;">Item Description</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">Qty</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">UOM</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold;">Rate</th>
                <th style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${quoteDetails.items?.map((item: any, index: number) => `
                <tr>
                  <td style="border: 1px solid #000; padding: 8px; text-align: center;">${index + 1}</td>
                  <td style="border: 1px solid #000; padding: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      ${item.salesProduct?.imageUrl ? `<img src="${item.salesProduct.imageUrl}" style="width: 30px; height: 30px; object-fit: cover; border: 1px solid #ddd;" />` : ''}
                      <div>
                        <div style="font-weight: bold;">${item.salesProduct?.name || item.itemName}</div>
                        ${(item.salesProduct?.description || item.description) ? `<div style="font-size: 9px; color: #666; margin-top: 2px;">${item.salesProduct?.description || item.description}</div>` : ''}
                        ${item.size ? `<div style="font-size: 9px; font-style: italic; margin-top: 1px;">Size: ${item.size}</div>` : ''}
                      </div>
                    </div>
                  </td>
                  <td style="border: 1px solid #000; padding: 8px; text-align: center;">${item.quantity}</td>
                  <td style="border: 1px solid #000; padding: 8px; text-align: center;">pcs</td>
                  <td style="border: 1px solid #000; padding: 8px; text-align: right;">₹${item.unitPrice?.toLocaleString()}</td>
                  <td style="border: 1px solid #000; padding: 8px; text-align: right;">₹${item.lineTotal?.toLocaleString()}</td>
                </tr>
              `).join('')}
              
              <!-- Totals -->
              <tr>
                <td colspan="5" style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold;">Sub Total:</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold;">₹${quote.subtotal?.toLocaleString()}</td>
              </tr>
              <tr>
                <td colspan="5" style="border: 1px solid #000; padding: 8px; text-align: right;">Packaging (${quoteDetails.packingChargesValue}%):</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">₹${quoteDetails.packingChargesAmount?.toLocaleString()}</td>
              </tr>
              <tr>
                <td colspan="5" style="border: 1px solid #000; padding: 8px; text-align: right;">Transportation:</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">₹${quoteDetails.transportationCharges?.toLocaleString()}</td>
              </tr>
              <tr>
                <td colspan="5" style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold;">Total Before Tax:</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold;">₹${(quote.subtotal + quoteDetails.packingChargesAmount + quoteDetails.transportationCharges)?.toLocaleString()}</td>
              </tr>
              <tr>
                <td colspan="5" style="border: 1px solid #000; padding: 8px; text-align: right;">GST (18%):</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right;">₹${quote.taxAmount?.toLocaleString()}</td>
              </tr>
              <tr style="background-color: #f0f0f0;">
                <td colspan="5" style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold; font-size: 12px;">Grand Total:</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold; font-size: 12px;">₹${quote.totalAmount?.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <!-- Bottom Section -->
          <div style="display: grid; grid-template-columns: 3fr 1fr; gap: 20px; font-size: 10px; margin-bottom: 15px;">
            <div>
              <div style="margin-bottom: 10px;">
                <p style="margin: 0; font-weight: bold;">Furniture Specifications:</p>
                <div style="white-space: pre-line; line-height: 1.4; margin-top: 3px;">
                  ${quote.furnitureSpecifications || 'All furniture will be manufactured using Said Materials\\n- All hardware considered of standard make.\\n- Standard laminates considered as per selection.\\n- Any modifications or changes in material selection may result in additional charges.'}
                </div>
              </div>
              <p style="margin: 0; font-weight: bold;">Payment Terms: ${quote.paymentTerms}</p>
              ${quote.terms ? `<div style="margin-top: 6px;"><p style="margin: 0; font-weight: bold;">Terms & Conditions:</p><div style="white-space: pre-line; margin-top: 3px;">${quote.terms}</div></div>` : ''}
              ${quote.notes ? `<div style="margin-top: 6px;"><p style="margin: 0; font-weight: bold;">Notes:</p><div style="white-space: pre-line; margin-top: 3px;">${quote.notes}</div></div>` : ''}
            </div>
            <div style="text-align: center; padding-top: 20px;">
              <img src="${window.location.origin}/assets/furnili-signature-stamp.png" style="width: 70px; height: auto; margin-bottom: 8px;" alt="Furnili Signature" />
              <div>
                <p style="font-size: 9px; margin: 0 0 1px 0; font-weight: bold;">Authorised Signatory</p>
                <p style="font-size: 9px; margin: 0; font-weight: bold;">for FURNILI</p>
              </div>
            </div>
          </div>

          <!-- Black Footer -->
          <div style="background-color: #000; color: white; padding: 8px; text-align: center;">
            <h3 style="margin: 0; font-size: 14px; font-weight: bold; letter-spacing: 1px;">Furnili - Bespoke Modular Furniture</h3>
            <p style="margin: 4px 0 0 0; font-size: 10px;">Sr.no - 31/1, Pisoli Road, Near Mohan Marbel, Pisoli, Pune - 411048</p>
            <p style="margin: 2px 0 0 0; font-size: 10px; font-weight: bold;">+91 9823 011 223 &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp; info@furnili.com</p>
          </div>
        </div>
      `;

      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5] as [number, number, number, number],
        filename: `${quote.quoteNumber}_Furnili_Quote.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: false, letterRendering: false },
        jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
      };

      // Generate PDF blob for sharing
      const { default: html2pdf } = await import("html2pdf.js");
      
      // Create a blob instead of directly downloading
      const pdfBlob = await html2pdf().set(opt).from(element).outputPdf('blob');
      
      // Create a File object from the blob
      const pdfFile = new File([pdfBlob], `${quote.quoteNumber}_Furnili_Quote.pdf`, { type: 'application/pdf' });

      // Check if Web Share API supports files
      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: `Quote ${quote.quoteNumber}`,
          text: `${quote.title} - ₹${quote.totalAmount.toLocaleString()}\n\nFurnili - Bespoke Modular Furniture\n+91 9823 011 223`,
        });
        
        toast({
          title: "PDF Shared Successfully",
          description: "Quote PDF shared successfully. You can now send it via WhatsApp.",
        });
      } else {
        // Fallback: Create WhatsApp sharing URL with text and prompt user to attach PDF
        const whatsappText = encodeURIComponent(
          `*Quote ${quote.quoteNumber}* 📋\n\n` +
          `${quote.title}\n` +
          `Amount: ₹${quote.totalAmount.toLocaleString()}\n` +
          `Payment Terms: ${quote.paymentTerms}\n\n` +
          `*Furnili - Bespoke Modular Furniture*\n` +
          `📞 +91 9823 011 223\n` +
          `📧 info@furnili.com\n\n` +
          `_PDF quote attached below_`
        );
        
        // Also download the PDF for manual sharing
        html2pdf().set(opt).from(element).save();
        
        // Open WhatsApp with the message
        const whatsappUrl = `https://wa.me/?text=${whatsappText}`;
        window.open(whatsappUrl, '_blank');
        
        toast({
          title: "WhatsApp Opened & PDF Downloaded",
          description: "WhatsApp opened with quote details. PDF downloaded - please attach it manually to complete sharing.",
        });
      }
    } catch (error) {
      console.error("Share error:", error);
      toast({
        title: "Error",
        description: "Failed to share quote. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle form submission
  const handleSubmit = (data: QuoteFormData) => {
    if (quoteItems.length === 0) {
      toast({
        title: "Please add at least one item to the quote",
        variant: "destructive",
      });
      return;
    }

    const quoteTotals = calculateTotals();
    const quoteData = {
      ...data,
      clientId: projectData?.clientId || data.clientId,
      subtotal: quoteTotals.subtotal,
      discountAmount: quoteTotals.totalDiscountAmount,
      taxAmount: quoteTotals.totalTaxAmount,
      totalAmount: quoteTotals.total,
      items: quoteItems,
    };

    createMutation.mutate(quoteData);
  };



  const getStatusBadge = (status: string) => {
    const variants = {
      draft: "secondary",
      sent: "outline",
      approved: "default",
      rejected: "destructive",
      expired: "secondary",
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // Filter quotes based on search and status
  const filteredQuotes = (quotes || [])
    .filter((quote: Quote) => {
      const matchesSearch =
        searchTerm === "" ||
        quote.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quote.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (quote.description &&
          quote.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus =
        statusFilter === "all" || quote.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort(
      (a: Quote, b: Quote) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mobile-Optimized Header */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Project Quotes</h2>
          <p className="text-sm text-muted-foreground">
            Manage quotes for this project
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {/* Quote Upload Button */}
          <div className="relative">
            <input
              id="quote-upload"
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="input-quote-upload"
            />
            <Button 
              variant="outline"
              className="w-full sm:w-auto h-8 text-xs"
              onClick={() => document.getElementById('quote-upload')?.click()}
              disabled={uploadingQuotes}
            >
              {uploadingQuotes ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
              ) : (
                <Upload className="h-3 w-3 mr-1" />
              )}
              Upload Quote
            </Button>
          </div>

          <Button
            onClick={() => setShowSimpleUploadDialog(true)}
            variant="outline"
            className="w-full sm:w-auto h-8 text-xs bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
            data-testid="button-quick-upload"
          >
            <Upload className="h-3 w-3 mr-1" />
            Quick Upload
          </Button>

          <Button 
            className="w-full sm:w-auto h-8 text-xs bg-[hsl(28,100%,25%)] hover:bg-[hsl(28,100%,20%)]"
            onClick={() => setLocation(`/projects/${projectId}/quotes/create`)}
          >
            <Plus className="h-3 w-3 mr-1" />
            New Quote
          </Button>
        </div>

      </div>

      {/* Quote Statistics Summary */}
      {quotes && quotes.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="text-center">
              <div className="text-lg font-bold">{quotes.length}</div>
              <div className="text-xs text-muted-foreground">Total Quotes</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {quotes.filter((q: Quote) => q.status === "approved").length}
              </div>
              <div className="text-xs text-muted-foreground">Approved</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {quotes.filter((q: Quote) => q.status === "sent").length}
              </div>
              <div className="text-xs text-muted-foreground">Sent</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-lg font-bold">
                ₹{quotes.reduce((sum: number, q: Quote) => sum + (q.totalAmount || 0), 0).toFixed(0)}
              </div>
              <div className="text-xs text-muted-foreground">Total Value</div>
            </div>
          </Card>
        </div>
      )}

      {/* Mobile-Optimized Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search quotes by title or number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36 h-8 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quotes List */}
      {filteredQuotes.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-muted-foreground">
            <h3 className="text-lg font-medium mb-2">No quotes found</h3>
            <p className="text-sm">
              {quotes && quotes.length === 0
                ? "Get started by creating your first quote"
                : "Try adjusting your search or filter criteria"}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredQuotes.map((quote: Quote) => (
            <Card key={quote.id} className="p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <h3 
                      className="font-medium truncate cursor-pointer hover:text-brown-600 hover:underline"
                      onClick={() => {
                        setSelectedQuote(quote);
                        setShowViewDialog(true);
                      }}
                    >
                      {quote.title}
                    </h3>
                    <span className="text-xs text-muted-foreground">{quote.quoteNumber}</span>
                    {getStatusBadge(quote.status)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="font-medium text-black">₹{quote.totalAmount?.toLocaleString() || 0}</span>
                    <span className="truncate">{quote.paymentTerms}</span>
                    <span>{new Date(quote.createdAt).toLocaleDateString()}</span>
                    {quote.description && (
                      <span className="truncate italic">{quote.description}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      setSelectedQuote(quote);
                      setShowViewDialog(true);
                    }}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setLocation(`/projects/${projectId}/quotes/${quote.id}/edit`)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleExportPDF(quote)}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  {/* File buttons for uploaded quotes */}
                  {quoteFiles[quote.id] && quoteFiles[quote.id].length > 0 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleViewFile(quoteFiles[quote.id][0].id)}
                        title="View uploaded file"
                      >
                        <FileText className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleDownloadFile(quoteFiles[quote.id][0].id, quoteFiles[quote.id][0].originalName)}
                        title="Download uploaded file"
                      >
                        <Download className="h-3 w-3 text-blue-600" />
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => handleShareQuote(quote)}
                  >
                    <Share className="h-3 w-3" />
                  </Button>
                  {quote.status !== 'approved' && (
                    <Button
                      variant="default"
                      size="sm"
                      className="h-6 w-6 p-0 bg-green-600 hover:bg-green-700"
                      onClick={() => approveQuoteMutation.mutate(quote.id)}
                      disabled={approveQuoteMutation.isPending}
                      title="Approve quote and create work order"
                    >
                      <CheckCircle className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      setSelectedQuote(quote);
                      setShowDeleteDialog(true);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* View Quote Dialog - Exact PDF Layout */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto p-2">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg">Quote Preview - {selectedQuote?.quoteNumber}</DialogTitle>
            <DialogDescription className="text-sm">
              Exact PDF layout preview
            </DialogDescription>
          </DialogHeader>
          {selectedQuote && (
            <div className="bg-white text-black p-4 border rounded" style={{ fontFamily: 'Arial, sans-serif' }}>
              {/* Header Section - Exact PDF Match */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start', 
                marginBottom: '20px',
                paddingBottom: '10px',
                borderBottom: '1px solid #000'
              }}>
                <div>
                  <img src="/assets/furnili-logo.png" alt="Furnili Logo" style={{ height: '45px', marginBottom: '8px' }} />
                  <div style={{ fontSize: '11px', lineHeight: '1.2' }}>
                    <p style={{ margin: '0', fontWeight: 'bold' }}>Sr.no - 31/1, Pisoli Road, Near Mohan Marbel,</p>
                    <p style={{ margin: '0', fontWeight: 'bold' }}>Pisoli, Pune - 411048</p>
                    <p style={{ margin: '2px 0 0 0', fontWeight: 'bold' }}>+91 9823 011 223 | info@furnili.com</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#8B4513' }}>QUOTATION</h1>
                  <div style={{ fontSize: '11px', fontWeight: 'bold' }}>
                    <p style={{ margin: '0' }}>Quote No: {selectedQuote.quoteNumber}</p>
                    <p style={{ margin: '2px 0 0 0' }}>Date: {new Date(selectedQuote.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Client Information - Exact PDF Match */}
              <div style={{ marginBottom: '15px' }}>
                <QuoteClientInfo quoteId={selectedQuote.id} />
              </div>

              {/* Project Details - Exact PDF Match */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '20px', 
                marginBottom: '15px',
                fontSize: '11px',
                fontWeight: 'bold'
              }}>
                <div>
                  <p style={{ margin: '0' }}>Subject: {selectedQuote.title}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0' }}>Price List: {selectedQuote.pricelist}</p>
                </div>
              </div>

              {/* Items Table - Exact PDF Match */}
              <QuoteItemsTable quoteId={selectedQuote.id} />

              {/* Bottom Section - Exact PDF Match */}
              <div style={{ marginTop: '15px' }}>
                {/* Furniture Specifications */}
                <div style={{ fontSize: '10px', marginBottom: '10px' }}>
                  <p style={{ margin: '0', fontWeight: 'bold' }}>Furniture Specifications:</p>
                  <div style={{ whiteSpace: 'pre-line', lineHeight: '1.4', marginTop: '3px' }}>
                    {selectedQuote.furnitureSpecifications || 'All furniture will be manufactured using Said Materials\n- All hardware considered of standard make.\n- Standard laminates considered as per selection.\n- Any modifications or changes in material selection may result in additional charges.'}
                  </div>
                </div>

                {/* Payment Terms Section */}
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '20px', fontSize: '10px' }}>
                  <div>
                    <p style={{ margin: '0 0 6px 0', fontWeight: 'bold' }}>Payment Terms: {selectedQuote.paymentTerms}</p>
                    {selectedQuote.terms && (
                      <div style={{ marginBottom: '10px', lineHeight: '1.4' }}>
                        <p style={{ margin: '0', fontWeight: 'bold' }}>Terms & Conditions:</p>
                        <div style={{ whiteSpace: 'pre-line', marginTop: '3px' }}>{selectedQuote.terms}</div>
                      </div>
                    )}
                    {selectedQuote.notes && (
                      <div style={{ marginBottom: '10px', lineHeight: '1.4' }}>
                        <p style={{ margin: '0', fontWeight: 'bold' }}>Notes:</p>
                        <div style={{ whiteSpace: 'pre-line', marginTop: '3px' }}>{selectedQuote.notes}</div>
                      </div>
                    )}
                  </div>

                  {/* Signature Section */}
                  <div style={{ textAlign: 'center', paddingTop: '20px' }}>
                    <img 
                      src="/assets/furnili-signature-stamp.png" 
                      alt="Furnili Signature" 
                      style={{ width: '70px', height: 'auto', margin: '0 auto 8px auto', display: 'block' }}
                    />
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '9px', margin: '0 0 1px 0', fontWeight: 'bold', lineHeight: '1.0' }}>Authorised Signatory</p>
                      <p style={{ fontSize: '9px', margin: '0', fontWeight: 'bold', lineHeight: '1.0' }}>for FURNILI</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Black Footer - Exact PDF Match */}
              <div style={{ 
                backgroundColor: '#000', 
                color: 'white', 
                padding: '8px', 
                marginTop: '15px',
                textAlign: 'center',
                borderRadius: '4px'
              }}>
                <h3 style={{ margin: '0', fontSize: '14px', fontWeight: 'bold', letterSpacing: '1px' }}>
                  Furnili - Bespoke Modular Furniture
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '10px' }}>
                  Sr.no - 31/1, Pisoli Road, Near Mohan Marbel, Pisoli, Pune - 411048
                </p>
                <p style={{ margin: '2px 0 0 0', fontSize: '10px', fontWeight: 'bold' }}>
                  +91 9823 011 223 &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp; info@furnili.com
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4 pt-2 border-t">
                <Button onClick={() => handleExportPDF(selectedQuote)} className="bg-[hsl(28,100%,25%)] hover:bg-[hsl(28,100%,20%)]">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button 
                  variant="outline" 
                  onClick={async () => {
                    setShowViewDialog(false);
                    
                    // Load existing quote items for duplication
                    if (selectedQuote) {
                      try {
                        const quoteDetails = await apiRequest(`/api/quotes/${selectedQuote.id}/details`);
                        const existingItems = quoteDetails.items?.map((item: any) => ({
                          itemName: item.itemName || item.salesProduct?.name || '',
                          description: item.description || item.salesProduct?.description || '',
                          quantity: item.quantity || 1,
                          uom: item.uom || 'pcs',
                          unitPrice: item.unitPrice || 0,
                          discountPercentage: item.discountPercentage || 0,
                          discountAmount: item.discountAmount || 0,
                          taxPercentage: item.taxPercentage || 18,
                          taxAmount: item.taxAmount || 0,
                          lineTotal: item.lineTotal || 0,
                          size: item.size || '',
                          salesProductId: item.salesProductId || null,
                        })) || [];
                        setQuoteItems(existingItems);
                        
                        // Pre-populate form with existing quote data
                        form.reset({
                          title: projectData ? generateQuoteTitle(projectData.name) : 'New Quote',
                          description: selectedQuote.description || '',
                          paymentTerms: selectedQuote.paymentTerms || '100% advance',
                          pricelist: selectedQuote.pricelist || 'Public Pricelist (EGP)',
                          discountType: selectedQuote.discountType || 'percentage',
                          discountValue: selectedQuote.discountValue || 0,
                          terms: selectedQuote.terms || '',
                          notes: selectedQuote.notes || '',
                          clientId: selectedQuote.clientId || 0,
                        });
                      } catch (error) {
                        console.error('Failed to load quote for duplication:', error);
                        setQuoteItems([]);
                      }
                    }
                    
                    setShowCreateDialog(true);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Duplicate & Edit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>



      {/* Delete Quote Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quote</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedQuote?.title}" ({selectedQuote?.quoteNumber})? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (selectedQuote) {
                  deleteMutation.mutate(selectedQuote.id);
                }
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quote Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Quote</DialogTitle>
            <DialogDescription>
              Add quote details and attach files
            </DialogDescription>
          </DialogHeader>

          <Form {...uploadForm}>
            <form onSubmit={uploadForm.handleSubmit(handleUploadSubmit)} className="space-y-3">
              {/* Files Preview */}
              <div className="border rounded-lg p-3 bg-gray-50">
                <div className="text-xs font-medium mb-2">Files to Upload:</div>
                {uploadFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs text-gray-600">
                    <FileText className="h-3 w-3" />
                    <span className="truncate">{file.name}</span>
                    <span className="text-gray-400">({(file.size / 1024 / 1024).toFixed(1)}MB)</span>
                  </div>
                ))}
              </div>

              {/* Title */}
              <FormField
                control={uploadForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Quote Title *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="h-8 text-sm" 
                        placeholder="e.g., Office Furniture Quote"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Total Amount */}
              <FormField
                control={uploadForm.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Total Amount (₹) *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number"
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        className="h-8 text-sm" 
                        placeholder="50000"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status */}
              <FormField
                control={uploadForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Payment Terms */}
              <FormField
                control={uploadForm.control}
                name="paymentTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Payment Terms</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-8 text-sm">
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

              {/* Description */}
              <FormField
                control={uploadForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        className="text-sm resize-none" 
                        rows={2}
                        placeholder="Any additional notes..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Action Buttons */}
              <div className="flex gap-2 pt-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowUploadDialog(false)}
                  className="flex-1 h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={uploadingQuotes}
                  className="flex-1 h-8 text-xs bg-[hsl(28,100%,25%)] hover:bg-[hsl(28,100%,20%)]"
                >
                  {uploadingQuotes ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                      Uploading...
                    </>
                  ) : (
                    "Create Quote"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Simplified Quote Upload Dialog */}
      <Dialog open={showSimpleUploadDialog} onOpenChange={setShowSimpleUploadDialog}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Quick Upload Quote</DialogTitle>
            <DialogDescription>
              Drag & drop or paste your quote file, then add basic details
            </DialogDescription>
          </DialogHeader>

          <Form {...uploadForm}>
            <form onSubmit={uploadForm.handleSubmit((data) => {
              if (!uploadFile) {
                toast({
                  title: "Please select a file to upload",
                  variant: "destructive",
                });
                return;
              }
              setUploadingQuotes(true);
              setUploadFiles([uploadFile]); // Set for success toast
              quoteUploadMutation.mutate({
                ...data,
                files: [uploadFile],
              });
            })} className="space-y-3">
              
              {/* Drag & Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive
                    ? 'border-blue-300 bg-blue-50'
                    : uploadFile
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={handleSimpleDragOver}
                onDragLeave={handleSimpleDragLeave}
                onDrop={handleSimpleDrop}
                onPaste={handleSimplePaste}
                tabIndex={0}
              >
                {uploadFile ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <Upload className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-600 truncate">
                        {uploadFile.name}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {(uploadFile.size / 1024 / 1024).toFixed(1)}MB • {uploadFile.type.includes('pdf') ? 'PDF' : 'Image'}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setUploadFile(null)}
                      className="text-xs h-6"
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <Upload className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">Drop files here or paste (Ctrl+V)</p>
                      <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG files only • Max 50MB</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.pdf,.jpg,.jpeg,.png';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            if (file.size > 50 * 1024 * 1024) {
                              toast({
                                title: "File too large",
                                description: "Files must be under 50MB",
                                variant: "destructive",
                              });
                              return;
                            }
                            setUploadFile(file);
                          }
                        };
                        input.click();
                      }}
                      className="text-xs h-6"
                    >
                      Choose File
                    </Button>
                  </div>
                )}
              </div>

              {/* Title */}
              <FormField
                control={uploadForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Quote Title</FormLabel>
                    <FormControl>
                      <Input {...field} className="h-8 text-xs" placeholder="Enter quote title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Total Amount */}
              <FormField
                control={uploadForm.control}
                name="totalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Total Amount (₹)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        className="h-8 text-xs"
                        placeholder="0.00"
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Payment Terms */}
              <FormField
                control={uploadForm.control}
                name="paymentTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Payment Terms</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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

              {/* Action Buttons */}
              <div className="flex gap-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowSimpleUploadDialog(false);
                    setUploadFile(null);
                  }}
                  className="flex-1 h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={uploadingQuotes || !uploadFile}
                  className="flex-1 h-8 text-xs bg-[hsl(28,100%,25%)] hover:bg-[hsl(28,100%,20%)]"
                >
                  {uploadingQuotes ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
                      Uploading...
                    </>
                  ) : (
                    "Upload Quote"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
