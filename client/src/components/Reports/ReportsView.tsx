import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile, MobileCard } from "@/components/Mobile/MobileOptimizer";
import MobileTable from "@/components/Mobile/MobileTable";
import { 
  Download, 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  FileBarChart,
  Calendar,
  Filter,
  Receipt,
  Building,
  Target,
  Users,
  DollarSign,
  Briefcase
} from "lucide-react";
import { authenticatedApiRequest } from "@/lib/queryClient";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const reportTypes = [
  { value: "inventory", label: "Inventory Report", icon: Package },
  { value: "material-requests", label: "Material Requests", icon: Briefcase },
  { value: "low-stock", label: "Low Stock Alert", icon: AlertTriangle },
  { value: "financial", label: "Financial Summary", icon: DollarSign },
  { value: "sales", label: "Sales Report", icon: TrendingUp },
  { value: "petty-cash", label: "Petty Cash Report", icon: Receipt },
  { value: "projects", label: "Projects Report", icon: Building },
  { value: "attendance", label: "Attendance Report", icon: Users },
  { value: "purchase-orders", label: "Purchase Orders", icon: Target },
  { value: "quotes", label: "Quotes & Estimates", icon: FileBarChart },
  { value: "suppliers", label: "Supplier Performance", icon: Building },
  { value: "stock-movements", label: "Stock Movement History", icon: TrendingUp },
  { value: "user-activity", label: "User Activity Log", icon: Users },
];

interface ReportFilters {
  dateRange: string;
  type: string;
  category: string;
  month: number;
  year: number;
  employee: string;
}

interface ReportStats {
  totalProducts: number;
  totalValue: number;
  lowStockItems: number;
  pendingRequests: number;
  totalPettyCash: number;
  completedProjects: number;
  totalAttendance: number;
  totalPurchaseOrders: number;
  totalSalesValue: number;
  totalQuotes: number;
  totalSuppliers: number;
  totalStockMovements: number;
  totalUserActivity: number;
  detailedData: any[];
  reportType: string;
  summary: any;
}

const getReportTitle = (type: string) => {
  switch (type) {
    case 'inventory': return 'Detailed Inventory Report';
    case 'material-requests': return 'Material Requests Report'; 
    case 'low-stock': return 'Low Stock Alert Report';
    case 'financial': return 'Financial Summary Report';
    case 'sales': return 'Sales Report';
    case 'petty-cash': return 'Petty Cash Expense Report';
    case 'projects': return 'Projects Status Report';
    case 'attendance': return 'Staff Attendance Report';
    case 'purchase-orders': return 'Purchase Orders Report';
    case 'quotes': return 'Quotes & Estimates Report';
    case 'suppliers': return 'Supplier Performance Report';
    case 'stock-movements': return 'Stock Movement History Report';
    case 'user-activity': return 'User Activity Log Report';
    default: return 'Report';
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount || 0);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-IN');
};

// Colors for charts
const CHART_COLORS = ['#D97706', '#92400E', '#FBBF24', '#FCD34D', '#FEF3C7'];

