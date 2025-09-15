import { db } from '../server/db';
import { salesProducts } from '../shared/schema';

const storageProducts = [
  {
    name: "Low Height Storage",
    description: "Versatile low height storage cabinet perfect for office organization. Features 18mm thick Pre-Laminated Particle Board construction, 2mm PVC edge band, and premium Ebco/Hettich hardware. Available in multiple sizes with optional drawer configurations for enhanced functionality.",
    category: "storage",
    unitPrice: 7150.00,
    size: "900-1500mm L x 400mm W x 750mm H",
    taxPercentage: 18,
    imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop&crop=center"
  },
  {
    name: "Medium Height Storage",
    description: "Professional medium height storage cabinet ideal for comprehensive office storage solutions. Built with 18mm thick PLPB top and structure, 2mm thick PVC edge band, and quality Ebco/Hettich hardware for long-lasting durability.",
    category: "storage", 
    unitPrice: 11400.00,
    size: "900-1500mm L x 400mm W x 1200mm H",
    taxPercentage: 18,
    imageUrl: "https://images.unsplash.com/photo-1634712282287-14ed57b9cc89?w=800&h=600&fit=crop&crop=center"
  },
  {
    name: "Full Height Storage",
    description: "Maximum capacity full height storage cabinet designed for extensive office storage requirements. Features robust 18mm thick Pre-Laminated Particle Board construction, 2mm PVC edge band, and premium Ebco/Hettich hardware for professional environments.",
    category: "storage",
    unitPrice: 19950.00,
    size: "900-1500mm L x 400mm W x 2100mm H", 
    taxPercentage: 18,
    imageUrl: "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=800&h=600&fit=crop&crop=center"
  },
  {
    name: "Mobile Pedestal with 1 Drawer & 1 Shutter",
    description: "Compact mobile pedestal storage unit combining functionality with mobility. Features 18mm thick Pre-Laminated Particle Board construction, 2mm PVC edge band, and quality Ebco/Hettich hardware. Perfect for desk-side storage with easy mobility.",
    category: "storage",
    unitPrice: 4650.00,
    size: "Standard pedestal size",
    taxPercentage: 18,
    imageUrl: "https://images.unsplash.com/photo-1541558869434-2840d308329a?w=800&h=600&fit=crop&crop=center"
  },
  {
    name: "Fixed Pedestal with 4 Drawers",
    description: "High-capacity fixed pedestal storage unit with four spacious drawers for organized office storage. Constructed with 18mm thick PLPB top and structure, 2mm thick PVC edge band, and premium Ebco/Hettich hardware for professional use.",
    category: "storage",
    unitPrice: 6250.00,
    size: "Standard pedestal size", 
    taxPercentage: 18,
    imageUrl: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&h=600&fit=crop&crop=center"
  }
];

export async function addStorageProducts() {
  try {
    console.log('Adding storage products to database...');
    
    for (const product of storageProducts) {
      const [inserted] = await db.insert(salesProducts).values(product).returning();
      console.log(`✅ Added: ${inserted.name} - ₹${inserted.unitPrice.toLocaleString()}`);
    }
    
    console.log(`\n🎉 Successfully added ${storageProducts.length} storage products!`);
    console.log(`📊 Price range: ₹${Math.min(...storageProducts.map(p => p.unitPrice)).toLocaleString()} - ₹${Math.max(...storageProducts.map(p => p.unitPrice)).toLocaleString()}`);
    console.log('\n📋 Storage Product Categories Added:');
    console.log('- Height-based Storage (Low, Medium, Full Height)');
    console.log('- Mobile Pedestal Storage');
    console.log('- Fixed Pedestal Storage');
    console.log('\n🔧 Technical Specifications:');
    console.log('- 18mm thick Pre-Laminated Particle Board construction');
    console.log('- 2mm PVC edge band for durability');  
    console.log('- Premium Ebco/Hettich hardware');
    console.log('- 1 Year warranty coverage');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding storage products:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addStorageProducts();
}