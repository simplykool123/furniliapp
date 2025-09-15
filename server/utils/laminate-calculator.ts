// laminate-calculator.ts - Clean TypeScript implementation
import type { Panel as NestingPanel, NestingOptions } from './nesting';
import { nestPanels } from './nesting';

export type WardrobeType = "OPENABLE" | "SLIDING" | "WALKIN";

export type PanelKind =
  | "SIDE" | "TOP" | "BOTTOM" | "SHELF" | "PARTITION" | "BACK"
  | "SHUTTER" | "DOOR" | "DRAWER_FRONT"
  | "LOFT_SIDE" | "LOFT_TOP" | "LOFT_BOTTOM" | "LOFT_BACK" | "LOFT_SHELF";

export type Panel = {
  id: string;
  kind: PanelKind;
  w_mm: number;
  h_mm: number;
  qty: number;
  // For carcass sides: is this edge visible to the room (not against a wall)?
  // Use for base & loft sides.
  isExposedEnd?: boolean;
};

export type FinishType = "laminate" | "acrylic" | "veneer" | "paint" | "membrane" | "natural";
export type BoardType = "pre_lam_particle_board" | "mdf" | "ply" | "solid_wood" | "hdf";

export type LaminateRates = {
  outerRatePerSqft: number; // e.g., 85 for laminate
  innerRatePerSqft: number; // e.g., 65 for laminate
  // 🎯 PREMIUM FINISH RATES
  acrylicRatePerSqft: number; // e.g., 380 for acrylic
  veneerRatePerSqft: number; // e.g., 320 for veneer  
  paintRatePerSqft: number; // e.g., 180 for paint
  membraneRatePerSqft: number; // e.g., 95 for membrane
  
  adhesiveCoverageSqftPerBottle: number; // e.g., 32
  adhesiveBottlePrice: number; // e.g., 85
  adhesiveWastePct?: number; // e.g., 0.10 (10%)
};

export type LaminateFace = "outer" | "inner" | "none";

export type LaminateSummary = {
  outerAreaSqft: number;
  innerAreaSqft: number;
  laminatedAreaSqft: number;
  adhesiveBottles: number;
  // 🎯 ENHANCED COSTS WITH MIXED FINISHES
  costs: {
    outerCost: number; // Cost for outer finish (could be acrylic/veneer/paint/laminate)
    innerCost: number; // Always laminate cost for inner surfaces
    adhesiveCost: number;
    total: number;
  };
  // 🎯 FINISH BREAKDOWN
  finishBreakdown: {
    outerFinish: FinishType; // What finish is applied to outer surfaces
    innerFinish: FinishType; // Always "laminate" for inner surfaces
    isPreLamBoard: boolean; // Whether this is pre-lam board (no additional finish needed)
  };
  // Optional: per-panel breakdown for UI
  perPanel: Array<{
    id: string;
    kind: PanelKind;
    areaSqft: number;
    faces: [LaminateFace, LaminateFace];
    faceAreas: { outer: number; inner: number; none: number };
  }>;
};

const MM2_PER_SQFT = 92903.04;

function areaSqft(w_mm: number, h_mm: number) {
  return (w_mm * h_mm) / MM2_PER_SQFT;
}

function facesForPanel(p: Panel, wardrobeType: WardrobeType): [LaminateFace, LaminateFace] {
  // Two faces per rectangular panel: [faceA, faceB]
  // Convention: for carcass sides, faceA = interior, faceB = exterior (room side)
  switch (p.kind) {
    case "SHUTTER":
    case "DOOR":
    case "DRAWER_FRONT":
      // Customer-facing fronts and backs laminated with outer on both sides
      return ["outer", "outer"];

    case "SIDE":
    case "LOFT_SIDE": {
      // Carcass sides: interior always inner; exterior is outer only if exposed
      const exterior: LaminateFace = p.isExposedEnd ? "outer" : "none";
      return ["inner", exterior];
    }

    case "TOP":
    case "BOTTOM":
    case "PARTITION":
    case "SHELF":
    case "LOFT_TOP":
    case "LOFT_BOTTOM":
    case "LOFT_SHELF":
      // Single visible interior face (keep simple, matches your rule)
      return ["inner", "none"];

    case "BACK":
    case "LOFT_BACK":
      return ["none", "none"];

    default:
      return ["none", "none"];
  }
}

