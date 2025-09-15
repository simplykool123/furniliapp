import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Grid3X3, List, Share, FileDown, MessageCircle } from "lucide-react";
import type { Category } from "@shared/schema";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";

interface Product {
  id: number;
  name: string;
  category: string;
  brand: string;
  size: string;
  thickness: string;
  sku: string;
  pricePerUnit: number;
  currentStock: number;
  minStock: number;
  unit: string;
  imageUrl?: string;
  stockStatus: 'in-stock' | 'low-stock' | 'out-of-stock';
}

interface GroupedProduct {
  name: string;
  category: string;
  products: Product[];
  lowestPrice: number;
  highestPrice: number;
}

export default function ProductComparison() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');

  // Fetch products and categories
  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  // Group products by category and name
  const groupedProducts = useMemo(() => {
    let filtered = products;

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Group products by category and name
    const groups: { [key: string]: GroupedProduct } = {};
    
    filtered.forEach(product => {
      const key = `${product.category}-${product.name}`;
      if (!groups[key]) {
        groups[key] = {
          name: product.name,
          category: product.category,
          products: [],
          lowestPrice: Infinity,
          highestPrice: 0
        };
      }
      
      groups[key].products.push(product);
      groups[key].lowestPrice = Math.min(groups[key].lowestPrice, product.pricePerUnit);
      groups[key].highestPrice = Math.max(groups[key].highestPrice, product.pricePerUnit);
    });

    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [products, selectedCategory, searchTerm]);

  const getPriceBadge = (product: Product, lowestPrice: number) => {
    if (product.stockStatus === 'out-of-stock') {
      return <Badge variant="destructive" className="text-xs">Out of Stock</Badge>;
    }
    if (product.pricePerUnit === lowestPrice) {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">Lowest Price</Badge>;
    }
    return null;
  };

  const exportToWhatsApp = () => {
    let message = "*Product Comparison Report*\n\n";
    
    groupedProducts.forEach(group => {
      message += `*${group.name}* (${group.category})\n`;
      group.products.forEach(product => {
        const status = product.stockStatus === 'out-of-stock' ? ' ❌ Out of Stock' : 
                      product.pricePerUnit === group.lowestPrice ? ' ✅ Lowest Price' : '';
        message += `• ${product.brand} - ₹${product.pricePerUnit} ${status}\n`;
      });
      message += "\n";
    });
    
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  };

  const exportToPDF = async () => {
    // Dynamic import to avoid SSR issues
    const html2pdf = (await import('html2pdf.js' as any)).default;
    
    const element = document.getElementById('comparison-content');
    const opt = {
      margin: 1,
      filename: 'product-comparison.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save();
  };

  const ProductCard = ({ group }: { group: GroupedProduct }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg text-amber-900">{group.name}</CardTitle>
            <p className="text-sm text-gray-600">{group.category}</p>
          </div>
          <Badge variant="outline" className="text-xs">
            {group.products.length} variants
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {group.products
            .sort((a, b) => a.pricePerUnit - b.pricePerUnit)
            .map(product => (
            <div key={product.id} className={`p-3 rounded-lg border ${
              product.stockStatus === 'out-of-stock' ? 'bg-gray-50 opacity-60' : 'bg-white'
            }`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-medium text-amber-900">{product.brand}</h4>
                  <p className="text-sm text-gray-600">
                    {product.size} {product.thickness && `• ${product.thickness}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">₹{product.pricePerUnit}</p>
                  <p className="text-xs text-gray-500">per {product.unit}</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex gap-1">
                  {getPriceBadge(product, group.lowestPrice)}
                </div>
                <p className="text-xs text-gray-500">
                  Stock: {product.currentStock} {product.unit}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const ListView = () => (
    <div className="space-y-4">
      {groupedProducts.map(group => (
        <ProductCard key={`${group.category}-${group.name}`} group={group} />
      ))}
    </div>
  );

  const GridView = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {groupedProducts.map(group => (
        <ProductCard key={`${group.category}-${group.name}`} group={group} />
      ))}
    </div>
  );

  if (productsLoading) {
    return (
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-48 bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <ResponsiveLayout
      title="Compare Material"
      subtitle="Compare materials by category and find the best prices"
    >
      <div className="space-y-6" id="comparison-content">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
          </div>
        <div className="flex gap-2">
          <Button onClick={exportToWhatsApp} variant="outline" className="border-green-200 text-green-700 hover:bg-green-50">
            <MessageCircle className="h-4 w-4 mr-2" />
            WhatsApp
          </Button>
          <Button onClick={exportToPDF} variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
            <FileDown className="h-4 w-4 mr-2" />
            PDF Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search products or brands..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.filter(category => category.name && category.name.trim() !== '').map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-9 px-3"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-9 px-3"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">
            Comparison Results ({groupedProducts.length} product groups)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {groupedProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No products found matching your criteria.</p>
            </div>
          ) : (
            viewMode === 'grid' ? <GridView /> : <ListView />
          )}
        </CardContent>
      </Card>
      </div>
    </ResponsiveLayout>
  );
}