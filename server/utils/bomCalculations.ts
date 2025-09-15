// BOM Calculation Engine
// Based on the provided specifications for furniture calculation

// Constants for sheet optimization and calculations
export const SHEET_MM = { L: 2440, W: 1220 };  // 8x4 ft sheet
export const SHEET_AREA_SQFT = 32;
export const DEFAULT_WASTAGE_PCT = 0.12;  // server-side only
export const KERF_MM = 3;
export const MARGIN_MM = 10;
export const MM2_TO_SQFT = 1/92903.04;

// Helper functions
const mm2ToSqft = (mm2: number) => mm2 * MM2_TO_SQFT;

function partAreaSqft(w: number, h: number, qty = 1) {
  return mm2ToSqft(w * h) * qty;
}

// edges ∈ {0,1,2,3,4}; returns mm of banding
function bandPerimeterMm(w: number, h: number, edges: 0|1|2|3|4) {
  const perim = 2 * (w + h);
  return edges === 0 ? 0 : perim * (edges / 4);
}

// Standardized edge banding roll calculation: meters → rolls
// Formula: Math.ceil((meters * 1.05) / 50) - applies 5% wastage and 50m/roll
function edgeBandingRolls(meters: number): number {
  return Math.ceil((meters * 1.05) / 50);
}

// shutter gap for splits (e.g. 3mm between shutters)
const SHUTTER_GAP_MM = 3;

// hinge count heuristic
const hingesForHeight = (h: number) => h <= 1200 ? 2 : (h <= 1800 ? 3 : 4);

interface CalculationInput {
  unitType: string;
  height: number; // mm
  width: number; // mm
  depth: number; // mm
  unitOfMeasure: string;
  partsConfig: {
    shelves: number;
    drawers: number;
    shutters: number;
    doors: number;
    backPanels: number;
    customParts: Array<{ name: string; quantity: number }>;
  };
  boardType: string;
  boardThickness: string;
  finish: string;
}

interface Panel {
  panel: string;
  qty: number;
  size?: string; // "2100mm x 450mm"
  length: number; // mm
  width: number; // mm
  material?: string; // legacy property
  materialType?: string; // current property used in wardrobe BOM
  edge_banding?: string; // "2mm" or "0.8mm"
  area_sqft: number;
  edgeBandingLength?: number; // in feet
}

interface Hardware {
  item: string;
  qty: number;
  unit_rate: number;
  total_cost: number;
}

interface PurchaseRequirements {
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
    rolls_needed?: number; // using standardized formula: Math.ceil((meters * 1.05) / 50)
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
}

interface SheetOptimizationDetails {
  sheets_by_thickness: { [thickness: string]: number };
  sheets_required: number;
  efficiency: number;
  nesting_layout: any[];
  waste_sqft: number;
}

interface BOMResult {
  panels: Panel[];
  hardware: Hardware[];
  material_cost: number;
  hardware_cost: number;
  total_cost: number;
  totalBoardArea: number;
  boardAreaByThickness: { [thickness: string]: number };
  totalEdgeBanding2mm: number;
  totalEdgeBanding0_8mm: number;
  // NEW: Purchase-oriented aggregated data
  purchaseRequirements?: PurchaseRequirements;
  consolidatedItems?: ConsolidatedItem[];
  details?: {
    sheetOptimization: SheetOptimizationDetails;
  };
  // Enhanced modular furniture specific results
  sheet_optimization?: {
    sheets_required: number;
    efficiency: number;
    waste_allowance: number;
  };
  cost_breakdown?: {
    material_costs: { [category: string]: number };
    labor_estimate: number;
    overhead_percentage: number;
    profit_margin: number;
  };
  manufacturing_notes?: string[];
}

// 🎯 PURCHASE-ORIENTED BOM AGGREGATION - Convert panel-centric data to material-centric summaries
function computeAggregates(result: BOMResult, laminateResult?: any, sheetOptimization?: any): {
  purchaseRequirements: PurchaseRequirements;
  consolidatedItems: ConsolidatedItem[];
  details: { sheetOptimization: SheetOptimizationDetails };
} {
  const { panels, hardware, boardAreaByThickness } = result;

  // 1. GROUP BOARDS BY THICKNESS
  const boardGroups: { [key: string]: { area_sqft: number; sheets: number; rate: number; material: string } } = {};
  
  Object.entries(boardAreaByThickness).forEach(([thicknessKey, area_sqft]) => {
    const thickness = thicknessKey.replace('mm PLY', 'mm');
    const material = thicknessKey.includes('MDF') ? 'MDF' : 'PLY';
    
    // Calculate sheet count (standard 8'x4' = 32 sqft sheet)
    const sheetArea = 32; // 8ft x 4ft = 32 sqft
    const sheets = Math.ceil(area_sqft / sheetArea);
    
    // Get rate from defaults
    const rateKey = `${thickness.replace('mm', 'mm_')}_${material.toLowerCase()}` as keyof typeof DEFAULT_RATES.board;
    const rate = DEFAULT_RATES.board[rateKey] || 100;
    
    boardGroups[thickness] = {
      area_sqft,
      sheets,
      rate,
      material
    };
  });

  // 2. CALCULATE LAMINATE REQUIREMENTS
  const laminates: PurchaseRequirements['laminates'] = [];
  if (laminateResult) {
    if (laminateResult.outerLaminateArea > 0) {
      laminates.push({
        kind: 'outer',
        area_sqft: laminateResult.outerLaminateArea,
        sheets: Math.ceil(laminateResult.outerLaminateArea / 32),
        rate: DEFAULT_RATES.laminate.outer_laminate,
        cost: laminateResult.outerLaminateArea * DEFAULT_RATES.laminate.outer_laminate
      });
    }
    if (laminateResult.innerLaminateArea > 0) {
      laminates.push({
        kind: 'inner', 
        area_sqft: laminateResult.innerLaminateArea,
        sheets: Math.ceil(laminateResult.innerLaminateArea / 32),
        rate: DEFAULT_RATES.laminate.inner_laminate,
        cost: laminateResult.innerLaminateArea * DEFAULT_RATES.laminate.inner_laminate
      });
    }
  }

  // 3. EDGE BANDING REQUIREMENTS
  const edgeBanding: PurchaseRequirements['edgeBanding'] = [];
  
  if (result.totalEdgeBanding2mm > 0) {
    const length_m = result.totalEdgeBanding2mm * 0.3048; // Convert feet to meters
    const rolls_needed = edgeBandingRolls(length_m); // Use standardized formula
    edgeBanding.push({
      type: '2mm',
      length_m,
      rolls_needed,
      rate: DEFAULT_RATES.edge_banding['2mm'],
      cost: rolls_needed * 50 * DEFAULT_RATES.edge_banding['2mm'] // cost per 50m roll
    });
  }
  
  if (result.totalEdgeBanding0_8mm > 0) {
    const length_m = result.totalEdgeBanding0_8mm * 0.3048; // Convert feet to meters
    const rolls_needed = edgeBandingRolls(length_m); // Use standardized formula
    edgeBanding.push({
      type: '0.8mm',
      length_m,
      rolls_needed,
      rate: DEFAULT_RATES.edge_banding['0.8mm'],
      cost: rolls_needed * 50 * DEFAULT_RATES.edge_banding['0.8mm'] // cost per 50m roll
    });
  }

  // 4. HARDWARE REQUIREMENTS
  const hardwareItems = hardware.map(hw => ({
    item: hw.item,
    qty: hw.qty,
    rate: hw.unit_rate,
    cost: hw.total_cost
  }));

  // 5. ADHESIVES CALCULATION
  const totalLaminateArea = laminates.reduce((sum, lam) => sum + lam.area_sqft, 0);
  const adhesiveBottles = Math.ceil(totalLaminateArea / DEFAULT_RATES.laminate.adhesive_coverage_sqft_per_bottle);
  const adhesives = {
    bottles: adhesiveBottles,
    rate: DEFAULT_RATES.laminate.adhesive_bottle_price,
    cost: adhesiveBottles * DEFAULT_RATES.laminate.adhesive_bottle_price
  };

  // 6. PURCHASE REQUIREMENTS SUMMARY
  const boards = Object.entries(boardGroups).map(([thickness, data]) => {
    // When advanced nesting is used, don't show separate sheet counts by thickness
    // because nesting mixes thicknesses on same sheets for optimal cutting
    const showSeparateSheetCount = !sheetOptimization?.sheets_by_thickness;
    
    // Use simple calculation for display when no nesting data available
    const sheetsToUse = showSeparateSheetCount ? data.sheets : 0;
    
    const utilization = sheetOptimization ? 
      // Use overall efficiency for all thicknesses when nesting is used
      Math.min(100, sheetOptimization.efficiency || 85) : 85; // Cap at 100%
    
    return {
      material: data.material,
      thickness,
      area_sqft: data.area_sqft,
      sheets_8x4: sheetsToUse,
      utilization_percent: Math.round(utilization),
      rate: data.rate,
      cost: data.area_sqft * data.rate
    };
  });

  const purchaseRequirements: PurchaseRequirements = {
    boards,
    laminates,
    edgeBanding,
    hardware: hardwareItems,
    adhesives
  };

  // 7. CONSOLIDATED ITEMS (Material Purchase Summary)
  const consolidatedItems: ConsolidatedItem[] = [];
  let order = 1;

  // Add board items
  boards.forEach(board => {
    consolidatedItems.push({
      name: `${board.thickness} ${board.material}`,
      unit: 'sheets',
      totalQty: `${board.sheets_8x4} sheets (${board.area_sqft.toFixed(0)} sqft)`,
      totalArea: board.area_sqft,
      avgRate: board.rate,
      totalCost: board.cost,
      order: order++,
      isBoard: true
    });
  });

  // Add laminate items
  laminates.forEach(laminate => {
    consolidatedItems.push({
      name: `${laminate.kind === 'outer' ? 'Outer' : 'Inner'} Surface Laminate`,
      unit: 'sheets',
      totalQty: `${laminate.sheets || 0} sheets`,
      totalArea: laminate.area_sqft,
      avgRate: laminate.rate,
      totalCost: laminate.cost,
      order: order++,
      isBoard: false
    });
  });

  // Add adhesives
  if (adhesives.bottles > 0) {
    consolidatedItems.push({
      name: 'Adhesives',
      unit: 'mixed',
      totalQty: `${adhesives.bottles} mixed`,
      avgRate: adhesives.rate,
      totalCost: adhesives.cost,
      order: order++,
      isBoard: false
    });
  }

  // Add hardware summary
  const totalHardwareQty = hardware.reduce((sum, hw) => sum + hw.qty, 0);
  const totalHardwareCost = hardware.reduce((sum, hw) => sum + hw.total_cost, 0);
  const avgHardwareRate = totalHardwareQty > 0 ? totalHardwareCost / totalHardwareQty : 0;
  
  consolidatedItems.push({
    name: 'Hardware',
    unit: 'pieces',
    totalQty: `${totalHardwareQty} pieces`,
    avgRate: Math.round(avgHardwareRate),
    totalCost: totalHardwareCost,
    order: order++,
    isBoard: false
  });

  // 8. SHEET OPTIMIZATION DETAILS
  const totalSheets = Object.values(sheetOptimization?.sheets_by_thickness || {}).reduce((sum: number, count: number) => sum + count, 0);
  const totalArea = result.totalBoardArea;
  const sheetCapacity = totalSheets * 32; // 32 sqft per sheet
  const efficiency = Math.min(100, sheetCapacity > 0 ? (totalArea / sheetCapacity) * 100 : 0); // Cap at 100%
  const waste_sqft = Math.max(0, sheetCapacity - totalArea); // Ensure non-negative

  const details: { sheetOptimization: SheetOptimizationDetails } = {
    sheetOptimization: {
      sheets_by_thickness: sheetOptimization?.sheets_by_thickness || {},
      sheets_required: totalSheets,
      efficiency: Math.round(efficiency),
      nesting_layout: sheetOptimization?.nesting_layout || [],
      waste_sqft: Math.max(0, waste_sqft)
    }
  };

  return {
    purchaseRequirements,
    consolidatedItems,
    details
  };
}

// 🎯 ENHANCED PRICE RESOLUTION - Check BOM settings → real products → fallback to defaults
async function getBOMPrice(materialType: string, fallbackRate: number): Promise<number> {
  try {
    const realPrice = await storage.getBomMaterialPrice(materialType);
    if (realPrice !== null) {
      console.log(`🎯 Using real price for ${materialType}: ₹${realPrice} (from product mapping)`);
      return realPrice;
    }
  } catch (error) {
    console.log(`⚠️  Failed to get real price for ${materialType}, using DEFAULT_RATES`);
  }
  
  console.log(`📋 Using default rate for ${materialType}: ₹${fallbackRate}`);
  return fallbackRate;
}

// Industry-standard rates for modular furniture (can be overridden by database values)
const DEFAULT_RATES = {
  board: {
    // Plywood rates by thickness (₹ per sqft)
    "18mm_plywood": 147,
    "12mm_plywood": 120, 
    "6mm_plywood": 95,
    "25mm_plywood": 190,
    // MDF rates by thickness
    "18mm_mdf": 110,
    "12mm_mdf": 85,
    "6mm_mdf": 65,
    // Particle board rates
    "18mm_particle_board": 80,
    "12mm_particle_board": 60,
    // Solid wood premium rates
    "teak": 450,
    "oak": 380,
    "sheesham": 320,
    "mango_wood": 280,
  },
  laminate: {
    // 🎯 COMPREHENSIVE FINISH RATES - INTERCONNECTED LOGIC
    "outer_laminate": 210,
    "inner_laminate": 150,
    "acrylic_finish": 380, // Premium acrylic finish
    "veneer_finish": 320,   // Natural wood veneer
    "paint_finish": 180,    // Paint finish
    "pu_finish": 450,       // PU finish
    "glass_finish": 520,    // Glass finish
    "membrane_foil": 95,    // Membrane finish
    // Adhesive rates
    "adhesive_coverage_sqft_per_bottle": 32,
    "adhesive_bottle_price": 85,
  },
  edge_banding: {
    "2mm": 8, // per meter - updated to Indian standards
    "0.8mm": 4, // per meter
    "1mm": 5, // per meter
    "3mm": 12, // per meter for thicker panels
  },
  hardware: {
    // Modular furniture hardware - Indian market rates
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
    "screw_pack": 120, // per box
    "wall_bracket": 50,
    "shelf_support": 8,
    "drawer_organizer": 350,
    "pull_out_basket": 850,
    "lazy_susan": 1200,
    "soft_close_mechanism": 450,
    
    // Legacy keys for backward compatibility
    "hinge": 60, // concealed hinge default
    "handle": 120, // aluminium handle default  
    "lock": 80, // door lock default
    "drawer_slide": 150, // ball bearing slide default
    "straightener": 150, // for wardrobe alignment
  }
};

