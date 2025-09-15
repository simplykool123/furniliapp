import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package, CheckCircle2, Activity, Briefcase, Clock } from "lucide-react";
import { authService } from "@/lib/auth";

interface MaterialRequest {
  id: number;
  clientName: string;
  orderNumber: string;
  status: string;
  items: any[];
}

interface Product {
  id: number;
  name: string;
  brand?: string;
  category?: string;
  currentStock: number;
  unit: string;
}

interface StockWarning {
  productId: number;
  productName: string;
  requestedQuantity: number;
  availableStock: number;
  requestId: number;
  clientName: string;
  orderNumber: string;
}

export default function StockWarnings() {
  const user = authService.getUser();
  
  // Only show to store incharge and admins
  if (!user || !['admin', 'store_incharge'].includes(user.role)) {
    return null;
  }

  const { data: requests = [] } = useQuery<MaterialRequest[]>({
    queryKey: ["/api/requests"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  // Calculate stock warnings
  const stockWarnings: StockWarning[] = [];
  
  requests.forEach(request => {
    if (request.status === 'pending') {
      request.items?.forEach((item: any) => {
        const product = products.find(p => p.name === item.description);
        if (product && item.quantity > product.currentStock) {
          stockWarnings.push({
            productId: product.id,
            productName: product.name,
            requestedQuantity: item.quantity,
            availableStock: product.currentStock,
            requestId: request.id,
            clientName: request.clientName,
            orderNumber: request.orderNumber
          });
        }
      });
    }
  });

  // Always show both components in a grid layout
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Critical Stock Alerts */}
      {stockWarnings.length === 0 ? (
        <Card className="border-l-4 border-l-green-500 bg-green-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-green-900">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Stock Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6 text-green-700">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium">All stock levels are adequate</p>
              <p className="text-xs text-green-600 mt-1">No critical alerts at this time</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-l-4 border-l-amber-500 bg-amber-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Critical Stock Alerts
              <Badge variant="destructive" className="ml-auto">
                {stockWarnings.length}
              </Badge>
            </CardTitle>
            <CardDescription className="text-amber-700">
              Products requiring immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stockWarnings.slice(0, 3).map((warning, index) => (
                <div key={`${warning.requestId}-${warning.productId}`} className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <Package className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{warning.productName}</div>
                      <div className="text-sm text-gray-600">
                        Request #{warning.orderNumber} • {warning.clientName}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="destructive" className="mb-1">
                      Critical
                    </Badge>
                    <div className="text-sm text-gray-600">
                      {warning.requestedQuantity} needed
                    </div>
                    <div className="text-xs text-gray-500">
                      Stock: {warning.availableStock} • Min: {warning.availableStock < 10 ? warning.availableStock : 10}
                    </div>
                  </div>
                </div>
              ))}
              {stockWarnings.length > 3 && (
                <div className="text-center pt-2">
                  <Badge variant="outline" className="text-amber-700 border-amber-300">
                    +{stockWarnings.length - 3} more warnings
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity Feed - Always shown alongside */}
      <RecentActivityFeed />
    </div>
  );
}

// Recent Activity Feed Component
function RecentActivityFeed() {
  const { data: recentActivity = [] } = useQuery({
    queryKey: ['/api/dashboard/activity'],
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 3 * 60 * 1000, // 3 minutes
  });

  return (
    <Card className="border-l-4 border-l-blue-500 bg-blue-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <Activity className="h-5 w-5 text-blue-600" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {recentActivity && recentActivity.length > 0 ? (
            recentActivity.slice(0, 8).map((activity: any, index: number) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-blue-200 hover:border-blue-300 transition-colors">
                <div className="flex-shrink-0 mt-1">
                  {activity.description.includes('product') ? (
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <Package className="h-4 w-4 text-green-600" />
                    </div>
                  ) : activity.description.includes('project') ? (
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Briefcase className="h-4 w-4 text-blue-600" />
                    </div>
                  ) : activity.description.includes('request') ? (
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-orange-600" />
                    </div>
                  ) : activity.description.includes('stock') ? (
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <Activity className="h-4 w-4 text-gray-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 leading-tight">
                    {activity.description}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">
                      {activity.timestamp || '2 mins ago'}
                    </span>
                    {activity.entityType && (
                      <Badge variant="outline" className="text-xs">
                        {activity.entityType}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm">No recent activity</p>
            </div>
          )}
        </div>
        {recentActivity && recentActivity.length > 8 && (
          <div className="text-center pt-3 border-t border-blue-200 mt-3">
            <Badge variant="outline" className="text-blue-700 border-blue-300">
              +{recentActivity.length - 8} more activities
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}