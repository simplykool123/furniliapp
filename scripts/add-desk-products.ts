// Script to add complete desk collection to sales products
import { db } from '../server/db';
import { salesProducts } from '../shared/schema';

const deskProducts = [
  {
    name: "Spirit Workspace Desk",
    description: "Entry-level workspace desk with modular design, available in multiple sizes and finishes. Ideal for cost-effective office setups.",
    unitPrice: 6480,
    category: "desks",
    size: "900-1800mm L x 600-900mm W x 750mm H",
    taxPercentage: 18,
    isActive: true,
    imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop"
  },
  {
    name: "Synergy Workspace Desk",
    description: "Ergonomic workspace solution with integrated cable management and modern design. Perfect for collaborative environments.",
    unitPrice: 6621,
    category: "desks",
    size: "900-1800mm L x 600-900mm W x 750mm H",
    taxPercentage: 18,
    isActive: true,
    imageUrl: "https://images.unsplash.com/photo-1541558869434-2840d308329a?w=800&h=600&fit=crop"
  },
  {
    name: "Victory Workspace Desk",
    description: "Premium workspace desk with enhanced features and superior build quality. Designed for executive offices and professional environments.",
    unitPrice: 17166,
    category: "desks",
    size: "1200-2100mm L x 600-900mm W x 750mm H",
    taxPercentage: 18,
    isActive: true,
    imageUrl: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&h=600&fit=crop"
  },
  {
    name: "Trigon Desk",
    description: "Triangular design desk with unique geometric aesthetics. Features MS powder-coated legs and PLPB table top with 2mm PVC edge banding.",
    unitPrice: 8369,
    category: "desks",
    size: "900-1800mm L x 600-900mm W x 750mm H",
    taxPercentage: 18,
    isActive: true,
    imageUrl: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&h=600&fit=crop"
  },
  {
    name: "Rhombus Desk",
    description: "Diamond-shaped design with C-Leg and H-Leg options. 25mm thick PLPB top with modular connectivity and aluminum die-cast connectors.",
    unitPrice: 8295,
    category: "desks",
    size: "900-1800mm L x 600-900mm W x 750mm H",
    taxPercentage: 18,
    isActive: true,
    imageUrl: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop"
  },
  {
    name: "Pentagon Desk",
    description: "Pentagon Series desk with dual leg options (C-Leg/H-Leg). Features 25mm PLPB top, MS powder-coated beams, and wooden modesty panel.",
    unitPrice: 10128,
    category: "desks",
    size: "900-1800mm L x 600-900mm W x 750mm H",
    taxPercentage: 18,
    isActive: true,
    imageUrl: "https://images.unsplash.com/photo-1581539250439-c96689b516dd?w=800&h=600&fit=crop"
  },
  {
    name: "Majestic Executive Cabin Desk",
    description: "Premium executive desk with cabin design. Features 25mm high durability engineered board top and 18mm thick structure with professional finish.",
    unitPrice: 21601,
    category: "desks",
    size: "1500-1800mm L x 600-900mm W x 750mm H",
    taxPercentage: 18,
    isActive: true,
    imageUrl: "https://images.unsplash.com/photo-1549497538-303791108f95?w=800&h=600&fit=crop"
  },
  {
    name: "Helix Desk",
    description: "Helix Series executive desk with aluminum die-cast C-legs and frosted glass modesty. Premium build with multiple size configurations.",
    unitPrice: 21420,
    category: "desks",
    size: "1500-2400mm L x 750-900mm W x 750mm H",
    taxPercentage: 18,
    isActive: true,
    imageUrl: "https://images.unsplash.com/photo-1571624436279-b272aff752b5?w=800&h=600&fit=crop"
  }
];

async function addDeskProducts() {
  try {
    console.log('Starting to add desk products...');
    
    for (const product of deskProducts) {
      console.log(`Adding ${product.name}...`);
      
      await db.insert(salesProducts).values({
        name: product.name,
        description: product.description,
        size: product.size,
        unitPrice: product.unitPrice,
        category: product.category,
        taxPercentage: product.taxPercentage,
        imageUrl: product.imageUrl,
        isActive: true
      });
      
      console.log(`✅ Added ${product.name} - ₹${product.unitPrice.toLocaleString()}`);
    }
    
    console.log('🎉 Successfully added all 8 desk products!');
    console.log('\nDesk Products Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    deskProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} - ₹${product.unitPrice.toLocaleString()}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total Products: ${deskProducts.length}`);
    console.log(`Price Range: ₹${Math.min(...deskProducts.map(p => p.unitPrice)).toLocaleString()} - ₹${Math.max(...deskProducts.map(p => p.unitPrice)).toLocaleString()}`);
    
  } catch (error) {
    console.error('Error adding desk products:', error);
    throw error;
  }
}

export { addDeskProducts };

// Run the script
addDeskProducts()
  .then(() => {
    console.log('Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });