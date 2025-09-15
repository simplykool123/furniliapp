import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Settings, DollarSign, Package, Link, Filter, Search, Home, Bed, Archive, Package as Cabinet, PanelTop, Table2, Sofa, Edit3, Save, X } from 'lucide-react';
import ResponsiveLayout from '@/components/Layout/ResponsiveLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

// Get default prices from DEFAULT_RATES (replicated from backend)
const DEFAULT_RATES = {
  board: {
    "18mm_plywood": 147,
    "12mm_plywood": 120, 
    "6mm_plywood": 95,
    "25mm_plywood": 190,
    "18mm_mdf": 110,
    "12mm_mdf": 85,
    "6mm_mdf": 65,
    "18mm_particle_board": 80,
    "12mm_particle_board": 60,
    "pre_lam_particle_board": 95,
    "teak": 450,
    "oak": 380,
    "sheesham": 320,
    "mango_wood": 280,
  },
  laminate: {
    "outer_laminate": 210,
    "inner_laminate": 150,
    "acrylic_finish": 380,
    "veneer_finish": 320,
    "paint_finish": 180,
    "pu_finish": 450,
    "glass_finish": 520,
    "membrane_foil": 95,
  },
  edge_banding: {
    "2mm": 8,
    "0.8mm": 4,
    "1mm": 5,
    "3mm": 12,
  },
  hardware: {
    "soft_close_hinge": 90,
    "normal_hinge": 30,
    "concealed_hinge": 60,
    "piano_hinge": 45,
    "drawer_slide_soft_close": 180,
    "drawer_slide_normal": 120,
    "ball_bearing_slide": 150,
    "telescopic_slide": 200,
    "ss_handle": 180,
    "aluminium_handle": 120,
    "brass_handle": 250,
    "plastic_handle": 45,
    "door_lock": 80,
    "cam_lock": 25,
    "magnetic_lock": 65,
    "minifix": 15,
    "dowel": 3,
    "screw_pack": 120,
    "wall_bracket": 50,
    "shelf_support": 8,
    "drawer_organizer": 350,
    "pull_out_basket": 850,
    "lazy_susan": 1200,
    "soft_close_mechanism": 450,
    "hinge": 60,
    "handle": 120,
    "lock": 80,
    "drawer_slide": 150,
    "straightener": 150,
  }
};

// Furniture-specific material mapping
const FURNITURE_MATERIALS = {
  wardrobe: {
    name: "Wardrobes & Closets",
    icon: Home,
    materials: [
      { type: '18mm_plywood', name: '18mm Plywood', category: 'board' },
      { type: '6mm_plywood', name: '6mm Plywood', category: 'board' },
      { type: '18mm_mdf', name: '18mm MDF', category: 'board' },
      { type: '18mm_particle_board', name: '18mm Particle Board', category: 'board' },
      { type: 'pre_lam_particle_board', name: 'Pre-Lam Particle Board', category: 'board' },
      { type: 'soft_close_hinge', name: 'Soft Close Hinge', category: 'hardware' },
      { type: 'normal_hinge', name: 'Normal Hinge', category: 'hardware' },
      { type: 'drawer_slide_soft_close', name: 'Soft Close Drawer Slide', category: 'hardware' },
      { type: 'ss_handle', name: 'SS Handle', category: 'hardware' },
      { type: 'aluminium_handle', name: 'Aluminium Handle', category: 'hardware' },
      { type: 'minifix', name: 'Minifix', category: 'hardware' },
      { type: 'dowel', name: 'Dowel', category: 'hardware' },
      { type: 'door_lock', name: 'Door Lock', category: 'hardware' },
      { type: 'outer_laminate', name: 'Outer Laminate', category: 'laminate' },
      { type: 'inner_laminate', name: 'Inner Laminate', category: 'laminate' },
      { type: 'acrylic_finish', name: 'Acrylic Finish', category: 'laminate' },
      { type: 'veneer_finish', name: 'Veneer Finish', category: 'laminate' },
      { type: '2mm', name: '2mm Edge Banding', category: 'edge_banding' },
      { type: '0.8mm', name: '0.8mm Edge Banding', category: 'edge_banding' },
    ]
  },
  bed: {
    name: "Beds & Storage Beds",
    icon: Bed,
    materials: [
      { type: '18mm_plywood', name: '18mm Plywood', category: 'board' },
      { type: '18mm_mdf', name: '18mm MDF', category: 'board' },
      { type: 'drawer_slide_soft_close', name: 'Soft Close Drawer Slide', category: 'hardware' },
      { type: 'ss_handle', name: 'SS Handle', category: 'hardware' },
      { type: 'minifix', name: 'Minifix', category: 'hardware' },
      { type: 'dowel', name: 'Dowel', category: 'hardware' },
      { type: 'outer_laminate', name: 'Outer Laminate', category: 'laminate' },
      { type: '2mm', name: '2mm Edge Banding', category: 'edge_banding' },
    ]
  },
  kitchen_cabinet: {
    name: "Kitchen Cabinets",
    icon: Cabinet,
    materials: [
      { type: '18mm_plywood', name: '18mm Plywood', category: 'board' },
      { type: '6mm_plywood', name: '6mm Plywood', category: 'board' },
      { type: 'soft_close_hinge', name: 'Soft Close Hinge', category: 'hardware' },
      { type: 'drawer_slide_soft_close', name: 'Soft Close Drawer Slide', category: 'hardware' },
      { type: 'aluminium_handle', name: 'Aluminium Handle', category: 'hardware' },
      { type: 'minifix', name: 'Minifix', category: 'hardware' },
      { type: 'outer_laminate', name: 'Outer Laminate', category: 'laminate' },
      { type: 'inner_laminate', name: 'Inner Laminate', category: 'laminate' },
      { type: '2mm', name: '2mm Edge Banding', category: 'edge_banding' },
      { type: '0.8mm', name: '0.8mm Edge Banding', category: 'edge_banding' },
    ]
  },
  tv_unit: {
    name: "TV Units & Entertainment",
    icon: PanelTop,
    materials: [
      { type: '18mm_plywood', name: '18mm Plywood', category: 'board' },
      { type: '6mm_plywood', name: '6mm Plywood', category: 'board' },
      { type: 'soft_close_hinge', name: 'Soft Close Hinge', category: 'hardware' },
      { type: 'aluminium_handle', name: 'Aluminium Handle', category: 'hardware' },
      { type: 'minifix', name: 'Minifix', category: 'hardware' },
      { type: 'outer_laminate', name: 'Outer Laminate', category: 'laminate' },
      { type: '2mm', name: '2mm Edge Banding', category: 'edge_banding' },
    ]
  },
  storage_unit: {
    name: "Storage Cabinets",
    icon: Archive,
    materials: [
      { type: '18mm_plywood', name: '18mm Plywood', category: 'board' },
      { type: '18mm_mdf', name: '18mm MDF', category: 'board' },
      { type: 'soft_close_hinge', name: 'Soft Close Hinge', category: 'hardware' },
      { type: 'drawer_slide_soft_close', name: 'Soft Close Drawer Slide', category: 'hardware' },
      { type: 'aluminium_handle', name: 'Aluminium Handle', category: 'hardware' },
      { type: 'minifix', name: 'Minifix', category: 'hardware' },
      { type: 'outer_laminate', name: 'Outer Laminate', category: 'laminate' },
      { type: '2mm', name: '2mm Edge Banding', category: 'edge_banding' },
    ]
  },
  bookshelf: {
    name: "Bookshelves",
    icon: Table2,
    materials: [
      { type: '18mm_plywood', name: '18mm Plywood', category: 'board' },
      { type: '18mm_mdf', name: '18mm MDF', category: 'board' },
      { type: 'minifix', name: 'Minifix', category: 'hardware' },
      { type: 'dowel', name: 'Dowel', category: 'hardware' },
      { type: 'outer_laminate', name: 'Outer Laminate', category: 'laminate' },
      { type: '2mm', name: '2mm Edge Banding', category: 'edge_banding' },
    ]
  },
  dresser: {
    name: "Dressers",
    icon: Sofa,
    materials: [
      { type: '18mm_plywood', name: '18mm Plywood', category: 'board' },
      { type: 'drawer_slide_soft_close', name: 'Soft Close Drawer Slide', category: 'hardware' },
      { type: 'aluminium_handle', name: 'Aluminium Handle', category: 'hardware' },
      { type: 'minifix', name: 'Minifix', category: 'hardware' },
      { type: 'dowel', name: 'Dowel', category: 'hardware' },
      { type: 'outer_laminate', name: 'Outer Laminate', category: 'laminate' },
      { type: '2mm', name: '2mm Edge Banding', category: 'edge_banding' },
    ]
  }
};

