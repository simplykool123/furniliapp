import { db } from '../server/db';
import { salesProducts } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Professional workstation images from reliable CDN
const imageUpdates = [
  {
    name: "Arcade Workstation",
    imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop&auto=format&q=80"
  },
  {
    name: "Trigon Workstation", 
    imageUrl: "https://images.unsplash.com/photo-1541558869434-2840d308329a?w=400&h=300&fit=crop&auto=format&q=80"
  },
  {
    name: "Clique Workstation",
    imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop&auto=format&q=80"
  },
  {
    name: "Pentagon Office Workstation",
    imageUrl: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=400&h=300&fit=crop&auto=format&q=80"
  },
  {
    name: "Trefoil Workstation",
    imageUrl: "https://images.unsplash.com/photo-1586119240853-5e2c03c7ba2b?w=400&h=300&fit=crop&auto=format&q=80"
  },
  {
    name: "Rhombus Workstation",
    imageUrl: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=400&h=300&fit=crop&auto=format&q=80"
  },
  {
    name: "Classy Arcade Workstation",
    imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop&auto=format&q=80"
  },
  {
    name: "Helix Workstation",
    imageUrl: "https://images.unsplash.com/photo-1541558869434-2840d308329a?w=400&h=300&fit=crop&auto=format&q=80"
  },
  {
    name: "Classic 60 Workstation",
    imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop&auto=format&q=80"
  }
];

async function fixProductImages() {
  try {
    console.log('Updating product images...');
    
    for (const update of imageUpdates) {
      console.log(`Updating ${update.name}...`);
      
      const result = await db.update(salesProducts)
        .set({ 
          imageUrl: update.imageUrl,
          updatedAt: new Date()
        })
        .where(eq(salesProducts.name, update.name))
        .returning();
      
      if (result.length > 0) {
        console.log(`✅ Updated ${update.name} image`);
      } else {
        console.log(`❌ Product not found: ${update.name}`);
      }
    }
    
    console.log('🎉 Image update completed!');
    
    // Verify the updates
    const products = await db.select().from(salesProducts);
    console.log('\nVerification:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    products.forEach(p => {
      console.log(`${p.name}: ${p.imageUrl ? '✅ HAS IMAGE' : '❌ NO IMAGE'}`);
    });
    
  } catch (error) {
    console.error('Error updating product images:', error);
    throw error;
  }
}

export { fixProductImages };

// Run the script
fixProductImages()
  .then(() => {
    console.log('Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });