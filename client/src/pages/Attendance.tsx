import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { authService } from "@/lib/auth";
import { useIsMobile, MobileCard, MobileHeading, MobileText } from "@/components/Mobile/MobileOptimizer";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { authenticatedApiRequest } from "@/lib/auth";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";
import FurniliCard from "@/components/UI/FurniliCard";
import FurniliButton from "@/components/UI/FurniliButton";
import { 
  Clock, 
  Users, 
  Calendar,
  IndianRupee,
  UserCheck,
  UserX,
  FileText,
  Download,
  Eye,
  EyeOff,
  Plus,
  CheckCircle,
  XCircle,
  MapPin,
  Timer,
  Calculator,
  CreditCard,
  Edit,
  UserPlus,
  Check,
  X,
  Trash2,
  LogIn,
  LogOut
} from "lucide-react";
// @ts-ignore
import html2pdf from 'html2pdf.js';

// Status options and colors - moved to global scope
const statusOptions = [
  { value: 'present', label: 'Present', icon: '✓' },
  { value: 'absent', label: 'Absent', icon: '✗' },
  { value: 'half_day', label: 'Half Day', icon: '½' },
  { value: 'late', label: 'Late', icon: '⏰' },
  { value: 'on_leave', label: 'On Leave', icon: '🏖️' },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'present': return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
    case 'absent': return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200';
    case 'half_day': return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200';
    case 'late': return 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200';
    case 'on_leave': return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200';
    default: return 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200';
  }
};

