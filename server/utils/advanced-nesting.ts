// Advanced Sheet Cutting Optimization
// Implements greedy algorithm with forward-looking strategy
// Ported from: https://github.com/gcalero/CuttingOptimizer

export interface OptimizedPanel {
  id: string;
  width: number;
  height: number;
  thickness?: number;
  quantity: number;
  allowRotation?: boolean;
}

export interface SheetDimensions {
  width: number;
  height: number;
  thickness?: number;
}

export interface PlacedPanel {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotated: boolean;
  originalWidth: number;
  originalHeight: number;
}

export interface OptimizedSheet {
  id: number;
  width: number;
  height: number;
  thickness?: number;
  placedPanels: PlacedPanel[];
  unusedRectangles: Rectangle[];
  utilization: number;
  wasteArea: number;
  usedArea: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OptimizationResult {
  sheets: OptimizedSheet[];
  totalWaste: number;
  totalUtilization: number;
  unplacedPanels: OptimizedPanel[];
  optimizationTime: number;
}

// Advanced cutting optimizer class with forward-looking strategy
export class AdvancedCuttingOptimizer {
  private cutWidth: number;
  private margin: number;
  private allowRotation: boolean;

  constructor(options: {
    cutWidth?: number;
    margin?: number;
    allowRotation?: boolean;
  } = {}) {
    this.cutWidth = options.cutWidth || 3; // 3mm saw kerf
    this.margin = options.margin || 10; // 10mm margin
    this.allowRotation = options.allowRotation !== false;
  }

  // Main optimization function with forward-looking strategy
  public optimize(
    panels: OptimizedPanel[],
    sheetDimensions: SheetDimensions
  ): OptimizationResult {
    const startTime = Date.now();
    const sheets: OptimizedSheet[] = [];
    const unplacedPanels: OptimizedPanel[] = [];
    
    // Expand panels by quantity and sort by area (largest first)
    const expandedPanels = this.expandPanelsByQuantity(panels);
    const sortedPanels = this.sortPanelsOptimally(expandedPanels);

    let remainingPanels = [...sortedPanels];

    while (remainingPanels.length > 0) {
      const sheet = this.createNewSheet(sheetDimensions, sheets.length);
      const placementResult = this.placeMaximumPanelsOnSheet(sheet, remainingPanels);
      
      if (placementResult.placedPanels.length === 0) {
        // No panels could be placed, add remaining to unplaced list
        unplacedPanels.push(...remainingPanels);
        break;
      }

      sheets.push(placementResult.sheet);
      remainingPanels = placementResult.remainingPanels;
    }

    const result: OptimizationResult = {
      sheets,
      unplacedPanels,
      totalWaste: this.calculateTotalWaste(sheets),
      totalUtilization: this.calculateTotalUtilization(sheets),
      optimizationTime: Date.now() - startTime
    };

    return result;
  }

  // Forward-looking panel placement with multiple strategy evaluation
  private placeMaximumPanelsOnSheet(
    sheet: OptimizedSheet, 
    remainingPanels: OptimizedPanel[]
  ): { sheet: OptimizedSheet; placedPanels: PlacedPanel[]; remainingPanels: OptimizedPanel[] } {
    const placedPanels: PlacedPanel[] = [];
    const panelsToPlace = [...remainingPanels];

    while (panelsToPlace.length > 0) {
      const bestPlacement = this.findBestPlacementWithLookahead(
        sheet, 
        panelsToPlace
      );

      if (!bestPlacement) {
        break; // No more panels can be placed
      }

      // Place the panel
      this.placePanelOnSheet(sheet, bestPlacement.panel, bestPlacement.position);
      placedPanels.push(bestPlacement.placement);
      
      // Remove placed panel from remaining panels
      const index = panelsToPlace.findIndex(p => p.id === bestPlacement.panel.id);
      panelsToPlace.splice(index, 1);
    }

    return {
      sheet: this.updateSheetStats(sheet),
      placedPanels,
      remainingPanels: panelsToPlace
    };
  }

  // Advanced placement evaluation with forward-looking strategy
  private findBestPlacementWithLookahead(
    sheet: OptimizedSheet, 
    availablePanels: OptimizedPanel[]
  ): { panel: OptimizedPanel; position: Rectangle; placement: PlacedPanel } | null {
    let bestScore = -1;
    let bestPlacement: { panel: OptimizedPanel; position: Rectangle; placement: PlacedPanel } | null = null;

    for (const panel of availablePanels) {
      for (const unusedRect of sheet.unusedRectangles) {
        // Try both orientations if rotation is allowed
        const orientations = this.getPanelOrientations(panel);
        
        for (const orientation of orientations) {
          if (this.canFitPanel(orientation, unusedRect)) {
            const position = {
              x: unusedRect.x,
              y: unusedRect.y,
              width: orientation.width,
              height: orientation.height
            };

            // FORWARD-LOOKING EVALUATION: How will this placement affect future panels?
            const score = this.evaluatePlacementWithLookahead(
              sheet, 
              panel,
              position,
              availablePanels.filter(p => p.id !== panel.id)
            );

            if (score > bestScore) {
              bestScore = score;
              bestPlacement = {
                panel,
                position,
                placement: {
                  id: panel.id,
                  x: position.x,
                  y: position.y,
                  width: position.width,
                  height: position.height,
                  rotated: orientation.width !== panel.width,
                  originalWidth: panel.width,
                  originalHeight: panel.height
                }
              };
            }
          }
        }
      }
    }

    return bestPlacement;
  }

