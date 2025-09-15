import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useIsMobile, MobileCard, MobileHeading, MobileText } from "@/components/Mobile/MobileOptimizer";
import MobileTable from "@/components/Mobile/MobileTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { authenticatedApiRequest, authService } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";
import FurniliCard from "@/components/UI/FurniliCard";
import FurniliButton from "@/components/UI/FurniliButton";
import { Plus, Search, Filter, Download, Upload, Camera, Eye, Share2, Pencil, Trash2, ChevronDown, ChevronUp, TrendingDown, TrendingUp, Wallet, Calendar } from "lucide-react";
import Tesseract from 'tesseract.js';

interface PettyCashExpense {
  id: number;
  expenseDate: string;
  vendor: string; // This was paidTo in frontend but API returns vendor
  amount: number;
  paymentMode?: string;
  description?: string; // This was note in frontend but API returns description
  category: string;
  receiptImageUrl?: string;
  status: string; // "expense" or "income"
  addedBy: number;
  createdAt: string;
  projectId?: number; // Project ID for expense tracking
  orderNo?: string; // Legacy field for backward compatibility
  user?: { id: number; name: string; email: string; username?: string }; // Add username field
  project?: { id: number; code: string; name: string }; // Project information
}

interface PettyCashStats {
  totalExpenses: number;
  totalIncome: number;
  balance: number;
  currentMonthExpenses: number;
}

interface PersonalPettyCashStats {
  myExpenses: number;
  cashGivenToMe: number;
  myBalance: number;
  thisMonth: number;
}

const paymentModes = ["UPI", "GPay", "PhonePe", "Paytm", "Cash", "Bank Transfer", "Card", "Cheque"];
const categories = ["Material", "Transport", "Site", "Office", "Food", "Fuel", "Repair", "Tools", "Other"];

