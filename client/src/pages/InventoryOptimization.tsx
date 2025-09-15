import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Package, 
  Calendar,
  BarChart3,
  RefreshCw,
  Download,
  Trash2,
  DollarSign,
  Clock
} from "lucide-react";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";

interface OptimizationData {
  reorderPoints: any[];
  deadStock: any[];
  seasonalForecast: any[];
  summary: {
    totalProducts: number;
    criticalItems: number;
    lowStockItems: number;
    deadStockItems: number;
    deadStockValue: number;
    highDemandItems: number;
  };
}

export default function InventoryOptimization() {
  const [activeTab, setActiveTab] = useState("reorder");
  const { toast } = useToast();

  // Fetch optimization data
  const { data: optimizationData, isLoading, refetch } = useQuery<OptimizationData>({
    queryKey: ["/api/inventory/optimization"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const refreshMutation = useMutation({
    mutationFn: () => refetch(),
    onSuccess: () => {
      toast({
        title: "Data refreshed",
        description: "Inventory optimization data has been updated.",
      });
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'destructive';
      case 'low': return 'secondary';
      case 'dead': return 'outline';
      default: return 'default';
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'liquidate': return 'destructive';
      case 'discount': return 'secondary';
      case 'return': return 'outline';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <ResponsiveLayout
        title="Inventory Optimization"
        subtitle="Intelligent inventory management and forecasting"
      >
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-furnili-brown" />
        </div>
      </ResponsiveLayout>
    );
  }

  const { reorderPoints = [], deadStock = [], seasonalForecast = [], summary } = optimizationData || {};

  return (
    <ResponsiveLayout
      title="Inventory Optimization"
      subtitle="AI-powered inventory management and demand forecasting"
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-xs text-gray-600">Total Products</p>
                <p className="text-lg font-semibold">{summary?.totalProducts || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-xs text-gray-600">Critical Items</p>
                <p className="text-lg font-semibold text-red-600">{summary?.criticalItems || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingDown className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-xs text-gray-600">Low Stock</p>
                <p className="text-lg font-semibold text-orange-600">{summary?.lowStockItems || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Trash2 className="h-4 w-4 text-gray-600" />
              <div>
                <p className="text-xs text-gray-600">Dead Stock</p>
                <p className="text-lg font-semibold">{summary?.deadStockItems || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-xs text-gray-600">Dead Stock Value</p>
                <p className="text-lg font-semibold">₹{summary?.deadStockValue?.toLocaleString() || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-xs text-gray-600">High Demand</p>
                <p className="text-lg font-semibold text-green-600">{summary?.highDemandItems || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-6">
        <Button 
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
          Refresh Analysis
        </Button>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="reorder">Reorder Points</TabsTrigger>
          <TabsTrigger value="deadstock">Dead Stock</TabsTrigger>
          <TabsTrigger value="forecast">Seasonal Forecast</TabsTrigger>
        </TabsList>

        <TabsContent value="reorder">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Optimal Reorder Points</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Recommended Reorder</TableHead>
                      <TableHead>Order Quantity</TableHead>
                      <TableHead>Daily Usage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Movement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reorderPoints.map((item) => (
                      <TableRow key={item.productId}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>
                          <span className={item.currentStock <= item.recommendedReorderPoint ? 'text-red-600 font-semibold' : ''}>
                            {item.currentStock}
                          </span>
                        </TableCell>
                        <TableCell>{item.recommendedReorderPoint}</TableCell>
                        <TableCell>{item.recommendedOrderQuantity}</TableCell>
                        <TableCell>{item.avgDailyUsage.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(item.stockStatus)}>
                            {item.stockStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.lastMovement 
                            ? new Date(item.lastMovement).toLocaleDateString()
                            : 'Never'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deadstock">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trash2 className="h-5 w-5" />
                <span>Dead Stock Analysis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Stock Quantity</TableHead>
                      <TableHead>Stock Value</TableHead>
                      <TableHead>Last Movement</TableHead>
                      <TableHead>Days Stagnant</TableHead>
                      <TableHead>Recommendation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deadStock.map((item) => (
                      <TableRow key={item.productId}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.currentStock}</TableCell>
                        <TableCell>₹{item.stockValue.toLocaleString()}</TableCell>
                        <TableCell>
                          {item.lastMovementDate 
                            ? new Date(item.lastMovementDate).toLocaleDateString()
                            : 'Never'
                          }
                        </TableCell>
                        <TableCell>{item.daysSinceLastMovement}</TableCell>
                        <TableCell>
                          <Badge variant={getRecommendationColor(item.recommendation)}>
                            {item.recommendation}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Seasonal Demand Forecast</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Historical Usage</TableHead>
                      <TableHead>Daily Average</TableHead>
                      <TableHead>Seasonal Factor</TableHead>
                      <TableHead>Forecasted Demand</TableHead>
                      <TableHead>Demand Trend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {seasonalForecast.map((item) => (
                      <TableRow key={item.productId}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell>{item.totalUsage}</TableCell>
                        <TableCell>{item.avgDailyUsage}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span>{item.seasonalMultiplier}x</span>
                            {item.seasonalMultiplier > 1 ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : item.seasonalMultiplier < 1 ? (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {item.forecastedDemand}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Progress 
                              value={Math.min((item.forecastedDemand / 200) * 100, 100)} 
                              className="w-16 h-2" 
                            />
                            <span className="text-xs text-gray-600">
                              {item.forecastedDemand > 100 ? 'High' : item.forecastedDemand > 50 ? 'Medium' : 'Low'}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </ResponsiveLayout>
  );
}