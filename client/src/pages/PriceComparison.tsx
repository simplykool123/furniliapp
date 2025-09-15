import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { authenticatedApiRequest } from "@/lib/auth";
import { Plus, TrendingDown, TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";

export default function PriceComparison() {
  const { toast } = useToast();
  const [isAddingComparison, setIsAddingComparison] = useState(false);
  const [comparisonForm, setComparisonForm] = useState({
    productId: "",
    supplier1Name: "",
    supplier1Price: "",
    supplier1Contact: "",
    supplier2Name: "",
    supplier2Price: "",
    supplier2Contact: "",
    supplier3Name: "",
    supplier3Price: "",
    supplier3Contact: "",
  });

  const { data: comparisons, isLoading } = useQuery({
    queryKey: ["/api/price-comparisons"],
  });

  const { data: products } = useQuery({
    queryKey: ["/api/products"],
  });

  const addComparisonMutation = useMutation({
    mutationFn: async (data: any) => {
      return authenticatedApiRequest("POST", "/api/price-comparisons", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/price-comparisons"] });
      setIsAddingComparison(false);
      setComparisonForm({
        productId: "",
        supplier1Name: "",
        supplier1Price: "",
        supplier1Contact: "",
        supplier2Name: "",
        supplier2Price: "",
        supplier2Contact: "",
        supplier3Name: "",
        supplier3Price: "",
        supplier3Contact: "",
      });
      toast({
        title: "Price comparison added",
        description: "The price comparison has been saved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add comparison",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!comparisonForm.productId || !comparisonForm.supplier1Name || !comparisonForm.supplier1Price) {
      toast({
        title: "Missing information",
        description: "Please fill in at least product and one supplier.",
        variant: "destructive",
      });
      return;
    }

    // Process suppliers data
    const suppliers = [];
    
    if (comparisonForm.supplier1Name && comparisonForm.supplier1Price) {
      suppliers.push({
        name: comparisonForm.supplier1Name,
        price: parseFloat(comparisonForm.supplier1Price),
        contact: comparisonForm.supplier1Contact,
      });
    }
    
    if (comparisonForm.supplier2Name && comparisonForm.supplier2Price) {
      suppliers.push({
        name: comparisonForm.supplier2Name,
        price: parseFloat(comparisonForm.supplier2Price),
        contact: comparisonForm.supplier2Contact,
      });
    }
    
    if (comparisonForm.supplier3Name && comparisonForm.supplier3Price) {
      suppliers.push({
        name: comparisonForm.supplier3Name,
        price: parseFloat(comparisonForm.supplier3Price),
        contact: comparisonForm.supplier3Contact,
      });
    }

    addComparisonMutation.mutate({
      productId: parseInt(comparisonForm.productId),
      suppliers,
    });
  };

  const getBestPrice = (comparison: any) => {
    const prices = comparison.suppliers?.map((s: any) => s.price) || [];
    return Math.min(...prices);
  };

  const getWorstPrice = (comparison: any) => {
    const prices = comparison.suppliers?.map((s: any) => s.price) || [];
    return Math.max(...prices);
  };

  const getSavingsPercentage = (comparison: any) => {
    const best = getBestPrice(comparison);
    const worst = getWorstPrice(comparison);
    if (worst === 0) return 0;
    return ((worst - best) / worst * 100).toFixed(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  const totalSavings = comparisons?.reduce((sum: number, comp: any) => {
    const best = getBestPrice(comp);
    const worst = getWorstPrice(comp);
    return sum + (worst - best);
  }, 0) || 0;

  return (
    <ResponsiveLayout
      title="Price Comparison"
      subtitle="Compare supplier prices and find the best deals"
    >
      <div className="space-y-6">
        <div className="flex justify-between items-center">
        <Dialog open={isAddingComparison} onOpenChange={setIsAddingComparison}>
          <DialogTrigger asChild>
            <Button className="bg-amber-600 hover:bg-amber-700">
              <Plus className="mr-2 h-4 w-4" />
              Add Comparison
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Price Comparison</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="productId">Product *</Label>
                <Select 
                  value={comparisonForm.productId}
                  onValueChange={(value) => setComparisonForm(prev => ({ ...prev, productId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map((product: any) => (
                      <SelectItem key={product.id} value={product.id.toString()}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Supplier 1 */}
              <div className="border p-4 rounded-lg space-y-3">
                <h3 className="font-semibold text-gray-700">Supplier 1 *</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="supplier1Name">Supplier Name</Label>
                    <Input
                      id="supplier1Name"
                      value={comparisonForm.supplier1Name}
                      onChange={(e) => setComparisonForm(prev => ({ ...prev, supplier1Name: e.target.value }))}
                      placeholder="Supplier name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="supplier1Price">Price</Label>
                    <Input
                      id="supplier1Price"
                      type="number"
                      step="0.01"
                      value={comparisonForm.supplier1Price}
                      onChange={(e) => setComparisonForm(prev => ({ ...prev, supplier1Price: e.target.value }))}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="supplier1Contact">Contact</Label>
                  <Input
                    id="supplier1Contact"
                    value={comparisonForm.supplier1Contact}
                    onChange={(e) => setComparisonForm(prev => ({ ...prev, supplier1Contact: e.target.value }))}
                    placeholder="Phone or email"
                  />
                </div>
              </div>

              {/* Supplier 2 */}
              <div className="border p-4 rounded-lg space-y-3">
                <h3 className="font-semibold text-gray-700">Supplier 2</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="supplier2Name">Supplier Name</Label>
                    <Input
                      id="supplier2Name"
                      value={comparisonForm.supplier2Name}
                      onChange={(e) => setComparisonForm(prev => ({ ...prev, supplier2Name: e.target.value }))}
                      placeholder="Supplier name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="supplier2Price">Price</Label>
                    <Input
                      id="supplier2Price"
                      type="number"
                      step="0.01"
                      value={comparisonForm.supplier2Price}
                      onChange={(e) => setComparisonForm(prev => ({ ...prev, supplier2Price: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="supplier2Contact">Contact</Label>
                  <Input
                    id="supplier2Contact"
                    value={comparisonForm.supplier2Contact}
                    onChange={(e) => setComparisonForm(prev => ({ ...prev, supplier2Contact: e.target.value }))}
                    placeholder="Phone or email"
                  />
                </div>
              </div>

              {/* Supplier 3 */}
              <div className="border p-4 rounded-lg space-y-3">
                <h3 className="font-semibold text-gray-700">Supplier 3</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="supplier3Name">Supplier Name</Label>
                    <Input
                      id="supplier3Name"
                      value={comparisonForm.supplier3Name}
                      onChange={(e) => setComparisonForm(prev => ({ ...prev, supplier3Name: e.target.value }))}
                      placeholder="Supplier name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="supplier3Price">Price</Label>
                    <Input
                      id="supplier3Price"
                      type="number"
                      step="0.01"
                      value={comparisonForm.supplier3Price}
                      onChange={(e) => setComparisonForm(prev => ({ ...prev, supplier3Price: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="supplier3Contact">Contact</Label>
                  <Input
                    id="supplier3Contact"
                    value={comparisonForm.supplier3Contact}
                    onChange={(e) => setComparisonForm(prev => ({ ...prev, supplier3Contact: e.target.value }))}
                    placeholder="Phone or email"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddingComparison(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addComparisonMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {addComparisonMutation.isPending ? "Saving..." : "Save Comparison"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Comparisons</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{comparisons?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Products compared
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Potential Savings</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalSavings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              By choosing best prices
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Savings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {comparisons?.length ? ((totalSavings / comparisons.length).toFixed(0)) : "0"}%
            </div>
            <p className="text-xs text-muted-foreground">
              Average savings percentage
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Deals</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {comparisons?.filter((c: any) => parseFloat(getSavingsPercentage(c)) > 10).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Over 10% savings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Price Comparisons Table */}
      <Card>
        <CardHeader>
          <CardTitle>Price Comparisons</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Suppliers</TableHead>
                <TableHead>Best Price</TableHead>
                <TableHead>Highest Price</TableHead>
                <TableHead>Potential Savings</TableHead>
                <TableHead>Date Added</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisons?.map((comparison: any) => {
                const bestPrice = getBestPrice(comparison);
                const worstPrice = getWorstPrice(comparison);
                const savingsPercent = getSavingsPercentage(comparison);
                const bestSupplier = comparison.suppliers?.find((s: any) => s.price === bestPrice);

                return (
                  <TableRow key={comparison.id}>
                    <TableCell className="font-medium">
                      {comparison.productName || `Product ${comparison.productId}`}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {comparison.suppliers?.map((supplier: any, index: number) => (
                          <div key={index} className="text-sm">
                            <span className="font-medium">{supplier.name}</span>
                            <span className="text-gray-500 ml-2">₹{supplier.price.toLocaleString()}</span>
                            {supplier.price === bestPrice && (
                              <Badge variant="secondary" className="ml-2 text-xs">Best</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-green-600">
                        ₹{bestPrice.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {bestSupplier?.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-red-600">
                        ₹{worstPrice.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
                        <span className="font-semibold text-green-600">
                          {savingsPercent}%
                        </span>
                        <div className="text-xs text-gray-500 ml-2">
                          (₹{(worstPrice - bestPrice).toLocaleString()})
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(comparison.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </div>
    </ResponsiveLayout>
  );
}