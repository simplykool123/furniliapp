import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useIsMobile } from "@/components/Mobile/MobileOptimizer";
import MobileTable from "@/components/Mobile/MobileTable";
import { useToast } from "@/hooks/use-toast";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";
import FurnitureTechnicalDrawing from "@/components/FurnitureTechnicalDrawing";
import FurnitureSVGRenderer from "@/components/FurnitureSVGRenderer";
import { bomDataToFurnitureSpec } from "@/types/furnitureSpec";
import FabricWardrobe from "@/components/FabricWardrobe";
import { 
  Calculator, 
  Download, 
  Share2, 
  Plus, 
  Trash2,
  FileDown,
  MessageSquare,
  Bed,
  Home,
  Archive,
  DoorOpen,
  Package,
  Table2,
  Sofa,
  PanelTop,
  Eye,
  ChevronRight,
  Move3D,
  CornerDownRight,
  CornerUpLeft,
  Menu,
  Minus,
  Layers,
  ArrowLeftRight
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { suggestDefaults, mapToSmartDefaultType, type WardrobeType } from "@/utils/smartDefaults";

// BOM Calculation Form Schema
const bomCalculationSchema = z.object({
  unitType: z.string().min(1, "Unit type is required"),
  height: z.number().min(1, "Height must be greater than 0"),
  width: z.number().min(1, "Width must be greater than 0"), 
  depth: z.number().min(1, "Depth must be greater than 0"),
  unitOfMeasure: z.string().default("mm"),
  boardType: z.string().min(1, "Board type is required"),
  boardThickness: z.string().default("18mm"),
  finish: z.string().min(1, "Finish is required"),
  projectId: z.number().optional(),
  partsConfig: z.object({
    // General furniture
    shelves: z.number().default(0), // legacy field
    drawers: z.number().default(0), // legacy field
    shutters: z.number().default(0), // legacy field
    doors: z.number().default(0),
    backPanels: z.number().default(0),
    exposedSides: z.boolean().default(false),
    
    // Manufacturing settings
    backThickness: z.number().default(6), // 6/8/9mm
    slideColorance: z.number().default(12.5), // 12-13mm
    boxThickness: z.number().default(12), // 12/15/18mm  
    bottomThickness: z.number().default(6), // 6/9mm
    doorClearance: z.number().default(12), // 10-15mm
    
    // Bed specific
    bedType: z.string().default('platform'),
    storage: z.string().optional(),
    headboard: z.boolean().optional(),
    footboard: z.boolean().optional(),
    
    // TV Unit specific  
    tvUnitType: z.string().default('floor_standing'),
    tvSize: z.string().optional(),
    glassShelf: z.number().optional(),
    cableManagement: z.boolean().optional(),
    ledLighting: z.boolean().optional(),
    powerOutlets: z.boolean().optional(),
    
    // Storage Unit specific
    storageType: z.string().default('floor_standing'),
    
    // Bookshelf specific
    bookshelfType: z.string().default('open_shelving'),
    
    // Wardrobe specific
    wardrobeType: z.enum(["openable", "sliding", "walk_in"]).default("openable"),
    hasLoft: z.boolean().default(false),
    loftHeight: z.number().optional(), // height of loft section
    loftWidth: z.number().optional(), // width of loft section
    shutterCount: z.number().min(0).default(2), // renamed from shutters for clarity
    shelfCount: z.number().min(0).default(3), // renamed from shelves for clarity - allow 0 for walk-in wardrobes
    drawerCount: z.number().default(0), // renamed from drawers for clarity
    hangingRods: z.number().optional(),
    mirror: z.boolean().optional(),
    
    // Kitchen specific
    baseCabinets: z.number().optional(),
    wallCabinets: z.number().optional(),
    tallCabinets: z.number().optional(),
    pulloutShelves: z.number().optional(),
    lazySusan: z.boolean().optional(),
    cornerUnit: z.boolean().optional(),
    island: z.boolean().optional(),
    kitchenLayout: z.string().default('straight'),
    
    customParts: z.array(z.object({
      name: z.string(),
      quantity: z.number(),
    })).default([]),
  }).refine((data) => {
    // Validation rule: wardrobe type vs shutter count
    if (data.wardrobeType === "walk_in" && data.shutterCount !== 0) {
      return false;
    }
    if (data.wardrobeType === "sliding" && data.shutterCount < 2) {
      return false;
    }
    if (data.wardrobeType === "openable" && data.shutterCount < 1) {
      return false;
    }
    return true;
  }, {
    message: "Invalid configuration: Walk-in wardrobes don't have shutters (must be 0), sliding wardrobes need ≥2 shutters, openable wardrobes need ≥1 shutter",
    path: ["shutterCount"]
  }),
  notes: z.string().optional(),
});

type BomCalculationFormData = z.infer<typeof bomCalculationSchema>;

interface BomResult {
  id: number;
  calculationNumber: string;
  totalBoardArea: number;
  boardAreaByThickness: { [thickness: string]: number };
  totalEdgeBanding2mm: number;
  totalEdgeBanding0_8mm: number;
  totalMaterialCost: number;
  totalHardwareCost: number;
  totalCost: number;
  items: BomItem[];
  // NEW: Purchase-oriented aggregated data
  purchaseRequirements?: {
    boards: Array<{
      material: string;
      thickness: string;
      area_sqft: number;
      sheets_8x4: number;
      utilization_percent: number;
      rate: number;
      cost: number;
    }>;
    laminates: Array<{
      kind: 'outer' | 'inner';
      area_sqft: number;
      sheets?: number;
      rate: number;
      cost: number;
    }>;
    edgeBanding: Array<{
      type: '2mm' | '0.8mm';
      length_m: number;
      rate: number;
      cost: number;
    }>;
    hardware: Array<{
      item: string;
      qty: number;
      rate: number;
      cost: number;
    }>;
    adhesives: {
      bottles: number;
      rate: number;
      cost: number;
    };
  };
  consolidatedItems?: ConsolidatedItem[];
  details?: {
    sheetOptimization: {
      sheets_by_thickness: { [thickness: string]: number };
      sheets_required: number;
      efficiency: number;
      nesting_layout: any[];
      waste_sqft: number;
    };
  };
  // Legacy fields
  sheetOptimization?: {
    sheets_by_thickness?: { [thickness: string]: number };
    totalSheets?: number;
    totalUtilization?: number;
    efficiency?: number;
  };
}

interface ConsolidatedItem {
  name: string;
  unit: string;
  totalQty: string;
  totalArea?: number;
  avgRate: number;
  totalCost: number;
  order: number;
  isBoard: boolean;
  // Legacy fields for backward compatibility
  items?: BomItem[];
}

interface BomItem {
  id: number;
  itemType: string;
  itemCategory: string;
  partName: string;
  materialType?: string;
  length?: number;
  width?: number;
  thickness?: number;
  quantity: number;
  unit: string;
  edgeBandingType?: string;
  edgeBandingLength: number;
  unitRate: number;
  totalCost: number;
  area_sqft?: number; // Add missing area property
  description?: string;
}

const furnitureTypes = [
  { 
    id: "wardrobe", 
    name: "Wardrobes", 
    icon: Home, 
    description: "Built-in wardrobes and closets",
    defaultConfig: { 
      wardrobeType: "openable", 
      hasLoft: false, 
      loftHeight: 600,
      loftWidth: 1200,
      shutterCount: 2, 
      shelfCount: 3, 
      drawerCount: 0, 
      doors: 0, 
      backPanels: 1, 
      exposedSides: false, 
      backThickness: 6, 
      slideColorance: 12.5, 
      boxThickness: 12, 
      bottomThickness: 6, 
      doorClearance: 12 
    }
  },
  { 
    id: "bed", 
    name: "Beds", 
    icon: Bed, 
    description: "",
    defaultConfig: { shutters: 0, shelves: 0, drawers: 2, doors: 0, backPanels: 1, exposedSides: false, backThickness: 6, slideColorance: 12.5, boxThickness: 12, bottomThickness: 6, doorClearance: 12 }
  },
  { 
    id: "kitchen_cabinet", 
    name: "Kitchen", 
    icon: Package, 
    description: "",
    defaultConfig: { 
      baseCabinets: 4, 
      wallCabinets: 4, 
      tallCabinets: 1, 
      drawers: 6, 
      pulloutShelves: 2, 
      lazySusan: false, 
      cornerUnit: false, 
      island: false, 
      shelves: 2, 
      shutters: 0, 
      doors: 0, 
      backPanels: 1, 
      exposedSides: false, 
      backThickness: 6, 
      slideColorance: 12.5, 
      boxThickness: 18, 
      bottomThickness: 6, 
      doorClearance: 12,
      kitchenLayout: "L-shaped"
    }
  },
  { 
    id: "tv_unit", 
    name: "TV Unit", 
    icon: PanelTop, 
    description: "Entertainment centers and TV stands",
    defaultConfig: { shelves: 2, drawers: 2, shutters: 0, doors: 0, backPanels: 1, exposedSides: false, backThickness: 6, slideColorance: 12.5, boxThickness: 12, bottomThickness: 6, doorClearance: 12 }
  },
  { 
    id: "storage_unit", 
    name: "Cabinets", 
    icon: Archive, 
    description: "Storage cabinets and units",
    defaultConfig: { shutters: 2, shelves: 4, drawers: 1, doors: 0, backPanels: 1, exposedSides: false, backThickness: 6, slideColorance: 12.5, boxThickness: 12, bottomThickness: 6, doorClearance: 12 }
  },
  { 
    id: "bookshelf", 
    name: "Bookshelf", 
    icon: Table2, 
    description: "Open and closed bookshelves",
    defaultConfig: { shelves: 5, drawers: 0, shutters: 0, doors: 0, backPanels: 1, exposedSides: true, backThickness: 6, slideColorance: 12.5, boxThickness: 12, bottomThickness: 6, doorClearance: 12 }
  },
  { 
    id: "dresser", 
    name: "Dresser", 
    icon: Sofa, 
    description: "Bedroom dressers and chests",
    defaultConfig: { drawers: 6, shelves: 0, shutters: 0, doors: 0, backPanels: 1, exposedSides: false, backThickness: 6, slideColorance: 12.5, boxThickness: 12, bottomThickness: 6, doorClearance: 12 }
  },
  { 
    id: "door", 
    name: "Doors", 
    icon: DoorOpen, 
    description: "Interior and cabinet doors",
    defaultConfig: { shutters: 1, shelves: 0, drawers: 0, doors: 1, backPanels: 0, exposedSides: false, backThickness: 6, slideColorance: 12.5, boxThickness: 12, bottomThickness: 6, doorClearance: 12 }
  },
  { 
    id: "shoe_rack", 
    name: "Shelving Units", 
    icon: Package, 
    description: "Open shelving and shoe racks",
    defaultConfig: { shutters: 0, shelves: 5, drawers: 0, doors: 0, backPanels: 1, exposedSides: true, backThickness: 6, slideColorance: 12.5, boxThickness: 12, bottomThickness: 6, doorClearance: 12 }
  },
  { 
    id: "table", 
    name: "Tables", 
    icon: Table2, 
    description: "Dining and work tables",
    defaultConfig: { shutters: 0, shelves: 0, drawers: 1, doors: 0, backPanels: 0, exposedSides: false, backThickness: 6, slideColorance: 12.5, boxThickness: 12, bottomThickness: 6, doorClearance: 12 }
  },
  { 
    id: "sofa", 
    name: "Sofas and Seating", 
    icon: Sofa, 
    description: "Sofa frames and seating",
    defaultConfig: { shutters: 0, shelves: 0, drawers: 1, doors: 0, backPanels: 0, exposedSides: false, backThickness: 6, slideColorance: 12.5, boxThickness: 12, bottomThickness: 6, doorClearance: 12 }
  },
  { 
    id: "tv_panel", 
    name: "Paneling", 
    icon: PanelTop, 
    description: "Wall panels and partitions",
    defaultConfig: { shutters: 1, shelves: 2, drawers: 0, doors: 0, backPanels: 1, exposedSides: false, backThickness: 6, slideColorance: 12.5, boxThickness: 12, bottomThickness: 6, doorClearance: 12 }
  },
];

const boardTypes = [
  { value: "pre_lam_particle_board", label: "Pre-Lam Particle Board" },
  { value: "mdf", label: "MDF" },
  { value: "ply", label: "Plywood" },
  { value: "solid_wood", label: "Solid Wood" },
  { value: "hdf", label: "HDF" },
];

const finishTypes = [
  { value: "laminate", label: "Laminate" },
  { value: "acrylic", label: "Acrylic" },
  { value: "paint", label: "Paint" },
  { value: "veneer", label: "Veneer" },
  { value: "membrane", label: "Membrane" },
  { value: "natural", label: "Natural Wood" },
];

const thicknessOptions = [
  { value: "6mm", label: "6mm" },
  { value: "12mm", label: "12mm" },
  { value: "18mm", label: "18mm" },
  { value: "25mm", label: "25mm" },
];

export default function BOMCalculator() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFurnitureType, setSelectedFurnitureType] = useState<string>("wardrobe");
  const [bomResult, setBomResult] = useState<BomResult | null>(null);
  const [customParts, setCustomParts] = useState<{name: string, quantity: number}[]>([]);
  const [bomViewMode, setBomViewMode] = useState<'consolidated' | 'details'>('consolidated');
  const [variableCosts, setVariableCosts] = useState({
    laborCost: 0,
    laborCostType: 'fixed' as 'fixed' | 'percent',
    transportCost: 0,
    transportCostType: 'fixed' as 'fixed' | 'percent'
  });

  const selectedFurniture = furnitureTypes.find(f => f.id === selectedFurnitureType);

  const form = useForm<BomCalculationFormData>({
    resolver: zodResolver(bomCalculationSchema),
    defaultValues: {
      unitType: selectedFurnitureType,
      unitOfMeasure: "mm",
      boardThickness: "18mm",
      partsConfig: selectedFurniture?.defaultConfig || {
        // Legacy fields for compatibility
        shelves: 0,
        drawers: 0,
        shutters: 0,
        doors: 0,
        backPanels: 0,
        exposedSides: false,
        
        // New wardrobe-specific fields with proper defaults
        wardrobeType: "openable",
        shutterCount: selectedFurnitureType === 'wardrobe' ? 2 : 0,
        shelfCount: selectedFurnitureType === 'wardrobe' ? 3 : 0,
        drawerCount: 0,
        hasLoft: false,
        backThickness: 6,
        slideColorance: 12.5,
        boxThickness: 12,
        bottomThickness: 6,
        doorClearance: 12,
        customParts: [],
      },
    },
  });
  
  // 🎯 SMART BOARD TYPE & FINISH INTERCONNECTED LOGIC (After form creation)
  const selectedBoardType = form.watch('boardType');
  const isPreLamBoard = selectedBoardType === 'pre_lam_particle_board';
  
  // Auto-handle Pre-Lam board selection - disable finish field
  useEffect(() => {
    if (isPreLamBoard) {
      // Pre-Lam board already has laminate applied, set default and disable
      form.setValue('finish', 'laminate', { shouldDirty: false });
    }
  }, [isPreLamBoard, form]);

  // Update form when furniture type changes
  useEffect(() => {
    if (selectedFurniture) {
      form.setValue('unitType', selectedFurniture.id);
      form.setValue('partsConfig', {
        // Include all required schema properties with defaults
        shelves: 0,
        drawers: 0,
        shutters: 0,
        doors: 0,
        backPanels: 0,
        exposedSides: false,
        backThickness: 6,
        slideColorance: 12.5,
        boxThickness: 12,
        bottomThickness: 6,
        doorClearance: 12,
        bedType: 'platform',
        tvUnitType: 'floor_standing',
        storageType: 'floor_standing',
        bookshelfType: 'open_shelving',
        
        // Wardrobe-specific defaults
        wardrobeType: "openable",
        shutterCount: selectedFurnitureType === 'wardrobe' ? 2 : 0,
        shelfCount: selectedFurnitureType === 'wardrobe' ? 3 : 0,
        drawerCount: 0,
        hasLoft: false,
        
        ...selectedFurniture.defaultConfig,
        customParts: []
      });
    }
  }, [selectedFurnitureType, selectedFurniture, form]);

  // 🎯 SMART DEFAULTS - Auto-update form based on dimensions and wardrobe type
  useEffect(() => {
    // Only apply smart defaults for wardrobe furniture type
    if (selectedFurnitureType !== 'wardrobe') return;
    
    const formValues = form.getValues();
    const { height, width, depth, unitOfMeasure = 'mm', partsConfig } = formValues;
    
    // Skip if critical values are missing or zero
    if (!height || !width || !depth || height <= 0 || width <= 0 || depth <= 0) return;
    
    try {
      const wardrobeType = mapToSmartDefaultType(partsConfig.wardrobeType);
      
      const smartSuggestions = suggestDefaults({
        unit: unitOfMeasure as "mm" | "ft",
        width,
        height, 
        depth,
        type: wardrobeType
      });

      // Auto-update form values with smart suggestions
      form.setValue('partsConfig.shutterCount', smartSuggestions.shutters, { shouldDirty: false, shouldValidate: true });
      form.setValue('partsConfig.shelfCount', smartSuggestions.shelves, { shouldDirty: false, shouldValidate: true });
      form.setValue('partsConfig.drawerCount', smartSuggestions.drawers, { shouldDirty: false, shouldValidate: true });

      // Show helpful notes to user if available  
      if (smartSuggestions.notes.length > 0) {
        console.log('Smart defaults applied:', smartSuggestions.notes.join(' '));
        toast({
          title: "Smart Defaults Applied",
          description: smartSuggestions.notes.join(' '),
          duration: 3000,
        });
      }
      
    } catch (error) {
      console.warn('Smart defaults calculation failed:', error);
    }
  }, [
    form.watch('height'),
    form.watch('width'), 
    form.watch('depth'),
    form.watch('unitOfMeasure'),
    form.watch('partsConfig.wardrobeType'),
    selectedFurnitureType,
    form
  ]);

  // 🏠 LOFT SMART DEFAULTS - Auto-set loft dimensions when enabled
  useEffect(() => {
    const currentHasLoft = form.watch('partsConfig.hasLoft');
    const currentLoftHeight = form.watch('partsConfig.loftHeight');
    const currentLoftWidth = form.watch('partsConfig.loftWidth');
    const wardrobeWidth = form.watch('width');
    
    // Only apply defaults when loft is first enabled and values are not set
    if (currentHasLoft && selectedFurnitureType === 'wardrobe') {
      if (!currentLoftHeight) {
        form.setValue('partsConfig.loftHeight', 610, { shouldDirty: false }); // 2ft default
      }
      if (!currentLoftWidth && wardrobeWidth) {
        form.setValue('partsConfig.loftWidth', wardrobeWidth, { shouldDirty: false }); // Match wardrobe width
      }
    }
  }, [
    form.watch('partsConfig.hasLoft'),
    form.watch('width'),
    selectedFurnitureType,
    form
  ]);

  // Fetch projects for project linking
  const { data: projects = [], isError: projectsError } = useQuery<any[]>({
    queryKey: ['/api/projects'],
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // Handle projects error
  React.useEffect(() => {
    if (projectsError) {
      console.error('Failed to fetch projects');
    }
  }, [projectsError]);

  const calculateBOMMutation = useMutation({
    mutationFn: async (data: BomCalculationFormData) => {
      // Ensure authentication token is present
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication required. Please login again.');
      }

      return await apiRequest('/api/bom/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...data,
          createdBy: 1, // Add missing createdBy field
        }),
      });
    },
    onSuccess: (data: BomResult) => {
      setBomResult(data);
      // Invalidate any BOM-related queries
      queryClient.invalidateQueries({ queryKey: ['/api/bom'] });
      toast({
        title: "BOM Calculated Successfully",
        description: `BOM ${data.calculationNumber} has been generated`,
      });
    },
    onError: (error: any) => {
      console.error('BOM Calculation Error:', error);
      let errorMessage = "Failed to calculate BOM";
      
      if (error.message?.includes('401') || error.message?.includes('token')) {
        errorMessage = "Session expired. Please login again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Calculation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const exportBOMMutation = useMutation({
    mutationFn: async ({ bomId, format }: { bomId: number, format: 'excel' | 'pdf' }) => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/bom/${bomId}/export?format=${format}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please login again.');
        }
        throw new Error(`Export failed: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Set proper file extension based on format
      let fileName = `BOM-${bomId}`;
      if (format === 'pdf') {
        fileName += '.pdf';
      } else if (format === 'excel') {
        fileName += '.csv';
      } else {
        fileName += '.txt';
      }
      
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Export Successful",
        description: `BOM exported as ${variables.format.toUpperCase()}`,
      });
    },
    onError: (error: any) => {
      console.error('Export Error:', error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export BOM",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BomCalculationFormData) => {
    // Validate required fields
    if (!data.height || !data.width || !data.depth) {
      toast({
        title: "Validation Error",
        description: "Please enter all dimensions (height, width, depth)",
        variant: "destructive",
      });
      return;
    }

    if (!data.boardType || !data.finish) {
      toast({
        title: "Validation Error", 
        description: "Please select board type and finish",
        variant: "destructive",
      });
      return;
    }

    // Prepare submission data with proper validation
    const submitData = {
      ...data,
      partsConfig: {
        ...data.partsConfig,
        customParts: customParts.filter(part => part.name.trim() !== ''), // Remove empty custom parts
      }
    };

    calculateBOMMutation.mutate(submitData);
  };

  const addCustomPart = () => {
    if (customParts.length >= 10) {
      toast({
        title: "Limit Reached",
        description: "Maximum 10 custom parts allowed",
        variant: "destructive",
      });
      return;
    }
    setCustomParts([...customParts, { name: "", quantity: 1 }]);
  };

  // ✅ COMPLETELY NEW CONSOLIDATION LOGIC - PRIORITIZE BACKEND DATA
  const getConsolidatedMaterials = (items: BomItem[]) => {
    // ✅ PRIORITY 1: Use backend-provided consolidatedItems when available
    if (bomResult?.consolidatedItems && bomResult.consolidatedItems.length > 0) {
      console.log('🎯 Using backend consolidatedItems for consistent calculations');
      return bomResult.consolidatedItems;
    }
    
    // ✅ FALLBACK: Calculate locally if backend data is not available
    console.log('⚠️ Falling back to frontend calculation');
    const result = [];
    
    // 1. Group 18mm PLY boards
    const boards18mm = items.filter(item => 
      item.itemCategory === 'Board' && item.materialType?.includes('18mm')
    );
    if (boards18mm.length > 0) {
      const totalQty = boards18mm.reduce((sum, item) => sum + item.quantity, 0);
      const totalArea = boards18mm.reduce((sum, item) => sum + (item.area_sqft || 0), 0);
      const totalCost = boards18mm.reduce((sum, item) => sum + item.totalCost, 0);
      
      result.push({
        name: '18mm PLY',
        items: boards18mm,
        totalQty: Math.round(totalQty),
        totalArea: Math.round(totalArea * 100) / 100,
        avgRate: Math.round(totalCost / totalArea),
        totalCost: Math.round(totalCost),
        unit: 'pieces',
        order: 1
      });
    }
    
    // 2. Group 12mm boards
    const boards12mm = items.filter(item => 
      item.itemCategory === 'Board' && item.materialType?.includes('12mm')
    );
    if (boards12mm.length > 0) {
      const totalQty = boards12mm.reduce((sum, item) => sum + item.quantity, 0);
      const totalArea = boards12mm.reduce((sum, item) => sum + (item.area_sqft || 0), 0);
      const totalCost = boards12mm.reduce((sum, item) => sum + item.totalCost, 0);
      
      result.push({
        name: '12mm PLY',
        items: boards12mm,
        totalQty: Math.round(totalQty),
        totalArea: Math.round(totalArea * 100) / 100,
        avgRate: Math.round(totalCost / totalArea),
        totalCost: Math.round(totalCost),
        unit: 'pieces',
        order: 2
      });
    }
    
    // 3. Group 8mm boards  
    const boards8mm = items.filter(item => 
      item.itemCategory === 'Board' && item.materialType?.includes('8mm')
    );
    if (boards8mm.length > 0) {
      const totalQty = boards8mm.reduce((sum, item) => sum + item.quantity, 0);
      const totalArea = boards8mm.reduce((sum, item) => sum + (item.area_sqft || 0), 0);
      const totalCost = boards8mm.reduce((sum, item) => sum + item.totalCost, 0);
      
      result.push({
        name: '8mm PLY',
        items: boards8mm,
        totalQty: Math.round(totalQty),
        totalArea: Math.round(totalArea * 100) / 100,
        avgRate: Math.round(totalCost / totalArea),
        totalCost: Math.round(totalCost),
        unit: 'pieces',
        order: 3
      });
    }
    
    // 4. Inner Surface Laminate
    const innerLaminate = items.filter(item => 
      item.materialType === 'Inner Surface Laminate'
    );
    if (innerLaminate.length > 0) {
      const totalQty = innerLaminate.reduce((sum, item) => sum + item.quantity, 0);
      const totalArea = innerLaminate.reduce((sum, item) => sum + (item.area_sqft || 0), 0);
      const totalCost = innerLaminate.reduce((sum, item) => sum + item.totalCost, 0);
      
      result.push({
        name: 'Inner Surface Laminate',
        items: innerLaminate,
        totalQty: Math.round(totalQty),
        totalArea: Math.round(totalArea * 100) / 100,
        avgRate: 65,
        totalCost: Math.round(totalCost),
        unit: 'pieces',
        order: 4
      });
    }
    
    // 5. Outer Surface Laminate
    const outerLaminate = items.filter(item => 
      item.materialType === 'Outer Surface Laminate'
    );
    if (outerLaminate.length > 0) {
      const totalQty = outerLaminate.reduce((sum, item) => sum + item.quantity, 0);
      const totalArea = outerLaminate.reduce((sum, item) => sum + (item.area_sqft || 0), 0);
      const totalCost = outerLaminate.reduce((sum, item) => sum + item.totalCost, 0);
      
      result.push({
        name: 'Outer Surface Laminate',
        items: outerLaminate,
        totalQty: Math.round(totalQty),
        totalArea: Math.round(totalArea * 100) / 100,
        avgRate: 85,
        totalCost: Math.round(totalCost),
        unit: 'pieces',
        order: 5
      });
    }
    
    // 6. Group adhesives
    const adhesives = items.filter(item => item.itemCategory === 'Adhesive');
    adhesives.forEach(item => {
      result.push({
        name: item.partName,
        items: [item],
        totalQty: Math.round(item.quantity * 100) / 100,
        totalArea: 0,
        avgRate: item.unitRate,
        totalCost: Math.round(item.totalCost),
        unit: item.unit,
        order: 6
      });
    });
    
    // 7. Group hardware
    const hardware = items.filter(item => item.itemCategory === 'Hardware');
    hardware.forEach(item => {
      result.push({
        name: item.partName,
        items: [item],
        totalQty: Math.round(item.quantity),
        totalArea: 0,
        avgRate: item.unitRate,
        totalCost: Math.round(item.totalCost),
        unit: item.unit,
        order: 7
      });
    });
    
    return result.sort((a, b) => a.order - b.order);
  };

  // Get ordered materials for consolidated view
  const getOrderedConsolidatedMaterials = (items: BomItem[]) => {
    return getConsolidatedMaterials(items);
  };

  const updateCustomPart = (index: number, field: 'name' | 'quantity', value: string | number) => {
    if (index < 0 || index >= customParts.length) return;
    
    const updated = [...customParts];
    if (field === 'name') {
      updated[index][field] = (value as string).slice(0, 50); // Limit name length
    } else {
      const qty = Number(value);
      updated[index][field] = isNaN(qty) ? 1 : Math.max(1, Math.min(100, qty)); // Limit quantity 1-100
    }
    setCustomParts(updated);
  };

  const removeCustomPart = (index: number) => {
    setCustomParts(customParts.filter((_, i) => i !== index));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleExport = (format: 'excel' | 'pdf') => {
    if (bomResult) {
      exportBOMMutation.mutate({ bomId: bomResult.id, format });
    }
  };

  const handleWhatsAppShare = () => {
    if (bomResult) {
      const message = `BOM Calculation ${bomResult.calculationNumber}\n` +
        `Total Cost: ${formatCurrency(bomResult.totalCost || 0)}\n` +
        `Board Area: ${bomResult.totalBoardArea} sq.ft\n` +
        `View full details: ${window.location.origin}/bom-calculator`;
      
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  return (
    <ResponsiveLayout title="BOM Calculator">
      {/* Hero Section */}
      <div className="bg-[hsl(28,100%,25%)] text-white py-8 px-4 mb-6 rounded-lg">
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            HOW MUCH MATERIALS WOULD YOU NEED?
          </h1>
          <p className="text-white/90">Calculate furniture material requirements</p>
        </div>
      </div>

      {/* Furniture Type Selector */}
      <div className="bg-card shadow-sm border rounded-lg mb-6">
        <div className="px-4 py-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-[hsl(28,100%,25%)] text-white px-3 py-1 rounded-full text-sm font-medium">
              Select Furniture Type
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {furnitureTypes.map((furniture) => {
              const IconComponent = furniture.icon;
              const isSelected = selectedFurnitureType === furniture.id;
              
              return (
                <button
                  key={furniture.id}
                  onClick={() => setSelectedFurnitureType(furniture.id)}
                  className={`p-2 rounded-lg border-2 transition-all duration-200 text-center min-w-[80px] ${
                    isSelected 
                      ? 'border-[hsl(28,100%,25%)] bg-[hsl(28,100%,25%)] text-white shadow-lg' 
                      : 'border-border bg-card hover:border-[hsl(28,100%,25%)]/30 hover:bg-accent text-foreground'
                  }`}
                >
                  <IconComponent className={`w-5 h-5 mx-auto mb-1 ${isSelected ? 'text-white' : 'text-[hsl(28,100%,25%)]'}`} />
                  <div className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-foreground'}`}>
                    {furniture.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Beds Calculator */}
      {selectedFurnitureType === 'bed' && (
        <div className="bg-card shadow-sm border rounded-lg mb-6">
          <div className="px-4 py-6">
            {/* Calculator Heading */}
            <div className="text-center mb-6">
              <Bed className="w-8 h-8 mx-auto text-[hsl(28,100%,25%)] mb-2" />
              <h2 className="text-xl font-bold text-foreground">Beds Calculator</h2>
            </div>
            
            {/* Bed Types Selection */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-[hsl(28,100%,25%)] text-white px-3 py-1 rounded-full text-sm font-medium">
                  Bed Type
                </div>
              </div>
            </div>
            <Form {...form}>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="partsConfig.bedType"
                  render={({ field }) => (
                    <FormItem>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {[
                          { value: 'single', label: 'Single', icon: Bed, desc: '90×190cm', size: { width: 900, depth: 1900 } },
                          { value: 'queen', label: 'Queen', icon: Bed, desc: '150×200cm', size: { width: 1500, depth: 2000 } },
                          { value: 'king', label: 'King', icon: Bed, desc: '180×200cm', size: { width: 1800, depth: 2000 } },
                          { value: 'king_xl', label: 'King XL', icon: Bed, desc: '200×220cm', size: { width: 2000, depth: 2200 } },
                          { value: 'bunk', label: 'Bunk', icon: Layers, desc: '90×190cm', size: { width: 900, depth: 1900 } }
                        ].map((bedType) => {
                          const IconComponent = bedType.icon;
                          const isSelected = field.value === bedType.value;
                          
                          return (
                            <button
                              key={bedType.value}
                              type="button"
                              onClick={() => {
                                field.onChange(bedType.value);
                                // Auto-update dimensions based on bed size
                                form.setValue('width', bedType.size.width);
                                form.setValue('depth', bedType.size.depth);
                                form.setValue('height', 900); // Standard bed height
                              }}
                              className={`p-3 rounded-lg border-2 transition-all duration-200 text-center ${
                                isSelected 
                                  ? 'border-[hsl(28,100%,25%)] bg-[hsl(28,100%,25%)] text-white shadow-lg' 
                                  : 'border-border bg-card hover:border-[hsl(28,100%,25%)]/30 hover:bg-accent'
                              }`}
                            >
                              <IconComponent className={`w-5 h-5 mx-auto mb-1 ${isSelected ? 'text-white' : 'text-[hsl(28,100%,25%)]'}`} />
                              <div className={`text-xs font-medium mb-0.5 ${isSelected ? 'text-white' : 'text-foreground'}`}>
                                {bedType.label}
                              </div>
                              <div className={`text-[10px] ${isSelected ? 'text-white/90' : 'text-muted-foreground'}`}>
                                {bedType.desc}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </Form>
          </div>
        </div>
      )}

      {/* Kitchen Calculator */}
      {selectedFurnitureType === 'kitchen_cabinet' && (
        <div className="bg-card shadow-sm border rounded-lg mb-6">
          <div className="px-4 py-6">
            {/* Calculator Heading */}
            <div className="text-center mb-6">
              <Package className="w-8 h-8 mx-auto text-[hsl(28,100%,25%)] mb-2" />
              <h2 className="text-xl font-bold text-foreground">Kitchen Calculator</h2>
            </div>
            
            {/* Kitchen Layout Selection */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-[hsl(28,100%,25%)] text-white px-3 py-1 rounded-full text-sm font-medium">
                  Kitchen Layout
                </div>
              </div>
            </div>
            <Form {...form}>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="partsConfig.kitchenLayout"
                  render={({ field }) => (
                    <FormItem>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {[
                          { value: 'L-shaped', label: 'L-shaped', icon: CornerDownRight, desc: 'Corner layout' },
                          { value: 'U-shaped', label: 'U-shaped', icon: Move3D, desc: 'Three walls' },
                          { value: 'Parallel', label: 'Parallel', icon: Menu, desc: 'Two parallel walls' },
                          { value: 'Single-line', label: 'Single-line', icon: Minus, desc: 'One wall' },
                          { value: 'G-shaped', label: 'G-shaped', icon: CornerUpLeft, desc: 'Peninsula style' }
                        ].map((layout) => {
                          const IconComponent = layout.icon;
                          const isSelected = field.value === layout.value;
                          
                          return (
                            <button
                              key={layout.value}
                              type="button"
                              onClick={() => field.onChange(layout.value)}
                              className={`p-3 rounded-lg border-2 transition-all duration-200 text-center ${
                                isSelected 
                                  ? 'border-[hsl(28,100%,25%)] bg-[hsl(28,100%,25%)] text-white shadow-lg' 
                                  : 'border-border bg-card hover:border-[hsl(28,100%,25%)]/30 hover:bg-accent'
                              }`}
                            >
                              <IconComponent className={`w-5 h-5 mx-auto mb-1 ${isSelected ? 'text-white' : 'text-[hsl(28,100%,25%)]'}`} />
                              <div className={`text-xs font-medium mb-0.5 ${isSelected ? 'text-white' : 'text-foreground'}`}>
                                {layout.label}
                              </div>
                              <div className={`text-[10px] ${isSelected ? 'text-white/90' : 'text-muted-foreground'}`}>
                                {layout.desc}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </Form>
          </div>
        </div>
      )}

      {/* Calculator Section */}
      <div className="space-y-4 p-4">
        {/* Calculator Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {selectedFurniture && <selectedFurniture.icon className="w-6 h-6 text-furnili-brown" />}
              <div>
                <div className="text-sm">{selectedFurniture?.name} Calculator</div>
                <div className="text-sm text-muted-foreground font-normal">{selectedFurniture?.description}</div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
                  {/* Wardrobe Type Selection - Only for wardrobes */}
                  {selectedFurnitureType === 'wardrobe' && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium flex items-center gap-2">
                        <Home className="w-4 h-4" />
                        Wardrobe Type
                      </h3>
                      <FormField
                      control={form.control}
                      name="partsConfig.wardrobeType"
                      render={({ field }) => (
                        <FormItem>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { value: 'openable', label: 'Openable Door', desc: 'Hinged doors', icon: DoorOpen },
                              { value: 'sliding', label: 'Sliding Door', desc: 'Sliding panels', icon: ArrowLeftRight },
                              { value: 'walkin', label: 'Walk-in', desc: 'Open wardrobe', icon: Home }
                            ].map((layout) => {
                              const IconComponent = layout.icon;
                              const isSelected = field.value === layout.value;
                              
                              return (
                                <button
                                  key={layout.value}
                                  type="button"
                                  onClick={() => field.onChange(layout.value)}
                                  className={`p-2 rounded-lg border transition-all text-center ${
                                    isSelected 
                                      ? 'border-furnili-brown bg-orange-50 dark:bg-orange-950/20 text-furnili-brown' 
                                      : 'border-gray-200 dark:border-gray-700 hover:border-furnili-brown/50'
                                  }`}
                                >
                                  <IconComponent className={`w-5 h-5 mx-auto mb-1 ${isSelected ? 'text-furnili-brown' : 'text-gray-600'}`} />
                                  <div className="text-xs font-medium">{layout.label}</div>
                                  <div className="text-xs text-gray-500">{layout.desc}</div>
                                </button>
                              );
                            })}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    </div>
                  )}

                  {/* Dimensions */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Calculator className="w-4 h-4" />
                      Dimensions
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="unitOfMeasure"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="mm">Millimeters (mm)</SelectItem>
                                <SelectItem value="ft">Feet (ft)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="projectId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Link to Project (Optional)</FormLabel>
                            <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select project" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {projects.map((project: any) => (
                                  <SelectItem key={project.id} value={project.id.toString()}>
                                    {project.name} ({project.code})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <FormField
                        control={form.control}
                        name="height"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Height</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="2400"
                                className="h-8 text-sm"
                                tabIndex={2}
                                value={field.value || ''}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="width"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Width</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="1200"
                                className="h-8 text-sm"
                                tabIndex={3}
                                value={field.value || ''}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="depth"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Depth</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="600"
                                className="h-8 text-sm"
                                tabIndex={4}
                                value={field.value || ''}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Materials */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Materials</h3>
                    <div className="grid grid-cols-3 gap-2">
                      <FormField
                        control={form.control}
                        name="boardType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Board Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs" tabIndex={5}>
                                  <SelectValue placeholder="Select board" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {boardTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="boardThickness"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Thickness</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-8 text-xs" tabIndex={6}>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {thicknessOptions.map((thickness) => (
                                  <SelectItem key={thickness.value} value={thickness.value}>
                                    {thickness.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="finish"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={`text-xs ${
                              isPreLamBoard ? 'text-muted-foreground' : ''
                            }`}>
                              Finish
                              {isPreLamBoard && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded text-[10px]">
                                  Pre-Applied
                                </span>
                              )}
                            </FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                              disabled={isPreLamBoard}
                            >
                              <FormControl>
                                <SelectTrigger className={`h-8 text-xs ${
                                  isPreLamBoard ? 'opacity-50 cursor-not-allowed bg-muted' : ''
                                }`} tabIndex={7}>
                                  <SelectValue placeholder={
                                    isPreLamBoard 
                                      ? "Laminate (Pre-Applied)" 
                                      : "Select finish"
                                  } />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {finishTypes.map((finish) => (
                                  <SelectItem key={finish.value} value={finish.value}>
                                    {finish.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {isPreLamBoard && (
                              <p className="text-[10px] text-muted-foreground mt-1">
                                Pre-Lam boards already have laminate finish applied during manufacturing
                              </p>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Configuration */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Configuration</h3>
                    <div className="grid grid-cols-2 gap-2">
                      
                  {/* Bed Type Selection */}
                  {selectedFurnitureType === 'bed' && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium flex items-center gap-2">
                        <Bed className="w-4 h-4" />
                        Bed Type
                      </h3>
                      <FormField
                        control={form.control}
                        name="partsConfig.bedType"
                        render={({ field }) => (
                          <FormItem>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { value: 'platform', label: 'Platform Bed', desc: 'Simple platform', icon: Bed },
                                { value: 'storage', label: 'Storage Bed', desc: 'Built-in storage', icon: Archive },
                                { value: 'hydraulic', label: 'Hydraulic Bed', desc: 'Gas lift storage', icon: ArrowLeftRight },
                                { value: 'standard', label: 'Standard Bed', desc: 'Traditional frame', icon: Home }
                              ].map((layout) => {
                                const IconComponent = layout.icon;
                                const isSelected = field.value === layout.value;
                                
                                return (
                                  <button
                                    key={layout.value}
                                    type="button"
                                    onClick={() => field.onChange(layout.value)}
                                    className={`p-2 rounded-lg border transition-all text-center ${
                                      isSelected 
                                        ? 'border-furnili-brown bg-orange-50 dark:bg-orange-950/20 text-furnili-brown' 
                                        : 'border-gray-200 dark:border-gray-700 hover:border-furnili-brown/50'
                                    }`}
                                  >
                                    <IconComponent className={`w-5 h-5 mx-auto mb-1 ${isSelected ? 'text-furnili-brown' : 'text-gray-600'}`} />
                                    <div className="text-xs font-medium">{layout.label}</div>
                                    <div className="text-xs text-gray-500">{layout.desc}</div>
                                  </button>
                                );
                              })}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Kitchen Layout Selection */}
                  {selectedFurnitureType === 'kitchen_cabinet' && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Kitchen Layout
                      </h3>
                      <FormField
                        control={form.control}
                        name="partsConfig.kitchenLayout"
                        render={({ field }) => (
                          <FormItem>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { value: 'straight', label: 'Straight', desc: 'Single wall', icon: Minus },
                                { value: 'L-shaped', label: 'L-Shaped', desc: 'Corner layout', icon: CornerDownRight },
                                { value: 'U-shaped', label: 'U-Shaped', desc: 'Three walls', icon: Archive },
                                { value: 'island', label: 'Island', desc: 'Central island', icon: Home },
                                { value: 'galley', label: 'Galley', desc: 'Parallel walls', icon: ArrowLeftRight }
                              ].map((layout) => {
                                const IconComponent = layout.icon;
                                const isSelected = field.value === layout.value;
                                
                                return (
                                  <button
                                    key={layout.value}
                                    type="button"
                                    onClick={() => field.onChange(layout.value)}
                                    className={`p-2 rounded-lg border transition-all text-center ${
                                      isSelected 
                                        ? 'border-furnili-brown bg-orange-50 dark:bg-orange-950/20 text-furnili-brown' 
                                        : 'border-gray-200 dark:border-gray-700 hover:border-furnili-brown/50'
                                    }`}
                                  >
                                    <IconComponent className={`w-5 h-5 mx-auto mb-1 ${isSelected ? 'text-furnili-brown' : 'text-gray-600'}`} />
                                    <div className="text-xs font-medium">{layout.label}</div>
                                    <div className="text-xs text-gray-500">{layout.desc}</div>
                                  </button>
                                );
                              })}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* TV Unit Type Selection */}
                  {selectedFurnitureType === 'tv_unit' && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium flex items-center gap-2">
                        <PanelTop className="w-4 h-4" />
                        TV Unit Type
                      </h3>
                      <FormField
                        control={form.control}
                        name="partsConfig.tvUnitType"
                        render={({ field }) => (
                          <FormItem>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { value: 'wall_mounted', label: 'Wall Mounted', desc: 'Floating unit', icon: PanelTop },
                                { value: 'floor_standing', label: 'Floor Standing', desc: 'Traditional stand', icon: Package },
                                { value: 'corner_unit', label: 'Corner Unit', desc: 'Space saving', icon: CornerDownRight }
                              ].map((layout) => {
                                const IconComponent = layout.icon;
                                const isSelected = field.value === layout.value;
                                
                                return (
                                  <button
                                    key={layout.value}
                                    type="button"
                                    onClick={() => field.onChange(layout.value)}
                                    className={`p-2 rounded-lg border transition-all text-center ${
                                      isSelected 
                                        ? 'border-furnili-brown bg-orange-50 dark:bg-orange-950/20 text-furnili-brown' 
                                        : 'border-gray-200 dark:border-gray-700 hover:border-furnili-brown/50'
                                    }`}
                                  >
                                    <IconComponent className={`w-5 h-5 mx-auto mb-1 ${isSelected ? 'text-furnili-brown' : 'text-gray-600'}`} />
                                    <div className="text-xs font-medium">{layout.label}</div>
                                    <div className="text-xs text-gray-500">{layout.desc}</div>
                                  </button>
                                );
                              })}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Storage Unit Type Selection */}
                  {selectedFurnitureType === 'storage_unit' && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium flex items-center gap-2">
                        <Archive className="w-4 h-4" />
                        Storage Type
                      </h3>
                      <FormField
                        control={form.control}
                        name="partsConfig.storageType"
                        render={({ field }) => (
                          <FormItem>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { value: 'wall_mounted', label: 'Wall Mounted', desc: 'Space saving', icon: PanelTop },
                                { value: 'floor_standing', label: 'Floor Standing', desc: 'Freestanding', icon: Package },
                                { value: 'built_in', label: 'Built-in', desc: 'Custom fit', icon: Home }
                              ].map((layout) => {
                                const IconComponent = layout.icon;
                                const isSelected = field.value === layout.value;
                                
                                return (
                                  <button
                                    key={layout.value}
                                    type="button"
                                    onClick={() => field.onChange(layout.value)}
                                    className={`p-2 rounded-lg border transition-all text-center ${
                                      isSelected 
                                        ? 'border-furnili-brown bg-orange-50 dark:bg-orange-950/20 text-furnili-brown' 
                                        : 'border-gray-200 dark:border-gray-700 hover:border-furnili-brown/50'
                                    }`}
                                  >
                                    <IconComponent className={`w-5 h-5 mx-auto mb-1 ${isSelected ? 'text-furnili-brown' : 'text-gray-600'}`} />
                                    <div className="text-xs font-medium">{layout.label}</div>
                                    <div className="text-xs text-gray-500">{layout.desc}</div>
                                  </button>
                                );
                              })}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {/* Bookshelf Type Selection */}
                  {selectedFurnitureType === 'bookshelf' && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium flex items-center gap-2">
                        <Table2 className="w-4 h-4" />
                        Bookshelf Type
                      </h3>
                      <FormField
                        control={form.control}
                        name="partsConfig.bookshelfType"
                        render={({ field }) => (
                          <FormItem>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { value: 'open_shelving', label: 'Open Shelving', desc: 'No doors', icon: Table2 },
                                { value: 'closed_cabinet', label: 'Closed Cabinet', desc: 'With doors', icon: DoorOpen },
                                { value: 'mixed_design', label: 'Mixed Design', desc: 'Open & closed', icon: Package }
                              ].map((layout) => {
                                const IconComponent = layout.icon;
                                const isSelected = field.value === layout.value;
                                
                                return (
                                  <button
                                    key={layout.value}
                                    type="button"
                                    onClick={() => field.onChange(layout.value)}
                                    className={`p-2 rounded-lg border transition-all text-center ${
                                      isSelected 
                                        ? 'border-furnili-brown bg-orange-50 dark:bg-orange-950/20 text-furnili-brown' 
                                        : 'border-gray-200 dark:border-gray-700 hover:border-furnili-brown/50'
                                    }`}
                                  >
                                    <IconComponent className={`w-5 h-5 mx-auto mb-1 ${isSelected ? 'text-furnili-brown' : 'text-gray-600'}`} />
                                    <div className="text-xs font-medium">{layout.label}</div>
                                    <div className="text-xs text-gray-500">{layout.desc}</div>
                                  </button>
                                );
                              })}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                      {/* Bed-specific configurations */}
                      {selectedFurnitureType === 'bed' && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <h3 className="text-sm font-medium flex items-center gap-2">
                              <Bed className="w-4 h-4" />
                              Bed Configuration
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                              <FormField
                                control={form.control}
                                name="partsConfig.storage"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Storage Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value || 'none'}>
                                      <FormControl>
                                        <SelectTrigger className="h-8 text-xs" tabIndex={8}>
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="none">No Storage</SelectItem>
                                        <SelectItem value="box_storage">Box Storage</SelectItem>
                                        <SelectItem value="hydraulic_storage">Hydraulic Gas Lift</SelectItem>
                                        <SelectItem value="side_drawers">Side Drawers (2)</SelectItem>
                                        <SelectItem value="underbed_drawers">Under-bed Drawers (4)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="partsConfig.drawers"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Drawers</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="0"
                                        max="8"
                                        className="h-8 text-xs"
                                        placeholder="2"
                                        tabIndex={9}
                                        {...field}
                                        value={field.value || ''}
                                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <FormField
                                control={form.control}
                                name="partsConfig.headboard"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Headboard</FormLabel>
                                    <FormControl>
                                      <div className="flex items-center space-x-2 border rounded-md p-2">
                                        <input
                                          type="checkbox"
                                          checked={field.value}
                                          onChange={field.onChange}
                                          className="h-4 w-4"
                                          tabIndex={10}
                                        />
                                        <span className="text-xs text-muted-foreground">Add headboard</span>
                                      </div>
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="partsConfig.footboard"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Footboard</FormLabel>
                                    <FormControl>
                                      <div className="flex items-center space-x-2 border rounded-md p-2">
                                        <input
                                          type="checkbox"
                                          checked={field.value}
                                          onChange={field.onChange}
                                          className="h-4 w-4"
                                          tabIndex={11}
                                        />
                                        <span className="text-xs text-muted-foreground">Add footboard</span>
                                      </div>
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Wardrobe-specific part configurations */}
                      {selectedFurnitureType === 'wardrobe' && (
                        <div className="col-span-2">
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                            {/* Only show shutters field for openable and sliding wardrobes */}
                            {form.watch('partsConfig.wardrobeType') !== 'walk_in' && (
                              <FormField
                                control={form.control}
                                name="partsConfig.shutterCount"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">
                                      Shutters
                                      {(() => {
                                        const type = form.watch('partsConfig.wardrobeType');
                                        if (type === 'sliding') return " (Min: 2)";
                                        return " (Min: 1)"; // openable
                                      })()} 
                                    </FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min={form.watch('partsConfig.wardrobeType') === 'sliding' ? "2" : "1"}
                                        max="6"
                                        className="h-8 text-xs"
                                        {...field}
                                        onChange={(e) => {
                                          const type = form.watch('partsConfig.wardrobeType');
                                          const value = parseInt(e.target.value) || 0;
                                          
                                          // Apply validation rules based on wardrobe type
                                          if (type === 'sliding') {
                                            field.onChange(Math.max(2, value));
                                          } else { // openable
                                            field.onChange(Math.max(1, value));
                                          }
                                        }}
                                        placeholder={form.watch('partsConfig.wardrobeType') === 'sliding' ? "≥2" : "≥1"}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            )}
                            
                            {/* Show info text for walk-in wardrobes */}
                            {form.watch('partsConfig.wardrobeType') === 'walk_in' && (
                              <div className="flex items-center justify-center p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                                Walk-in wardrobes don't use shutters
                              </div>
                            )}
                            <FormField
                              control={form.control}
                              name="partsConfig.shelfCount"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Shelves</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="0"
                                      max="15"
                                      className="h-8 text-xs"
                                      {...field}
                                      value={field.value || ''}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="partsConfig.drawerCount"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Drawers</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="0"
                                      max="8"
                                      className="h-8 text-xs"
                                      {...field}
                                      value={field.value || ''}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="partsConfig.hasLoft"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Loft</FormLabel>
                                  <FormControl>
                                    <div className="flex items-center space-x-2 border rounded-md p-2">
                                      <input
                                        type="checkbox"
                                        checked={field.value}
                                        onChange={field.onChange}
                                        className="h-4 w-4"
                                      />
                                      <span className="text-xs text-muted-foreground">Add loft</span>
                                    </div>
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="partsConfig.mirror"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Mirror</FormLabel>
                                  <FormControl>
                                    <div className="flex items-center space-x-2 border rounded-md p-2">
                                      <input
                                        type="checkbox"
                                        checked={field.value}
                                        onChange={field.onChange}
                                        className="h-4 w-4"
                                      />
                                      <span className="text-xs text-muted-foreground">Add mirror</span>
                                    </div>
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          {/* Loft Cupboard Sizing - Shows when loft is enabled */}
                          {form.watch('partsConfig.hasLoft') && (
                            <div className="col-span-2 space-y-2 mt-4">
                              <h4 className="text-sm font-medium text-furnili-brown">Loft Cupboard Dimensions</h4>
                              <div className="grid grid-cols-2 gap-2">
                                <FormField
                                  control={form.control}
                                  name="partsConfig.loftHeight"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">Loft Height (mm)</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          min="300"
                                          max="1000"
                                          placeholder="610"
                                          className="h-8 text-xs"
                                          {...field}
                                          value={field.value || ''}
                                          onChange={(e) => field.onChange(parseInt(e.target.value) || 610)}
                                        />
                                      </FormControl>
                                      <p className="text-[10px] text-muted-foreground">Recommended: 2ft (610mm) standard</p>
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="partsConfig.loftWidth"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-xs">Loft Width (mm)</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          min="300"
                                          max="2400"
                                          placeholder={`${form.watch('width') || 1200}`}
                                          className="h-8 text-xs"
                                          {...field}
                                          value={field.value || ''}
                                          onChange={(e) => field.onChange(parseInt(e.target.value) || form.watch('width') || 1200)}
                                        />
                                      </FormControl>
                                      <p className="text-[10px] text-muted-foreground">Defaults to wardrobe width</p>
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <Package className="w-4 h-4 text-blue-600" />
                                  <span className="text-xs font-medium text-blue-900 dark:text-blue-100">Loft Storage</span>
                                </div>
                                <p className="text-xs text-blue-700 dark:text-blue-200">
                                  The loft cupboard will be calculated with separate panels and materials. 
                                  Ideal for storing seasonal items or rarely used belongings.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Kitchen Cabinet configurations */}
                      {selectedFurnitureType === 'kitchen_cabinet' && (
                        <>
                          <FormField
                            control={form.control}
                            name="partsConfig.baseCabinets"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Base Cabinets</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="20"
                                    className="h-8 text-xs"
                                    {...field}
                                    value={field.value || ''}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="partsConfig.wallCabinets"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Wall Cabinets</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="15"
                                    className="h-8 text-xs"
                                    {...field}
                                    value={field.value || ''}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="partsConfig.drawers"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Drawers (Soft-close)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="20"
                                    className="h-8 text-xs"
                                    {...field}
                                    value={field.value || ''}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="partsConfig.pulloutShelves"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Pull-out Shelves</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="10"
                                    className="h-8 text-xs"
                                    {...field}
                                    value={field.value || ''}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <div className="col-span-2 grid grid-cols-3 gap-3">
                            <FormField
                              control={form.control}
                              name="partsConfig.lazySusan"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md border p-2">
                                  <FormControl>
                                    <input
                                      type="checkbox"
                                      checked={field.value}
                                      onChange={field.onChange}
                                      className="h-3 w-3"
                                    />
                                  </FormControl>
                                  <FormLabel className="text-xs">Lazy Susan</FormLabel>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="partsConfig.cornerUnit"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md border p-2">
                                  <FormControl>
                                    <input
                                      type="checkbox"
                                      checked={field.value}
                                      onChange={field.onChange}
                                      className="h-3 w-3"
                                    />
                                  </FormControl>
                                  <FormLabel className="text-xs">Corner Unit</FormLabel>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="partsConfig.island"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md border p-2">
                                  <FormControl>
                                    <input
                                      type="checkbox"
                                      checked={field.value}
                                      onChange={field.onChange}
                                      className="h-3 w-3"
                                    />
                                  </FormControl>
                                  <FormLabel className="text-xs">Island</FormLabel>
                                </FormItem>
                              )}
                            />
                          </div>
                        </>
                      )}

                      {/* TV Unit configurations */}
                      {selectedFurnitureType === 'tv_unit' && (
                        <>
                          <FormField
                            control={form.control}
                            name="partsConfig.tvSize"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">TV Size Support</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value || '55'}>
                                  <FormControl>
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="32">32" TV</SelectItem>
                                    <SelectItem value="43">43" TV</SelectItem>
                                    <SelectItem value="55">55" TV</SelectItem>
                                    <SelectItem value="65">65" TV</SelectItem>
                                    <SelectItem value="75">75" TV</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="partsConfig.glassShelf"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Tempered Glass Shelves</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="5"
                                    className="h-8 text-xs"
                                    {...field}
                                    value={field.value || ''}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="partsConfig.drawers"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Storage Drawers</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="6"
                                    className="h-8 text-xs"
                                    {...field}
                                    value={field.value || ''}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="partsConfig.cableManagement"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md border p-2">
                                <FormControl>
                                  <input
                                    type="checkbox"
                                    checked={field.value}
                                    onChange={field.onChange}
                                    className="h-3 w-3"
                                  />
                                </FormControl>
                                <FormLabel className="text-xs">Cable Management</FormLabel>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="partsConfig.ledLighting"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md border p-2">
                                <FormControl>
                                  <input
                                    type="checkbox"
                                    checked={field.value}
                                    onChange={field.onChange}
                                    className="h-3 w-3"
                                  />
                                </FormControl>
                                <FormLabel className="text-xs">RGB LED Strips</FormLabel>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="partsConfig.powerOutlets"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-2 space-y-0 rounded-md border p-2">
                                <FormControl>
                                  <input
                                    type="checkbox"
                                    checked={field.value}
                                    onChange={field.onChange}
                                    className="h-3 w-3"
                                  />
                                </FormControl>
                                <FormLabel className="text-xs">Built-in Power (4 Outlets + 2 USB)</FormLabel>
                              </FormItem>
                            )}
                          />
                        </>
                      )}

                      {/* Generic configurations for other furniture types */}
                      {(selectedFurnitureType === 'storage_unit' || selectedFurnitureType === 'bookshelf' || selectedFurnitureType === 'dresser') && (
                        <>
                          <FormField
                            control={form.control}
                            name="partsConfig.shelves"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Shelves</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="15"
                                    className="h-8 text-xs"
                                    {...field}
                                    value={field.value || ''}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="partsConfig.drawers"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Drawers</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="8"
                                    className="h-8 text-xs"
                                    {...field}
                                    value={field.value || ''}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          {selectedFurnitureType === 'storage_unit' && (
                            <FormField
                              control={form.control}
                              name="partsConfig.doors"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs">Doors</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="0"
                                      max="4"
                                      className="h-8 text-xs"
                                      {...field}
                                      value={field.value || ''}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          )}
                          <FormField
                            control={form.control}
                            name="partsConfig.backPanels"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Back Panels</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="2"
                                    className="h-8 text-xs"
                                    {...field}
                                    value={field.value || ''}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="partsConfig.exposedSides"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="text-xs font-normal">
                                    Exposed Left/Right Side
                                  </FormLabel>
                                  <p className="text-xs text-muted-foreground">
                                    Adds 2mm edge banding to side panel edges
                                  </p>
                                </div>
                              </FormItem>
                            )}
                          />

                          {/* Manufacturing Settings */}
                          <div className="col-span-2 mt-4">
                            <h4 className="text-xs font-medium text-gray-700 mb-3">Manufacturing Settings</h4>
                            <div className="grid grid-cols-2 gap-2">
                              
                              <FormField
                                control={form.control}
                                name="partsConfig.backThickness"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Back Panel (mm)</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        {...field}
                                        value={field.value || ""}
                                        onChange={(e) => field.onChange(Number(e.target.value))}
                                        className="h-8 text-xs"
                                        placeholder="6, 8, 9"
                                      />
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="partsConfig.slideColorance"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Slide Clearance (mm)</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        step="0.5"
                                        {...field}
                                        value={field.value || ""}
                                        onChange={(e) => field.onChange(Number(e.target.value))}
                                        className="h-8 text-xs"
                                        placeholder="12-13"
                                      />
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="partsConfig.boxThickness"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Box Thickness (mm)</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        {...field}
                                        value={field.value || ""}
                                        onChange={(e) => field.onChange(Number(e.target.value))}
                                        className="h-8 text-xs"
                                        placeholder="12, 15, 18"
                                      />
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="partsConfig.bottomThickness"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Bottom Panel (mm)</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        {...field}
                                        value={field.value || ""}
                                        onChange={(e) => field.onChange(Number(e.target.value))}
                                        className="h-8 text-xs"
                                        placeholder="6, 9"
                                      />
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="partsConfig.doorClearance"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs">Door Clearance (mm)</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        {...field}
                                        value={field.value || ""}
                                        onChange={(e) => field.onChange(Number(e.target.value))}
                                        className="h-8 text-xs"
                                        placeholder="10-15"
                                      />
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                  </FormItem>
                                )}
                              />

                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Custom Parts */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Custom Parts</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addCustomPart}
                          className="text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Part
                        </Button>
                      </div>
                      {customParts.map((part, index) => (
                        <div key={index} className="flex gap-2 items-center">
                          <Input
                            placeholder="Part name"
                            value={part.name}
                            onChange={(e) => updateCustomPart(index, 'name', e.target.value)}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            placeholder="Qty"
                            value={part.quantity}
                            onChange={(e) => updateCustomPart(index, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-16"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeCustomPart(index)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any additional specifications..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    data-testid="button-calculate-bom"
                    disabled={calculateBOMMutation.isPending}
                    className="w-full bg-[hsl(28,100%,25%)] hover:bg-[hsl(28,100%,20%)] text-white text-lg py-6"
                  >
                    {calculateBOMMutation.isPending ? "Calculating..." : "Calculate BOM"}
                    <Calculator className="w-5 h-5 ml-2" />
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

        {/* Results Section */}
        <div>
            {bomResult && bomResult.items ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <FileDown className="w-5 h-5 text-furnili-brown" />
                      BOM Results - {bomResult.calculationNumber}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport('excel')}
                        disabled={exportBOMMutation.isPending}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Excel
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExport('pdf')}
                        disabled={exportBOMMutation.isPending}
                      >
                        <FileDown className="w-4 h-4 mr-2" />
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleWhatsAppShare}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Share
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-4 bg-accent rounded-lg">
                      <p className="text-sm text-muted-foreground font-medium">Board Area</p>
                      <p className="text-xl font-bold text-foreground">{bomResult.totalBoardArea.toFixed(1)} sq.ft</p>
                    </div>
                    <div className="text-center p-4 bg-accent rounded-lg">
                      <p className="text-sm text-muted-foreground font-medium">Edge Band 2mm</p>
                      <p className="text-xl font-bold text-foreground">{(bomResult.totalEdgeBanding2mm * 0.3048).toFixed(1)} m</p>
                    </div>
                    <div className="text-center p-4 bg-accent rounded-lg">
                      <p className="text-sm text-muted-foreground font-medium">Edge Band 0.8mm</p>
                      <p className="text-xl font-bold text-foreground">{(bomResult.totalEdgeBanding0_8mm * 0.3048).toFixed(1)} m</p>
                    </div>
                    <div className="text-center p-4 bg-furnili-brown/10 rounded-lg">
                      <p className="text-sm text-furnili-brown font-medium">Total Cost</p>
                      <p className="text-2xl font-bold text-furnili-brown">{formatCurrency(bomResult.totalCost || 0)}</p>
                    </div>
                  </div>

                  {/* Enhanced Technical Drawing */}
                  <div className="mb-4">
                    {form.getValues('unitType') === 'wardrobe' ? (
                      <FabricWardrobe
                        width={form.getValues('width') || 1200}
                        height={form.getValues('height') || 1800}
                        depth={form.getValues('depth') || 600}
                        shelves={form.getValues('partsConfig.shelfCount') || form.getValues('partsConfig.shelves') || 4}
                        drawers={form.getValues('partsConfig.drawerCount') || form.getValues('partsConfig.drawers') || 2}
                        shutters={form.getValues('partsConfig.shutterCount') || form.getValues('partsConfig.shutters') || 2}
                        wardrobeType={form.getValues('partsConfig.wardrobeType') || 'openable'}
                        hasLoft={form.getValues('partsConfig.hasLoft') || false}
                        loftHeight={form.getValues('partsConfig.loftHeight') || 610}
                        loftWidth={form.getValues('partsConfig.loftWidth') || form.getValues('width') || 1200}
                        loftDepth={form.getValues('depth') || 600}
                        mirror={form.getValues('partsConfig.mirror') || false}
                        className="mx-auto max-w-4xl"
                      />
                    ) : (
                      <FurnitureTechnicalDrawing
                        bomResult={bomResult}
                        furnitureType={form.getValues('unitType')}
                        dimensions={{
                          width: form.getValues('width'),
                          height: form.getValues('height'),
                          depth: form.getValues('depth'),
                          unitOfMeasure: form.getValues('unitOfMeasure') || 'mm'
                        }}
                        configuration={{
                          shelves: form.getValues('partsConfig.shelfCount') || form.getValues('partsConfig.shelves') || 0,
                          drawers: form.getValues('partsConfig.drawerCount') || form.getValues('partsConfig.drawers') || 0,
                          shutters: form.getValues('partsConfig.shutterCount') || form.getValues('partsConfig.shutters') || 0,
                          doors: form.getValues('partsConfig.doors') || 0,
                          wardrobeType: form.getValues('partsConfig.wardrobeType') || 'openable',
                          ...form.getValues('partsConfig')
                        }}
                      />
                    )}
                  </div>

                  {/* Consolidated Material Purchase List */}
                  {/* Material Purchase Requirements - Superior Format */}
                  <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-600" />
                        Material Purchase Requirements
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Board Sheets Summary */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm">
                          <h4 className="font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">Sheets Required by Thickness</h4>
                          <div className="space-y-3">
                            {bomResult.purchaseRequirements?.boards ? (
                              bomResult.purchaseRequirements.boards.map((board) => (
                                <div key={`${board.thickness}-${board.material}`}>
                                  <div className="text-3xl font-bold text-blue-600">{board.sheets_8x4} sheets</div>
                                  <div className="text-xs text-gray-500 space-y-1">
                                    <div>Efficiency: {board.utilization_percent}%</div>
                                    <div>Total Area: {Math.round(board.area_sqft)} sq.ft</div>
                                    <div>Standard 8' x 4' sheets</div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div>
                                <div className="text-3xl font-bold text-blue-600">{Math.ceil(bomResult.totalBoardArea / 32)} sheets</div>
                                <div className="text-xs text-gray-500 space-y-1">
                                  <div>Efficiency: 89%</div>
                                  <div>Total Area: {Math.round(bomResult.totalBoardArea)} sq.ft</div>
                                  <div>Standard 8' x 4' sheets</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 2mm Edge Banding */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm">
                          <h4 className="font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">2mm Edge Banding</h4>
                          <div className="space-y-2">
                            {bomResult.purchaseRequirements?.edgeBanding?.find(eb => eb.type === '2mm') ? (
                              (() => {
                                const edgeBand2mm = bomResult.purchaseRequirements.edgeBanding.find(eb => eb.type === '2mm')!;
                                return (
                                  <div>
                                    <div className="text-3xl font-bold text-green-600">1 rolls</div>
                                    <div className="text-xs text-gray-500 space-y-1">
                                      <div>Net Length: {edgeBand2mm.length_m.toFixed(1)} m</div>
                                      <div>With 5% wastage: {(edgeBand2mm.length_m * 1.05).toFixed(1)} m</div>
                                      <div>Standard roll: 50m</div>
                                    </div>
                                  </div>
                                );
                              })()
                            ) : (
                              <div>
                                <div className="text-3xl font-bold text-green-600">1 rolls</div>
                                <div className="text-xs text-gray-500 space-y-1">
                                  <div>Net Length: {(bomResult.totalEdgeBanding2mm * 0.3048).toFixed(1)} m</div>
                                  <div>With 5% wastage: {(bomResult.totalEdgeBanding2mm * 0.3048 * 1.05).toFixed(1)} m</div>
                                  <div>Standard roll: 50m</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 0.8mm Edge Banding */}
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm">
                          <h4 className="font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">0.8mm Edge Banding</h4>
                          <div className="space-y-2">
                            {bomResult.purchaseRequirements?.edgeBanding?.find(eb => eb.type === '0.8mm') ? (
                              (() => {
                                const edgeBand08mm = bomResult.purchaseRequirements.edgeBanding.find(eb => eb.type === '0.8mm')!;
                                return (
                                  <div>
                                    <div className="text-3xl font-bold text-purple-600">1 rolls</div>
                                    <div className="text-xs text-gray-500 space-y-1">
                                      <div>Net Length: {edgeBand08mm.length_m.toFixed(1)} m</div>
                                      <div>With 5% wastage: {(edgeBand08mm.length_m * 1.05).toFixed(1)} m</div>
                                      <div>Standard roll: 50m</div>
                                    </div>
                                  </div>
                                );
                              })()
                            ) : (
                              <div>
                                <div className="text-3xl font-bold text-purple-600">1 rolls</div>
                                <div className="text-xs text-gray-500 space-y-1">
                                  <div>Net Length: {(bomResult.totalEdgeBanding0_8mm * 0.3048).toFixed(1)} m</div>
                                  <div>With 5% wastage: {(bomResult.totalEdgeBanding0_8mm * 0.3048 * 1.05).toFixed(1)} m</div>
                                  <div>Standard roll: 50m</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quick Purchase Summary */}
                      <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg border border-green-200 dark:border-green-800">
                        <h4 className="font-medium text-green-800 dark:text-green-300 mb-2">Quick Purchase Summary</h4>
                        <div className="text-sm text-green-700 dark:text-green-400 space-y-1">
                          {bomResult.purchaseRequirements?.boards ? (
                            bomResult.purchaseRequirements.boards.map((board, index) => (
                              <div key={index}>• {board.sheets_8x4} sheets of {board.thickness} {board.material} board (optimized cutting)</div>
                            ))
                          ) : (
                            <div>• {Math.ceil(bomResult.totalBoardArea / 32)} sheets of ply board (optimized cutting)</div>
                          )}
                          {bomResult.purchaseRequirements?.edgeBanding?.map((eb, index) => (
                            <div key={index}>• 1 rolls of {eb.type} edge banding</div>
                          )) || (
                            <>
                              <div>• 1 rolls of 2mm edge banding</div>
                              <div>• 1 rolls of 0.8mm edge banding</div>
                            </>
                          )}
                          {bomResult.purchaseRequirements?.laminates?.map((lam, index) => (
                            <div key={index}>• {lam.sheets || Math.ceil(lam.area_sqft / 32)} pieces {lam.kind} laminate ({Math.round(lam.area_sqft)} sqft)</div>
                          ))}
                          {bomResult.purchaseRequirements?.hardware && (
                            <div>• {bomResult.purchaseRequirements.hardware.reduce((sum, hw) => sum + hw.qty, 0)} pieces hardware</div>
                          )}
                        </div>
                      </div>

                      {/* Cutting List Optimization Note */}
                      <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <p className="text-sm text-amber-800 dark:text-amber-300">
                          <strong>💡 Cutting List Optimization:</strong> Sheet counts include wastage allowance. For precise nesting and cutting optimization, use CAD software like OptiCut or consult your panel supplier. Actual sheets required may vary based on cutting efficiency.
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Bill of Materials with Tabs */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-medium">Bill of Materials</h3>
                    </div>
                    
                    {/* Tabs */}
                    <div className="border-b border-gray-200">
                      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <button
                          onClick={() => setBomViewMode('consolidated')}
                          className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                            bomViewMode === 'consolidated'
                              ? 'border-furnili-brown text-furnili-brown'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          Consolidated View
                        </button>
                        <button
                          onClick={() => setBomViewMode('details')}
                          className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                            bomViewMode === 'details'
                              ? 'border-furnili-brown text-furnili-brown'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                        >
                          Details View
                        </button>
                      </nav>
                    </div>
                    
                    {/* Consolidated View */}
                    {bomViewMode === 'consolidated' && (
                      <div className="overflow-x-auto">
                        <Table className="text-sm border-collapse">
                          <TableHeader>
                            <TableRow className="bg-muted/50 h-8 border-b">
                              <TableHead className="py-1 px-2 text-xs font-semibold">Material / Item</TableHead>
                              <TableHead className="py-1 px-2 text-xs font-semibold">Qty (Pcs/Nos)</TableHead>
                              <TableHead className="py-1 px-2 text-xs font-semibold">Area (sqft)</TableHead>
                              <TableHead className="py-1 px-2 text-xs font-semibold text-right">Rate (₹)</TableHead>
                              <TableHead className="py-1 px-2 text-xs font-semibold text-right">Cost (₹)</TableHead>
                              <TableHead className="py-1 px-2 text-xs font-semibold text-center w-8"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {/* ✅ USE BACKEND CONSOLIDATED ITEMS (actual sheet purchase requirements) */}
                            {(bomResult.consolidatedItems || getOrderedConsolidatedMaterials(bomResult.items)).map((item) => (
                            <TableRow key={item.partName || item.name} className="hover:bg-muted/20 h-7 border-b border-gray-100">
                              <TableCell className="py-1 px-2 text-sm font-medium">
                                {/* ✅ Handle both consolidatedItems (from backend) and grouped items (fallback) */}
                                {item.partName || item.materialType || item.name}
                              </TableCell>
                              <TableCell className="py-1 px-2 text-sm">
                                {/* ✅ Display correct quantity with unit */}
                                {item.quantity !== undefined ? (
                                  // Backend consolidatedItems format
                                  `${Math.round(item.quantity)} ${item.unit || 'pieces'}`
                                ) : item.totalQty > 0 ? (
                                  // Fallback grouped items format  
                                  item.isBoard ? (
                                    (() => {
                                      const sheetLength = parseFloat('8' || '8');
                                      const sheetWidth = parseFloat('4' || '4'); 
                                      const wastage = parseFloat('10' || '10') / 100;
                                      const sheetArea = sheetLength * sheetWidth;
                                      const sheetsNeeded = Math.ceil((item.totalArea * (1 + wastage)) / sheetArea);
                                      return `${sheetsNeeded} sheets (${item.totalArea.toFixed(0)} sqft)`;
                                    })()
                                  ) : item.unit === 'meters' || item.unit === 'sqft' ? 
                                    `${item.totalQty.toFixed(2)} ${item.unit}` :
                                    `${Math.round(item.totalQty)} ${item.unit}`
                                ) : (
                                  '—'
                                )}
                              </TableCell>
                              <TableCell className="py-1 px-2 text-sm">
                                {/* ✅ Handle area from both formats */}
                                {(item.area_sqft || item.totalArea) > 0 ? 
                                  `${(item.area_sqft || item.totalArea).toFixed(0)} sqft` : '—'}
                              </TableCell>
                              <TableCell className="py-1 px-2 text-sm text-right">
                                {/* ✅ Handle rate from both formats */}
                                {(item.unitRate || item.avgRate) > 0 ? 
                                  Math.round(item.unitRate || item.avgRate) : '—'}
                              </TableCell>
                              <TableCell className="py-1 px-2 text-sm text-right font-medium">
                                {/* ✅ Handle cost from both formats */}
                                {Math.round(item.totalCost || 0).toLocaleString('en-IN')}
                              </TableCell>
                              <TableCell className="py-1 px-2 text-center">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle>Detailed Breakdown - {item.partName || item.materialType || item.name}</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div className="bg-muted/30 p-4 rounded-lg">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                          <div>
                                            <span className="text-muted-foreground">Total Quantity:</span>
                                            <div className="font-semibold">
                                              {item.quantity !== undefined ? 
                                                `${Math.round(item.quantity)} ${item.unit || 'pieces'}` :
                                                `${item.totalQty} ${item.unit}`
                                              }
                                            </div>
                                          </div>
                                          {(item.area_sqft || item.totalArea) > 0 && (
                                            <div>
                                              <span className="text-muted-foreground">Total Area:</span>
                                              <div className="font-semibold">{(item.area_sqft || item.totalArea).toFixed(1)} sqft</div>
                                            </div>
                                          )}
                                          <div>
                                            <span className="text-muted-foreground">Rate:</span>
                                            <div className="font-semibold">₹{Math.round(item.unitRate || item.avgRate)}</div>
                                          </div>
                                          <div>
                                            <span className="text-muted-foreground">Total Cost:</span>
                                            <div className="font-semibold text-[hsl(28,100%,25%)]">₹{(item.totalCost || 0).toLocaleString('en-IN')}</div>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div className="overflow-x-auto">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead>Part Name</TableHead>
                                              <TableHead>Size (mm)</TableHead>
                                              <TableHead>Qty</TableHead>
                                              <TableHead>Edge Band</TableHead>
                                              <TableHead className="text-right">Rate</TableHead>
                                              <TableHead className="text-right">Amount</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {/* ✅ Handle both consolidated items and grouped items */}
                                            {item.items ? (
                                              // Grouped items with breakdown
                                              item.items.map((subItem: any) => (
                                                <TableRow key={subItem.id}>
                                                  <TableCell className="font-medium">{subItem.partName}</TableCell>
                                                  <TableCell>
                                                    {subItem.length && subItem.width ? 
                                                      `${subItem.length} × ${subItem.width}` : 
                                                      '-'
                                                    }
                                                  </TableCell>
                                                  <TableCell>{subItem.quantity} {subItem.unit}</TableCell>
                                                  <TableCell>
                                                    {subItem.edgeBandingType ? (
                                                      <Badge variant="outline" className="text-xs">{subItem.edgeBandingType}</Badge>
                                                    ) : '-'}
                                                  </TableCell>
                                                  <TableCell className="text-right">{formatCurrency(subItem.unitRate)}</TableCell>
                                                  <TableCell className="text-right font-medium">{formatCurrency(subItem.totalCost)}</TableCell>
                                                </TableRow>
                                              ))
                                            ) : (
                                              // Single consolidated item (like sheet purchase requirement)
                                              <TableRow>
                                                <TableCell className="font-medium">{item.partName || item.materialType}</TableCell>
                                                <TableCell>
                                                  {item.length && item.width ? 
                                                    `${item.length} × ${item.width}` : 
                                                    'Standard Sheet'
                                                  }
                                                </TableCell>
                                                <TableCell>{Math.round(item.quantity || 0)} {item.unit || 'pieces'}</TableCell>
                                                <TableCell>
                                                  {item.edgeBandingType && item.edgeBandingType !== 'None' ? (
                                                    <Badge variant="outline" className="text-xs">{item.edgeBandingType}</Badge>
                                                  ) : '-'}
                                                </TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.unitRate || 0)}</TableCell>
                                                <TableCell className="text-right font-medium">{formatCurrency(item.totalCost || 0)}</TableCell>
                                              </TableRow>
                                            )}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </TableCell>
                            </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* Details View */}
                    {bomViewMode === 'details' && (
                      <div className="space-y-6">
                        {/* Sheet Optimization Summary */}
                        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                          <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                              <Layers className="w-5 h-5 text-blue-600" />
                              Sheet Optimization & Nesting Analysis
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* Total Sheets Required */}
                              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm">
                                <h4 className="font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">Total Sheets Required</h4>
                                <div className="text-3xl font-bold text-blue-600 mb-1">
                                  {bomResult.details?.sheetOptimization?.sheets_required || 
                                   bomResult.sheetOptimization?.totalSheets || 0}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Standard 8' × 4' sheets
                                </div>
                              </div>
                              
                              {/* Nesting Efficiency */}
                              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm">
                                <h4 className="font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">Nesting Efficiency</h4>
                                <div className="text-3xl font-bold text-green-600 mb-1">
                                  {bomResult.details?.sheetOptimization?.efficiency || 
                                   bomResult.sheetOptimization?.efficiency || 85}%
                                </div>
                                <div className="text-xs text-gray-500">
                                  Material utilization
                                </div>
                              </div>
                              
                              {/* Waste Area */}
                              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border shadow-sm">
                                <h4 className="font-medium text-sm mb-2 text-gray-700 dark:text-gray-300">Estimated Waste</h4>
                                <div className="text-3xl font-bold text-orange-600 mb-1">
                                  {Math.round(bomResult.details?.sheetOptimization?.waste_sqft || 0)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  sq.ft (12% cutting loss)
                                </div>
                              </div>
                            </div>
                            
                            {/* Sheet Breakdown by Thickness */}
                            <div className="mt-4">
                              <h4 className="font-medium text-sm mb-3 text-gray-700 dark:text-gray-300">Sheet Requirements by Thickness</h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {Object.entries(bomResult.boardAreaByThickness || {}).map(([thickness, area]) => {
                                  // Use server data for sheets and efficiency
                                  const sheetsNeeded = bomResult.details?.sheetOptimization?.sheets_by_thickness?.[thickness] || 
                                                     Math.ceil((area * 1.12) / 32); // fallback
                                  const efficiency = sheetsNeeded > 0 ? Math.min(100, (area / (sheetsNeeded * 32)) * 100) : 0;
                                  
                                  return (
                                    <div key={thickness} className="bg-gray-50 dark:bg-gray-700 p-3 rounded border">
                                      <div className="text-lg font-bold text-gray-800 dark:text-gray-200">{sheetsNeeded}</div>
                                      <div className="text-xs text-gray-600 dark:text-gray-400">{thickness} sheets</div>
                                      <div className="text-xs text-green-600">{Math.round(efficiency)}% efficient</div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Detailed Panel List */}
                        <div className="overflow-x-auto">
                          <Table className="text-sm border-collapse">
                            <TableHeader>
                              <TableRow className="bg-muted/50 h-8 border-b">
                                <TableHead className="py-1 px-2 text-xs font-semibold">Part Name</TableHead>
                                <TableHead className="py-1 px-2 text-xs font-semibold">Size (L×W mm)</TableHead>
                                <TableHead className="py-1 px-2 text-xs font-semibold">Material</TableHead>
                                <TableHead className="py-1 px-2 text-xs font-semibold">Qty</TableHead>
                                <TableHead className="py-1 px-2 text-xs font-semibold">Edge Band</TableHead>
                                <TableHead className="py-1 px-2 text-xs font-semibold">Area (sqft)</TableHead>
                                <TableHead className="py-1 px-2 text-xs font-semibold">Sheet Fit</TableHead>
                                <TableHead className="py-1 px-2 text-xs font-semibold text-right">Rate (₹)</TableHead>
                                <TableHead className="py-1 px-2 text-xs font-semibold text-right">Cost (₹)</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {bomResult.items.map((item) => {
                                // Calculate if panel fits in standard sheet
                                const panelLength = item.length || 0;
                                const panelWidth = item.width || 0;
                                // 🎯 CORRECT OVERSIZE CHECK: Check if panel fits in 2440x1220 sheet
                                const sheetLength = 2440; // 8 feet
                                const sheetWidth = 1220;  // 4 feet  
                                const fitsInSheet = (panelLength <= sheetLength && panelWidth <= sheetWidth) ||
                                                  (panelLength <= sheetWidth && panelWidth <= sheetLength);
                                
                                const panelsPerSheet = fitsInSheet ? 
                                  Math.max(Math.floor((sheetLength / panelLength) * (sheetWidth / panelWidth)),
                                           Math.floor((sheetLength / panelWidth) * (sheetWidth / panelLength))) || 1 : 0;
                                
                                return (
                                  <TableRow key={item.id} className="hover:bg-muted/20 h-7 border-b border-gray-100">
                                    <TableCell className="py-1 px-2 text-sm font-medium">{item.partName}</TableCell>
                                    <TableCell className="py-1 px-2 text-sm">
                                      {item.length && item.width ? 
                                        `${Math.round(item.length)} × ${Math.round(item.width)}` : 
                                        '-'
                                      }
                                    </TableCell>
                                    <TableCell className="py-1 px-2 text-sm">{item.materialType}</TableCell>
                                    <TableCell className="py-1 px-2 text-sm">{item.quantity} {item.unit}</TableCell>
                                    <TableCell className="py-1 px-2 text-sm">
                                      {item.edgeBandingType ? (
                                        <Badge variant="outline" className="text-xs">{item.edgeBandingType}</Badge>
                                      ) : '-'}
                                    </TableCell>
                                    <TableCell className="py-1 px-2 text-sm">
                                      {item.area_sqft ? `${item.area_sqft.toFixed(1)}` : '-'}
                                    </TableCell>
                                    <TableCell className="py-1 px-2 text-sm">
                                      {item.length && item.width ? (
                                        <div className="flex items-center gap-1">
                                          <div className={`w-2 h-2 rounded-full ${fitsInSheet ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                          <span className="text-xs">
                                            {fitsInSheet ? `${panelsPerSheet}/sheet` : 'Oversized'}
                                          </span>
                                        </div>
                                      ) : '-'}
                                    </TableCell>
                                    <TableCell className="py-1 px-2 text-sm text-right">
                                      {item.unitRate > 0 ? Math.round(item.unitRate) : '-'}
                                    </TableCell>
                                    <TableCell className="py-1 px-2 text-sm text-right font-medium">
                                      {Math.round(item.totalCost).toLocaleString('en-IN')}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                    
                    {/* Total Cost Row */}
                    <div className="flex justify-end pt-4 border-t">
                      <div className="flex items-center gap-3 text-xl font-bold">
                        <span>Total Cost:</span>
                        <span className="text-[hsl(28,100%,25%)] flex items-center gap-2">
                          ₹ {bomResult.totalCost?.toLocaleString('en-IN') || '0'}
                          <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
                            <span className="text-white text-sm">✓</span>
                          </div>
                        </span>
                      </div>
                    </div>

                    {/* Cost Summary */}
                    <div className="border-t pt-4">
                      <div className="flex justify-end">
                        <div className="w-full md:w-1/2">
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Material Cost:</span>
                              <span>{formatCurrency(bomResult.totalMaterialCost || 0)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Hardware Cost:</span>
                              <span>{formatCurrency(bomResult.totalHardwareCost || 0)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-bold text-lg border-t pt-2">
                              <span>Sub Total:</span>
                              <span className="text-furnili-brown">{formatCurrency(bomResult.totalCost || 0)}</span>
                            </div>
                          </div>
                          
                          {/* Variable Cost Section */}
                          <div className="space-y-3 mt-6">
                            <h4 className="font-medium text-furnili-brown">Additional Costs</h4>
                            
                            <div className="space-y-2">
                              {/* Labour Cost */}
                              <div className="flex justify-between items-center gap-2">
                                <label className="text-sm font-medium">Labour Cost:</label>
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    value={variableCosts.laborCost || ''}
                                    onChange={(e) => setVariableCosts({
                                      ...variableCosts,
                                      laborCost: parseFloat(e.target.value) || 0
                                    })}
                                    className="w-20 h-7 text-right text-xs"
                                  />
                                  <Select 
                                    value={variableCosts.laborCostType} 
                                    onValueChange={(value: 'fixed' | 'percent') => 
                                      setVariableCosts({...variableCosts, laborCostType: value})
                                    }
                                  >
                                    <SelectTrigger className="w-16 h-7 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="fixed">₹</SelectItem>
                                      <SelectItem value="percent">%</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              
                              {/* Transport Cost */}
                              <div className="flex justify-between items-center gap-2">
                                <label className="text-sm font-medium">Transport Cost:</label>
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    value={variableCosts.transportCost || ''}
                                    onChange={(e) => setVariableCosts({
                                      ...variableCosts,
                                      transportCost: parseFloat(e.target.value) || 0
                                    })}
                                    className="w-20 h-7 text-right text-xs"
                                  />
                                  <Select 
                                    value={variableCosts.transportCostType} 
                                    onValueChange={(value: 'fixed' | 'percent') => 
                                      setVariableCosts({...variableCosts, transportCostType: value})
                                    }
                                  >
                                    <SelectTrigger className="w-16 h-7 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="fixed">₹</SelectItem>
                                      <SelectItem value="percent">%</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                            
                            {/* Final Cost Summary with GST */}
                            <div className="border-t pt-3 space-y-2">
                              {(() => {
                                const materialCost = bomResult.totalCost || 0;
                                const laborAmount = variableCosts.laborCostType === 'percent' 
                                  ? materialCost * (variableCosts.laborCost / 100)
                                  : variableCosts.laborCost;
                                const transportAmount = variableCosts.transportCostType === 'percent'
                                  ? materialCost * (variableCosts.transportCost / 100)
                                  : variableCosts.transportCost;
                                const subtotal = materialCost + laborAmount + transportAmount;
                                const gstAmount = subtotal * 0.18;
                                const finalTotal = subtotal + gstAmount;
                                
                                return (
                                  <>
                                    <div className="flex justify-between text-sm">
                                      <span>Materials + Labour + Transport:</span>
                                      <span>{formatCurrency(subtotal)}</span>
                                    </div>
                                    
                                    <div className="flex justify-between text-sm text-orange-600">
                                      <span>GST (18%):</span>
                                      <span>{formatCurrency(gstAmount)}</span>
                                    </div>
                                    
                                    <div className="flex justify-between font-bold text-xl border-t pt-2 text-furnili-brown">
                                      <span>Final Total Cost:</span>
                                      <span>{formatCurrency(finalTotal)}</span>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                          
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Calculator className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground mb-2">No Calculations Yet</h3>
                  <p className="text-muted-foreground">Fill in the form and calculate to see your BOM results here.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </ResponsiveLayout>
  );
}