// Payroll Edit Form Component
const PayrollEditForm = ({ staff, payroll, onSave }: {
  staff: any;
  payroll: any;
  onSave: (data: any) => void;
}) => {
  const [allowances, setAllowances] = useState(payroll?.allowances || 0);
  const [advance, setAdvance] = useState(payroll?.advance || 0);
  const [bonus, setBonus] = useState(payroll?.bonus || 0);
  
  const basicSalary = payroll?.basicSalary || staff?.basicSalary || 0;
  const actualWorkingDays = payroll?.actualWorkingDays || 0;
  const totalWorkingDays = payroll?.totalWorkingDays || 30;
  
  // Calculate proportionate salary based on working days (0 if no working days)
  const proportionateSalary = actualWorkingDays > 0 ? 
    Math.round((basicSalary / totalWorkingDays) * actualWorkingDays) : 0;
  
  // Net Salary = Proportionate Basic + Allowances + Bonus - Advance
  const netSalary = proportionateSalary + allowances + bonus - advance;

  const handleSave = () => {
    onSave({
      allowances,
      advance,
      bonus,
      // Calculate final net salary to save
      netSalary: proportionateSalary + allowances + bonus - advance
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Basic Salary</Label>
          <div className="text-lg font-semibold text-gray-700">₹{basicSalary.toLocaleString()}</div>
          <div className="text-xs text-gray-500">Proportionate: ₹{proportionateSalary.toLocaleString()} ({actualWorkingDays}/{totalWorkingDays} days)</div>
        </div>
        <div>
          <Label>Net Salary</Label>
          <div className="text-lg font-semibold text-green-600">₹{netSalary.toLocaleString()}</div>
          <div className="text-xs text-gray-500">
            {proportionateSalary.toLocaleString()} + {allowances} + {bonus} - {advance}
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        <div>
          <Label htmlFor="allowances">Allowances (Bonus, Travel, Incentives)</Label>
          <Input
            id="allowances"
            type="number"
            value={allowances}
            onChange={(e) => setAllowances(parseInt(e.target.value) || 0)}
            placeholder="Enter allowances"
          />
        </div>
        
        <div>
          <Label htmlFor="advance">Advance Deduction</Label>
          <Input
            id="advance"
            type="number"
            value={advance}
            onChange={(e) => setAdvance(parseInt(e.target.value) || 0)}
            placeholder="Enter advance deduction"
          />
        </div>

        <div>
          <Label htmlFor="bonus">Additional Bonus</Label>
          <Input
            id="bonus"
            type="number"
            value={bonus}
            onChange={(e) => setBonus(parseInt(e.target.value) || 0)}
            placeholder="Enter bonus"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          style={{ backgroundColor: 'hsl(28, 100%, 25%)', color: 'white' }}
        >
          Update Payroll
        </Button>
      </div>
    </div>
  );
};

// Monthly Attendance Calendar Component - Mobile Compatible
const MonthlyAttendanceCalendar = ({ 
  staffId, 
  month, 
  year, 
  attendanceData, 
  onUpdate 
}: {
  staffId: number;
  month: number;
  year: number;
  attendanceData: any[];
  onUpdate: (date: string, status: string) => void;
}) => {
  const isMobile = useIsMobile();
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
  
  const getAttendanceForDate = (day: number) => {
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    return attendanceData.find(a => {
      const recordDate = new Date(a.date).toISOString().split('T')[0];
      return recordDate === dateStr;
    });
  };



  const handleStatusChange = (day: number, newStatus: string) => {
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    onUpdate(dateStr, newStatus);
  };

  if (isMobile) {
    // Enhanced Mobile Calendar View
    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Mobile Status Legend - Horizontal Scrollable */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-3 border-b">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {statusOptions.map(option => (
              <div 
                key={option.value} 
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusColor(option.value)}`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="text-sm">{option.icon}</span>
                  <span>{option.label}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile Mini Calendar Grid */}
        <div className="p-4">
          <div className="grid grid-cols-7 gap-1 mb-3">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <div key={`weekday-${index}`} className="text-center text-xs font-semibold text-amber-800 py-2">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: firstDayOfMonth }, (_, i) => (
              <div key={`empty-${i}`} className="h-10"></div>
            ))}
            
            {/* Calendar days - Mobile optimized */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const attendance = getAttendanceForDate(day);
              const isToday = new Date().getDate() === day && 
                             new Date().getMonth() === month - 1 && 
                             new Date().getFullYear() === year;
              const isSunday = new Date(year, month - 1, day).getDay() === 0;
              
              return (
                <div 
                  key={day}
                  className={`h-10 w-full border rounded-lg flex flex-col items-center justify-center text-xs transition-all duration-200 ${
                    isToday ? 'border-amber-400 bg-amber-100 shadow-md' : 
                    isSunday ? 'bg-red-50 border-red-200' : 
                    attendance?.status ? getStatusColor(attendance.status) :
                    'border-gray-200 bg-gray-50'
                  }`}
                  onClick={() => {
                    const attendance = getAttendanceForDate(day);
                    const currentStatus = attendance?.status || 'absent';
                    const statusIndex = statusOptions.findIndex(opt => opt.value === currentStatus);
                    const nextStatus = statusOptions[(statusIndex + 1) % statusOptions.length].value;
                    // Optimistic UI update with debouncing
                    setTimeout(() => handleStatusChange(day, nextStatus), 0);
                  }}
                >
                  <span className={`font-semibold ${isToday ? 'text-amber-900' : isSunday ? 'text-red-700' : 'text-gray-800'}`}>
                    {day}
                  </span>
                  {attendance?.status && (
                    <span className="text-[8px] leading-none">
                      {statusOptions.find(opt => opt.value === attendance.status)?.icon}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile Quick Actions Panel */}
        <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4 border-t">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm text-amber-800">Quick Actions</h4>
            <div className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
              Tap days above to mark
            </div>
          </div>
          
          {/* Today's Quick Action */}
          {(() => {
            const today = new Date().getDate();
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();
            
            if (currentMonth === month && currentYear === year) {
              const todayAttendance = getAttendanceForDate(today);
              return (
                <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-400 rounded-full flex items-center justify-center shadow-md">
                        <span className="text-sm font-bold text-white">{today}</span>
                      </div>
                      <div>
                        <div className="font-semibold text-amber-900">Today</div>
                        <div className="text-xs text-amber-600">
                          {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!todayAttendance?.status ? (
                        <Button 
                          size="sm" 
                          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md"
                          onClick={() => {}} // Disabled for calendar component
                        >
                          ✓ Mark Now
                        </Button>
                      ) : (
                        <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${getStatusColor(todayAttendance.status)}`}>
                          {statusOptions.find(opt => opt.value === todayAttendance.status)?.icon} {' '}
                          {statusOptions.find(opt => opt.value === todayAttendance.status)?.label}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}
          
          {/* Bulk Actions */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-shrink-0 text-xs border-green-200 text-green-700 hover:bg-green-50"
              onClick={() => {
                // Bulk mark present for unmarked days
                Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const attendance = getAttendanceForDate(day);
                  if (!attendance?.status) {
                    handleStatusChange(day, 'present');
                  }
                });
              }}
            >
              <span className="mr-1">✓</span>
              All Present
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-shrink-0 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
              onClick={() => {
                // Mark all Sundays as off
                Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1;
                  const isSunday = new Date(year, month - 1, day).getDay() === 0;
                  if (isSunday) {
                    handleStatusChange(day, 'on_leave');
                  }
                });
              }}
            >
              <span className="mr-1">🏖️</span>
              Sundays Off
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop calendar view
  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="grid grid-cols-7 gap-2 mb-4">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
          <div key={`desktop-weekday-${index}`} className="text-center font-medium text-amber-900 p-2 bg-amber-50 rounded">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-2 mb-4">
        {/* Empty cells for days before month starts */}
        {Array.from({ length: firstDayOfMonth }, (_, i) => (
          <div key={`empty-${i}`} className="h-12"></div>
        ))}
        
        {/* Calendar days */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const attendance = getAttendanceForDate(day);
          const isToday = new Date().getDate() === day && 
                         new Date().getMonth() === month - 1 && 
                         new Date().getFullYear() === year;
          const isSunday = new Date(year, month - 1, day).getDay() === 0;
          
          return (
            <div 
              key={day}
              className={`h-12 border rounded p-1 transition-all duration-200 ${
                isToday ? 'border-amber-300 bg-amber-50 shadow-md' : 
                isSunday ? 'bg-red-50 border-red-200' : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className={`font-medium text-xs mb-0.5 ${isToday ? 'text-amber-900' : isSunday ? 'text-red-600' : 'text-gray-800'}`}>
                {day}
                {isToday && <div className="text-[10px] text-amber-600">Now</div>}
                {isSunday && <div className="text-[10px] text-red-500">Sun</div>}
              </div>
              <Select
                value={attendance?.status || ''}
                onValueChange={(value) => handleStatusChange(day, value)}
              >
                <SelectTrigger className={`h-6 text-[10px] border transition-colors ${getStatusColor(attendance?.status || '')}`}>
                  <SelectValue placeholder="Mark" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center gap-1">
                        <span>{option.icon}</span>
                        <span>{option.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
      
      {/* Compact Legend */}
      <div className="mt-3 p-2 bg-gradient-to-r from-amber-50 to-orange-50 rounded border border-amber-200">
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          {statusOptions.map(option => (
            <div 
              key={option.value} 
              className={`px-2 py-1 rounded border font-medium transition-all duration-200 ${getStatusColor(option.value)}`}
            >
              <span className="flex items-center gap-1">
                <span>{option.icon}</span>
                <span className="hidden sm:inline">{option.label}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Form schemas
const staffFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  employeeId: z.string().optional(),
  department: z.string().optional(),
  designation: z.string().optional(),
  basicSalary: z.number().min(0, "Salary must be positive"),
  aadharNumber: z.string().optional(),
  address: z.string().optional(),
  joiningDate: z.string().optional(),
  bankAccount: z.string().optional(),
  ifscCode: z.string().optional(),
  role: z.enum(["admin", "manager", "storekeeper", "user"]),
});

type StaffFormData = z.infer<typeof staffFormSchema>;

export default function Attendance() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const { toast } = useToast();
  const user = authService.getUser();
  const isMobile = useIsMobile();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isExporting, setIsExporting] = useState(false);
  
  // Generate year options from 2024 to 2030
  const yearOptions = Array.from({ length: 7 }, (_, i) => 2024 + i);
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [editingPayroll, setEditingPayroll] = useState<any>(null);

  // Export attendance report function
  const exportAttendanceReport = async () => {
    if (isExporting) return;
    
    setIsExporting(true);
    try {
      console.log('Starting attendance export for month:', selectedMonth, 'year:', selectedYear);
      
      // Use the new server-side CSV export endpoint
      const response = await authenticatedApiRequest('GET', `/api/attendance/export?month=${selectedMonth}&year=${selectedYear}`);
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }
      
      // Get the CSV content as blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attendance_report_${selectedMonth}_${selectedYear}.csv`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      toast({
        title: "Export Successful",
        description: `Attendance report for ${new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'long' })} ${selectedYear} has been downloaded.`,
      });
      
    } catch (error) {
      console.error('Export failed with error:', error);
      toast({
        title: "Export Failed", 
        description: error instanceof Error ? error.message : "Failed to export attendance report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<number | null>(null);
  const [editingStatus, setEditingStatus] = useState<string>("");
  const [editingCell, setEditingCell] = useState<{staffId: number, day: number} | null>(null);
  const [editingCellStatus, setEditingCellStatus] = useState<string>("");
  const [isProcessingPayroll, setIsProcessingPayroll] = useState(false);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isEditStaffOpen, setIsEditStaffOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [selectedStaffForAttendance, setSelectedStaffForAttendance] = useState<string>("");
  const [monthlyAttendanceData, setMonthlyAttendanceData] = useState<any[]>([]);
  const [isEditingMonthlyAttendance, setIsEditingMonthlyAttendance] = useState(false);
  const [showDetailedRecords, setShowDetailedRecords] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");


  // Forms
  const addStaffForm = useForm<StaffFormData>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      employeeId: "",
      department: "",
      designation: "",
      basicSalary: 0,
      aadharNumber: "",
      address: "",
      joiningDate: "",
      bankAccount: "",
      ifscCode: "",
      role: "user",
    },
  });

  const editStaffForm = useForm<StaffFormData>({
    resolver: zodResolver(staffFormSchema),
  });

  // Queries
  const { data: attendanceRecords = [], isLoading } = useQuery({
    queryKey: ["/api/attendance", selectedMonth, selectedYear],
    queryFn: () => authenticatedApiRequest('GET', `/api/attendance?month=${selectedMonth}&year=${selectedYear}`),
  });

  const { data: todayAttendance = [] } = useQuery({
    queryKey: ["/api/attendance/today"],
    queryFn: () => authenticatedApiRequest('GET', "/api/attendance/today"),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: () => authenticatedApiRequest('GET', "/api/users"),
  });

  const { data: payrollRecords = [] } = useQuery({
    queryKey: ["/api/payroll", selectedMonth, selectedYear],
    queryFn: () => authenticatedApiRequest('GET', `/api/payroll?month=${selectedMonth}&year=${selectedYear}`),
  });

  const { data: attendanceStats } = useQuery({
    queryKey: ["/api/attendance/stats", selectedMonth, selectedYear],
    queryFn: () => authenticatedApiRequest('GET', `/api/attendance/stats?month=${selectedMonth}&year=${selectedYear}`),
  });

  // Mutations
  const adminCheckInMutation = useMutation({
    mutationFn: async (data: { userId: number; location?: string; notes?: string }) => {
      return authenticatedApiRequest("POST", "/api/attendance/admin-checkin", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/stats"] });
      toast({ title: "Staff checked in successfully" });
    },
    onError: (error) => {
      toast({ title: "Check-in failed", description: String(error), variant: "destructive" });
    },
  });

  const adminCheckOutMutation = useMutation({
    mutationFn: async (data: { attendanceId: number; notes?: string }) => {
      return authenticatedApiRequest("POST", "/api/attendance/admin-checkout", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/stats"] });
      toast({ title: "Staff checked out successfully" });
    },
  });

  // Self check-in/out mutations for staff users
  const selfCheckInMutation = useMutation({
    mutationFn: async (data: { location?: string; notes?: string }) => {
      return authenticatedApiRequest("POST", "/api/attendance/checkin", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/stats"] });
      toast({ title: "Checked in successfully" });
    },
    onError: (error) => {
      toast({ title: "Check-in failed", description: String(error), variant: "destructive" });
    },
  });

  const selfCheckOutMutation = useMutation({
    mutationFn: async () => {
      return authenticatedApiRequest("POST", "/api/attendance/checkout", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/stats"] });
      toast({ title: "Checked out successfully" });
    },
    onError: (error) => {
      toast({ title: "Check-out failed", description: String(error), variant: "destructive" });
    },
  });

  const markAttendanceMutation = useMutation({
    mutationFn: async (data: {
      userId: number;
      date: string;
      status: string;
      checkInTime?: string;
      checkOutTime?: string;
      notes?: string;
    }) => {
      return authenticatedApiRequest("POST", "/api/attendance/mark", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/stats"] });
      toast({ title: "Attendance marked successfully" });
    },
  });

  const generatePayrollMutation = useMutation({
    mutationFn: async (data: { userId: number; month: number; year: number }) => {
      return authenticatedApiRequest("POST", "/api/payroll/generate", data);
    },
    onSuccess: () => {
      // Force complete refresh of payroll data with correct query key structure
      queryClient.invalidateQueries({ 
        queryKey: ["/api/payroll", selectedMonth, selectedYear] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/payroll"] 
      });
      
      // Force immediate refetch with exact same parameters
      queryClient.refetchQueries({ 
        queryKey: ["/api/payroll", selectedMonth, selectedYear]
      });
      
      toast({ title: "Payroll generated successfully" });
    },
  });

  const processPayrollMutation = useMutation({
    mutationFn: async (payrollId: number) => {
      return authenticatedApiRequest("POST", `/api/payroll/${payrollId}/process`);
    },
    onSuccess: () => {
      // Invalidate with specific query parameters to ensure refresh
      queryClient.invalidateQueries({ 
        queryKey: ["/api/payroll", selectedMonth, selectedYear] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/payroll"] 
      });
      toast({ title: "Payroll processed successfully" });
    },
  });

  const createStaffMutation = useMutation({
    mutationFn: async (data: StaffFormData) => {
      // Generate auto Employee ID if not provided
      let employeeId = data.employeeId;
      if (!employeeId) {
        // Get the highest existing employee ID to determine next number
        const existingIds = staff
          .map((s: any) => s.employeeId)
          .filter((id: string) => id && id.startsWith('FUN-'))
          .map((id: string) => parseInt(id.replace('FUN-', '')))
          .filter((num: number) => !isNaN(num))
          .sort((a: number, b: number) => b - a);
        
        const nextId = existingIds.length > 0 ? existingIds[0] + 1 : 101;
        employeeId = `FUN-${nextId}`;
      }
      
      // Use name as username if email is not provided
      const username = data.email || data.name.toLowerCase().replace(/\s+/g, '');
      
      return authenticatedApiRequest("POST", "/api/users", { 
        ...data, 
        employeeId,
        username
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsAddStaffOpen(false);
      addStaffForm.reset();
      toast({ title: "Staff member added successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add staff member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateStaffMutation = useMutation({
    mutationFn: async (data: { id: number; updates: Partial<StaffFormData> }) => {
      return authenticatedApiRequest("PATCH", `/api/users/${data.id}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsEditStaffOpen(false);
      setEditingStaff(null);
      editStaffForm.reset();
      toast({ title: "Staff member updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update staff member",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updatePayrollMutation = useMutation({
    mutationFn: async (data: { payrollId: number; updates: any }) => {
      return authenticatedApiRequest("PATCH", `/api/payroll/${data.payrollId}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payroll"] });
      toast({ title: "Payroll updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update payroll",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditPayroll = (payroll: any) => {
    const staffMember = staff?.find((s: any) => s.id === payroll.userId);
    setEditingPayroll({ ...payroll, staff: staffMember });
    setIsEditDialogOpen(true);
  };

  const handlePayrollEdit = (payroll: any) => {
    const staffMember = staff?.find((s: any) => s.id === payroll.userId);
    setEditingPayroll({ ...payroll, staff: staffMember });
    setIsEditDialogOpen(true);
  };

  // Inline attendance editing handlers
  const handleAttendanceEdit = (recordId: number, currentStatus: string) => {
    setEditingAttendance(recordId);
    setEditingStatus(currentStatus);
  };

  const saveAttendanceEdit = async (recordId: number, newStatus: string) => {
    try {
      await authenticatedApiRequest('PATCH', `/api/attendance/${recordId}`, {
        status: newStatus
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payroll'] }); // Also refresh payroll
      setEditingAttendance(null);
      setEditingStatus("");
    } catch (error) {
      console.error('Error updating attendance:', error);
    }
  };

  const cancelAttendanceEdit = () => {
    setEditingAttendance(null);
    setEditingStatus("");
  };

  // Monthly calendar cell editing handlers
  const handleCellEdit = (staffId: number, day: number, currentStatus: string) => {
    setEditingCell({ staffId, day });
    setEditingCellStatus(currentStatus || 'absent');
  };

  const saveCellEdit = async (staffId: number, day: number, newStatus: string) => {
    try {
      // Fix date calculation - use UTC to avoid timezone issues
      const date = new Date(Date.UTC(selectedYear, selectedMonth - 1, day));
      const dateString = date.toISOString().split('T')[0];
      
      console.log('Updating attendance:', { staffId, day, newStatus, dateString });
      
      const response = await authenticatedApiRequest('POST', '/api/attendance/bulk-update', {
        userId: staffId,
        month: selectedMonth,
        year: selectedYear,
        attendanceData: [{
          date: dateString,
          status: newStatus,
          userId: staffId
        }]
      });
      
      console.log('Attendance update response:', response);
      
      // Invalidate all related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/attendance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payroll'] }); // Also refresh payroll
      
      setEditingCell(null);
      setEditingCellStatus("");
      
      toast({
        title: "Attendance Updated",
        description: `Successfully updated attendance for ${new Date(dateString).toLocaleDateString()}`,
      });
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast({
        title: "Error",
        description: "Failed to update attendance. Please try again.",
        variant: "destructive",
      });
    }
  };

  const cancelCellEdit = () => {
    setEditingCell(null);
    setEditingCellStatus("");
  };

  const handlePayrollSave = (payrollData: any) => {
    updatePayrollMutation.mutate({
      payrollId: editingPayroll.id,
      updates: payrollData
    });
    setIsEditDialogOpen(false);
    setEditingPayroll(null);
  };

  // Debounced bulk update with optimistic updates
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, any>>(new Map());
  
  const bulkUpdateAttendanceMutation = useMutation({
    mutationFn: async (data: { 
      userId: number; 
      month: number; 
      year: number; 
      attendanceData: any[] 
    }) => {
      return authenticatedApiRequest("POST", "/api/attendance/bulk-update", data);
    },
    onSuccess: () => {
      // Refresh data in background after successful API call
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
        queryClient.invalidateQueries({ queryKey: ["/api/attendance/stats"] });
      }, 300);
      setIsEditingMonthlyAttendance(false);
    },
    onError: (error: any) => {
      // Revert optimistic updates on error
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      toast({
        title: "Failed to update attendance",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Number to words conversion function
  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num === 0) return 'Zero';
    
    const convertBelow1000 = (n: number): string => {
      let result = '';
      if (n >= 100) {
        result += ones[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      if (n >= 20) {
        result += tens[Math.floor(n / 10)] + ' ';
        n %= 10;
      } else if (n >= 10) {
        result += teens[n - 10] + ' ';
        return result;
      }
      if (n > 0) {
        result += ones[n] + ' ';
      }
      return result;
    };

    if (num < 1000) {
      return convertBelow1000(num).trim();
    } else if (num < 100000) {
      return (convertBelow1000(Math.floor(num / 1000)) + 'Thousand ' + convertBelow1000(num % 1000)).trim();
    } else {
      return (convertBelow1000(Math.floor(num / 100000)) + 'Lakh ' + convertBelow1000((num % 100000) / 1000) + 'Thousand ' + convertBelow1000(num % 1000)).trim();
    }
  };

  // Pay slip generation function
  const generatePaySlip = (payroll: any, staffMember: any) => {
    const paySlipHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pay Slip - ${staffMember.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Arial', sans-serif; line-height: 1.4; color: #333; }
          .container { width: 210mm; margin: 0 auto; padding: 15mm; background: white; }
          .header { text-align: center; margin-bottom: 12px; border-bottom: 2px solid #D4B896; padding-bottom: 8px; }
          .logo { height: 40px; margin-bottom: 5px; }
          .company-name { font-size: 18px; font-weight: bold; color: #D4B896; margin-bottom: 3px; }
          .tagline { font-size: 10px; color: #666; letter-spacing: 0.5px; }
          .pay-slip-title { font-size: 14px; font-weight: bold; color: #333; margin-top: 8px; }
          
          .info-section { border: 1px solid #D4B896; border-radius: 4px; padding: 10px; margin-bottom: 10px; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 11px; }
          .info-row:last-child { margin-bottom: 0; }
          .label { font-weight: bold; color: #444; }
          .value { color: #666; }
          
          .earnings-deductions { display: flex; gap: 20px; margin-bottom: 20px; }
          .earnings, .deductions { flex: 1; border: 1px solid #D4B896; border-radius: 8px; }
          .section-header { background: #D4B896; color: white; padding: 10px; text-align: center; font-weight: bold; border-radius: 6px 6px 0 0; }
          .section-content { padding: 15px; }
          .item { display: flex; justify-content: space-between; margin-bottom: 8px; padding: 5px 0; }
          .item:not(:last-child) { border-bottom: 1px dotted #ddd; }
          
          .total-section { background: #f8f9fa; border: 2px solid #D4B896; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
          .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; color: #D4B896; }
          
          .attendance-summary { border: 1px solid #ddd; border-radius: 4px; padding: 8px; margin-bottom: 10px; }
          .attendance-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; font-size: 10px; }
          
          .footer { text-align: center; font-size: 9px; color: #666; margin-top: 12px; border-top: 1px solid #eee; padding-top: 6px; }
          .signature-section { display: flex; justify-content: space-between; margin-top: 15px; }
          .signature-box { text-align: center; width: 150px; font-size: 10px; }
          .signature-line { border-bottom: 1px solid #333; margin-bottom: 3px; height: 20px; }
          
          @media print {
            .container { margin: 0; padding: 10mm; }
            body { -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="/furnili-logo-big.png" alt="Furnili Logo" class="logo" onerror="this.style.display='none'">
            <div class="company-name">FURNILI</div>
            <div class="tagline">BESPOKE MODULAR FURNITURE</div>
            <div class="pay-slip-title">SALARY SLIP</div>
          </div>
          
          <div class="info-section">
            <div class="info-row">
              <span class="label">Employee Name:</span>
              <span class="value">${staffMember.name}</span>
            </div>
            <div class="info-row">
              <span class="label">Employee ID:</span>
              <span class="value">${staffMember.employeeId || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Department:</span>
              <span class="value">${staffMember.department || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Designation:</span>
              <span class="value">${staffMember.designation || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="label">Month/Year:</span>
              <span class="value">${new Date(0, payroll.month - 1).toLocaleString('default', { month: 'long' })} ${payroll.year}</span>
            </div>
            <div class="info-row">
              <span class="label">Pay Date:</span>
              <span class="value">${new Date().toLocaleDateString()}</span>
            </div>
          </div>
          
          <div class="earnings-deductions">
            <div class="earnings">
              <div class="section-header">EARNINGS</div>
              <div class="section-content">
                <div class="item">
                  <span>Basic Salary</span>
                  <span>₹${payroll.basicSalary?.toFixed(2) || '0.00'}</span>
                </div>
                <div class="item">
                  <span>Overtime Pay</span>
                  <span>₹${payroll.overtimePay?.toFixed(2) || '0.00'}</span>
                </div>
                <div class="item">
                  <span>Allowances</span>
                  <span>₹${payroll.allowances?.toFixed(2) || '0.00'}</span>
                </div>
                <div class="item">
                  <span>Bonus</span>
                  <span>₹${payroll.bonus?.toFixed(2) || '0.00'}</span>
                </div>
                <div class="item">
                  <span>Incentives</span>
                  <span>₹${((payroll.allowances || 0) * 0.1).toFixed(2)}</span>
                </div>
                <div class="item" style="border-top: 2px solid #D4B896; font-weight: bold; color: #D4B896;">
                  <span>Total Earnings</span>
                  <span>₹${((payroll.basicSalary || 0) + (payroll.overtimePay || 0) + (payroll.allowances || 0) + (payroll.bonus || 0)).toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div class="deductions">
              <div class="section-header" style="background: #dc3545;">DEDUCTIONS</div>
              <div class="section-content">
                <div class="item">
                  <span>Professional Tax</span>
                  <span>₹${(payroll.deductions * 0.1)?.toFixed(2) || '0.00'}</span>
                </div>
                <div class="item">
                  <span>PF Contribution</span>
                  <span>₹${(payroll.deductions * 0.6)?.toFixed(2) || '0.00'}</span>
                </div>
                <div class="item">
                  <span>ESI</span>
                  <span>₹${(payroll.deductions * 0.2)?.toFixed(2) || '0.00'}</span>
                </div>
                <div class="item">
                  <span>Advance</span>
                  <span>₹${payroll.advance?.toFixed(2) || '0.00'}</span>
                </div>
                <div class="item">
                  <span>Other Deductions</span>
                  <span>₹${((payroll.deductions || 0) * 0.1).toFixed(2)}</span>
                </div>
                <div class="item" style="border-top: 2px solid #dc3545; font-weight: bold; color: #dc3545;">
                  <span>Total Deductions</span>
                  <span>₹${payroll.deductions?.toFixed(2) || '0.00'}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="total-section">
            <div class="total-row">
              <span>NET SALARY</span>
              <span>₹${payroll.netSalary?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
          
          <div class="attendance-summary">
            <h3 style="margin-bottom: 8px; color: #D4B896; text-align: center; font-size: 12px;">ATTENDANCE SUMMARY</h3>
            <div class="attendance-grid">
              <div class="item">
                <span class="label">Working Days:</span>
                <span class="value">${payroll.totalWorkingDays || 30}</span>
              </div>
              <div class="item">
                <span class="label">Present Days:</span>
                <span class="value">${payroll.actualWorkingDays || 25}</span>
              </div>
              <div class="item">
                <span class="label">Total Hours:</span>
                <span class="value">${payroll.totalHours?.toFixed(1) || '0.0'} hrs</span>
              </div>
              <div class="item">
                <span class="label">Overtime Hours:</span>
                <span class="value">${payroll.overtimeHours?.toFixed(1) || '0.0'} hrs</span>
              </div>
              <div class="item">
                <span class="label">Leave Days:</span>
                <span class="value">${payroll.leaveDays || 0}</span>
              </div>
              <div class="item">
                <span class="label">Salary in Words:</span>
                <span class="value" style="font-style: italic;">Rupees ${numberToWords(payroll.netSalary || 0)} Only</span>
              </div>
            </div>
          </div>
          
          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-line"></div>
              <div style="font-weight: bold;">Employee Signature</div>
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <div style="font-weight: bold;">HR Manager</div>
            </div>
          </div>
          
          <div class="footer">
            <div>This is a system generated payslip and does not require signature.</div>
            <div style="margin-top: 5px;">Generated by Furnili Management System on ${new Date().toLocaleString()}</div>
            <div style="margin-top: 5px; font-size: 10px;">For queries, contact HR Department</div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Generate PDF with compact settings for single page
    const options = {
      margin: [0.2, 0.2, 0.2, 0.2], // smaller margins in inches
      filename: `PaySlip_${staffMember.name}_${new Date(0, payroll.month - 1).toLocaleString('default', { month: 'long' })}_${payroll.year}.pdf`,
      image: { type: 'jpeg', quality: 0.9 },
      html2canvas: { 
        scale: 1.2, // reduced scale for compactness
        useCORS: true,
        allowTaint: true,
        logging: false,
        letterRendering: true,
        height: 1000, // fixed height for single page
        width: 800
      },
      jsPDF: { 
        unit: 'in', 
        format: 'a4', 
        orientation: 'portrait',
        compress: true
      }
    };

    html2pdf().set(options).from(paySlipHTML).save();
    
    // Show success toast
    toast({ 
      title: "Pay slip generated", 
      description: `PDF download started for ${staffMember.name}` 
    });
  };

  // Helper functions
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      present: { variant: "default" as const, icon: CheckCircle, color: "text-green-600", label: "P" },
      absent: { variant: "destructive" as const, icon: XCircle, color: "text-red-600", label: "A" },
      half_day: { variant: "secondary" as const, icon: Timer, color: "text-yellow-600", label: "H" },
      'half-day': { variant: "secondary" as const, icon: Timer, color: "text-yellow-600", label: "H" },
      late: { variant: "outline" as const, icon: Clock, color: "text-orange-600", label: "L" },
      on_leave: { variant: "secondary" as const, icon: Calendar, color: "text-blue-600", label: "LV" },
      'on-leave': { variant: "secondary" as const, icon: Calendar, color: "text-blue-600", label: "LV" },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.present;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return "-";
    return new Date(timeString).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const handleEditStaff = (staffMember: any) => {
    setEditingStaff(staffMember);
    editStaffForm.reset({
      name: staffMember.name || "",
      email: staffMember.email || "",
      phone: staffMember.phone || "",
      employeeId: staffMember.employeeId || "",
      department: staffMember.department || "",
      designation: staffMember.designation || "",
      basicSalary: staffMember.basicSalary || 0,
      aadharNumber: staffMember.aadharNumber || "",
      address: staffMember.address || "",
      joiningDate: staffMember.joiningDate ? new Date(staffMember.joiningDate).toISOString().split('T')[0] : "",
      bankAccount: staffMember.bankAccount || "",
      ifscCode: staffMember.ifscCode || "",
      role: staffMember.role || "user",
    });
    setIsEditStaffOpen(true);
  };

  const handleDeleteStaff = async (staffId: number) => {
    if (confirm("Are you sure you want to deactivate this staff member? They will be marked as inactive but not permanently deleted.")) {
      try {
        await authenticatedApiRequest("DELETE", `/api/users/${staffId}`);
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        toast({ title: "Staff member deactivated successfully" });
      } catch (error: any) {
        toast({
          title: "Failed to deactivate staff member",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  const handleGenerateAllPayslips = async () => {
    try {
      toast({ title: "Generating payslips for all staff..." });
      for (const staffMember of staff) {
        await generatePayrollMutation.mutateAsync({
          userId: staffMember.id,
          month: selectedMonth,
          year: selectedYear,
        });
      }
      toast({ title: "All payslips generated successfully" });
    } catch (error: any) {
      toast({
        title: "Failed to generate payslips",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleProcessAllPayrolls = async () => {
    try {
      toast({ title: "Processing all payrolls..." });
      for (const payroll of payrollRecords) {
        await processPayrollMutation.mutateAsync(payroll.id);
      }
      toast({ title: "All payrolls processed successfully" });
    } catch (error: any) {
      toast({
        title: "Failed to process payrolls",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const downloadPayslip = (payrollId: number) => {
    const payroll = payrollRecords.find((p: any) => p.id === payrollId);
    const staffMember = staff.find((s: any) => s.id === payroll?.userId);
    if (!staffMember || !payroll) return;
    
    // Generate and download payslip HTML content
    const payslipHTML = generatePaySlip(payroll, staffMember);
    
    const opt = {
      margin: 1,
      filename: `payslip_${staffMember.name}_${payroll.month}_${payroll.year}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().from(payslipHTML).set(opt).save();
  };

  const onAddStaffSubmit = (data: StaffFormData) => {
    createStaffMutation.mutate(data);
  };

  const onEditStaffSubmit = (data: StaffFormData) => {
    if (editingStaff) {
      updateStaffMutation.mutate({ id: editingStaff.id, updates: data });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Get current user's today attendance to show check in/out status
  const currentUserAttendance = todayAttendance.find((a: any) => a.userId === user?.id);
  const hasCheckedInToday = currentUserAttendance?.checkInTime;
  const hasCheckedOutToday = currentUserAttendance?.checkOutTime;

  return (
    <ResponsiveLayout
      title={user?.role === 'staff' || user?.role === 'store_incharge' ? "My Attendance" : "Staff Attendance & Payroll"}
      subtitle={user?.role === 'staff' || user?.role === 'store_incharge' ? "View your attendance and check in/out" : "Complete staff management system"}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
        </div>
        
        {/* Quick Check In/Out Button and Month/Year Selector */}
        <div className="flex gap-3 items-center">
          {/* Quick Check In/Out Buttons */}
          <div className="flex gap-2">
            {!hasCheckedInToday ? (
              <FurniliButton
                variant="furnili-primary"
                size="sm"
                onClick={() => selfCheckInMutation.mutate({})}
                disabled={selfCheckInMutation.isPending}
              >
                <LogIn className="w-4 h-4 mr-2" />
                {selfCheckInMutation.isPending ? "Checking In..." : "Quick Check In"}
              </FurniliButton>
            ) : !hasCheckedOutToday ? (
              <FurniliButton
                variant="furnili-secondary"
                size="sm"
                onClick={() => selfCheckOutMutation.mutate()}
                disabled={selfCheckOutMutation.isPending}
              >
                <LogOut className="w-4 h-4 mr-2" />
                {selfCheckOutMutation.isPending ? "Checking Out..." : "Quick Check Out"}
              </FurniliButton>
            ) : (
              <Badge variant="secondary" className="px-3 py-1">
                <Check className="w-4 h-4 mr-1" />
                Completed for today
              </Badge>
            )}
          </div>

          {/* Month/Year Selector */}
          <div className="flex gap-2">
            <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    {new Date(2024, i).toLocaleString("en-IN", { month: "long" })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
              <SelectTrigger className="w-24">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Compact Quick Stats */}
      <div className={`grid gap-1.5 sm:gap-2 mb-4 ${user?.role === 'staff' || user?.role === 'store_incharge' ? 'grid-cols-1 max-w-md mx-auto' : 'grid-cols-3 md:grid-cols-6'}`}>
        <Card className="border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between pb-1 px-3 pt-2">
            <CardTitle className="text-xs font-medium text-gray-700">
              {user?.role === 'staff' || user?.role === 'store_incharge' ? "Your Status Today" : "Present Today"}
            </CardTitle>
            <UserCheck className="h-3 w-3 text-green-600" />
          </CardHeader>
          <CardContent className="px-3 pb-2">
            {user?.role === 'staff' || user?.role === 'store_incharge' ? (
              <>
                {(() => {
                  const myTodayRecord = todayAttendance.find((a: any) => a.userId === user.id);
                  return myTodayRecord ? (
                    <div>
                      <div className="text-sm font-bold text-green-600">
                        Present
                      </div>
                      <p className="text-[10px] text-gray-500 leading-tight">
                        In: {formatTime(myTodayRecord.checkInTime)}
                        {myTodayRecord.checkOutTime && ` | Out: ${formatTime(myTodayRecord.checkOutTime)}`}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm font-bold text-gray-500">Not checked in</div>
                      <p className="text-[10px] text-gray-500">Use Check In/Out tab</p>
                    </div>
                  );
                })()}
              </>
            ) : (
              <>
                <div className="text-xl font-bold text-green-600">
                  {todayAttendance.filter((a: any) => a.status === "present").length}
                </div>
                <p className="text-[10px] text-gray-500">out of {staff.length} staff</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Hide these cards for staff and store keeper users */}
        {user?.role !== 'staff' && user?.role !== 'store_incharge' && (
          <>
            <Card className="border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between pb-1 px-3 pt-2">
                <CardTitle className="text-xs font-medium text-gray-700">Absent Today</CardTitle>
                <UserX className="h-3 w-3 text-red-600" />
              </CardHeader>
              <CardContent className="px-3 pb-2">
                <div className="text-xl font-bold text-red-600">
                  {(() => {
                    // Calculate actual absent staff: total staff - those who checked in today
                    const checkedInToday = todayAttendance.filter((a: any) => 
                      a.status === "present" || a.status === "late" || a.status === "half_day"
                    ).length;
                    const explicitlyAbsent = todayAttendance.filter((a: any) => a.status === "absent").length;
                    const totalAbsent = Math.max(staff.length - checkedInToday, explicitlyAbsent);
                    return totalAbsent;
                  })()}
                </div>
                <p className="text-[10px] text-gray-500">staff members</p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between pb-1 px-3 pt-2">
                <CardTitle className="text-xs font-medium text-gray-700">Half Day</CardTitle>
                <Clock className="h-3 w-3 text-yellow-600" />
              </CardHeader>
              <CardContent className="px-3 pb-2">
                <div className="text-xl font-bold text-yellow-600">
                  {todayAttendance.filter((a: any) => a.status === "half_day").length}
                </div>
                <p className="text-[10px] text-gray-500">staff members</p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between pb-1 px-3 pt-2">
                <CardTitle className="text-xs font-medium text-gray-700">Late Entries</CardTitle>
                <Timer className="h-3 w-3 text-orange-600" />
              </CardHeader>
              <CardContent className="px-3 pb-2">
                <div className="text-xl font-bold text-orange-600">
                  {todayAttendance.filter((a: any) => a.status === "late").length}
                </div>
                <p className="text-[10px] text-gray-500">staff members</p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between pb-1 px-3 pt-2">
                <CardTitle className="text-xs font-medium text-gray-700">Attendance %</CardTitle>
                <Users className="h-3 w-3 text-blue-600" />
              </CardHeader>
              <CardContent className="px-3 pb-2">
                <div className="text-xl font-bold text-blue-600">
                  {staff.length > 0 ? Math.round((todayAttendance.filter((a: any) => a.status === "present" || a.status === "late").length / staff.length) * 100) : 0}%
                </div>
                <p className="text-[10px] text-gray-500">today</p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between pb-1 px-3 pt-2">
                <CardTitle className="text-xs font-medium text-gray-700">Working Days</CardTitle>
                <Calendar className="h-3 w-3 text-blue-600" />
              </CardHeader>
              <CardContent className="px-3 pb-2">
                <div className="text-xl font-bold text-blue-600">
                  {attendanceStats?.workingDays || attendanceStats?.totalDays || 0}
                </div>
                <p className="text-[10px] text-gray-500">this month</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Mobile Tab Selector */}
      <div className="block md:hidden mb-4">
        <Select value={activeTab} onValueChange={setActiveTab}>
          <SelectTrigger className="w-full h-10 text-sm bg-white border-2 border-furnili-brown/20 rounded-lg">
            <SelectValue placeholder="Select section" />
          </SelectTrigger>
          <SelectContent className="border-2 border-furnili-brown/20">
            <SelectItem value="dashboard" className="text-sm">
              {user?.role === 'staff' || user?.role === 'store_incharge' ? 'My Attendance' : 'Dashboard'}
            </SelectItem>
            <SelectItem value="checkin" className="text-sm">Check In/Out</SelectItem>
            {user?.role !== 'staff' && user?.role !== 'store_incharge' && (
              <>
                <SelectItem value="attendance" className="text-sm">Attendance</SelectItem>
                <SelectItem value="staff" className="text-sm">Staff Management</SelectItem>
                <SelectItem value="payroll" className="text-sm">Payroll</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop Tabs */}
      <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="hidden md:block">
          <TabsList className={`grid w-full ${user?.role === 'staff' || user?.role === 'store_incharge' ? 'grid-cols-2' : 'grid-cols-5'} bg-furnili-brown/5 p-1 rounded-lg`}>
            <TabsTrigger value="dashboard" className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-furnili-brown">
              {user?.role === 'staff' || user?.role === 'store_incharge' ? 'My Attendance' : 'Dashboard'}
            </TabsTrigger>
            <TabsTrigger value="checkin" className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-furnili-brown">
              Check In/Out
            </TabsTrigger>
            {user?.role !== 'staff' && user?.role !== 'store_incharge' && (
              <>
                <TabsTrigger value="attendance" className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-furnili-brown">
                  Attendance
                </TabsTrigger>
                <TabsTrigger value="staff" className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-furnili-brown">
                  Staff Mgmt
                </TabsTrigger>
                <TabsTrigger value="payroll" className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-furnili-brown">
                  Payroll
                </TabsTrigger>
              </>
            )}
          </TabsList>
        </div>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Attendance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  {new Date().toLocaleDateString("en-IN", { 
                    weekday: 'short',
                    month: 'short', 
                    day: 'numeric'
                  })} Attendance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(() => {
                    // For staff and store_incharge users, show only their own attendance record
                    const attendanceToShow = user?.role === 'staff' || user?.role === 'store_incharge'
                      ? todayAttendance.filter((a: any) => a.userId === user.id)
                      : todayAttendance;
                    
                    return attendanceToShow.length > 0 ? (
                      attendanceToShow.map((attendance: any) => (
                        <div key={attendance.id} className="flex items-center justify-between p-2 border rounded-md bg-gray-50 hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <Users className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">
                                {(user?.role === 'staff' || user?.role === 'store_incharge') && attendance.userId === user.id ? 'You' : attendance.user?.name}
                              </p>
                              <p className="text-xs text-gray-600">
                                In: {formatTime(attendance.checkInTime)} 
                                {attendance.checkOutTime && ` | Out: ${formatTime(attendance.checkOutTime)}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            {getStatusBadge(attendance.status)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-gray-500 py-4 text-sm">
                        {user?.role === 'staff' || user?.role === 'store_incharge' ? 'You have not checked in today' : 'No attendance records for today'}
                      </p>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {user?.role === 'staff' || user?.role === 'store_incharge' ? (
                  /* Staff and store keepers see limited actions */
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-600 mb-4">Use the Check In/Out tab to manage your attendance</p>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        // Navigate to Check In/Out tab
                        const tabTrigger = document.querySelector('[value="checkin"]') as HTMLElement;
                        if (tabTrigger) tabTrigger.click();
                      }}
                      className="w-full"
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Go to Check In/Out
                    </Button>
                  </div>
                ) : (
                  /* Admin/Manager users see all actions */
                  <>
                    <Button 
                      className="w-full justify-start" 
                      variant="outline"
                      onClick={() => {
                        // Generate payroll for all staff
                        staff.forEach((member: any) => {
                          generatePayrollMutation.mutate({
                            userId: member.id,
                            month: selectedMonth,
                            year: selectedYear,
                          });
                        });
                      }}
                    >
                      <Calculator className="w-4 h-4 mr-2" />
                      Generate Monthly Payroll
                    </Button>
                    
                    <Button 
                      className="w-full justify-start" 
                      variant="outline"
                      onClick={exportAttendanceReport}
                      disabled={isExporting}
                    >
                      <Download className={`w-4 h-4 mr-2 ${isExporting ? 'animate-spin' : ''}`} />
                      {isExporting ? 'Exporting...' : 'Export Attendance Report'}
                    </Button>
                    
                    <Button className="w-full justify-start" variant="outline">
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Pay Slips
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Check In/Out Tab */}
        <TabsContent value="checkin" className="space-y-4">
          {user?.role === 'staff' ? (
            /* Staff Self Check-In/Out */
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  My Attendance
                </CardTitle>
                <p className="text-sm text-gray-600">Check yourself in and out for today</p>
              </CardHeader>
              <CardContent>
                {(() => {
                  const myTodayRecord = todayAttendance.find((a: any) => a.userId === user.id);
                  return (
                    <div className="space-y-6">
                      {/* Today's Status Card */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">Today's Status</h3>
                            <p className="text-sm text-gray-600">{new Date().toLocaleDateString("en-IN", { 
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}</p>
                          </div>
                          <div className="text-right">
                            {myTodayRecord ? getStatusBadge(myTodayRecord.status) : (
                              <Badge variant="outline" className="bg-gray-100">Not Checked In</Badge>
                            )}
                          </div>
                        </div>
                        
                        {myTodayRecord && (
                          <div className="mt-4 grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-600">Check In Time</p>
                              <p className="font-medium">{formatTime(myTodayRecord.checkInTime)}</p>
                            </div>
                            {myTodayRecord.checkOutTime && (
                              <div>
                                <p className="text-sm text-gray-600">Check Out Time</p>
                                <p className="font-medium">{formatTime(myTodayRecord.checkOutTime)}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-4 justify-center">
                        {!myTodayRecord ? (
                          <Button
                            size="lg"
                            className="px-8 py-3 bg-green-600 hover:bg-green-700"
                            onClick={() => selfCheckInMutation.mutate({})}
                            disabled={selfCheckInMutation.isPending}
                          >
                            <LogIn className="w-5 h-5 mr-2" />
                            {selfCheckInMutation.isPending ? 'Checking In...' : 'Check In'}
                          </Button>
                        ) : !myTodayRecord.checkOutTime ? (
                          <Button
                            size="lg"
                            variant="outline"
                            className="px-8 py-3 border-red-600 text-red-600 hover:bg-red-50"
                            onClick={() => selfCheckOutMutation.mutate()}
                            disabled={selfCheckOutMutation.isPending}
                          >
                            <LogOut className="w-5 h-5 mr-2" />
                            {selfCheckOutMutation.isPending ? 'Checking Out...' : 'Check Out'}
                          </Button>
                        ) : (
                          <div className="text-center">
                            <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
                              <CheckCircle className="w-5 h-5" />
                              <span className="font-medium">Attendance Complete</span>
                            </div>
                            <p className="text-sm text-gray-600">You've successfully checked in and out for today</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          ) : (
            /* Admin Check In/Out Management */
            <Card>
              <CardHeader>
                <CardTitle>Admin Check In/Out Management</CardTitle>
                <p className="text-sm text-gray-600">Manage staff check-in and check-out as admin</p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff Member</TableHead>
                      <TableHead>Today's Status</TableHead>
                      <TableHead>Check In Time</TableHead>
                      <TableHead>Check Out Time</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staff.map((member: any) => {
                      const todayRecord = todayAttendance.find((a: any) => a.userId === member.id);
                      
                      return (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <Users className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium">{member.name}</p>
                                <p className="text-sm text-gray-600">{member.designation || "Staff"}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {todayRecord ? getStatusBadge(todayRecord.status) : (
                              <Badge variant="outline">Not Marked</Badge>
                            )}
                          </TableCell>
                          <TableCell>{formatTime(todayRecord?.checkInTime)}</TableCell>
                          <TableCell>{formatTime(todayRecord?.checkOutTime)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {!todayRecord ? (
                                <Button
                                  size="sm"
                                  onClick={() => adminCheckInMutation.mutate({ userId: member.id })}
                                  disabled={adminCheckInMutation.isPending}
                                >
                                  Check In
                                </Button>
                              ) : !todayRecord.checkOutTime ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => adminCheckOutMutation.mutate({ attendanceId: todayRecord.id })}
                                  disabled={adminCheckOutMutation.isPending}
                                >
                                  Check Out
                                </Button>
                              ) : (
                                <span className="text-sm text-gray-500">Completed</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Admin-only tabs: Attendance, Staff Management, Payroll */}
        {user?.role !== 'staff' && (
          <>
            <TabsContent value="attendance" className="space-y-4">

          {/* Compact Attendance Records Display */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div>
                  <div>Attendance Records</div>
                  <p className="text-sm text-gray-600 font-normal mt-1">
                    Monthly attendance overview with status codes: P=Present, A=Absent, L=Late, HF=Half Day
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search staff name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-48"
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {staff.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table className="text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-8">No</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Post</TableHead>
                        {Array.from({ length: new Date(selectedYear, selectedMonth, 0).getDate() }, (_, i) => {
                          const day = i + 1;
                          const isEvenDay = day % 2 === 0;
                          const headerBgClass = isEvenDay ? 'bg-amber-50' : 'bg-gray-50';
                          return (
                            <TableHead key={day} className={`w-8 text-center p-1 text-xs ${headerBgClass}`}>
                              {day}
                            </TableHead>
                          );
                        })}
                        <TableHead className="w-16">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {staff.filter((member: any) => 
                        member.name.toLowerCase().includes(searchTerm.toLowerCase())
                      ).map((member: any, index: number) => {
                        const memberAttendance = attendanceRecords.filter(
                          (record: any) => record.userId === member.id
                        );
                        
                        const attendanceMap = memberAttendance.reduce((acc: any, record: any) => {
                          const day = new Date(record.date).getDate();
                          acc[day] = record.status;
                          return acc;
                        }, {});

                        const getStatusCode = (status: string) => {
                          switch (status) {
                            case 'present': return 'P';
                            case 'absent': return 'A';
                            case 'late': return 'L';
                            case 'half_day': return 'HF';
                            case 'on_leave': return 'L';
                            default: return 'A';
                          }
                        };

                        const getStatusColor = (status: string) => {
                          switch (status) {
                            case 'present': return 'text-green-700 bg-green-50';
                            case 'absent': return 'text-red-700 bg-red-50';
                            case 'late': return 'text-orange-700 bg-orange-50';
                            case 'half_day': return 'text-yellow-700 bg-yellow-50';
                            case 'on_leave': return 'text-blue-700 bg-blue-50';
                            default: return 'text-gray-500 bg-gray-50';
                          }
                        };

                        const totalPresent = Object.values(attendanceMap).filter(
                          (status: any) => status === 'present' || status === 'late'
                        ).length;
                        
                        const totalHalfDays = Object.values(attendanceMap).filter(
                          (status: any) => status === 'half_day'
                        ).length;

                        return (
                          <TableRow key={member.id}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell className="font-medium">{member.name}</TableCell>
                            <TableCell className="text-gray-600">{member.designation || member.role}</TableCell>
                            {Array.from({ length: new Date(selectedYear, selectedMonth, 0).getDate() }, (_, i) => {
                              const day = i + 1;
                              const status = attendanceMap[day];
                              const statusCode = status ? getStatusCode(status) : 'A';
                              const colorClass = status ? getStatusColor(status) : 'text-gray-400';
                              
                              const isEditing = editingCell?.staffId === member.id && editingCell?.day === day;
                              const isEvenDay = day % 2 === 0;
                              const columnBgClass = isEvenDay ? 'bg-amber-50/30' : 'bg-white';
                              
                              return (
                                <TableCell key={day} className={`text-center p-1 ${columnBgClass}`}>
                                  {isEditing ? (
                                    <div className="flex flex-col items-center gap-1">
                                      <Select 
                                        value={editingCellStatus} 
                                        onValueChange={setEditingCellStatus}
                                      >
                                        <SelectTrigger className="w-16 h-6 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="present">P</SelectItem>
                                          <SelectItem value="absent">A</SelectItem>
                                          <SelectItem value="half-day">HF</SelectItem>
                                          <SelectItem value="late">L</SelectItem>
                                          <SelectItem value="on-leave">LV</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <div className="flex gap-1">
                                        <Button 
                                          size="sm" 
                                          onClick={() => saveCellEdit(member.id, day, editingCellStatus)}
                                          className="h-4 w-4 p-0"
                                        >
                                          <Check className="w-2 h-2" />
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          onClick={cancelCellEdit}
                                          className="h-4 w-4 p-0"
                                        >
                                          <X className="w-2 h-2" />
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <span 
                                      className={`inline-block w-6 h-6 rounded text-xs font-medium leading-6 cursor-pointer hover:bg-gray-100 ${colorClass}`}
                                      onClick={() => handleCellEdit(member.id, day, status)}
                                      title="Click to edit attendance"
                                    >
                                      {statusCode}
                                    </span>
                                  )}
                                </TableCell>
                              );
                            })}
                            <TableCell className="font-medium text-center">
                              {totalPresent + (totalHalfDays * 0.5)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-4">No staff members found</p>
              )}
            </CardContent>
          </Card>

          {/* Toggle Button for Detailed Records */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetailedRecords(!showDetailedRecords)}
              className="bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-900"
            >
              {showDetailedRecords ? (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Hide Detailed Records (with Inline Editing)
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Show Detailed Records (with Inline Editing)
                </>
              )}
            </Button>
          </div>

          {/* Detailed Records Table (Collapsible) */}
          {showDetailedRecords && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Edit className="w-5 h-5" />
                  Attendance Records with Inline Editing
                  <Badge variant="secondary" className="ml-2">Click Edit to modify status</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
              {attendanceRecords.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Staff Member</TableHead>
                        <TableHead>Check In</TableHead>
                        <TableHead>Check Out</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceRecords.map((record: any) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            {new Date(record.date).toLocaleDateString("en-IN")}
                          </TableCell>
                          <TableCell>{record.user?.name}</TableCell>
                          <TableCell>
                            {record.checkInTime ? 
                              new Date(record.checkInTime).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit"
                              }) : "-"}
                          </TableCell>
                          <TableCell>
                            {record.checkOutTime ? 
                              new Date(record.checkOutTime).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit"
                              }) : "-"}
                          </TableCell>
                          <TableCell>
                            {editingAttendance === record.id ? (
                              <div className="flex items-center gap-2">
                                <Select value={editingStatus} onValueChange={setEditingStatus}>
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="present">Present</SelectItem>
                                    <SelectItem value="absent">Absent</SelectItem>
                                    <SelectItem value="half-day">Half Day</SelectItem>
                                    <SelectItem value="late">Late</SelectItem>
                                    <SelectItem value="on-leave">On Leave</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button 
                                  size="sm" 
                                  onClick={() => saveAttendanceEdit(record.id, editingStatus)}
                                  className="h-8 px-2"
                                >
                                  <Check className="w-3 h-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={cancelAttendanceEdit}
                                  className="h-8 px-2"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : (
                              getStatusBadge(record.status)
                            )}
                          </TableCell>
                          <TableCell>
                            {record.hoursWorked ? `${record.hoursWorked.toFixed(1)}h` : "-"}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600 max-w-xs truncate">
                              {record.notes || "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {editingAttendance === record.id ? null : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAttendanceEdit(record.id, record.status)}
                                className="h-8 px-2"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No attendance records found for the selected period.
                </div>
              )}
            </CardContent>
          </Card>
          )}
            </TabsContent>

            {/* Staff Management Tab - Admin Only */}
            <TabsContent value="staff" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Staff Management
                <Button size="sm" onClick={() => setIsAddStaffOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Staff
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Details</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Salary</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((member: any) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{member.name}</div>
                            <div className="text-sm text-gray-600">{member.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{member.employeeId}</TableCell>
                      <TableCell>{member.department}</TableCell>
                      <TableCell className="font-semibold">₹{member.basicSalary?.toLocaleString() || "N/A"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => handleEditStaff(member)}>
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => handleDeleteStaff(member.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
            </TabsContent>

            {/* Payroll Tab - Admin Only */}
            <TabsContent value="payroll" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Payroll for {new Date(selectedYear, selectedMonth - 1).toLocaleDateString('en-US', { month: 'long' })} {selectedYear.toString().slice(-2)}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="overflow-x-auto">
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow className="h-8">
                      <TableHead className="text-xs py-1 px-2">Employee</TableHead>
                      <TableHead className="text-xs py-1 px-2">Working Days</TableHead>
                      <TableHead className="text-xs py-1 px-2">Salary</TableHead>
                      <TableHead className="text-xs py-1 px-2">Net Pay</TableHead>
                      <TableHead className="text-xs py-1 px-2">Status</TableHead>
                      <TableHead className="text-xs py-1 px-2">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollRecords.map((payroll: any) => {
                      // Find the staff member from the staff array
                      const staffMember = staff.find((s: any) => s.id === payroll.userId);
                      const staffName = staffMember?.name || `User ${payroll.userId}`;
                      const employeeId = staffMember?.employeeId || payroll.employeeId || 'N/A';
                      
                      // Calculate net pay properly - use basicSalary and other fields correctly
                      const basicSalary = payroll.basicSalary || payroll.salary || staffMember?.basicSalary || 0;
                      const allowances = payroll.allowances || 0;
                      const bonus = payroll.bonus || 0;
                      const overtimePay = payroll.overtimePay || 0;
                      const deductions = payroll.deductions || payroll.advance || 0;
                      
                      // If no working days, net salary should be 0
                      const actualWorkingDays = payroll.actualWorkingDays || 0;
                      const totalWorkingDays = payroll.totalWorkingDays || 30;
                      
                      // Calculate proportionate salary based on working days
                      const proportionateSalary = actualWorkingDays > 0 ? 
                        Math.round((basicSalary / totalWorkingDays) * actualWorkingDays) : 0;
                      
                      const netSalary = payroll.netSalary || (proportionateSalary + allowances + bonus + overtimePay - deductions);
                      
                      return (
                        <TableRow key={payroll.id} className="h-10">
                          <TableCell className="py-1 px-2">
                            <div className="text-sm font-medium">{staffName} - {employeeId}</div>
                          </TableCell>
                          <TableCell className="py-1 px-2">
                            <div className="text-sm font-medium">{payroll.actualWorkingDays || 0} of {payroll.totalWorkingDays || 30}</div>
                          </TableCell>
                          <TableCell className="py-1 px-2 text-sm font-medium">₹{basicSalary.toLocaleString()}</TableCell>
                          <TableCell className="py-1 px-2 text-sm font-medium text-green-600">₹{netSalary.toLocaleString()}</TableCell>
                          <TableCell className="py-1 px-2">
                            <Badge variant={payroll.status === "paid" ? "default" : "secondary"} className="text-xs px-1.5 py-0.5">
                              {payroll.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-1 px-2">
                            <div className="flex gap-0.5">
                              {/* Generate button - always available for regeneration */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => generatePayrollMutation.mutate({
                                  userId: payroll.userId,
                                  month: selectedMonth,
                                  year: selectedYear
                                })}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-1.5 py-1 h-6"
                                disabled={generatePayrollMutation.isPending}
                                title="Generate"
                              >
                                <FileText className="w-3 h-3" />
                              </Button>
                              
                              {/* Status-specific buttons */}
                              {payroll.status === "generated" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => processPayrollMutation.mutate(payroll.id)}
                                  className="bg-green-600 hover:bg-green-700 text-white text-xs px-1.5 py-1 h-6"
                                  disabled={processPayrollMutation.isPending}
                                  title="Paid"
                                >
                                  <CreditCard className="w-3 h-3" />
                                </Button>
                              )}
                              
                              {payroll.status === "paid" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => downloadPayslip(payroll.id)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-1.5 py-1 h-6"
                                  title="PDF"
                                >
                                  <Download className="w-3 h-3" />
                                </Button>
                              )}
                              
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditPayroll(payroll)}
                                style={{ backgroundColor: 'hsl(28, 100%, 25%)', color: 'white' }}
                                className="text-xs px-1.5 py-1 h-6"
                                title="Edit"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          </TabsContent>
          </>
        )}
      </Tabs>

      {/* Add Staff Dialog */}
      <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Add New Staff Member
            </DialogTitle>
          </DialogHeader>
          <Form {...addStaffForm}>
            <form onSubmit={addStaffForm.handleSubmit(onAddStaffSubmit)} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FormField
                  control={addStaffForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={addStaffForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addStaffForm.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee ID *</FormLabel>
                      <FormControl>
                        <Input placeholder="EMP001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addStaffForm.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department *</FormLabel>
                      <FormControl>
                        <Input placeholder="HR, IT, Sales, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addStaffForm.control}
                  name="basicSalary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Salary (₹) *</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="50000" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addStaffForm.control}
                  name="aadharNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aadhar Number</FormLabel>
                      <FormControl>
                        <Input placeholder="1234 5678 9012" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField
                  control={addStaffForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+91 98765 43210" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={addStaffForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Complete address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsAddStaffOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createStaffMutation.isPending}>
                  {createStaffMutation.isPending ? "Adding..." : "Add Staff"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog */}
      <Dialog open={isEditStaffOpen} onOpenChange={setIsEditStaffOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit Staff Member
            </DialogTitle>
          </DialogHeader>
          <Form {...editStaffForm}>
            <form onSubmit={editStaffForm.handleSubmit(onEditStaffSubmit)} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FormField
                  control={editStaffForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter full name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editStaffForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address *</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editStaffForm.control}
                  name="employeeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employee ID *</FormLabel>
                      <FormControl>
                        <Input placeholder="EMP001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editStaffForm.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department *</FormLabel>
                      <FormControl>
                        <Input placeholder="HR, IT, Sales, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editStaffForm.control}
                  name="basicSalary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Salary (₹) *</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="50000" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editStaffForm.control}
                  name="aadharNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aadhar Number</FormLabel>
                      <FormControl>
                        <Input placeholder="1234 5678 9012" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField
                  control={editStaffForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+91 98765 43210" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editStaffForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Complete address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditStaffOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateStaffMutation.isPending}>
                  {updateStaffMutation.isPending ? "Updating..." : "Update Staff"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Payroll Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Edit Payroll - {editingPayroll?.staff?.name || `User ${editingPayroll?.userId}`}
            </DialogTitle>
          </DialogHeader>
          {editingPayroll && (
            <PayrollEditForm
              staff={editingPayroll.staff}
              payroll={editingPayroll}
              onSave={handlePayrollSave}
            />
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ResponsiveLayout>
  );
};