// Industry-standard waste factors for modular furniture manufacturing
const WASTE_FACTORS = {
  board: {
    cutting_waste: 0.12, // 12% cutting waste for sheet goods (industry standard)
    defect_allowance: 0.05, // 5% for material defects
    setup_waste: 0.03, // 3% for machine setup and test cuts
  },
  edge_banding: {
    application_waste: 0.15, // 15% waste during edge banding application
    corner_overlap: 0.05, // 5% for corner overlaps and joints
  },
  hardware: {
    damage_allowance: 0.08, // 8% for damaged or lost hardware
    installation_extra: 0.02, // 2% extra for installation contingency
  },
  laminate: {
    pattern_matching: 0.18, // 18% waste for pattern matching (wood grain alignment)
    trimming_waste: 0.10, // 10% for trimming and edge preparation
  }
};

// Standard modular furniture dimensions (in mm) - Indian market standards
const STANDARD_DIMENSIONS = {
  modular_kitchen: {
    base_cabinets: {
      height: [860, 900], // standard counter height
      depth: [600, 650], // standard depth
      widths: [300, 400, 450, 500, 600, 800, 900, 1000], // standard widths
    },
    wall_cabinets: {
      height: [600, 700, 800], // wall cabinet heights
      depth: [300, 350], // wall cabinet depth
      widths: [300, 400, 450, 500, 600, 800, 900], // wall cabinet widths
    },
    tall_units: {
      height: [2100, 2200, 2400], // tall unit heights
      depth: [600, 650], // same as base units
      widths: [450, 500, 600], // tall unit widths
    }
  },
  modular_wardrobe: {
    standard: {
      height: [2100, 2200, 2400], // ceiling height based
      depth: [550, 600, 650], // wardrobe depth
      widths: [600, 800, 900, 1000, 1200, 1500, 1800, 2000], // modular widths
    },
    sliding: {
      depth: [600, 650], // minimum for sliding doors
      track_clearance: 100, // space for sliding track
    }
  },
  drawer_dimensions: {
    heights: [100, 150, 200, 250, 300], // drawer box heights
    slides: [400, 450, 500, 550, 600], // slide lengths
  }
};

// Import advanced nesting algorithm
import { nestPanels, type Panel as NestingPanel, type NestingOptions } from "./nesting";
import { 
  calculateLaminateBOM, 
  mapPanelNameToKind, 
  mapWardrobeType
} from './laminate-calculator';
import { storage } from '../storage';

// 🎯 AUTO-SPLIT OVERSIZED PANELS - Convert large panels into manageable pieces
const splitOversizedPanels = (panels: Panel[], sheetSize = { length: 2440, width: 1220 }): Panel[] => {
  const splitPanels: Panel[] = [];
  
  panels.forEach(panel => {
    const panelL = panel.length;
    const panelW = panel.width;
    
    // 🎯 SIMPLE OVERSIZE CHECK: Panel is oversized if it can't fit in sheet in any orientation
    const fitsNormally = panelL <= sheetSize.length && panelW <= sheetSize.width;
    const fitsRotated = panelL <= sheetSize.width && panelW <= sheetSize.length;
    const isOversized = !fitsNormally && !fitsRotated;
    
    if (!isOversized) {
      // Panel fits in sheet - no splitting needed
      splitPanels.push(panel);
    } else {
      // Panel is oversized - split it properly
      console.log(`🔧 OVERSIZED: ${panel.panel} (${panelL}×${panelW}mm) exceeds sheet (${sheetSize.length}×${sheetSize.width}mm)`);
      
      // Calculate number of pieces needed
      const piecesLength = Math.ceil(panelL / sheetSize.length);
      const piecesWidth = Math.ceil(panelW / sheetSize.width);
      
      console.log(`→ Splitting into ${piecesLength} × ${piecesWidth} = ${piecesLength * piecesWidth} pieces`);
      
      // Create split panels
      for (let i = 0; i < piecesLength; i++) {
        for (let j = 0; j < piecesWidth; j++) {
          // Calculate actual dimensions for this piece
          const remainingLength = panelL - (i * sheetSize.length);
          const remainingWidth = panelW - (j * sheetSize.width);
          
          const pieceLength = Math.min(sheetSize.length, remainingLength);
          const pieceWidth = Math.min(sheetSize.width, remainingWidth);
          
          const splitPanel: Panel = {
            ...panel,
            panel: `${panel.panel} (Piece ${i + 1}-${j + 1})`,
            length: pieceLength,
            width: pieceWidth,
            qty: panel.qty,
            area_sqft: (pieceLength * pieceWidth) / 92903 * panel.qty, // Recalculate area
          };
          splitPanels.push(splitPanel);
        }
      }
    }
  });
  
  return splitPanels;
};

// Advanced sheet optimization with sophisticated nesting calculation
const calculateSheetOptimization = (panels: Panel[], sheetSize = { length: 2440, width: 1220 }): { 
  sheets_required: number, 
  efficiency: number, 
  nesting_layout: any[],
  sheets_by_thickness: { [thickness: string]: number }
} => {
  const sheetArea = sheetSize.length * sheetSize.width;
  let totalPanelArea = 0;
  const sheetsNeeded: { [thickness: string]: number } = {};
  const nestingLayout: any[] = [];
  
  // 🎯 STEP 1: Use panels as-is, nesting algorithm now handles tiling
  const processedPanels = panels;
  console.log(`📦 Panel processing: ${panels.length} original → ${processedPanels.length} after splitting`);
  
  // Group processed panels by thickness for separate sheet calculations
  const panelsByThickness: { [thickness: string]: Panel[] } = {};
  
  processedPanels.forEach(panel => {
    const thickness = (panel.materialType || panel.material || '18mm PLY').match(/^(\d+(?:\.\d+)?mm)/)?.[1] || '18mm';
    if (!panelsByThickness[thickness]) {
      panelsByThickness[thickness] = [];
    }
    
    // Add panel (no quantity expansion here - nestPanels handles it)
    panelsByThickness[thickness].push(panel);
    totalPanelArea += (panel.length * panel.width * panel.qty);
  });

  // Calculate sheets needed for each thickness using advanced nesting
  Object.entries(panelsByThickness).forEach(([thickness, thicknessPanels]) => {
    // Convert to nesting format
    const nestingPanels: NestingPanel[] = thicknessPanels.map((panel, index) => ({
      id: panel.panel || `Panel-${index}`,
      w: panel.length, // width in mm
      h: panel.width,  // height in mm
      qty: panel.qty,
      allowRotate: true, // allow rotation for better optimization
      grain: "none" // no grain restrictions for now
    }));

    const nestingOptions: NestingOptions = {
      sheetW: sheetSize.length,
      sheetH: sheetSize.width,
      kerf: 3, // 3mm saw blade kerf
      marginX: 10, // 10mm margin
      marginY: 10, // 10mm margin
      sort: "area-desc" // sort by area descending for better packing
    };

    try {
      const nestingResult = nestPanels(nestingPanels, nestingOptions);
      const sheetCount = nestingResult.sheets.length;
      sheetsNeeded[thickness] = sheetCount;
      
      // Calculate average efficiency
      const avgEfficiency = nestingResult.sheets.reduce((sum, sheet) => 
        sum + (sheet.utilization || 0), 0) / sheetCount;

      nestingLayout.push({
        thickness,
        sheets: sheetCount,
        layout: nestingResult.sheets.map((sheet, idx) => ({
          sheetNumber: idx + 1,
          efficiency: Math.round((sheet.utilization || 0) * 100), // sheet.utilization is 0-1, so multiply by 100
          placements: sheet.placements,
          freeRects: sheet.freeRects
        })),
        panels: nestingPanels.reduce((sum, p) => sum + p.qty, 0),
        avgEfficiency: Math.round(avgEfficiency * 100)
      });
    } catch (error) {
      console.error(`Nesting error for thickness ${thickness}:`, error);
      // Fallback to simple calculation
      const simpleSheetCount = Math.ceil(thicknessPanels.reduce((sum, panel) => 
        sum + (panel.length * panel.width * panel.qty), 0) / sheetArea);
      sheetsNeeded[thickness] = simpleSheetCount;
      nestingLayout.push({
        thickness,
        sheets: simpleSheetCount,
        layout: [],
        panels: thicknessPanels.reduce((sum, panel) => sum + panel.qty, 0),
        error: error.message
      });
    }
  });

  const totalSheets = Object.values(sheetsNeeded).reduce((sum, count) => sum + count, 0);
  const totalSheetArea = totalSheets * sheetArea;
  const efficiency = Math.min(100, totalSheetArea > 0 ? (totalPanelArea / totalSheetArea) * 100 : 0);
  
  return {
    sheets_required: totalSheets,
    efficiency: Math.round(efficiency),
    nesting_layout: nestingLayout,
    sheets_by_thickness: sheetsNeeded
  };
};

// Export the function
export { calculateSheetOptimization };

// Old nesting functions removed - using advanced MaxRects algorithm from nesting.ts

// Convert mm² to sqft
const mmSqToSqft = (length: number, width: number): number => {
  return (length * width) / 92903;
};

// Convert mm to feet for edge banding
const mmToFeet = (mm: number): number => {
  return mm / 304.8;
};

// Calculate edge banding length for different scenarios
const calculateEdgeBandingLength = (length: number, width: number): number => {
  const perimeterMm = 2 * (length + width);
  return mmToFeet(perimeterMm);
};

// Calculate edge banding for shutters (all 4 edges)
const calculateShutterEdgeBanding = (height: number, width: number): number => {
  const perimeterMm = 2 * (height + width);
  return mmToFeet(perimeterMm);
};

// Calculate edge banding for carcass front visible edges
const calculateCarcassFrontEdgeBanding = (height: number, width: number): number => {
  // 2 × side front (2H) + top & bottom front (2W)
  const sideFrontMm = 2 * height * 2; // 2 sides × 2 edges per side
  const topBottomFrontMm = 2 * width; // top + bottom front edges
  return mmToFeet(sideFrontMm + topBottomFrontMm);
};

// Calculate edge banding for drawer fronts (all 4 edges)
const calculateDrawerFrontEdgeBanding = (width: number, height: number): number => {
  const perimeterMm = 2 * (width + height);
  return mmToFeet(perimeterMm);
};

// Calculate edge banding for shelves (front only, or 3 edges if exposed)
const calculateShelfEdgeBanding = (width: number, depth: number, exposedSides: boolean = false): number => {
  if (exposedSides) {
    // Front + two side edges visible
    const frontMm = width;
    const sidesMm = 2 * depth;
    return mmToFeet(frontMm + sidesMm);
  } else {
    // Front edge only
    return mmToFeet(width);
  }
};

// Calculate edge banding for drawer sides/back (exposed edges only)
const calculateDrawerSideBackEdgeBanding = (width: number, height: number): number => {
  // Only front edge of sides/back are exposed
  return mmToFeet(height);
};

// Bed type configurations
const BED_SIZES = {
  king: { length: 1980, width: 1829 }, // 78" x 72"
  queen: { length: 1980, width: 1524 }, // 78" x 60"
  single: { length: 1980, width: 914 }, // 78" x 36"
  bunk: { length: 1980, width: 914 }, // 2 layers of single
  custom: { length: 0, width: 0 } // Will use input dimensions
};

const BED_STANDARD_HEIGHTS = {
  base: 406, // 16"
  headboard: 914, // 36"
  footboard: 305, // 12"
};

