import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  DollarSign,
  CheckCircle,
  ArrowRight,
  Users,
  BarChart3,
  Briefcase
} from "lucide-react";
import { Link } from "wouter";
import { useIsMobile, useMobileBreakpoint } from "./MobileOptimizer";

interface MobileDashboardProps {
  stats: any;
  tasks: any[];
  isLoading: boolean;
}

export default function MobileDashboard({ stats, tasks, isLoading }: MobileDashboardProps) {
  const isMobile = useIsMobile();
  const breakpoint = useMobileBreakpoint();
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'alerts'>('overview');

  if (!isMobile) {
    return null; // Use desktop dashboard
  }

  const quickStats = [
    {
      title: "Products",
      value: stats?.totalProducts || 0,
      icon: Package,
      color: "bg-blue-500",
      href: "/products"
    },
    {
      title: "Requests",
      value: stats?.pendingRequests || 0,
      icon: Clock,
      color: "bg-orange-500",
      href: "/requests"
    },
    {
      title: "Low Stock",
      value: stats?.lowStockItems || 0,
      icon: AlertTriangle,
      color: "bg-red-500",
      href: "/products"
    },
    {
      title: "Value",
      value: `₹${(stats?.totalValue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: "bg-green-500",
      href: "/reports"
    }
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'tasks', label: 'Tasks', icon: CheckCircle },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle }
  ];

  return (
    <div className="space-y-3 w-full max-w-full overflow-hidden">
      {/* Mobile Tabs */}
      <div className="flex bg-muted rounded-lg p-1 w-full">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span className={breakpoint === 'xs' ? 'hidden' : 'block'}>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Quick Stats Grid - Optimized for mobile */}
          <div className="grid grid-cols-2 gap-3 w-full">
            {quickStats.map((stat) => (
              <Link key={stat.title} href={stat.href} className="block">
                <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                  <CardContent className="p-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center flex-shrink-0`}>
                        <stat.icon className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          {stat.title}
                        </p>
                        <p className="text-sm font-bold truncate">
                          {stat.value}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Recent Requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(stats?.recentRequests || []).slice(0, 3).map((request: any) => (
                <div key={request.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {request.clientName || 'Unknown Client'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {request.requestCount} items • {request.status}
                    </p>
                  </div>
                  <Badge variant={request.status === 'pending' ? 'destructive' : 'secondary'}>
                    {request.status}
                  </Badge>
                </div>
              ))}
              
              <Link href="/requests">
                <Button variant="ghost" className="w-full text-sm">
                  View All Requests
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {tasks.slice(0, 10).map((task: any) => (
                <Card key={task.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-medium mb-1 line-clamp-2">
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center space-x-2">
                          <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                            {task.priority}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {task.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
          
          <Link href="/tasks">
            <Button className="w-full">
              View All Tasks
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {/* Low Stock Alerts */}
          {stats?.lowStockProducts?.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                  Low Stock Alert
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.lowStockProducts.slice(0, 5).map((product: any) => (
                  <div key={product.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Stock: {product.currentStock} {product.unit}
                      </p>
                    </div>
                    <Badge variant="destructive">
                      Low
                    </Badge>
                  </div>
                ))}
                
                <Link href="/products">
                  <Button variant="outline" className="w-full text-sm">
                    Manage Stock
                    <Package className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Pending Requests Alert */}
          {stats?.pendingRequests > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Clock className="h-5 w-5 text-orange-500 mr-2" />
                  Pending Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  You have {stats.pendingRequests} pending material requests that need attention.
                </p>
                <Link href="/requests">
                  <Button className="w-full">
                    Review Requests
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* No Alerts */}
          {(!stats?.lowStockProducts?.length && !stats?.pendingRequests) && (
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <h3 className="font-medium mb-1">All Clear!</h3>
                <p className="text-sm text-muted-foreground">
                  No alerts at this time. Everything looks good.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/requests/new">
              <Button variant="outline" className="w-full h-16 flex flex-col">
                <Package className="h-5 w-5 mb-1" />
                <span className="text-xs">New Request</span>
              </Button>
            </Link>
            <Link href="/products">
              <Button variant="outline" className="w-full h-16 flex flex-col">
                <TrendingUp className="h-5 w-5 mb-1" />
                <span className="text-xs">Check Stock</span>
              </Button>
            </Link>
            <Link href="/attendance">
              <Button variant="outline" className="w-full h-16 flex flex-col">
                <Users className="h-5 w-5 mb-1" />
                <span className="text-xs">Attendance</span>
              </Button>
            </Link>
            <Link href="/projects">
              <Button variant="outline" className="w-full h-16 flex flex-col">
                <Briefcase className="h-5 w-5 mb-1" />
                <span className="text-xs">Projects</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}