// Function to prepare stock movement chart data
const prepareStockMovementChartData = (data: any[]) => {
  // Group by date
  const dailyMovements = data.reduce((acc: any, movement: any) => {
    const date = formatDate(movement.createdAt);
    if (!acc[date]) {
      acc[date] = { date, in: 0, out: 0, total: 0 };
    }
    
    if (movement.movementType === 'in' || movement.movementType === 'adjustment-in') {
      acc[date].in += Math.abs(movement.quantity);
    } else {
      acc[date].out += Math.abs(movement.quantity);
    }
    acc[date].total += Math.abs(movement.quantity);
    
    return acc;
  }, {});

  const dailyData = Object.values(dailyMovements).sort((a: any, b: any) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Group by product for pie chart
  const productMovements = data.reduce((acc: any, movement: any) => {
    const product = movement.productName || 'Unknown Product';
    if (!acc[product]) {
      acc[product] = { name: product, value: 0 };
    }
    acc[product].value += Math.abs(movement.quantity);
    return acc;
  }, {});

  const productData = Object.values(productMovements).slice(0, 5); // Top 5 products

  // Group by type for bar chart
  const typeMovements = data.reduce((acc: any, movement: any) => {
    let type = movement.movementType;
    if (type === 'adjustment-in' || type === 'in') type = 'Stock In';
    else if (type === 'adjustment-out' || type === 'out') type = 'Stock Out';
    else type = 'Other';
    
    if (!acc[type]) {
      acc[type] = { type, count: 0 };
    }
    acc[type].count += 1;
    return acc;
  }, {});

  const typeData = Object.values(typeMovements);

  return { dailyData, productData, typeData };
};

// Function to render charts for stock movement history
const renderStockMovementCharts = (data: any[]) => {
  const { dailyData, productData, typeData } = prepareStockMovementChartData(data);

  return (
    <div className="space-y-6 mb-6">
      {/* Daily Stock Movement Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Stock Movement Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="in" stroke="#10B981" strokeWidth={2} name="Stock In" />
              <Line type="monotone" dataKey="out" stroke="#EF4444" strokeWidth={2} name="Stock Out" />
              <Line type="monotone" dataKey="total" stroke="#D97706" strokeWidth={2} name="Total Movement" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products by Movement Volume */}
        <Card>
          <CardHeader>
            <CardTitle>Top Products by Movement Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={productData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {productData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Movement Types Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Movement Types Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#D97706" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const renderStatsCards = (stats: ReportStats) => {
  const getStatsForType = (type: string) => {
    switch (type) {
      case 'inventory':
        return [
          { label: "Total Products", value: stats.totalProducts, icon: Package },
          { label: "Total Value", value: formatCurrency(stats.totalValue), icon: DollarSign },
          { label: "Low Stock Items", value: stats.lowStockItems, icon: AlertTriangle },
        ];
      case 'low-stock':
        return [
          { label: "Critical Items", value: stats.lowStockItems, icon: AlertTriangle },
          { label: "Total Value at Risk", value: formatCurrency(stats.totalValue), icon: DollarSign },
          { label: "Immediate Action Needed", value: `${Math.ceil((stats.lowStockItems || 0) * 0.7)} Items`, icon: Package },
        ];
      case 'material-requests':
        return [
          { label: "Total Requests", value: stats.detailedData?.length || 0, icon: Briefcase },
          { label: "Pending Requests", value: stats.pendingRequests, icon: AlertTriangle },
        ];
      case 'petty-cash':
        return [
          { label: "Total Expenses", value: formatCurrency(stats.totalPettyCash), icon: Receipt },
          { label: "Number of Entries", value: stats.detailedData?.length || 0, icon: FileBarChart },
        ];
      case 'projects':
        return [
          { label: "Total Projects", value: stats.detailedData?.length || 0, icon: Building },
          { label: "Completed Projects", value: stats.completedProjects, icon: TrendingUp },
        ];
      case 'sales':
        return [
          { label: "Total Sales Value", value: formatCurrency(stats.totalSalesValue), icon: TrendingUp },
          { label: "Products Sold", value: stats.detailedData?.length || 0, icon: Package },
        ];
      case 'attendance':
        return [
          { label: "Total Records", value: stats.detailedData?.length || 0, icon: Users },
          { label: "Present Days", value: stats.totalAttendance, icon: TrendingUp },
        ];
      case 'purchase-orders':
        return [
          { label: "Total POs", value: stats.detailedData?.length || 0, icon: Target },
          { label: "Total Value", value: formatCurrency(stats.totalValue), icon: DollarSign },
        ];
      case 'quotes':
        return [
          { label: "Total Quotes", value: stats.detailedData?.length || 0, icon: FileBarChart },
          { label: "Total Value", value: formatCurrency(stats.totalValue), icon: DollarSign },
        ];
      case 'suppliers':
        return [
          { label: "Total Suppliers", value: stats.detailedData?.length || 0, icon: Building },
          { label: "Active Suppliers", value: stats.totalSuppliers, icon: TrendingUp },
        ];
      case 'stock-movements':
        return [
          { label: "Total Movements", value: stats.detailedData?.length || 0, icon: TrendingUp },
          { label: "Stock Changes", value: stats.totalStockMovements, icon: Package },
        ];
      case 'user-activity':
        return [
          { label: "Total Activities", value: stats.detailedData?.length || 0, icon: Users },
          { label: "Active Users", value: stats.totalUserActivity, icon: TrendingUp },
        ];
      default:
        return [];
    }
  };

  const statsCards = getStatsForType(stats.reportType);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {statsCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index}>
            <CardContent className="flex items-center p-6">
              <Icon className="h-8 w-8 text-amber-600 mr-4" />
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

const renderDetailedTable = (type: string, data: any[]) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No data available for this report
      </div>
    );
  }

  switch (type) {
    case 'inventory':
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Price (₹)</TableHead>
              <TableHead className="text-center">Current Stock</TableHead>
              <TableHead className="text-center">Min Stock</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Total Value (₹)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell><Badge variant="outline">{product.sku}</Badge></TableCell>
                <TableCell className="text-right">{formatCurrency(product.pricePerUnit || 0)}</TableCell>
                <TableCell className="text-center">{product.currentStock || 0}</TableCell>
                <TableCell className="text-center">{product.minStock || 0}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={(product.currentStock || 0) <= (product.minStock || 0) ? "destructive" : "default"}>
                    {(product.currentStock || 0) <= (product.minStock || 0) ? "Low" : "Good"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{formatCurrency((product.pricePerUnit || 0) * (product.currentStock || 0))}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );

    case 'low-stock':
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Price (₹)</TableHead>
              <TableHead className="text-center">Current Stock</TableHead>
              <TableHead className="text-center">Min Stock</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Action Needed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell><Badge variant="outline">{product.sku}</Badge></TableCell>
                <TableCell className="text-right">{formatCurrency(product.pricePerUnit || 0)}</TableCell>
                <TableCell className="text-center">{product.currentStock || 0}</TableCell>
                <TableCell className="text-center">{product.minStock || 0}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="destructive">Critical</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline">Reorder {(product.minStock || 0) - (product.currentStock || 0) + 10}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );

    case 'material-requests':
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Request ID</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead className="text-right">Estimated Cost</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((request) => (
              <TableRow key={request.id}>
                <TableCell><Badge variant="outline">{request.orderNumber}</Badge></TableCell>
                <TableCell className="font-medium">
                  {request.items && request.items.length > 0 
                    ? request.items.map(item => item.product?.name).filter(Boolean).join(', ') || 'N/A'
                    : 'N/A'
                  }
                </TableCell>
                <TableCell>
                  {request.items && request.items.length > 0
                    ? request.items.reduce((total, item) => total + (item.requestedQuantity || 0), 0)
                    : 0
                  }
                </TableCell>
                <TableCell>{request.clientName || "N/A"}</TableCell>
                <TableCell>
                  <Badge variant={
                    request.status === 'completed' ? 'default' :
                    request.status === 'approved' ? 'secondary' :
                    request.status === 'pending' ? 'destructive' : 'outline'
                  }>
                    {request.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={request.priority === 'high' ? 'destructive' : 'secondary'}>
                    {request.priority}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(request.createdAt)}</TableCell>
                <TableCell className="text-right">{formatCurrency(request.totalValue || 0)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );

    case 'petty-cash':
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Paid By</TableHead>
              <TableHead className="text-right">Amount (₹)</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell>{formatDate(expense.expenseDate)}</TableCell>
                <TableCell>{expense.category}</TableCell>
                <TableCell className="font-medium">{expense.description}</TableCell>
                <TableCell>{expense.vendor || "N/A"}</TableCell>
                <TableCell>{expense.projectName || "General"}</TableCell>
                <TableCell>{expense.paidByName || "N/A"}</TableCell>
                <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                <TableCell>
                  <Badge variant={expense.status === 'approved' ? 'default' : 'secondary'}>
                    {expense.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );

    case 'projects':
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project Code</TableHead>
              <TableHead>Project Name</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Target Date</TableHead>
              <TableHead className="text-right">Budget (₹)</TableHead>
              <TableHead>Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((project) => (
              <TableRow key={project.id}>
                <TableCell><Badge variant="outline">{project.projectCode}</Badge></TableCell>
                <TableCell className="font-medium">{project.name}</TableCell>
                <TableCell>{project.clientName}</TableCell>
                <TableCell>
                  <Badge variant={
                    project.stage === 'completed' ? 'default' :
                    project.stage === 'in_progress' ? 'secondary' :
                    project.stage === 'prospect' ? 'destructive' : 'outline'
                  }>
                    {project.stage?.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(project.startDate)}</TableCell>
                <TableCell>{project.targetDate ? formatDate(project.targetDate) : "N/A"}</TableCell>
                <TableCell className="text-right">{formatCurrency(project.budget || 0)}</TableCell>
                <TableCell>{project.progress || 0}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );

    case 'sales':
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Size</TableHead>
              <TableHead className="text-right">Unit Price (₹)</TableHead>
              <TableHead className="text-center">Quantity Sold</TableHead>
              <TableHead className="text-right">Total Sales (₹)</TableHead>
              <TableHead>Date Added</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell className="font-medium">{sale.name}</TableCell>
                <TableCell>{sale.category}</TableCell>
                <TableCell>{sale.size || "N/A"}</TableCell>
                <TableCell className="text-right">{formatCurrency(sale.unitPrice)}</TableCell>
                <TableCell className="text-center">1</TableCell>
                <TableCell className="text-right">{formatCurrency(sale.unitPrice)}</TableCell>
                <TableCell>{formatDate(sale.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );

    case 'attendance':
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Check In</TableHead>
              <TableHead>Check Out</TableHead>
              <TableHead>Working Hours</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((attendance) => (
              <TableRow key={attendance.id}>
                <TableCell>{formatDate(attendance.date)}</TableCell>
                <TableCell className="font-medium">{attendance.userName}</TableCell>
                <TableCell>{attendance.checkInTime ? new Date(attendance.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : "N/A"}</TableCell>
                <TableCell>{attendance.checkOutTime ? new Date(attendance.checkOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : "N/A"}</TableCell>
                <TableCell>{attendance.workingHours || 0} hrs</TableCell>
                <TableCell>
                  <Badge variant={
                    attendance.status === 'present' ? 'default' :
                    attendance.status === 'half_day' ? 'secondary' :
                    attendance.status === 'on_leave' ? 'outline' : 'destructive'
                  }>
                    {attendance.status?.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>{attendance.notes || "N/A"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );

    case 'purchase-orders':
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO Number</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total Amount (₹)</TableHead>
              <TableHead>Items Count</TableHead>
              <TableHead>Created By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((po) => (
              <TableRow key={po.id}>
                <TableCell><Badge variant="outline">{po.poNumber}</Badge></TableCell>
                <TableCell className="font-medium">{po.supplierName}</TableCell>
                <TableCell>{formatDate(po.date)}</TableCell>
                <TableCell>
                  <Badge variant={
                    po.status === 'received' ? 'default' :
                    po.status === 'sent' ? 'secondary' :
                    po.status === 'draft' ? 'outline' : 'destructive'
                  }>
                    {po.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{formatCurrency(po.totalAmount)}</TableCell>
                <TableCell>{po.itemsCount || 0}</TableCell>
                <TableCell>{po.createdByName}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );

    case 'quotes':
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quote Number</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Amount (₹)</TableHead>
              <TableHead>Items Count</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((quote) => (
              <TableRow key={quote.id}>
                <TableCell><Badge variant="outline">{quote.quoteNumber}</Badge></TableCell>
                <TableCell className="font-medium">{quote.projectName}</TableCell>
                <TableCell>{quote.clientName}</TableCell>
                <TableCell>
                  <Badge variant={
                    quote.status === 'approved' ? 'default' :
                    quote.status === 'sent' ? 'secondary' :
                    quote.status === 'draft' ? 'outline' : 'destructive'
                  }>
                    {quote.status}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(quote.createdAt)}</TableCell>
                <TableCell className="text-right">{formatCurrency(quote.totalAmount)}</TableCell>
                <TableCell>{quote.itemsCount || 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );

    case 'suppliers':
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier Name</TableHead>
              <TableHead>Contact Person</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Products Count</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell className="font-medium">{supplier.name}</TableCell>
                <TableCell>{supplier.contactPerson || "N/A"}</TableCell>
                <TableCell>{supplier.email || "N/A"}</TableCell>
                <TableCell>{supplier.phone || "N/A"}</TableCell>
                <TableCell>{supplier.address || "N/A"}</TableCell>
                <TableCell>{supplier.productsCount || 0}</TableCell>
                <TableCell>
                  <Badge variant="default">Active</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );

    case 'stock-movements':
      return (
        <div>
          {/* Render Charts First */}
          {renderStockMovementCharts(data)}
          
          {/* Then Render Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Stock Movement Records</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>{formatDate(movement.createdAt)}</TableCell>
                      <TableCell className="font-medium">{movement.productName}</TableCell>
                      <TableCell>
                        <Badge variant={
                          movement.movementType === 'in' ? 'default' :
                          movement.movementType === 'out' ? 'destructive' : 'secondary'
                        }>
                          {movement.movementType?.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{movement.quantity}</TableCell>
                      <TableCell>{movement.reference || "N/A"}</TableCell>
                      <TableCell>{movement.userName || "N/A"}</TableCell>
                      <TableCell>{movement.notes || "N/A"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      );

    case 'user-activity':
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity Type</TableHead>
              <TableHead>Entity ID</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((activity) => (
              <TableRow key={activity.id}>
                <TableCell>{formatDate(activity.createdAt)}</TableCell>
                <TableCell className="font-medium">{activity.userName}</TableCell>
                <TableCell>
                  <Badge variant={
                    activity.action === 'CREATE' ? 'default' :
                    activity.action === 'UPDATE' ? 'secondary' :
                    activity.action === 'DELETE' ? 'destructive' : 'outline'
                  }>
                    {activity.action}
                  </Badge>
                </TableCell>
                <TableCell>{activity.entityType}</TableCell>
                <TableCell>{activity.entityId}</TableCell>
                <TableCell>{activity.details || "N/A"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );

    default:
      return <div className="text-center py-8 text-gray-500">No data available</div>;
  }
};

export default function ReportsView() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: "this-month",
    type: "inventory",
    category: "all",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    employee: "all",
  });

  const [isExporting, setIsExporting] = useState(false);

  // Fetch report data based on selected type and filters
  const { data: reportData, isLoading, error } = useQuery({
    queryKey: ['/api/reports/data', filters.type, filters.month, filters.year, filters.category, filters.employee],
    queryFn: async () => {
      const params = new URLSearchParams({
        type: filters.type,
        month: filters.month.toString(),
        year: filters.year.toString(),
        category: filters.category,
        employee: filters.employee,
      });
      
      const response = await authenticatedApiRequest('GET', `/api/reports/data?${params}`);
      return response.json();
    },
  });

  // Fetch categories for filter dropdown
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      try {
        const response = await authenticatedApiRequest('GET', '/api/categories');
        if (!response.ok) {
          throw new Error('Failed to fetch categories');
        }
        return response.json();
      } catch (error) {
        console.error('Categories fetch error:', error);
        return [];
      }
    },
  });

  // Fetch employees for attendance filter dropdown
  const { data: employees = [] } = useQuery({
    queryKey: ['/api/reports/employees'],
    queryFn: async () => {
      try {
        const response = await authenticatedApiRequest('GET', '/api/reports/employees');
        if (!response.ok) {
          throw new Error('Failed to fetch employees');
        }
        return response.json();
      } catch (error) {
        console.error('Employees fetch error:', error);
        return [];
      }
    },
  });

  const handleExport = async () => {
    if (isExporting) return;
    
    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        type: filters.type,
        month: filters.month.toString(),
        year: filters.year.toString(),
        category: filters.category,
        employee: filters.employee,
      });
      
      const response = await authenticatedApiRequest('GET', `/api/reports/export?${params}`);
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filters.type}_report_${filters.month}_${filters.year}.csv`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      toast({
        title: "Export Successful",
        description: `${getReportTitle(filters.type)} has been downloaded.`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "An error occurred while exporting the report.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const currentType = reportTypes.find(type => type.value === filters.type);
  const Icon = currentType?.icon || FileBarChart;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">Failed to load report data. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Icon className="h-6 w-6 text-amber-600" />
            <h2 className="text-2xl font-bold text-gray-900">Reports Dashboard</h2>
          </div>
          <Button 
            onClick={handleExport}
            disabled={isExporting}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "Exporting..." : "Export CSV"}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select 
              value={filters.type} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map((type) => {
                  const TypeIcon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <TypeIcon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Month</Label>
            <Select 
              value={filters.month.toString()} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, month: parseInt(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <SelectItem key={month} value={month.toString()}>
                    {new Date(0, month - 1).toLocaleString('default', { month: 'long' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Year</Label>
            <Select 
              value={filters.year.toString()} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, year: parseInt(value) }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(filters.type === 'inventory' || filters.type === 'sales') && (
            <div className="space-y-2">
              <Label>Category</Label>
              <Select 
                value={filters.category} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Array.isArray(categories) && categories.map((category: any) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {filters.type === 'attendance' && (
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select 
                value={filters.employee} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, employee: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {Array.isArray(employees) && employees.map((employee: any) => (
                    <SelectItem key={employee.id} value={employee.name}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Quick Filter</Label>
            <Select 
              value={filters.dateRange} 
              onValueChange={(value) => {
                const now = new Date();
                let month = now.getMonth() + 1;
                let year = now.getFullYear();
                
                if (value === 'last-month') {
                  month = month === 1 ? 12 : month - 1;
                  year = month === 12 ? year - 1 : year;
                }
                
                setFilters(prev => ({ ...prev, dateRange: value, month, year }));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this-month">This Month</SelectItem>
                <SelectItem value="last-month">Last Month</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            {getReportTitle(filters.type)} - {new Date(0, filters.month - 1).toLocaleString('default', { month: 'long' })} {filters.year}
          </h3>
          
          {reportData && renderStatsCards(reportData)}
          
          <div className="bg-gray-50 rounded-lg p-4">
            {reportData ? renderDetailedTable(filters.type, reportData.detailedData) : (
              <div className="text-center py-8 text-gray-500">No data available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}