// Generate panels for bed
const generateBedPanels = (input: CalculationInput): Panel[] => {
  const { height, width, depth, boardType, boardThickness, partsConfig } = input;
  const panels: Panel[] = [];
  const material = `${boardThickness} ${boardType.toUpperCase()}`;
  
  // Use bed dimensions or custom
  let bedLength = width; // User's width becomes bed length
  let bedWidth = depth; // User's depth becomes bed width
  
  // Auto-set standard bed sizes if specified in notes or unitType
  if (partsConfig.customParts.find(part => part.name.includes('king'))) {
    bedLength = BED_SIZES.king.length;
    bedWidth = BED_SIZES.king.width;
  } else if (partsConfig.customParts.find(part => part.name.includes('queen'))) {
    bedLength = BED_SIZES.queen.length;
    bedWidth = BED_SIZES.queen.width;
  } else if (partsConfig.customParts.find(part => part.name.includes('single'))) {
    bedLength = BED_SIZES.single.length;
    bedWidth = BED_SIZES.single.width;
  }

  const baseHeight = BED_STANDARD_HEIGHTS.base;
  const headboardHeight = BED_STANDARD_HEIGHTS.headboard;
  const footboardHeight = BED_STANDARD_HEIGHTS.footboard;
  
  // Main bed panels
  
  // Headboard panel (78" × 36" for king)
  panels.push({
    panel: "Headboard Panel",
    qty: 1,
    size: `${bedLength}mm x ${headboardHeight}mm`,
    length: bedLength,
    width: headboardHeight,
    material,
    edge_banding: "2mm",
    area_sqft: mmSqToSqft(bedLength, headboardHeight),
    edgeBandingLength: calculateEdgeBandingLength(bedLength, headboardHeight),
  });

  // Footboard panel (78" × 12" for king)
  panels.push({
    panel: "Footboard Panel",
    qty: 1,
    size: `${bedLength}mm x ${footboardHeight}mm`,
    length: bedLength,
    width: footboardHeight,
    material,
    edge_banding: "2mm",
    area_sqft: mmSqToSqft(bedLength, footboardHeight),
    edgeBandingLength: calculateEdgeBandingLength(bedLength, footboardHeight),
  });

  // Side panels (2 pieces - 72" × 12" for king)
  panels.push({
    panel: "Side Panel",
    qty: 2,
    size: `${bedWidth}mm x ${baseHeight}mm`,
    length: bedWidth,
    width: baseHeight,
    material,
    edge_banding: "2mm",
    area_sqft: mmSqToSqft(bedWidth, baseHeight) * 2,
    edgeBandingLength: calculateEdgeBandingLength(bedWidth, baseHeight) * 2,
  });

  // Base support ply (78" × 72" for king)
  panels.push({
    panel: "Base Support Ply",
    qty: 1,
    size: `${bedLength}mm x ${bedWidth}mm`,
    length: bedLength,
    width: bedWidth,
    material: `12mm PLY`, // Usually plywood for base
    edge_banding: "0.8mm",
    area_sqft: mmSqToSqft(bedLength, bedWidth),
    edgeBandingLength: calculateEdgeBandingLength(bedLength, bedWidth),
  });

  // Cushion back panel (if cushion option selected)
  if (partsConfig.customParts.find(part => part.name.includes('cushion'))) {
    panels.push({
      panel: "Cushion Backing Ply",
      qty: 1,
      size: `${bedLength}mm x ${headboardHeight}mm`,
      length: bedLength,
      width: headboardHeight,
      material: "12mm PLY",
      edge_banding: "0.8mm",
      area_sqft: mmSqToSqft(bedLength, headboardHeight),
      edgeBandingLength: calculateEdgeBandingLength(bedLength, headboardHeight),
    });
  }

  // Storage components based on bed type
  
  // Storage shutters (2-3 pieces)
  if (partsConfig.shutters > 0) {
    const shutterWidth = bedLength / partsConfig.shutters;
    const shutterHeight = baseHeight - 50; // Slightly smaller than base
    
    panels.push({
      panel: "Storage Shutter",
      qty: partsConfig.shutters,
      size: `${shutterWidth}mm x ${shutterHeight}mm`,
      length: shutterWidth,
      width: shutterHeight,
      material,
      edge_banding: "2mm",
      area_sqft: mmSqToSqft(shutterWidth, shutterHeight) * partsConfig.shutters,
      edgeBandingLength: calculateEdgeBandingLength(shutterWidth, shutterHeight) * partsConfig.shutters,
    });
  }

  // Drawer components
  if (partsConfig.drawers > 0) {
    const drawerWidth = (bedLength / 2) - 50; // Split bed length, account for sides
    const drawerDepth = bedWidth - 100; // Account for frame
    const drawerHeight = 150; // Standard drawer height

    // Drawer box panels (front, back, sides, bottom)
    panels.push({
      panel: "Drawer Box Front/Back",
      qty: partsConfig.drawers * 2,
      size: `${drawerWidth}mm x ${drawerHeight}mm`,
      length: drawerWidth,
      width: drawerHeight,
      material,
      edge_banding: "0.8mm",
      area_sqft: mmSqToSqft(drawerWidth, drawerHeight) * partsConfig.drawers * 2,
      edgeBandingLength: calculateEdgeBandingLength(drawerWidth, drawerHeight) * partsConfig.drawers * 2,
    });

    panels.push({
      panel: "Drawer Box Sides",
      qty: partsConfig.drawers * 2,
      size: `${drawerDepth}mm x ${drawerHeight}mm`,
      length: drawerDepth,
      width: drawerHeight,
      material,
      edge_banding: "0.8mm",
      area_sqft: mmSqToSqft(drawerDepth, drawerHeight) * partsConfig.drawers * 2,
      edgeBandingLength: calculateEdgeBandingLength(drawerDepth, drawerHeight) * partsConfig.drawers * 2,
    });

    panels.push({
      panel: "Drawer Bottom",
      qty: partsConfig.drawers,
      size: `${drawerWidth}mm x ${drawerDepth}mm`,
      length: drawerWidth,
      width: drawerDepth,
      material: "12mm PLY",
      edge_banding: "0.8mm",
      area_sqft: mmSqToSqft(drawerWidth, drawerDepth) * partsConfig.drawers,
      edgeBandingLength: calculateEdgeBandingLength(drawerWidth, drawerDepth) * partsConfig.drawers,
    });
  }

  // Bunk bed special components
  if (partsConfig.customParts.find(part => part.name.includes('bunk'))) {
    // Additional upper bed frame
    panels.push({
      panel: "Upper Bed Frame",
      qty: 1,
      size: `${bedLength}mm x ${bedWidth}mm`,
      length: bedLength,
      width: bedWidth,
      material: "12mm PLY",
      edge_banding: "0.8mm",
      area_sqft: mmSqToSqft(bedLength, bedWidth),
      edgeBandingLength: calculateEdgeBandingLength(bedLength, bedWidth),
    });

    // Ladder panel (12" × 60")
    panels.push({
      panel: "Ladder Panel",
      qty: 1,
      size: `305mm x 1524mm`,
      length: 305,
      width: 1524,
      material,
      edge_banding: "2mm",
      area_sqft: mmSqToSqft(305, 1524),
      edgeBandingLength: calculateEdgeBandingLength(305, 1524),
    });

    // Guard rails (2 pcs, 72" × 6")
    panels.push({
      panel: "Guard Rail",
      qty: 2,
      size: `${bedWidth}mm x 152mm`,
      length: bedWidth,
      width: 152,
      material,
      edge_banding: "2mm",
      area_sqft: mmSqToSqft(bedWidth, 152) * 2,
      edgeBandingLength: calculateEdgeBandingLength(bedWidth, 152) * 2,
    });
  }

  return panels;
};

// Generate hardware for bed
const generateBedHardware = (input: CalculationInput): Hardware[] => {
  const { height, partsConfig } = input;
  const hardware: Hardware[] = [];

  // All beds - Basic connectors and hardware
  hardware.push({
    item: "Bed Connectors",
    qty: 6, // To join head, foot, and sides
    unit_rate: 15,
    total_cost: 6 * 15,
  });

  hardware.push({
    item: "Dowels & Screws",
    qty: 20,
    unit_rate: 2,
    total_cost: 20 * 2,
  });

  // Hydraulic bed hardware
  if (partsConfig.customParts.find(part => part.name.includes('hydraulic'))) {
    hardware.push({
      item: "Hydraulic Lift Kit",
      qty: 2,
      unit_rate: 800,
      total_cost: 2 * 800,
    });

    hardware.push({
      item: "Gas Lift Frame",
      qty: 1,
      unit_rate: 300,
      total_cost: 300,
    });

    hardware.push({
      item: "Heavy Duty Hinges",
      qty: 2,
      unit_rate: 50,
      total_cost: 2 * 50,
    });

    hardware.push({
      item: "Hydraulic Handle",
      qty: 2,
      unit_rate: DEFAULT_RATES.hardware.handle,
      total_cost: 2 * DEFAULT_RATES.hardware.handle,
    });
  }

  // Storage - Shutter type
  if (partsConfig.shutters > 0) {
    hardware.push({
      item: "Storage Hinges",
      qty: partsConfig.shutters * 2,
      unit_rate: DEFAULT_RATES.hardware.hinge,
      total_cost: partsConfig.shutters * 2 * DEFAULT_RATES.hardware.hinge,
    });

    hardware.push({
      item: "Storage Handles",
      qty: partsConfig.shutters,
      unit_rate: DEFAULT_RATES.hardware.handle,
      total_cost: partsConfig.shutters * DEFAULT_RATES.hardware.handle,
    });

    if (partsConfig.shutters >= 2) {
      hardware.push({
        item: "Storage Lock",
        qty: 1,
        unit_rate: DEFAULT_RATES.hardware.lock,
        total_cost: DEFAULT_RATES.hardware.lock,
      });
    }
  }

  // Storage - Drawer type
  if (partsConfig.drawers > 0) {
    hardware.push({
      item: "Drawer Channel Set",
      qty: partsConfig.drawers, // Count in sets (1 set = 2 pieces)
      unit_rate: DEFAULT_RATES.hardware.drawer_slide * 2,
      total_cost: partsConfig.drawers * DEFAULT_RATES.hardware.drawer_slide * 2,
    });

    hardware.push({
      item: "Drawer Wheels",
      qty: partsConfig.drawers * 4, // 4 wheels per drawer
      unit_rate: 8,
      total_cost: partsConfig.drawers * 4 * 8,
    });

    hardware.push({
      item: "Drawer Handles",
      qty: partsConfig.drawers,
      unit_rate: DEFAULT_RATES.hardware.handle,
      total_cost: partsConfig.drawers * DEFAULT_RATES.hardware.handle,
    });

    hardware.push({
      item: "Drawer Assembly Screws",
      qty: partsConfig.drawers * 15, // 10-15 per drawer
      unit_rate: 1,
      total_cost: partsConfig.drawers * 15,
    });
  }

  // Bunk bed special hardware
  if (partsConfig.customParts.find(part => part.name.includes('bunk'))) {
    hardware.push({
      item: "Bunk Bed Connectors",
      qty: 10, // Additional connectors for upper bed
      unit_rate: 20,
      total_cost: 10 * 20,
    });

    hardware.push({
      item: "Safety Rail Brackets",
      qty: 4, // For guard rails
      unit_rate: 25,
      total_cost: 4 * 25,
    });

    hardware.push({
      item: "Ladder Brackets",
      qty: 4,
      unit_rate: 20,
      total_cost: 4 * 20,
    });
  }

  // Cushion hardware (if cushion option selected)
  if (partsConfig.customParts.find(part => part.name.includes('cushion'))) {
    hardware.push({
      item: "Cushion Foam",
      qty: 1,
      unit_rate: 500, // Per sq ft equivalent
      total_cost: 500,
    });

    hardware.push({
      item: "Fabric & Labor",
      qty: 1,
      unit_rate: 800,
      total_cost: 800,
    });
  }

  return hardware;
};

