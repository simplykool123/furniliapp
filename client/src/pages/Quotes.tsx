import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, FileText, Download, Edit, Trash2, Eye, Calculator, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";
import FurniliCard from "@/components/UI/FurniliCard";
import FurniliStatsCard from "@/components/UI/FurniliStatsCard";
import { apiRequest, queryClient } from "@/lib/queryClient";
// @ts-ignore
import html2pdf from "html2pdf.js";

// Types
interface QuoteItem {
  id?: number;
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
  sortOrder: number;
}

interface Quote {
  id: number;
  quoteNumber: string;
  clientId: number;
  projectId?: number;
  title: string;
  description?: string;
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
  createdAt: string;
  updatedAt: string;
}

interface QuoteFormData {
  clientId: number;
  projectId?: number;
  title: string;
  description?: string;
  validUntil?: string;
  expirationDate?: string;
  paymentTerms: string;
  pricelist: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  terms?: string;
  notes?: string;
}

const quoteSchema = z.object({
  clientId: z.number().min(1, "Client is required"),
  projectId: z.number().optional(),
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
});

const quoteItemSchema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  uom: z.string().min(1, "UOM is required"),
  unitPrice: z.number().min(0, "Unit price must be positive"),
  discountPercentage: z.number().min(0).max(100),
  taxPercentage: z.number().min(0).max(100),
});

