import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Upload,
  Download,
  File,
  Image,
  FileText,
  Calendar,
  User,
  MessageSquare,
  Phone,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  Tag,
  Users,
  BarChart3,
  Target,
  MessageCircle,
  Mail,
  ExternalLink,
  Paperclip,
  FolderOpen,
  Camera,
  Building2,
  MapPin,
  Star,
  Circle,
  CheckCircle2,
  Eye,
  RefreshCw,
  X,
  MoreVertical,
} from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Project, Client } from "@shared/schema";
import { useLocation } from "wouter";
import { Link } from "wouter";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";
import FurniliCard from "@/components/UI/FurniliCard";
import FurniliButton from "@/components/UI/FurniliButton";
import ProjectQuotes from "@/components/Project/ProjectQuotes";
import { authService, authenticatedApiRequest } from "@/lib/auth";
import ProjectActivities from "@/components/Project/ProjectActivities";
import ProjectWorkOrders from "@/components/Project/ProjectWorkOrders";

// Schemas for various forms
const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  assignedTo: z.string().optional(),
  assignedToOther: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  status: z.enum(["pending", "in-progress", "completed"]).default("pending"),
}).refine(
  (data) => {
    // If "other" is selected, assignedToOther must be provided
    if (data.assignedTo === "other") {
      return data.assignedToOther && data.assignedToOther.trim().length > 0;
    }
    return true;
  },
  {
    message: "Please enter a name when selecting 'Others'",
    path: ["assignedToOther"],
  }
);

const noteSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Note content is required"),
  type: z.enum(["note", "meeting", "call", "email"]).default("note"),
  taggedUsers: z.array(z.string()).optional(),
});

const communicationSchema = z.object({
  type: z.enum(["whatsapp", "email", "call", "meeting"]),
  content: z.string().min(1, "Content is required"),
  contactPerson: z.string().optional(),
  followUpDate: z.string().optional(),
  status: z.enum(["pending", "completed"]).default("pending"),
});

const uploadSchema = z.object({
  type: z.string().min(1, "Type is required"),
  title: z.string().min(1, "Title is required"),
  files: z.any().optional(),
});

const moodboardSchema = z.object({
  name: z.string().min(1, "Moodboard name is required"),
  keywords: z.string().min(1, "Keywords are required"),
  roomType: z.string().min(1, "Room type is required"),
  inspirationType: z.enum(["ai", "real"]),
});

