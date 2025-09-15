import { useQuery, useMutation } from "@tanstack/react-query";
import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  DollarSign,
  CheckCircle,
  Calendar,
  Quote,
  Download,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  LogIn,
  LogOut,
  Briefcase,
  BarChart3,
  Activity
} from "lucide-react";
import { authService } from "@/lib/auth";
import { useState, useEffect } from "react";
import StockWarnings from "@/components/Dashboard/StockWarnings";
import MobileDashboard from "@/components/Mobile/MobileDashboard";
import { useIsMobile } from "@/components/Mobile/MobileOptimizer";
import MobileLayout from "@/components/Mobile/MobileLayout";
import { DashboardSkeleton } from "@/components/LoadingOptimizer";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { authenticatedApiRequest } from "@/lib/auth";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";
import FurniliCard from "@/components/UI/FurniliCard";
import FurniliButton from "@/components/UI/FurniliButton";
import FurniliStatsCard from "@/components/UI/FurniliStatsCard";

interface DashboardStats {
  totalProducts: number;
  lowStockProducts: any[];
  lowStockItems: number;
  totalUsers: number;
  activeUsers: number;
  pendingRequests: number;
  todayAttendance: number;
  monthlyExpenses: number;
  userExpenses?: number;
  activeTasks: number;
  totalValue: number;
  recentRequests: any[];
}

interface DashboardTask {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  assignedTo: number;
  assignedBy: number;
  assignedUser?: { id: number; name: string; username: string };
  assignedByUser?: { id: number; name: string; username: string };
  createdAt: string;
}

const motivationalQuotes = [
  {
    text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    author: "Winston Churchill"
  },
  {
    text: "The way to get started is to quit talking and begin doing.",
    author: "Walt Disney"
  },
  {
    text: "Innovation distinguishes between a leader and a follower.",
    author: "Steve Jobs"
  },
  {
    text: "Don't be afraid to give up the good to go for the great.",
    author: "John D. Rockefeller"
  },
  {
    text: "The only impossible journey is the one you never begin.",
    author: "Tony Robbins"
  },
  {
    text: "Success is walking from failure to failure with no loss of enthusiasm.",
    author: "Winston Churchill"
  },
  {
    text: "Quality is not an act, it is a habit.",
    author: "Aristotle"
  },
  {
    text: "The best time to plant a tree was 20 years ago. The second best time is now.",
    author: "Chinese Proverb"
  },
  {
    text: "Your limitation—it's only your imagination.",
    author: "Unknown"
  },
  {
    text: "Great things never come from comfort zones.",
    author: "Unknown"
  },
  {
    text: "Dream it. Wish it. Do it.",
    author: "Unknown"
  },
  {
    text: "Success doesn't just find you. You have to go out and get it.",
    author: "Unknown"
  },
  {
    text: "The harder you work for something, the greater you'll feel when you achieve it.",
    author: "Unknown"
  },
  {
    text: "Dream bigger. Do bigger.",
    author: "Unknown"
  },
  {
    text: "Don't stop when you're tired. Stop when you're done.",
    author: "Unknown"
  },
  {
    text: "Wake up with determination. Go to bed with satisfaction.",
    author: "Unknown"
  },
  {
    text: "Do something today that your future self will thank you for.",
    author: "Sean Patrick Flanery"
  },
  {
    text: "Little things make big days.",
    author: "Unknown"
  },
  {
    text: "It's going to be hard, but hard does not mean impossible.",
    author: "Unknown"
  },
  {
    text: "Don't wait for opportunity. Create it.",
    author: "Unknown"
  }
];

