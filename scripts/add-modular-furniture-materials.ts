import { db } from "../server/db";
import { products } from "../shared/schema";

// Comprehensive raw materials for modular furniture manufacturing
const modularFurnitureMaterials = [
  // CORE BOARDS - Different thicknesses and grades
  {
    name: "25mm PLPB Board",
    category: "Core Boards",
    brand: "Century",
    size: "8x4 feet",
    thickness: "25mm",
    sku: "PLPB-25-8x4",
    pricePerUnit: 3800,
    currentStock: 40,
    minStock: 10,
    unit: "sheets"
  },
  {
    name: "32mm PLPB Board",
    category: "Core Boards", 
    brand: "Century",
    size: "8x4 feet",
    thickness: "32mm",
    sku: "PLPB-32-8x4",
    pricePerUnit: 4200,
    currentStock: 25,
    minStock: 8,
    unit: "sheets"
  },
  {
    name: "9mm MDF Board",
    category: "Core Boards",
    brand: "Green Panel",
    size: "8x4 feet", 
    thickness: "9mm",
    sku: "MDF-9-8x4",
    pricePerUnit: 1800,
    currentStock: 35,
    minStock: 15,
    unit: "sheets"
  },
  {
    name: "16mm MDF Board",
    category: "Core Boards",
    brand: "Green Panel", 
    size: "8x4 feet",
    thickness: "16mm",
    sku: "MDF-16-8x4",
    pricePerUnit: 2400,
    currentStock: 30,
    minStock: 12,
    unit: "sheets"
  },
  {
    name: "25mm MDF Board",
    category: "Core Boards",
    brand: "Green Panel",
    size: "8x4 feet",
    thickness: "25mm", 
    sku: "MDF-25-8x4",
    pricePerUnit: 3200,
    currentStock: 20,
    minStock: 8,
    unit: "sheets"
  },

  // EDGE BANDING - Various colors and sizes
  {
    name: "2mm PVC Edge Band - Beech",
    category: "Edge Banding",
    brand: "Rehau",
    size: "22mm width",
    thickness: "2mm",
    sku: "PVC-BCH-22-2", 
    pricePerUnit: 190,
    currentStock: 400,
    minStock: 100,
    unit: "meters"
  },
  {
    name: "2mm PVC Edge Band - Oak",
    category: "Edge Banding", 
    brand: "Rehau",
    size: "22mm width",
    thickness: "2mm",
    sku: "PVC-OAK-22-2",
    pricePerUnit: 200,
    currentStock: 350,
    minStock: 100,
    unit: "meters"
  },
  {
    name: "1mm PVC Edge Band - White",
    category: "Edge Banding",
    brand: "Rehau",
    size: "19mm width",
    thickness: "1mm",
    sku: "PVC-WHT-19-1",
    pricePerUnit: 140,
    currentStock: 600,
    minStock: 150,
    unit: "meters"
  },
  {
    name: "ABS Edge Band - Matt Black",
    category: "Edge Banding",
    brand: "Egger",
    size: "22mm width", 
    thickness: "2mm",
    sku: "ABS-BLK-22-2",
    pricePerUnit: 280,
    currentStock: 200,
    minStock: 50,
    unit: "meters"
  },

  // HARDWARE - Comprehensive collection
  {
    name: "Concealed Hinges - 35mm Cup",
    category: "Hardware",
    brand: "Blum",
    size: "35mm cup, 110° opening",
    thickness: "",
    sku: "HNGE-BLM-35-110",
    pricePerUnit: 160,
    currentStock: 500,
    minStock: 100,
    unit: "pieces"
  },
  {
    name: "Soft Close Hinges - Overlay",
    category: "Hardware",
    brand: "Hettich", 
    size: "35mm cup",
    thickness: "",
    sku: "HNGE-HTT-OVL-35",
    pricePerUnit: 140,
    currentStock: 300,
    minStock: 80,
    unit: "pieces"
  },
  {
    name: "Drawer Slides - 12 inch",
    category: "Hardware",
    brand: "Ebco",
    size: "12 inch",
    thickness: "",
    sku: "DS-EBC-12",
    pricePerUnit: 280,
    currentStock: 150,
    minStock: 40,
    unit: "pairs"
  },
  {
    name: "Drawer Slides - 22 inch",
    category: "Hardware", 
    brand: "Ebco",
    size: "22 inch",
    thickness: "",
    sku: "DS-EBC-22", 
    pricePerUnit: 450,
    currentStock: 100,
    minStock: 30,
    unit: "pairs"
  },
  {
    name: "Push-to-Open Latch",
    category: "Hardware",
    brand: "Blum",
    size: "Standard",
    thickness: "",
    sku: "LTCH-BLM-PTO",
    pricePerUnit: 320,
    currentStock: 80,
    minStock: 20,
    unit: "pieces"
  },
  {
    name: "Adjustable Shelf Pins",
    category: "Hardware",
    brand: "Hafele",
    size: "5mm diameter",
    thickness: "",
    sku: "SHP-HFL-5MM",
    pricePerUnit: 12,
    currentStock: 1000,
    minStock: 200,
    unit: "pieces"
  },
  {
    name: "Cam Lock & Bolt Set",
    category: "Hardware",
    brand: "Hafele", 
    size: "15mm bolt",
    thickness: "",
    sku: "CAM-HFL-15",
    pricePerUnit: 45,
    currentStock: 200,
    minStock: 50,
    unit: "sets"
  },

  // HANDLES & KNOBS
  {
    name: "Aluminum Handle - 96mm CC",
    category: "Handles & Knobs",
    brand: "Dorset",
    size: "96mm center to center",
    thickness: "",
    sku: "HDL-ALM-96",
    pricePerUnit: 95,
    currentStock: 200,
    minStock: 50,
    unit: "pieces"
  },
  {
    name: "Aluminum Handle - 160mm CC",
    category: "Handles & Knobs",
    brand: "Dorset", 
    size: "160mm center to center",
    thickness: "",
    sku: "HDL-ALM-160",
    pricePerUnit: 120,
    currentStock: 150,
    minStock: 40,
    unit: "pieces"
  },
  {
    name: "Round Knob - Aluminum",
    category: "Handles & Knobs",
    brand: "Godrej",
    size: "25mm diameter",
    thickness: "",
    sku: "KNB-ALM-25",
    pricePerUnit: 65,
    currentStock: 300,
    minStock: 80,
    unit: "pieces"
  },

  // LAMINATES - Premium collection
  {
    name: "Sunmica Laminate - Walnut",
    category: "Laminates",
    brand: "AICA",
    size: "8x4 feet",
    thickness: "0.8mm",
    sku: "SUN-WAL-8x4",
    pricePerUnit: 1200,
    currentStock: 50,
    minStock: 15,
    unit: "sheets"
  },
  {
    name: "Sunmica Laminate - Teak",
    category: "Laminates",
    brand: "AICA",
    size: "8x4 feet", 
    thickness: "0.8mm",
    sku: "SUN-TEK-8x4",
    pricePerUnit: 1150,
    currentStock: 45,
    minStock: 12,
    unit: "sheets"
  },
  {
    name: "Sunmica Laminate - Maple",
    category: "Laminates",
    brand: "AICA",
    size: "8x4 feet",
    thickness: "0.8mm", 
    sku: "SUN-MPL-8x4",
    pricePerUnit: 1100,
    currentStock: 40,
    minStock: 12,
    unit: "sheets"
  },
  {
    name: "Glossy Laminate - Pure White",
    category: "Laminates",
    brand: "Formica",
    size: "8x4 feet",
    thickness: "1mm",
    sku: "GLY-WHT-8x4",
    pricePerUnit: 1400,
    currentStock: 35,
    minStock: 10,
    unit: "sheets"
  },

  // METAL COMPONENTS
  {
    name: "Table Leg - Chrome Finish",
    category: "Metal Components", 
    brand: "Local Fabricator",
    size: "720mm height",
    thickness: "3mm",
    sku: "TBL-CHR-720",
    pricePerUnit: 650,
    currentStock: 60,
    minStock: 15,
    unit: "pieces"
  },
  {
    name: "Chair Base - 5-Star",
    category: "Metal Components",
    brand: "Local Fabricator",
    size: "Standard",
    thickness: "",
    sku: "CHR-5STR-STD",
    pricePerUnit: 850,
    currentStock: 40,
    minStock: 10,
    unit: "pieces"
  },
  {
    name: "Modular Connector Joint",
    category: "Metal Components",
    brand: "Hafele",
    size: "90° angle",
    thickness: "",
    sku: "CON-HFL-90",
    pricePerUnit: 180,
    currentStock: 100,
    minStock: 25,
    unit: "pieces"
  },

  // GLASS & ACRYLIC
  {
    name: "Toughened Glass - 5mm Clear",
    category: "Glass & Acrylic",
    brand: "Guardian Glass",
    size: "Custom cut",
    thickness: "5mm",
    sku: "TGH-CLR-5MM",
    pricePerUnit: 450,
    currentStock: 0,
    minStock: 0,
    unit: "sq.ft"
  },
  {
    name: "Frosted Glass - 6mm",
    category: "Glass & Acrylic",
    brand: "Saint Gobain", 
    size: "Custom cut",
    thickness: "6mm",
    sku: "FRS-6MM",
    pricePerUnit: 520,
    currentStock: 0,
    minStock: 0,
    unit: "sq.ft"
  },
  {
    name: "Acrylic Sheet - Clear",
    category: "Glass & Acrylic",
    brand: "Evonik",
    size: "4x8 feet",
    thickness: "3mm",
    sku: "ACR-CLR-3MM",
    pricePerUnit: 2800,
    currentStock: 15,
    minStock: 5,
    unit: "sheets"
  },

  // FABRICS & FOAM
  {
    name: "Seat Foam - High Density",
    category: "Fabrics & Foam",
    brand: "Sleepwell",
    size: "42 GSM",
    thickness: "50mm",
    sku: "FOM-HD-50MM",
    pricePerUnit: 180,
    currentStock: 100,
    minStock: 25,
    unit: "sq.ft"
  },
  {
    name: "Upholstery Fabric - Leatherette",
    category: "Fabrics & Foam",
    brand: "Mayur Leather",
    size: "54 inch width",
    thickness: "1.2mm",
    sku: "UPH-LTH-54",
    pricePerUnit: 280,
    currentStock: 200,
    minStock: 50,
    unit: "meters"
  },
  {
    name: "Mesh Fabric - Ergonomic",
    category: "Fabrics & Foam",
    brand: "Narang Fabrics",
    size: "58 inch width", 
    thickness: "",
    sku: "MSH-ERG-58",
    pricePerUnit: 320,
    currentStock: 150,
    minStock: 40,
    unit: "meters"
  },

  // ADVANCED HARDWARE
  {
    name: "Soft Close Drawer System",
    category: "Hardware",
    brand: "Blum Tandem",
    size: "21 inch, 65kg capacity",
    thickness: "",
    sku: "SCD-BLM-21-65",
    pricePerUnit: 1200,
    currentStock: 50,
    minStock: 15,
    unit: "sets"
  },
  {
    name: "Lift-Up Door Support",
    category: "Hardware",
    brand: "Blum Aventos",
    size: "Strong mechanism",
    thickness: "",
    sku: "LFT-BLM-STR",
    pricePerUnit: 2800,
    currentStock: 30,
    minStock: 10,
    unit: "sets"
  },
  {
    name: "LED Strip Light - Warm White",
    category: "Electronics",
    brand: "Philips",
    size: "5 meter roll",
    thickness: "",
    sku: "LED-WRM-5M",
    pricePerUnit: 1800,
    currentStock: 25,
    minStock: 8,
    unit: "rolls"
  },

  // FINISHING MATERIALS
  {
    name: "Wood Stain - Cherry",
    category: "Finishing Materials",
    brand: "Asian Paints",
    size: "1 liter",
    thickness: "",
    sku: "STN-CHR-1L",
    pricePerUnit: 450,
    currentStock: 20,
    minStock: 8,
    unit: "bottles"
  },
  {
    name: "Polyurethane Coating - Matt",
    category: "Finishing Materials",
    brand: "Berger Paints",
    size: "1 liter",
    thickness: "",
    sku: "PU-MTT-1L",
    pricePerUnit: 680,
    currentStock: 15,
    minStock: 6,
    unit: "bottles"
  },
  {
    name: "Primer - Wood",
    category: "Finishing Materials",
    brand: "Nerolac",
    size: "1 liter",
    thickness: "",
    sku: "PRM-WD-1L",
    pricePerUnit: 320,
    currentStock: 25,
    minStock: 10,
    unit: "bottles"
  }
];

async function addModularFurnitureMaterials() {
  try {
    console.log("Adding comprehensive modular furniture materials...");
    
    for (const material of modularFurnitureMaterials) {
      await db.insert(products).values(material);
      console.log(`Added: ${material.name} (${material.category})`);
    }
    
    console.log(`Successfully added ${modularFurnitureMaterials.length} modular furniture materials`);
    console.log("Complete raw materials inventory is now ready for professional furniture manufacturing");
    
  } catch (error) {
    console.error("Error adding modular furniture materials:", error);
    throw error;
  }
}

// Auto-run the script
addModularFurnitureMaterials()
  .then(() => {
    console.log("✅ Modular furniture materials added successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Failed to add modular furniture materials:", error);
    process.exit(1);
  });