// Project Financials Component
function ProjectFinancials({ projectId }: { projectId: string }) {
  const [dateFilter, setDateFilter] = useState("all");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // Fetch project petty cash expenses
  const { data: projectExpenses, isLoading: expensesLoading } = useQuery({
    queryKey: ["/api/petty-cash", "project", projectId],
    queryFn: async () => {
      const response = await fetch(`/api/petty-cash?projectId=${projectId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch petty cash expenses");
      }
      return response.json();
    },
  });

  // Fetch project material requests/orders
  const { data: materialOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/requests", "project", projectId],
    queryFn: async () => {
      const response = await fetch(`/api/requests?projectId=${projectId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch material orders");
      }
      return response.json();
    },
  });

  // Calculate totals
  const pettyCashTotal =
    projectExpenses?.reduce((sum: number, expense: any) => {
      return expense.status === "expense" ? sum + expense.amount : sum;
    }, 0) || 0;

  const materialOrdersTotal =
    materialOrders?.reduce((sum: number, order: any) => {
      // Only include issued/completed orders, exclude cancelled/rejected orders
      if (order.status === 'cancelled' || order.status === 'rejected') {
        return sum;
      }
      return sum + (order.totalValue || 0);
    }, 0) || 0;

  const totalProjectCost = pettyCashTotal + materialOrdersTotal;

  if (expensesLoading || ordersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Loading financial data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">
                  Petty Cash Expenses
                </p>
                <p className="text-lg font-bold text-blue-600">
                  ₹{pettyCashTotal.toLocaleString()}
                </p>
                <p className="text-[10px] text-gray-500">
                  {projectExpenses?.filter((e: any) => e.status === "expense")
                    .length || 0}{" "}
                  transactions
                </p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Target className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Material Orders</p>
                <p className="text-lg font-bold text-green-600">
                  ₹{materialOrdersTotal.toLocaleString()}
                </p>
                <p className="text-[10px] text-gray-500">
                  {materialOrders?.length || 0} orders
                </p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">Total Project Cost</p>
                <p className="text-lg font-bold text-amber-600">
                  ₹{totalProjectCost.toLocaleString()}
                </p>
                <p className="text-[10px] text-gray-500">Combined expenses</p>
              </div>
              <div className="h-8 w-8 bg-amber-100 rounded-full flex items-center justify-center">
                <Target className="h-4 w-4 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href={`/petty-cash?projectId=${projectId}`}>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add Petty Cash Expense
          </Button>
        </Link>
        <Link href={`/requests?projectId=${projectId}`}>
          <Button
            variant="outline"
            className="border-amber-600 text-amber-600 hover:bg-amber-50"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Material Request
          </Button>
        </Link>
      </div>

      {/* Recent Expenses List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Petty Cash Expenses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Target className="h-5 w-5 mr-2 text-blue-600" />
              Recent Petty Cash Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {projectExpenses && projectExpenses.length > 0 ? (
              <div className="space-y-3">
                {projectExpenses
                  .filter((expense: any) => expense.status === "expense")
                  .slice(0, 5)
                  .map((expense: any) => (
                    <div
                      key={expense.id}
                      className="flex items-center justify-between py-2 px-2 rounded hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedExpense(expense)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-900 truncate">
                          {expense.user?.name || "Unknown"} - {expense.category}{" "}
                          -{" "}
                          {new Date(expense.expenseDate).toLocaleDateString(
                            "en-GB",
                          )}
                        </p>
                      </div>
                      <p className="text-xs font-semibold text-red-600 ml-2">
                        ₹{expense.amount.toLocaleString()}
                      </p>
                    </div>
                  ))}
                {projectExpenses.filter((e: any) => e.status === "expense")
                  .length > 5 && (
                  <Link href={`/petty-cash?projectId=${projectId}`}>
                    <Button
                      variant="outline"
                      className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      View All Expenses
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">
                  No petty cash expenses yet
                </p>
                <Link href={`/petty-cash?projectId=${projectId}`}>
                  <Button
                    className="mt-3 text-blue-600 hover:bg-blue-50"
                    variant="outline"
                  >
                    Add First Expense
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Material Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
              Material Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {materialOrders && materialOrders.length > 0 ? (
              <div className="space-y-3">
                {materialOrders.slice(0, 5).map((order: any) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between py-2 px-2 rounded hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-900 truncate">
                        Request #{order.id} - {order.items?.length || 0} items - {new Date(order.createdAt).toLocaleDateString("en-GB")}
                      </p>
                    </div>
                    <p className={`text-xs font-semibold ml-2 ${
                      order.status === 'cancelled' || order.status === 'rejected' 
                        ? 'text-red-600' 
                        : 'text-green-600'
                    }`}>
                      ₹{(order.totalValue || 0).toLocaleString()}
                    </p>
                  </div>
                ))}
                {materialOrders.length > 5 && (
                  <Link href={`/requests?projectId=${projectId}`}>
                    <Button
                      variant="outline"
                      className="w-full text-green-600 border-green-200 hover:bg-green-50"
                    >
                      View All Orders
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 text-sm">No material orders yet</p>
                <Link href={`/requests?projectId=${projectId}`}>
                  <Button
                    className="mt-3 text-green-600 hover:bg-green-50"
                    variant="outline"
                  >
                    Create First Order
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expense Detail Modal - Optimized Layout */}
      {selectedExpense && (
        <Dialog
          open={!!selectedExpense}
          onOpenChange={() => setSelectedExpense(null)}
        >
          <DialogContent className="max-w-[90vw] sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Expense Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Two columns layout for better space utilization */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-600">
                    Paid By
                  </div>
                  <div className="text-sm">
                    {selectedExpense.user?.name ||
                      selectedExpense.user?.username ||
                      "N/A"}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">
                    Category
                  </div>
                  <div className="text-sm">{selectedExpense.category}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-600">
                    Vendor
                  </div>
                  <div className="text-sm">{selectedExpense.vendor}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">
                    Amount
                  </div>
                  <div
                    className={`text-sm font-bold ${
                      selectedExpense.status === "income"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {selectedExpense.status === "income" ? "+" : ""}₹
                    {selectedExpense.amount.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-600">Date</div>
                  <div className="text-sm">
                    {new Date(selectedExpense.expenseDate).toLocaleDateString(
                      "en-GB",
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">
                    Project
                  </div>
                  <div className="text-sm">
                    {selectedExpense.projectId && selectedExpense.project
                      ? `${selectedExpense.project.code} - ${selectedExpense.project.name}`
                      : selectedExpense.projectId
                        ? selectedExpense.projectId
                        : "-"}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-600">
                  Description
                </div>
                <div className="text-sm">
                  {selectedExpense.description || "-"}
                </div>
              </div>

              {selectedExpense.receiptImageUrl && (
                <div>
                  <div className="text-sm font-medium text-gray-600 mb-2">
                    Receipt
                  </div>
                  <div className="flex justify-center">
                    <img
                      src={
                        selectedExpense.receiptImageUrl.startsWith("http")
                          ? selectedExpense.receiptImageUrl
                          : `/${selectedExpense.receiptImageUrl}`
                      }
                      alt="Receipt"
                      className="max-w-full max-h-[200px] object-contain rounded-lg border cursor-pointer"
                      title="Receipt image"
                      onError={(e) => {
                        console.error(
                          "Failed to load receipt image:",
                          selectedExpense.receiptImageUrl,
                        );
                        console.error("Attempted URL:", e.currentTarget.src);
                      }}
                      onLoad={() => {
                        console.log(
                          "Successfully loaded receipt image:",
                          selectedExpense.receiptImageUrl,
                        );
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Order Detail Modal - Matching Material Request View Format */}
      {selectedOrder && (
        <Dialog
          open={!!selectedOrder}
          onOpenChange={() => setSelectedOrder(null)}
        >
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Request Details - REQ-{selectedOrder.id.toString().padStart(4, '0')}</DialogTitle>
            </DialogHeader>
            
            {/* Temporary debug - show data structure */}
            {process.env.NODE_ENV === 'development' && (
              <details className="text-xs bg-gray-100 p-2 mb-4">
                <summary>Debug: API Data Structure</summary>
                <pre className="overflow-auto max-h-40 mt-2">{JSON.stringify(selectedOrder, null, 2)}</pre>
              </details>
            )}
            
            <div className="space-y-6">
              {/* Request Information & Status Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Request Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Request Information</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Client:</span> {selectedOrder.clientName || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Order Number:</span>
                    </div>
                    <div>
                      <span className="font-medium">Requested By:</span> {selectedOrder.requestedByUser?.name || selectedOrder.requestedByName || selectedOrder.requestedBy || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Date:</span> {new Date(selectedOrder.createdAt).toLocaleDateString("en-GB")}
                    </div>
                  </div>
                </div>

                {/* Status Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Status Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Status:</span>
                      <Badge 
                        variant={selectedOrder.status === 'cancelled' ? 'destructive' : 'default'}
                        className={`${
                          selectedOrder.status === 'issued' ? 'bg-blue-100 text-blue-800' :
                          selectedOrder.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {selectedOrder.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Priority:</span>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {selectedOrder.priority || 'Medium'}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">Total Value:</span> ₹{(selectedOrder.totalValue || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Requested Items */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Requested Items</h3>
                  
                  {/* Table Header */}
                  <div className="bg-gray-50 rounded-t-lg border">
                    <div className="grid grid-cols-4 gap-4 p-3 text-sm font-medium text-gray-600">
                      <div>Product</div>
                      <div>Requested Qty</div>
                      <div>Unit Price</div>
                      <div>Total</div>
                    </div>
                  </div>

                  {/* Table Body */}
                  <div className="border-x border-b rounded-b-lg">
                    {selectedOrder.items.map((item: any, index: number) => (
                      <div key={index} className="grid grid-cols-4 gap-4 p-3 text-sm border-b last:border-b-0">
                        <div className="font-medium">
                          {item.product?.name || item.productName || item.description || 'Unknown Product'}
                        </div>
                        <div>
                          {item.requestedQuantity || item.quantity || 0} {item.unit || 'pieces'}
                        </div>
                        <div>
                          ₹{(item.unitPrice || item.rate || item.price || 0).toLocaleString()}
                        </div>
                        <div className="font-medium">
                          ₹{(item.totalAmount || item.amount || item.total || ((item.requestedQuantity || item.quantity || 0) * (item.unitPrice || item.rate || item.price || 0)) || 0).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}


            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default function ProjectDetail() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentUser = authService.getUser();
  const canViewFinances = authService.hasRole(['admin', 'manager']);

  // Extract project ID from URL
  const projectId = location.split("/")[2];
  
  // Determine initial tab from URL
  const getInitialTab = () => {
    const pathParts = location.split("/");
    if (pathParts.length >= 4) {
      return pathParts[3]; // e.g., /projects/1/quotes -> "quotes"
    }
    return "files";
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  
  // Update URL when tab changes
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    if (newTab === "files") {
      setLocation(`/projects/${projectId}`);
    } else {
      setLocation(`/projects/${projectId}/${newTab}`);
    }
  };
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [isCommunicationDialogOpen, setIsCommunicationDialogOpen] =
    useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isMoodboardDialogOpen, setIsMoodboardDialogOpen] = useState(false);
  const [selectedFileType, setSelectedFileType] = useState("all");
  const [uploadContext, setUploadContext] = useState<{category: string; title: string} | null>(null);
  const [activeFileTab, setActiveFileTab] = useState("recce");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  // AI preview functionality removed for simplicity
  const [imageLoadStates, setImageLoadStates] = useState<{
    [key: string]: "loading" | "loaded" | "error";
  }>({});
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<{
    src: string;
    name: string;
  } | null>(null);
  const [noteFiles, setNoteFiles] = useState<FileList | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // New state for grouped images
  const [editingGroupTitle, setEditingGroupTitle] = useState<string | null>(
    null,
  );
  const [editingComment, setEditingComment] = useState<{
    fileId: number;
    comment: string;
  } | null>(null);
  const [groupTitles, setGroupTitles] = useState<Record<string, string>>({
    recce: "Internal Recce",
    design: "Design Files",
    drawing: "Technical Drawings",
    documents: "Documents",
    general: "General Files",
  });

  // Forms
  const taskForm = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      assignedTo: "",
      assignedToOther: "",
      dueDate: "",
      priority: "medium" as const,
      status: "pending" as const,
    },
  });

  const noteForm = useForm({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      title: "",
      content: "",
      type: "note" as const,
      taggedUsers: [],
    },
  });

  const communicationForm = useForm({
    resolver: zodResolver(communicationSchema),
    defaultValues: {
      type: "whatsapp" as const,
      content: "",
      contactPerson: "",
      followUpDate: "",
      status: "pending" as const,
    },
  });

  const moodboardForm = useForm({
    resolver: zodResolver(moodboardSchema),
    defaultValues: {
      name: "",
      keywords: "",
      roomType: "",
      inspirationType: "real" as const,
    },
  });

  // Handle file deletion
  const handleDeleteFile = async (fileId: number, fileName: string) => {
    try {
      const token =
        localStorage.getItem("authToken") || localStorage.getItem("token");
      const response = await fetch(
        `/api/projects/${projectId}/files/${fileId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      toast({
        title: "Success",
        description: "File deleted successfully",
      });

      // Refresh the files list
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", projectId, "files"],
      });
    } catch (error) {
      console.error("Delete error:", error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete file. Please try again.",
        variant: "destructive",
      });
    }
  };

  // AI functionality removed - moodboards now use manual image uploads only

  const uploadForm = useForm({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      type: "",
      title: "",
      files: undefined,
    },
  });

  // Pre-fill form when uploadContext is available
  useEffect(() => {
    if (isUploadDialogOpen && uploadContext) {
      uploadForm.reset({
        type: uploadContext.category,
        title: uploadContext.title,
        files: undefined,
      });
    } else if (isUploadDialogOpen && !uploadContext) {
      // Reset to defaults when no context
      uploadForm.reset({
        type: selectedFileType === "all" ? "" : selectedFileType,
        title: "",
        files: undefined,
      });
    }
  }, [isUploadDialogOpen, uploadContext, selectedFileType, uploadForm]);

  // Optimized Queries with caching
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["/api/projects", projectId],
    queryFn: async () => {
      const token =
        localStorage.getItem("authToken") || localStorage.getItem("token");
      const response = await fetch(`/api/projects/${projectId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch project");
      return response.json();
    },
    staleTime: 0, // Force refresh to get latest data
    gcTime: 0, // Don't cache to ensure fresh data
  });

  const { data: client } = useQuery({
    queryKey: ["/api/clients", project?.clientId],
    queryFn: async () => {
      if (!project?.clientId) return null;
      const token =
        localStorage.getItem("authToken") || localStorage.getItem("token");
      const response = await fetch(`/api/clients/${project.clientId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch client");
      return response.json();
    },
    enabled: !!project?.clientId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Real project files from database
  const { data: projectFiles = [], isLoading: filesLoading } = useQuery({
    queryKey: ["/api/projects", projectId, "files"],
    queryFn: async () => {
      const token =
        localStorage.getItem("authToken") || localStorage.getItem("token");
      const response = await fetch(`/api/projects/${projectId}/files`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch project files");
      return response.json();
    },
    enabled: !!projectId,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Query for project logs/notes
  const projectLogsQuery = useQuery({
    queryKey: ["/api/projects", projectId, "logs"],
    queryFn: async () => {
      const token =
        localStorage.getItem("authToken") || localStorage.getItem("token");
      const response = await fetch(`/api/projects/${projectId}/logs`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch project logs");
      return response.json();
    },
    enabled: !!projectId,
  });

  // Query for project moodboards
  const { data: projectMoodboards = [] } = useQuery({
    queryKey: ["/api/projects", projectId, "moodboards"],
    queryFn: async () => {
      const token =
        localStorage.getItem("authToken") || localStorage.getItem("token");
      const response = await fetch(`/api/projects/${projectId}/moodboards`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch project moodboards");
      return response.json();
    },
    enabled: !!projectId,
  });

  // Query for project material requests (orders) - using same method as RequestTable
  const { data: projectOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/requests", "project", projectId],
    queryFn: async () => {
      return await authenticatedApiRequest('GET', `/api/requests?projectId=${projectId}`);
    },
    enabled: !!projectId,
  });

  // Separate moodboard images from regular files
  const moodboardImages = useMemo(() => {
    return projectFiles.filter(
      (file: any) =>
        file.category === "moodboard" && file.mimeType?.includes("image"),
    );
  }, [projectFiles]);

  // Mutations for database operations
  const createLogMutation = useMutation({
    mutationFn: async (logData: any) => {
      return apiRequest(`/api/projects/${projectId}/logs`, { method: "POST", body: JSON.stringify(logData) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", projectId, "logs"],
      });
      setIsNoteDialogOpen(false);
      setEditingNoteId(null);
      // Reset the form with default values
      noteForm.reset({
        title: "",
        content: "",
        type: "note",
        taggedUsers: [],
      });
      setNoteFiles(null);
      // Clear file input
      const fileInput = document.querySelector(
        'input[type="file"]#note-files',
      ) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }
      toast({ title: "Note added successfully!" });
    },
    onError: (error) => {
      console.error("Error creating note:", error);
      toast({
        title: "Error creating note",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  // Form submission handlers
  const handleNoteSubmit = async (data?: any) => {
    const title = data?.title || noteForm.watch("title");
    const content = data?.content || noteForm.watch("content");
    const type = data?.type || noteForm.watch("type");

    console.log("Notes tab - Creating/Updating note with data:", {
      title,
      content,
      type,
      editingNoteId,
    });

    if (!content) {
      toast({
        title: "Error",
        description: "Note content is required",
        variant: "destructive",
      });
      return;
    }

    // Handle file attachments
    let attachmentUrls: string[] = [];
    if (noteFiles && noteFiles.length > 0) {
      console.log("Uploading note files:", noteFiles);
      const formData = new FormData();

      for (let i = 0; i < noteFiles.length; i++) {
        formData.append("files", noteFiles[i]);
      }
      formData.append("projectId", projectId);
      formData.append("type", "note-attachment");

      try {
        const token = localStorage.getItem("authToken");
        console.log("Upload token check:", {
          tokenExists: !!token,
          tokenLength: token?.length,
        });

        const uploadResponse = await fetch(
          `/api/projects/${projectId}/upload`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          },
        );

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          attachmentUrls =
            uploadResult.files?.map((f: any) => f.fileName || f.originalName) ||
            [];
          console.log("Attachment files uploaded:", attachmentUrls);
          console.log("Full upload result:", uploadResult);
        } else {
          console.error("File upload failed");
          toast({
            title: "Warning",
            description: "Note saved but file upload failed",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("File upload error:", error);
        toast({
          title: "Warning",
          description: "Note saved but file upload failed",
          variant: "destructive",
        });
      }
    }

    const noteData = {
      logType: type || "note", // Map 'type' to 'logType' for database schema
      title: title || "Untitled Note",
      description: content,
      projectId: parseInt(projectId),
      attachments: attachmentUrls,
    };

    if (editingNoteId) {
      // Update existing note
      console.log("Updating note with ID:", editingNoteId);
      updateLogMutation.mutate({ id: editingNoteId, ...noteData });
    } else {
      // Create new note
      console.log("Creating new note:", noteData);
      createLogMutation.mutate(noteData);
    }
  };

  // Note update mutation
  const updateLogMutation = useMutation({
    mutationFn: async ({ id, ...logData }: any) => {
      return apiRequest(`/api/projects/${projectId}/logs/${id}`, { method: "PUT", body: JSON.stringify(logData) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", projectId, "logs"],
      });
      setEditingNoteId(null);
      noteForm.reset({
        title: "",
        content: "",
        type: "note",
        taggedUsers: [],
      });
      setNoteFiles(null);
      // Clear file input
      const fileInput = document.querySelector(
        'input[type="file"]#note-files',
      ) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }
      toast({ title: "Note updated successfully!" });
    },
    onError: (error) => {
      console.error("Error updating note:", error);
      toast({
        title: "Error updating note",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  // Note deletion mutation
  const deleteLogMutation = useMutation({
    mutationFn: async (logId: number) => {
      return apiRequest(`/api/projects/${projectId}/logs/${logId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", projectId, "logs"],
      });
      toast({ title: "Note deleted successfully!" });
    },
  });

  // Comment update mutation (also handles description updates)
  const updateCommentMutation = useMutation({
    mutationFn: async ({
      fileId,
      comment,
      newDescription,
    }: {
      fileId: number;
      comment: string;
      newDescription?: string;
    }) => {
      const updateData: any = { comment };
      if (newDescription !== undefined) {
        updateData.description = newDescription;
      }
      return apiRequest(`/api/files/${fileId}/comment`, { method: "PUT", body: JSON.stringify(updateData) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", projectId, "files"],
      });
      setEditingComment(null);
      // No toast notification for seamless inline editing
    },
  });

  // Function to handle group title updates directly in frontend
  const updateGroupTitle = (category: string, oldTitle: string, newTitle: string) => {
    if (newTitle === oldTitle || !newTitle.trim()) return;

    // Update the local state to reflect the change immediately
    setGroupTitles(prev => ({
      ...prev,
      [`${category}-${oldTitle}`]: newTitle,
      [`${category}-${newTitle}`]: newTitle, // Add new mapping
    }));

    // Update all files in this group individually via API
    const filesToUpdate = projectFiles?.filter(
      (file: any) => file.category === category && file.description === oldTitle
    ) || [];

    // Update each file individually with new description
    filesToUpdate.forEach((file: any) => {
      updateCommentMutation.mutate({
        fileId: file.id,
        comment: file.comment || '',
        newDescription: newTitle
      });
    });
  };

  const handleMoodboardCreate = (data: any) => {
    console.log("Creating moodboard with data:", data);
    console.log("Form errors:", moodboardForm.formState.errors);

    // Simple moodboard creation with manual image uploads only
    const moodboardData = {
      ...data,
      sourceType: "manual_upload",
      imageUrls: [], // Will be populated when users upload images
      linkedProjectId: parseInt(projectId),
    };
    // Remove the old field name
    delete moodboardData.inspirationType;
    console.log("Final moodboard data:", moodboardData);
    createMoodboardMutation.mutate(moodboardData);
  };

  // Note creation handler
  const handleNoteCreate = (data: any) => {
    console.log("Creating note with data:", data);
    console.log("Form data received:", {
      title: data.title,
      content: data.content,
      type: data.type,
      taggedUsers: data.taggedUsers,
    });

    const noteData = {
      logType: data.type || "note", // Map 'type' to 'logType' for database schema, default to "note"
      title: data.title || "Untitled Note", // Use title field from form
      description: data.content,
      projectId: parseInt(projectId),
    };

    console.log("Sending to API:", noteData);
    createNoteMutation.mutate(noteData);
  };

  // Fetch project tasks from API
  const { data: projectTasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useQuery({
    queryKey: ["/api/tasks", projectId],
    queryFn: () => apiRequest(`/api/tasks?projectId=${projectId}`),
  });

  // Fetch users for task assignment
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: () => apiRequest("/api/users"),
  });

  // Task creation/update handler
  const handleTaskSubmit = (data: any) => {
    const taskData = {
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: data.status,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      assignedTo: null,
      assignedToOther: null,
    };

    // Handle assignment - either to a user or to "other" person
    if (data.assignedTo === "other") {
      taskData.assignedToOther = data.assignedToOther || null;
    } else if (data.assignedTo && data.assignedTo !== "" && data.assignedTo !== "unassigned") {
      const parsed = parseInt(data.assignedTo);
      taskData.assignedTo = isNaN(parsed) ? null : parsed;
    }

    if (editingTask) {
      // Update existing task
      updateTaskMutation.mutate({ taskId: editingTask.id, taskData });
    } else {
      // Create new task with projectId
      const newTaskData = {
        ...taskData,
        projectId: parseInt(projectId)
      };
      createTaskMutation.mutate(newTaskData);
    }
  };

  // Task editing handler
  const handleTaskEdit = (task: any) => {
    setEditingTask(task);
    
    // Populate form with existing task data
    taskForm.reset({
      title: task.title || '',
      description: task.description || '',
      priority: task.priority || 'medium',
      status: task.status || 'pending',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      assignedTo: task.assignedToOther ? 'other' : 
                  task.assignedTo ? task.assignedTo.toString() : 'unassigned',
      assignedToOther: task.assignedToOther || '',
    });
    
    setIsTaskDialogOpen(true);
  };

  // Task deletion handler
  const handleTaskDelete = (taskId: number) => {
    if (currentUser?.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "Only administrators can delete tasks.",
        variant: "destructive",
      });
      return;
    }
    
    if (confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      deleteTaskMutation.mutate(taskId);
    }
  };

  const mockNotes = [
    {
      id: 1,
      content: "Client requested changes to bedroom layout",
      type: "meeting",
      author: "Admin",
      createdAt: "2025-01-29 10:30",
      taggedUsers: ["john", "jane"],
    },
    {
      id: 2,
      content: "Site visit scheduled for next week",
      type: "note",
      author: "Project Manager",
      createdAt: "2025-01-28 15:45",
      taggedUsers: [],
    },
  ];

  const mockCommunications = [
    {
      id: 1,
      type: "whatsapp",
      content: "Shared latest floor plan with client",
      contactPerson: "Mr. Sharma",
      status: "completed",
      createdAt: "2025-01-29",
    },
    {
      id: 2,
      type: "call",
      content: "Follow-up call regarding material selection",
      contactPerson: "Mrs. Sharma",
      status: "pending",
      followUpDate: "2025-02-02",
    },
  ];

  // Project stages in order
  const projectStages = [
    "prospect",
    "recce-done",
    "design-in-progress",
    "design-approved",
    "estimate-given",
    "client-approved",
    "production",
    "installation",
    "handover",
    "completed",
  ];

  // Memoized calculations for better performance
  const projectProgress = useMemo(() => {
    if (!project?.stage) return 0;

    // Special handling for optional stages
    if (project.stage === "on-hold" || project.stage === "lost") {
      const lastMainStage = project.previousStage || "prospect";
      const stageIndex = projectStages.indexOf(lastMainStage);
      return Math.round(((stageIndex + 1) / projectStages.length) * 100);
    }

    const currentStageIndex = projectStages.indexOf(project.stage);
    if (currentStageIndex === -1) return 0;

    // Calculate percentage: (completed stages + 1) / total stages * 100
    return Math.round(((currentStageIndex + 1) / projectStages.length) * 100);
  }, [project?.stage]);

  const stageProgress = useMemo(() => {
    if (!project?.stage)
      return { completed: 0, total: projectStages.length, current: "prospect" };

    // Special handling for optional stages
    if (project.stage === "on-hold" || project.stage === "lost") {
      const lastMainStage = project.previousStage || "prospect";
      const stageIndex = projectStages.indexOf(lastMainStage);
      return {
        completed: stageIndex + 1,
        total: projectStages.length,
        current: lastMainStage,
      };
    }

    const currentStageIndex = projectStages.indexOf(project.stage);
    return {
      completed: currentStageIndex + 1,
      total: projectStages.length,
      current: project.stage,
    };
  }, [project?.stage]);

  const taskSummary = useMemo(
    () => ({
      pending: projectTasks.filter((t: any) => t.status === "pending").length,
      inProgress: projectTasks.filter((t: any) => t.status === "in_progress").length,
      completed: projectTasks.filter((t: any) => t.status === "completed").length,
    }),
    [projectTasks],
  );

  const filteredFiles = useMemo(() => {
    if (selectedFileType === "all") return projectFiles;

    const categoryMap: Record<string, string> = {
      recce: "photos",
      design: "design", 
      drawing: "drawings",
      telegram: "telegram",
    };

    const targetCategory = categoryMap[selectedFileType.toLowerCase()];
    return projectFiles.filter(
      (file: any) => file.category?.toLowerCase() === targetCategory,
    );
  }, [projectFiles, selectedFileType]);

  const getFileIcon = (mimeType: string, fileName: string) => {
    if (mimeType?.includes("image"))
      return <Image className="h-5 w-5 text-blue-500" />;
    if (mimeType?.includes("pdf"))
      return <FileText className="h-5 w-5 text-red-500" />;
    if (
      mimeType?.includes("excel") ||
      mimeType?.includes("spreadsheet") ||
      fileName?.endsWith(".xlsx")
    )
      return <File className="h-5 w-5 text-green-500" />;
    if (fileName?.endsWith(".dwg"))
      return <File className="h-5 w-5 text-purple-500" />;
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Moodboard deletion mutation
  const deleteMoodboardMutation = useMutation({
    mutationFn: async (moodboardId: number) => {
      const token =
        localStorage.getItem("authToken") || localStorage.getItem("token");
      const response = await fetch(`/api/moodboards/${moodboardId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to delete moodboard");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", projectId, "moodboards"],
      });
      toast({
        title: "Success",
        description: "Moodboard deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete moodboard",
        variant: "destructive",
      });
    },
  });

  // Moodboard creation mutation
  const createMoodboardMutation = useMutation({
    mutationFn: async (data: any) => {
      const token =
        localStorage.getItem("authToken") || localStorage.getItem("token");
      const response = await fetch("/api/moodboards", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          linkedProjectId: parseInt(projectId),
        }),
      });
      if (!response.ok) throw new Error("Failed to create moodboard");
      return response.json();
    },
    onSuccess: () => {
      setIsMoodboardDialogOpen(false);
      moodboardForm.reset();
      // AI preview functionality removed
      toast({
        title: "Success",
        description: "Moodboard created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create moodboard",
        variant: "destructive",
      });
    },
  });

  // Stage update mutation
  const stageUpdateMutation = useMutation({
    mutationFn: async (newStage: string) => {
      return apiRequest(`/api/projects/${projectId}`, { method: "PATCH", body: JSON.stringify({ stage: newStage }) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({
        title: "Success",
        description: "Project stage updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update project stage",
        variant: "destructive",
      });
    },
  });

  const handleStageChange = (newStage: string) => {
    stageUpdateMutation.mutate(newStage);
  };

  // Note creation mutation
  const createNoteMutation = useMutation({
    mutationFn: async (data: any) => {
      const token =
        localStorage.getItem("authToken") || localStorage.getItem("token");
      const response = await fetch(`/api/projects/${projectId}/logs`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create note");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", projectId, "logs"],
      });
      setIsNoteDialogOpen(false);
      noteForm.reset();
      toast({
        title: "Success",
        description: "Note added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create note. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Task creation mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      return await authenticatedApiRequest('POST', '/api/tasks', {
        ...taskData,
        projectId: parseInt(projectId)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", projectId] });
      toast({
        title: "Task created",
        description: "Task has been created successfully.",
      });
      setIsTaskDialogOpen(false);
      setEditingTask(null);
      taskForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to create task",
        variant: "destructive",
      });
    },
  });

  // Task update mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, taskData }: { taskId: number; taskData: any }) => {
      return await authenticatedApiRequest('PATCH', `/api/tasks/${taskId}`, taskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", projectId] });
      toast({
        title: "Task updated",
        description: "Task has been updated successfully.",
      });
      setIsTaskDialogOpen(false);
      setEditingTask(null);
      taskForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    },
  });

  // Task delete mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return await authenticatedApiRequest('DELETE', `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", projectId] });
      toast({
        title: "Task deleted",
        description: "Task has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    },
  });

  // File upload mutation
  const fileUploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const token =
        localStorage.getItem("authToken") || localStorage.getItem("token");
      const response = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      if (!response.ok) throw new Error("File upload failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/projects", projectId, "files"],
      });
      setIsUploadDialogOpen(false);
      setSelectedFiles(null);
      uploadForm.reset();
      toast({
        title: "Success",
        description: "Files uploaded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: "Failed to upload files. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (data: any) => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast({
        title: "No Files Selected",
        description: "Please select files to upload",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("projectId", projectId);
    formData.append("category", data.type);
    formData.append("title", data.title);
    formData.append("clientVisible", "true");

    Array.from(selectedFiles).forEach((file) => {
      formData.append("files", file);
    });

    fileUploadMutation.mutate(formData);
  };

  if (projectLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-8">
        <div className="text-center py-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Project Not Found
          </h3>
          <p className="text-gray-500 mb-4">
            The requested project could not be found.
          </p>
          <Button onClick={() => setLocation("/projects")}>
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Header matching mockup */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => setLocation("/projects")}
                className="p-2 hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {project.name} - {project.code}
                  </h1>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Edit className="h-4 w-4" />
                    <span>P-176</span>
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                </div>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <User className="h-4 w-4" />
                    <span>{project.client_name || client?.name || "No Client"}</span>
                  </div>
                  {canViewFinances && (
                    <div className="flex items-center space-x-1">
                      <Phone className="h-4 w-4" />
                      <span>{project.client_mobile || project.client_phone || client?.mobile || client?.phone || "No Contact"}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stage Selector */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-600 mb-1">
                  Stage
                </div>
                <Select value={project.stage} onValueChange={handleStageChange}>
                  <SelectTrigger className="w-40 bg-gray-100 border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prospect">Prospect</SelectItem>
                    <SelectItem value="recce-done">Recce Done</SelectItem>
                    <SelectItem value="design-in-progress">
                      Design In Progress
                    </SelectItem>
                    <SelectItem value="design-approved">
                      Design Approved
                    </SelectItem>
                    <SelectItem value="estimate-given">
                      Estimate Given
                    </SelectItem>
                    <SelectItem value="client-approved">
                      Client Approved
                    </SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="installation">Installation</SelectItem>
                    <SelectItem value="handover">Handover</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="on-hold">On Hold</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs with Enhanced UX */}
        <div className="px-4 border-b border-gray-100 overflow-x-auto">
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="w-full"
          >
            <TabsList className="h-auto bg-transparent p-0 space-x-4 min-w-max flex">
              <TabsTrigger
                value="files"
                className="flex items-center space-x-1 px-0 py-2 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent bg-transparent hover:bg-gray-50 text-gray-600 data-[state=active]:text-blue-600 rounded-none transition-all duration-200"
              >
                <span className="text-sm">📂</span>
                <span className="font-medium text-xs">Files</span>
              </TabsTrigger>
              <TabsTrigger
                value="moodboard"
                className="flex items-center space-x-2 px-0 py-3 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent bg-transparent hover:bg-gray-50 text-gray-600 data-[state=active]:text-blue-600 rounded-none transition-all duration-200"
              >
                <span className="text-base">🎨</span>
                <span className="font-medium text-sm">Moodboard</span>
              </TabsTrigger>
              {canViewFinances && (
                <TabsTrigger
                  value="notes"
                  className="flex items-center space-x-2 px-0 py-3 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent bg-transparent hover:bg-gray-50 text-gray-600 data-[state=active]:text-blue-600 rounded-none transition-all duration-200"
                >
                  <span className="text-base">🗒️</span>
                  <span className="font-medium text-sm">Notes</span>
                </TabsTrigger>
              )}
              <TabsTrigger
                value="tasks"
                className="flex items-center space-x-2 px-0 py-3 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent bg-transparent hover:bg-gray-50 text-gray-600 data-[state=active]:text-blue-600 rounded-none transition-all duration-200"
              >
                <span className="text-base">✅</span>
                <span className="font-medium text-sm">Tasks</span>
              </TabsTrigger>
              {canViewFinances && (
                <TabsTrigger
                  value="quotes"
                  className="flex items-center space-x-2 px-0 py-3 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent bg-transparent hover:bg-gray-50 text-gray-600 data-[state=active]:text-blue-600 rounded-none transition-all duration-200"
                >
                  <span className="text-base">💸</span>
                  <span className="font-medium text-sm">Quotes</span>
                </TabsTrigger>
              )}
              {canViewFinances && (
                <TabsTrigger
                  value="workorders"
                  className="flex items-center space-x-2 px-0 py-3 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent bg-transparent hover:bg-gray-50 text-gray-600 data-[state=active]:text-blue-600 rounded-none transition-all duration-200"
                >
                  <span className="text-base">🏭</span>
                  <span className="font-medium text-sm">Production</span>
                </TabsTrigger>
              )}
              <TabsTrigger
                value="orders"
                className="flex items-center space-x-2 px-0 py-3 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent bg-transparent hover:bg-gray-50 text-gray-600 data-[state=active]:text-blue-600 rounded-none transition-all duration-200"
              >
                <span className="text-base">📦</span>
                <span className="font-medium text-sm">Orders</span>
              </TabsTrigger>
              <TabsTrigger
                value="activities"
                className="flex items-center space-x-2 px-0 py-3 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent bg-transparent hover:bg-gray-50 text-gray-600 data-[state=active]:text-blue-600 rounded-none transition-all duration-200"
              >
                <span className="text-base">📅</span>
                <span className="font-medium text-sm">Activities</span>
              </TabsTrigger>
              <TabsTrigger
                value="progress"
                className="flex items-center space-x-2 px-0 py-3 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent bg-transparent hover:bg-gray-50 text-gray-600 data-[state=active]:text-blue-600 rounded-none transition-all duration-200"
              >
                <span className="text-base">📊</span>
                <span className="font-medium text-sm">Progress</span>
              </TabsTrigger>

              {canViewFinances && (
                <TabsTrigger
                  value="financials"
                  className="flex items-center space-x-2 px-0 py-3 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent bg-transparent hover:bg-gray-50 text-gray-600 data-[state=active]:text-blue-600 rounded-none transition-all duration-200"
                >
                  <span className="text-base">💰</span>
                  <span className="font-medium text-sm">Finances</span>
                </TabsTrigger>
              )}
              {canViewFinances && (
                <TabsTrigger
                  value="details"
                  className="flex items-center space-x-2 px-0 py-3 border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-transparent bg-transparent hover:bg-transparent text-gray-600 data-[state=active]:text-blue-600 rounded-none"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="font-medium">Details</span>
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-3">
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="space-y-3"
        >
          {/* Files Tab - Modern Design with Image Thumbnails */}
          <TabsContent value="files" className="p-3 bg-gray-50">
            {/* File Categories Tabs */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex space-x-2">
                  <Button
                    variant={
                      selectedFileType === "recce" ? "default" : "outline"
                    }
                    onClick={() => setSelectedFileType("recce")}
                    className={`h-8 text-xs ${selectedFileType === "recce" ? "bg-amber-900 text-white" : "bg-white text-gray-700 border-gray-300"}`}
                  >
                    Recce
                  </Button>
                  <Button
                    variant={
                      selectedFileType === "design" ? "default" : "outline"
                    }
                    onClick={() => setSelectedFileType("design")}
                    className={`h-8 text-xs ${selectedFileType === "design" ? "bg-amber-900 text-white" : "bg-white text-gray-700 border-gray-300"}`}
                  >
                    Design
                  </Button>
                  <Button
                    variant={
                      selectedFileType === "drawing" ? "default" : "outline"
                    }
                    onClick={() => setSelectedFileType("drawing")}
                    className={`h-8 text-xs ${selectedFileType === "drawing" ? "bg-amber-900 text-white" : "bg-white text-gray-700 border-gray-300"}`}
                  >
                    Drawing
                  </Button>
                  <Button
                    variant={
                      selectedFileType === "all" ? "default" : "outline"
                    }
                    onClick={() => setSelectedFileType("all")}
                    className={`h-8 text-xs ${selectedFileType === "all" ? "bg-amber-900 text-white" : "bg-white text-gray-700 border-gray-300"}`}
                  >
                    All
                  </Button>
                </div>
                <div className="flex space-x-2">
                  {selectedFileType === "moodboard" ? (
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => setIsMoodboardDialogOpen(true)}
                        className="btn-primary"
                      >
                        <Star className="h-4 w-4 mr-2" />
                        Create Moodboard
                      </Button>
                      <Button
                        onClick={() => setIsUploadDialogOpen(true)}
                        className="btn-outline"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Images
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => {
                        setUploadContext(null); // Clear context for general upload
                        setIsUploadDialogOpen(true);
                      }}
                      className="btn-primary btn-sm"
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      Upload Files
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Moodboard Section - Show when moodboard tab is selected */}
            {selectedFileType === "moodboard" && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Project Moodboards
                </h3>
                <div className="text-gray-500 text-center py-8">
                  <div className="bg-gray-100 rounded-lg p-8">
                    <div className="text-4xl mb-4">🎨</div>
                    <h4 className="text-lg font-medium mb-2">
                      No moodboards created yet
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Create beautiful moodboards by uploading your own images
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button
                        onClick={() => setIsMoodboardDialogOpen(true)}
                        className="btn-primary"
                      >
                        <Star className="h-4 w-4 mr-2" />
                        Create Moodboard
                      </Button>
                      <Button
                        onClick={() => setIsUploadDialogOpen(true)}
                        className="btn-outline"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Images
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Grouped Images Interface - Responsive Grid Layout */}
            {selectedFileType !== "moodboard" && filteredFiles.length > 0 && (
              <div className="space-y-4">
                {Object.entries(
                  filteredFiles.reduce((categories: any, file: any) => {
                    const category = file.category || "general";
                    if (!categories[category]) categories[category] = [];
                    categories[category].push(file);
                    return categories;
                  }, {}),
                ).map(([category, categoryFiles]: [string, any]) => {
                  // Group files within each category by their title (description)
                  const titleGroups = categoryFiles.reduce((groups: any, file: any) => {
                    const title = file.description && file.description.trim() 
                      ? file.description.trim() 
                      : 'Untitled';
                    if (!groups[title]) groups[title] = [];
                    groups[title].push(file);
                    return groups;
                  }, {});

                  return (
                    <div key={category} className="space-y-3">
                      {/* Category Header - More Compact */}
                      <div className="border-b border-gray-200 pb-0.5">
                        <h2 className="text-base font-medium text-gray-900 capitalize">
                          {category}
                        </h2>
                        <p className="text-xs text-gray-500">
                          {categoryFiles.length} files • {Object.keys(titleGroups).length} groups
                        </p>
                      </div>

                      {/* Title Groups Grid - Responsive Layout */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                        {Object.entries(titleGroups).map(([title, files]: [string, any]) => (
                        <div key={`${category}-${title}`} className="bg-white rounded border border-gray-200 p-2">
                          {/* Title Header - Compact with Edit Functionality */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {editingGroupTitle === `${category}-${title}` ? (
                                <input
                                  type="text"
                                  value={groupTitles[`${category}-${title}`] || title}
                                  onChange={(e) =>
                                    setGroupTitles({
                                      ...groupTitles,
                                      [`${category}-${title}`]: e.target.value,
                                    })
                                  }
                                  onBlur={() => {
                                    const newTitle = groupTitles[`${category}-${title}`] || title;
                                    if (newTitle !== title) {
                                      updateGroupTitle(category, title, newTitle);
                                    }
                                    setEditingGroupTitle(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      const newTitle = groupTitles[`${category}-${title}`] || title;
                                      if (newTitle !== title) {
                                        updateGroupTitle(category, title, newTitle);
                                      }
                                      setEditingGroupTitle(null);
                                    }
                                  }}
                                  className="text-base font-medium text-gray-900 bg-transparent border-b border-gray-300 focus:border-blue-500 outline-none min-w-[120px]"
                                  autoFocus
                                />
                              ) : (
                                <h3 
                                  className="text-base font-medium text-gray-900 cursor-pointer hover:text-blue-600"
                                  onClick={() => setEditingGroupTitle(`${category}-${title}`)}
                                >
                                  {groupTitles[`${category}-${title}`] || title}
                                </h3>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setUploadContext({
                                  category: category,
                                  title: groupTitles[`${category}-${title}`] || title
                                });
                                setIsUploadDialogOpen(true);
                              }}
                              className="text-blue-600 border-blue-200 hover:bg-blue-50 h-6 px-2 text-xs"
                            >
                              Add
                            </Button>
                          </div>

                          {/* Image Grid - More Compact */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5">
                            {files.map((file: any) => (
                              <div key={file.id} className="group relative">
                                {/* Image Thumbnail - Compact */}
                                <div className="aspect-square bg-gray-100 rounded-sm overflow-hidden relative border border-orange-400">
                                  {file.mimeType?.includes("image") ? (
                                    <img
                                      src={`/${file.filePath}`}
                                      alt={file.originalName}
                                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                                      onClick={() => {
                                        setPreviewImage({
                                          src: `/${file.filePath}`,
                                          name: file.originalName,
                                        });
                                        setShowImagePreview(true);
                                      }}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                      {getFileIcon(file.mimeType, file.originalName)}
                                    </div>
                                  )}

                                  {/* Three-dot menu - Smaller */}
                                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-5 w-5 p-0 bg-black/50 hover:bg-black/70 text-white rounded-full"
                                        >
                                          <MoreVertical className="h-2.5 w-2.5" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-40">
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setPreviewImage({
                                              src: `/${file.filePath}`,
                                              name: file.originalName,
                                            });
                                            setShowImagePreview(true);
                                          }}
                                        >
                                          <Eye className="h-3 w-3 mr-2" />
                                          View
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                          <a
                                            href={`/${file.filePath}`}
                                            download={file.originalName}
                                          >
                                            <Download className="h-3 w-3 mr-2" />
                                            Download
                                          </a>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => handleDeleteFile(file.id, file.fileName)}
                                          className="text-red-600 hover:text-red-700"
                                        >
                                          <Trash2 className="h-3 w-3 mr-2" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>

                                {/* Comment Section - More Compact */}
                                <div className="mt-0.5">
                                  <div className="bg-gray-50 rounded px-1.5 py-0.5 min-h-[20px] flex items-center">
                                    <input
                                      type="text"
                                      value={
                                        editingComment?.fileId === file.id
                                          ? editingComment?.comment
                                          : file.comment || ""
                                      }
                                      placeholder="Comment"
                                      onChange={(e) => {
                                        setEditingComment({
                                          fileId: file.id,
                                          comment: e.target.value,
                                        });
                                      }}
                                      onFocus={() => {
                                        if (!editingComment || editingComment.fileId !== file.id) {
                                          setEditingComment({
                                            fileId: file.id,
                                            comment: file.comment || "",
                                          });
                                        }
                                      }}
                                      onBlur={() => {
                                        if (editingComment?.fileId === file.id && editingComment) {
                                          updateCommentMutation.mutate({
                                            fileId: file.id,
                                            comment: editingComment.comment,
                                          });
                                        }
                                      }}
                                      className="text-xs text-gray-600 flex-1 bg-transparent border-none outline-none placeholder-gray-400"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Empty state when no files - Compact */}
            {filteredFiles.length === 0 && (
              <div className="text-center py-8">
                <FolderOpen className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <h3 className="text-base font-medium text-gray-900 mb-2">
                  No files uploaded
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Upload your first file to get started
                </p>
              </div>
            )}
          </TabsContent>

          {/* Moodboard Tab */}
          <TabsContent value="moodboard" className="p-6 bg-gray-50">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Project Moodboards
              </h3>
              <div className="flex space-x-3">
                <Button
                  onClick={() => setIsMoodboardDialogOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Star className="h-4 w-4 mr-2" />
                  Create Moodboard
                </Button>
                <Button
                  onClick={() => setIsUploadDialogOpen(true)}
                  variant="outline"
                  className="border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Images
                </Button>
              </div>
            </div>

            {/* Combined Moodboards and Uploaded Images Display */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Display Database Moodboards */}
              {projectMoodboards.map((moodboard: any) => (
                <div
                  key={`moodboard-${moodboard.id}`}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                >
                  {/* Image Display Area */}
                  <div className="h-48 bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                    {moodboard.imageUrls && moodboard.imageUrls.length > 0 ? (
                      <div className="grid grid-cols-2 gap-1 w-full h-full p-2">
                        {moodboard.imageUrls
                          .slice(0, 4)
                          .map((url: string, index: number) => (
                            <img
                              key={index}
                              src={url}
                              alt={`Moodboard ${index + 1}`}
                              className="w-full h-full object-contain rounded bg-white p-0.5"
                              onError={(e) => {
                                console.log("Image failed to load:", url);
                                e.currentTarget.src =
                                  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iNzUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzlDQTNBRiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+SW1hZ2UgTG9hZGluZy4uLjwvdGV4dD4KPHN2Zz4=";
                              }}
                              onLoad={() => {
                                console.log("Image loaded successfully:", url);
                              }}
                            />
                          ))}
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="text-4xl mb-2">🎨</div>
                        <p className="text-sm text-gray-500">No images yet</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Click to add images
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 truncate">
                          {moodboard.name}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {moodboard.keywords}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700 flex-shrink-0 ml-2"
                        onClick={() =>
                          deleteMoodboardMutation.mutate(moodboard.id)
                        }
                        disabled={deleteMoodboardMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                      <span className="capitalize">
                        {moodboard.roomType?.replace("-", " ")}
                      </span>
                      <span>
                        {moodboard.sourceType === "ai_generated" ||
                        moodboard.sourceType === "ai"
                          ? "🤖 AI Generated"
                          : "📷 Real Photos"}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                      Created{" "}
                      {new Date(moodboard.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}

              {/* Display Uploaded Moodboard Images (only show if no duplicate in moodboards) */}
              {moodboardImages
                .filter(
                  (file: any) =>
                    !projectMoodboards.some(
                      (mb: any) =>
                        mb.imageUrls &&
                        mb.imageUrls.includes(`/${file.filePath}`),
                    ),
                )
                .map((file: any) => (
                  <div
                    key={`upload-${file.id}`}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                  >
                    {/* Image Display */}
                    <div className="h-48 bg-gray-100">
                      <img
                        src={`/${file.filePath}`}
                        alt={file.originalName}
                        className="w-full h-full object-contain p-1 bg-white"
                        onError={(e) => {
                          e.currentTarget.src =
                            "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik04NyA3NEg2M0M2MS4zNDMxIDc0IDYwIDc1LjM0MzEgNjAgNzdWMTIzQzYwIDEyNC42NTcgNjEuMzQzMSAxMjYgNjMgMTI2SDEzN0MxMzguNjU3IDEyNiAxNDAgMTI0LjY1NyAxNDAgMTIzVjc3QzE0MCA3NS4zNDMxIDEzOC42NTcgNzQgMTM3IDc0SDExM001IDkxSDE0MIIgc3Ryb2tlPSIjOTlBM0E0IiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zdmc+";
                        }}
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate">
                            Uploaded Image
                          </h4>
                          <p className="text-sm text-gray-600 truncate mt-1">
                            {file.originalName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                        <span>Moodboard Image</span>
                        <span>📷 Uploaded</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-2">
                        Uploaded{" "}
                        {new Date(
                          file.createdAt || Date.now(),
                        ).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {/* Show empty state only if no moodboards AND no uploaded images */}
            {projectMoodboards.length === 0 && moodboardImages.length === 0 && (
              <div className="text-center py-12">
                <div className="bg-white rounded-lg p-12 shadow-sm border border-gray-200">
                  <div className="text-6xl mb-6">🎨</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    No moodboards created yet
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Create beautiful moodboards with AI-generated inspiration or
                    curated real photos from design platforms, or upload your
                    own images
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      onClick={() => setIsMoodboardDialogOpen(true)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3"
                    >
                      <Star className="h-5 w-5 mr-2" />
                      Create Moodboard
                    </Button>
                    <Button
                      onClick={() => setIsUploadDialogOpen(true)}
                      variant="outline"
                      className="border-purple-200 text-purple-700 hover:bg-purple-50 px-8 py-3"
                    >
                      <Upload className="h-5 w-5 mr-2" />
                      Upload Images
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Project Notes Tab */}
          {canViewFinances && (
            <TabsContent value="notes" className="p-6 bg-gray-50">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
              {/* Left Column - Add Note Form */}
              <div className="space-y-4">
                <Card className="h-fit">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Add New Note
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Form {...noteForm}>
                      <form
                        onSubmit={noteForm.handleSubmit(handleNoteSubmit)}
                        className="space-y-4"
                      >
                        <FormField
                          control={noteForm.control}
                          name="title"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="First Meeting MoM"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={noteForm.control}
                          name="content"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                Note <span className="text-red-500">*</span>
                              </FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Client wants bedroom to be in red and white them"
                                  className="min-h-[120px] resize-none"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={noteForm.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Note Type</FormLabel>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select note type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="note">
                                    General Note
                                  </SelectItem>
                                  <SelectItem value="meeting">
                                    Meeting
                                  </SelectItem>
                                  <SelectItem value="call">
                                    Phone Call
                                  </SelectItem>
                                  <SelectItem value="email">Email</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Files</Label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="file"
                              id="note-files"
                              multiple
                              accept="image/*,application/pdf,.doc,.docx"
                              className="hidden"
                              onChange={(e) => setNoteFiles(e.target.files)}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() =>
                                document.getElementById("note-files")?.click()
                              }
                              className="text-sm"
                            >
                              Upload
                            </Button>
                            {noteFiles && noteFiles.length > 0 ? (
                              <div className="flex items-center space-x-2">
                                <Paperclip className="h-4 w-4 text-blue-500" />
                                <span className="text-sm text-blue-600">
                                  {noteFiles.length} file
                                  {noteFiles.length > 1 ? "s" : ""} selected
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setNoteFiles(null)}
                                  className="h-auto p-1 text-gray-500 hover:text-gray-700"
                                >
                                  ×
                                </Button>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">
                                No file selected
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <div className="flex gap-2">
                            {editingNoteId && (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setEditingNoteId(null);
                                  noteForm.reset({
                                    title: "",
                                    content: "",
                                    type: "note",
                                    taggedUsers: [],
                                  });
                                  setNoteFiles(null);
                                }}
                              >
                                Cancel
                              </Button>
                            )}
                            <Button
                              type="submit"
                              disabled={
                                !noteForm.watch("content") ||
                                createLogMutation.isPending ||
                                updateLogMutation.isPending
                              }
                              style={{
                                backgroundColor: "hsl(28, 100%, 25%)",
                                color: "white",
                              }}
                              className="hover:opacity-90"
                            >
                              {createLogMutation.isPending ||
                              updateLogMutation.isPending ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  {editingNoteId ? "Updating..." : "Adding..."}
                                </>
                              ) : editingNoteId ? (
                                "Update Note"
                              ) : (
                                "Add Note"
                              )}
                            </Button>
                          </div>
                        </div>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - All Notes */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  All Notes
                </h3>

                <div className="max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
                  {projectLogsQuery.isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                      <p className="mt-2 text-gray-500">Loading notes...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {(projectLogsQuery.data || []).map((log: any) => (
                        <Card
                          key={log.id}
                          className="bg-white border border-gray-200"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start space-x-3">
                              {/* User Avatar */}
                              <div className="flex-shrink-0">
                                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                                  {log.author
                                    ? log.author
                                        .split(" ")
                                        .map((n: any) => n[0])
                                        .join("")
                                        .toUpperCase()
                                    : "TU"}
                                </div>
                              </div>

                              {/* Note Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="text-base font-medium text-gray-900">
                                        {log.title || "Meeting Note"}
                                      </h4>
                                      <span
                                        className={`px-2 py-1 text-xs font-medium rounded ${
                                          log.logType === "meeting"
                                            ? "bg-blue-100 text-blue-800"
                                            : log.logType === "call"
                                              ? "bg-green-100 text-green-800"
                                              : log.logType === "email"
                                                ? "bg-purple-100 text-purple-800"
                                                : "bg-gray-100 text-gray-800"
                                        }`}
                                      >
                                        {log.logType === "meeting"
                                          ? "Meeting"
                                          : log.logType === "call"
                                            ? "Phone Call"
                                            : log.logType === "email"
                                              ? "Email"
                                              : "General Note"}
                                      </span>
                                    </div>
                                    <p className="text-sm text-gray-700 mb-2">
                                      {log.description || log.content}
                                    </p>

                                    {/* Show attachment icons and previews if attachments exist */}
                                    {log.attachments &&
                                      Array.isArray(log.attachments) &&
                                      log.attachments.length > 0 && (
                                        <div className="mb-3">
                                          <div className="flex items-center gap-1 mb-2">
                                            <Paperclip className="h-4 w-4 text-blue-500" />
                                            <span className="text-xs text-blue-600 font-medium">
                                              {log.attachments.length}{" "}
                                              attachment
                                              {log.attachments.length > 1
                                                ? "s"
                                                : ""}
                                            </span>
                                          </div>

                                          {/* Display attachment previews */}
                                          <div className={`grid gap-2 ${log.attachments.length > 1 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1'}`}>
                                            {log.attachments.map(
                                              (
                                                attachment: any,
                                                index: number,
                                              ) => {
                                                // Handle both old string format and new object format
                                                let filePath: string;
                                                let fileName: string;
                                                let mimeType: string;
                                                let originalName: string;

                                                if (typeof attachment === 'string') {
                                                  // Check if it's a JSON string that needs parsing
                                                  try {
                                                    const parsed = JSON.parse(attachment);
                                                    if (parsed.filePath && parsed.mimeType) {
                                                      // Parsed JSON object from Telegram bot
                                                      filePath = parsed.filePath || '';
                                                      fileName = parsed.fileName || '';
                                                      mimeType = parsed.mimeType || '';
                                                      originalName = parsed.originalName || parsed.fileName || '';
                                                    } else {
                                                      throw new Error('Not a valid attachment JSON');
                                                    }
                                                  } catch {
                                                    // Legacy string format (file path)
                                                    filePath = attachment;
                                                    fileName = attachment.split("/").pop() || attachment;
                                                    mimeType = '';
                                                    originalName = fileName;
                                                  }
                                                } else {
                                                  // Direct object format from Telegram bot
                                                  filePath = attachment.filePath || '';
                                                  fileName = attachment.fileName || '';
                                                  mimeType = attachment.mimeType || '';
                                                  originalName = attachment.originalName || attachment.fileName || '';
                                                }

                                                // Check if it's an image
                                                const isImage = 
                                                  mimeType.includes('image') ||
                                                  /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(filePath) ||
                                                  /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName);

                                                if (isImage) {
                                                  return (
                                                    <div
                                                      key={index}
                                                      className="mb-2 cursor-pointer group"
                                                      onClick={() => {
                                                        // Open image in new tab on click
                                                        const imageUrl = filePath.startsWith("/") 
                                                          ? filePath 
                                                          : `/${filePath}`;
                                                        window.open(imageUrl, '_blank');
                                                      }}
                                                    >
                                                      <div className="relative">
                                                        <img
                                                          src={filePath.startsWith("/") ? filePath : `/${filePath}`}
                                                          alt={originalName}
                                                          className="max-w-full max-h-64 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                                                          onError={(e) => {
                                                            // Fallback if image fails to load
                                                            e.currentTarget.style.display = "none";
                                                          }}
                                                        />
                                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-lg flex items-center justify-center">
                                                          <div className="opacity-0 group-hover:opacity-100 text-white bg-black bg-opacity-50 px-2 py-1 rounded text-xs transition-opacity">
                                                            Click to view full size
                                                          </div>
                                                        </div>
                                                      </div>
                                                      <p className="text-xs text-gray-500 mt-1 truncate" title={originalName}>
                                                        {originalName}
                                                      </p>
                                                    </div>
                                                  );
                                                } else {
                                                  return (
                                                    <div
                                                      key={index}
                                                      className="flex items-center gap-2 p-2 bg-gray-50 rounded-md"
                                                    >
                                                      <svg
                                                        className="w-5 h-5 text-gray-500"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                      >
                                                        <path
                                                          strokeLinecap="round"
                                                          strokeLinejoin="round"
                                                          strokeWidth={2}
                                                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                        />
                                                      </svg>
                                                      <a
                                                        href={filePath.startsWith("/") ? filePath : `/${filePath}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm text-blue-600 hover:text-blue-800 underline flex-1 truncate"
                                                        title={originalName}
                                                      >
                                                        {originalName}
                                                      </a>
                                                    </div>
                                                  );
                                                }
                                              },
                                            )}
                                          </div>
                                        </div>
                                      )}

                                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                                      <span>{log.author || "System User"}</span>
                                      <span>
                                        {new Date(
                                          log.createdAt,
                                        ).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "2-digit",
                                          year: "numeric",
                                        })}{" "}
                                        {new Date(
                                          log.createdAt,
                                        ).toLocaleTimeString("en-US", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                    </div>

                                    {/* File Attachments */}
                                    {log.attachments &&
                                      log.attachments.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                          {log.attachments.map(
                                            (attachment: any, index: number) => (
                                              <div
                                                key={index}
                                                className="flex items-center space-x-1 bg-gray-100 px-2 py-1 rounded cursor-pointer hover:bg-gray-200"
                                                onClick={() =>
                                                  setPreviewImage({
                                                    src: attachment.url,
                                                    name: attachment.name,
                                                  })
                                                }
                                              >
                                                <Paperclip className="h-3 w-3 text-gray-500" />
                                                <span className="text-xs text-gray-600 truncate max-w-[100px]">
                                                  {attachment.name}
                                                </span>
                                              </div>
                                            ),
                                          )}
                                        </div>
                                      )}
                                  </div>

                                  {/* Actions Menu */}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => {
                                          // Set form values for editing
                                          setEditingNoteId(log.id);
                                          noteForm.setValue(
                                            "title",
                                            log.title || "",
                                          );
                                          noteForm.setValue(
                                            "content",
                                            log.description ||
                                              log.content ||
                                              "",
                                          );
                                          noteForm.setValue(
                                            "type",
                                            log.logType || "note",
                                          );
                                          // Scroll to form
                                          const formElement =
                                            document.querySelector(
                                              ".space-y-4 form",
                                            );
                                          if (formElement) {
                                            formElement.scrollIntoView({
                                              behavior: "smooth",
                                              block: "center",
                                            });
                                          }
                                          toast({
                                            title: "Note loaded for editing",
                                            description:
                                              "Make your changes and click Update Note",
                                          });
                                        }}
                                      >
                                        <Edit className="h-4 w-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() =>
                                          deleteLogMutation.mutate(log.id)
                                        }
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      {(projectLogsQuery.data || []).length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-lg font-medium mb-2">
                            No notes yet
                          </p>
                          <p className="text-sm">
                            Add your first note using the form above
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            </TabsContent>
          )}

          {/* Task Management Tab */}
          <TabsContent value="tasks" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5" />
                    <span>Task Management</span>
                  </CardTitle>
                  <Button
                    onClick={() => setIsTaskDialogOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task Title</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tasksLoading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <div className="flex items-center justify-center">
                              <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                              Loading tasks...
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : projectTasks.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            No tasks found for this project
                          </TableCell>
                        </TableRow>
                      ) : (
                        projectTasks.map((task: any) => (
                          <TableRow key={task.id}>
                            <TableCell className="font-medium">
                              {task.title}
                            </TableCell>
                            <TableCell>
                              {task.assignedToOther || task.assignedUser?.name || 'Unassigned'}
                            </TableCell>
                            <TableCell>
                              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge className={getPriorityColor(task.priority)}>
                                {task.priority}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(task.status)}>
                                {task.status.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleTaskEdit(task)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {currentUser?.role === 'admin' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                    onClick={() => handleTaskDelete(task.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Progress Tracker Tab */}
          <TabsContent value="progress" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Overall Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      {projectProgress}%
                    </div>
                    <ProgressBar value={projectProgress} className="mb-4" />
                    <p className="text-sm text-gray-500">
                      {stageProgress.completed} of {stageProgress.total} stages
                      completed
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Project Stage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      "prospect",
                      "recce-done",
                      "design-in-progress",
                      "design-approved",
                      "estimate-given",
                      "client-approved",
                      "production",
                      "installation",
                      "handover",
                      "completed",
                    ].map((stage, index) => (
                      <div key={stage} className="flex items-center space-x-3">
                        {project.stage === stage ? (
                          <CheckCircle2 className="h-5 w-5 text-amber-900" />
                        ) : index <
                          [
                            "prospect",
                            "recce-done",
                            "design-in-progress",
                            "design-approved",
                            "estimate-given",
                            "client-approved",
                            "production",
                            "installation",
                            "handover",
                            "completed",
                          ].indexOf(project.stage) ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-gray-300" />
                        )}
                        <span
                          className={`text-sm ${project.stage === stage ? "font-medium text-amber-900" : "text-gray-600"}`}
                        >
                          {stage
                            .replace("-", " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Task Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Pending</span>
                      <Badge className="bg-gray-100 text-gray-800">
                        {taskSummary.pending}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">In Progress</span>
                      <Badge className="bg-blue-100 text-blue-800">
                        {taskSummary.inProgress}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Completed</span>
                      <Badge className="bg-green-100 text-green-800">
                        {taskSummary.completed}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Client Communication Tab */}
          <TabsContent value="communication" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center space-x-2">
                    <MessageCircle className="h-5 w-5" />
                    <span>Client Communication Tracker</span>
                  </CardTitle>
                  <Button
                    onClick={() => setIsCommunicationDialogOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Log Communication
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockCommunications.map((comm) => (
                    <Card
                      key={comm.id}
                      className="border-l-4 border-l-green-500"
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              {comm.type === "whatsapp" && (
                                <MessageCircle className="h-4 w-4 text-green-600" />
                              )}
                              {comm.type === "email" && (
                                <Mail className="h-4 w-4 text-blue-600" />
                              )}
                              {comm.type === "call" && (
                                <Phone className="h-4 w-4 text-orange-600" />
                              )}
                              {comm.type === "meeting" && (
                                <Users className="h-4 w-4 text-purple-600" />
                              )}
                              <Badge variant="outline" className="text-xs">
                                {comm.type}
                              </Badge>
                              <Badge className={getStatusColor(comm.status)}>
                                {comm.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-900 mb-2">
                              {comm.content}
                            </p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>Contact: {comm.contactPerson}</span>
                              <span>Date: {comm.createdAt}</span>
                              {comm.followUpDate && (
                                <span>Follow-up: {comm.followUpDate}</span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="p-6 bg-gray-50">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Material Requests (Orders)
              </h3>
              <Link href={`/requests?projectId=${projectId}`}>
                <Button
                  className="bg-amber-900 hover:bg-amber-800 text-white"
                  style={{
                    backgroundColor: "hsl(28, 100%, 25%)",
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = "hsl(28, 100%, 20%)"}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = "hsl(28, 100%, 25%)"}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Order
                </Button>
              </Link>
            </div>

            {ordersLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-lg p-4 animate-pulse"
                  >
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : projectOrders.length > 0 ? (
              <div className="space-y-3">
                {projectOrders.map((order: any) => (
                  <Card 
                    key={order.id} 
                    className="bg-white hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => {
                      console.log('Order clicked:', order);
                      setSelectedOrder(order);
                    }}
                  >
                    <CardContent className="p-3">
                      {/* Compact single-line format: Order no | requested by | Date */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 text-sm">
                          <span className="font-semibold text-gray-900">
                            Order #{order.orderNumber}
                          </span>
                          <span className="text-gray-500">|</span>
                          <span className="text-gray-600">
                            Requested By: {order.requestedByUser?.username || order.requestedByUser?.name || order.clientName || `User ${order.requestedBy}`}
                          </span>
                          <span className="text-gray-500">|</span>
                          <span className="text-gray-600">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          {canViewFinances && (
                            <span className="text-sm font-medium text-gray-900">
                              ₹{(order.totalValue || 0).toLocaleString()}
                            </span>
                          )}
                          <Badge
                            variant={
                              order.status === "completed"
                                ? "default"
                                : order.status === "approved"
                                  ? "secondary"
                                  : order.status === "pending"
                                    ? "outline"
                                    : "destructive"
                            }
                            className={`text-xs ${
                              order.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : order.status === "approved"
                                  ? "bg-blue-100 text-blue-800"
                                  : order.status === "pending"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : ""
                            }`}
                          >
                            {order.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Second line: Items summary */}
                      {order.items && order.items.length > 0 && (
                        <div className="mt-2 text-xs text-gray-600">
                          Items ({order.items.length}): {order.items.slice(0, 3).map((item: any, index: number) => (
                            <span key={index}>
                              {item.product?.name || item.productName || item.description || "Unknown Product"}
                              {index < Math.min(order.items.length - 1, 2) ? ", " : ""}
                            </span>
                          ))}
                          {order.items.length > 3 && (
                            <span className="text-gray-400">
                              , +{order.items.length - 3} more...
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Building2 className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Material Requests
                </h3>
                <p className="text-gray-500 mb-6">
                  Create your first material request for this project
                </p>
                <Link href={`/requests?projectId=${projectId}`}>
                  <Button
                    className="bg-amber-900 hover:bg-amber-800 text-white"
                    style={{
                      backgroundColor: "hsl(28, 100%, 25%)",
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = "hsl(28, 100%, 20%)"}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = "hsl(28, 100%, 25%)"}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Order
                  </Button>
                </Link>
              </div>
            )}
          </TabsContent>

          <TabsContent value="activities" className="p-6 bg-gray-50">
            <ProjectActivities projectId={projectId} />
          </TabsContent>

          {canViewFinances && (
            <TabsContent value="quotes" className="p-6 bg-gray-50">
              <ProjectQuotes projectId={projectId} />
            </TabsContent>
          )}

          {canViewFinances && (
            <TabsContent value="workorders" className="p-6 bg-gray-50">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Work Orders & Production</h3>
                    <p className="text-sm text-gray-600">View production status and work orders for this project</p>
                  </div>
                  <Button 
                    onClick={() => setLocation('/production/work-orders')}
                    className="bg-furnili-primary hover:bg-furnili-primary/90"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Production Dashboard
                  </Button>
                </div>

                <ProjectWorkOrders projectId={projectId} />
              </div>
            </TabsContent>
          )}

          {canViewFinances && (
            <TabsContent value="financials" className="p-6 bg-gray-50">
              <ProjectFinancials projectId={projectId} />
            </TabsContent>
          )}

          {canViewFinances && (
            <TabsContent value="details" className="p-6 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Project Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Project Name
                    </label>
                    <p className="text-gray-900">{project.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Project Code
                    </label>
                    <p className="text-gray-900">{project.code}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Description
                    </label>
                    <p className="text-gray-900">
                      {project.description || "No description provided"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Stage
                    </label>
                    <p className="text-gray-900">
                      {project.stage
                        .replace("-", " ")
                        .replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Client Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {client ? (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Client Name
                        </label>
                        <p className="text-gray-900">{client.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Email
                        </label>
                        <p className="text-gray-900">{client.email || "N/A"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Mobile
                        </label>
                        <p className="text-gray-900">{client.mobile}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Phone
                        </label>
                        <p className="text-gray-900">{client.phone || "N/A"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Contact Person
                        </label>
                        <p className="text-gray-900">{client.contactPerson || "N/A"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          Address
                        </label>
                        <p className="text-gray-900">
                          {client.address1 ? (
                            <>
                              {client.address1}
                              {client.address2 && <><br/>{client.address2}</>}
                              <br/>{client.city}, {client.state} - {client.pinCode}
                            </>
                          ) : "N/A"}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">
                          GST Number
                        </label>
                        <p className="text-gray-900">{client.gstNumber || "N/A"}</p>
                      </div>
                    </>
                  ) : (
                    <p className="text-gray-500">
                      Loading client information...
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Task Dialog */}
      <Dialog open={isTaskDialogOpen} onOpenChange={(open) => {
        setIsTaskDialogOpen(open);
        if (!open) {
          setEditingTask(null);
          taskForm.reset();
        }
      }}>
        <DialogContent className="max-w-[90vw] sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
            <DialogDescription>
              {editingTask ? 'Update the task details' : 'Create a new task for this project'}
            </DialogDescription>
          </DialogHeader>
          <Form {...taskForm}>
            <form onSubmit={taskForm.handleSubmit(handleTaskSubmit)} className="space-y-3">
              <FormField
                control={taskForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Task Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter task title" className="h-8" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={taskForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter task description"
                        className="min-h-[60px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  control={taskForm.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Assigned To</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select user" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {users.map((user: any) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.name || user.username}
                            </SelectItem>
                          ))}
                          <SelectItem value="other">Others</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {taskForm.watch("assignedTo") === "other" && (
                  <FormField
                    control={taskForm.control}
                    name="assignedToOther"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Other Person Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter person name" className="h-8" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={taskForm.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" className="h-8" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  control={taskForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Priority</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={taskForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Status</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in-progress">
                            In Progress
                          </SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  className="btn-outline"
                  onClick={() => setIsTaskDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="btn-primary">
                  {editingTask ? 'Update Task' : 'Add Task'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Project Note</DialogTitle>
            <DialogDescription>
              Add a note or log entry for this project
            </DialogDescription>
          </DialogHeader>
          <Form {...noteForm}>
            <form
              onSubmit={noteForm.handleSubmit(handleNoteCreate)}
              className="space-y-3"
            >
              <FormField
                control={noteForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter note title..." className="h-8" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={noteForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Note *</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter your note..." className="min-h-[60px]" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={noteForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Note Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select note type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="note">General Note</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="call">Phone Call</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNoteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="btn-primary">
                  Add Note
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Communication Dialog */}
      <Dialog
        open={isCommunicationDialogOpen}
        onOpenChange={setIsCommunicationDialogOpen}
      >
        <DialogContent className="max-w-[90vw] sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Log Client Communication</DialogTitle>
            <DialogDescription>
              Record communication with the client for this project
            </DialogDescription>
          </DialogHeader>
          <Form {...communicationForm}>
            <form className="space-y-3">
              <FormField
                control={communicationForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Communication Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select communication type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="call">Phone Call</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={communicationForm.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Communication Details</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter communication details..."
                        className="min-h-[60px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  control={communicationForm.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Contact Person</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter contact person" className="h-8" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={communicationForm.control}
                  name="followUpDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Follow-up Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCommunicationDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Log Communication</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Upload Files Dialog - Matching Mockup Design */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Upload Files
            </DialogTitle>
            <DialogDescription>
              Upload files to organize in project categories
            </DialogDescription>
          </DialogHeader>
          <Form {...uploadForm}>
            <form
              className="space-y-3"
              onSubmit={uploadForm.handleSubmit(handleFileUpload)}
            >
              <FormField
                control={uploadForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-gray-700">
                      Type <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full bg-gray-50 border-gray-200 h-8">
                          <SelectValue placeholder="Select file type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="recce">Recce</SelectItem>
                        <SelectItem value="design">Design</SelectItem>
                        <SelectItem value="drawing">Drawing</SelectItem>
                        <SelectItem value="documents">Documents</SelectItem>
                        <SelectItem value="site-photos">Site Photos</SelectItem>
                        <SelectItem value="moodboard">
                          Moodboard Images
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={uploadForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium text-gray-700">
                      Title <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter file title"
                        className="w-full bg-gray-50 border-gray-200 h-8"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Select Files <span className="text-red-500">*</span>
                </label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() =>
                    document.getElementById("file-upload")?.click()
                  }
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add(
                      "border-blue-400",
                      "bg-blue-50",
                    );
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove(
                      "border-blue-400",
                      "bg-blue-50",
                    );
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove(
                      "border-blue-400",
                      "bg-blue-50",
                    );
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                      setSelectedFiles(files);
                    }
                  }}
                >
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.dwg"
                    onChange={(e) => setSelectedFiles(e.target.files)}
                    className="hidden"
                    id="file-upload"
                  />
                  <div className="space-y-3">
                    <Upload className="h-12 w-12 mx-auto text-gray-400" />
                    <div>
                      {selectedFiles && selectedFiles.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-green-700">
                            {selectedFiles.length} file(s) selected
                          </p>
                          <div className="text-xs text-gray-500 max-h-20 overflow-y-auto">
                            {Array.from(selectedFiles).map((file, index) => (
                              <div key={index} className="truncate">
                                {file.name} (
                                {(file.size / 1024 / 1024).toFixed(2)} MB)
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-gray-600 mb-1">
                            Drag and drop files here, or click to select
                          </p>
                          <p className="text-xs text-gray-400">
                            Supports: Images, PDF, DOC, DOCX, DWG
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsUploadDialogOpen(false)}
                  className="text-gray-600 border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                  disabled={
                    !selectedFiles ||
                    selectedFiles.length === 0 ||
                    fileUploadMutation.isPending
                  }
                >
                  {fileUploadMutation.isPending
                    ? "Uploading..."
                    : "Upload Files"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Moodboard Dialog */}
      <Dialog
        open={isMoodboardDialogOpen}
        onOpenChange={setIsMoodboardDialogOpen}
      >
        <DialogContent className="max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              Create New Moodboard
            </DialogTitle>
            <DialogDescription className="text-xs">
              Create a moodboard for your project with manual image uploads
            </DialogDescription>
          </DialogHeader>
          <Form {...moodboardForm}>
            <form
              onSubmit={moodboardForm.handleSubmit(handleMoodboardCreate)}
              className="space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  control={moodboardForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">
                        Moodboard Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Living Room Concept"
                          className="h-8 text-sm"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={moodboardForm.control}
                  name="roomType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium">
                        Room Type
                      </FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Select room type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="living-room">
                            Living Room
                          </SelectItem>
                          <SelectItem value="bedroom">Bedroom</SelectItem>
                          <SelectItem value="kitchen">Kitchen</SelectItem>
                          <SelectItem value="bathroom">Bathroom</SelectItem>
                          <SelectItem value="office">Office</SelectItem>
                          <SelectItem value="dining-room">
                            Dining Room
                          </SelectItem>
                          <SelectItem value="outdoor">Outdoor</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={moodboardForm.control}
                name="keywords"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-medium">
                      Keywords & Tags
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., modern, minimalist, warm colors, wood texture"
                        className="h-8 text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Note: AI preview functionality removed for simplicity */}

              {/* Inspiration type selection removed - simplified to manual upload only */}

              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 px-3 text-xs"
                  onClick={() => setIsMoodboardDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-8 px-3 text-xs"
                  disabled={createMoodboardMutation.isPending}
                >
                  {createMoodboardMutation.isPending
                    ? "Creating..."
                    : "Create Moodboard"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-lg font-semibold">
              {previewImage?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 flex items-center justify-center p-6 pt-0">
            {previewImage && (
              <img
                src={previewImage.src}
                alt={previewImage.name}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
                style={{ maxWidth: "100%", maxHeight: "70vh" }}
              />
            )}
          </div>
          <div className="flex justify-end gap-2 p-6 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowImagePreview(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                if (previewImage?.src) {
                  const link = document.createElement("a");
                  link.href = previewImage.src;
                  link.download = previewImage.name || "image";
                  link.click();
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Detail Modal - Material Request Style */}
      {selectedOrder && (
        <Dialog
          open={!!selectedOrder}
          onOpenChange={() => setSelectedOrder(null)}
        >
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Request Details - {selectedOrder.orderNumber}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Request Information & Status Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Request Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Request Information</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Client:</span> {selectedOrder.clientName || 'N/A'}
                    </div>
                    <div>
                      <span className="font-medium">Order Number:</span> {selectedOrder.orderNumber}
                    </div>
                    <div>
                      <span className="font-medium">Requested By:</span> {selectedOrder.requestedByUser?.username || selectedOrder.requestedByUser?.name || selectedOrder.clientName || `User ${selectedOrder.requestedBy}`}
                    </div>
                    <div>
                      <span className="font-medium">Date:</span> {new Date(selectedOrder.createdAt).toLocaleDateString("en-GB")}
                    </div>
                  </div>
                </div>

                {/* Status Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Status Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Status:</span>
                      <Badge 
                        variant={
                          selectedOrder.status === "completed"
                            ? "default"
                            : selectedOrder.status === "approved"
                              ? "secondary"
                              : selectedOrder.status === "pending"
                                ? "outline"
                                : "destructive"
                        }
                        className={`text-xs ${
                          selectedOrder.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : selectedOrder.status === "approved"
                              ? "bg-blue-100 text-blue-800"
                              : selectedOrder.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : ""
                        }`}
                      >
                        {selectedOrder.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Priority:</span>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {selectedOrder.priority || 'Medium'}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">Total Value:</span> ₹{(selectedOrder.totalValue || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Requested Items */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Requested Items</h3>
                  
                  {/* Table Header */}
                  <div className="bg-gray-50 rounded-t-lg border">
                    <div className="grid grid-cols-4 gap-4 p-3 text-sm font-medium text-gray-600">
                      <div>Product</div>
                      <div>Requested Qty</div>
                      <div>Unit Price</div>
                      <div>Total</div>
                    </div>
                  </div>

                  {/* Table Body */}
                  <div className="border-x border-b rounded-b-lg">
                    {selectedOrder.items.map((item: any, index: number) => (
                      <div key={index} className="grid grid-cols-4 gap-4 p-3 text-sm border-b last:border-b-0">
                        <div className="font-medium">
                          {item.product?.name || item.productName || item.description || 'Unknown Product'}
                        </div>
                        <div>
                          {item.requestedQuantity || item.quantity || 0} {item.unit || 'pieces'}
                        </div>
                        <div>
                          ₹{(item.unitPrice || item.rate || item.price || 0).toLocaleString()}
                        </div>
                        <div className="font-medium">
                          ₹{(item.totalAmount || item.amount || item.total || ((item.requestedQuantity || item.quantity || 0) * (item.unitPrice || item.rate || item.price || 0)) || 0).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
