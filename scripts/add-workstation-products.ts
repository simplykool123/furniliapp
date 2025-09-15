import { db } from '../server/db';
import { salesProducts } from '../shared/schema';

// Comprehensive workstation data from Step Early
const workstationProducts = [
  {
    name: "Arcade Workstation",
    description: "Experience ultimate freedom with the Arcade Office Workstation's unique trefoil design. Features open desking system with MS powder-coated legs in 'C' and 'H' styles, integrated electrical raceway for seamless connectivity, and writable colored glass screen for enhanced collaboration.",
    size: "1200(L) x 600(W) x 750/1050(H) per seating", 
    unitPrice: 21890,
    category: "workstations",
    taxPercentage: 18,
    internalNotes: "Entry-level workstation with trefoil design. Features 25mm thick PLPB tabletop, 2mm PVC edge band, vertical/C-shape raceway options, 63mm cable manager. Compatible with fixed pedestals. Starting price for Linear Sharing configuration.",
    imageUrl: "https://stepearly.com/cdn/shop/products/Arcade_C_Leg_Linear_Sharing_2048x2048.jpg"
  },
  {
    name: "Trigon Workstation", 
    description: "Enhance productivity with the Trigon Office Workstation featuring sophisticated design and modular flexibility. Open desking system with unique trigon structure, integrated electrical raceway, writable screens, and robust construction with foot levelers for stability.",
    size: "1200(L) x 600(W) x 750/1050(H) per seating",
    unitPrice: 23850,
    category: "workstations", 
    taxPercentage: 18,
    internalNotes: "Mid-range workstation with trigon design. Features MS powder-coated legs, aluminium die-cast connectors, multiple raceway options, and screen combinations. Available in Linear Sharing and Non-Sharing configurations.",
    imageUrl: "https://stepearly.com/cdn/shop/products/Trigon_C_Leg_Linear_Sharing_2048x2048.jpg"
  },
  {
    name: "Clique Workstation",
    description: "Elevate your workspace with the Clique Office Workstation, offering modern design and exceptional functionality. Features open desking system, integrated electrical solutions, collaborative screens, and durable construction designed for daily use.",
    size: "1200(L) x 600(W) x 750/1050(H) per seating",
    unitPrice: 25400,
    category: "workstations",
    taxPercentage: 18, 
    internalNotes: "Popular mid-tier workstation with excellent value proposition. Includes standard features like PLPB tabletop, MS powder-coated structure, raceway systems, and cable management. Suitable for most office environments.",
    imageUrl: "https://stepearly.com/cdn/shop/products/Clique_C_Leg_Linear_Sharing_2048x2048.jpg"
  },
  {
    name: "Pentagon Office Workstation",
    description: "Transform your office with the Pentagon Workstation featuring distinctive pentagon design and superior functionality. Open desking system with MS powder-coated legs, seamless electrical integration, interactive collaboration surfaces, and reliable construction.",
    size: "1200(L) x 600(W) x 750/1050(H) per seating",
    unitPrice: 25370,
    category: "workstations",
    taxPercentage: 18,
    internalNotes: "Unique pentagon-shaped workstation design. Features comprehensive electrical raceway systems, multiple screen options, and modular connectivity. Premium build quality with 1-year warranty coverage.",
    imageUrl: "https://stepearly.com/cdn/shop/products/Pentagon_C_Leg_Linear_Sharing_2048x2048.jpg"
  },
  {
    name: "Trefoil Workstation",
    description: "Elevate your workspace with revolutionary Trefoil Office Workstations offering unparalleled functionality and elegance. Features unique trefoil design with open desking system, integrated electrical raceway, writable colored glass screens, and robust construction.",
    size: "1200(L) x 600(W) x 750/1050(H) per seating",
    unitPrice: 39820,
    category: "workstations",
    taxPercentage: 18,
    internalNotes: "Premium trefoil design workstation. Enhanced features include sophisticated screen options, advanced raceway systems, and superior build quality. Ideal for executive and high-traffic office environments.",
    imageUrl: "https://stepearly.com/cdn/shop/products/Trefoil_C_Leg_Linear_Sharing_2048x2048.jpg"
  },
  {
    name: "Rhombus Workstation",
    description: "Introducing the Rhombus Office Workstation, a modular marvel with unique rhombus-shaped structure. Features MS powder-coated legs in 'C' and 'H' styles, integrated electrical raceway, interactive collaboration surfaces, and adaptive foot levelers.",
    size: "1200(L) x 600(W) x 750/1050(H) per seating (Linear), 1500(L) x 1500(W) x 750/1050(H) per seating (Curvi-Linear)",
    unitPrice: 38650,
    category: "workstations",
    taxPercentage: 18,
    internalNotes: "Distinctive rhombus design with multiple configuration options. Supports both Linear and Curvi-Linear arrangements. Premium construction with advanced electrical systems and collaborative features.",
    imageUrl: "https://stepearly.com/cdn/shop/products/Rhombus_C_Leg_LinearSharing_2048x2048.jpg"
  },
  {
    name: "Classy Arcade Workstation",
    description: "The Classy Arcade Office Workstation, crafted with meticulous attention to detail, offers revolutionary modular office solutions. Features open desking system, electrical raceway, writable colored glass screen, elegant contemporary design, and sturdy construction.",
    size: "1200(L) x 600(W) x 750/1050(H) per seating (Linear), 1500(L) x 1500(W) x 750/1050(H) per seating (Curvi-Linear)",
    unitPrice: 39550,
    category: "workstations",
    taxPercentage: 18,
    internalNotes: "Premium Classy Arcade series with enhanced features. Multiple leg options (C-Leg/H-Leg), advanced raceway systems, and comprehensive screen solutions. Suitable for high-end office installations.",
    imageUrl: "https://stepearly.com/cdn/shop/products/Classy_Arcade_C_Leg_LinearSharing_2048x2048.jpg"
  },
  {
    name: "Helix Workstation",
    description: "Elevate your workspace with innovative Helix Office Workstations, a modular solution blending modern design with exceptional functionality. Features unique trefoil design, integrated electrical raceway, writable screens, sophisticated styling, and robust construction.",
    size: "1200(L) x 600(W) x 750/1050(H) per seating",
    unitPrice: 42300,
    category: "workstations",
    taxPercentage: 18,
    internalNotes: "High-end Helix series with innovative design elements. Premium construction quality, advanced electrical integration, and superior collaborative features. Ideal for modern office environments requiring premium solutions.",
    imageUrl: "https://stepearly.com/cdn/shop/products/Helix_C_Leg_Linear_Sharing_2048x2048.jpg"
  },
  {
    name: "Classic 60 Workstation",
    description: "Enhance your workspace with stylish Classic 60 Partition Based Office Workstations. Features sophisticated contemporary design, sturdy construction, integrated foot levelers, 60mm thick aluminum partition for privacy, and provision for electrical cables with switches and sockets.",
    size: "1200(L) x 600(W) x 750/1200(H) per seating",
    unitPrice: 55990,
    category: "workstations",
    taxPercentage: 18,
    internalNotes: "Premium partition-based workstation with 60mm thick modular aluminum partition. Features high durability engineered board, double raceway system, soft board/white board screens. Top-tier solution for executive and private office environments.",
    imageUrl: "https://stepearly.com/cdn/shop/products/Partition_base_Linear_sharing_2048x2048.jpg"
  }
];

async function addWorkstationProducts() {
  try {
    console.log('Starting to add workstation products...');
    
    for (const product of workstationProducts) {
      console.log(`Adding ${product.name}...`);
      
      await db.insert(salesProducts).values({
        name: product.name,
        description: product.description,
        size: product.size,
        unitPrice: product.unitPrice,
        category: product.category,
        taxPercentage: product.taxPercentage,
        internalNotes: product.internalNotes,
        imageUrl: product.imageUrl,
        isActive: true
      });
      
      console.log(`✅ Added ${product.name} - ₹${product.unitPrice.toLocaleString()}`);
    }
    
    console.log('🎉 Successfully added all 9 workstation products!');
    console.log('\nWorkstation Products Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    workstationProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} - ₹${product.unitPrice.toLocaleString()}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Products: ${workstationProducts.length}`);
    console.log(`Price Range: ₹${Math.min(...workstationProducts.map(p => p.unitPrice)).toLocaleString()} - ₹${Math.max(...workstationProducts.map(p => p.unitPrice)).toLocaleString()}`);
    
  } catch (error) {
    console.error('Error adding workstation products:', error);
    throw error;
  }
}

export { addWorkstationProducts };

// Run the script
addWorkstationProducts()
  .then(() => {
    console.log('Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });