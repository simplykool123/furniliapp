import { storage, db } from "../storage";
import { sql } from "drizzle-orm";
import { products, stockMovements } from "../../shared/schema";

export interface InventoryOptimization {
  productId: number;
  productName: string;
  currentStock: number;
  recommendedReorderPoint: number;
  recommendedOrderQuantity: number;
  avgDailyUsage: number;
  leadTimeDays: number;
  safetyStock: number;
  category: string;
  lastMovement: Date | null;
  stockStatus: 'healthy' | 'low' | 'critical' | 'dead';
  seasonalFactor: number;
}

export interface DeadStockItem {
  productId: number;
  productName: string;
  currentStock: number;
  lastMovementDate: Date | null;
  daysSinceLastMovement: number;
  stockValue: number;
  category: string;
  recommendation: 'liquidate' | 'discount' | 'return' | 'write-off';
}

export interface SeasonalDemand {
  productId: number;
  productName: string;
  month: number;
  year: number;
  totalUsage: number;
  avgDailyUsage: number;
  seasonalMultiplier: number;
  forecastedDemand: number;
}

// Calculate automatic reorder points based on usage patterns
export async function calculateOptimalReorderPoints(): Promise<InventoryOptimization[]> {
  try {
    // Get all active products with their movement history
    const productData = await db
      .select({
        id: products.id,
        name: products.name,
        currentStock: products.currentStock,
        minStock: products.minStock,
        category: products.category,
        pricePerUnit: products.pricePerUnit,
      })
      .from(products)
      .where(sql`${products.isActive} = true`);

    const optimizations: InventoryOptimization[] = [];

    for (const product of productData) {
      // Get stock movements for the last 90 days
      const movements = await db
        .select({
          quantity: stockMovements.quantity,
          movementType: stockMovements.movementType,
          createdAt: stockMovements.createdAt,
        })
        .from(stockMovements)
        .where(sql`
          ${stockMovements.productId} = ${product.id} 
          AND ${stockMovements.movementType} = 'out'
          AND ${stockMovements.createdAt} >= NOW() - INTERVAL '90 days'
        `)
        .orderBy(sql`${stockMovements.createdAt} DESC`);

      // Calculate usage patterns
      const totalUsage = movements.reduce((sum, mov) => sum + mov.quantity, 0);
      const avgDailyUsage = movements.length > 0 ? totalUsage / 90 : 0;
      
      // Get last movement date
      const lastMovement = movements.length > 0 ? movements[0].createdAt : null;
      const daysSinceLastMovement = lastMovement 
        ? Math.floor((Date.now() - new Date(lastMovement).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      // Default lead time (can be customized per supplier)
      const leadTimeDays = 7;
      
      // Safety stock calculation (20% buffer)
      const safetyStock = Math.ceil(avgDailyUsage * leadTimeDays * 0.2);
      
      // Recommended reorder point
      const recommendedReorderPoint = Math.ceil(avgDailyUsage * leadTimeDays + safetyStock);
      
      // Economic Order Quantity (simplified)
      const recommendedOrderQuantity = Math.max(
        Math.ceil(avgDailyUsage * 30), // 30 days supply
        recommendedReorderPoint * 2
      );

      // Determine seasonal factor (simplified - can be enhanced)
      const currentMonth = new Date().getMonth() + 1;
      const seasonalFactor = getSeasonalFactor(product.category, currentMonth);

      // Determine stock status
      let stockStatus: 'healthy' | 'low' | 'critical' | 'dead';
      if (daysSinceLastMovement > 180) {
        stockStatus = 'dead';
      } else if (product.currentStock <= recommendedReorderPoint * 0.5) {
        stockStatus = 'critical';
      } else if (product.currentStock <= recommendedReorderPoint) {
        stockStatus = 'low';
      } else {
        stockStatus = 'healthy';
      }

      optimizations.push({
        productId: product.id,
        productName: product.name,
        currentStock: product.currentStock,
        recommendedReorderPoint,
        recommendedOrderQuantity,
        avgDailyUsage,
        leadTimeDays,
        safetyStock,
        category: product.category,
        lastMovement,
        stockStatus,
        seasonalFactor,
      });
    }

    return optimizations;
  } catch (error) {
    console.error('Error calculating reorder points:', error);
    throw error;
  }
}

// Identify dead stock items
export async function identifyDeadStock(): Promise<DeadStockItem[]> {
  try {
    const productData = await db
      .select({
        id: products.id,
        name: products.name,
        currentStock: products.currentStock,
        category: products.category,
        pricePerUnit: products.pricePerUnit,
        createdAt: products.createdAt,
      })
      .from(products)
      .where(sql`${products.isActive} = true AND ${products.currentStock} > 0`);

    const deadStockItems: DeadStockItem[] = [];

    for (const product of productData) {
      // Get last outward movement
      const lastMovement = await db
        .select({
          createdAt: stockMovements.createdAt,
        })
        .from(stockMovements)
        .where(sql`
          ${stockMovements.productId} = ${product.id} 
          AND ${stockMovements.movementType} = 'out'
        `)
        .orderBy(sql`${stockMovements.createdAt} DESC`)
        .limit(1);

      const lastMovementDate = lastMovement.length > 0 ? lastMovement[0].createdAt : null;
      
      // If no movement found, calculate days since product creation instead of using 999
      const daysSinceLastMovement = lastMovementDate 
        ? Math.floor((Date.now() - new Date(lastMovementDate).getTime()) / (1000 * 60 * 60 * 24))
        : Math.floor((Date.now() - new Date(product.createdAt).getTime()) / (1000 * 60 * 60 * 24));

      // Consider items as dead stock if no movement for 6+ months
      if (daysSinceLastMovement >= 180) {
        const stockValue = product.currentStock * product.pricePerUnit;
        
        let recommendation: 'liquidate' | 'discount' | 'return' | 'write-off';
        if (stockValue > 10000) {
          recommendation = 'liquidate';
        } else if (stockValue > 5000) {
          recommendation = 'discount';
        } else if (stockValue > 1000) {
          recommendation = 'return';
        } else {
          recommendation = 'write-off';
        }

        deadStockItems.push({
          productId: product.id,
          productName: product.name,
          currentStock: product.currentStock,
          lastMovementDate,
          daysSinceLastMovement,
          stockValue,
          category: product.category,
          recommendation,
        });
      }
    }

    return deadStockItems.sort((a, b) => b.stockValue - a.stockValue);
  } catch (error) {
    console.error('Error identifying dead stock:', error);
    throw error;
  }
}

// Seasonal demand forecasting
export async function generateSeasonalForecast(): Promise<SeasonalDemand[]> {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    const productData = await db
      .select({
        id: products.id,
        name: products.name,
        category: products.category,
      })
      .from(products)
      .where(sql`${products.isActive} = true`);

    const forecasts: SeasonalDemand[] = [];

    for (const product of productData) {
      // Get historical data for the same month in previous years
      const historicalData = await db
        .select({
          quantity: sql<number>`SUM(${stockMovements.quantity})`,
          month: sql<number>`EXTRACT(MONTH FROM ${stockMovements.createdAt})`,
          year: sql<number>`EXTRACT(YEAR FROM ${stockMovements.createdAt})`,
        })
        .from(stockMovements)
        .where(sql`
          ${stockMovements.productId} = ${product.id} 
          AND ${stockMovements.movementType} = 'out'
          AND EXTRACT(MONTH FROM ${stockMovements.createdAt}) = ${currentMonth}
          AND EXTRACT(YEAR FROM ${stockMovements.createdAt}) >= ${currentYear - 2}
        `)
        .groupBy(sql`EXTRACT(MONTH FROM ${stockMovements.createdAt}), EXTRACT(YEAR FROM ${stockMovements.createdAt})`);

      const totalUsage = historicalData.reduce((sum, data) => sum + (data.quantity || 0), 0);
      const avgUsage = historicalData.length > 0 ? totalUsage / historicalData.length : 0;
      const avgDailyUsage = avgUsage / 30; // Approximate days in month

      // Get seasonal multiplier
      const seasonalMultiplier = getSeasonalFactor(product.category, currentMonth);
      const forecastedDemand = Math.ceil(avgUsage * seasonalMultiplier);

      forecasts.push({
        productId: product.id,
        productName: product.name,
        month: currentMonth,
        year: currentYear,
        totalUsage: Math.floor(totalUsage),
        avgDailyUsage: Math.round(avgDailyUsage * 100) / 100,
        seasonalMultiplier,
        forecastedDemand,
      });
    }

    return forecasts.sort((a, b) => b.forecastedDemand - a.forecastedDemand);
  } catch (error) {
    console.error('Error generating seasonal forecast:', error);
    throw error;
  }
}

// Helper function to determine seasonal factors
function getSeasonalFactor(category: string, month: number): number {
  // Simplified seasonal factors - can be customized based on business patterns
  const seasonalPatterns: Record<string, Record<number, number>> = {
    'Furniture': {
      1: 0.8, 2: 0.9, 3: 1.1, 4: 1.2, 5: 1.1, 6: 1.0,
      7: 0.9, 8: 0.9, 9: 1.0, 10: 1.1, 11: 1.2, 12: 1.3
    },
    'Hardware': {
      1: 1.0, 2: 1.0, 3: 1.1, 4: 1.2, 5: 1.1, 6: 1.0,
      7: 0.9, 8: 0.9, 9: 1.0, 10: 1.1, 11: 1.1, 12: 1.1
    },
    'default': {
      1: 1.0, 2: 1.0, 3: 1.0, 4: 1.0, 5: 1.0, 6: 1.0,
      7: 1.0, 8: 1.0, 9: 1.0, 10: 1.0, 11: 1.0, 12: 1.0
    }
  };

  const pattern = seasonalPatterns[category] || seasonalPatterns['default'];
  return pattern[month] || 1.0;
}

// Generate inventory optimization report
export async function generateInventoryOptimizationReport() {
  try {
    const [reorderPoints, deadStock, seasonalForecast] = await Promise.all([
      calculateOptimalReorderPoints(),
      identifyDeadStock(),
      generateSeasonalForecast()
    ]);

    return {
      reorderPoints,
      deadStock,
      seasonalForecast,
      summary: {
        totalProducts: reorderPoints.length,
        criticalItems: reorderPoints.filter(item => item.stockStatus === 'critical').length,
        lowStockItems: reorderPoints.filter(item => item.stockStatus === 'low').length,
        deadStockItems: deadStock.length,
        deadStockValue: deadStock.reduce((sum, item) => sum + item.stockValue, 0),
        highDemandItems: seasonalForecast.filter(item => item.forecastedDemand > 100).length,
      }
    };
  } catch (error) {
    console.error('Error generating optimization report:', error);
    throw error;
  }
}