export default function PettyCash() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPaidBy, setSelectedPaidBy] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAddFundsDialog, setShowAddFundsDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState<PettyCashExpense | null>(null);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [showStaffBalances, setShowStaffBalances] = useState(false);
  const [showExpenseDetailsDialog, setShowExpenseDetailsDialog] = useState(false);
  const [selectedExpenseDetails, setSelectedExpenseDetails] = useState<PettyCashExpense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<PettyCashExpense | null>(null);
  
  // Month and Year selection states
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());
  
  // Mobile optimization hook
  const isMobile = useIsMobile();
  
  // Get current user
  const user = authService.getUser();
  
  // Form state - Updated to match user requirements
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    amount: "",
    paidTo: "", // Name of person/vendor
    paidBy: user ? user.id.toString() : "", // Default to current logged-in user
    purpose: "", // Purpose/Description 
    projectId: "", // Project ID for expense tracking
    orderNo: "", // Legacy field for backward compatibility
    receiptImage: null as File | null,
    billImage: null as File | null,
    materialImage: null as File | null,
    category: "", // Keep for filtering
  });

  // Add funds form state
  const [fundsFormData, setFundsFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    amount: "",
    source: "", // Source of funds
    receivedBy: "", // Staff member who received the funds
    purpose: "", // Purpose/Description 
    receiptImage: null as File | null,
  });

  const [isProcessingOCR, setIsProcessingOCR] = useState(false);

  // Reset form to initial state
  const resetFormData = () => {
    setFormData({
      date: format(new Date(), "yyyy-MM-dd"),
      amount: "",
      paidTo: "",
      paidBy: user ? user.id.toString() : "",
      purpose: "",
      projectId: "",
      orderNo: "",
      receiptImage: null,
      billImage: null,
      materialImage: null,
      category: "",
    });
  };

  // Reset funds form to initial state
  const resetFundsFormData = () => {
    setFundsFormData({
      date: format(new Date(), "yyyy-MM-dd"),
      amount: "",
      source: "",
      receivedBy: "",
      purpose: "",
      receiptImage: null,
    });
  };

  // Edit expense mutation
  const editExpenseMutation = useMutation({
    mutationFn: async ({ id, expenseData }: { id: number, expenseData: FormData }) => {
      const token = authService.getToken();
      if (!token) throw new Error('No authentication token available');
      
      const response = await fetch(`/api/petty-cash/${id}`, {
        method: "PUT",
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: expenseData,
      });
      
      if (!response.ok) throw new Error('Update failed');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash"] });
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash/my-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash/staff-balances"] });
      setShowEditDialog(false);
      setEditingExpense(null);
      toast({ title: "Success", description: "Expense updated successfully!" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update expense", variant: "destructive" });
    }
  });

  // Delete expense mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: number) => {
      return authenticatedApiRequest("DELETE", `/api/petty-cash/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash"] });
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash/my-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash/staff-balances"] });
      setExpenseToDelete(null);
      toast({ title: "Success", description: "Expense deleted successfully!" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete expense", variant: "destructive" });
    }
  });

  // Handler functions
  const handleShowExpenseDetails = (expense: PettyCashExpense) => {
    setSelectedExpenseDetails(expense);
    setShowExpenseDetailsDialog(true);
  };

  const handleEditExpense = (expense: PettyCashExpense) => {
    setEditingExpense(expense);
    setFormData({
      date: format(new Date(expense.expenseDate), "yyyy-MM-dd"),
      amount: expense.amount.toString(),
      paidTo: expense.vendor || '',
      paidBy: expense.user?.id?.toString() || '',
      purpose: expense.description || '',
      projectId: expense.projectId?.toString() || '', // Use projectId from expense
      orderNo: expense.orderNo || '',
      receiptImage: null,
      billImage: null,
      materialImage: null,
      category: expense.category
    });
    setShowEditDialog(true);
  };

  const handleDeleteExpense = (expense: PettyCashExpense) => {
    setExpenseToDelete(expense);
  };

  // Fetch expenses and stats - filter by user for staff role
  const { data: expenses = [] } = useQuery({
    queryKey: user?.role === 'staff' 
      ? ["/api/petty-cash", { userId: user.id, month: selectedMonth, year: selectedYear }] 
      : ["/api/petty-cash", { month: selectedMonth, year: selectedYear }],
    queryFn: () => {
      const params = new URLSearchParams({ 
        month: selectedMonth.toString(), 
        year: selectedYear.toString() 
      });
      
      if (user?.role === 'staff') {
        params.append('userId', user.id.toString());
      }
      
      const url = `/api/petty-cash?${params.toString()}`;
      return authenticatedApiRequest("GET", url);
    },
  });

  // Fetch stats - personal for staff, global for others
  const { data: stats } = useQuery({
    queryKey: user?.role === 'staff' ? ["/api/petty-cash/my-stats"] : ["/api/petty-cash/stats"],
    queryFn: () => {
      const endpoint = user?.role === 'staff' ? "/api/petty-cash/my-stats" : "/api/petty-cash/stats";
      return authenticatedApiRequest("GET", endpoint);
    },
  });

  const { data: staffBalances = [] } = useQuery({
    queryKey: ["/api/petty-cash/staff-balances"],
    queryFn: () => authenticatedApiRequest("GET", "/api/petty-cash/staff-balances"),
  });

  // Fetch users for Paid By dropdown
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: () => authenticatedApiRequest("GET", "/api/users"),
  });

  // Fetch projects for Project ID dropdown
  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: () => authenticatedApiRequest("GET", "/api/projects"),
  });

  // Create expense mutation
  const addExpenseMutation = useMutation({
    mutationFn: async (expenseData: FormData) => {
      // For FormData, we need to handle it specially
      const token = authService.getToken();
      if (!token) throw new Error('No authentication token available');
      
      const response = await fetch("/api/petty-cash", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: expenseData, // FormData - don't stringify or set Content-Type
      });
      
      if (!response.ok) throw new Error('Upload failed');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash"] });
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash/my-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash/staff-balances"] });
      setShowAddDialog(false);
      resetFormData();
      toast({ title: "Expense added successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to add expense", variant: "destructive" });
      // console.error("Error adding expense:", error);
    },
  });

  // Add funds mutation
  const addFundsMutation = useMutation({
    mutationFn: async (fundsData: FormData) => {
      const token = authService.getToken();
      if (!token) throw new Error('No authentication token available');
      
      const response = await fetch("/api/petty-cash/funds", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: fundsData,
      });
      
      if (!response.ok) throw new Error('Upload failed');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash"] });
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash/my-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/petty-cash/staff-balances"] });
      setShowAddFundsDialog(false);
      resetFundsFormData();
      toast({ title: "Funds added successfully" });
    },
    onError: (error) => {
      toast({ title: "Failed to add funds", variant: "destructive" });
      // console.error("Error adding funds:", error);
    },
  });



  // Platform detection for specialized OCR parsing
  const detectPlatformType = (text: string): string => {
    if (text.includes('google pay') || text.includes('gpay')) return 'googlepay';
    if (text.includes('phonepe') || text.includes('phone pe')) return 'phonepe';
    if (text.includes('paytm')) return 'paytm';
    if (text.includes('amazon pay') || text.includes('amazonpay')) return 'amazonpay';
    if (text.includes('bhim upi') || text.includes('bhim')) return 'bhimupi';
    if (text.includes('cred') || text.includes('paid securely by')) return 'cred';
    if (text.includes('bank') || text.includes('neft') || text.includes('rtgs')) return 'bank';
    if (text.includes('cash') || text.includes('receipt')) return 'cash';
    return 'generic';
  };

  // Enhanced amount extraction with platform-specific patterns
  const extractAmountByPlatform = (lines: string[], platform: string): string => {
    console.log('OCR Debug - Platform:', platform);
    console.log('OCR Debug - All lines:', lines);
    
    // For GPay, first look for prominent amounts (usually larger and with currency symbols)
    // Sort lines by potential prominence (currency symbols, larger numbers)
    const sortedLines = [...lines].sort((a, b) => {
      // Prioritize lines with rupee symbols
      const aHasRupee = /₹/.test(a);
      const bHasRupee = /₹/.test(b);
      if (aHasRupee && !bHasRupee) return -1;
      if (bHasRupee && !aHasRupee) return 1;
      
      // Then prioritize lines with larger numbers
      const aNum = (a.match(/\d+/) || ['0'])[0];
      const bNum = (b.match(/\d+/) || ['0'])[0];
      return parseInt(bNum) - parseInt(aNum);
    });
    
    console.log('OCR Debug - Sorted lines:', sortedLines);
    
    for (const line of sortedLines) {
      let amountMatch = null;
      
      switch (platform) {
        case 'googlepay':
          console.log('OCR Debug - Processing GPay line:', line);
          
          // Google Pay: Prioritize rupee symbol amounts first, then contextual amounts
          // Skip amounts that appear to be part of dates (like 25/07/2025)
          if (!/\d{1,2}\/\d{1,2}\/\d{4}/.test(line) && // Skip date formats
              !/\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(line)) { // Skip date formats
            
            // Priority 1: ₹ symbol amounts (most likely transaction amount)
            amountMatch = line.match(/₹\s?([0-9,]+\.?[0-9]*)/);
            console.log('OCR Debug - Priority 1 (₹) match:', amountMatch);
            
            // Priority 2: Context-based amounts with keywords
            if (!amountMatch) {
              amountMatch = line.match(/(?:paid|amount|sent|received)\s*₹?\s?([0-9,]+\.?[0-9]*)/i);
              console.log('OCR Debug - Priority 2 (context) match:', amountMatch);
            }
            
            // Priority 3: Rs format
            if (!amountMatch) {
              amountMatch = line.match(/rs\.?\s?([0-9,]+\.?[0-9]*)/i);
              console.log('OCR Debug - Priority 3 (Rs) match:', amountMatch);
            }
            
            // Priority 4: Standalone large numbers (likely transaction amounts)
            if (!amountMatch && !/^\d{1,2}$/.test(line.trim())) { // Skip small single/double digit numbers
              const standaloneMatch = line.match(/^([0-9,]+\.?[0-9]*)$/);
              if (standaloneMatch) {
                const num = parseFloat(standaloneMatch[1].replace(/,/g, ''));
                if (num >= 50) { // Only accept larger standalone numbers as likely amounts
                  amountMatch = standaloneMatch;
                }
              }
              console.log('OCR Debug - Priority 4 (standalone) match:', amountMatch);
            }
            
            // Priority 5: Any number followed by common currency indicators
            if (!amountMatch) {
              amountMatch = line.match(/([0-9,]+\.?[0-9]*)\s*(?:rupees?|rs\.?|₹)/i);
              console.log('OCR Debug - Priority 5 (currency indicators) match:', amountMatch);
            }
          }
          break;
        case 'phonepe':
          // PhonePe: "₹500 sent", "Amount ₹500"
          amountMatch = line.match(/(?:amount|sent|paid)?\s*₹\s?([0-9,]+\.?[0-9]*)/i);
          break;
        case 'paytm':
          // Paytm: "₹500.00", "Amount: Rs 500"
          amountMatch = line.match(/(?:amount|rs|₹)\s?([0-9,]+\.?[0-9]*)/i);
          break;
        case 'cred':
          // CRED: "₹600", "₹12,000" format - more flexible matching
          amountMatch = line.match(/₹\s?([0-9,]+\.?[0-9]*)/);
          break;
        case 'bank':
          // Bank: "Debited ₹500", "Amount: INR 500"
          amountMatch = line.match(/(?:debited|credited|amount|inr)\s*₹?\s?([0-9,]+\.?[0-9]*)/i);
          break;
        default:
          // Generic patterns - try multiple formats
          amountMatch = line.match(/₹\s?([0-9,]+\.?[0-9]*)/);
          if (!amountMatch) {
            amountMatch = line.match(/rs\.?\s?([0-9,]+\.?[0-9]*)/i);
          }
          if (!amountMatch) {
            // Try standalone number that could be amount
            amountMatch = line.match(/^([0-9,]+\.?[0-9]*)$/);
          }
      }
      
      if (amountMatch) {
        console.log('OCR Debug - Found amount match:', amountMatch);
        const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
        console.log('OCR Debug - Parsed amount:', amount);
        
        // More flexible amount range for GPay - sometimes smaller amounts are valid
        const minAmount = platform === 'googlepay' ? 1 : 10;
        
        // Validate reasonable amount range and exclude transaction IDs/years
        if (amount >= minAmount && amount <= 100000 && // Reasonable transaction amount range
            amount !== 2025 && amount !== 2024 && amount !== 2023 && // Exclude common years
            String(amount).length <= 6) { // Exclude long transaction IDs like 109214778705
          console.log('OCR Debug - Valid amount found:', amountMatch[1]);
          return amountMatch[1].replace(/,/g, '');
        } else {
          console.log('OCR Debug - Amount rejected (out of range or transaction ID):', amount);
        }
      }
    }

    console.log('OCR Debug - No valid amount found in any line');
    
    // Last resort: look for any reasonable numbers that might be amounts
    for (const line of lines) {
      const numbers = line.match(/\b\d{2,5}\b/g); // Look for 2-5 digit numbers
      if (numbers) {
        for (const numStr of numbers) {
          const num = parseInt(numStr);
          if (num >= 10 && num <= 50000 && // Reasonable expense range
              numStr !== '2025' && numStr !== '2024' && numStr !== '2023') {
            console.log('OCR Debug - Found fallback amount:', numStr);
            return numStr;
          }
        }
      }
    }

    return '';
  };

  // Enhanced recipient/vendor name extraction
  const extractRecipientByPlatform = (lines: string[], platform: string): string => {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      let recipient = '';
      
      switch (platform) {
        case 'googlepay':
          if (line.includes('to ') && !line.includes('powered')) {
            recipient = lines[i].replace(/.*to\s+/i, '').trim();
          }
          // Also look for uppercase business names
          else if (/^[A-Z][A-Z\s&]+[A-Z]$/.test(lines[i]) && lines[i].length > 3) {
            recipient = lines[i].trim();
          }
          break;
        case 'phonepe':
          if (line.includes('sent to') || line.includes('paid to')) {
            recipient = lines[i].replace(/.*(?:sent to|paid to)\s+/i, '').trim();
          }
          break;
        case 'paytm':
          if (line.includes('paid to') || line.includes('sent to')) {
            recipient = lines[i].replace(/.*(?:paid to|sent to)\s+/i, '').trim();
          }
          break;
        case 'cred':
          // CRED: Look for recipient name (usually largest text after payer info)
          if (!line.includes('paid') && !line.includes('@') && !line.includes('cred') && 
              line.length > 5 && /^[A-Z][a-z\s]+/.test(line)) {
            recipient = line.trim();
          }
          break;
        case 'bank':
          if (line.includes('beneficiary') || line.includes('payee')) {
            recipient = lines[i + 1] || '';
          }
          break;
      }
      
      if (recipient && recipient.length > 2 && recipient.length < 50) {
        return recipient.replace(/[^a-zA-Z0-9\s]/g, '').trim();
      }
    }
    return '';
  };

  // Enhanced date extraction with platform-specific formats
  const extractDateByPlatform = (text: string, platform: string): string => {
    let dateMatch = null;
    
    switch (platform) {
      case 'googlepay':
      case 'phonepe':
        // Format: "15 Aug 2025, 2:30 PM"
        dateMatch = text.match(/(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})/i);
        break;
      case 'paytm':
        // Format: "Aug 15, 2025"
        dateMatch = text.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2}),?\s+(\d{4})/i);
        if (dateMatch) {
          const [, month, day, year] = dateMatch;
          dateMatch = [null, day, month, year];
        }
        break;
      case 'bank':
        // Format: "15/08/2025" or "15-08-2025"
        dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (dateMatch) {
          const [, day, month, year] = dateMatch;
          const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
          const monthName = monthNames[parseInt(month) - 1];
          dateMatch = [null, day, monthName, year];
        }
        break;
      default:
        dateMatch = text.match(/(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})/i);
    }
    
    if (dateMatch) {
      const [, day, month, year] = dateMatch;
      const monthNum = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(month?.toLowerCase() || '') + 1;
      if (monthNum > 0) {
        return `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
    
    return '';
  };

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:image/jpeg;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  // GPT-4 Vision OCR for UPI payment screenshots
  const analyzeReceiptWithVision = async (base64Image: string) => {
    const response = await fetch('/api/ocr/vision-analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
      },
      body: JSON.stringify({
        image: base64Image,
        prompt: `Analyze this UPI payment screenshot and extract the following information in JSON format:
        {
          "amount": number (just the number, no currency symbol),
          "vendor": "string (who was paid to)",
          "paidBy": "string (who made the payment)",
          "description": "string (purpose/description of payment)",
          "date": "YYYY-MM-DD format",
          "platform": "string (GPay, PhonePe, CRED, etc.)"
        }
        
        Focus on:
        - Correctly reading ₹ (rupee) symbols and amounts
        - Extracting vendor/recipient names accurately
        - Finding payment descriptions or purposes
        - Identifying the payment platform (Google Pay, PhonePe, CRED, etc.)
        - Converting dates to YYYY-MM-DD format`
      })
    });

    if (!response.ok) {
      throw new Error('Vision API failed');
    }

    return await response.json();
  };

  // Enhanced OCR processing with GPT-4 Vision + Tesseract fallback
  // Primary: GPT-4 Vision for UPI payment screenshots (better accuracy with ₹ symbols)
  // Fallback: Tesseract.js for basic OCR if Vision API fails
  const processImageWithOCR = async (file: File) => {
    setIsProcessingOCR(true);
    try {
      let text = '';
      let ocrMethod = '';
      
      // Try GPT-4 Vision first for better UPI data extraction
      let visionData = null;
      try {
        const base64Image = await fileToBase64(file);
        const visionResult = await analyzeReceiptWithVision(base64Image);
        
        if (visionResult.success && visionResult.data) {
          visionData = visionResult.data;
          text = visionResult.extractedText || '';
          ocrMethod = 'GPT-4 Vision';
          // console.log('GPT-4 Vision OCR Result:', visionData);
        } else {
          throw new Error('Vision API returned no data');
        }
      } catch (visionError) {
        console.log('GPT-4 Vision failed, falling back to Tesseract:', visionError);
        // Fallback to Tesseract.js
        const result = await Tesseract.recognize(file, 'eng', {
          logger: m => {} // console.log(m)
        });
        text = result.data.text;
        ocrMethod = 'Tesseract.js (fallback)';
        // console.log('Tesseract OCR Result:', text);
      }
      
      const updatedData = { ...formData };
      
      // If we have structured Vision API data, use it directly
      if (visionData) {
        if (visionData.amount && !isNaN(visionData.amount)) {
          updatedData.amount = visionData.amount;
        }
        if (visionData.vendor) {
          updatedData.paidTo = visionData.vendor;
        }
        if (visionData.description) {
          updatedData.purpose = visionData.description;
        }
        if (visionData.date) {
          updatedData.date = visionData.date;
        }
        // Try to match paidBy user
        if (visionData.paidBy) {
          const matchingUser = users.find((user: any) => {
            const userName = (user.name || user.username || '').toLowerCase();
            return userName.includes(visionData.paidBy.toLowerCase()) || 
                   visionData.paidBy.toLowerCase().includes(userName);
          });
          if (matchingUser) {
            updatedData.paidBy = matchingUser.id.toString();
          }
        }
        
        setFormData(prev => ({ ...updatedData, receiptImage: prev.receiptImage }));
        toast({ 
          title: "Payment details extracted successfully", 
          description: `Used ${ocrMethod} to extract UPI payment data` 
        });
        setIsProcessingOCR(false);
        return;
      }
      
      // Fallback to traditional text parsing for Tesseract OCR
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      // Detect platform type for specialized parsing
      const platformType = detectPlatformType(text.toLowerCase());
      // console.log('Detected Platform:', platformType);
      // console.log('OCR Text Lines:', lines);
      
      // Platform-specific amount extraction
      const extractedAmount = extractAmountByPlatform(lines, platformType);
      if (extractedAmount) {
        // Keep the amount as a clean number without rupee symbol for form processing
        updatedData.amount = extractedAmount;
      }
      
      // Platform-specific recipient extraction
      const extractedRecipient = extractRecipientByPlatform(lines, platformType);
      if (extractedRecipient) {
        updatedData.paidTo = extractedRecipient;
      }
      
      // Platform-specific date extraction
      const extractedDate = extractDateByPlatform(text, platformType);
      if (extractedDate) {
        updatedData.date = extractedDate;
      }

      // Platform-specific description extraction
      let extractedPurpose = '';
      
      if (platformType === 'cred') {
        // console.log('CRED OCR Debug - All lines:', lines);
        
        // For CRED, look for description that appears after the amount but before transaction details
        let foundAmount = false;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // Check if we found the amount line (₹600, ₹12,000 format)
          if (!foundAmount && /₹[\d,]+/.test(line)) {
            foundAmount = true;
            // console.log('CRED OCR Debug - Found amount at line', i, ':', line);
            
            // Look at the immediate next few lines for description
            for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
              const nextLine = lines[j].trim();
              // console.log('CRED OCR Debug - Checking line', j, ':', nextLine);
              
              // This should be the business description - look for simple text lines
              // Skip empty lines and lines with transaction info
              if (nextLine.length >= 3 && 
                  nextLine.length <= 50 && 
                  !nextLine.includes('|') && 
                  !nextLine.includes('paid securely') &&
                  !nextLine.includes('powered by') &&
                  !nextLine.includes('TXN ID') &&
                  !nextLine.includes('AUG') &&
                  !nextLine.includes('2025') &&
                  !/\d{4,}/.test(nextLine) && // No long numbers (transaction IDs)
                  !/\d{1,2}:\d{2}/.test(nextLine)) { // No time formats
                // console.log('CRED OCR Debug - Found potential description:', nextLine);
                extractedPurpose = nextLine;
                break;
              } else {
                // console.log('CRED OCR Debug - Skipped line (transaction info):', nextLine);
              }
            }
            break;
          }
        }
        
        // console.log('CRED OCR Debug - Final extracted purpose:', extractedPurpose);
      } else if (platformType === 'googlepay') {
        // For Google Pay, extract the complete description from the payment bubble
        // GPay bubble typically contains the full transaction context
        
        let recipientLine = '';
        let descriptionLines = [];
        
        // First pass: identify all content lines and separate recipient from description
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          const lowerLine = line.toLowerCase();
          
          // Skip obvious system/transaction lines
          if (lowerLine.includes('google pay') ||
              lowerLine.includes('upi') ||
              lowerLine.includes('transaction') ||
              lowerLine.includes('completed') ||
              lowerLine.includes('success') ||
              lowerLine.includes('sent') ||
              lowerLine.includes('powered by') ||
              lowerLine.includes('@') ||
              /^₹[\d,]+/.test(line) ||
              /^\d+$/.test(line) ||
              /^\d{1,2}\s(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(line) ||
              /^\d{1,2}:\d{2}/.test(line) ||
              line.length < 3) {
            continue;
          }
          
          // Identify recipient line (usually "To [RECIPIENT]" format)
          if (lowerLine.startsWith('to ') && line.length > 3) {
            recipientLine = line;
            continue;
          }
          
          // Collect potential description lines
          if (line.length >= 3 && line.length <= 150) {
            // Check if this is descriptive content (not just recipient names)
            const isAllCaps = /^[A-Z\s&]+$/.test(line);
            const isBusinessName = isAllCaps && line.length > 10;
            
            if (!isBusinessName) {
              descriptionLines.push(line.trim());
            }
          }
        }
        
        console.log('OCR Debug - GPay description lines:', descriptionLines);
        
        // Build the complete description from all relevant lines
        if (descriptionLines.length > 0) {
          // Filter out corrupted/garbage OCR text and meaningless content
          const meaningfulLines = descriptionLines.filter(line => {
            const lowerLine = line.toLowerCase();
            
            // Skip corrupted OCR patterns like "£1 Hore Bank 0720 v", "fEH +orc sank 0720 v"
            if (/£\d+|[£¥€]\d+|hore|bank.*\d{4}|0720\s*[vV]|[fF][eE][hH]\s*\+|\+orc|sank\s*\d{4}/i.test(line)) {
              console.log('OCR Debug - Filtering out corrupted text:', line);
              return false;
            }
            
            // Skip generic corrupted patterns common in OCR
            if (/^[^a-zA-Z]*[a-zA-Z]{1,2}[^a-zA-Z]*$/.test(line) || // Single/double letters with symbols
                /^[^\w]*\w{1,3}[^\w]*$/.test(line) || // Very short words with symbols
                /[+#@$%^&*]{2,}/.test(line) || // Multiple special characters
                /\b[a-zA-Z]\+[a-zA-Z]/.test(line)) { // Letters connected with +
              console.log('OCR Debug - Filtering out corrupted pattern:', line);
              return false;
            }
            
            // Skip generic/metadata lines
            if (lowerLine.includes('transaction') || 
                lowerLine.includes('completed') ||
                lowerLine.includes('success') ||
                lowerLine.includes('upi id') ||
                /^\d+$/.test(line.trim())) {
              return false;
            }
            
            // Keep lines that contain business context or descriptive information
            return line.split(' ').length >= 2 || 
                   ['furnili', 'steel', 'wood', 'material', 'thiner', 'paint', 'hardware', 'purchase', 'order', 'supply', 'for', 'cleaning', 'tops', 'edge', 'pati', 'fevixol', 'ashish'].some(term => lowerLine.includes(term));
          });
          
          console.log('OCR Debug - Meaningful lines after filtering:', meaningfulLines);
          
          if (meaningfulLines.length === 1) {
            extractedPurpose = meaningfulLines[0];
          } else if (meaningfulLines.length > 1) {
            // Combine related descriptions, avoiding redundancy
            extractedPurpose = meaningfulLines.join(' ');
          } else {
            // If no meaningful lines found, fallback to any business-related content
            const fallbackLine = descriptionLines.find(line => 
              ['furnili', 'table', 'courier', 'steel', 'wood', 'material', 'hardware'].some(term => 
                line.toLowerCase().includes(term)
              )
            );
            if (fallbackLine) {
              extractedPurpose = fallbackLine;
              console.log('OCR Debug - Using fallback description:', fallbackLine);
            }
          }
        }
        
        // Alternative: Look for complete business descriptions from GPay bubble
        if (!extractedPurpose) {
          // For GPay, collect all descriptive lines that appear in the payment bubble
          const potentialDescriptions = [];
          
          for (const line of lines) {
            const lowerLine = line.toLowerCase();
            
            // Skip obvious transaction metadata
            if (lowerLine.includes('google pay') ||
                lowerLine.includes('upi') ||
                lowerLine.includes('transaction') ||
                lowerLine.includes('completed') ||
                lowerLine.includes('powered by') ||
                lowerLine.includes('success') ||
                lowerLine.includes('sent') ||
                lowerLine.startsWith('to ') ||
                lowerLine.includes('@') ||
                /^₹[\d,]+/.test(line) || // Skip amounts
                /^\d+$/.test(line) || // Skip standalone numbers
                /^\d{1,2}\s(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(line) ||
                /^\d{1,2}:\d{2}/.test(line) ||
                line.match(/^[A-Z\s&]+$/) || // Skip all-caps business names like "HARIOM HARDWARE"
                line.length < 3 || line.length > 100) {
              continue;
            }
            
            // Collect all descriptive text that could be part of the payment purpose
            // This includes business terms, product descriptions, or general descriptive text
            const businessTerms = ['furnili', 'steel', 'wood', 'material', 'thiner', 'paint', 'hardware', 'purchase', 'order', 'supply', 'for', 'cleaning', 'tops'];
            const hasBusinessTerm = businessTerms.some(term => lowerLine.includes(term));
            
            // Accept lines with business terms or reasonable descriptive text
            if (hasBusinessTerm || (line.split(' ').length >= 2 && line.split(' ').length <= 10)) {
              potentialDescriptions.push(line.trim());
            }
          }
          
          // Combine all potential descriptions into a complete description
          if (potentialDescriptions.length > 0) {
            // For GPay, typically the full description is either one comprehensive line
            // or multiple related lines that should be combined
            if (potentialDescriptions.length === 1) {
              extractedPurpose = potentialDescriptions[0];
            } else {
              // Combine multiple descriptive lines, but avoid duplicates
              const uniqueDescriptions = Array.from(new Set(potentialDescriptions));
              extractedPurpose = uniqueDescriptions.join(' - ');
            }
          }
        }
      }
      
      // Enhanced description cleaning and validation
      if (extractedPurpose) {
        // Clean up the extracted purpose
        let cleanPurpose = extractedPurpose
          .replace(/[£¥€]/g, '₹') // Replace foreign currency symbols
          .replace(/[+#@$%^&*]{2,}/g, ' ') // Replace multiple special chars with space
          .replace(/\b[fF][eE][hH]\b/g, '') // Remove common OCR errors like "fEH"
          .replace(/\b[oO][rR][cC]\b/g, '') // Remove "orc" OCR errors
          .replace(/\bsank\b/gi, '') // Remove "sank" OCR errors
          .replace(/\b\d{4}\s*[vV]\b/g, '') // Remove patterns like "0720 v"
          .replace(/\s+/g, ' ') // Multiple spaces to single
          .trim();
        
        // Only use if it's meaningful after cleaning
        if (cleanPurpose.length > 3 && !/^[^a-zA-Z]*$/.test(cleanPurpose)) {
          updatedData.purpose = cleanPurpose;
        }
      }
      
      // Set fallback purpose if none found or if cleaned purpose is too short
      if (!updatedData.purpose || updatedData.purpose.length < 3) {
        if (extractedRecipient && platformType === 'googlepay') {
          updatedData.purpose = `Payment to ${extractedRecipient}`;
        } else if (extractedRecipient) {
          updatedData.purpose = `Payment to ${extractedRecipient}`;
        } else if (platformType !== 'generic') {
          const platformNames = {
            googlepay: 'Google Pay',
            phonepe: 'PhonePe', 
            paytm: 'Paytm',
            amazonpay: 'Amazon Pay',
            bhimupi: 'BHIM UPI',
            cred: 'CRED',
            bank: 'Bank Transfer',
            cash: 'Cash Payment'
          };
          updatedData.purpose = `${platformNames[platformType as keyof typeof platformNames] || 'Digital'} payment`;
        }
      }
      
      // Enhanced Paid By and Paid To extraction
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Pattern 1: "Name paid" - extract the name before "paid"
        if (line.toLowerCase().includes('paid') && !line.toLowerCase().includes('securely')) {
          const paidByMatch = line.match(/^(.+?)\s+paid/i);
          if (paidByMatch) {
            const paidByName = paidByMatch[1].trim();
            // Find user ID by name (more flexible matching)
            const matchingUser = users.find((user: any) => {
              const userName = (user.name || user.username || '').toLowerCase();
              const extractedName = paidByName.toLowerCase();
              return userName.includes(extractedName) || extractedName.includes(userName);
            });
            if (matchingUser) {
              updatedData.paidBy = matchingUser.id.toString();
            }
          }
          
          // Look for recipient in next few lines
          for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
            const nextLine = lines[j].trim();
            // Check if it looks like a name (contains letters, reasonable length)
            if (/^[a-zA-Z\s.]+$/.test(nextLine) && nextLine.length > 2 && nextLine.length < 50 && !nextLine.includes('@')) {
              // Skip common UPI terms
              const skipTerms = ['transaction', 'successful', 'completed', 'bank', 'upi', 'payment', 'sent', 'received'];
              if (!skipTerms.some(term => nextLine.toLowerCase().includes(term))) {
                updatedData.paidTo = nextLine;
                break;
              }
            }
          }
          break;
        }
        
        // Pattern 2: "To: Name" format
        const toMatch = line.match(/^to:\s*(.+)/i);
        if (toMatch && !updatedData.paidTo) {
          const name = toMatch[1].trim();
          if (name.length > 2 && name.length < 50 && /^[a-zA-Z\s.]+$/.test(name)) {
            updatedData.paidTo = name;
          }
        }
      }
      
      // Extract purpose/description - Enhanced for Google Pay transactions
      let bestPurpose = '';
      let bestPurposeScore = 0;
      
      // Look for descriptive text with improved Google Pay detection
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const lowerLine = line.toLowerCase();
        
        // Skip obvious non-descriptive lines
        if (line.length < 3 || 
            /^[0-9,\.\s₹]+$/.test(line) || // Just numbers/currency
            lowerLine.includes('completed') ||
            lowerLine.includes('transaction') ||
            lowerLine.includes('powered by') ||
            lowerLine.includes('google pay') ||
            lowerLine.includes('upi') ||
            lowerLine.includes('@') ||
            /^\d{1,2}\s(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(line) || // Dates
            /^\d{1,2}:\d{2}\s(am|pm)/i.test(line) || // Times
            /^[A-Z]{2,}\s[A-Z]{2,}/.test(line) || // All caps names like "EDGE INDIA"
            line === updatedData.paidTo // Skip if same as paidTo
        ) {
          continue;
        }

        // Calculate relevance score for potential purpose lines
        let score = 0;
        
        // Bonus points for containing business-relevant terms
        const businessTerms = ['furnili', 'edge', 'pati', 'inch', 'pcs', 'pieces', 'material', 'wood', 'steel', 'order', 'for', 'purchase', 'hardware', 'tools', 'paint', 'supply', 'delivery'];
        businessTerms.forEach(term => {
          if (lowerLine.includes(term)) {
            score += 2;
          }
        });
        
        // Penalty for obvious OCR errors
        const ocrErrorPatterns = ['£', 'hore', 'orc', 'sank', 'feh', '+'];
        let errorPenalty = 0;
        ocrErrorPatterns.forEach(pattern => {
          if (lowerLine.includes(pattern)) {
            errorPenalty += 3;
          }
        });
        score -= errorPenalty;
        
        // Bonus for having multiple words (likely descriptive)
        const wordCount = line.split(/\s+/).length;
        if (wordCount >= 3) score += 1;
        if (wordCount >= 5) score += 2;
        
        // Bonus for containing numbers (like dimensions or quantities)
        if (/\d+/.test(line) && !line.match(/^\d+$/)) {
          score += 1;
        }
        
        // Special bonus for Google Pay format like "furnili edge pati for 8ftx8inch 36pcs"
        if (lowerLine.includes('for') && /\d+/.test(line)) {
          score += 3;
        }
        
        // Update best purpose if this line scores higher
        if (score > bestPurposeScore && score > 0) {
          bestPurpose = line;
          bestPurposeScore = score;
        }
      }
      
      // Set the best purpose found (only if it's meaningful and clean)
      if (bestPurpose && bestPurposeScore > 0) {
        // Final cleaning of the best purpose
        let cleanedPurpose = bestPurpose
          .replace(/[£¥€]/g, '₹')
          .replace(/[+#@$%^&*]{2,}/g, ' ')
          .replace(/\b[fF][eE][hH]\b/g, '')
          .replace(/\b[oO][rR][cC]\b/g, '')
          .replace(/\bsank\b/gi, '')
          .replace(/\b\d{4}\s*[vV]\b/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (cleanedPurpose.length > 3 && !/^[^a-zA-Z]*$/.test(cleanedPurpose)) {
          updatedData.purpose = cleanedPurpose;
        }
      }
      
      // Legacy processing for order-specific lines (keep existing logic)
      const purposeLines = lines.filter(line => {
        const lowerLine = line.toLowerCase();
        return line.length > 5 && 
               !lowerLine.includes('paid') && 
               !lowerLine.includes('@') && 
               !lowerLine.includes('txn') &&
               !lowerLine.includes('powered') &&
               !lowerLine.includes('cred') &&
               !lowerLine.includes('securely') &&
               !/^[0-9,\.\s₹]+$/.test(line) &&
               !lowerLine.includes('jul') &&
               !lowerLine.includes('pm') &&
               !lowerLine.includes('am') &&
               !/^\d{4}$/.test(line) && // Skip year numbers
               line.includes(' ') && // Ensure it has multiple words
               !/^[A-Z\s]+$/.test(line) && // Skip all-caps names like "DOLLY VIKESH OSWAL"
               line.trim() !== updatedData.paidTo; // Don't use the same line as paidTo
      });
      
      // Process purpose lines for order information (fallback if no better purpose found)
      if (!updatedData.purpose) {
        for (const line of purposeLines) {
          const purposeText = line.trim();
          const lowerLine = line.toLowerCase();
          
          // Check if this line contains order information
          if (lowerLine.includes('order')) {
            // Pattern: "description - name order" or "description name order"
            const dashSplit = purposeText.split(/\s*[-–]\s*/);
            if (dashSplit.length >= 2) {
              // Found dash: "furnili Powder cosring legs - pintu order"
              updatedData.purpose = dashSplit[0].trim();
              const orderPart = dashSplit[1].trim();
              // Extract order name before "order"
              const orderName = orderPart.replace(/\s+order$/i, '').trim();
              updatedData.orderNo = orderName.charAt(0).toUpperCase() + orderName.slice(1) + " Order";
            } else {
              // No dash, try to split before "order"
              const orderMatch = purposeText.match(/(.+?)\s+(\w+)\s+order/i);
              if (orderMatch) {
                updatedData.purpose = orderMatch[1].trim();
                updatedData.orderNo = orderMatch[2].charAt(0).toUpperCase() + orderMatch[2].slice(1) + " Order";
              } else {
                updatedData.purpose = purposeText;
              }
            }
            break; // Found order info, stop here
          }
        }
      }
      
      // If no order info found, use the first descriptive line as purpose
      if (!updatedData.purpose && purposeLines.length > 0) {
        updatedData.purpose = purposeLines[0].trim();
      }
      
      // Extract date
      const dateMatch = text.match(/(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{4})/i);
      if (dateMatch) {
        const [, day, month, year] = dateMatch;
        const monthNum = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].indexOf(month.toUpperCase()) + 1;
        if (monthNum > 0) {
          const formattedDate = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          updatedData.date = formattedDate;
        }
      }
      
      setFormData(prev => ({ ...updatedData, receiptImage: prev.receiptImage }));
      toast({ title: "Payment details extracted from screenshot", description: "Review and submit the expense" });
    } catch (error) {
      // console.error('OCR Error:', error);
      toast({ title: "OCR processing failed", description: "Please fill the details manually", variant: "destructive" });
    }
    setIsProcessingOCR(false);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSpecificImageUpload = (event: React.ChangeEvent<HTMLInputElement>, imageType: 'bill' | 'material') => {
    const file = event.target.files?.[0];
    if (file) {
      if (imageType === 'bill') {
        setFormData(prev => ({ ...prev, billImage: file }));
      } else {
        setFormData(prev => ({ ...prev, materialImage: file }));
      }
    }
  };

  const handleFileDrop = (e: React.DragEvent, imageType: 'bill' | 'material') => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      if (imageType === 'bill') {
        setFormData(prev => ({ ...prev, billImage: imageFile }));
      } else {
        setFormData(prev => ({ ...prev, materialImage: imageFile }));
      }
    } else {
      toast({ title: "Invalid file", description: "Please upload an image file", variant: "destructive" });
    }
  };

  const handleImagePaste = (e: React.ClipboardEvent, imageType: 'bill' | 'material') => {
    e.preventDefault();
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find(item => item.type.startsWith('image/'));
    
    if (imageItem) {
      const file = imageItem.getAsFile();
      if (file) {
        if (imageType === 'bill') {
          setFormData(prev => ({ ...prev, billImage: file }));
        } else {
          setFormData(prev => ({ ...prev, materialImage: file }));
        }
        toast({ title: "Image pasted", description: `${imageType === 'bill' ? 'Bill' : 'Material'} image added successfully` });
      }
    }
  };

  const processFile = (file: File) => {
    console.log('Processing file:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    });
    
    setFormData(prev => ({ ...prev, receiptImage: file }));
    
    // Auto-process with OCR if it's an image
    if (file.type.startsWith('image/')) {
      processImageWithOCR(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      processFile(imageFile);
    } else {
      toast({ title: "Invalid file", description: "Please upload an image file", variant: "destructive" });
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find(item => item.type.startsWith('image/'));
    
    if (imageItem) {
      const file = imageItem.getAsFile();
      if (file) {
        // Create a new file with proper naming for pasted images
        const timestamp = Date.now();
        const extension = file.type.includes('png') ? '.png' : '.jpg';
        const renamedFile = new File([file], `pasted-receipt-${timestamp}${extension}`, {
          type: file.type,
          lastModified: Date.now(),
        });
        
        console.log('Pasted image details:', {
          originalName: file.name,
          newName: renamedFile.name,
          type: renamedFile.type,
          size: renamedFile.size
        });
        
        processFile(renamedFile);
        toast({ title: "Image pasted", description: "Processing with OCR...", });
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const formDataToSend = new FormData();
    formDataToSend.append('expenseDate', formData.date);
    formDataToSend.append('vendor', formData.paidTo); // Changed from paidTo to vendor
    formDataToSend.append('amount', formData.amount);
    formDataToSend.append('paidBy', formData.paidBy);
    formDataToSend.append('description', formData.purpose); // Changed from note to description
    formDataToSend.append('category', formData.category);
    formDataToSend.append('projectId', formData.projectId);
    formDataToSend.append('orderNo', formData.orderNo);
    
    if (formData.receiptImage) {
      formDataToSend.append('receipt', formData.receiptImage);
    }

    if (formData.billImage) {
      formDataToSend.append('bill', formData.billImage);
    }

    if (formData.materialImage) {
      formDataToSend.append('material', formData.materialImage);
    }

    
    // Log all FormData entries for debugging
    // console.log("FormData entries:");
    // const entries = Array.from(formDataToSend.entries());
    // entries.forEach(([key, value]) => {
    //   console.log(key, value);
    // });
    
    addExpenseMutation.mutate(formDataToSend);
  };

  // Filter expenses
  const filteredExpenses = expenses.filter((expense: PettyCashExpense) => {
    const matchesSearch = expense.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    const matchesCategory = !selectedCategory || selectedCategory === 'all' || expense.category === selectedCategory;
    const paidByName = expense.user?.name || expense.user?.username || '';
    const matchesPaidBy = !selectedPaidBy || selectedPaidBy === 'all' || paidByName === selectedPaidBy;
    const matchesDate = !dateFilter || expense.expenseDate.startsWith(dateFilter);
    
    return matchesSearch && matchesCategory && matchesPaidBy && matchesDate;
  });

  // Export functions
  const exportToWhatsApp = () => {
    // Calculate totals
    const totalIncome = filteredExpenses
      .filter((expense: PettyCashExpense) => expense.status === 'income')
      .reduce((sum: number, expense: PettyCashExpense) => sum + expense.amount, 0);
    const totalExpenses = filteredExpenses
      .filter((expense: PettyCashExpense) => expense.status === 'expense')
      .reduce((sum: number, expense: PettyCashExpense) => sum + expense.amount, 0);
    const netTotal = totalIncome - totalExpenses;

    const message = filteredExpenses.map((expense: PettyCashExpense) => 
      `${format(new Date(expense.expenseDate), 'dd MMM yyyy')} - ${expense.status === 'income' ? 'Credit' : 'Debit'} - ${expense.status === 'income' ? '+' : '-'}₹${expense.amount.toLocaleString()} - ${expense.vendor} - ${expense.category} - ${expense.description || ''}`
    ).join('\n');
    
    const totals = `\n\n📊 SUMMARY:\n💰 Total Income: +₹${totalIncome.toLocaleString()}\n💸 Total Expenses: -₹${totalExpenses.toLocaleString()}\n📈 Net Total: ${netTotal >= 0 ? '+' : ''}₹${netTotal.toLocaleString()}`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`💰 Petty Cash Report\n📅 ${format(new Date(), 'dd MMM yyyy')}\n\n${message}${totals}`)}`;
    window.open(whatsappUrl, '_blank');
  };

  const exportToExcel = () => {
    // Calculate totals
    const totalIncome = filteredExpenses
      .filter((expense: PettyCashExpense) => expense.status === 'income')
      .reduce((sum: number, expense: PettyCashExpense) => sum + expense.amount, 0);
    const totalExpenses = filteredExpenses
      .filter((expense: PettyCashExpense) => expense.status === 'expense')
      .reduce((sum: number, expense: PettyCashExpense) => sum + expense.amount, 0);
    const netTotal = totalIncome - totalExpenses;

    const csvContent = [
      'Date,Type,Amount,Paid To/Source,Paid By,Purpose,Category,Project ID,Description,Receipt Image,Bill Image,Material Image',
      ...filteredExpenses.map((expense: PettyCashExpense) => {
        const receiptImage = (expense as any).receiptImageUrl ? `"${window.location.origin}/${(expense as any).receiptImageUrl}"` : '""';
        const billImage = (expense as any).billImageUrl ? `"${window.location.origin}/${(expense as any).billImageUrl}"` : '""';
        const materialImage = (expense as any).materialImageUrl ? `"${window.location.origin}/${(expense as any).materialImageUrl}"` : '""';
        
        return `${format(new Date(expense.expenseDate), 'dd MMM yyyy')},"${expense.status === 'income' ? 'Credit' : 'Debit'}","${expense.status === 'income' ? '+' : '-'}₹${expense.amount.toLocaleString()}","${expense.vendor}","${expense.user?.name || expense.user?.username || 'N/A'}","${expense.description || ''}","${expense.category}","${expense.projectId || '-'}","${expense.description || ''}",${receiptImage},${billImage},${materialImage}`;
      }),
      '',
      'TOTALS:',
      `Total Income,+₹${totalIncome.toLocaleString()}`,
      `Total Expenses,-₹${totalExpenses.toLocaleString()}`,
      `Net Total,${netTotal >= 0 ? '+' : ''}₹${netTotal.toLocaleString()}`
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `petty-cash-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <ResponsiveLayout
      title={user?.role === 'staff' ? "My Petty Cash" : "Petty Cash Management"}
      subtitle={user?.role === 'staff' ? "Track my expenses and cash received" : "Track expenses and manage cash flow"}
    >
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
          <div>
          </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={() => {
            resetFormData();
            setShowAddDialog(true);
          }} className={`flex-1 sm:flex-none ${isMobile ? 'h-9 text-sm' : ''}`}>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
          {user?.role !== 'staff' && (
            <Button onClick={() => {
              resetFundsFormData();
              setShowAddFundsDialog(true);
            }} variant="outline" className={`flex-1 sm:flex-none bg-green-50 border-green-200 hover:bg-green-100 text-green-700 ${isMobile ? 'h-9 text-sm' : ''}`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Funds
            </Button>
          )}
        </div>
      </div>
      {/* Stats Cards */}
      {stats && (
        <>
          {/* Mobile Compact Stats - Single Line */}
          {isMobile && (
            <Card className="p-3">
              {user?.role === 'staff' ? (
                // Personal stats for staff users
                (<div className="grid grid-cols-3 gap-2 text-center">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-600">My Expenses</div>
                    <div className="text-sm font-bold text-red-600">-₹{(stats as PersonalPettyCashStats).myExpenses?.toLocaleString()}</div>
                    <div className="text-xs text-red-500">Money Spent</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-600">Cash Given to Me</div>
                    <div className="text-sm font-bold text-green-600">+₹{(stats as PersonalPettyCashStats).cashGivenToMe?.toLocaleString()}</div>
                    <div className="text-xs text-green-500">Received</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-600">My Balance</div>
                    <div className={`text-sm font-bold ${(stats as PersonalPettyCashStats).myBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(stats as PersonalPettyCashStats).myBalance >= 0 ? '+' : ''}₹{(stats as PersonalPettyCashStats).myBalance?.toLocaleString()}
                    </div>
                    <div className={`text-xs ${(stats as PersonalPettyCashStats).myBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {(stats as PersonalPettyCashStats).myBalance >= 0 ? 'Available' : 'Deficit'}
                    </div>
                  </div>
                </div>)
              ) : (
                // Global stats for admin users
                (<div className="grid grid-cols-3 gap-2 text-center">
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-600">Total Expenses</div>
                    <div className="text-sm font-bold text-red-600">-₹{(stats as PettyCashStats).totalExpenses?.toLocaleString()}</div>
                    <div className="text-xs text-red-500">Money Out</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-600">Total Funds</div>
                    <div className="text-sm font-bold text-green-600">+₹{(stats as PettyCashStats).totalIncome?.toLocaleString()}</div>
                    <div className="text-xs text-green-500">Money In</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-gray-600">Current Balance</div>
                    <div className={`text-sm font-bold ${(stats as PettyCashStats).balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(stats as PettyCashStats).balance >= 0 ? '+' : ''}₹{(stats as PettyCashStats).balance?.toLocaleString()}
                    </div>
                    <div className={`text-xs ${(stats as PettyCashStats).balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {(stats as PettyCashStats).balance >= 0 ? 'Available' : 'Deficit'}
                    </div>
                  </div>
                </div>)
              )}
              {/* This Month Stats on Mobile */}
              <div className="mt-3 pt-3 border-t text-center">
                <div className="text-xs font-medium text-gray-600">This Month</div>
                <div className="text-lg font-bold">₹{user?.role === 'staff' ? 
                  (stats as PersonalPettyCashStats).thisMonth?.toLocaleString() : 
                  (stats as PettyCashStats).currentMonthExpenses?.toLocaleString()}</div>
              </div>
            </Card>
          )}
          
          {/* Desktop Stats Cards */}
          {!isMobile && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              {user?.role === 'staff' ? (
                // Personal stats cards for staff users
                (<>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">My Expenses</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">-₹{(stats as PersonalPettyCashStats).myExpenses?.toLocaleString()}</div>
                      <p className="text-xs text-red-500 mt-1">Money Spent</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Cash Given to Me</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">+₹{(stats as PersonalPettyCashStats).cashGivenToMe?.toLocaleString()}</div>
                      <p className="text-xs text-green-500 mt-1">Received</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">My Balance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${(stats as PersonalPettyCashStats).myBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(stats as PersonalPettyCashStats).myBalance >= 0 ? '+' : ''}₹{(stats as PersonalPettyCashStats).myBalance?.toLocaleString()}
                      </div>
                      <p className={`text-xs mt-1 ${(stats as PersonalPettyCashStats).myBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {(stats as PersonalPettyCashStats).myBalance >= 0 ? 'Available' : 'Deficit'}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">This Month</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹{(stats as PersonalPettyCashStats).thisMonth?.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                </>)
              ) : (
                // Global stats cards for admin users
                (<>
                  <Card className="border-l-4 border-l-red-500">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Total Expenses (Debit)</p>
                          <p className="text-lg font-bold text-red-600">-₹{(stats as PettyCashStats).totalExpenses?.toLocaleString()}</p>
                          <p className="text-[10px] text-gray-500">Money Out</p>
                        </div>
                        <div className="h-6 w-6 bg-red-100 rounded-full flex items-center justify-center">
                          <Download className="h-3 w-3 text-red-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-green-500">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Total Funds (Credit)</p>
                          <p className="text-lg font-bold text-green-600">+₹{(stats as PettyCashStats).totalIncome?.toLocaleString()}</p>
                          <p className="text-[10px] text-gray-500">Money In</p>
                        </div>
                        <div className="h-6 w-6 bg-green-100 rounded-full flex items-center justify-center">
                          <Upload className="h-3 w-3 text-green-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className={`border-l-4 ${(stats as PettyCashStats).balance >= 0 ? 'border-l-green-500' : 'border-l-red-500'}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Current Balance</p>
                          <p className={`text-lg font-bold ${(stats as PettyCashStats).balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(stats as PettyCashStats).balance >= 0 ? '+' : ''}₹{(stats as PettyCashStats).balance?.toLocaleString()}
                          </p>
                          <p className="text-[10px] text-gray-500">Available Funds</p>
                        </div>
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                          (stats as PettyCashStats).balance >= 0 ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          <Wallet className={`h-3 w-3 ${(stats as PettyCashStats).balance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">This Month</p>
                          <p className="text-lg font-bold text-gray-900">₹{(stats as PettyCashStats).currentMonthExpenses?.toLocaleString()}</p>
                          <p className="text-[10px] text-gray-500">Monthly Damage</p>
                        </div>
                        <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <Calendar className="h-3 w-3 text-blue-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>)
              )}
            </div>
          )}
        </>
      )}

      {/* Staff Balances - Hide for staff users */}
      {user?.role !== 'staff' && staffBalances.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Individual Staff Balances</CardTitle>
                <p className="text-sm text-gray-600">Track funds received vs spent by each staff member</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStaffBalances(!showStaffBalances)}
                className="flex items-center gap-2"
              >
                {showStaffBalances ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Hide
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Show
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          {showStaffBalances && (
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {staffBalances.map((staff: any) => (
                <div key={staff.userId} className="p-4 border rounded-lg bg-gray-50">
                  <div className="font-medium text-sm mb-2">{staff.userName}</div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-green-600">Received:</span>
                      <span className="font-medium text-green-600">+₹{(staff.received ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-600">Spent:</span>
                      <span className="font-medium text-red-600">-₹{(staff.spent ?? 0).toLocaleString()}</span>
                    </div>
                    <hr className="my-2" />
                    <div className="flex justify-between">
                      <span className="font-medium">Balance:</span>
                      <span className={`font-bold ${(staff.balance ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(staff.balance ?? 0) >= 0 ? '+' : ''}₹{(staff.balance ?? 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className={`${isMobile ? 'pt-4' : 'pt-6'}`}>
          <div className={`${isMobile ? 'space-y-3' : 'grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-3 lg:gap-4'}`}>
            <div className={`${isMobile ? '' : 'lg:flex-1 lg:min-w-[200px] sm:col-span-2'}`}>
              <Label htmlFor="search" className={`${isMobile ? 'text-sm' : ''}`}>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by name or note..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`pl-10 ${isMobile ? 'h-9 text-sm' : ''}`}
                />
              </div>
            </div>
            <div className={`${isMobile ? 'grid grid-cols-2 gap-3' : 'contents'}`}>
              <div>
                <Label htmlFor="category-filter" className={`${isMobile ? 'text-sm' : ''}`}>Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger id="category-filter" className={`w-full ${isMobile ? 'h-9 text-sm' : 'lg:w-[150px]'}`}>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {user?.role !== 'staff' && (
                <div>
                  <Label htmlFor="paid-by-filter" className={`${isMobile ? 'text-sm' : ''}`}>Paid By</Label>
                  <Select value={selectedPaidBy} onValueChange={setSelectedPaidBy}>
                    <SelectTrigger id="paid-by-filter" className={`w-full ${isMobile ? 'h-9 text-sm' : 'lg:w-[150px]'}`}>
                      <SelectValue placeholder="All Staff" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Staff</SelectItem>
                      {users.map((user: any) => (
                        <SelectItem key={user.id} value={user.name || user.username}>
                          {user.name || user.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className={`${user?.role === 'staff' ? 'col-span-1' : ''}`}>
                <Label htmlFor="date-filter" className={`${isMobile ? 'text-sm' : ''}`}>Date</Label>
                <Input
                  id="date-filter"
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className={`w-full ${isMobile ? 'h-9 text-sm' : 'lg:w-[150px]'}`}
                />
              </div>
            </div>
            <div className={`${isMobile ? 'grid grid-cols-2 gap-2' : 'flex flex-col sm:flex-row items-stretch sm:items-end gap-2 sm:col-span-2 lg:col-span-1'}`}>
              <Button variant="outline" onClick={exportToWhatsApp} className={`${isMobile ? 'h-9 text-sm' : 'flex-1 sm:flex-none'}`}>
                <Share2 className="mr-2 h-4 w-4" />
                {isMobile ? 'WhatsApp' : 'WhatsApp'}
              </Button>
              <Button variant="outline" onClick={exportToExcel} className={`${isMobile ? 'h-9 text-sm' : 'flex-1 sm:flex-none'}`}>
                <Download className="mr-2 h-4 w-4" />
                {isMobile ? 'Excel' : 'Excel'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Expense History ({filteredExpenses.length} entries)</CardTitle>
            <div className="flex items-center gap-2 text-sm">
              <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">January</SelectItem>
                  <SelectItem value="2">February</SelectItem>
                  <SelectItem value="3">March</SelectItem>
                  <SelectItem value="4">April</SelectItem>
                  <SelectItem value="5">May</SelectItem>
                  <SelectItem value="6">June</SelectItem>
                  <SelectItem value="7">July</SelectItem>
                  <SelectItem value="8">August</SelectItem>
                  <SelectItem value="9">September</SelectItem>
                  <SelectItem value="10">October</SelectItem>
                  <SelectItem value="11">November</SelectItem>
                  <SelectItem value="12">December</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile Cards */}
          <div className="block md:hidden space-y-2 p-4">
            {filteredExpenses.map((expense: PettyCashExpense) => (
              <MobileCard
                key={expense.id}
                className="cursor-pointer"
                onClick={() => handleShowExpenseDetails(expense)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        expense.status === 'income' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {expense.status === 'income' ? 'Credit' : 'Debit'}
                      </span>
                      <Badge variant="outline" className="text-xs">{expense.category}</Badge>
                    </div>
                    <div className="text-sm font-medium text-gray-900">{expense.vendor}</div>
                    <div className="text-xs text-gray-500">{format(new Date(expense.expenseDate), 'dd/MM/yy')}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${
                      expense.status === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {expense.status === 'income' ? '+' : '-'}₹{expense.amount.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">{expense.user?.name || expense.user?.username || 'N/A'}</div>
                  </div>
                </div>
                {expense.description && (
                  <div className="text-xs text-gray-600 mb-2">{expense.description}</div>
                )}
                {expense.projectId && expense.project && (
                  <div className="text-xs text-gray-500">
                    {expense.project.code} - {expense.project.name}
                  </div>
                )}
                <div className="flex justify-between items-center mt-2 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    {expense.receiptImageUrl && (
                      <img 
                        src={expense.receiptImageUrl}
                        alt="Receipt"
                        className="w-6 h-6 object-cover rounded cursor-pointer border"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImage(expense.receiptImageUrl!);
                          setShowImageDialog(true);
                        }}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {(expense.addedBy === user?.id || user?.role === 'admin') && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditExpense(expense);
                          }}
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpenseToDelete(expense);
                          }}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </MobileCard>
            ))}
            {filteredExpenses.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No expenses found matching your filters
              </div>
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="py-2 px-3 w-20">Date</TableHead>
                  <TableHead className="py-2 px-3 w-16">Type</TableHead>
                  <TableHead className="py-2 px-3 w-20 text-right">Amount</TableHead>
                  <TableHead className="py-2 px-3 min-w-[120px]">Paid To/Source</TableHead>
                  <TableHead className="py-2 px-3 w-20">Paid / Received By</TableHead>
                  <TableHead className="py-2 px-3 min-w-[150px]">Purpose</TableHead>
                  <TableHead className="py-2 px-3 w-20">Category</TableHead>
                  <TableHead className="py-2 px-3 w-32">Project & Client</TableHead>
                  <TableHead className="py-2 px-3 w-16">Receipt</TableHead>
                  <TableHead className="py-2 px-3 w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense: PettyCashExpense) => (
                  <TableRow 
                    key={expense.id} 
                    className="text-xs hover:bg-gray-50 cursor-pointer" 
                    onClick={() => handleShowExpenseDetails(expense)}
                  >
                    <TableCell className="py-2 px-3 text-gray-700 text-xs">
                      {format(new Date(expense.expenseDate), 'dd/MM/yy')}
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        expense.status === 'income' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {expense.status === 'income' ? 'Credit' : 'Debit'}
                      </span>
                    </TableCell>
                    <TableCell className={`py-2 px-3 font-bold text-right ${
                      expense.status === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {expense.status === 'income' ? '+' : '-'}₹{expense.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="py-2 px-3 font-medium max-w-[120px]">
                      <div className="truncate" title={expense.vendor}>{expense.vendor}</div>
                    </TableCell>
                    <TableCell className="py-2 px-3 text-gray-600">
                      <div className="truncate max-w-[80px]" title={expense.user?.name || expense.user?.username || 'N/A'}>
                        {expense.user?.name || expense.user?.username || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-3 max-w-[150px]">
                      <div className="truncate text-gray-700" title={expense.description || '-'}>
                        {expense.description || '-'}
                      </div>
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      <Badge variant="outline" className="text-[10px] px-1 py-0.5">{expense.category}</Badge>
                    </TableCell>
                    <TableCell className="py-2 px-3 text-gray-700 text-xs">
                      {expense.projectId && expense.project ? (
                        <div className="text-center" title={`${expense.project.name}`}>
                          <div className="font-medium">{expense.project.code}</div>
                          <div className="text-[10px] text-gray-500 truncate">{expense.project.name}</div>
                        </div>
                      ) : expense.projectId ? (
                        <div className="text-center">{expense.projectId}</div>
                      ) : (
                        <span className="text-gray-400 text-center block">-</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2 px-3">
                      {expense.receiptImageUrl ? (
                        <img 
                          src={expense.receiptImageUrl}
                          alt="Receipt"
                          className="w-6 h-6 object-cover rounded cursor-pointer border mx-auto"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row click
                            // Reset multi-image state and use single image mode
                            setSelectedImages([]);
                            setCurrentImageIndex(0);
                            setSelectedImage(expense.receiptImageUrl || "");
                            setShowImageDialog(true);
                          }}
                          title="Click to view full image"
                        />
                      ) : (
                        <span className="text-gray-400 text-center block text-[10px]">No receipt</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {/* Only show edit/delete for creator or admin */}
                        {(expense.addedBy === user?.id || user?.role === 'admin') && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent row click
                                handleEditExpense(expense);
                              }}
                              title="Edit expense"
                              className="h-6 w-6 p-0"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent row click
                                handleDeleteExpense(expense);
                              }}
                              className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                              title="Delete expense"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                </TableRow>
              ))}
              {filteredExpenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-gray-500 py-8">
                    No expenses found matching your filters
                  </TableCell>
                </TableRow>
              )}
              {/* Total Row */}
              {filteredExpenses.length > 0 && (
                <TableRow className="bg-gray-50 border-t-2">
                  <TableCell colSpan={2} className="py-3 px-3">
                    <div className="text-gray-700 text-xs font-medium">TOTAL</div>
                  </TableCell>
                  <TableCell className="py-3 px-3" colSpan={8}>
                    {(() => {
                      const totalIncome = filteredExpenses
                        .filter((expense: PettyCashExpense) => expense.status === 'income')
                        .reduce((sum: number, expense: PettyCashExpense) => sum + expense.amount, 0);
                      const totalExpenses = filteredExpenses
                        .filter((expense: PettyCashExpense) => expense.status === 'expense')
                        .reduce((sum: number, expense: PettyCashExpense) => sum + expense.amount, 0);
                      const netTotal = totalIncome - totalExpenses;
                      return (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="flex justify-between items-center bg-green-50 px-2 py-1.5 rounded border border-green-200">
                            <span className="text-green-700 text-xs">Received:</span>
                            <span className="text-green-600 text-xs font-semibold">+₹{totalIncome.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center bg-red-50 px-2 py-1.5 rounded border border-red-200">
                            <span className="text-red-700 text-xs">Spent:</span>
                            <span className="text-red-600 text-xs font-semibold">-₹{totalExpenses.toLocaleString()}</span>
                          </div>
                          <div className={`flex justify-between items-center px-2 py-1.5 rounded border ${
                            netTotal >= 0 
                              ? 'bg-green-100 border-green-300' 
                              : 'bg-red-100 border-red-300'
                          }`}>
                            <span className={`text-xs ${netTotal >= 0 ? 'text-green-700' : 'text-red-700'}`}>Balance:</span>
                            <span className={`text-xs font-semibold ${netTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {netTotal >= 0 ? '+' : ''}₹{netTotal.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
      {/* Add Expense Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
            <DialogDescription>Record a new petty cash expense with receipt details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount and Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Amount (₹) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder=""
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
            </div>
            
            {/* Paid To and Paid By */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="paidTo">Paid To *</Label>
                <Input
                  id="paidTo"
                  placeholder=""
                  value={formData.paidTo}
                  onChange={(e) => setFormData(prev => ({ ...prev, paidTo: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="paidBy">Paid By *</Label>
                <Select 
                  value={formData.paidBy} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, paidBy: value }))}
                >
                  <SelectTrigger id="paidBy">
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name || user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Purpose and Order No */}
            <div>
              <Label htmlFor="purpose">Purpose / Description *</Label>
              <Textarea
                id="purpose"
                placeholder="For what Purpose"
                value={formData.purpose}
                onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                required
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="projectId">Project ID *</Label>
                <Select 
                  value={formData.projectId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, projectId: value }))}
                >
                  <SelectTrigger id="projectId">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project: any) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.code} - {project.name} ({project.client_name || 'No Client'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="category">Category </Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 3 Image Upload Fields in ONE HORIZONTAL ROW */}
            <div className="grid grid-cols-3 gap-3">
              {/* Receipt/Proof Attachment */}
              <div>
                <Label htmlFor="receipt" className="text-xs">Proof Attachment (GPay, CRED, Invoice, etc.)</Label>
                <div 
                  className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors ${
                    isProcessingOCR ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onPaste={handlePaste}
                  tabIndex={0}
                >
                  {formData.receiptImage ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <Upload className="h-3 w-3 text-green-600" />
                        <span className="text-xs font-medium text-green-600 truncate">
                          {formData.receiptImage.name}
                        </span>
                      </div>
                      {isProcessingOCR && (
                        <Badge variant="secondary" className="animate-pulse text-xs">
                          Processing OCR...
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <Upload className="h-4 w-4 text-gray-400" />
                        <Camera className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="text-xs text-gray-600">
                        <strong>Drag & drop</strong> or{" "}
                        <label htmlFor="receipt" className="text-amber-600 cursor-pointer hover:underline">
                          choose
                        </label>
                      </div>
                      <div className="text-xs text-gray-500">
                        <kbd className="px-1 bg-gray-100 rounded text-xs">Ctrl+V</kbd> to paste
                      </div>
                    </div>
                  )}
                  <input
                    id="receipt"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <div className="h-2 w-2 rounded-full bg-green-100 flex items-center justify-center">
                    <Camera className="h-1.5 w-1.5 text-green-600" />
                  </div>
                  <p className="text-xs text-gray-600">
                    UPI screenshot for OCR
                  </p>
                </div>
              </div>

              {/* Bill/Invoice Image */}
              <div>
                <Label htmlFor="bill" className="text-xs">Bill/Invoice Image (Optional)</Label>
                <div 
                  className="border-2 border-dashed rounded-lg p-3 text-center transition-colors border-gray-300 hover:border-gray-400"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleFileDrop(e, 'bill')}
                  onPaste={(e) => handleImagePaste(e, 'bill')}
                  tabIndex={0}
                >
                  {formData.billImage ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <Upload className="h-3 w-3 text-green-600" />
                        <span className="text-xs font-medium text-green-600 truncate">
                          {formData.billImage.name}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <Upload className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="text-xs text-gray-600">
                        <strong>Drag & drop</strong> or{" "}
                        <label htmlFor="bill" className="text-amber-600 cursor-pointer hover:underline">
                          choose
                        </label>
                      </div>
                      <div className="text-xs text-gray-500">
                        <kbd className="px-1 bg-gray-100 rounded text-xs">Ctrl+V</kbd> to paste
                      </div>
                    </div>
                  )}
                  <input
                    id="bill"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleSpecificImageUpload(e, 'bill')}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Material/Product Photo */}
              <div>
                <Label htmlFor="material" className="text-xs">Material/Product Photo (Optional)</Label>
                <div 
                  className="border-2 border-dashed rounded-lg p-3 text-center transition-colors border-gray-300 hover:border-gray-400"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleFileDrop(e, 'material')}
                  onPaste={(e) => handleImagePaste(e, 'material')}
                  tabIndex={0}
                >
                  {formData.materialImage ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <Upload className="h-3 w-3 text-green-600" />
                        <span className="text-xs font-medium text-green-600 truncate">
                          {formData.materialImage.name}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <Upload className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="text-xs text-gray-600">
                        <strong>Drag & drop</strong> or{" "}
                        <label htmlFor="material" className="text-amber-600 cursor-pointer hover:underline">
                          choose
                        </label>
                      </div>
                      <div className="text-xs text-gray-500">
                        <kbd className="px-1 bg-gray-100 rounded text-xs">Ctrl+V</kbd> to paste
                      </div>
                    </div>
                  )}
                  <input
                    id="material"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleSpecificImageUpload(e, 'material')}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => {
                resetFormData();
                setShowAddDialog(false);
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={addExpenseMutation.isPending || isProcessingOCR}>
                {addExpenseMutation.isPending ? "Adding..." : "Add Expense"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* Edit Expense Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>Update the details of this petty cash expense</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formPayload = new FormData();
            formPayload.append('expenseDate', formData.date);
            formPayload.append('amount', formData.amount);
            formPayload.append('vendor', formData.paidTo); // Changed from paidTo to vendor
            formPayload.append('paidBy', formData.paidBy);
            formPayload.append('description', formData.purpose); // Changed from note to description
            formPayload.append('projectId', formData.projectId);
            formPayload.append('orderNo', formData.orderNo);
            formPayload.append('category', formData.category);
            if (formData.receiptImage) {
              formPayload.append('receipt', formData.receiptImage);
            }
            if (formData.billImage) {
              formPayload.append('bill', formData.billImage);
            }
            if (formData.materialImage) {
              formPayload.append('material', formData.materialImage);
            }
            editExpenseMutation.mutate({ id: editingExpense!.id, expenseData: formPayload });
          }} className="space-y-4">
            {/* Same form fields as add dialog */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-amount">Amount *</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  placeholder="2700"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-date">Date *</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-paidTo">Paid To *</Label>
                <Input
                  id="edit-paidTo"
                  placeholder="Dolly Vikesh Oswal"
                  value={formData.paidTo}
                  onChange={(e) => setFormData(prev => ({ ...prev, paidTo: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-paidBy">Paid By *</Label>
                <Select 
                  value={formData.paidBy}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, paidBy: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name || user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-purpose">Purpose / Description *</Label>
              <Textarea
                id="edit-purpose"
                placeholder="Furnili powder coating for legs – Pintu order"
                value={formData.purpose}
                onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                required
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-projectId">Project ID *</Label>
                <Select 
                  value={formData.projectId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, projectId: value }))}
                >
                  <SelectTrigger id="edit-projectId">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project: any) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.code} - {project.name} ({project.client_name || 'No Client'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-category">Category (For Reports)</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger id="edit-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 3 Image Upload Fields in ONE HORIZONTAL ROW for Edit Dialog */}
            <div className="grid grid-cols-3 gap-3">
              {/* Receipt/Proof Attachment */}
              <div>
                <Label htmlFor="edit-receipt" className="text-xs">Update Receipt Attachment</Label>
                <div 
                  className={`border-2 border-dashed rounded-lg p-3 text-center transition-colors ${
                    isProcessingOCR ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onPaste={handlePaste}
                  tabIndex={0}
                >
                  {formData.receiptImage ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <Upload className="h-3 w-3 text-green-600" />
                        <span className="text-xs font-medium text-green-600 truncate">
                          {formData.receiptImage.name}
                        </span>
                      </div>
                      {isProcessingOCR && (
                        <Badge variant="secondary" className="animate-pulse text-xs">
                          Processing OCR...
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <Upload className="h-4 w-4 text-gray-400" />
                        <Camera className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="text-xs text-gray-600">
                        <strong>Drag & drop</strong> or{" "}
                        <label htmlFor="edit-receipt" className="text-amber-600 cursor-pointer hover:underline">
                          choose
                        </label>
                      </div>
                      <div className="text-xs text-gray-500">
                        <kbd className="px-1 bg-gray-100 rounded text-xs">Ctrl+V</kbd> to paste
                      </div>
                    </div>
                  )}
                  <input
                    id="edit-receipt"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <div className="h-2 w-2 rounded-full bg-green-100 flex items-center justify-center">
                    <Camera className="h-1.5 w-1.5 text-green-600" />
                  </div>
                  <p className="text-xs text-gray-600">
                    Leave blank to keep existing
                  </p>
                </div>
              </div>

              {/* Bill/Invoice Image */}
              <div>
                <Label htmlFor="edit-bill" className="text-xs">Bill/Invoice Image (Optional)</Label>
                <div 
                  className="border-2 border-dashed rounded-lg p-3 text-center transition-colors border-gray-300 hover:border-gray-400"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleFileDrop(e, 'bill')}
                  onPaste={(e) => handleImagePaste(e, 'bill')}
                  tabIndex={0}
                >
                  {formData.billImage ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <Upload className="h-3 w-3 text-green-600" />
                        <span className="text-xs font-medium text-green-600 truncate">
                          {formData.billImage.name}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <Upload className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="text-xs text-gray-600">
                        <strong>Drag & drop</strong> or{" "}
                        <label htmlFor="edit-bill" className="text-amber-600 cursor-pointer hover:underline">
                          choose
                        </label>
                      </div>
                      <div className="text-xs text-gray-500">
                        <kbd className="px-1 bg-gray-100 rounded text-xs">Ctrl+V</kbd> to paste
                      </div>
                    </div>
                  )}
                  <input
                    id="edit-bill"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleSpecificImageUpload(e, 'bill')}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Material/Product Photo */}
              <div>
                <Label htmlFor="edit-material" className="text-xs">Material/Product Photo (Optional)</Label>
                <div 
                  className="border-2 border-dashed rounded-lg p-3 text-center transition-colors border-gray-300 hover:border-gray-400"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleFileDrop(e, 'material')}
                  onPaste={(e) => handleImagePaste(e, 'material')}
                  tabIndex={0}
                >
                  {formData.materialImage ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <Upload className="h-3 w-3 text-green-600" />
                        <span className="text-xs font-medium text-green-600 truncate">
                          {formData.materialImage.name}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <Upload className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="text-xs text-gray-600">
                        <strong>Drag & drop</strong> or{" "}
                        <label htmlFor="edit-material" className="text-amber-600 cursor-pointer hover:underline">
                          choose
                        </label>
                      </div>
                      <div className="text-xs text-gray-500">
                        <kbd className="px-1 bg-gray-100 rounded text-xs">Ctrl+V</kbd> to paste
                      </div>
                    </div>
                  )}
                  <input
                    id="edit-material"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleSpecificImageUpload(e, 'material')}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editExpenseMutation.isPending}>
                {editExpenseMutation.isPending ? "Updating..." : "Update Expense"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Funds Dialog */}
      <Dialog open={showAddFundsDialog} onOpenChange={setShowAddFundsDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Funds (Income)</DialogTitle>
            <DialogDescription>Add money to petty cash fund</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formDataToSend = new FormData();
            formDataToSend.append('expenseDate', fundsFormData.date);
            formDataToSend.append('paidTo', fundsFormData.source);
            formDataToSend.append('amount', fundsFormData.amount);
            formDataToSend.append('note', fundsFormData.purpose);
            formDataToSend.append('receivedBy', fundsFormData.receivedBy);
            formDataToSend.append('status', 'income');
            
            if (fundsFormData.receiptImage) {
              formDataToSend.append('receipt', fundsFormData.receiptImage);
            }
            
            addFundsMutation.mutate(formDataToSend);
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="funds-amount">Amount *</Label>
                <Input
                  id="funds-amount"
                  type="number"
                  placeholder="5000"
                  step="0.01"
                  value={fundsFormData.amount}
                  onChange={(e) => setFundsFormData(prev => ({ ...prev, amount: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="funds-date">Date *</Label>
                <Input
                  id="funds-date"
                  type="date"
                  value={fundsFormData.date}
                  onChange={(e) => setFundsFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="funds-source">Source *</Label>
                <Input
                  id="funds-source"
                  placeholder="Cash from office, Bank transfer, etc."
                  value={fundsFormData.source}
                  onChange={(e) => setFundsFormData(prev => ({ ...prev, source: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="funds-receivedBy">Received By (Staff) *</Label>
                <Select 
                  value={fundsFormData.receivedBy || ""} 
                  onValueChange={(value) => setFundsFormData(prev => ({ ...prev, receivedBy: value }))}
                  required
                >
                  <SelectTrigger id="funds-receivedBy">
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map((user: any) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name || user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="funds-purpose">Purpose / Description *</Label>
              <Textarea
                id="funds-purpose"
                placeholder="Petty cash fund replenishment"
                value={fundsFormData.purpose}
                onChange={(e) => setFundsFormData(prev => ({ ...prev, purpose: e.target.value }))}
                required
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="funds-receipt">Proof Attachment (Optional)</Label>
              <Input
                id="funds-receipt"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setFundsFormData(prev => ({ ...prev, receiptImage: file }));
                  }
                }}
              />
              <p className="text-sm text-gray-500 mt-1">
                Upload bank transfer receipt, cash deposit slip, etc.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => {
                resetFundsFormData();
                setShowAddFundsDialog(false);
              }}>
                Cancel
              </Button>
              <Button type="submit" disabled={addFundsMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white">
                {addFundsMutation.isPending ? "Adding..." : "Add Funds"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transaction Details Dialog - Optimized Layout for Both Credit and Expense */}
      <Dialog open={showExpenseDetailsDialog} onOpenChange={setShowExpenseDetailsDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedExpenseDetails?.status === 'income' ? 'Credit Details' : 'Expense Details'}
            </DialogTitle>
            <DialogDescription>
              {selectedExpenseDetails?.status === 'income' 
                ? 'View detailed information about this credit transaction'
                : 'View detailed information about this expense transaction'
              }
            </DialogDescription>
          </DialogHeader>
          {selectedExpenseDetails && (
            <div className="space-y-4">
              {/* Two columns layout for better space utilization */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-600">
                    {selectedExpenseDetails.status === 'income' ? 'Received By' : 'Paid By'}
                  </div>
                  <div className="text-sm">{selectedExpenseDetails.user?.name || selectedExpenseDetails.user?.username || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Category</div>
                  <div className="text-sm">{selectedExpenseDetails.category}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-600">
                    {selectedExpenseDetails.status === 'income' ? 'Source' : 'Vendor'}
                  </div>
                  <div className="text-sm">{selectedExpenseDetails.vendor}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Amount</div>
                  <div className={`text-sm font-bold ${
                    selectedExpenseDetails.status === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {selectedExpenseDetails.status === 'income' ? '+' : ''}₹{selectedExpenseDetails.amount.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-600">Date</div>
                  <div className="text-sm">{format(new Date(selectedExpenseDetails.expenseDate), 'dd/MM/yyyy')}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Project</div>
                  <div className="text-sm">
                    {selectedExpenseDetails.projectId && selectedExpenseDetails.project ? 
                      `${selectedExpenseDetails.project.code} - ${selectedExpenseDetails.project.name}` : 
                      selectedExpenseDetails.projectId ? selectedExpenseDetails.projectId : '-'
                    }
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-gray-600">
                  {selectedExpenseDetails.status === 'income' ? 'Purpose' : 'Description'}
                </div>
                <div className="text-sm">{selectedExpenseDetails.description || '-'}</div>
              </div>

              {/* Images Section - Show all 3 image types if available */}
              {(selectedExpenseDetails.receiptImageUrl || selectedExpenseDetails.billImageUrl || selectedExpenseDetails.materialImageUrl) && (
                <div>
                  <div className="text-sm font-medium text-gray-600 mb-2">Attachments</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Receipt Image */}
                    {selectedExpenseDetails.receiptImageUrl && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Receipt/Proof</div>
                        <img 
                          src={selectedExpenseDetails.receiptImageUrl}
                          alt="Receipt" 
                          className="w-full h-[120px] object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            const images = [
                              selectedExpenseDetails.receiptImageUrl,
                              selectedExpenseDetails.billImageUrl,
                              selectedExpenseDetails.materialImageUrl
                            ].filter(Boolean);
                            setSelectedImages(images);
                            setCurrentImageIndex(0);
                            setShowImageDialog(true);
                            setShowExpenseDetailsDialog(false);
                          }}
                          title="Click to view full size"
                        />
                      </div>
                    )}
                    
                    {/* Bill Image */}
                    {selectedExpenseDetails.billImageUrl && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Bill/Invoice</div>
                        <img 
                          src={selectedExpenseDetails.billImageUrl}
                          alt="Bill" 
                          className="w-full h-[120px] object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            const images = [
                              selectedExpenseDetails.receiptImageUrl,
                              selectedExpenseDetails.billImageUrl,
                              selectedExpenseDetails.materialImageUrl
                            ].filter(Boolean);
                            const billIndex = images.indexOf(selectedExpenseDetails.billImageUrl);
                            setSelectedImages(images);
                            setCurrentImageIndex(billIndex);
                            setShowImageDialog(true);
                            setShowExpenseDetailsDialog(false);
                          }}
                          title="Click to view full size"
                        />
                      </div>
                    )}
                    
                    {/* Material Image */}
                    {selectedExpenseDetails.materialImageUrl && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Material/Product</div>
                        <img 
                          src={selectedExpenseDetails.materialImageUrl}
                          alt="Material" 
                          className="w-full h-[120px] object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            const images = [
                              selectedExpenseDetails.receiptImageUrl,
                              selectedExpenseDetails.billImageUrl,
                              selectedExpenseDetails.materialImageUrl
                            ].filter(Boolean);
                            const materialIndex = images.indexOf(selectedExpenseDetails.materialImageUrl);
                            setSelectedImages(images);
                            setCurrentImageIndex(materialIndex);
                            setShowImageDialog(true);
                            setShowExpenseDetailsDialog(false);
                          }}
                          title="Click to view full size"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Enhanced Image Preview Dialog with Navigation */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>
                {selectedImages.length > 1 
                  ? `Image ${currentImageIndex + 1} of ${selectedImages.length}`
                  : 'Image Preview'
                }
              </span>
              {selectedImages.length > 1 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentImageIndex((prev) => 
                      prev > 0 ? prev - 1 : selectedImages.length - 1
                    )}
                    disabled={selectedImages.length <= 1}
                  >
                    ← Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentImageIndex((prev) => 
                      prev < selectedImages.length - 1 ? prev + 1 : 0
                    )}
                    disabled={selectedImages.length <= 1}
                  >
                    Next →
                  </Button>
                </div>
              )}
            </DialogTitle>
          </DialogHeader>
          {(selectedImages.length > 0 ? selectedImages[currentImageIndex] : selectedImage) && (
            <div className="flex justify-center">
              <img 
                src={selectedImages.length > 0 ? selectedImages[currentImageIndex] : selectedImage}
                alt={selectedImages.length > 0 ? `Image ${currentImageIndex + 1}` : "Image"}
                className="max-w-full max-h-[500px] object-contain rounded-lg"
              />
            </div>
          )}
          {selectedImages.length > 1 && (
            <div className="flex justify-center mt-2">
              <div className="flex gap-1">
                {selectedImages.map((_, index) => (
                  <button
                    key={index}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentImageIndex ? 'bg-amber-600' : 'bg-gray-300'
                    }`}
                    onClick={() => setCurrentImageIndex(index)}
                  />
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!expenseToDelete} onOpenChange={() => setExpenseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you Freaking Sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the expense record for "₹{expenseToDelete?.amount} to {expenseToDelete?.vendor}" and remove it from all calculations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setExpenseToDelete(null)}>
              No, Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => expenseToDelete && deleteExpenseMutation.mutate(expenseToDelete.id)}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteExpenseMutation.isPending}
            >
              {deleteExpenseMutation.isPending ? "Deleting..." : "Yes, Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </ResponsiveLayout>
  );
}