  // Forward-looking evaluation function - this is the key improvement!
  private evaluatePlacementWithLookahead(
    sheet: OptimizedSheet,
    panel: OptimizedPanel,
    position: Rectangle,
    remainingPanels: OptimizedPanel[]
  ): number {
    // Create a temporary sheet state after this placement
    const tempSheet = this.simulateSheetAfterPlacement(sheet, panel, position);
    
    // Evaluate multiple criteria with forward-looking
    const fitScore = this.calculateFitScore(position, sheet);
    const wasteScore = this.calculateWasteScore(tempSheet);
    const futureScore = this.calculateFutureOpportunityScore(tempSheet, remainingPanels);
    const utilityScore = this.calculateUtilityScore(position, tempSheet);

    // Weighted combination of scores (tunable parameters)
    return (
      fitScore * 0.3 +      // How well does it fit current space
      wasteScore * 0.2 +    // How much waste does it create
      futureScore * 0.4 +   // How many future panels can still fit
      utilityScore * 0.1    // Overall utility metrics
    );
  }

  // Calculate how many future panels can still be placed after this placement
  private calculateFutureOpportunityScore(
    tempSheet: OptimizedSheet,
    remainingPanels: OptimizedPanel[]
  ): number {
    let futureCount = 0;
    let futureArea = 0;

    for (const panel of remainingPanels.slice(0, Math.min(5, remainingPanels.length))) {
      for (const rect of tempSheet.unusedRectangles) {
        if (this.canFitPanel(panel, rect)) {
          futureCount++;
          futureArea += panel.width * panel.height;
          break; // Only count each panel once
        }
      }
    }

    return futureCount * 10 + futureArea * 0.001; // Bonus for fitting more future panels
  }

  // Simulate sheet state after placing a panel (without modifying original)
  private simulateSheetAfterPlacement(
    sheet: OptimizedSheet,
    panel: OptimizedPanel,
    position: Rectangle
  ): OptimizedSheet {
    const tempSheet = JSON.parse(JSON.stringify(sheet));
    
    // Remove the used rectangle and add new unused rectangles
    const unusedRects = [...tempSheet.unusedRectangles];
    const rectIndex = unusedRects.findIndex(r => 
      r.x === position.x && r.y === position.y
    );
    
    if (rectIndex !== -1) {
      const usedRect = unusedRects[rectIndex];
      unusedRects.splice(rectIndex, 1);
      
      // Add remaining rectangles after this placement
      const newRects = this.splitRectangleAfterPlacement(usedRect, position);
      unusedRects.push(...newRects);
    }
    
    tempSheet.unusedRectangles = unusedRects;
    return tempSheet;
  }

  // Split rectangle after panel placement (with kerf allowance)
  private splitRectangleAfterPlacement(
    originalRect: Rectangle,
    placedPanel: Rectangle
  ): Rectangle[] {
    const newRects: Rectangle[] = [];
    const kerf = this.cutWidth;

    // Right remainder
    if (placedPanel.x + placedPanel.width + kerf < originalRect.x + originalRect.width) {
      newRects.push({
        x: placedPanel.x + placedPanel.width + kerf,
        y: originalRect.y,
        width: originalRect.x + originalRect.width - (placedPanel.x + placedPanel.width + kerf),
        height: originalRect.height
      });
    }

    // Bottom remainder  
    if (placedPanel.y + placedPanel.height + kerf < originalRect.y + originalRect.height) {
      newRects.push({
        x: originalRect.x,
        y: placedPanel.y + placedPanel.height + kerf,
        width: originalRect.width,
        height: originalRect.y + originalRect.height - (placedPanel.y + placedPanel.height + kerf)
      });
    }

    // Filter out rectangles that are too small to be useful
    return newRects.filter(rect => 
      rect.width >= 50 && rect.height >= 50 // Minimum 50mm useful size
    );
  }

  // Additional scoring functions
  private calculateFitScore(position: Rectangle, sheet: OptimizedSheet): number {
    // Prefer placements that use corners and edges efficiently
    let score = 0;
    
    // Corner bonus
    if (position.x === sheet.unusedRectangles[0]?.x && position.y === sheet.unusedRectangles[0]?.y) {
      score += 20;
    }
    
    // Edge bonuses
    if (position.x === 0 || position.y === 0) score += 10;
    
    return score;
  }