// 🎯 EXTRAORDINARY DETAILED CALCULATOR WITH INTERCONNECTED LOGIC
export function calculateLaminateBOM(
  panels: Panel[],
  wardrobeType: WardrobeType,
  rates: LaminateRates,
  finishType: FinishType = "laminate",
  boardType: BoardType = "ply"
): LaminateSummary {
  // 🎯 RULE 1: PRE-LAM PARTICLE BOARD LOGIC
  const isPreLamBoard = boardType === "pre_lam_particle_board";
  
  if (isPreLamBoard) {
    // Pre-Lam board already has laminate applied - no additional finish needed
    console.log('🔧 Pre-Lam Particle Board detected: No additional laminate calculation needed');
    return {
      outerAreaSqft: 0,
      innerAreaSqft: 0, 
      laminatedAreaSqft: 0,
      adhesiveBottles: 0,
      costs: { outerCost: 0, innerCost: 0, adhesiveCost: 0, total: 0 },
      finishBreakdown: {
        outerFinish: "laminate", // Pre-applied
        innerFinish: "laminate", // Pre-applied
        isPreLamBoard: true
      },
      perPanel: []
    };
  }
  
  // 🎯 RULE 2: MIXED FINISH LOGIC (Acrylic/Veneer/Paint outer + Laminate inner)
  const {
    outerRatePerSqft, // For laminate outer
    innerRatePerSqft, // Always laminate for inner
    acrylicRatePerSqft,
    veneerRatePerSqft, 
    paintRatePerSqft,
    membraneRatePerSqft,
    adhesiveCoverageSqftPerBottle,
    adhesiveBottlePrice,
    adhesiveWastePct = 0.10, // Default 10% waste
  } = rates;
  
  // 🎯 DETERMINE OUTER SURFACE RATE BASED ON FINISH
  let actualOuterRate = outerRatePerSqft; // Default to laminate
  let outerFinishName: FinishType = "laminate";
  
  switch (finishType) {
    case "acrylic":
      actualOuterRate = acrylicRatePerSqft;
      outerFinishName = "acrylic";
      console.log('🎆 Premium Acrylic finish: Outer surfaces get Acrylic, Inner surfaces get Laminate');
      break;
    case "veneer":
      actualOuterRate = veneerRatePerSqft;
      outerFinishName = "veneer";
      console.log('🌳 Natural Veneer finish: Outer surfaces get Veneer, Inner surfaces get Laminate');
      break;
    case "paint":
      actualOuterRate = paintRatePerSqft;
      outerFinishName = "paint";
      console.log('🎨 Paint finish: Outer surfaces get Paint, Inner surfaces get Laminate');
      break;
    case "membrane":
      actualOuterRate = membraneRatePerSqft;
      outerFinishName = "membrane";
      console.log('🌊 Membrane finish: Outer surfaces get Membrane, Inner surfaces get Laminate');
      break;
    case "laminate":
    default:
      // Standard laminate on both surfaces
      console.log('🖼️ Standard Laminate finish: Both surfaces get Laminate');
      break;
  }

  let outerArea = 0, innerArea = 0;

  const perPanel = panels.map(p => {
    const a = areaSqft(p.w_mm, p.h_mm);
    const faces = facesForPanel(p, wardrobeType);
    
    // face contributions per unit panel
    const countOuterFaces = faces.filter(f => f === "outer").length;
    const countInnerFaces = faces.filter(f => f === "inner").length;

    const outerA = a * countOuterFaces * p.qty;
    const innerA = a * countInnerFaces * p.qty;

    outerArea += outerA;
    innerArea += innerA;

    return {
      id: p.id,
      kind: p.kind,
      areaSqft: a * p.qty,
      faces,
      faceAreas: {
        outer: outerA,
        inner: innerA,
        none: a * (2 - (countOuterFaces + countInnerFaces)) * p.qty,
      },
    };
  });

  const laminatedArea = outerArea + innerArea;

  const bottles = Math.ceil(
    (laminatedArea * (1 + adhesiveWastePct)) / Math.max(1, adhesiveCoverageSqftPerBottle)
  );

  // 🎯 CALCULATE COSTS WITH MIXED FINISHES
  const outerCost = outerArea * actualOuterRate; // Premium finish for outer surfaces
  const innerCost = innerArea * innerRatePerSqft; // Always laminate for inner surfaces
  const adhesiveCost = bottles * adhesiveBottlePrice;
  const total = outerCost + innerCost + adhesiveCost;

  return {
    outerAreaSqft: round2(outerArea),
    innerAreaSqft: round2(innerArea), 
    laminatedAreaSqft: round2(laminatedArea),
    adhesiveBottles: bottles,
    costs: {
      outerCost: round0(outerCost), // Cost for premium outer finish
      innerCost: round0(innerCost), // Cost for inner laminate
      adhesiveCost: round0(adhesiveCost),
      total: round0(total),
    },
    finishBreakdown: {
      outerFinish: outerFinishName,
      innerFinish: "laminate", // Always laminate for inner surfaces
      isPreLamBoard: false
    },
    perPanel,
  };
}