// Generate panels for wardrobe
const generateWardrobePanels = (input: CalculationInput, exposedSides: boolean = false): Panel[] => {
  const { height, width, depth, boardType, boardThickness, partsConfig } = input;
  const panels: Panel[] = [];
  const material = `${boardThickness} ${boardType.toUpperCase()}`;

  // Configuration settings (user-configurable)
  const backThickness = partsConfig.backThickness || 6; // User configurable back panel thickness
  const doorClearance = partsConfig.doorClearance || 12; // User configurable door clearance
  const frontClearance = 10; // 10mm front clearance for doors/overhang
  const slideColorance = partsConfig.slideColorance || 12.5; // User configurable slide clearance
  const boxThickness = partsConfig.boxThickness || 18; // ✅ OPTIMIZED to 18mm (was 12mm)
  const bottomThickness = partsConfig.bottomThickness || 6; // User configurable drawer bottom thickness
  const backClearance = 15; // 15mm back clearance for drawers

  // Calculate internal dimensions
  const panelThickness = parseInt(boardThickness.replace('mm', ''));
  const internalWidth = width - (2 * panelThickness);
  const internalDepth = depth - backThickness - doorClearance;

  // External Panels (2mm edge banding for front visible edges only)
  
  // Top panel - front edge only (2mm)
  panels.push({
    panel: "Top Panel",
    qty: 1,
    size: `${width}mm x ${depth}mm`,
    length: width,
    width: depth,
    material,
    edge_banding: "2mm",
    area_sqft: mmSqToSqft(width, depth),
    edgeBandingLength: mmToFeet(width), // Front edge only
  });

  // Bottom panel - front edge only (2mm)
  panels.push({
    panel: "Bottom Panel",
    qty: 1,
    size: `${width}mm x ${depth}mm`,
    length: width,
    width: depth,
    material,
    edge_banding: "2mm",
    area_sqft: mmSqToSqft(width, depth),
    edgeBandingLength: mmToFeet(width), // Front edge only
  });

  // Side panels - front edge only (2mm), unless exposed sides
  const sideEdgeBanding = exposedSides ? mmToFeet(height + depth + height) : mmToFeet(height); // 3 edges if exposed, front only if not
  panels.push({
    panel: "Side Panel",
    qty: exposedSides ? 2 : 2,
    size: `${height}mm x ${depth}mm`,
    length: height,
    width: depth,
    material,
    edge_banding: "2mm",
    area_sqft: mmSqToSqft(height, depth) * 2,
    edgeBandingLength: sideEdgeBanding * 2,
  });

  // Shutters - all 4 edges (2mm)
  if (partsConfig.shutters > 0) {
    const shutterWidth = width / partsConfig.shutters;
    panels.push({
      panel: "Shutter",
      qty: partsConfig.shutters,
      size: `${height}mm x ${shutterWidth}mm`,
      length: height,
      width: shutterWidth,
      material,
      edge_banding: "2mm",
      area_sqft: mmSqToSqft(height, shutterWidth) * partsConfig.shutters,
      edgeBandingLength: calculateShutterEdgeBanding(height, shutterWidth) * partsConfig.shutters,
    });
  }

  // Back panel (if specified) - No edge banding
  if (partsConfig.backPanels > 0) {
    panels.push({
      panel: "Back Panel",
      qty: partsConfig.backPanels,
      size: `${width}mm x ${height}mm`,
      length: width,
      width: height,
      material: `${backThickness}mm ${boardType.toUpperCase()}`, // Configurable back thickness
      edge_banding: "None", // No edge banding on back panel
      area_sqft: mmSqToSqft(width, height) * partsConfig.backPanels,
      edgeBandingLength: 0, // No edge banding
    });

    // 🚫 PRE-LAM BOARD CHECK: NO LAMINATE for Pre-Lam boards
    console.log(`🔍 Board type check: '${boardType}' - Is Pre-Lam? ${boardType === 'pre_lam_particle_board'}`);
    
    if (boardType !== 'pre_lam_particle_board') {
      // Add inner laminate for backpanel inside surface (only for non-pre-lam boards)
      panels.push({
        panel: "Back Panel Inner Laminate",
        qty: partsConfig.backPanels,
        size: `${width}mm x ${height}mm`,
        length: width,
        width: height,
        material: "Inner Surface Laminate",
        edge_banding: "None",
        area_sqft: mmSqToSqft(width, height) * partsConfig.backPanels,
        edgeBandingLength: 0,
      });

      // Add outer laminate for backpanel outside surface (only for non-pre-lam boards)
      panels.push({
        panel: "Back Panel Outer Laminate",
        qty: partsConfig.backPanels,
        size: `${width}mm x ${height}mm`,
        length: width,
        width: height,
        material: "Outer Surface Laminate",
        edge_banding: "None",
        area_sqft: mmSqToSqft(width, height) * partsConfig.backPanels,
        edgeBandingLength: 0,
      });
    } else {
      console.log('✨ Pre-Lam Board detected: Skipping laminate panels (already pre-applied)');
    }
  }

  // Internal Panels (0.8mm edge banding)
  
  // Shelves - front edge only (or 3 edges if exposed sides)
  if (partsConfig.shelves > 0) {
    const shelfWidth = internalWidth; // Full internal width
    const shelfDepth = depth - backThickness - frontClearance; // Proper depth calculation
    panels.push({
      panel: "Shelf",
      qty: partsConfig.shelves,
      size: `${shelfWidth}mm x ${shelfDepth}mm`,
      length: shelfWidth,
      width: shelfDepth,
      material,
      edge_banding: "0.8mm",
      area_sqft: mmSqToSqft(shelfWidth, shelfDepth) * partsConfig.shelves,
      edgeBandingLength: calculateShelfEdgeBanding(shelfWidth, shelfDepth, exposedSides) * partsConfig.shelves,
    });
  }

  // 🗂️ DRAWER COMPONENTS - SIDE-BY-SIDE LAYOUT FOR WIDE WARDROBES
  if (partsConfig.drawers > 0) {
    const drawerHeight = 150; // Standard drawer height
    
    // ✅ SIDE-BY-SIDE DRAWER LOGIC
    const isWideWardrobe = width > 600; // More than 2ft gets side-by-side drawers
    let drawersPerRow, drawerRows;
    
    if (isWideWardrobe && partsConfig.drawers >= 2) {
      if (partsConfig.drawers === 2) {
        drawersPerRow = 2;
        drawerRows = 1;
      } else if (partsConfig.drawers === 4) {
        drawersPerRow = 2;
        drawerRows = 2; // 2x2 arrangement
      } else {
        // For other counts, try to balance
        drawersPerRow = Math.min(Math.ceil(partsConfig.drawers / 2), 2);
        drawerRows = Math.ceil(partsConfig.drawers / drawersPerRow);
      }
    } else {
      // Single column for narrow wardrobes or single drawer
      drawersPerRow = 1;
      drawerRows = partsConfig.drawers;
    }
    
    console.log(`🗂️ Drawer Layout: ${partsConfig.drawers} total → ${drawerRows} rows × ${drawersPerRow} per row (Wide wardrobe: ${isWideWardrobe})`);
    
    // Calculate individual drawer dimensions
    const bayWidth = internalWidth;
    const drawerOuterWidth = (bayWidth - (drawersPerRow + 1) * slideColorance) / drawersPerRow;
    const drawerOuterDepth = internalDepth - backClearance;
    
    // Drawer bottom (inset inside the box)
    const drawerBottomWidth = drawerOuterWidth - (2 * boxThickness);
    const drawerBottomDepth = drawerOuterDepth - boxThickness; // Rear groove
    
    panels.push({
      panel: "Drawer Bottom",
      qty: partsConfig.drawers,
      size: `${Math.round(drawerBottomWidth)}mm x ${Math.round(drawerBottomDepth)}mm`,
      length: drawerBottomWidth,
      width: drawerBottomDepth,
      material: `${bottomThickness}mm ${boardType.toUpperCase()}`, // 6mm bottom thickness
      edge_banding: "None", // Drawer bottoms typically don't have edge banding
      area_sqft: mmSqToSqft(drawerBottomWidth, drawerBottomDepth) * partsConfig.drawers,
      edgeBandingLength: 0,
    });

    // Drawer front - all 4 edges (2mm edge banding)
    panels.push({
      panel: "Drawer Front",
      qty: partsConfig.drawers,
      size: `${Math.round(drawerOuterWidth)}mm x ${drawerHeight}mm`,
      length: drawerOuterWidth,
      width: drawerHeight,
      material: `${boxThickness}mm ${boardType.toUpperCase()}`,
      edge_banding: "2mm", // Drawer front gets 2mm edge banding on all 4 edges
      area_sqft: mmSqToSqft(drawerOuterWidth, drawerHeight) * partsConfig.drawers,
      edgeBandingLength: calculateDrawerFrontEdgeBanding(drawerOuterWidth, drawerHeight) * partsConfig.drawers,
    });

    // Drawer back - front edge only (0.8mm edge banding)
    panels.push({
      panel: "Drawer Back",
      qty: partsConfig.drawers,
      size: `${Math.round(drawerOuterWidth)}mm x ${drawerHeight}mm`,
      length: drawerOuterWidth,
      width: drawerHeight,
      material: `${boxThickness}mm ${boardType.toUpperCase()}`,
      edge_banding: "0.8mm",
      area_sqft: mmSqToSqft(drawerOuterWidth, drawerHeight) * partsConfig.drawers,
      edgeBandingLength: calculateDrawerSideBackEdgeBanding(drawerOuterWidth, drawerHeight) * partsConfig.drawers,
    });

    // Drawer sides - front edge only (0.8mm edge banding)
    panels.push({
      panel: "Drawer Side",
      qty: partsConfig.drawers * 2,
      size: `${Math.round(drawerOuterDepth)}mm x ${drawerHeight}mm`,
      length: drawerOuterDepth,
      width: drawerHeight,
      material: `${boxThickness}mm ${boardType.toUpperCase()}`,
      edge_banding: "0.8mm",
      area_sqft: mmSqToSqft(drawerOuterDepth, drawerHeight) * partsConfig.drawers * 2,
      edgeBandingLength: calculateDrawerSideBackEdgeBanding(drawerOuterDepth, drawerHeight) * partsConfig.drawers * 2,
    });
  }

  // Custom parts
  partsConfig.customParts.forEach((customPart, index) => {
    if (customPart.name && customPart.quantity > 0) {
      const customWidth = Math.min(width, depth) * 0.8; // Estimate size
      const customHeight = Math.min(width, depth) * 0.6;
      
      panels.push({
        panel: customPart.name,
        qty: customPart.quantity,
        size: `${customWidth}mm x ${customHeight}mm`,
        length: customWidth,
        width: customHeight,
        material,
        edge_banding: "0.8mm", // Assume internal part
        area_sqft: mmSqToSqft(customWidth, customHeight) * customPart.quantity,
        edgeBandingLength: calculateEdgeBandingLength(customWidth, customHeight) * customPart.quantity,
      });
    }
  });

  return panels;
};

// Storage Unit Panels Generation
function generateStorageUnitPanels(input: any) {
  const panels: Panel[] = [];
  const { height, width, depth } = input.dimensions;
  const { shelves, drawers } = input.partsConfig;

  // External panels - 2mm edge banding
  panels.push(
    { name: 'Top Panel', type: 'panel', size: `${width}x${depth}`, quantity: 1, edge_band: '2mm', rate: 0 },
    { name: 'Bottom Panel', type: 'panel', size: `${width}x${depth}`, quantity: 1, edge_band: '2mm', rate: 0 },
    { name: 'Side Panels', type: 'panel', size: `${height}x${depth}`, quantity: 2, edge_band: '2mm', rate: 0 },
    { name: 'Back Panel', type: 'panel', size: `${height}x${width}`, quantity: 1, edge_band: '0.8mm', rate: 0 }
  );

  // Shelves - internal panels with 0.8mm edge banding
  if (shelves > 0) {
    panels.push({
      name: 'Shelves',
      type: 'panel',
      size: `${width - 36}x${depth - 18}`,
      quantity: shelves,
      edge_band: '0.8mm',
      rate: 0
    });
  }

  // Drawer boxes
  if (drawers > 0) {
    const drawerHeight = Math.floor((height - 100) / drawers);
    panels.push(
      { name: 'Drawer Fronts', type: 'panel', size: `${width - 3}x${drawerHeight}`, quantity: drawers, edge_band: '2mm', rate: 0 },
      { name: 'Drawer Sides', type: 'panel', size: `${drawerHeight - 16}x${depth - 50}`, quantity: drawers * 2, edge_band: '0.8mm', rate: 0 },
      { name: 'Drawer Bottoms', type: 'panel', size: `${width - 36}x${depth - 50}`, quantity: drawers, edge_band: '0.8mm', rate: 0 }
    );
  }

  return panels;
}

// Dresser Panels Generation  
function generateDresserPanels(input: any) {
  const panels: Panel[] = [];
  const { height, width, depth } = input.dimensions;
  const { drawers, mirror } = input.partsConfig;

  // Main carcass
  panels.push(
    { name: 'Top Panel', type: 'panel', size: `${width}x${depth}`, quantity: 1, edge_band: '2mm', rate: 0 },
    { name: 'Bottom Panel', type: 'panel', size: `${width}x${depth}`, quantity: 1, edge_band: '2mm', rate: 0 },
    { name: 'Side Panels', type: 'panel', size: `${height}x${depth}`, quantity: 2, edge_band: '2mm', rate: 0 },
    { name: 'Back Panel', type: 'panel', size: `${height}x${width}`, quantity: 1, edge_band: '0.8mm', rate: 0 }
  );

  // Drawer components
  const drawerHeight = Math.floor((height - 50) / drawers);
  panels.push(
    { name: 'Drawer Fronts', type: 'panel', size: `${width - 3}x${drawerHeight}`, quantity: drawers, edge_band: '2mm', rate: 0 },
    { name: 'Drawer Sides', type: 'panel', size: `${drawerHeight - 16}x${depth - 50}`, quantity: drawers * 2, edge_band: '0.8mm', rate: 0 },
    { name: 'Drawer Backs', type: 'panel', size: `${drawerHeight - 16}x${width - 36}`, quantity: drawers, edge_band: '0.8mm', rate: 0 },
    { name: 'Drawer Bottoms', type: 'panel', size: `${width - 36}x${depth - 50}`, quantity: drawers, edge_band: '0.8mm', rate: 0 }
  );

  // Mirror if selected
  if (mirror) {
    panels.push({
      name: 'Mirror Frame',
      type: 'panel', 
      size: `${width}x${height + 300}`,
      quantity: 1,
      edge_band: '2mm',
      rate: 0
    });
  }

  return panels;
}