export default function Dashboard() {
  const currentUser = authService.getUser();
  const admin = authService.hasRole(['admin']);
  const [dailyQuote, setDailyQuote] = useState<typeof motivationalQuotes[0] | null>(null);
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();

  // Memoized daily quote to prevent re-calculation on each render
  const dailyQuoteIndex = useMemo(() => Math.floor(Math.random() * motivationalQuotes.length), []);
  
  // Select a quote on component mount
  useEffect(() => {
    setDailyQuote(motivationalQuotes[dailyQuoteIndex]);
  }, [dailyQuoteIndex]);

  // Optimized queries with caching for better performance
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch personal expense stats for staff users
  const { data: personalExpenseStats } = useQuery({
    queryKey: ["/api/petty-cash/my-stats"],
    enabled: currentUser?.role === 'staff',
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get personal attendance stats for the current user
  const { data: personalAttendanceStats } = useQuery<{
    totalDays: number;
    presentDays: number;
    attendancePercentage: number;
  }>({
    queryKey: ["/api/attendance/stats"],
    enabled: authService.hasRole(['staff', 'store_incharge']),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["/api/dashboard/activity"],
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 3 * 60 * 1000, // 3 minutes
  });

  // Fetch ongoing projects (not completed)
  const { data: ongoingProjects = [] } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: () => authenticatedApiRequest('GET', "/api/projects"),
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data: any[]) => data.filter(project => project.stage !== 'Completed'), // Filter out completed projects
  });

  // Fetch pending tasks for dashboard display
  const { data: pendingTasks = [] } = useQuery<DashboardTask[]>({
    queryKey: ["/api/dashboard/tasks"],
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
  });

  const { toast } = useToast();

  // Attendance queries for staff check-in functionality
  const { data: todayAttendance = [] } = useQuery({
    queryKey: ["/api/attendance/today"],
    queryFn: () => authenticatedApiRequest('GET', "/api/attendance/today"),
    enabled: authService.hasRole(['staff', 'store_incharge']),
  });

  // Mark task as done mutation
  const markTaskDoneMutation = useMutation({
    mutationFn: async (taskId: number) => {
      return authenticatedApiRequest("PATCH", `/api/tasks/${taskId}/status`, { status: "done" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/notifications"] });
      toast({
        title: "Task completed",
        description: "Task has been marked as done",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive",
      });
    },
  });

  // Self check-in/out mutations for staff users
  const selfCheckInMutation = useMutation({
    mutationFn: async (data: { location?: string; notes?: string }) => {
      return authenticatedApiRequest("POST", "/api/attendance/checkin", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Checked out successfully" });
    },
    onError: (error) => {
      toast({ title: "Check-out failed", description: String(error), variant: "destructive" });
    },
  });

  // Handle check in/out functionality for the new dashboard design
  const handleCheckInOut = () => {
    const myTodayRecord = todayAttendance?.find((a: any) => a.userId === currentUser?.id);
    const hasCheckedInToday = myTodayRecord && !myTodayRecord.checkOutTime;
    
    if (hasCheckedInToday) {
      selfCheckOutMutation.mutate();
    } else {
      selfCheckInMutation.mutate({} as any);
    }
  };

  // Check if user has checked in today (for button state)
  const myTodayRecord = todayAttendance.find((a: any) => a.userId === currentUser?.id);
  const hasCheckedInToday = myTodayRecord && !myTodayRecord.checkOutTime;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Use mobile dashboard for mobile devices
  if (isMobile) {
    return (
      <MobileLayout
        title={`Welcome back, ${currentUser?.name || 'Admin'}!`}
        subtitle="Here's your business overview and key metrics for today."
      >
        <MobileDashboard stats={stats || {}} tasks={pendingTasks || []} isLoading={isLoading} />
      </MobileLayout>
    );
  }

  return (
    <ResponsiveLayout
      title={`Welcome back, ${currentUser?.name || 'Admin'}!`}
      subtitle="Here's your business overview and key metrics for today."
    >
      {/* Daily Motivation Quote */}
      {dailyQuote && (
        <FurniliCard variant="gradient" className="border-l-4 border-l-primary">
          <div className="flex items-center space-x-4">
            <div className="furnili-gradient p-3 rounded-lg flex-shrink-0 self-center">
              <Quote className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <blockquote className="text-base font-medium text-foreground leading-relaxed">
                "{dailyQuote.text}"
              </blockquote>
              <cite className="block text-right text-muted-foreground font-semibold mt-3 text-sm">
                — {dailyQuote.author}
              </cite>
            </div>
          </div>
        </FurniliCard>
      )}





      {/* NEW DASHBOARD DESIGN FOR USERS & STOREKEEPERS */}
      {authService.hasRole(['staff', 'store_incharge']) && !authService.hasRole(['admin', 'manager']) ? (
        <>
          {/* Main Action Buttons - 4 in a row (5 for store keepers) */}
          <div className={`grid grid-cols-2 gap-3 mb-4 ${currentUser?.role === 'store_incharge' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'}`}>
            {/* Check In/Out Button */}
            <Card className="hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-pointer" onClick={handleCheckInOut}>
              <CardContent className="p-3 text-center">
                <div className="flex flex-col items-center space-y-1">
                  <div className="p-1.5 bg-green-500 rounded-full">
                    {hasCheckedInToday ? <LogOut className="h-4 w-4 text-white" /> : <LogIn className="h-4 w-4 text-white" />}
                  </div>
                  <span className="text-xs font-medium text-green-900">
                    {hasCheckedInToday ? 'Check Out' : 'Check In'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Material Request/Issue Button */}
            <Card className="hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 cursor-pointer" onClick={() => setLocation('/requests')}>
              <CardContent className="p-3 text-center">
                <div className="flex flex-col items-center space-y-1">
                  <div className="p-1.5 bg-orange-500 rounded-full">
                    <Package className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-medium text-orange-900">
                    {currentUser?.role === 'store_incharge' ? 'Material Issue' : 'New Material Request'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Add New Expense Button */}
            <Card className="hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 cursor-pointer" onClick={() => setLocation('/petty-cash')}>
              <CardContent className="p-3 text-center">
                <div className="flex flex-col items-center space-y-1">
                  <div className="p-1.5 bg-purple-500 rounded-full">
                    <DollarSign className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-medium text-purple-900">Add New Expense</span>
                </div>
              </CardContent>
            </Card>

            {/* Inventory Movement Button - Only for store keepers */}
            {currentUser?.role === 'store_incharge' && (
              <Card className="hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200 cursor-pointer" onClick={() => setLocation('/inventory-movement')}>
                <CardContent className="p-3 text-center">
                  <div className="flex flex-col items-center space-y-1">
                    <div className="p-1.5 bg-teal-500 rounded-full">
                      <BarChart3 className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-xs font-medium text-teal-900">Inventory Movement</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Ongoing Projects Button - Moved to last position */}
            <Card className="hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-pointer" onClick={() => setLocation('/projects')}>
              <CardContent className="p-3 text-center">
                <div className="flex flex-col items-center space-y-1">
                  <div className="p-1.5 bg-blue-500 rounded-full">
                    <Briefcase className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-medium text-blue-900">Ongoing Projects</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* My Attendance & Tasks - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {/* My Attendance */}
            <Card className="hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  My Attendance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const myTodayRecord = todayAttendance.find((a: any) => a.userId === currentUser?.id);
                  const formatTime = (timeString: string | null) => {
                    if (!timeString) return "-";
                    return new Date(timeString).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true
                    });
                  };
                  
                  const todayDate = new Date().toLocaleDateString("en-IN", { 
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short'
                  });
                  
                  // Use actual attendance data from the API (backend returns working days as totalDays)
                  const presentDays = personalAttendanceStats?.presentDays || 0;
                  const totalWorkingDays = personalAttendanceStats?.totalDays || 0;
                  const attendancePercentage = personalAttendanceStats?.attendancePercentage || (totalWorkingDays > 0 ? Math.round((presentDays / totalWorkingDays) * 100) : 0);
                  
                  return (
                    <div className="space-y-4">
                      {/* Today's attendance */}
                      <div className="space-y-3">
                        {/* Date in bubble format */}
                        <div className="inline-block bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                          {todayDate}
                        </div>
                        
                        {/* In/Out times on same line */}
                        {myTodayRecord ? (
                          <div className="text-sm text-gray-700">
                            <span>In: {formatTime(myTodayRecord.checkInTime)}</span>
                            {myTodayRecord.checkOutTime && (
                              <>
                                <span className="mx-2 text-gray-400">|</span>
                                <span>Out: {formatTime(myTodayRecord.checkOutTime)}</span>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-600">
                            <span>Not checked in today</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Monthly summary */}
                      <div className="space-y-4 pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">This Month</span>
                          <span className="text-2xl font-bold text-orange-600">
                            {attendancePercentage}%
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Present Days</span>
                            <span className="font-medium">{presentDays}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Total Working Days</span>
                            <span className="font-medium">{totalWorkingDays}</span>
                          </div>
                        </div>
                        <Progress value={attendancePercentage} className="h-2" />
                      </div>
                    </div>
                  ) as React.ReactElement;
                })()}
              </CardContent>
            </Card>

            {/* My Tasks */}
            <Card className="hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-500" />
                  My Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingTasks && pendingTasks.length > 0 ? (
                  <div className="space-y-3">
                    {pendingTasks.slice(0, 3).map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                          <p className="text-xs text-gray-600">
                            Priority: {task.priority} | Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                          </p>
                        </div>
                        <Badge variant={task.priority === 'high' ? 'destructive' : 'default'} className="text-xs">
                          {task.status}
                        </Badge>
                      </div>
                    ))}
                    {pendingTasks.length > 3 && (
                      <Button variant="outline" size="sm" className="w-full" onClick={() => setLocation('/tasks')}>
                        View All {pendingTasks.length} Tasks
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-3" />
                    <p className="text-sm font-medium text-green-900">All caught up!</p>
                    <p className="text-xs text-green-700">No pending tasks.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>


        </>
      ) : (
        /* ADMIN/MANAGER DASHBOARD - Keep existing layout */
        <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mb-4">
          <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500 bg-gradient-to-br from-card to-blue-50/20 cursor-pointer" onClick={() => setLocation('/products')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-semibold text-card-foreground">Products</CardTitle>
              <Package className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent className="pb-2 pt-1">
              <div className="text-xl font-bold text-foreground">{stats?.totalProducts || 0}</div>
              <p className="text-xs text-muted-foreground mt-0.5">Active items</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg hover:scale-[1.02] transition-all duration-300 border-l-4 border-l-red-500 bg-gradient-to-br from-red-50 to-red-100 border-red-200 cursor-pointer group" onClick={() => setLocation('/products?filter=low-stock')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-red-900 group-hover:text-red-700">Low Stock Alert</CardTitle>
              <div className="p-2 bg-red-500 rounded-full group-hover:bg-red-600 transition-colors">
                <AlertTriangle className="h-5 w-5 text-white animate-pulse" />
              </div>
            </CardHeader>
            <CardContent className="pb-3 pt-1">
              <div className="text-2xl font-bold text-red-600 mb-1">
                {Array.isArray(stats?.lowStockProducts) ? stats.lowStockProducts.length : 0}
              </div>
              <p className="text-xs font-medium text-red-700">Items need restocking</p>
              {Array.isArray(stats?.lowStockProducts) && stats.lowStockProducts.length > 0 && (
                <div className="mt-2 text-xs text-red-600 bg-red-200/50 px-2 py-1 rounded">
                  Action required!
                </div>
              )}
            </CardContent>
          </Card>

          {/* Check In/Out Button for Managers */}
          {currentUser?.role === 'manager' && (
            <Card className="hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-pointer" onClick={handleCheckInOut}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold text-green-900">
                  {hasCheckedInToday ? 'Check Out' : 'Check In'}
                </CardTitle>
                <div className="p-2 bg-green-500 rounded-full">
                  {hasCheckedInToday ? <LogOut className="h-5 w-5 text-white" /> : <LogIn className="h-5 w-5 text-white" />}
                </div>
              </CardHeader>
              <CardContent className="pb-3 pt-1">
                <div className="text-sm font-medium text-green-700">
                  {hasCheckedInToday ? 'End your work day' : 'Start your work day'}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="hover:shadow-lg hover:scale-[1.02] transition-all duration-300 border-l-4 border-l-orange-500 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 cursor-pointer group" onClick={() => setLocation('/attendance')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-orange-900 group-hover:text-orange-700">Today's Attendance</CardTitle>
              <div className="p-2 bg-orange-500 rounded-full group-hover:bg-orange-600 transition-colors">
                <Clock className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="pb-3 pt-1">
              <div className="text-2xl font-bold text-orange-600 mb-1">{stats?.todayAttendance || 0}</div>
              <p className="text-xs font-medium text-orange-700">Staff present today</p>
              <div className="mt-2 flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-orange-600">Live tracking</span>
              </div>
            </CardContent>
          </Card>



          <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-indigo-500 bg-gradient-to-br from-card to-indigo-50/20 cursor-pointer" onClick={() => setLocation('/requests')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
              <CardTitle className="text-xs font-semibold text-card-foreground">Requests</CardTitle>
              <TrendingUp className="h-5 w-5 text-indigo-600" />
            </CardHeader>
            <CardContent className="pb-2 pt-1">
              <div className="text-xl font-bold text-foreground">{stats?.pendingRequests || 0}</div>
              <p className="text-xs text-muted-foreground mt-0.5">Pending</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg hover:scale-[1.02] transition-all duration-300 border-l-4 border-l-yellow-500 bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 cursor-pointer group" onClick={() => setLocation('/petty-cash')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-yellow-900 group-hover:text-yellow-700">Monthly Expenses</CardTitle>
              <div className="p-2 bg-yellow-500 rounded-full group-hover:bg-yellow-600 transition-colors">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="pb-3 pt-1">
              <div className="text-2xl font-bold text-yellow-600 mb-1">
                ₹{stats?.monthlyExpenses?.toLocaleString() || 0}
              </div>
              <p className="text-xs font-medium text-yellow-700">Total this month</p>
              <div className="mt-2 text-xs text-yellow-600 bg-yellow-200/50 px-2 py-1 rounded">
                Track & manage
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Removed animated "New Messages" section - keeping only clean "Pending Tasks" section below */}

      {/* Admin/Manager Only: Compact Urgent Tasks Display */}
      {!authService.hasRole(['staff', 'store_incharge']) && pendingTasks && pendingTasks.length > 0 && (
        <Card className="hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Urgent Tasks
            </CardTitle>
            <button 
              onClick={() => setLocation('/tasks')}
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors"
            >
              View All {pendingTasks.length} Tasks
            </button>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Show only the next 2-3 most urgent tasks as simple one-liners */}
            <div className="space-y-0">
              {pendingTasks
                .sort((a, b) => {
                  // Sort by priority: high > medium > low
                  const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
                  const priorityDiff = (priorityOrder[b.priority as keyof typeof priorityOrder] || 1) - (priorityOrder[a.priority as keyof typeof priorityOrder] || 1);
                  if (priorityDiff !== 0) return priorityDiff;
                  
                  // Then by due date if available
                  if (a.dueDate && b.dueDate) {
                    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                  }
                  if (a.dueDate) return -1;
                  if (b.dueDate) return 1;
                  
                  // Finally by creation date
                  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                })
                .slice(0, 3)
                .map((task) => (
                  <div 
                    key={task.id} 
                    className="flex items-center gap-3 py-2 px-1 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                    onClick={() => setLocation(`/tasks/${task.id}`)}
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      task.priority === 'high' ? 'bg-red-500' :
                      task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />
                    <p className="text-sm font-medium text-gray-900 truncate flex-1">
                      {task.title}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded flex-shrink-0 ${
                      task.priority === 'high' ? 'bg-red-100 text-red-700' :
                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {task.priority}
                    </span>
                    {task.dueDate && (
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        Due: {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin/Manager Only: No Tasks Message */}
      {!authService.hasRole(['staff', 'store_incharge']) && pendingTasks && pendingTasks.length === 0 && (
        <Card className="bg-green-50/50 border-green-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-900">All caught up!</p>
                <p className="text-xs text-green-700">You have no pending tasks at the moment.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin/Manager Only: Hide project information from store keepers */}
      {!authService.hasRole(['staff', 'store_incharge']) && currentUser?.role !== 'store_incharge' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Ongoing Projects Section */}
          <Card className="hover:shadow-md transition-all duration-200">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Package className="h-5 w-5" />
                Ongoing Projects
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {ongoingProjects && ongoingProjects.length > 0 ? (
                <div className="space-y-0">
                  {ongoingProjects.slice(0, 4).map((project: any) => (
                    <div 
                      key={project.id} 
                      className="flex items-center justify-between py-2 px-1 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                      onClick={() => setLocation(`/projects/${project.id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {project.code}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          {project.name}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ml-2 flex-shrink-0 ${
                        project.stage === 'estimate-given' ? 'bg-blue-100 text-blue-700' :
                        project.stage === 'client-approved' ? 'bg-red-100 text-red-700' :
                        project.stage === 'prospect' ? 'bg-gray-100 text-gray-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {project.stage}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <CheckCircle2 className="h-6 w-6 mx-auto text-green-500 mb-2" />
                  <p className="text-sm font-medium text-green-900">All projects completed!</p>
                  <p className="text-xs text-green-700">No ongoing projects.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Critical Stock Alerts Section */}
          <Card className="hover:shadow-md transition-all duration-200">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Critical Stock Alerts
                {stats?.lowStockProducts && stats.lowStockProducts.length > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {stats.lowStockProducts.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-amber-700 mb-3">Products requiring immediate attention</p>
              {stats?.lowStockProducts && stats.lowStockProducts.length > 0 ? (
                <div className="space-y-0">
                  {stats.lowStockProducts.slice(0, 3).map((product: any) => (
                    <div 
                      key={product.id}
                      className="flex items-center justify-between py-2 px-1 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                      onClick={() => setLocation(`/products?filter=low-stock`)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                          <Package className="h-3 w-3 text-amber-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {product.name}
                          </p>
                          <p className="text-xs text-gray-600">
                            Stock: {product.currentStock}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 ml-2 flex-shrink-0">
                        Critical
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <CheckCircle2 className="h-6 w-6 mx-auto text-green-500 mb-2" />
                  <p className="text-sm font-medium text-green-900">All stock levels adequate</p>
                  <p className="text-xs text-green-600">No critical alerts</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity Section */}
          <Card className="hover:shadow-md transition-all duration-200">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {recentActivity && Array.isArray(recentActivity) && recentActivity.length > 0 ? (
                <div className="space-y-0">
                  {recentActivity.slice(0, 4).map((activity: any, index: number) => (
                    <div key={index} className="flex items-center gap-3 py-2 px-1 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0">
                      <div className="flex-shrink-0">
                        {activity.description.includes('product') ? (
                          <Package className="h-4 w-4 text-green-600" />
                        ) : activity.description.includes('Stock movement') ? (
                          <BarChart3 className="h-4 w-4 text-blue-600" />
                        ) : activity.description.includes('Task completed') ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : activity.description.includes('checked in') ? (
                          <Clock className="h-4 w-4 text-orange-600" />
                        ) : (
                          <Activity className="h-4 w-4 text-gray-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {activity.timestamp || '2 mins ago'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <Activity className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">No recent activity</p>
                  <p className="text-xs text-gray-600">Activity will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Store Keeper specific sections */}
      {currentUser?.role === 'store_incharge' && (
        <div className="space-y-4">
          {/* Material Requests to Process */}
          {stats?.recentRequests && stats.recentRequests.filter((r: any) => ['pending', 'approved'].includes(r.status)).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Package className="h-4 w-4 text-indigo-500" />
                  Material Requests to Process ({stats.recentRequests.filter((r: any) => ['pending', 'approved'].includes(r.status)).length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stats.recentRequests.filter((request: any) => ['pending', 'approved'].includes(request.status)).slice(0, 5).map((request: any) => (
                    <div 
                      key={request.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-indigo-50/50 border border-indigo-200/50 hover:bg-indigo-50 cursor-pointer transition-colors"
                      onClick={() => setLocation(`/requests`)}
                    >
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <Badge 
                          variant={
                            request.status === 'pending' ? 'outline' :
                            request.status === 'approved' ? 'default' :
                            request.status === 'issued' ? 'secondary' :
                            'destructive'
                          }
                          className="text-xs min-w-fit"
                        >
                          {request.status}
                        </Badge>
                        <p className="text-xs text-gray-600 truncate">
                          {request.requestId} - {request.clientName}
                        </p>
                      </div>
                      <ArrowRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Low Stock Alert */}
          {stats?.lowStockProducts && stats.lowStockProducts.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  Low Stock Alert ({stats.lowStockProducts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {stats.lowStockProducts.slice(0, 5).map((product: any) => (
                    <div 
                      key={product.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-red-50/50 border border-red-200/50 hover:bg-red-50 cursor-pointer transition-colors"
                      onClick={() => setLocation(`/products`)}
                    >
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <Badge variant="destructive" className="text-xs min-w-fit">
                          {product.currentStock}/{product.minStock}
                        </Badge>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-900 truncate">
                            {product.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {product.category}
                          </p>
                        </div>
                      </div>
                      <ArrowRight className="h-3 w-3 text-gray-400 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </ResponsiveLayout>
  );
}