export default function BOMSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFurnitureType, setSelectedFurnitureType] = useState<string>('wardrobe');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState<string>('');

  // No database calls - work with local state
  const [localSettings, setLocalSettings] = useState<any[]>([]);
  const settingsLoading = false;

  // Fetch products 
  const { data: products = [] } = useQuery({
    queryKey: ['/api/products'],
    queryFn: () => apiRequest('/api/products'),
  });

  // Link material to product - local state only
  const linkMutation = useMutation({
    mutationFn: (data: any) => {
      // Simulate API call
      return new Promise((resolve) => {
        setTimeout(() => {
          const newSetting = { id: Date.now(), ...data };
          setLocalSettings(prev => {
            const filtered = prev.filter(s => s.bomMaterialType !== data.bomMaterialType);
            return [...filtered, newSetting];
          });
          resolve(newSetting);
        }, 100);
      });
    },
    onSuccess: () => {
      toast({ title: 'Material linked successfully!' });
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ title: 'Failed to link material', variant: 'destructive' });
    }
  });

  // Update custom default price - local state only
  const updatePriceMutation = useMutation({
    mutationFn: (data: { materialType: string; price: number }) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          setLocalSettings(prev => {
            const existing = prev.find(s => s.bomMaterialType === data.materialType);
            if (existing) {
              return prev.map(s => 
                s.bomMaterialType === data.materialType 
                  ? { ...s, customDefaultPrice: data.price }
                  : s
              );
            } else {
              return [...prev, {
                id: Date.now(),
                bomMaterialType: data.materialType,
                bomMaterialCategory: 'custom',
                bomMaterialName: data.materialType,
                customDefaultPrice: data.price,
                useRealPricing: false
              }];
            }
          });
          resolve({ success: true });
        }, 100);
      });
    },
    onSuccess: () => {
      toast({ title: 'Default price updated successfully!' });
      setEditingPrice(null);
    },
    onError: () => {
      toast({ title: 'Failed to update default price', variant: 'destructive' });
    }
  });

  // Get current furniture type materials
  const currentMaterials = FURNITURE_MATERIALS[selectedFurnitureType as keyof typeof FURNITURE_MATERIALS]?.materials || [];
  
  // Filter materials by search
  const filteredMaterials = currentMaterials.filter(material =>
    material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get setting for a material
  const getSetting = (materialType: string) => {
    return localSettings.find((s: any) => s.bomMaterialType === materialType);
  };

  // Get mapped product for a material
  const getMappedProduct = (materialType: string) => {
    const setting = getSetting(materialType);
    if (setting?.linkedProductId) {
      return products.find((p: any) => p.id === setting.linkedProductId);
    }
    return null;
  };

  // Convert sheet price to per sqft price for board and laminate materials
  const getConvertedPrice = (product: any, materialType: string) => {
    if (!product) return null;
    
    // Check if this is a board or laminate material 
    const isBoardOrLaminate = materialType.toLowerCase().includes('plywood') || 
                             materialType.toLowerCase().includes('mdf') || 
                             materialType.toLowerCase().includes('particle') ||
                             materialType.toLowerCase().includes('board') ||
                             materialType.toLowerCase().includes('laminate');
    
    if (isBoardOrLaminate) {
      // Always convert to per sqft for board/laminate materials (standard sheet = 32 sqft)
      const standardSheetSize = 32; // sqft
      return Math.round(product.pricePerUnit / standardSheetSize);
    }
    
    return product.pricePerUnit;
  };

  // Get the price to display (custom default or system default)
  const getDefaultPrice = (materialType: string, category: string) => {
    const setting = getSetting(materialType);
    if (setting?.customDefaultPrice) {
      return parseFloat(setting.customDefaultPrice);
    }
    
    // Get system default
    const categoryRates = DEFAULT_RATES[category as keyof typeof DEFAULT_RATES];
    return categoryRates?.[materialType as keyof typeof categoryRates] || 0;
  };

  const handleLinkMaterial = (materialType: string, materialName: string, category: string, productId: number | null) => {
    const data = {
      bomMaterialType: materialType,
      bomMaterialCategory: category,
      bomMaterialName: materialName,
      linkedProductId: productId,
      useRealPricing: productId ? true : false,
    };

    linkMutation.mutate(data);
  };

  const startEditingPrice = (materialType: string) => {
    const currentPrice = getDefaultPrice(materialType, currentMaterials.find(m => m.type === materialType)?.category || '');
    setEditingPrice(materialType);
    setEditPriceValue(currentPrice.toString());
  };

  const savePrice = (materialType: string) => {
    const price = parseFloat(editPriceValue);
    if (isNaN(price) || price <= 0) {
      toast({ title: 'Please enter a valid price', variant: 'destructive' });
      return;
    }
    updatePriceMutation.mutate({ materialType, price });
  };

  const cancelEdit = () => {
    setEditingPrice(null);
    setEditPriceValue('');
  };

  if (settingsLoading) {
    return <div className="flex items-center justify-center h-96">Loading BOM settings...</div>;
  }

  const currentFurnitureType = FURNITURE_MATERIALS[selectedFurnitureType as keyof typeof FURNITURE_MATERIALS];

  return (
    <ResponsiveLayout
      title="BOM Material Settings"
      subtitle="Configure default prices and link materials to your product inventory for accurate BOM calculations"
    >
      <div className="space-y-6">
        {/* Furniture Type Filter */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Select Furniture Type
            </CardTitle>
            <CardDescription>
              Choose the furniture type to configure its specific materials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {Object.entries(FURNITURE_MATERIALS).map(([key, furniture]) => {
                const Icon = furniture.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedFurnitureType(key)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedFurnitureType === key 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Icon className="h-6 w-6 mx-auto mb-2" />
                    <div className="text-xs font-medium">{furniture.name}</div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search materials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Materials Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentFurnitureType && <currentFurnitureType.icon className="h-5 w-5" />}
              {currentFurnitureType?.name} Materials
              <Badge variant="secondary">{filteredMaterials.length} materials</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Default Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Linked Product</TableHead>
                  <TableHead>Real Price</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMaterials.map((material) => {
                  const setting = getSetting(material.type);
                  const mappedProduct = getMappedProduct(material.type);
                  const defaultPrice = getDefaultPrice(material.type, material.category);
                  const isEditingThis = editingPrice === material.type;

                  return (
                    <TableRow key={material.type}>
                      <TableCell className="font-medium">{material.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {material.category.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isEditingThis ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={editPriceValue}
                              onChange={(e) => setEditPriceValue(e.target.value)}
                              className="w-20 h-7"
                              min="0"
                              step="0.01"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => savePrice(material.type)}
                              className="h-7 w-7 p-0"
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEdit}
                              className="h-7 w-7 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">₹{defaultPrice}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditingPrice(material.type)}
                              className="h-6 w-6 p-0"
                            >
                              <Edit3 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {mappedProduct && setting?.useRealPricing ? (
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            <DollarSign className="h-3 w-3 mr-1" />
                            Real Price
                          </Badge>
                        ) : mappedProduct ? (
                          <Badge variant="secondary">
                            <Link className="h-3 w-3 mr-1" />
                            Linked
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <Package className="h-3 w-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {mappedProduct ? (
                          <span className="text-sm">{mappedProduct.name}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not linked</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {mappedProduct && setting?.useRealPricing ? (
                          <div className="space-y-1">
                            <span className="font-medium text-green-600">₹{getConvertedPrice(mappedProduct, material.type)}</span>
                            {getConvertedPrice(mappedProduct, material.type) !== mappedProduct.pricePerUnit && (
                              <div className="text-xs text-muted-foreground">
                                (₹{mappedProduct.pricePerUnit} per {mappedProduct.unit} ÷ 32 sqft)
                              </div>
                            )}
                          </div>
                        ) : mappedProduct ? (
                          <span className="text-muted-foreground">Linked but not enabled</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Dialog open={isDialogOpen && selectedMaterial?.type === material.type} onOpenChange={(open) => {
                          setIsDialogOpen(open);
                          if (!open) setSelectedMaterial(null);
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedMaterial(material)}
                            >
                              <Settings className="h-3 w-3 mr-1" />
                              {mappedProduct ? 'Edit' : 'Link'}
                            </Button>
                          </DialogTrigger>
                          <MaterialLinkDialog 
                            material={material}
                            currentSetting={setting}
                            products={products}
                            onSave={handleLinkMaterial}
                          />
                        </Dialog>
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

function MaterialLinkDialog({ material, currentSetting, products, onSave }: {
  material: any;
  currentSetting: any;
  products: any[];
  onSave: (materialType: string, materialName: string, category: string, productId: number | null) => void;
}) {
  const [selectedProductId, setSelectedProductId] = useState<string>(
    currentSetting?.linkedProductId?.toString() || ''
  );
  const [useRealPricing, setUseRealPricing] = useState<boolean>(currentSetting?.useRealPricing || false);

  // Convert sheet price to per sqft price for board and laminate materials
  const getConvertedPrice = (product: any, materialType: string) => {
    if (!product) return null;
    
    // Check if this is a board or laminate material 
    const isBoardOrLaminate = materialType.toLowerCase().includes('plywood') || 
                             materialType.toLowerCase().includes('mdf') || 
                             materialType.toLowerCase().includes('particle') ||
                             materialType.toLowerCase().includes('board') ||
                             materialType.toLowerCase().includes('laminate');
    
    if (isBoardOrLaminate) {
      // Always convert to per sqft for board/laminate materials (standard sheet = 32 sqft)
      const standardSheetSize = 32; // sqft
      return Math.round(product.pricePerUnit / standardSheetSize);
    }
    
    return product.pricePerUnit;
  };

  const relevantProducts = products.filter((product: any) => 
    product.name.toLowerCase().includes(material.name.toLowerCase()) ||
    product.category?.toLowerCase().includes(material.category.toLowerCase()) ||
    product.name.toLowerCase().includes(material.category.toLowerCase())
  );

  const handleSave = () => {
    const productId = selectedProductId && selectedProductId !== 'none' ? parseInt(selectedProductId) : null;
    onSave(material.type, material.name, material.category, productId);
  };

  const selectedProduct = products.find(p => p.id.toString() === selectedProductId);

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Link {material.name}</DialogTitle>
        <DialogDescription>
          Select a product from your inventory to use its real price for BOM calculations.
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="product-select">Select Product</Label>
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a product..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No product linked</SelectItem>
              {relevantProducts.length > 0 && (
                <>
                  <SelectItem value="suggested" disabled>--- Suggested Products ---</SelectItem>
                  {relevantProducts.map((product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name} - ₹{product.pricePerUnit} ({product.currentStock} in stock)
                    </SelectItem>
                  ))}
                </>
              )}
              {products.length > relevantProducts.length && (
                <>
                  <SelectItem value="all" disabled>--- All Products ---</SelectItem>
                  {products.filter(p => !relevantProducts.includes(p)).map((product) => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name} - ₹{product.pricePerUnit} ({product.currentStock} in stock)
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {selectedProduct && (
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm"><strong>Selected:</strong> {selectedProduct.name}</p>
            <p className="text-sm"><strong>Price:</strong> ₹{selectedProduct.pricePerUnit} per {selectedProduct.unit}</p>
            {(() => {
              const convertedPrice = getConvertedPrice(selectedProduct, material.type);
              const isConverted = convertedPrice !== selectedProduct.pricePerUnit;
              return isConverted ? (
                <p className="text-sm"><strong>BOM Price:</strong> ₹{convertedPrice} per sqft <span className="text-muted-foreground">(auto-converted from sheet price)</span></p>
              ) : null;
            })()}
            <p className="text-sm"><strong>Stock:</strong> {selectedProduct.currentStock} units</p>
            <p className="text-sm"><strong>Category:</strong> {selectedProduct.category}</p>
            
            <div className="flex items-center space-x-2 mt-3">
              <Switch
                id="use-real-pricing"
                checked={useRealPricing}
                onCheckedChange={setUseRealPricing}
              />
              <Label htmlFor="use-real-pricing" className="text-sm">
                Use real pricing in BOM calculations
              </Label>
            </div>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button onClick={handleSave}>
          Save Configuration
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}