// 🍳 SIMPLE KITCHEN CABINET CALCULATOR - Panel Generation
function generateKitchenCabinetPanels(input: CalculationInput): Panel[] {
  const panels: Panel[] = [];
  const { height, width, depth, boardType, boardThickness, partsConfig } = input;
  const material = `${boardThickness} ${boardType.toUpperCase()}`;
  
  // 🎯 Simple kitchen dimensions
  const baseCabinetHeight = 850; // Standard base height
  const wallCabinetHeight = 700; // Standard wall height  
  const tallCabinetHeight = height > 2200 ? 2200 : height; // Full height or max 2200
  const cabinetDepth = 450; // Standard depth
  const wallCabinetDepth = 300; // Wall cabinet depth
  
  const { 
    baseCabinets = 0, 
    wallCabinets = 0, 
    tallCabinets = 0,
    island = false,
    drawers = 0,
    pulloutShelves = 0,
    cornerUnit = false,
    lazySusan = false,
    kitchenLayout = "L-shaped"
  } = partsConfig;

  // 📦 BASE CABINETS - Standard 600mm wide units
  if (baseCabinets > 0) {
    const baseWidth = 600; // Standard width
    
    // Base cabinet carcase panels
    panels.push({
      panel: 'Base Cabinet - Top Panel',
      qty: baseCabinets,
      size: `${baseWidth}mm x ${cabinetDepth}mm`,
      length: baseWidth,
      width: cabinetDepth,
      material,
      edge_banding: '2mm',
      area_sqft: mmSqToSqft(baseWidth, cabinetDepth) * baseCabinets,
      edgeBandingLength: mmToFeet(baseWidth) * baseCabinets,
    });
    
    panels.push({
      panel: 'Base Cabinet - Bottom Panel',
      qty: baseCabinets,
      size: `${baseWidth}mm x ${cabinetDepth}mm`,
      length: baseWidth,
      width: cabinetDepth,
      material,
      edge_banding: '2mm',
      area_sqft: mmSqToSqft(baseWidth, cabinetDepth) * baseCabinets,
      edgeBandingLength: mmToFeet(baseWidth) * baseCabinets,
    });
    
    panels.push({
      panel: 'Base Cabinet - Side Panel',
      qty: baseCabinets * 2,
      size: `${baseCabinetHeight}mm x ${cabinetDepth}mm`,
      length: baseCabinetHeight,
      width: cabinetDepth,
      material,
      edge_banding: '2mm',
      area_sqft: mmSqToSqft(baseCabinetHeight, cabinetDepth) * baseCabinets * 2,
      edgeBandingLength: mmToFeet(baseCabinetHeight) * baseCabinets * 2,
    });
    
    panels.push({
      panel: 'Base Cabinet - Back Panel',
      qty: baseCabinets,
      size: `${baseCabinetHeight}mm x ${baseWidth}mm`,
      length: baseCabinetHeight,
      width: baseWidth,
      material: `6mm ${boardType.toUpperCase()}`,
      edge_banding: 'None',
      area_sqft: mmSqToSqft(baseCabinetHeight, baseWidth) * baseCabinets,
      edgeBandingLength: 0,
    });
    
    // Base cabinet doors
    panels.push({
      panel: 'Base Cabinet - Door Panel',
      qty: baseCabinets * 2,
      size: `${baseWidth/2 - 2}mm x ${750}mm`,
      length: baseWidth/2 - 2,
      width: 750,
      material,
      edge_banding: '2mm',
      area_sqft: mmSqToSqft(baseWidth/2 - 2, 750) * baseCabinets * 2,
      edgeBandingLength: mmToFeet((baseWidth/2 - 2) * 2 + 750 * 2) * baseCabinets * 2,
    });
    
    // Base cabinet shelf
    panels.push({
      panel: 'Base Cabinet - Shelf',
      qty: baseCabinets,
      size: `${baseWidth - 36}mm x ${cabinetDepth - 18}mm`,
      length: baseWidth - 36,
      width: cabinetDepth - 18,
      material,
      edge_banding: '0.8mm',
      area_sqft: mmSqToSqft(baseWidth - 36, cabinetDepth - 18) * baseCabinets,
      edgeBandingLength: mmToFeet(baseWidth - 36) * baseCabinets,
    });
  }

  // Wall Cabinets
  if (wallCabinets > 0) {
    const wallWidth = Math.floor(width / wallCabinets);
    panels.push(
      { name: 'Wall Cabinet Tops', type: 'panel', size: `${wallWidth}x${300}`, quantity: wallCabinets, edge_band: '2mm', rate: 0 },
      { name: 'Wall Cabinet Bottoms', type: 'panel', size: `${wallWidth}x${300}`, quantity: wallCabinets, edge_band: '2mm', rate: 0 },
      { name: 'Wall Cabinet Sides', type: 'panel', size: `${700}x${300}`, quantity: wallCabinets * 2, edge_band: '2mm', rate: 0 },
      { name: 'Wall Cabinet Backs', type: 'panel', size: `${700}x${wallWidth}`, quantity: wallCabinets, edge_band: '0.8mm', rate: 0 },
      { name: 'Wall Cabinet Doors', type: 'panel', size: `${wallWidth - 3}x${650}`, quantity: wallCabinets * 2, edge_band: '2mm', rate: 0 }
    );

    // Wall cabinet shelves
    panels.push({
      name: 'Wall Cabinet Shelves',
      type: 'panel',
      size: `${wallWidth - 36}x${282}`,
      quantity: wallCabinets * 2,
      edge_band: '0.8mm', 
      rate: 0
    });
  }

  // Tall Cabinets (Pantry/Appliance Units)
  if (tallCabinets > 0) {
    panels.push(
      { name: 'Tall Cabinet Tops', type: 'panel', size: `${600}x${depth}`, quantity: tallCabinets, edge_band: '2mm', rate: 0 },
      { name: 'Tall Cabinet Bottoms', type: 'panel', size: `${600}x${depth}`, quantity: tallCabinets, edge_band: '2mm', rate: 0 },
      { name: 'Tall Cabinet Sides', type: 'panel', size: `${2200}x${depth}`, quantity: tallCabinets * 2, edge_band: '2mm', rate: 0 },
      { name: 'Tall Cabinet Backs', type: 'panel', size: `${2200}x${600}`, quantity: tallCabinets, edge_band: '0.8mm', rate: 0 },
      { name: 'Tall Cabinet Doors', type: 'panel', size: `${597}x${1100}`, quantity: tallCabinets * 2, edge_band: '2mm', rate: 0 },
      { name: 'Tall Cabinet Shelves', type: 'panel', size: `${564}x${depth - 18}`, quantity: tallCabinets * 4, edge_band: '0.8mm', rate: 0 }
    );
  }

  // Kitchen Island
  if (island) {
    panels.push(
      { name: 'Island Top', type: 'panel', size: `${1200}x${600}`, quantity: 1, edge_band: '2mm', rate: 0 },
      { name: 'Island Bottom', type: 'panel', size: `${1200}x${600}`, quantity: 1, edge_band: '2mm', rate: 0 },
      { name: 'Island Sides', type: 'panel', size: `${850}x${600}`, quantity: 2, edge_band: '2mm', rate: 0 },
      { name: 'Island Back', type: 'panel', size: `${850}x${1200}`, quantity: 1, edge_band: '0.8mm', rate: 0 },
      { name: 'Island Doors', type: 'panel', size: `${597}x${750}`, quantity: 4, edge_band: '2mm', rate: 0 }
    );
  }

  // Corner Units
  if (cornerUnit) {
    panels.push(
      { name: 'Corner Unit Top', type: 'panel', size: `${900}x${900}`, quantity: 1, edge_band: '2mm', rate: 0 },
      { name: 'Corner Unit Bottom', type: 'panel', size: `${900}x${900}`, quantity: 1, edge_band: '2mm', rate: 0 },
      { name: 'Corner Unit Sides', type: 'panel', size: `${850}x${600}`, quantity: 4, edge_band: '2mm', rate: 0 },
      { name: 'Corner Unit Doors', type: 'panel', size: `${450}x${750}`, quantity: 2, edge_band: '2mm', rate: 0 }
    );
  }

  // 📦 KITCHEN DRAWERS - Standard drawer boxes
  if (drawers > 0) {
    const drawerWidth = 450; // Standard drawer width
    const drawerHeight = 150; // Standard drawer height
    
    panels.push({
      panel: 'Kitchen Drawer - Front Panel',
      qty: drawers,
      size: `${drawerWidth}mm x ${drawerHeight}mm`,
      length: drawerWidth,
      width: drawerHeight,
      material,
      edge_banding: '2mm',
      area_sqft: mmSqToSqft(drawerWidth, drawerHeight) * drawers,
      edgeBandingLength: mmToFeet((drawerWidth + drawerHeight) * 2) * drawers,
    });
    
    panels.push({
      panel: 'Kitchen Drawer - Side Panel',
      qty: drawers * 2,
      size: `${drawerHeight}mm x ${350}mm`,
      length: drawerHeight,
      width: 350,
      material,
      edge_banding: '0.8mm',
      area_sqft: mmSqToSqft(drawerHeight, 350) * drawers * 2,
      edgeBandingLength: mmToFeet(drawerHeight) * drawers * 2,
    });
    
    panels.push({
      panel: 'Kitchen Drawer - Back Panel',
      qty: drawers,
      size: `${drawerHeight}mm x ${drawerWidth - 36}mm`,
      length: drawerHeight,
      width: drawerWidth - 36,
      material,
      edge_banding: '0.8mm',
      area_sqft: mmSqToSqft(drawerHeight, drawerWidth - 36) * drawers,
      edgeBandingLength: mmToFeet(drawerHeight) * drawers,
    });
    
    panels.push({
      panel: 'Kitchen Drawer - Bottom Panel',
      qty: drawers,
      size: `${drawerWidth - 36}mm x ${330}mm`,
      length: drawerWidth - 36,
      width: 330,
      material: `6mm ${boardType.toUpperCase()}`, // Thinner drawer bottom
      edge_banding: 'None',
      area_sqft: mmSqToSqft(drawerWidth - 36, 330) * drawers,
      edgeBandingLength: 0,
    });
  }

  return panels;
}

// Bathroom Vanity Panels
function generateBathroomVanityPanels(input: any) {
  const panels: Panel[] = [];
  const { height, width, depth } = input.dimensions;
  const { drawers, doors, mirror, sideUnit } = input.partsConfig;

  // Main vanity carcass
  panels.push(
    { name: 'Vanity Top', type: 'panel', size: `${width}x${depth}`, quantity: 1, edge_band: '2mm', rate: 0 },
    { name: 'Vanity Bottom', type: 'panel', size: `${width}x${depth}`, quantity: 1, edge_band: '2mm', rate: 0 },
    { name: 'Vanity Sides', type: 'panel', size: `${height}x${depth}`, quantity: 2, edge_band: '2mm', rate: 0 },
    { name: 'Vanity Back', type: 'panel', size: `${height}x${width}`, quantity: 1, edge_band: '0.8mm', rate: 0 }
  );

  // Doors
  if (doors > 0) {
    const doorWidth = Math.floor((width - 3) / doors);
    panels.push({
      name: 'Vanity Doors',
      type: 'panel',
      size: `${doorWidth}x${height - 100}`,
      quantity: doors,
      edge_band: '2mm',
      rate: 0
    });
  }

  // Drawers
  if (drawers > 0) {
    const drawerHeight = Math.floor((height - 50) / drawers);
    panels.push(
      { name: 'Vanity Drawer Fronts', type: 'panel', size: `${width - 3}x${drawerHeight}`, quantity: drawers, edge_band: '2mm', rate: 0 },
      { name: 'Vanity Drawer Sides', type: 'panel', size: `${drawerHeight - 16}x${depth - 50}`, quantity: drawers * 2, edge_band: '0.8mm', rate: 0 },
      { name: 'Vanity Drawer Bottoms', type: 'panel', size: `${width - 36}x${depth - 50}`, quantity: drawers, edge_band: '0.8mm', rate: 0 }
    );
  }

  // Mirror cabinet
  if (mirror) {
    panels.push(
      { name: 'Mirror Cabinet Frame', type: 'panel', size: `${width}x${600}`, quantity: 1, edge_band: '2mm', rate: 0 },
      { name: 'Mirror Cabinet Door', type: 'panel', size: `${width - 3}x${597}`, quantity: 1, edge_band: '2mm', rate: 0 },
      { name: 'Mirror Cabinet Shelf', type: 'panel', size: `${width - 36}x${150}`, quantity: 2, edge_band: '0.8mm', rate: 0 }
    );
  }

  // Side storage unit
  if (sideUnit) {
    panels.push(
      { name: 'Side Unit Top', type: 'panel', size: `${300}x${depth}`, quantity: 1, edge_band: '2mm', rate: 0 },
      { name: 'Side Unit Bottom', type: 'panel', size: `${300}x${depth}`, quantity: 1, edge_band: '2mm', rate: 0 },
      { name: 'Side Unit Sides', type: 'panel', size: `${height}x${depth}`, quantity: 2, edge_band: '2mm', rate: 0 },
      { name: 'Side Unit Door', type: 'panel', size: `${297}x${height - 50}`, quantity: 1, edge_band: '2mm', rate: 0 }
    );
  }

  return panels;
}

// Generate hardware for wardrobe
const generateWardrobeHardware = (input: CalculationInput): Hardware[] => {
  const { height, width, depth, boardThickness, partsConfig } = input;
  const hardware: Hardware[] = [];

  // Calculate internal dimensions for hanging rod
  const panelThickness = parseInt(boardThickness.replace('mm', ''));
  const internalWidth = width - (2 * panelThickness);
  const bayClearWidth = internalWidth; // Assuming single bay for now

  // Locks - 1 per shutter
  if (partsConfig.shutters > 0) {
    hardware.push({
      item: "Lock",
      qty: partsConfig.shutters,
      unit_rate: DEFAULT_RATES.hardware.lock,
      total_cost: partsConfig.shutters * DEFAULT_RATES.hardware.lock,
    });

    // Optional center-lock for two doors (configurable)
    if (partsConfig.shutters === 2) {
      hardware.push({
        item: "Center Lock Set",
        qty: 1,
        unit_rate: DEFAULT_RATES.hardware.lock * 0.8, // Slightly less expensive
        total_cost: DEFAULT_RATES.hardware.lock * 0.8,
      });
    }
  }

  // Handles - 1 per shutter, 1 per drawer
  const totalHandles = partsConfig.shutters + partsConfig.drawers;
  if (totalHandles > 0) {
    hardware.push({
      item: "Handle",
      qty: totalHandles,
      unit_rate: DEFAULT_RATES.hardware.handle,
      total_cost: totalHandles * DEFAULT_RATES.hardware.handle,
    });
  }

  // Hinges - 3 per shutter if H ≤ 1200mm, else 4 per shutter
  if (partsConfig.shutters > 0) {
    const hingesPerShutter = height <= 1200 ? 3 : 4;
    const totalHinges = partsConfig.shutters * hingesPerShutter;
    hardware.push({
      item: "Hinge",
      qty: totalHinges,
      unit_rate: DEFAULT_RATES.hardware.hinge,
      total_cost: totalHinges * DEFAULT_RATES.hardware.hinge,
    });
  }

  // Drawer slides - count in sets (1 set/drawer = 2 pcs)
  if (partsConfig.drawers > 0) {
    hardware.push({
      item: "Drawer Slide Set",
      qty: partsConfig.drawers, // Show sets, not individual pieces
      unit_rate: DEFAULT_RATES.hardware.drawer_slide * 2, // Price per set (2 pieces)
      total_cost: partsConfig.drawers * DEFAULT_RATES.hardware.drawer_slide * 2,
    });
  }

  // Minifix & Dowels based on joints
  // joints = 4 (top↔sides + bottom↔sides) + partitions*2
  const partitions = partsConfig.shelves; // Shelves act as partitions
  const joints = 4 + (partitions * 2);
  
  const totalMinifix = Math.ceil(joints * 3); // 3 per joint
  hardware.push({
    item: "Minifix",
    qty: totalMinifix,
    unit_rate: DEFAULT_RATES.hardware.minifix,
    total_cost: totalMinifix * DEFAULT_RATES.hardware.minifix,
  });

  const totalDowels = Math.ceil(joints * 5); // 5 per joint
  hardware.push({
    item: "Dowel",
    qty: totalDowels,
    unit_rate: DEFAULT_RATES.hardware.dowel,
    total_cost: totalDowels * DEFAULT_RATES.hardware.dowel,
  });

  // Hanging rod with bay clear width
  if (partsConfig.shutters > 0) { // Only for wardrobes with doors
    hardware.push({
      item: `Hanging Rod (${bayClearWidth}mm)`,
      qty: 1,
      unit_rate: 150, // Rod price (could add to DEFAULT_RATES)
      total_cost: 150,
    });
  }

  // Straightener - if H > 2100mm, 1 per shutter
  if (height > 2100 && partsConfig.shutters > 0) {
    hardware.push({
      item: "Straightener",
      qty: partsConfig.shutters,
      unit_rate: DEFAULT_RATES.hardware.straightener,
      total_cost: partsConfig.shutters * DEFAULT_RATES.hardware.straightener,
    });
  }

  return hardware;
};

// Generate hardware for storage units and bookshelves
function generateStorageUnitHardware(input: any) {
  const hardware: Hardware[] = [];
  const { shelves, drawers } = input.partsConfig;

  // Shelf supports
  if (shelves > 0) {
    hardware.push({
      item: "Shelf Support Pins",
      qty: shelves * 4,
      unit_rate: 5,
      total_cost: shelves * 4 * 5
    });
  }

  // Drawer hardware
  if (drawers > 0) {
    hardware.push(
      {
        item: "Drawer Slide Set",
        qty: drawers, // Count in sets (1 set = 2 pieces)
        unit_rate: 180 * 2,
        total_cost: drawers * 180 * 2
      },
      {
        item: "Drawer Handles",
        qty: drawers,
        unit_rate: 85,
        total_cost: drawers * 85
      }
    );
  }

  // Basic assembly hardware
  hardware.push({
    item: "Assembly Screws & Fittings",
    qty: 1,
    unit_rate: 150,
    total_cost: 150
  });

  return hardware;
}

