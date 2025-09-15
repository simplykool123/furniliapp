import { db } from "../server/db";
import { products } from "../shared/schema";

// Raw materials and inventory items needed for manufacturing office furniture
const inventoryMaterials = [
  // Wood/Board Materials
  { 
    name: "18mm PLPB Board",
    category: "Core Boards",
    brand: "Century",
    size: "8x4 feet",
    thickness: "18mm",
    sku: "PLPB-18-8x4",
    pricePerUnit: 2800,
    currentStock: 50,
    minStock: 10,
    unit: "sheets"
  },
  {
    name: "12mm PLPB Board", 
    category: "Core Boards",
    brand: "Century",
    size: "8x4 feet", 
    thickness: "12mm",
    sku: "PLPB-12-8x4",
    pricePerUnit: 2100,
    currentStock: 30,
    minStock: 10,
    unit: "sheets"
  },
  {
    name: "6mm MDF Board",
    category: "Core Boards", 
    brand: "Green Panel",
    size: "8x4 feet",
    thickness: "6mm",
    sku: "MDF-6-8x4", 
    pricePerUnit: 1200,
    currentStock: 25,
    minStock: 15,
    unit: "sheets"
  },
  
  // Edge Banding
  {
    name: "2mm PVC Edge Band - White",
    category: "Edge Banding",
    brand: "Rehau",
    size: "22mm width",
    thickness: "2mm", 
    sku: "PVC-WHT-22-2",
    pricePerUnit: 180,
    currentStock: 500,
    minStock: 100,
    unit: "meters"
  },
  {
    name: "2mm PVC Edge Band - Wenge", 
    category: "Edge Banding",
    brand: "Rehau",
    size: "22mm width",
    thickness: "2mm",
    sku: "PVC-WNG-22-2", 
    pricePerUnit: 180,
    currentStock: 300,
    minStock: 100,
    unit: "meters"
  },

  // Hardware & Fittings
  {
    name: "Soft Close Hinges",
    category: "Hardware",
    brand: "Hettich",
    size: "110°",
    thickness: "",
    sku: "HNGE-SC-110",
    pricePerUnit: 120,
    currentStock: 200, 
    minStock: 50,
    unit: "pieces"
  },
  {
    name: "Drawer Slides - Full Extension",
    category: "Hardware", 
    brand: "Ebco",
    size: "18 inch",
    thickness: "",
    sku: "DS-FE-18",
    pricePerUnit: 350,
    currentStock: 100,
    minStock: 25,
    unit: "pairs"
  },
  {
    name: "Cabinet Handles - Steel",
    category: "Hardware",
    brand: "Dorset", 
    size: "128mm CC",
    thickness: "",
    sku: "HDL-STL-128", 
    pricePerUnit: 85,
    currentStock: 150,
    minStock: 50,
    unit: "pieces"
  },

  // Laminates
  {
    name: "High Pressure Laminate - White",
    category: "Laminates",
    brand: "Formica",
    size: "8x4 feet",
    thickness: "0.8mm",
    sku: "HPL-WHT-8x4",
    pricePerUnit: 850, 
    currentStock: 40,
    minStock: 10,
    unit: "sheets"
  },
  {
    name: "High Pressure Laminate - Wood Grain",
    category: "Laminates", 
    brand: "Formica",
    size: "8x4 feet",
    thickness: "0.8mm",
    sku: "HPL-WGR-8x4",
    pricePerUnit: 950,
    currentStock: 35,
    minStock: 10, 
    unit: "sheets"
  },

  // Metal Components
  {
    name: "Steel Table Legs",
    category: "Metal Components",
    brand: "Local Fabricator",
    size: "750mm height",
    thickness: "3mm",
    sku: "TBL-LEG-750", 
    pricePerUnit: 450,
    currentStock: 80,
    minStock: 20,
    unit: "pieces"
  },
  {
    name: "Adjustable Height Mechanism",
    category: "Metal Components",
    brand: "Herman Miller",
    size: "Standard",
    thickness: "",
    sku: "AHM-STD",
    pricePerUnit: 1200,
    currentStock: 50,
    minStock: 15,
    unit: "pieces" 
  },

  // Adhesives & Consumables
  {
    name: "Wood Glue - White",
    category: "Adhesives",
    brand: "Fevicol",
    size: "1kg bottle", 
    thickness: "",
    sku: "GLU-WD-1KG",
    pricePerUnit: 180,
    currentStock: 25,
    minStock: 10,
    unit: "bottles"
  },
  {
    name: "Contact Cement",
    category: "Adhesives",
    brand: "Fevicol",
    size: "1 liter",
    thickness: "",
    sku: "CC-1L", 
    pricePerUnit: 320,
    currentStock: 20,
    minStock: 8,
    unit: "bottles"
  },

  // Packaging Materials
  {
    name: "Bubble Wrap",
    category: "Packaging",
    brand: "Generic", 
    size: "1.5m width",
    thickness: "3mm",
    sku: "BW-1.5M-3MM",
    pricePerUnit: 25,
    currentStock: 200,
    minStock: 50,
    unit: "meters"
  },
  {
    name: "Corrugated Cardboard Sheets",
    category: "Packaging",
    brand: "Generic",
    size: "3x2 feet", 
    thickness: "5mm",
    sku: "CC-3x2-5MM",
    pricePerUnit: 12,
    currentStock: 300,
    minStock: 100,
    unit: "sheets"
  }
];

async function populateInventoryMaterials() {
  try {
    console.log("Adding inventory materials to products table...");
    
    // Clear existing products (except the one Calibrated ply)
    // await db.delete(products);
    
    for (const material of inventoryMaterials) {
      await db.insert(products).values(material);
      console.log(`Added: ${material.name}`);
    }
    
    console.log(`Successfully added ${inventoryMaterials.length} inventory materials`);
    console.log("Raw materials inventory is now ready for material requests");
    
  } catch (error) {
    console.error("Error populating inventory:", error);
    throw error;
  }
}

// Auto-run the script
populateInventoryMaterials()
  .then(() => {
    console.log("✅ Inventory population completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Inventory population failed:", error);
    process.exit(1);
  });