// Helper function to map our existing panel names to PanelKind
export function mapPanelNameToKind(panelName: string): PanelKind {
  const name = panelName.toLowerCase();
  
  console.log(`🔍 LAMINATE MAPPING: "${panelName}" → ${name}`);
  
  // Order matters - more specific checks first
  
  // Loft components (check before general components to avoid mismatching)
  if (name.includes('loft') && name.includes('side')) return "LOFT_SIDE";
  if (name.includes('loft') && name.includes('top')) return "LOFT_TOP";
  if (name.includes('loft') && name.includes('bottom')) return "LOFT_BOTTOM";
  if (name.includes('loft') && name.includes('back')) return "LOFT_BACK";
  if (name.includes('loft') && name.includes('shelf')) return "LOFT_SHELF";
  // 🎯 FIX: Loft shutters should be treated as SHUTTER for outer laminate
  if (name.includes('loft') && name.includes('shutter')) return "SHUTTER";
  
  // Visible front elements (get outer laminate) - check after loft
  if (name.includes('shutter')) return "SHUTTER";
  if (name.includes('door')) return "DOOR";
  if (name.includes('drawer front')) return "DRAWER_FRONT";
  
  // Drawer components
  if (name.includes('drawer side')) return "SIDE"; // Treat as interior sides
  if (name.includes('drawer back')) return "BACK"; // Treat as back panel
  if (name.includes('drawer bottom')) return "BOTTOM"; // Treat as bottom
  
  // Structural elements
  if (name.includes('side panel') || name.includes('side')) return "SIDE";
  if (name.includes('top panel') || name.includes('top')) return "TOP";  
  if (name.includes('bottom panel') || name.includes('bottom')) return "BOTTOM";
  if (name.includes('back panel') || name.includes('back')) return "BACK";
  if (name.includes('partition')) return "PARTITION";
  if (name.includes('shelf')) return "SHELF";
  
  console.log(`⚠️  UNMAPPED PANEL: "${panelName}" - defaulting to PARTITION`);
  
  // Default fallback
  return "PARTITION";
}

// Helper function to map wardrobe types
export function mapWardrobeType(wardrobeType: string): WardrobeType {
  const type = wardrobeType.toLowerCase();
  if (type === 'sliding') return "SLIDING";
  if (type === 'walkin') return "WALKIN";
  return "OPENABLE"; // Default
}

function round2(n: number) { return Math.round(n * 100) / 100; }
function round0(n: number) { return Math.round(n); }

// 🎯 LAMINATE SHEET OPTIMIZATION - Apply same nesting logic as plywood
export type LaminateSheetResult = {
  innerSheets: number;
  outerSheets: number;
  innerEfficiency: number;
  outerEfficiency: number;
  totalSheets: number;
};