// Generate hardware for dresser
function generateDresserHardware(input: any) {
  const hardware: Hardware[] = [];
  const { drawers, mirror } = input.partsConfig;

  // Drawer hardware
  hardware.push(
    {
      item: "Soft Close Drawer Slide Set",
      qty: drawers, // Count in sets (1 set = 2 pieces)
      unit_rate: 220 * 2,
      total_cost: drawers * 220 * 2
    },
    {
      item: "Dresser Handles",
      qty: drawers,
      unit_rate: 120,
      total_cost: drawers * 120
    }
  );

  // Mirror hardware
  if (mirror) {
    hardware.push({
      item: "Mirror Mounting Hardware",
      qty: 1,
      unit_rate: 200,
      total_cost: 200
    });
  }

  // Assembly hardware
  hardware.push({
    item: "Assembly Hardware & Screws",
    qty: 1,
    unit_rate: 180,
    total_cost: 180
  });

  return hardware;
}

// 🔧 SIMPLE KITCHEN HARDWARE CALCULATOR  
function generateKitchenCabinetHardware(input: CalculationInput): Hardware[] {
  const hardware: Hardware[] = [];
  const { 
    baseCabinets = 0, 
    wallCabinets = 0, 
    tallCabinets = 0, 
    island = false, 
    drawers = 0,
    cornerUnit = false,
    pulloutShelves = 0,
    lazySusan = false
  } = input.partsConfig;

  // Base cabinet hinges (2 per door)
  if (baseCabinets > 0) {
    const baseDoors = baseCabinets * 2;
    hardware.push(
      {
        item: "Base Cabinet Soft Close Hinges",
        qty: baseDoors * 2,
        unit_rate: 75,
        total_cost: baseDoors * 2 * 75
      },
      {
        item: "Base Cabinet Handles",
        qty: baseDoors,
        unit_rate: 95,
        total_cost: baseDoors * 95
      },
      {
        item: "Cabinet Shelf Pins",
        qty: baseCabinets * 8,
        unit_rate: 5,
        total_cost: baseCabinets * 8 * 5
      }
    );
  }

  // Wall cabinet hinges
  if (wallCabinets > 0) {
    const wallDoors = wallCabinets * 2;
    hardware.push(
      {
        item: "Wall Cabinet Hinges",
        qty: wallDoors * 2,
        unit_rate: 65,
        total_cost: wallDoors * 2 * 65
      },
      {
        item: "Wall Cabinet Handles",
        qty: wallDoors,
        unit_rate: 85,
        total_cost: wallDoors * 85
      }
    );
  }

  // Tall cabinet hinges  
  if (tallCabinets > 0) {
    const tallDoors = tallCabinets * 2;
    hardware.push(
      {
        item: "Tall Cabinet Hinges",
        qty: tallDoors * 3, // 3 hinges per tall door
        unit_rate: 75,
        total_cost: tallDoors * 3 * 75
      },
      {
        item: "Tall Cabinet Handles",
        qty: tallDoors,
        unit_rate: 110,
        total_cost: tallDoors * 110
      }
    );
  }

  // Kitchen drawers with premium slides
  if (drawers > 0) {
    hardware.push(
      {
        item: "Kitchen Drawer Slide Set (Heavy Duty)",
        qty: drawers, // Count in sets (1 set = 2 pieces)
        unit_rate: 350 * 2,
        total_cost: drawers * 350 * 2
      },
      {
        item: "Kitchen Drawer Handles",
        qty: drawers,
        unit_rate: 150,
        total_cost: drawers * 150
      }
    );
  }

  // Island hardware
  if (island) {
    hardware.push(
      {
        item: "Island Cabinet Hinges",
        qty: 8, // 4 doors × 2 hinges
        unit_rate: 85,
        total_cost: 8 * 85
      },
      {
        item: "Island Handles",
        qty: 4,
        unit_rate: 125,
        total_cost: 4 * 125
      }
    );
  }

  // Corner unit accessories
  if (cornerUnit) {
    hardware.push(
      {
        item: "Corner Cabinet Lazy Susan",
        qty: 1,
        unit_rate: 1200,
        total_cost: 1200
      },
      {
        item: "Corner Cabinet Hinges",
        qty: 4,
        unit_rate: 95,
        total_cost: 4 * 95
      }
    );
  }

  // Kitchen accessories
  hardware.push(
    {
      item: "Kitchen Cabinet Door Stoppers",
      qty: 20,
      unit_rate: 25,
      total_cost: 20 * 25
    },
    {
      item: "Kitchen Assembly Hardware",
      qty: 1,
      unit_rate: 500,
      total_cost: 500
    }
  );

  return hardware;
}

// Generate hardware for bathroom vanity
function generateBathroomVanityHardware(input: any) {
  const hardware: Hardware[] = [];
  const { drawers, doors, mirror, sideUnit } = input.partsConfig;

  // Door hinges
  if (doors > 0) {
    hardware.push(
      {
        item: "Vanity Door Hinges (Soft Close)",
        qty: doors * 2,
        unit_rate: 85,
        total_cost: doors * 2 * 85
      },
      {
        item: "Vanity Door Handles",
        qty: doors,
        unit_rate: 110,
        total_cost: doors * 110
      }
    );
  }

  // Drawer hardware
  if (drawers > 0) {
    hardware.push(
      {
        item: "Vanity Drawer Slide Set (Soft Close)",
        qty: drawers, // Count in sets (1 set = 2 pieces)
        unit_rate: 200 * 2,
        total_cost: drawers * 200 * 2
      },
      {
        item: "Vanity Drawer Handles",
        qty: drawers,
        unit_rate: 95,
        total_cost: drawers * 95
      }
    );
  }

  // Mirror hardware
  if (mirror) {
    hardware.push({
      item: "Mirror Cabinet Hardware",
      qty: 1,
      unit_rate: 250,
      total_cost: 250
    });
  }

  // Side unit hardware
  if (sideUnit) {
    hardware.push(
      {
        item: "Side Unit Hinges",
        qty: 2,
        unit_rate: 75,
        total_cost: 2 * 75
      },
      {
        item: "Side Unit Handle",
        qty: 1,
        unit_rate: 95,
        total_cost: 95
      }
    );
  }

  // Assembly and mounting hardware
  hardware.push({
    item: "Vanity Assembly & Mounting Hardware",
    qty: 1,
    unit_rate: 200,
    total_cost: 200
  });

  return hardware;
}

// Per-type part builders implementing the spec requirements
function buildOpenableWardrobeParts(input: CalculationInput): Panel[] {
  const { height, width, depth } = input;
  const { shutters, shelves, doors } = input.partsConfig;
  const thickness = input.boardThickness;
  const panels: Panel[] = [];

  // Enforce minimum shutters for openable
  const actualShutters = Math.max(1, shutters);
  
  // Sides: (height × depth) × 2 @ 18mm
  panels.push({
    panel: "Side Panel",
    qty: 2,
    length: height,
    width: depth,
    materialType: thickness,
    edge_banding: "2mm",
    area_sqft: partAreaSqft(height, depth, 2),
    edgeBandingLength: bandPerimeterMm(height, depth, 2) * 2 // 2 front edges
  });

  // Top/Bottom: (width × depth) × 2 @ 18mm  
  panels.push({
    panel: "Top Panel",
    qty: 1,
    length: width,
    width: depth,
    materialType: thickness,
    edge_banding: "2mm", 
    area_sqft: partAreaSqft(width, depth, 1),
    edgeBandingLength: bandPerimeterMm(width, depth, 1) // 1 front edge
  });
  
  panels.push({
    panel: "Bottom Panel",
    qty: 1,
    length: width,
    width: depth,
    materialType: thickness,
    edge_banding: "2mm",
    area_sqft: partAreaSqft(width, depth, 1),
    edgeBandingLength: bandPerimeterMm(width, depth, 1) // 1 front edge
  });

  // Back: (width × height) @ 6-9mm
  const backThickness = "6mm";
  panels.push({
    panel: "Back Panel",
    qty: 1,
    length: width,
    width: height,
    materialType: backThickness,
    edge_banding: "0mm",
    area_sqft: partAreaSqft(width, height, 1),
    edgeBandingLength: 0
  });

  // Shelves: (bayWidth × depth) × nShelves @ 18mm
  const bayWidth = (width - (actualShutters - 1) * SHUTTER_GAP_MM) / actualShutters;
  if (shelves > 0) {
    panels.push({
      panel: "Shelf",
      qty: shelves,
      length: bayWidth - 4, // clearance
      width: depth - 2, // clearance
      materialType: thickness,
      edge_banding: "0.8mm",
      area_sqft: partAreaSqft(bayWidth - 4, depth - 2, shelves),
      edgeBandingLength: bandPerimeterMm(bayWidth - 4, depth - 2, 1) * shelves // 1 front edge each
    });
  }

  // Shutters: (height × (width - gaps)/shutters) × shutters @ 18mm
  const shutterGaps = (actualShutters - 1) * SHUTTER_GAP_MM + 2 * 2; // side clearances
  const shutterWidth = (width - shutterGaps) / actualShutters;
  panels.push({
    panel: "Shutter",
    qty: actualShutters,
    length: height - 4, // clearance
    width: shutterWidth,
    materialType: thickness,
    edge_banding: "2mm",
    area_sqft: partAreaSqft(height - 4, shutterWidth, actualShutters),
    edgeBandingLength: bandPerimeterMm(height - 4, shutterWidth, 4) * actualShutters // 4 edges if board doors
  });

  return panels;
}

function buildSlidingWardrobeParts(input: CalculationInput): Panel[] {
  const panels = buildOpenableWardrobeParts(input);
  
  // Enforce minimum shutters for sliding
  const actualShutters = Math.max(2, input.partsConfig.shutters);
  
  // Update shutter configuration for sliding - grain vertical, often no edge band if aluminum profile
  const shutterIndex = panels.findIndex(p => p.panel === "Shutter");
  if (shutterIndex >= 0) {
    panels[shutterIndex] = {
      ...panels[shutterIndex],
      qty: actualShutters,
      edge_banding: "0mm", // aluminum profile often used
      edgeBandingLength: 0
    };
  }

  return panels;
}

function buildWalkInParts(input: CalculationInput): Panel[] {
  const { height, width, depth } = input;
  const { shelves } = input.partsConfig;
  const thickness = input.boardThickness;
  const panels: Panel[] = [];

  // No shutters for walk-in (enforced in validation)
  
  // Sides: (height × depth) × 2 @ 18mm
  panels.push({
    panel: "Side Panel",
    qty: 2,
    length: height,
    width: depth,
    materialType: thickness,
    edge_banding: "2mm",
    area_sqft: partAreaSqft(height, depth, 2),
    edgeBandingLength: bandPerimeterMm(height, depth, 2) * 2
  });

  // Top/Bottom
  panels.push({
    panel: "Top Panel",
    qty: 1,
    length: width,
    width: depth,
    materialType: thickness,
    edge_banding: "2mm",
    area_sqft: partAreaSqft(width, depth, 1),
    edgeBandingLength: bandPerimeterMm(width, depth, 1)
  });

  // Shelves - more shelves for walk-in storage
  if (shelves > 0) {
    panels.push({
      panel: "Shelf",
      qty: shelves,
      length: width - 4,
      width: depth - 2,
      materialType: thickness,
      edge_banding: "0.8mm",
      area_sqft: partAreaSqft(width - 4, depth - 2, shelves),
      edgeBandingLength: bandPerimeterMm(width - 4, depth - 2, 1) * shelves // shelf fronts
    });
  }

  return panels;
}

function buildBedParts(input: CalculationInput): Panel[] {
  const { height, width, depth } = input;
  const { bedType = 'box', mattressSize = 'queen' } = input.partsConfig as any;
  const thickness = input.boardThickness;
  const panels: Panel[] = [];

  // Map mattress size to dimensions (from spec)
  const mattressDims = {
    single: { width: 900, length: 1900 },
    double: { width: 1200, length: 1900 },
    queen: { width: 1500, length: 2000 },
    king: { width: 1800, length: 2000 }
  };
  
  const mattress = mattressDims[mattressSize as keyof typeof mattressDims] || mattressDims.queen;
  const railHeight = height || 350; // default rail height

  if (bedType === 'box' || bedType === 'hydraulic') {
    // Rails: Sides and Head/Foot
    panels.push({
      panel: "Side Rail",
      qty: 2,
      length: mattress.length,
      width: railHeight,
      materialType: thickness,
      edge_banding: "2mm",
      area_sqft: partAreaSqft(mattress.length, railHeight, 2),
      edgeBandingLength: bandPerimeterMm(mattress.length, railHeight, 1) * 2 // top edge visible
    });

    panels.push({
      panel: "Head Rail",
      qty: 1,
      length: mattress.width,
      width: railHeight,
      materialType: thickness,
      edge_banding: "2mm",
      area_sqft: partAreaSqft(mattress.width, railHeight, 1),
      edgeBandingLength: bandPerimeterMm(mattress.width, railHeight, 1)
    });

    panels.push({
      panel: "Foot Rail",
      qty: 1,
      length: mattress.width,
      width: railHeight,
      materialType: thickness,
      edge_banding: "2mm",
      area_sqft: partAreaSqft(mattress.width, railHeight, 1),
      edgeBandingLength: bandPerimeterMm(mattress.width, railHeight, 1)
    });

    // Base: slats or full board
    panels.push({
      panel: "Base",
      qty: 1,
      length: mattress.length - 20, // clearance
      width: mattress.width - 20,
      materialType: "12mm",
      edge_banding: "0mm",
      area_sqft: partAreaSqft(mattress.length - 20, mattress.width - 20, 1),
      edgeBandingLength: 0
    });
  }

  if (bedType === 'platform') {
    // Platform: Top deck
    panels.push({
      panel: "Platform Deck",
      qty: 1,
      length: mattress.length,
      width: mattress.width,
      materialType: "25mm",
      edge_banding: "2mm",
      area_sqft: partAreaSqft(mattress.length, mattress.width, 1),
      edgeBandingLength: bandPerimeterMm(mattress.length, mattress.width, 4) // 4 edges exposed
    });
  }

  return panels;
}

// Calculate BOM for different unit types
export { DEFAULT_RATES };