export default function Quotes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createMode, setCreateMode] = useState<'full' | 'quick'>('full');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [editingItem, setEditingItem] = useState<QuoteItem | null>(null);
  const [showItemDialog, setShowItemDialog] = useState(false);

  const { toast } = useToast();

  // Fetch quotes
  const { data: quotes = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/quotes', searchTerm, statusFilter, clientFilter],
    queryFn: () => apiRequest(`/api/quotes?search=${searchTerm}&status=${statusFilter}&clientId=${clientFilter !== 'all' ? clientFilter : ''}`),
  });

  // Fetch clients for dropdown
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/quotes/clients/list'],
    queryFn: () => apiRequest('/api/quotes/clients/list'),
  });

  // Fetch projects for dropdown
  const { data: projects = [] } = useQuery({
    queryKey: ['/api/projects'],
    queryFn: () => apiRequest('/api/projects'),
  });

  // Fetch sales products for items
  const { data: salesProducts = [] } = useQuery({
    queryKey: ['/api/quotes/products/list'],
    queryFn: () => apiRequest('/api/quotes/products/list'),
  });

  // Create quote mutation
  const createMutation = useMutation({
    mutationFn: (data: QuoteFormData & { items: QuoteItem[] }) => 
      apiRequest('/api/quotes', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      setShowCreateDialog(false);
      setQuoteItems([]);
      toast({ title: "Quote created successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error creating quote", description: error.message, variant: "destructive" });
    },
  });

  // Update quote mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: QuoteFormData & { items: QuoteItem[] } }) => 
      apiRequest(`/api/quotes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      setShowEditDialog(false);
      setQuoteItems([]);
      toast({ title: "Quote updated successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error updating quote", description: error.message, variant: "destructive" });
    },
  });

  // Delete quote mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/quotes/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/quotes'] });
      setShowDeleteDialog(false);
      setSelectedQuote(null);
      toast({ title: "Quote deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error deleting quote", description: error.message, variant: "destructive" });
    },
  });

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
    },
  });

  // Calculate totals
  const calculateTotals = (items: QuoteItem[], discountType: string, discountValue: number) => {
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const discountAmount = discountType === "percentage" 
      ? (subtotal * discountValue) / 100 
      : discountValue;
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0);
    const totalAmount = afterDiscount + taxAmount;

    return { subtotal, discountAmount, taxAmount, totalAmount };
  };

  // Handle item calculations
  const calculateItemAmounts = (item: Partial<QuoteItem>): QuoteItem => {
    const baseAmount = (item.quantity || 0) * (item.unitPrice || 0);
    const discountAmount = (baseAmount * (item.discountPercentage || 0)) / 100;
    const afterDiscount = baseAmount - discountAmount;
    const taxAmount = (afterDiscount * (item.taxPercentage || 0)) / 100;
    const lineTotal = afterDiscount + taxAmount;

    return {
      id: item.id,
      salesProductId: item.salesProductId,
      itemName: item.itemName || '',
      description: item.description || '',
      quantity: item.quantity || 0,
      uom: item.uom || 'pcs',
      unitPrice: item.unitPrice || 0,
      discountPercentage: item.discountPercentage || 0,
      discountAmount,
      taxPercentage: item.taxPercentage || 0,
      taxAmount,
      lineTotal,
      sortOrder: item.sortOrder || 0,
    };
  };

  // Add/Edit item
  const handleSaveItem = (data: any) => {
    const calculatedItem = calculateItemAmounts(data);
    
    if (editingItem) {
      setQuoteItems(prev => prev.map(item => 
        item === editingItem ? { ...calculatedItem, id: item.id, sortOrder: item.sortOrder } : item
      ));
    } else {
      setQuoteItems(prev => [...prev, {
        ...calculatedItem,
        sortOrder: prev.length,
      }]);
    }
    
    setShowItemDialog(false);
    setEditingItem(null);
    itemForm.reset();
  };

  // Add item from sales product
  const addFromSalesProduct = (product: any) => {
    const newItem = calculateItemAmounts({
      salesProductId: product.id,
      itemName: product.name,
      description: product.description,
      quantity: 1,
      uom: "pcs",
      unitPrice: product.unitPrice,
      discountPercentage: 0,
      taxPercentage: product.taxPercentage || 18,
    });

    setQuoteItems(prev => [...prev, {
      ...newItem,
      sortOrder: prev.length,
    }]);
  };

  // Submit quote
  const onSubmit = (data: QuoteFormData) => {
    const totals = calculateTotals(quoteItems, data.discountType, data.discountValue);
    
    const quoteData = {
      ...data,
      ...totals,
      items: quoteItems,
    };

    if (selectedQuote) {
      updateMutation.mutate({ id: selectedQuote.id, data: quoteData });
    } else {
      createMutation.mutate(quoteData);
    }
  };

  // Export to PDF
  const exportToPDF = async (quote: any) => {
    try {
      const response = await fetch(`/api/quotes/${quote.quote.id}/pdf`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to generate PDF');
      const data = await response.json();
      
      const opt = {
        margin: 10,
        filename: data.filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: false, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().set(opt).from(data.html).save();
    } catch (error) {
      toast({ title: "Error generating PDF", description: "Failed to export quote", variant: "destructive" });
    }
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'sent': return 'default';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'expired': return 'outline';
      default: return 'secondary';
    }
  };

  // Stats calculations
  const totalQuotes = Array.isArray(quotes) ? quotes.length : 0;
  const draftQuotes = Array.isArray(quotes) ? quotes.filter((q: any) => q.quote.status === 'draft').length : 0;
  const approvedQuotes = Array.isArray(quotes) ? quotes.filter((q: any) => q.quote.status === 'approved').length : 0;
  const totalValue = Array.isArray(quotes) ? quotes.reduce((sum: number, q: any) => sum + q.quote.totalAmount, 0) : 0;

  if (isLoading) {
    return (
      <ResponsiveLayout title="Quotes Management" subtitle="Professional quote generation and management">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-200 animate-pulse rounded-xl"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 animate-pulse rounded-xl"></div>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout title="Quotes Management" subtitle="Professional quote generation and management">
      <div className="space-y-6">
        {/* Stats Cards - Mobile Optimized */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <FurniliStatsCard
            title="Total"
            value={totalQuotes.toString()}
            icon={FileText}
            trend={{ value: 0, isPositive: true }}
          />
          <FurniliStatsCard
            title="Draft"
            value={draftQuotes.toString()}
            icon={Edit}
            trend={{ value: 0, isPositive: true }}
          />
          <FurniliStatsCard
            title="Approved"
            value={approvedQuotes.toString()}
            icon={Calculator}
            trend={{ value: 0, isPositive: true }}
          />
          <FurniliStatsCard
            title="Value"
            value={`₹${(totalValue/1000).toFixed(0)}K`}
            icon={Calculator}
            trend={{ value: 0, isPositive: true }}
          />
        </div>

        {/* Controls - Mobile Optimized */}
        <FurniliCard>
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search quotes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-8 text-sm"
              />
            </div>
            
            {/* Filters and Create Button */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="grid grid-cols-2 gap-2 flex-1">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs">
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

                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {clients.map((client: any) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 sm:w-auto w-full">
                <Dialog open={showCreateDialog} onOpenChange={(open) => { setShowCreateDialog(open); if (!open) setCreateMode('full'); }}>
                  <DialogTrigger asChild>
                    <Button className="h-8 text-xs px-3 flex-1 sm:flex-none">
                      <Plus className="h-3 w-3 mr-1" />
                      New Quote
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[98vw] max-h-[95vh] overflow-y-auto p-2 sm:p-6">
                    <DialogHeader className="pb-2">
                      <DialogTitle className="text-sm sm:text-base">Create New Quote</DialogTitle>
                      
                      {/* Mode Toggle */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          type="button"
                          variant={createMode === 'quick' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCreateMode('quick')}
                          className="flex-1 h-8 text-xs"
                        >
                          Quick Upload
                        </Button>
                        <Button
                          type="button"
                          variant={createMode === 'full' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCreateMode('full')}
                          className="flex-1 h-8 text-xs"
                        >
                          Full Quote
                        </Button>
                      </div>
                    </DialogHeader>
                    
                    {createMode === 'quick' ? (
                      <QuickUploadForm
                        form={form}
                        onSubmit={onSubmit}
                        clients={clients}
                        projects={projects}
                        isSubmitting={createMutation.isPending}
                      />
                    ) : (
                      <QuoteForm
                        form={form}
                        onSubmit={onSubmit}
                        clients={clients}
                        projects={projects}
                        salesProducts={salesProducts}
                        quoteItems={quoteItems}
                        setQuoteItems={setQuoteItems}
                        editingItem={editingItem}
                        setEditingItem={setEditingItem}
                        showItemDialog={showItemDialog}
                        setShowItemDialog={setShowItemDialog}
                        itemForm={itemForm}
                        handleSaveItem={handleSaveItem}
                        addFromSalesProduct={addFromSalesProduct}
                        calculateTotals={calculateTotals}
                        isSubmitting={createMutation.isPending}
                      />
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </FurniliCard>

        {/* Quotes List - Mobile Optimized */}
        <FurniliCard>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Quote #</TableHead>
                  <TableHead className="text-xs">Client</TableHead>
                  <TableHead className="text-xs">Project</TableHead>
                  <TableHead className="text-xs">Title</TableHead>
                  <TableHead className="text-xs">Amount</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Valid Until</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(quotes) && quotes.map((item: any) => (
                  <TableRow key={item.quote.id}>
                    <TableCell className="font-medium text-xs">{item.quote.quoteNumber}</TableCell>
                    <TableCell className="text-xs">
                      <div>
                        <div className="font-medium">{item.client?.name}</div>
                        <div className="text-gray-500">{item.client?.city}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {item.project ? (
                        <div>
                          <div className="font-medium">{item.project.name}</div>
                          <div className="text-gray-500">{item.project.code}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">No Project</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>
                        <div className="font-medium">{item.quote.title}</div>
                        {item.quote.description && (
                          <div className="text-gray-500 truncate max-w-32">{item.quote.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-xs">₹{(item.quote.totalAmount/1000).toFixed(0)}K</TableCell>
                    <TableCell className="text-xs">
                      <Badge variant={getStatusVariant(item.quote.status)} className="text-xs">
                        {item.quote.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {item.quote.validUntil ? new Date(item.quote.validUntil).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => exportToPDF(item)}>
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedQuote(item.quote);
                            form.reset({
                              clientId: item.quote.clientId,
                              projectId: item.quote.projectId,
                              title: item.quote.title,
                              description: item.quote.description,
                              paymentTerms: item.quote.paymentTerms,
                              pricelist: item.quote.pricelist,
                              discountType: item.quote.discountType,
                              discountValue: item.quote.discountValue,
                              terms: item.quote.terms,
                              notes: item.quote.notes,
                            });
                            setShowEditDialog(true);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedQuote(item.quote);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {Array.isArray(quotes) && quotes.map((item: any) => (
              <div key={item.quote.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-sm">{item.quote.quoteNumber}</div>
                    <div className="text-xs text-gray-500">{item.client?.name}</div>
                  </div>
                  <Badge variant={getStatusVariant(item.quote.status)} className="text-xs">
                    {item.quote.status}
                  </Badge>
                </div>
                
                <div className="text-sm font-medium">{item.quote.title}</div>
                <div className="text-xs text-gray-500 truncate">{item.quote.description}</div>
                
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium">₹{(item.quote.totalAmount/1000).toFixed(0)}K</span>
                  <span className="text-gray-500">
                    {item.quote.validUntil ? new Date(item.quote.validUntil).toLocaleDateString() : 'No expiry'}
                  </span>
                </div>
                
                <div className="flex gap-1 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 h-7 text-xs"
                    onClick={() => exportToPDF(item)}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-7 text-xs"
                    onClick={() => {
                      setSelectedQuote(item.quote);
                      form.reset({
                        clientId: item.quote.clientId,
                        projectId: item.quote.projectId,
                        title: item.quote.title,
                        description: item.quote.description,
                        paymentTerms: item.quote.paymentTerms,
                        pricelist: item.quote.pricelist,
                        discountType: item.quote.discountType,
                        discountValue: item.quote.discountValue,
                        terms: item.quote.terms,
                        notes: item.quote.notes,
                      });
                      setShowEditDialog(true);
                    }}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => {
                      setSelectedQuote(item.quote);
                      setShowDeleteDialog(true);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </FurniliCard>

        {/* Edit Dialog */}
        {showEditDialog && selectedQuote && (
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="max-w-[98vw] max-h-[95vh] overflow-y-auto p-2 sm:p-6">
              <DialogHeader className="pb-2">
                <DialogTitle className="text-sm sm:text-base">Edit Quote - {selectedQuote.quoteNumber}</DialogTitle>
              </DialogHeader>
              <QuoteForm
                form={form}
                onSubmit={onSubmit}
                clients={clients}
                projects={projects}
                salesProducts={salesProducts}
                quoteItems={quoteItems}
                setQuoteItems={setQuoteItems}
                editingItem={editingItem}
                setEditingItem={setEditingItem}
                showItemDialog={showItemDialog}
                setShowItemDialog={setShowItemDialog}
                itemForm={itemForm}
                handleSaveItem={handleSaveItem}
                addFromSalesProduct={addFromSalesProduct}
                calculateTotals={calculateTotals}
                isSubmitting={updateMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you Freaking Sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete quote "{selectedQuote?.quoteNumber}". 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => selectedQuote && deleteMutation.mutate(selectedQuote.id)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Quote
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ResponsiveLayout>
  );
}

// Quote Form Component
function QuoteForm({
  form,
  onSubmit,
  clients,
  projects,
  salesProducts,
  quoteItems,
  setQuoteItems,
  editingItem,
  setEditingItem,
  showItemDialog,
  setShowItemDialog,
  itemForm,
  handleSaveItem,
  addFromSalesProduct,
  calculateTotals,
  isSubmitting,
}: any) {
  const totals = calculateTotals(
    quoteItems, 
    form.watch('discountType'), 
    form.watch('discountValue')
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Client *</FormLabel>
                <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                  <FormControl>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clients.map((client: any) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name} - {client.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="projectId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Project</FormLabel>
                <Select onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} value={field.value?.toString()}>
                  <FormControl>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select project (optional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">No Project</SelectItem>
                    {projects.map((project: any) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.name} ({project.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Quote Title *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Enter quote title" className="h-8" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Description</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Quote description" className="min-h-[60px]" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Quote Items */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Quote Items</h3>
            <div className="flex gap-2">
              <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingItem ? 'Edit Item' : 'Add Item'}</DialogTitle>
                  </DialogHeader>
                  <QuoteItemForm 
                    form={itemForm}
                    onSubmit={handleSaveItem}
                    salesProducts={salesProducts}
                    editingItem={editingItem}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Sales Products Quick Add - Mobile Optimized */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium">Quick Add Products:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 max-h-24 overflow-y-auto">
              {Array.isArray(salesProducts) && salesProducts.map((product: any) => (
                <Button
                  key={product.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addFromSalesProduct(product)}
                  className="justify-start text-left h-auto p-1.5"
                >
                  <div>
                    <div className="font-medium text-xs truncate">{product.name}</div>
                    <div className="text-xs text-gray-500">₹{product.unitPrice}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Items Table - Mobile Optimized */}
          {quoteItems.length > 0 && (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Item</TableHead>
                      <TableHead className="text-xs">Qty</TableHead>
                      <TableHead className="text-xs">UOM</TableHead>
                      <TableHead className="text-xs">Rate</TableHead>
                      <TableHead className="text-xs">Disc%</TableHead>
                      <TableHead className="text-xs">Tax%</TableHead>
                      <TableHead className="text-xs">Amount</TableHead>
                      <TableHead className="text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quoteItems.map((item: QuoteItem, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="text-xs">
                          <div>
                            <div className="font-medium">{item.itemName}</div>
                            {item.description && <div className="text-gray-500">{item.description}</div>}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{item.quantity}</TableCell>
                        <TableCell className="text-xs">{item.uom}</TableCell>
                        <TableCell className="text-xs">₹{item.unitPrice}</TableCell>
                        <TableCell className="text-xs">{item.discountPercentage}%</TableCell>
                        <TableCell className="text-xs">{item.taxPercentage}%</TableCell>
                        <TableCell className="text-xs font-medium">₹{item.lineTotal.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingItem(item);
                                itemForm.reset({
                                  itemName: item.itemName,
                                  description: item.description,
                                  quantity: item.quantity,
                                  uom: item.uom,
                                  unitPrice: item.unitPrice,
                                  discountPercentage: item.discountPercentage,
                                  taxPercentage: item.taxPercentage,
                                });
                                setShowItemDialog(true);
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setQuoteItems((prev: QuoteItem[]) => prev.filter((i: QuoteItem) => i !== item))}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Item Cards */}
              <div className="sm:hidden space-y-2">
                {quoteItems.map((item: QuoteItem, index: number) => (
                  <div key={index} className="border rounded-lg p-2 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium text-xs">{item.itemName}</div>
                        {item.description && <div className="text-xs text-gray-500">{item.description}</div>}
                      </div>
                      <div className="text-xs font-medium">₹{item.lineTotal.toFixed(0)}</div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Qty:</span> {item.quantity}
                      </div>
                      <div>
                        <span className="text-gray-500">UOM:</span> {item.uom}
                      </div>
                      <div>
                        <span className="text-gray-500">Rate:</span> ₹{item.unitPrice}
                      </div>
                      <div>
                        <span className="text-gray-500">Disc:</span> {item.discountPercentage}%
                      </div>
                    </div>
                    
                    <div className="flex gap-1 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1 h-6 text-xs"
                        onClick={() => {
                          setEditingItem(item);
                          itemForm.reset({
                            itemName: item.itemName,
                            description: item.description,
                            quantity: item.quantity,
                            uom: item.uom,
                            unitPrice: item.unitPrice,
                            discountPercentage: item.discountPercentage,
                            taxPercentage: item.taxPercentage,
                          });
                          setShowItemDialog(true);
                        }}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => setQuoteItems((prev: QuoteItem[]) => prev.filter((i: QuoteItem) => i !== item))}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Totals - Mobile Optimized */}
          {quoteItems.length > 0 && (
            <div className="space-y-1 bg-gray-50 p-2 rounded text-xs">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{totals.subtotal.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount:</span>
                <span>-₹{totals.discountAmount.toFixed(0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>₹{totals.taxAmount.toFixed(0)}</span>
              </div>
              <div className="flex justify-between font-bold border-t pt-1 text-sm">
                <span>Total:</span>
                <span>₹{totals.totalAmount.toFixed(0)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Quote Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="paymentTerms"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Payment Terms</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Payment terms" className="h-8" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="pricelist"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Pricelist</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Pricelist" className="h-8" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FormField
            control={form.control}
            name="discountType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Discount Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Discount type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="discountValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Discount Value</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="number" 
                    placeholder="0" 
                    className="h-8"
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="validUntil"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Valid Until</FormLabel>
                <FormControl>
                  <Input {...field} type="date" className="h-8" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="terms"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Terms & Conditions</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Terms and conditions" className="min-h-[60px]" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Internal Notes</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Internal notes" className="min-h-[60px]" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button 
            type="submit" 
            disabled={isSubmitting || quoteItems.length === 0}
            className="h-8 text-xs px-4"
          >
            {isSubmitting ? "Saving..." : "Save Quote"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Quote Item Form Component - Mobile Optimized
function QuoteItemForm({ form, onSubmit, salesProducts, editingItem }: any) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
        <FormField
          control={form.control}
          name="itemName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Item Name *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Enter item name" className="h-8 text-sm" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Description</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Item description" className="min-h-[50px] text-sm" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Qty *</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="number" 
                    placeholder="1" 
                    className="h-8 text-sm"
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="uom"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">UOM *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pcs">Pieces</SelectItem>
                    <SelectItem value="sqft">Square Feet</SelectItem>
                    <SelectItem value="lm">Linear Meter</SelectItem>
                    <SelectItem value="kg">Kilogram</SelectItem>
                    <SelectItem value="set">Set</SelectItem>
                    <SelectItem value="lot">Lot</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="unitPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Price *</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="number" 
                    placeholder="0" 
                    className="h-8 text-sm"
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <FormField
            control={form.control}
            name="discountPercentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Discount %</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="number" 
                    placeholder="0" 
                    className="h-8 text-sm"
                    min="0"
                    max="100"
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="taxPercentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">Tax %</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="number" 
                    placeholder="18" 
                    className="h-8 text-sm"
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" className="h-8 text-xs px-4">
            {editingItem ? "Update Item" : "Add Item"}
          </Button>
        </div>
      </form>
    </Form>
  );
}