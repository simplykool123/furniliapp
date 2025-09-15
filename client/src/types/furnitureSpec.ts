// FurnitureSpec Types - Technical Drawing System for BOM Calculator
export type FurnitureType = 
  | "wardrobe" 
  | "bed" 
  | "kitchen" 
  | "tvunit" 
  | "cabinet" 
  | "bookshelf"
  | "dresser" 
  | "door" 
  | "shelving" 
  | "table" 
  | "sofa" 
  | "panel";

export type FurnitureSpec = {
  type: FurnitureType;
  width: number;   // in mm
  height: number;  // in mm  
  depth: number;   // in mm
  options?: {
    // Wardrobe specific
    loft?: boolean;
    loftHeight?: number;
    shutters?: number;
    shelves?: number;
    drawers?: number;
    hangingRods?: number;
    mirror?: boolean;
    wardrobeType?: "openable" | "sliding" | "walkin";
    
    // Bed specific
    bedType?: "single" | "queen" | "king" | "king_xl" | "bunk";
    storage?: boolean;
    headboard?: boolean;
    footboard?: boolean;
    hydraulic?: boolean;
    
    // Kitchen specific
    baseCabinets?: number;
    wallCabinets?: number;
    tallCabinets?: number;
    pulloutShelves?: number;
    lazySusan?: boolean;
    cornerUnit?: boolean;
    island?: boolean;
    kitchenLayout?: string;
    
    // TV Unit specific
    tvSize?: string;
    glassShelf?: number;
    cableManagement?: boolean;
    ledLighting?: boolean;
    powerOutlets?: boolean;
    
    // General options
    seating?: number; // for sofas
    panels?: number;  // for paneling
    doors?: number;
    backPanels?: number;
    exposedSides?: boolean;
  };
};

// Helper function to convert BOM form data to FurnitureSpec
export function bomDataToFurnitureSpec(formData: any): FurnitureSpec {
  // Map unitType to FurnitureType
  const typeMap: { [key: string]: FurnitureType } = {
    'wardrobe': 'wardrobe',
    'bed': 'bed', 
    'kitchen_cabinet': 'kitchen',
    'tv_unit': 'tvunit',
    'cabinet': 'cabinet',
    'bookshelf': 'bookshelf',
    'dresser': 'dresser',
    'door': 'door',
    'shelving': 'shelving',
    'table': 'table',
    'sofa': 'sofa',
    'panel': 'panel'
  };

  return {
    type: typeMap[formData.unitType] || 'cabinet',
    width: formData.width,
    height: formData.height,
    depth: formData.depth,
    options: {
      // Wardrobe options
      loft: formData.partsConfig?.hasLoft,
      loftHeight: formData.partsConfig?.loftHeight,
      shutters: formData.partsConfig?.shutterCount || formData.partsConfig?.shutters,
      shelves: formData.partsConfig?.shelfCount || formData.partsConfig?.shelves,
      drawers: formData.partsConfig?.drawerCount || formData.partsConfig?.drawers,
      hangingRods: formData.partsConfig?.hangingRods,
      mirror: formData.partsConfig?.mirror,
      wardrobeType: formData.partsConfig?.wardrobeType as "openable" | "sliding" | "walkin",
      
      // Bed options
      bedType: formData.partsConfig?.bedType as "single" | "queen" | "king" | "king_xl" | "bunk",
      storage: formData.partsConfig?.storage === 'with_storage',
      headboard: formData.partsConfig?.headboard,
      footboard: formData.partsConfig?.footboard,
      hydraulic: formData.partsConfig?.storage === 'hydraulic',
      
      // Kitchen options
      baseCabinets: formData.partsConfig?.baseCabinets,
      wallCabinets: formData.partsConfig?.wallCabinets,
      tallCabinets: formData.partsConfig?.tallCabinets,
      pulloutShelves: formData.partsConfig?.pulloutShelves,
      lazySusan: formData.partsConfig?.lazySusan,
      cornerUnit: formData.partsConfig?.cornerUnit,
      island: formData.partsConfig?.island,
      kitchenLayout: formData.partsConfig?.kitchenLayout,
      
      // TV Unit options
      tvSize: formData.partsConfig?.tvSize,
      glassShelf: formData.partsConfig?.glassShelf,
      cableManagement: formData.partsConfig?.cableManagement,
      ledLighting: formData.partsConfig?.ledLighting,
      powerOutlets: formData.partsConfig?.powerOutlets,
      
      // General options
      doors: formData.partsConfig?.doors,
      backPanels: formData.partsConfig?.backPanels,
      exposedSides: formData.partsConfig?.exposedSides,
    }
  };
}