export const calculateBOM = async (input: CalculationInput, boardRates?: any, hardwareRates?: any, exposedSides: boolean = false): Promise<BOMResult> => {
  let panels: Panel[] = [];
  let hardware: Hardware[] = [];

  // 🎯 ENHANCED PRICE RESOLUTION: Check BOM settings first, fallback to custom rates, then defaults
  const defaultBoardRate = DEFAULT_RATES.board[input.boardType as keyof typeof DEFAULT_RATES.board] || 80;
  const boardRate = boardRates?.[input.boardType] || await getBOMPrice(input.boardType, defaultBoardRate);
  
  // Enhanced edge banding price resolution
  const enhancedEdgeRates = {
    '2mm': await getBOMPrice('2mm', DEFAULT_RATES.edge_banding['2mm'] || 8),
    '0.8mm': await getBOMPrice('0.8mm', DEFAULT_RATES.edge_banding['0.8mm'] || 4),
    '1mm': await getBOMPrice('1mm', DEFAULT_RATES.edge_banding['1mm'] || 5),
    '3mm': await getBOMPrice('3mm', DEFAULT_RATES.edge_banding['3mm'] || 12),
  };
  
  // Enhanced hardware price resolution  
  const enhancedHwRates = {
    soft_close_hinge: await getBOMPrice('soft_close_hinge', DEFAULT_RATES.hardware.soft_close_hinge || 90),
    normal_hinge: await getBOMPrice('normal_hinge', DEFAULT_RATES.hardware.normal_hinge || 30),
    drawer_slide_soft_close: await getBOMPrice('drawer_slide_soft_close', DEFAULT_RATES.hardware.drawer_slide_soft_close || 180),
    ss_handle: await getBOMPrice('ss_handle', DEFAULT_RATES.hardware.ss_handle || 180),
    aluminium_handle: await getBOMPrice('aluminium_handle', DEFAULT_RATES.hardware.aluminium_handle || 120),
    minifix: await getBOMPrice('minifix', DEFAULT_RATES.hardware.minifix || 15),
    dowel: await getBOMPrice('dowel', DEFAULT_RATES.hardware.dowel || 3),
    // Legacy fallbacks
    hinge: await getBOMPrice('normal_hinge', DEFAULT_RATES.hardware.hinge || 60),
    handle: await getBOMPrice('aluminium_handle', DEFAULT_RATES.hardware.handle || 120),
    drawer_slide: await getBOMPrice('drawer_slide_normal', DEFAULT_RATES.hardware.drawer_slide || 150),
    lock: await getBOMPrice('door_lock', DEFAULT_RATES.hardware.lock || 80),
  };
  
  const edgeRates = hardwareRates?.edge_banding || enhancedEdgeRates;
  const hwRates = hardwareRates?.hardware || enhancedHwRates;

  // Generate panels and hardware based on unit type
  switch (input.unitType) {
    case 'bed':
      panels = generateBedPanels(input);
      hardware = generateBedHardware(input);
      break;
      
    case 'wardrobe':
      panels = generateWardrobePanels(input, exposedSides); // Use exposedSides parameter
      hardware = generateWardrobeHardware(input);
      break;
      
    case 'storage_unit':
    case 'bookshelf':
      panels = generateStorageUnitPanels(input);
      hardware = generateStorageUnitHardware(input);
      break;
      
    case 'tv_panel':
      // TV panels are typically wall-mounted with fewer components
      panels = generateWardrobePanels({
        ...input,
        partsConfig: {
          ...input.partsConfig,
          drawers: 0,
          shutters: Math.max(1, input.partsConfig.shutters), // At least 1 panel
        }
      }, false); // Default: no exposed sides
      hardware = [
        ...generateWardrobeHardware({
          ...input,
          partsConfig: {
            ...input.partsConfig,
            drawers: 0,
          }
        }),
        {
          item: "Wall Bracket",
          qty: 4, // Standard wall mounting
          unit_rate: hwRates.wall_bracket || 50,
          total_cost: 4 * (hwRates.wall_bracket || 50),
        }
      ];
      break;
      
    case 'dresser':
      panels = generateDresserPanels(input);
      hardware = generateDresserHardware(input);
      break;
      
    case 'kitchen_cabinet':
      panels = generateKitchenCabinetPanels(input);
      hardware = generateKitchenCabinetHardware(input);
      break;
      
    case 'bathroom_vanity':
      panels = generateBathroomVanityPanels(input);
      hardware = generateBathroomVanityHardware(input);
      break;
      
    case 'shoe_rack':
      // Shoe racks are typically open shelving
      panels = generateWardrobePanels({
        ...input,
        partsConfig: {
          ...input.partsConfig,
          shutters: 0,
          drawers: 0,
          shelves: Math.max(3, input.partsConfig.shelves), // Minimum 3 shelves
        }
      }, true); // Shoe racks typically have exposed sides
      hardware = generateWardrobeHardware({
        ...input,
        partsConfig: {
          ...input.partsConfig,
          shutters: 0,
          drawers: 0,
        }
      });
      break;
      
    default:
      // Custom or other types - use wardrobe as template
      panels = generateWardrobePanels(input, exposedSides); // Use exposedSides parameter
      hardware = generateWardrobeHardware(input);
  }

  // Calculate costs
  let material_cost = 0;
  let totalBoardArea = 0;
  let boardAreaByThickness: { [thickness: string]: number } = {};
  let totalEdgeBanding2mm = 0;
  let totalEdgeBanding0_8mm = 0;

  // Panel costs
  panels.forEach(panel => {
    const panelCost = panel.area_sqft * boardRate;
    material_cost += panelCost;
    totalBoardArea += panel.area_sqft;
    
    // Group by thickness (extract thickness from material)
    // Material format is like "18mm PRE_LAM_PARTICLE_BOARD"
    const thicknessMatch = panel.material.match(/^(\d+(?:\.\d+)?mm)/);
    const thickness = thicknessMatch ? thicknessMatch[1] : 'unknown';
    
    if (!boardAreaByThickness[thickness]) {
      boardAreaByThickness[thickness] = 0;
    }
    boardAreaByThickness[thickness] += panel.area_sqft;
    
    // Edge banding costs
    const edgeBandingRate = edgeRates[panel.edge_banding as keyof typeof edgeRates] || 0;
    const edgeBandingCost = panel.edgeBandingLength * edgeBandingRate;
    material_cost += edgeBandingCost;
    
    if (panel.edge_banding === "2mm") {
      totalEdgeBanding2mm += panel.edgeBandingLength;
    } else if (panel.edge_banding === "0.8mm") {
      totalEdgeBanding0_8mm += panel.edgeBandingLength;
    }
  });

  // Hardware costs
  const hardware_cost = hardware.reduce((sum, item) => sum + item.total_cost, 0);

  const total_cost = material_cost + hardware_cost;

  // Calculate sheet optimization for aggregation
  const sheetOptimization = calculateSheetOptimization(panels);
  
  // Create base BOM result
  const baseResult: BOMResult = {
    panels,
    hardware,
    material_cost,
    hardware_cost,
    total_cost,
    totalBoardArea,
    boardAreaByThickness,
    totalEdgeBanding2mm,
    totalEdgeBanding0_8mm,
    sheet_optimization: {
      sheets_required: sheetOptimization.sheets_required,
      efficiency: sheetOptimization.efficiency,
      waste_allowance: 0.1 // 10% waste allowance
    }
  };

  // Add aggregated purchase-oriented data
  try {
    const laminateResult = calculateLaminateBOM(panels, input.finish || 'laminate');
    const aggregatedData = computeAggregates(baseResult, laminateResult, sheetOptimization);
    
    return {
      ...baseResult,
      purchaseRequirements: aggregatedData.purchaseRequirements,
      consolidatedItems: aggregatedData.consolidatedItems,
      details: aggregatedData.details
    };
  } catch (error) {
    console.log('⚠️  Aggregation failed, returning base result:', error);
    return baseResult;
  }
};

// Generate a unique BOM number
export const generateBOMNumber = async (): Promise<string> => {
  // This will be implemented to check database for the latest number
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `BOM-${timestamp.toString().slice(-6)}${randomSuffix}`;
};

// Convert input dimensions based on unit of measure
export const convertDimensions = (height: number, width: number, depth: number, unitOfMeasure: string) => {
  if (unitOfMeasure === 'ft') {
    // Convert feet to mm
    return {
      height: height * 304.8,
      width: width * 304.8,
      depth: depth * 304.8,
    };
  }
  
  // Already in mm
  return { height, width, depth };
};