  private calculateWasteScore(sheet: OptimizedSheet): number {
    // Higher score for lower waste
    return Math.max(0, 100 - sheet.wasteArea / (sheet.width * sheet.height) * 100);
  }

  private calculateUtilityScore(position: Rectangle, sheet: OptimizedSheet): number {
    // General utility metrics
    const area = position.width * position.height;
    return area * 0.01; // Larger panels get slight bonus
  }

  // Helper functions
  private expandPanelsByQuantity(panels: OptimizedPanel[]): OptimizedPanel[] {
    const expanded: OptimizedPanel[] = [];
    panels.forEach((panel, index) => {
      for (let i = 0; i < panel.quantity; i++) {
        expanded.push({
          ...panel,
          id: `${panel.id}_${i}`,
          quantity: 1
        });
      }
    });
    return expanded;
  }

  private sortPanelsOptimally(panels: OptimizedPanel[]): OptimizedPanel[] {
    // Sort by area (largest first) with tiebreaker on max dimension
    return panels.sort((a, b) => {
      const areaA = a.width * a.height;
      const areaB = b.width * b.height;
      
      if (areaA !== areaB) return areaB - areaA;
      
      // Tiebreaker: largest dimension first
      const maxDimA = Math.max(a.width, a.height);
      const maxDimB = Math.max(b.width, b.height);
      return maxDimB - maxDimA;
    });
  }

  private createNewSheet(dimensions: SheetDimensions, id: number): OptimizedSheet {
    return {
      id,
      width: dimensions.width,
      height: dimensions.height,
      thickness: dimensions.thickness,
      placedPanels: [],
      unusedRectangles: [{
        x: this.margin,
        y: this.margin,
        width: dimensions.width - 2 * this.margin,
        height: dimensions.height - 2 * this.margin
      }],
      utilization: 0,
      wasteArea: 0,
      usedArea: 0
    };
  }

  private getPanelOrientations(panel: OptimizedPanel): Array<{width: number, height: number}> {
    const orientations = [{ width: panel.width, height: panel.height }];
    
    if (this.allowRotation && panel.allowRotation !== false) {
      // Only add rotated orientation if it's different (non-square)
      if (panel.width !== panel.height) {
        orientations.push({ width: panel.height, height: panel.width });
      }
    }
    
    return orientations;
  }

  private canFitPanel(panel: {width: number, height: number}, rect: Rectangle): boolean {
    return panel.width <= rect.width && panel.height <= rect.height;
  }

  private placePanelOnSheet(sheet: OptimizedSheet, panel: OptimizedPanel, position: Rectangle): void {
    // Add to placed panels
    const placement: PlacedPanel = {
      id: panel.id,
      x: position.x,
      y: position.y,
      width: position.width,
      height: position.height,
      rotated: position.width !== panel.width,
      originalWidth: panel.width,
      originalHeight: panel.height
    };
    
    sheet.placedPanels.push(placement);
    
    // Update unused rectangles
    const rectIndex = sheet.unusedRectangles.findIndex(r =>
      r.x === position.x && r.y === position.y
    );
    
    if (rectIndex !== -1) {
      const usedRect = sheet.unusedRectangles[rectIndex];
      sheet.unusedRectangles.splice(rectIndex, 1);
      
      const newRects = this.splitRectangleAfterPlacement(usedRect, position);
      sheet.unusedRectangles.push(...newRects);
    }
  }

  private updateSheetStats(sheet: OptimizedSheet): OptimizedSheet {
    const totalSheetArea = sheet.width * sheet.height;
    // Use actual placed dimensions (width × height) rather than original dimensions
    sheet.usedArea = sheet.placedPanels.reduce((sum, panel) => 
      sum + (panel.width * panel.height), 0
    );
    // Ensure waste area is never negative and utilization never exceeds 100%
    sheet.wasteArea = Math.max(totalSheetArea - sheet.usedArea, 0);
    sheet.utilization = Math.min(sheet.usedArea / totalSheetArea, 1.0); // Cap at 100%
    
    return sheet;
  }

  private calculateTotalWaste(sheets: OptimizedSheet[]): number {
    return sheets.reduce((sum, sheet) => sum + sheet.wasteArea, 0);
  }

  private calculateTotalUtilization(sheets: OptimizedSheet[]): number {
    const totalArea = sheets.reduce((sum, sheet) => sum + (sheet.width * sheet.height), 0);
    const totalUsed = sheets.reduce((sum, sheet) => sum + sheet.usedArea, 0);
    return totalArea > 0 ? Math.min(totalUsed / totalArea, 1.0) : 0; // Cap at 100%
  }
}

// Export main optimization function for easy use
export function optimizeSheetCutting(
  panels: OptimizedPanel[],
  sheetDimensions: SheetDimensions,
  options?: {
    cutWidth?: number;
    margin?: number;
    allowRotation?: boolean;
  }
): OptimizationResult {
  const optimizer = new AdvancedCuttingOptimizer(options);
  return optimizer.optimize(panels, sheetDimensions);
}