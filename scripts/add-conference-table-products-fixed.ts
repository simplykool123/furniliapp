import { db } from '../server/db';
import { salesProducts } from '../shared/schema';

const conferenceTableProducts = [
  // Rectangular Conference Tables (Series-based)
  {
    name: "Rhombus Conference Table",
    description: "Professional series conference table with innovative design featuring 25mm thick Pre-Laminated Particle Board top, 2mm PVC edge band, MS powder coated Rhombus Series legs with aluminum die-cast connectors. Perfect for modern meeting rooms and corporate offices.",
    category: "conference tables",
    unitPrice: 12069.00,
    size: "1200-3600mm L x 1200mm W x 750mm H",
    taxPercentage: 18,
    imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop&crop=center"
  },
  {
    name: "Pentagon Conference Table", 
    description: "Premium Pentagon series conference table combining functionality with modern aesthetics. Features 25mm thick PLPB top, durable 2mm PVC edge band, MS powder coated Pentagon Series legs and aluminum die-cast connectors for superior stability.",
    category: "conference tables",
    unitPrice: 14459.00,
    size: "1200-3600mm L x 1200mm W x 750mm H",
    taxPercentage: 18,
    imageUrl: "https://images.unsplash.com/photo-1582653291997-079a1c04e5a1?w=800&h=600&fit=crop&crop=center"
  },
  {
    name: "Clique Conference Table",
    description: "Contemporary Clique series conference table designed for collaborative meetings. Built with 25mm thick Pre-Laminated Particle Board, 2mm PVC edge band, MS powder coated Clique Series legs and premium aluminum die-cast connectors.",
    category: "conference tables", 
    unitPrice: 13158.00,
    size: "1200-3600mm L x 1200mm W x 750mm H",
    taxPercentage: 18,
    imageUrl: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop&crop=center"
  },
  {
    name: "Arcade Conference Table",
    description: "Versatile Arcade series conference table perfect for dynamic workspaces. Features robust 25mm thick PLPB construction, 2mm PVC edge band, MS powder coated Arcade Series legs with aluminum die-cast connectors for long-lasting durability.",
    category: "conference tables",
    unitPrice: 11192.00,
    size: "1200-3600mm L x 1200mm W x 750mm H", 
    taxPercentage: 18,
    imageUrl: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&h=600&fit=crop&crop=center"
  },
  {
    name: "Classy Arcade Conference Table",
    description: "Enhanced Classy Arcade series conference table offering premium meeting solutions. Constructed with 25mm thick Pre-Laminated Particle Board, 2mm PVC edge band, MS powder coated Classy Arcade Series legs and aluminum die-cast connectors.",
    category: "conference tables",
    unitPrice: 13184.00,
    size: "1200-3600mm L x 1200mm W x 750mm H",
    taxPercentage: 18,
    imageUrl: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&h=600&fit=crop&crop=center"
  },
  {
    name: "Trefoil Conference Table",
    description: "Sophisticated Trefoil series conference table for executive boardrooms. Features premium 25mm thick PLPB top, 2mm PVC edge band, MS powder coated Trefoil Series legs with aluminum die-cast connectors for professional elegance.",
    category: "conference tables",
    unitPrice: 17514.00,
    size: "1200-3600mm L x 1200mm W x 750mm H",
    taxPercentage: 18,
    imageUrl: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&h=600&fit=crop&crop=center"
  },
  {
    name: "Helix Conference Table",
    description: "Premium Helix series conference table designed for high-end corporate environments. Built with 25mm thick Pre-Laminated Particle Board, 2mm PVC edge band, MS powder coated Helix Series legs and aluminum die-cast connectors.",
    category: "conference tables",
    unitPrice: 21552.00,
    size: "1200-3600mm L x 1200mm W x 750mm H",
    taxPercentage: 18,
    imageUrl: "https://images.unsplash.com/photo-1564069114553-7215e1ff1890?w=800&h=600&fit=crop&crop=center"
  },
  {
    name: "Trigon Conference Table",
    description: "Modern Trigon series conference table featuring innovative triangular design elements. Constructed with 25mm thick PLPB top, 2mm PVC edge band, MS powder coated Trigon Series legs and aluminum die-cast connectors for structural integrity.",
    category: "conference tables",
    unitPrice: 6242.00,
    size: "1200-3600mm L x 1200mm W x 750mm H",
    taxPercentage: 18,
    imageUrl: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&h=600&fit=crop&crop=center"
  },

  // Round Meeting Tables
  {
    name: "Pentagon Series Round Meeting Table",
    description: "Elegant Pentagon series round meeting table perfect for collaborative discussions. Features 25mm thick Pre-Laminated Particle Board top, 2mm PVC edge band, Pentagon Series C-Leg MS powder coated base with aluminum die-cast connectors. Available in multiple sizes.",
    category: "conference tables",
    unitPrice: 6242.00,
    size: "900-1200mm D x 750mm H",
    taxPercentage: 18,
    imageUrl: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=600&fit=crop&crop=center"
  },
  {
    name: "Rhombus Series Round Meeting Table", 
    description: "Contemporary Rhombus series round meeting table designed for intimate team meetings. Built with 25mm thick PLPB top, 2mm PVC edge band, Rhombus Series C-Leg MS powder coated structure and aluminum die-cast connectors.",
    category: "conference tables",
    unitPrice: 6906.00,
    size: "900-1200mm D x 750mm H",
    taxPercentage: 18,
    imageUrl: "https://images.unsplash.com/photo-1582653291997-079a1c04e5a1?w=800&h=600&fit=crop&crop=center"
  },
  {
    name: "Clique Series Round Meeting Table",
    description: "Versatile Clique series round meeting table ideal for dynamic group discussions. Features 25mm thick Pre-Laminated Particle Board, 2mm PVC edge band, Clique Series C-Leg MS powder coated base with aluminum die-cast connectors.",
    category: "conference tables",
    unitPrice: 7969.00,
    size: "900-1200mm D x 750mm H",
    taxPercentage: 18,
    imageUrl: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop&crop=center"
  },
  {
    name: "Classy Arcade Round Meeting Table",
    description: "Premium Classy Arcade series round meeting table offering sophisticated meeting solutions. Constructed with 25mm thick PLPB top, 2mm PVC edge band, Classy Arcade Series C-Leg MS powder coated base and aluminum die-cast connectors.",
    category: "conference tables",
    unitPrice: 8208.00,
    size: "900-1200mm D x 750mm H",
    taxPercentage: 18,
    imageUrl: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&h=600&fit=crop&crop=center"
  },

  // Large Wooden Conference Tables
  {
    name: "Victory Wooden Conference Table",
    description: "Premium executive Victory wooden conference table perfect for large boardrooms. Features 25mm thick Pre-Laminated Particle Board top, 18mm PLPB structure, 2mm PVC edge band, and integrated Innofit 8-module pop-up box for power and connectivity.",
    category: "conference tables",
    unitPrice: 24182.00,
    size: "3000-3600mm L x 1200mm W x 750mm H",
    taxPercentage: 18,
    imageUrl: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&h=600&fit=crop&crop=center"
  },
  {
    name: "Synergy Wooden Conference Table",
    description: "Professional Synergy wooden conference table designed for collaborative corporate environments. Built with 25mm thick PLPB top, 18mm PLPB structure, 2mm PVC edge band, and Innofit 10-module pop-up box for enhanced functionality.",
    category: "conference tables",
    unitPrice: 13242.00,
    size: "1800-2400mm L x 900-1200mm W x 750mm H",
    taxPercentage: 18,
    imageUrl: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&h=600&fit=crop&crop=center"
  },
  {
    name: "Spirit Wooden Conference Table",
    description: "Contemporary Spirit wooden conference table offering versatile meeting solutions. Features 25mm thick Pre-Laminated Particle Board top, 18mm PLPB structure, 2mm PVC edge band, and Innofit 10-module pop-up box for power management.",
    category: "conference tables",
    unitPrice: 10914.00,
    size: "1800-2400mm L x 900-1200mm W x 750mm H",
    taxPercentage: 18,
    imageUrl: "https://images.unsplash.com/photo-1564069114553-7215e1ff1890?w=800&h=600&fit=crop&crop=center"
  },
  {
    name: "Falcon Wooden Conference Table",
    description: "Premium executive Falcon wooden conference table for large corporate boardrooms. Constructed with 25mm thick PLPB top, 18mm PLPB structure, 2mm PVC edge band, and integrated Innofit 8-module pop-up box for professional connectivity.",
    category: "conference tables",
    unitPrice: 24719.00,
    size: "3000-3600mm L x 1200mm W x 750mm H",
    taxPercentage: 18,
    imageUrl: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&h=600&fit=crop&crop=center"
  }
];

export async function addConferenceTableProducts() {
  try {
    console.log('Adding conference table products to database...');
    
    for (const product of conferenceTableProducts) {
      const [inserted] = await db.insert(salesProducts).values(product).returning();
      console.log(`✅ Added: ${inserted.name} - ₹${inserted.unitPrice.toLocaleString()}`);
    }
    
    console.log(`\n🎉 Successfully added ${conferenceTableProducts.length} conference table products!`);
    console.log(`📊 Price range: ₹${Math.min(...conferenceTableProducts.map(p => p.unitPrice)).toLocaleString()} - ₹${Math.max(...conferenceTableProducts.map(p => p.unitPrice)).toLocaleString()}`);
    console.log('\n📋 Product Categories Added:');
    console.log('- Rectangular Conference Tables (8 products)');
    console.log('- Round Meeting Tables (4 products)'); 
    console.log('- Wooden Conference Tables (4 products)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding conference table products:', error);
    process.exit(1);
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addConferenceTableProducts();
}