export function calculateLaminateSheets(
  laminateSummary: LaminateSummary,
  panels: Panel[],
  sheetSize = { length: 2440, width: 1220 } // Standard 8x4 laminate sheet
): LaminateSheetResult {
  
  // Standard laminate sheet dimensions (same as plywood)
  const nestingOptions: NestingOptions = {
    sheetW: sheetSize.length,
    sheetH: sheetSize.width,
    kerf: 1, // Laminate uses thinner kerf (1mm vs 3mm for plywood)
    marginX: 5, // Smaller margin for laminate (5mm vs 10mm)
    marginY: 5,
    sort: "area-desc"
  };

  let innerSheets = 0, outerSheets = 0;
  let innerEfficiency = 0, outerEfficiency = 0;

  try {
    // Create virtual laminate panels for inner surfaces
    if (laminateSummary.innerAreaSqft > 0) {
      const innerPanels: NestingPanel[] = [];
      
      panels.forEach((panel, index) => {
        const faces = facesForPanel(panel, "OPENABLE"); // Use OPENABLE as default
        const panelAreaSqft = areaSqft(panel.w_mm, panel.h_mm);
        
        // Add panels that need inner laminate
        let innerFaces = 0;
        faces.forEach(face => { if (face === 'inner') innerFaces++; });
        
        if (innerFaces > 0) {
          // Create laminate pieces for each face
          for (let face = 0; face < innerFaces; face++) {
            innerPanels.push({
              id: `inner-${panel.id}-face${face}`,
              w: panel.w_mm,
              h: panel.h_mm,
              qty: panel.qty,
              allowRotate: true,
              grain: "none"
            });
          }
        }
      });

      if (innerPanels.length > 0) {
        const innerResult = nestPanels(innerPanels, nestingOptions);
        innerSheets = innerResult.sheets.length;
        innerEfficiency = innerResult.sheets.reduce((sum, sheet) => 
          sum + (sheet.utilization || 0), 0) / innerSheets;
      }
    }

    // Create virtual laminate panels for outer surfaces
    if (laminateSummary.outerAreaSqft > 0) {
      const outerPanels: NestingPanel[] = [];
      
      panels.forEach((panel, index) => {
        const faces = facesForPanel(panel, "OPENABLE"); // Use OPENABLE as default
        
        // Add panels that need outer laminate  
        let outerFaces = 0;
        faces.forEach(face => { if (face === 'outer') outerFaces++; });
        
        if (outerFaces > 0) {
          // Create laminate pieces for each face
          for (let face = 0; face < outerFaces; face++) {
            outerPanels.push({
              id: `outer-${panel.id}-face${face}`,
              w: panel.w_mm,
              h: panel.h_mm, 
              qty: panel.qty,
              allowRotate: true,
              grain: "none"
            });
          }
        }
      });

      if (outerPanels.length > 0) {
        const outerResult = nestPanels(outerPanels, nestingOptions);
        outerSheets = outerResult.sheets.length;
        outerEfficiency = outerResult.sheets.reduce((sum, sheet) => 
          sum + (sheet.utilization || 0), 0) / outerSheets;
      }
    }

  } catch (error) {
    console.warn('Laminate sheet optimization failed, using fallback calculation:', error);
    
    // Fallback to simple area-based calculation
    const sheetAreaSqft = (sheetSize.length * sheetSize.width) / MM2_PER_SQFT;
    innerSheets = Math.ceil(laminateSummary.innerAreaSqft / sheetAreaSqft);
    outerSheets = Math.ceil(laminateSummary.outerAreaSqft / sheetAreaSqft);
    innerEfficiency = outerEfficiency = 0.85; // Assume 85% efficiency
  }

  return {
    innerSheets,
    outerSheets,
    innerEfficiency: Math.round(innerEfficiency * 100) / 100,
    outerEfficiency: Math.round(outerEfficiency * 100) / 100,
    totalSheets: innerSheets + outerSheets
  };
}