// ✅ WARDROBE-SPECIFIC BOM CALCULATION WITH EXACT USER FORMULAS
export const calculateWardrobeBOM = (data: any) => {
  // CRITICAL FIX: Convert dimensions from feet to mm if needed
  const { height: rawHeight, width: rawWidth, depth: rawDepth, unitOfMeasure = 'ft', partsConfig, finish, exposedSides = false } = data;
  const { height, width, depth } = convertDimensions(rawHeight, rawWidth, rawDepth, unitOfMeasure);
  
  // Extract wardrobe-specific configuration
  const wardrobeType = partsConfig.wardrobeType || 'openable'; // openable, sliding, walk-in
  const hasLoft = partsConfig.hasLoft || false;
  const loftHeight = partsConfig.loftHeight || 600; // default 600mm
  const loftWidth = partsConfig.loftWidth || width; // default to main wardrobe width
  const shutterCount = wardrobeType === 'walk-in' ? 0 : (partsConfig.shutterCount || partsConfig.shutters || 2);
  const shelfCount = partsConfig.shelfCount || partsConfig.shelves || 3;
  const drawerCount = partsConfig.drawerCount || partsConfig.drawers || 0;
  
  console.log('=== WARDROBE BOM CALCULATION START (USER FORMULAS) ===');
  console.log('Raw input:', { height: rawHeight, width: rawWidth, depth: rawDepth, unitOfMeasure });
  console.log('Converted dimensions (mm):', { height, width, depth, finish });
  
  // ✅ OPTIMIZED WARDROBE THICKNESS MAPPING (ONLY 18mm & 6mm)
  const getThickness = (part: string): number => {
    if (part.toLowerCase().includes('shutter') || part.toLowerCase().includes('door')) return 18;
    if (part.toLowerCase().includes('side') || part.toLowerCase().includes('top') || part.toLowerCase().includes('bottom')) return 18;
    if (part.toLowerCase().includes('shelf')) return 18;
    if (part.toLowerCase().includes('back')) return 6;
    // ✅ OPTIMIZED DRAWER THICKNESSES (eliminate 12mm):
    if (part.toLowerCase().includes('drawer bottom')) return 6; // Drawer base = 6mm
    if (part.toLowerCase().includes('drawer')) return 18; // All other drawer parts = 18mm
    return 18; // default
  };

  // ✅ WARDROBE AREA CALCULATION: (Length × Width in mm) ÷ 92903 = sqft
  const calculateAreaSqft = (length: number, width: number): number => {
    return (length * width) / 92903;
  };

  const panels: any[] = [];
  let totalBoardArea = 0;
  let totalLaminateArea = 0;
  let totalEdgeBanding2mm = 0;
  let totalEdgeBanding0_8mm = 0;

  // 🔸 MAIN WARDROBE PARTS CONFIGURATION
  const wardrobeParts = [
    // Main carcass - 18mm PLY
    { name: 'Side Panel (L)', length: depth, width: height, qty: 1 },
    { name: 'Side Panel (R)', length: depth, width: height, qty: 1 },
    { name: 'Top Panel', length: width, width: depth, qty: 1 },
    { name: 'Bottom Panel', length: width, width: depth, qty: 1 },
    { name: 'Back Panel', length: width, width: height, qty: 1 }, // 6mm
    
    // Shutters - 18mm PLY (outer laminate) - ONLY for openable/sliding, NOT walk-in
    ...(wardrobeType !== 'walk-in' ? [
      { name: 'Shutter Panel', length: (width / shutterCount) - 5, width: height - 10, qty: shutterCount }
    ] : []),
    
    // Shelves - 18mm PLY (inner laminate)
    { name: 'Shelf', length: width - 36, width: depth - 20, qty: shelfCount },
    
    // ✅ OPTIMIZED DRAWERS (18mm for structure, 6mm for bottom)
    ...(drawerCount > 0 ? [
      { name: 'Drawer Front', length: (width / 2) - 5, width: 150, qty: drawerCount }, // 18mm - outer laminate
      { name: 'Drawer Side', length: depth - 50, width: 150, qty: drawerCount * 2 }, // 18mm
      { name: 'Drawer Back', length: (width / 2) - 40, width: 120, qty: drawerCount }, // 18mm
      { name: 'Drawer Bottom', length: (width / 2) - 20, width: depth - 30, qty: drawerCount },
    ] : []),
    
    // 🔸 LOFT PARTS (if hasLoft = true) - Uses custom loft width and height
    ...(hasLoft ? [
      { name: 'Loft Side Panel (L)', length: depth, width: loftHeight, qty: 1 },
      { name: 'Loft Side Panel (R)', length: depth, width: loftHeight, qty: 1 },
      { name: 'Loft Top Panel', length: loftWidth, width: depth, qty: 1 },
      { name: 'Loft Bottom Panel', length: loftWidth, width: depth, qty: 1 },
      { name: 'Loft Back Panel', length: loftWidth, width: loftHeight, qty: 1 }, // 6mm
      { name: 'Loft Shelf', length: loftWidth - 36, width: depth - 20, qty: 1 },
      // Loft shutters (only for openable/sliding) - Uses custom loft width
      ...(wardrobeType !== 'walk-in' ? [
        { name: 'Loft Shutter Panel', length: (loftWidth / shutterCount) - 5, width: loftHeight - 10, qty: shutterCount }
      ] : [])
    ] : []),
    
    // Custom parts
    ...(partsConfig.customParts?.filter((p: any) => p.name.trim()) || []).map((part: any) => ({
      name: part.name,
      length: 600, // default size for custom parts
      width: 300,
      qty: part.quantity
    }))
  ];

  // Process each panel with EXACT WARDROBE FORMULAS
  wardrobeParts.forEach(part => {
    const thickness = getThickness(part.name);
    const area = calculateAreaSqft(part.length, part.width);
    const totalPartArea = area * part.qty;
    
    // ✅ DYNAMIC Material type based on thickness AND boardType selection
    const boardTypeDisplay = (data.boardType || 'ply').replace(/_/g, ' ').toUpperCase();
    let materialType = '';
    if (thickness === 18) materialType = `18mm ${boardTypeDisplay}`;
    else if (thickness === 6) materialType = `6mm ${boardTypeDisplay}`;
    else materialType = `${thickness}mm ${boardTypeDisplay}`;
    
    totalBoardArea += totalPartArea;
    
    // ✅ WARDROBE EDGE BANDING LOGIC
    let edgeBanding2mm = 0;
    let edgeBanding0_8mm = 0;
    
    if (part.name.toLowerCase().includes('shutter')) {
      // Shutters: 4 sides banded (2mm PVC)
      edgeBanding2mm = ((part.length + part.width) * 2 / 1000) * part.qty;
    } else if (part.name.toLowerCase().includes('shelf')) {
      // Shelves: only front edge banded (0.8mm PVC)
      edgeBanding0_8mm = (part.length / 1000) * part.qty;
    } else if (part.name.toLowerCase().includes('side') && !part.name.toLowerCase().includes('drawer')) {
      // Carcass sides: only vertical front edge (2mm PVC)
      edgeBanding2mm = (part.width / 1000) * part.qty;
    } else if (part.name.toLowerCase().includes('drawer side')) {
      // Drawer sides: top edges only (0.8mm PVC)
      edgeBanding0_8mm = (part.length / 1000) * part.qty;
    }
    
    totalEdgeBanding2mm += edgeBanding2mm;
    totalEdgeBanding0_8mm += edgeBanding0_8mm;
    
    panels.push({
      panel: part.name,
      length: part.length,
      width: part.width,
      thickness: thickness,
      qty: part.qty,
      area_sqft: area,
      total_area: totalPartArea,
      materialType: materialType,
      edgeBanding2mm: edgeBanding2mm,
      edgeBanding0_8mm: edgeBanding0_8mm
    } as any);
  });

  // ✅ WARDROBE LAMINATE CALCULATION - USING CLEAN TYPESCRIPT ARCHITECTURE
  
  let outerLaminateArea = 0;
  let innerLaminateArea = 0;
  let laminateSummary: any = null;
  
  // 🎯 PRE-LAM BOARD CHECK: Skip laminate calculation for Pre-Lam boards
  const actualBoardType = data.boardType || 'ply';
  const isPreLamBoard = actualBoardType === 'pre_lam_particle_board';
  
  if (finish === 'laminate' && !isPreLamBoard) {
    
    // Convert our panels to the clean typed format
    const laminatePanels = panels.map((panel: any, index: number) => ({
      id: `panel-${index}`,
      kind: mapPanelNameToKind(panel.panel),
      w_mm: panel.length,
      h_mm: panel.width,
      qty: panel.qty,
      // 🎯 FIX: Set isExposedEnd correctly for side panels
      isExposedEnd: (panel.panel.toLowerCase().includes('side panel') || 
                     panel.panel.toLowerCase().includes('loft side panel')) && exposedSides
    }));
    
    const wardrobeTypeClean = mapWardrobeType(wardrobeType || 'openable');
    
    const rates = {
      outerRatePerSqft: 85,
      innerRatePerSqft: 65,
      adhesiveCoverageSqftPerBottle: 32,
      adhesiveBottlePrice: 85,
      adhesiveWastePct: 0.10 // 10% waste
    };
    
    // 🎯 ENHANCED PRICE RESOLUTION FOR LAMINATE MATERIALS
    const laminateRatesEnhanced = {
      outerRatePerSqft: DEFAULT_RATES.laminate.outer_laminate || 210,
      innerRatePerSqft: DEFAULT_RATES.laminate.inner_laminate || 150,
      acrylicRatePerSqft: DEFAULT_RATES.laminate.acrylic_finish || 380,
      veneerRatePerSqft: DEFAULT_RATES.laminate.veneer_finish || 320,
      paintRatePerSqft: DEFAULT_RATES.laminate.paint_finish || 180,
      membraneRatePerSqft: DEFAULT_RATES.laminate.membrane_foil || 95,
      adhesiveCoverageSqftPerBottle: DEFAULT_RATES.laminate.adhesive_coverage_sqft_per_bottle || 32,
      adhesiveBottlePrice: DEFAULT_RATES.laminate.adhesive_bottle_price || 85,
    };
    
    // Calculate using enhanced interconnected logic
    laminateSummary = calculateLaminateBOM(
      laminatePanels, 
      wardrobeTypeClean, 
      laminateRatesEnhanced,
      finish as any || "laminate", // Pass selected finish type from function parameter
      actualBoardType as any || "ply"    // Pass selected board type from data parameter
    );
    
    outerLaminateArea = laminateSummary.outerAreaSqft;
    innerLaminateArea = laminateSummary.innerAreaSqft;
    totalLaminateArea = laminateSummary.laminatedAreaSqft;
  } else if (isPreLamBoard) {
    console.log('🔧 Pre-Lam Particle Board detected in calculateWardrobeBOM: Skipping ALL laminate calculation');
    outerLaminateArea = 0;
    innerLaminateArea = 0;
    totalLaminateArea = 0;
    laminateSummary = null;
  }

  // 🔸 WARDROBE HARDWARE CALCULATIONS BASED ON TYPE
  const hardware: any[] = [];
  
  console.log(`=== HARDWARE CALCULATION for ${wardrobeType.toUpperCase()} wardrobe ===`);
  
  if (wardrobeType === 'openable') {
    // OPENABLE WARDROBE → Hinges + handles + straighteners
    
    // 1. Hinges based on shutter height
    const shutterHeight = height;
    let hingesPerShutter = 2; // ≤ 1200mm → 2 hinges
    if (shutterHeight > 1800) hingesPerShutter = 4; // > 1800mm → 4 hinges
    else if (shutterHeight > 1200) hingesPerShutter = 3; // 1200-1800mm → 3 hinges
    
    let totalHinges = shutterCount * hingesPerShutter;
    if (hasLoft) {
      // Add hinges for loft shutters
      const loftHingesPerShutter = loftHeight > 600 ? 3 : 2;
      totalHinges += shutterCount * loftHingesPerShutter;
    }
    
    hardware.push({
      item: 'Soft Close Hinges',
      qty: totalHinges,
      unit_rate: 45,
      total_cost: totalHinges * 45
    });
    
    // 2. Handles: 1 per shutter + loft shutter + drawer
    const totalHandles = shutterCount + (hasLoft ? shutterCount : 0) + drawerCount;
    hardware.push({
      item: 'Handle',
      qty: totalHandles,
      unit_rate: 120,
      total_cost: totalHandles * 120
    });
    
    // 3. Straightener: 1 per shutter if height > 2100mm
    if (shutterHeight > 2100) {
      hardware.push({
        item: 'Shutter Straightener',
        qty: shutterCount + (hasLoft ? shutterCount : 0),
        unit_rate: 80,
        total_cost: (shutterCount + (hasLoft ? shutterCount : 0)) * 80
      });
    }
    
  } else if (wardrobeType === 'sliding') {
    // SLIDING WARDROBE → Tracks + rollers + no hinges
    
    // 1. Sliding track set (top + bottom)
    hardware.push({
      item: 'Sliding Track Set (Top + Bottom)',
      qty: 1,
      unit_rate: 350,
      total_cost: 350
    });
    
    if (hasLoft) {
      hardware.push({
        item: 'Loft Sliding Track Set',
        qty: 1,
        unit_rate: 350,
        total_cost: 350
      });
    }
    
    // 2. Rollers: 2 per shutter (top rollers)
    const totalRollers = shutterCount * 2 + (hasLoft ? shutterCount * 2 : 0);
    hardware.push({
      item: 'Sliding Door Rollers',
      qty: totalRollers,
      unit_rate: 25,
      total_cost: totalRollers * 25
    });
    
    // 3. Handles: 1 per shutter + drawer (recessed/flush handles for sliding)
    const totalHandles = shutterCount + (hasLoft ? shutterCount : 0) + drawerCount;
    hardware.push({
      item: 'Flush Handle (Sliding)',
      qty: totalHandles,
      unit_rate: 80,
      total_cost: totalHandles * 80
    });
    
  } else if (wardrobeType === 'walk-in') {
    // WALK-IN WARDROBE → No shutter hardware, only shelves + partitions
    
    // No shutters, so no handles for shutters - only for drawers
    if (drawerCount > 0) {
      hardware.push({
        item: 'Handle (Drawer)',
        qty: drawerCount,
        unit_rate: 120,
        total_cost: drawerCount * 120
      });
    }
  }
  
  // COMMON HARDWARE FOR ALL TYPES:
  
  // Drawer Slides: 1 set per drawer (pair of channels)
  if (drawerCount > 0) {
    hardware.push({
      item: 'Drawer Channel (pair)',
      qty: drawerCount,
      unit_rate: 280,
      total_cost: drawerCount * 280
    });
  }
  
  // Minifix connectors: base wardrobe + loft
  const minifixQty = hasLoft ? 45 : 30; // more joints with loft
  hardware.push({
    item: 'Minifix Connector',
    qty: minifixQty,
    unit_rate: 8,
    total_cost: minifixQty * 8
  });
  
  // Dowels: base wardrobe + loft
  const dowelQty = hasLoft ? 75 : 50; // more joints with loft
  hardware.push({
    item: 'Wooden Dowel',
    qty: dowelQty,
    unit_rate: 2,
    total_cost: dowelQty * 2
  });
  
  // Hanging Rod: 1 per wardrobe + 1 for loft if applicable
  const hangingRods = 1 + (hasLoft ? 1 : 0);
  hardware.push({
    item: 'Hanging Rod (25mm)',
    qty: hangingRods,
    unit_rate: 150,
    total_cost: hangingRods * 150
  });

  console.log('=== WARDROBE CALCULATION RESULTS ===');
  console.log('Wardrobe Type:', wardrobeType);
  console.log('Has Loft:', hasLoft, hasLoft ? `(Height: ${loftHeight}mm, Width: ${loftWidth}mm)` : '');
  console.log('Shutters:', shutterCount, 'Shelves:', shelfCount, 'Drawers:', drawerCount);
  console.log('Total panels:', panels.length);
  console.log('Total board area:', totalBoardArea.toFixed(2), 'sqft');
  console.log('Total laminate area:', totalLaminateArea.toFixed(2), 'sqft');
  console.log('Edge banding 2mm:', totalEdgeBanding2mm.toFixed(2), 'meters');
  console.log('Edge banding 0.8mm:', totalEdgeBanding0_8mm.toFixed(2), 'meters');
  console.log('Hardware items:', hardware.length);

  // ✅ CRITICAL FIX: Add cost consolidation logic that was missing
  
  // Calculate material costs from panels
  let material_cost = 0;
  let boardAreaByThickness: { [thickness: string]: number } = {};
  
  panels.forEach(panel => {
    // ✅ CRITICAL FIX: Use correct rate for each thickness
    let boardRate = 147; // default 18mm rate
    const thickness = panel.thickness;
    
    // Select correct rate based on panel thickness
    if (thickness === 18) {
      boardRate = DEFAULT_RATES.board["18mm_plywood"] || 147;
    } else if (thickness === 12) {
      boardRate = DEFAULT_RATES.board["12mm_plywood"] || 120;
    } else if (thickness === 6) {
      boardRate = DEFAULT_RATES.board["6mm_plywood"] || 95;
    }
    
    // Panel board cost: area × thickness-specific rate per sqft
    const panelBoardCost = panel.area_sqft * boardRate;
    material_cost += panelBoardCost;
    
    console.log(`Panel: ${panel.panel}, Thickness: ${thickness}mm, Area: ${panel.area_sqft.toFixed(2)} sqft, Rate: ₹${boardRate}, Cost: ₹${panelBoardCost.toFixed(2)}`);
    
    // Group by thickness for sheet optimization
    const thicknessKey = `${thickness}mm`;
    if (!boardAreaByThickness[thicknessKey]) {
      boardAreaByThickness[thicknessKey] = 0;
    }
    boardAreaByThickness[thicknessKey] += panel.area_sqft;
    
    // Edge banding cost: length × rate per meter
    if (panel.edgeBandingLength && panel.edgeBandingLength > 0) {
      let edgeBandingRate = 0;
      if (panel.edgeBanding2mm > 0) {
        edgeBandingRate = DEFAULT_RATES.edge_banding["2mm"] || 8;
        material_cost += panel.edgeBanding2mm * edgeBandingRate;
      }
      if (panel.edgeBanding0_8mm > 0) {
        edgeBandingRate = DEFAULT_RATES.edge_banding["0.8mm"] || 4;  
        material_cost += panel.edgeBanding0_8mm * edgeBandingRate;
      }
    }
  });
  
  // Calculate hardware costs
  const hardware_cost = hardware.reduce((sum, item) => sum + item.total_cost, 0);
  
  // Calculate total cost
  const total_cost = material_cost + hardware_cost;
  
  console.log('=== THICKNESS OPTIMIZATION BREAKDOWN ===');
  Object.entries(boardAreaByThickness).forEach(([thickness, area]) => {
    const thicknessMm = parseInt(thickness.replace('mm', ''));
    let rate = 147;
    if (thicknessMm === 18) rate = DEFAULT_RATES.board["18mm_plywood"] || 147;
    else if (thicknessMm === 12) rate = DEFAULT_RATES.board["12mm_plywood"] || 120;
    else if (thicknessMm === 6) rate = DEFAULT_RATES.board["6mm_plywood"] || 95;
    const cost = area * rate;
    console.log(`${thickness} Plywood: ${area.toFixed(2)} sqft @ ₹${rate}/sqft = ₹${cost.toFixed(2)}`);
  });
  
  console.log('=== COST BREAKDOWN ===');
  console.log('Material cost: ₹' + material_cost.toFixed(2));
  console.log('Hardware cost: ₹' + hardware_cost.toFixed(2));
  console.log('Total cost: ₹' + total_cost.toFixed(2));

  return {
    panels,
    totalBoardArea,
    totalLaminateArea,
    totalEdgeBanding2mm,
    totalEdgeBanding0_8mm,
    hardware,
    // ✅ CRITICAL: Add the missing cost properties
    material_cost,
    hardware_cost,
    total_cost,
    boardAreaByThickness
  };
};