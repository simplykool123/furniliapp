import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, FileText, Factory, CheckCircle, AlertTriangle, Play } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ProjectWorkOrdersProps {
  projectId: number;
}

interface WorkOrder {
  id: number;
  orderNumber: string;
  title: string;
  description: string;
  status: 'pending' | 'planned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  orderType: 'manufacturing' | 'assembly' | 'finishing' | 'packaging';
  totalQuantity: number;
  specifications: string;
  estimatedStartDate: string;
  estimatedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  createdAt: string;
  project?: {
    id: number;
    name: string;
    code: string;
  };
  client?: {
    id: number;
    name: string;
  };
  quote?: {
    id: number;
    quoteNumber: string;
    title: string;
  };
  createdByUser?: {
    id: number;
    name: string;
  };
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  planned: 'bg-blue-100 text-blue-800', 
  in_progress: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800'
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-red-100 text-red-800'
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending': return <Clock className="h-4 w-4" />;
    case 'planned': return <Calendar className="h-4 w-4" />;
    case 'in_progress': return <Play className="h-4 w-4" />;
    case 'completed': return <CheckCircle className="h-4 w-4" />;
    case 'cancelled': return <AlertTriangle className="h-4 w-4" />;
    default: return <Factory className="h-4 w-4" />;
  }
};

export default function ProjectWorkOrders({ projectId }: ProjectWorkOrdersProps) {
  const { data: workOrders = [], isLoading } = useQuery<WorkOrder[]>({
    queryKey: ['/api/work-orders', { projectId }],
    queryFn: () => apiRequest(`/api/work-orders?projectId=${projectId}`),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="flex space-x-2">
                <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                <div className="h-6 bg-gray-200 rounded-full w-16"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (workOrders.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Factory className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Work Orders Yet</h3>
          <p className="text-gray-600 mb-4">
            Work orders will appear here once quotes are approved for production.
          </p>
          <p className="text-sm text-gray-500">
            Approve a quote to automatically create a work order and start the production process.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {workOrders.map((workOrder) => (
        <Card key={workOrder.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(workOrder.status)}
                  <CardTitle className="text-lg">{workOrder.orderNumber}</CardTitle>
                </div>
                <h4 className="text-sm font-medium text-gray-800">{workOrder.title}</h4>
              </div>
              <div className="flex space-x-2">
                <Badge className={`${statusColors[workOrder.status]} text-xs`}>
                  {workOrder.status.replace('_', ' ')}
                </Badge>
                <Badge className={`${priorityColors[workOrder.priority]} text-xs`}>
                  {workOrder.priority}
                </Badge>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="space-y-3">
              {workOrder.description && (
                <p className="text-sm text-gray-600">{workOrder.description}</p>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Factory className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium capitalize">{workOrder.orderType}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Quantity:</span>
                  <span className="font-medium">{workOrder.totalQuantity}</span>
                </div>
                
                {workOrder.quote && (
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Quote:</span>
                    <span className="font-medium">{workOrder.quote.quoteNumber}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Estimated Start:</span>
                  <p className="font-medium">
                    {new Date(workOrder.estimatedStartDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Estimated End:</span>
                  <p className="font-medium">
                    {new Date(workOrder.estimatedEndDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {workOrder.actualStartDate && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Actual Start:</span>
                    <p className="font-medium text-green-600">
                      {new Date(workOrder.actualStartDate).toLocaleDateString()}
                    </p>
                  </div>
                  {workOrder.actualEndDate && (
                    <div>
                      <span className="text-gray-600">Actual End:</span>
                      <p className="font-medium text-green-600">
                        {new Date(workOrder.actualEndDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {workOrder.specifications && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <span className="text-sm font-medium text-gray-700">Specifications:</span>
                  <p className="text-sm text-gray-600 mt-1">{workOrder.specifications}</p>
                </div>
              )}
              
              <div className="flex justify-between items-center pt-2 border-t">
                <div className="text-xs text-gray-500">
                  Created {new Date(workOrder.createdAt).toLocaleDateString()} 
                  {workOrder.createdByUser && ` by ${workOrder.createdByUser.name}`}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`/production/work-orders/${workOrder.id}`, '_blank')}
                >
                  View Details
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}