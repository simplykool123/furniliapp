import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, AlertTriangle, Camera, Plus, Search } from "lucide-react";
import { format } from "date-fns";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";
import type { QualityCheckWithDetails } from "@shared/schema";

interface QualityStats {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  pendingChecks: number;
  passRate: number;
}

export default function QualityControl() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: qualityChecks, isLoading } = useQuery<QualityCheckWithDetails[]>({
    queryKey: ['/api/quality-checks', { search: searchTerm, status: statusFilter, type: typeFilter }],
  });

  const { data: stats } = useQuery<QualityStats>({
    queryKey: ['/api/quality-checks/stats'],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-500 text-white';
      case 'failed': return 'bg-red-500 text-white';
      case 'conditional_pass': return 'bg-orange-500 text-white';
      case 'pending': return 'bg-yellow-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      case 'conditional_pass': return <AlertTriangle className="h-4 w-4" />;
      case 'pending': return <AlertTriangle className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const filteredChecks = qualityChecks?.filter(check => {
    const matchesSearch = searchTerm === "" || 
      check.checkNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      check.workOrder.orderNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || check.overallStatus === statusFilter;
    const matchesType = typeFilter === "all" || check.checkType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  if (isLoading) {
    return (
      <ResponsiveLayout title="Quality Control" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout
      title="Quality Control"
      subtitle="Inspection workflows and quality assurance management"
      showAddButton={true}
      onAddClick={() => {/* TODO: Implement add quality check */}}
    >
      {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Checks</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total-checks">
                {stats?.totalChecks || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Passed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="stat-passed-checks">
                {stats?.passedChecks || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="stat-failed-checks">
                {stats?.failedChecks || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600" data-testid="stat-pending-checks">
                {stats?.pendingChecks || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-pass-rate">
                {stats?.passRate || 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="checks" className="space-y-4">
          <TabsList>
            <TabsTrigger value="checks">Quality Checks</TabsTrigger>
            <TabsTrigger value="checklists">Inspection Checklists</TabsTrigger>
            <TabsTrigger value="defects">Defect Tracking</TabsTrigger>
            <TabsTrigger value="analytics">Quality Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="checks" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search quality checks..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-checks"
                    />
                  </div>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger data-testid="select-status-filter">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="passed">Passed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="conditional_pass">Conditional Pass</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger data-testid="select-type-filter">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="incoming">Incoming</SelectItem>
                      <SelectItem value="in_process">In Process</SelectItem>
                      <SelectItem value="final">Final</SelectItem>
                      <SelectItem value="customer_inspection">Customer Inspection</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" className="w-full">
                    Export Report
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quality Checks Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Quality Checks</CardTitle>
                    <CardDescription>
                      {filteredChecks?.length || 0} quality checks found
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Check Number</TableHead>
                        <TableHead>Work Order</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Inspected By</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredChecks?.map((check) => (
                        <TableRow key={check.id} data-testid={`quality-check-row-${check.id}`}>
                          <TableCell className="font-medium">
                            {check.checkNumber}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{check.workOrder.orderNumber}</div>
                              <div className="text-sm text-muted-foreground">
                                {check.workOrder.title}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="capitalize">{check.checkType.replace('_', ' ')}</span>
                          </TableCell>
                          <TableCell>
                            <span className="capitalize">{check.inspectionStage.replace('_', ' ')}</span>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(check.overallStatus)}>
                              <span className="flex items-center gap-1">
                                {getStatusIcon(check.overallStatus)}
                                {check.overallStatus.replace('_', ' ')}
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm">{check.inspectedByUser.name}</div>
                              {check.approvedByUser && (
                                <div className="text-xs text-muted-foreground">
                                  Approved by {check.approvedByUser.name}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm">
                                {check.inspectionDate ? format(new Date(check.inspectionDate), 'MMM dd, yyyy') : 'N/A'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {check.inspectionDate ? format(new Date(check.inspectionDate), 'hh:mm a') : 'N/A'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                data-testid={`button-view-check-${check.id}`}
                              >
                                View
                              </Button>
                              {check.photoUrls && check.photoUrls.length > 0 && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  data-testid={`button-photos-${check.id}`}
                                >
                                  <Camera className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )) || (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            <div className="space-y-2">
                              <CheckCircle className="mx-auto h-8 w-8 text-muted-foreground" />
                              <p className="text-muted-foreground">
                                No quality checks found. Create your first quality check to get started.
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="checklists" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Inspection Checklists</CardTitle>
                <CardDescription>
                  Pre-defined quality inspection checklists for different furniture types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Inspection checklists management coming soon...
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="defects" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Defect Tracking</CardTitle>
                <CardDescription>
                  Track and analyze quality defects across production
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Defect tracking dashboard coming soon...
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quality Analytics</CardTitle>
                <CardDescription>
                  Quality metrics, trends, and performance analytics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Quality analytics dashboard coming soon...
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </ResponsiveLayout>
  );
}