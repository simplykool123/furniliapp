import React, { useEffect, useRef, useState } from 'react';
import { Canvas, Rect, Line, Group, Text } from 'fabric';

interface FabricWardrobeProps {
  width: number;
  height: number;
  depth: number;
  shelves: number;
  drawers: number;
  shutters: number;
  wardrobeType: string;
  hasLoft?: boolean;
  loftHeight?: number;
  loftWidth?: number;
  loftDepth?: number;
  mirror?: boolean;
  className?: string;
}

const FabricWardrobe: React.FC<FabricWardrobeProps> = ({
  width,
  height,
  depth,
  shelves,
  drawers,
  shutters,
  wardrobeType,
  hasLoft = false,
  loftHeight = 400,
  loftWidth,
  loftDepth,
  mirror = false,
  className = ""
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize Fabric.js canvas
    const canvas = new Canvas(canvasRef.current, {
      width: 600,
      height: 400,
      backgroundColor: '#f8f9fa'
    });

    fabricCanvasRef.current = canvas;

    // Create wardrobe visualization
    createWardrobeVisualization(canvas);
    setIsLoading(false);

    return () => {
      canvas.dispose();
    };
  }, [width, height, depth, shelves, drawers, shutters, wardrobeType, hasLoft, loftHeight, loftWidth, loftDepth, mirror]);

  const createWardrobeVisualization = (canvas: Canvas) => {
    canvas.clear();
    canvas.backgroundColor = '#f8f9fa';

    // Scale for display (fit wardrobe in 500x350 canvas)
    const scale = Math.min(450 / width, 300 / height);
    const scaledW = width * scale;
    const scaledH = height * scale;
    const scaledD = depth * scale * 0.6; // Perspective depth

    // Starting position (centered)
    const startX = (600 - scaledW - scaledD) / 2;
    const startY = (400 - scaledH) / 2;

    // Create wardrobe group
    const wardrobeGroup = new Group([], {
      left: startX,
      top: startY,
      selectable: false
    });

    // 🏗️ MAIN STRUCTURE
    
    // Back panel (3D perspective)
    const backPanel = new Rect({
      left: scaledD,
      top: 0,
      width: scaledW,
      height: scaledH,
      fill: '#e8e8e8',
      stroke: '#666',
      strokeWidth: 1
    });
    wardrobeGroup.add(backPanel);

    // Right side panel (3D perspective)
    const rightSide = new Rect({
      left: scaledW + scaledD,
      top: 0,
      width: scaledD,
      height: scaledH,
      fill: '#ddd',
      stroke: '#666',
      strokeWidth: 1
    });
    wardrobeGroup.add(rightSide);

    // Main front panel
    const frontPanel = new Rect({
      left: 0,
      top: scaledD,
      width: scaledW,
      height: scaledH,
      fill: '#f5f5dc',
      stroke: '#8B4513',
      strokeWidth: 2
    });
    wardrobeGroup.add(frontPanel);

    // 🗂️ INTERIOR LAYOUT

    // 🗂️ CALCULATE SIDE-BY-SIDE DRAWER LAYOUT
    const isWideWardrobe = width > 600; // More than 2ft gets side-by-side drawers
    let drawersPerRow, drawerRows;
    
    if (isWideWardrobe && drawers >= 2) {
      if (drawers === 2) {
        drawersPerRow = 2;
        drawerRows = 1;
      } else if (drawers === 4) {
        drawersPerRow = 2;
        drawerRows = 2; // 2x2 arrangement
      } else {
        // For other counts, try to balance
        drawersPerRow = Math.min(Math.ceil(drawers / 2), 2);
        drawerRows = Math.ceil(drawers / drawersPerRow);
      }
    } else {
      // Single column for narrow wardrobes or single drawer
      drawersPerRow = 1;
      drawerRows = drawers;
    }

    // Calculate layout sections with center positioning for drawers
    const drawerHeight = Math.min(180 * scale, scaledH / (drawerRows + shelves + 2));
    const totalDrawerSectionHeight = drawerRows * drawerHeight;
    
    // Position drawers in center vertically
    const centerY = scaledD + scaledH / 2;
    const drawerStartY = centerY - totalDrawerSectionHeight / 2;
    
    // Calculate shelf sections (above and below drawers)
    const upperShelfHeight = drawerStartY - scaledD;
    const lowerShelfHeight = scaledD + scaledH - (drawerStartY + totalDrawerSectionHeight);
    
    const upperShelves = Math.floor(shelves / 2);
    const lowerShelves = shelves - upperShelves;
    
    // Add drawers with side-by-side layout
    for (let row = 0; row < drawerRows; row++) {
      for (let col = 0; col < drawersPerRow; col++) {
        const drawerIndex = row * drawersPerRow + col;
        if (drawerIndex >= drawers) break;
        
        const drawerY = drawerStartY + row * drawerHeight;
        const drawerWidth = (scaledW - 20) / drawersPerRow;
        const drawerX = 10 + col * drawerWidth;
        
        // Drawer box
        const drawer = new Rect({
          left: drawerX,
          top: drawerY,
          width: drawerWidth - 5,
          height: drawerHeight - 5,
          fill: '#DEB887',
          stroke: '#8B4513',
          strokeWidth: 1
        });
        wardrobeGroup.add(drawer);

        // Drawer handle
        const handle = new Rect({
          left: drawerX + drawerWidth - 20,
          top: drawerY + drawerHeight/2 - 3,
          width: 12,
          height: 6,
          fill: '#4A4A4A',
          rx: 2,
          ry: 2
        });
        wardrobeGroup.add(handle);

        // Drawer label
        const drawerLabel = new Text(`D${drawerIndex + 1}`, {
          left: drawerX + 5,
          top: drawerY + drawerHeight/2 - 5,
          fontSize: 9,
          fill: '#666',
          fontFamily: 'Arial'
        });
        wardrobeGroup.add(drawerLabel);
      }
    }

    // Add upper shelves (above drawers)
    if (upperShelves > 0) {
      const upperShelfSpacing = upperShelfHeight / (upperShelves + 1);
      for (let i = 0; i < upperShelves; i++) {
        const shelfY = scaledD + (i + 1) * upperShelfSpacing;
        
        const shelf = new Line([5, shelfY, scaledW - 5, shelfY], {
          stroke: '#8B4513',
          strokeWidth: 2
        });
        wardrobeGroup.add(shelf);

        const shelfLabel = new Text(`S${i + 1}`, {
          left: 15,
          top: shelfY + 5,
          fontSize: 8,
          fill: '#888',
          fontFamily: 'Arial'
        });
        wardrobeGroup.add(shelfLabel);
      }
    }
    
    // Add lower shelves (below drawers)
    if (lowerShelves > 0) {
      const lowerShelfSpacing = lowerShelfHeight / (lowerShelves + 1);
      const lowerShelfStartY = drawerStartY + totalDrawerSectionHeight;
      
      for (let i = 0; i < lowerShelves; i++) {
        const shelfY = lowerShelfStartY + (i + 1) * lowerShelfSpacing;
        
        const shelf = new Line([5, shelfY, scaledW - 5, shelfY], {
          stroke: '#8B4513',
          strokeWidth: 2
        });
        wardrobeGroup.add(shelf);

        const shelfLabel = new Text(`S${upperShelves + i + 1}`, {
          left: 15,
          top: shelfY + 5,
          fontSize: 8,
          fill: '#888',
          fontFamily: 'Arial'
        });
        wardrobeGroup.add(shelfLabel);
      }
    }

    // Add hanging rod in upper section (if space available)
    if (upperShelves <= 1 && upperShelfHeight > 80) {
      const rodY = scaledD + upperShelfHeight * 0.6;
      const hangingRod = new Line([15, rodY, scaledW - 15, rodY], {
        stroke: '#C0C0C0',
        strokeWidth: 3
      });
      wardrobeGroup.add(hangingRod);

      // Rod supports
      const leftSupport = new Rect({
        left: 13,
        top: rodY - 2,
        width: 4,
        height: 4,
        fill: '#999'
      });
      const rightSupport = new Rect({
        left: scaledW - 17,
        top: rodY - 2,
        width: 4,
        height: 4,
        fill: '#999'
      });
      wardrobeGroup.add(leftSupport);
      wardrobeGroup.add(rightSupport);

      // Hanging rod label
      const rodLabel = new Text('Hanging Rod', {
        left: scaledW/2 - 25,
        top: rodY - 15,
        fontSize: 8,
        fill: '#666',
        fontFamily: 'Arial'
      });
      wardrobeGroup.add(rodLabel);
    }

    // 🚪 SHUTTERS/DOORS
    const shutterWidth = scaledW / shutters;
    for (let i = 0; i < shutters; i++) {
      const shutterX = i * shutterWidth;
      
      // Shutter outline
      const shutter = new Rect({
        left: shutterX + 2,
        top: scaledD + 2,
        width: shutterWidth - 4,
        height: scaledH - 4,
        fill: 'transparent',
        stroke: '#8B4513',
        strokeWidth: 1.5,
        strokeDashArray: wardrobeType === 'sliding' ? [5, 5] : undefined
      });
      wardrobeGroup.add(shutter);

      // Shutter handle
      const handleX = wardrobeType === 'sliding' 
        ? shutterX + shutterWidth/2 - 4
        : shutterX + (i % 2 === 0 ? shutterWidth - 15 : 8);
        
      const shutterHandle = new Rect({
        left: handleX,
        top: scaledD + scaledH/2 - 8,
        width: 8,
        height: 16,
        fill: '#4A4A4A',
        rx: 3,
        ry: 3
      });
      wardrobeGroup.add(shutterHandle);

      // Mirror effect on first shutter if mirror option
      if (mirror && i === 0) {
        const mirrorEffect = new Rect({
          left: shutterX + 8,
          top: scaledD + 8,
          width: shutterWidth - 16,
          height: scaledH - 16,
          fill: 'rgba(173, 216, 230, 0.3)',
          stroke: '#4169E1',
          strokeWidth: 1
        });
        wardrobeGroup.add(mirrorEffect);
        
        const mirrorLabel = new Text('MIRROR', {
          left: shutterX + shutterWidth/2 - 18,
          top: scaledD + scaledH/2 - 5,
          fontSize: 9,
          fill: '#4169E1',
          fontFamily: 'Arial'
        });
        wardrobeGroup.add(mirrorLabel);
      }
    }

    // 🏠 LOFT CUPBOARD VISUALIZATION
    if (hasLoft) {
      // Default loft dimensions if not provided
      const actualLoftWidth = loftWidth || width;
      const actualLoftDepth = loftDepth || depth;
      
      // Scale loft dimensions
      const scaledLoftW = actualLoftWidth * scale;
      const scaledLoftH = loftHeight * scale;
      const scaledLoftD = actualLoftDepth * scale * 0.6;
      
      // Position loft above main wardrobe
      const loftX = actualLoftWidth < width ? (scaledW - scaledLoftW) / 2 : 0; // Center if smaller
      const loftY = -scaledLoftH - 30; // Above main wardrobe with gap
      
      // Loft back panel
      const loftBackPanel = new Rect({
        left: loftX + scaledLoftD,
        top: loftY,
        width: scaledLoftW,
        height: scaledLoftH,
        fill: '#f0f0f0',
        stroke: '#888',
        strokeWidth: 1
      });
      wardrobeGroup.add(loftBackPanel);
      
      // Loft right side panel
      const loftRightSide = new Rect({
        left: loftX + scaledLoftW + scaledLoftD,
        top: loftY,
        width: scaledLoftD,
        height: scaledLoftH,
        fill: '#e0e0e0',
        stroke: '#888',
        strokeWidth: 1
      });
      wardrobeGroup.add(loftRightSide);
      
      // Loft front panel
      const loftFrontPanel = new Rect({
        left: loftX,
        top: loftY + scaledLoftD,
        width: scaledLoftW,
        height: scaledLoftH,
        fill: '#f8f8f0',
        stroke: '#A0522D',
        strokeWidth: 1.5
      });
      wardrobeGroup.add(loftFrontPanel);
      
      // Loft interior shelves (1-2 shelves typically)
      const loftShelves = Math.min(2, Math.floor(loftHeight / 200)); // 1 shelf per 200mm
      if (loftShelves > 0) {
        const loftShelfSpacing = scaledLoftH / (loftShelves + 1);
        for (let i = 0; i < loftShelves; i++) {
          const loftShelfY = loftY + scaledLoftD + (i + 1) * loftShelfSpacing;
          
          const loftShelf = new Line([loftX + 3, loftShelfY, loftX + scaledLoftW - 3, loftShelfY], {
            stroke: '#A0522D',
            strokeWidth: 1.5
          });
          wardrobeGroup.add(loftShelf);
        }
      }
      
      // Loft access (sliding or hinged door indication)
      const loftDoor = new Rect({
        left: loftX + 2,
        top: loftY + scaledLoftD + 2,
        width: scaledLoftW - 4,
        height: scaledLoftH - 4,
        fill: 'transparent',
        stroke: '#A0522D',
        strokeWidth: 1,
        strokeDashArray: [3, 3]
      });
      wardrobeGroup.add(loftDoor);
      
      // Loft label
      const loftLabel = new Text('LOFT CUPBOARD', {
        left: loftX + scaledLoftW/2 - 30,
        top: loftY + scaledLoftH/2 + scaledLoftD/2 - 5,
        fontSize: 8,
        fill: '#A0522D',
        fontFamily: 'Arial',
        fontWeight: 'bold'
      });
      wardrobeGroup.add(loftLabel);
      
      // Loft dimensions
      if (actualLoftWidth !== width) {
        // Show loft width if different from main wardrobe
        const loftWidthLine = new Line([loftX, loftY - 10, loftX + scaledLoftW, loftY - 10], {
          stroke: '#A0522D',
          strokeWidth: 1
        });
        wardrobeGroup.add(loftWidthLine);
        
        const loftWidthText = new Text(`${actualLoftWidth}mm`, {
          left: loftX + scaledLoftW/2 - 20,
          top: loftY - 20,
          fontSize: 9,
          fill: '#A0522D',
          fontFamily: 'Arial',
          fontWeight: 'bold'
        });
        wardrobeGroup.add(loftWidthText);
      }
      
      // Loft height dimension
      const loftHeightLine = new Line([loftX - 15, loftY + scaledLoftD, loftX - 15, loftY + scaledLoftD + scaledLoftH], {
        stroke: '#A0522D',
        strokeWidth: 1
      });
      wardrobeGroup.add(loftHeightLine);
      
      const loftHeightText = new Text(`${loftHeight}mm`, {
        left: loftX - 35,
        top: loftY + scaledLoftD + scaledLoftH/2 - 5,
        fontSize: 9,
        fill: '#A0522D',
        fontFamily: 'Arial',
        fontWeight: 'bold',
        angle: 90,
        originX: 'center',
        originY: 'center'
      });
      wardrobeGroup.add(loftHeightText);
      
      // Connection line from main wardrobe to loft
      const connectionLine = new Line([scaledW/2, -5, loftX + scaledLoftW/2, loftY + scaledLoftH + scaledLoftD + 5], {
        stroke: '#ccc',
        strokeWidth: 1,
        strokeDashArray: [2, 2]
      });
      wardrobeGroup.add(connectionLine);
    }

    // 📏 DIMENSIONS
    
    // Width dimension (top)
    const widthLine = new Line([0, scaledD - 15, scaledW, scaledD - 15], {
      stroke: '#000',
      strokeWidth: 1
    });
    wardrobeGroup.add(widthLine);
    
    const widthText = new Text(`${width}mm`, {
      left: scaledW/2 - 20,
      top: scaledD - 25,
      fontSize: 11,
      fill: '#000',
      fontFamily: 'Arial',
      fontWeight: 'bold'
    });
    wardrobeGroup.add(widthText);

    // Height dimension (right)
    const heightLine = new Line([scaledW + 15, scaledD, scaledW + 15, scaledD + scaledH], {
      stroke: '#000',
      strokeWidth: 1
    });
    wardrobeGroup.add(heightLine);
    
    const heightText = new Text(`${height}mm`, {
      left: scaledW + 20,
      top: scaledD + scaledH/2 - 5,
      fontSize: 11,
      fill: '#000',
      fontFamily: 'Arial',
      fontWeight: 'bold',
      angle: 90,
      originX: 'center',
      originY: 'center'
    });
    wardrobeGroup.add(heightText);

    // Depth dimension (perspective)
    const depthLine = new Line([scaledW, scaledH + scaledD + 20, scaledW + scaledD, scaledH + 20], {
      stroke: '#000',
      strokeWidth: 1
    });
    wardrobeGroup.add(depthLine);
    
    const depthText = new Text(`${depth}mm`, {
      left: scaledW + scaledD/2 - 15,
      top: scaledH + scaledD + 25,
      fontSize: 10,
      fill: '#000',
      fontFamily: 'Arial'
    });
    wardrobeGroup.add(depthText);

    // Add specifications text with drawer layout info
    const drawerLayoutInfo = isWideWardrobe && drawers >= 2 
      ? ` (${drawerRows}×${drawersPerRow} layout)` 
      : '';
    
    const loftInfo = hasLoft ? `\nLoft: ${loftHeight}mm H × ${loftWidth || width}mm W` : '';
    const specs = new Text(
      `Specifications:\nShelves: ${shelves} | Drawers: ${drawers}${drawerLayoutInfo}\nShutters: ${shutters} | Type: ${wardrobeType.toUpperCase()}${mirror ? ' + MIRROR' : ''}${loftInfo}`,
      {
        left: 20,
        top: scaledH + scaledD + 50,
        fontSize: 10,
        fill: '#666',
        fontFamily: 'Arial',
        lineHeight: 1.3
      }
    );
    wardrobeGroup.add(specs);

    // Add to canvas
    canvas.add(wardrobeGroup);
    canvas.renderAll();
  };

  return (
    <div className={`bg-white border rounded-lg p-4 ${className}`}>
      <div className="text-center mb-2">
        <h3 className="text-sm font-semibold text-gray-800">Interactive Wardrobe Visualization</h3>
        <p className="text-xs text-gray-600">
          {width}mm × {height}mm × {depth}mm • {wardrobeType.charAt(0).toUpperCase() + wardrobeType.slice(1)}
        </p>
      </div>
      
      {isLoading && (
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Loading visualization...</div>
        </div>
      )}
      
      <canvas
        ref={canvasRef}
        className={`border border-gray-200 rounded ${isLoading ? 'hidden' : 'block'}`}
        style={{ maxWidth: '100%', height: 'auto' }}
      />
      
      <div className="mt-2 text-xs text-gray-500 text-center">
        Professional technical drawing with accurate proportions and interior layout
      </div>
    </div>
  );
};

export default FabricWardrobe;