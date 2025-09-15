import React from 'react';

interface FurnitureTechnicalDrawingProps {
  bomResult?: any;
  furnitureType: string;
  dimensions: {
    width: number;
    height: number;
    depth: number;
    unitOfMeasure: string;
  };
  configuration: {
    shelves?: number;
    drawers?: number;
    shutters?: number;
    doors?: number;
    wardrobeType?: string;
    [key: string]: any;
  };
}

const FurnitureTechnicalDrawing: React.FC<FurnitureTechnicalDrawingProps> = ({
  bomResult,
  furnitureType,
  dimensions,
  configuration
}) => {
  // Convert dimensions to a consistent unit (mm) for calculations
  const convertToMM = (value: number, unit: string): number => {
    switch (unit.toLowerCase()) {
      case 'ft': return value * 304.8;
      case 'cm': return value * 10;
      case 'in': return value * 25.4;
      case 'mm':
      default: return value;
    }
  };

  const widthMM = convertToMM(dimensions.width, dimensions.unitOfMeasure);
  const heightMM = convertToMM(dimensions.height, dimensions.unitOfMeasure);
  const depthMM = convertToMM(dimensions.depth, dimensions.unitOfMeasure);

  // SVG viewport dimensions
  const svgWidth = 600;
  const svgHeight = 500;
  const margin = 80;

  // Scale factor to fit furniture in viewport
  const scaleX = (svgWidth - 2 * margin) / widthMM;
  const scaleY = (svgHeight - 2 * margin) / heightMM;
  const scale = Math.min(scaleX, scaleY) * 0.8; // 80% to leave room for dimensions

  // Scaled dimensions for drawing
  const drawWidth = widthMM * scale;
  const drawHeight = heightMM * scale;

  // Starting position (centered)
  const startX = (svgWidth - drawWidth) / 2;
  const startY = (svgHeight - drawHeight) / 2;

  const formatDimension = (value: number): string => {
    if (dimensions.unitOfMeasure === 'mm') {
      return `${Math.round(value)}mm`;
    } else if (dimensions.unitOfMeasure === 'cm') {
      return `${Math.round(value / 10)} cm`;
    } else if (dimensions.unitOfMeasure === 'ft') {
      return `${Math.round(value / 304.8 * 10) / 10} ft`;
    }
    return `${Math.round(value)}`;
  };

  // 🚪 INTELLIGENT WARDROBE RENDERING - AI-powered wardrobe design based on type and specifications
  const renderWardrobe = () => {
    const elements: JSX.Element[] = [];
    const wardrobeType = configuration.wardrobeType || 'openable';
    const shelves = configuration.shelves || configuration.shelfCount || 3;
    const drawers = configuration.drawers || configuration.drawerCount || 0;
    const shutters = configuration.shutters || configuration.shutterCount || 2;
    const hangingRods = configuration.hangingRods || 2;
    const hasMirror = configuration.mirror === true;
    const hasLoft = configuration.hasLoft === true;

    // 🎯 INTELLIGENT WARDROBE TYPE RENDERING - Based on wardrobe type
    switch (wardrobeType.toLowerCase()) {
      case 'sliding':
        return renderSlidingWardrobe(elements, { shelves, drawers, shutters, hangingRods, hasMirror, hasLoft });
      case 'walk-in':
      case 'walkin':
        return renderWalkInWardrobe(elements, { shelves, drawers, shutters, hangingRods, hasMirror, hasLoft });
      default:
        return renderOpenableWardrobe(elements, { shelves, drawers, shutters, hangingRods, hasMirror, hasLoft });
    }
  };

  // 🚪 OPENABLE WARDROBE - Traditional hinged door wardrobe
  const renderOpenableWardrobe = (elements: JSX.Element[], config: any) => {
    const { shelves, drawers, shutters, hangingRods, hasMirror, hasLoft } = config;
    
    // Main wardrobe outline
    elements.push(
      <rect
        key="wardrobe-frame"
        x={startX}
        y={startY}
        width={drawWidth}
        height={drawHeight}
        fill="#F5F5DC"
        stroke="#8B4513"
        strokeWidth="3"
        rx="4"
      />
    );

    const internalWidth = drawWidth - 8;
    const internalHeight = drawHeight - 8;
    const internalStartX = startX + 4;
    const internalStartY = startY + 4;

    // 🎯 INTELLIGENT LAYOUT - Adapt to wardrobe dimensions
    const layoutRatio = widthMM > 1800 ? 0.6 : 0.7; // Larger wardrobes get more storage space
    const hangingWidth = internalWidth * layoutRatio;
    const storageWidth = internalWidth * (1 - layoutRatio);

    // ✨ HANGING SPACE SECTION (LEFT SIDE - Main Feature)
    elements.push(
      <rect
        key="hanging-area"
        x={internalStartX}
        y={internalStartY}
        width={hangingWidth}
        height={internalHeight * 0.85} // 85% height for hanging
        fill="#F8F9FA"
        stroke="#DEE2E6"
        strokeWidth="1"
      />
    );

    // Hanging rail (industry standard: 3" from top)
    const railY = internalStartY + 20;
    elements.push(
      <line
        key="hanging-rail"
        x1={internalStartX + 10}
        y1={railY}
        x2={internalStartX + hangingWidth - 10}
        y2={railY}
        stroke="#495057"
        strokeWidth="4"
      />
    );

    // Hanging clothes representation
    for (let i = 0; i < 5; i++) {
      const clothesX = internalStartX + 20 + (i * (hangingWidth - 40) / 4);
      elements.push(
        <g key={`clothes-${i}`}>
          <line
            x1={clothesX}
            y1={railY}
            x2={clothesX}
            y2={railY + 60}
            stroke="#6C757D"
            strokeWidth="2"
          />
          <rect
            x={clothesX - 8}
            y={railY + 60}
            width={16}
            height={40}
            fill="none"
            stroke="#ADB5BD"
            strokeWidth="1"
            rx="2"
          />
        </g>
      );
    }

    elements.push(
      <text
        key="hanging-label"
        x={internalStartX + hangingWidth / 2}
        y={internalStartY + internalHeight / 2}
        textAnchor="middle"
        fontSize="11"
        fill="#495057"
        fontWeight="bold"
        transform={`rotate(-90, ${internalStartX + hangingWidth / 2}, ${internalStartY + internalHeight / 2})`}
      >
        HANGING SPACE
      </text>
    );

    // 📚 STORAGE SECTION (RIGHT SIDE)
    const storageStartX = internalStartX + hangingWidth;
    
    // Shelves area (upper part)
    const shelfAreaHeight = internalHeight * 0.6;
    const actualShelves = Math.min(shelves, 4); // Max 4 shelves for realism
    
    if (actualShelves > 0) {
      const shelfSpacing = shelfAreaHeight / (actualShelves + 1);
      for (let i = 0; i < actualShelves; i++) {
        const shelfY = internalStartY + (i + 1) * shelfSpacing;
        elements.push(
          <line
            key={`shelf-${i}`}
            x1={storageStartX + 5}
            y1={shelfY}
            x2={storageStartX + storageWidth - 5}
            y2={shelfY}
            stroke="#495057"
            strokeWidth="2"
          />
        );
        
        // Folded items on shelves
        for (let j = 0; j < 2; j++) {
          elements.push(
            <rect
              key={`folded-${i}-${j}`}
              x={storageStartX + 10 + (j * 20)}
              y={shelfY - 12}
              width={15}
              height={10}
              fill="none"
              stroke="#ADB5BD"
              strokeWidth="1"
              rx="1"
            />
          );
        }
      }

      elements.push(
        <text
          key="shelf-label"
          x={storageStartX + storageWidth / 2}
          y={internalStartY + shelfAreaHeight / 2}
          textAnchor="middle"
          fontSize="10"
          fill="#6C757D"
          transform={`rotate(-90, ${storageStartX + storageWidth / 2}, ${internalStartY + shelfAreaHeight / 2})`}
        >
          SHELVES ({actualShelves})
        </text>
      );
    }

    // 🗃️ DRAWER SECTION (BOTTOM)
    if (drawers > 0) {
      const drawerAreaStartY = internalStartY + shelfAreaHeight;
      const drawerAreaHeight = internalHeight - shelfAreaHeight;
      const actualDrawers = Math.min(drawers, 3); // Max 3 drawers for realism
      const drawerHeight = (drawerAreaHeight - 10) / actualDrawers;

      for (let i = 0; i < actualDrawers; i++) {
        const drawerY = drawerAreaStartY + 5 + (i * drawerHeight);
        
        elements.push(
          <rect
            key={`drawer-${i}`}
            x={storageStartX + 8}
            y={drawerY + 2}
            width={storageWidth - 16}
            height={drawerHeight - 4}
            fill="#F8F9FA"
            stroke="#6C757D"
            strokeWidth="1"
            rx="2"
          />
        );
        
        // Drawer handle
        elements.push(
          <rect
            key={`drawer-handle-${i}`}
            x={storageStartX + storageWidth - 20}
            y={drawerY + drawerHeight / 2 - 2}
            width="8"
            height="4"
            fill="#495057"
            rx="2"
          />
        );
      }

      elements.push(
        <text
          key="drawer-label"
          x={storageStartX + storageWidth / 2}
          y={drawerAreaStartY + drawerAreaHeight / 2}
          textAnchor="middle"
          fontSize="9"
          fill="#6C757D"
          transform={`rotate(-90, ${storageStartX + storageWidth / 2}, ${drawerAreaStartY + drawerAreaHeight / 2})`}
        >
          DRAWERS ({actualDrawers})
        </text>
      );
    }

    // Door/shutter divisions
    if (shutters > 1) {
      const shutterWidth = drawWidth / shutters;
      for (let i = 1; i < shutters; i++) {
        const shutterX = startX + (i * shutterWidth);
        elements.push(
          <line
            key={`door-div-${i}`}
            x1={shutterX}
            y1={startY}
            x2={shutterX}
            y2={startY + drawHeight}
            stroke="#495057"
            strokeWidth="2"
            strokeDasharray="10,5"
          />
        );
      }
    }

    // 🏷️ WARDROBE TYPE INDICATOR
    elements.push(
      <text
        key="wardrobe-type-label"
        x={startX + drawWidth/2}
        y={startY - 15}
        textAnchor="middle"
        fontSize="12"
        fill="#8B4513"
        fontWeight="bold"
      >
        {getWardrobeTypeName()} • {formatDimension(widthMM)}×{formatDimension(heightMM)}×{formatDimension(depthMM)}
      </text>
    );

    return elements;
  };

  // 🔄 SLIDING WARDROBE - Modern sliding door design
  const renderSlidingWardrobe = (elements: JSX.Element[], config: any) => {
    const { shelves, drawers, hangingRods, hasMirror } = config;
    
    elements.push(
      <rect
        key="sliding-frame"
        x={startX}
        y={startY}
        width={drawWidth}
        height={drawHeight}
        fill="#F8F8FF"
        stroke="#696969"
        strokeWidth="3"
        rx="6"
      />
    );

    const internalStartX = startX + 6;
    const internalStartY = startY + 6;
    const internalWidth = drawWidth - 12;
    const internalHeight = drawHeight - 12;

    // Sliding tracks (top and bottom)
    elements.push(
      <line
        key="top-track"
        x1={internalStartX}
        y1={internalStartY}
        x2={internalStartX + internalWidth}
        y2={internalStartY}
        stroke="#A9A9A9"
        strokeWidth="4"
      />
    );
    
    elements.push(
      <line
        key="bottom-track"
        x1={internalStartX}
        y1={internalStartY + internalHeight}
        x2={internalStartX + internalWidth}
        y2={internalStartY + internalHeight}
        stroke="#A9A9A9"
        strokeWidth="4"
      />
    );

    // Sliding doors (50% each)
    const doorWidth = internalWidth / 2;
    
    for (let i = 0; i < 2; i++) {
      const doorX = internalStartX + (i * doorWidth);
      
      elements.push(
        <rect
          key={`sliding-door-${i}`}
          x={doorX + 2}
          y={internalStartY + 4}
          width={doorWidth - 4}
          height={internalHeight - 8}
          fill={hasMirror && i === 0 ? "#E6F3FF" : "#FFFFFF"}
          stroke="#C0C0C0"
          strokeWidth="2"
          rx="4"
        />
      );
      
      // Mirror effect on first door if mirror option is selected
      if (hasMirror && i === 0) {
        elements.push(
          <text
            key="mirror-label"
            x={doorX + doorWidth/2}
            y={internalStartY + internalHeight/2}
            textAnchor="middle"
            fontSize="10"
            fill="#4682B4"
            fontStyle="italic"
          >
            MIRROR
          </text>
        );
      }
      
      // Door handle
      elements.push(
        <rect
          key={`sliding-handle-${i}`}
          x={doorX + doorWidth - 20}
          y={internalStartY + internalHeight/2 - 8}
          width="12"
          height="16"
          fill="#8B4513"
          rx="6"
        />
      );
    }

    // Internal layout indication
    renderWardrobeInterior(elements, internalStartX, internalStartY, internalWidth, internalHeight, { shelves, drawers, hangingRods });

    return elements;
  };

  // 🚶 WALK-IN WARDROBE - Spacious walk-in closet design  
  const renderWalkInWardrobe = (elements: JSX.Element[], config: any) => {
    const { shelves, drawers, hangingRods } = config;
    
    // Walk-in frame (represents room boundaries)
    elements.push(
      <rect
        key="walkin-frame"
        x={startX}
        y={startY}
        width={drawWidth}
        height={drawHeight}
        fill="none"
        stroke="#2F4F4F"
        strokeWidth="4"
        strokeDasharray="10,5"
        rx="8"
      />
    );

    // L-shaped layout for walk-in
    const leftWallWidth = drawWidth * 0.25;
    const rightWallWidth = drawWidth * 0.25;
    const backWallWidth = drawWidth * 0.5;
    
    // Left wall storage
    elements.push(
      <rect
        key="left-wall-storage"
        x={startX + 8}
        y={startY + 8}
        width={leftWallWidth}
        height={drawHeight - 16}
        fill="#F0F8FF"
        stroke="#4682B4"
        strokeWidth="2"
        rx="4"
      />
    );

    // Right wall storage
    elements.push(
      <rect
        key="right-wall-storage"
        x={startX + drawWidth - rightWallWidth - 8}
        y={startY + 8}
        width={rightWallWidth}
        height={drawHeight - 16}
        fill="#F0F8FF"
        stroke="#4682B4"
        strokeWidth="2"
        rx="4"
      />
    );

    // Back wall storage
    elements.push(
      <rect
        key="back-wall-storage"
        x={startX + leftWallWidth + 8}
        y={startY + 8}
        width={backWallWidth}
        height={drawHeight * 0.3}
        fill="#F0F8FF"
        stroke="#4682B4"
        strokeWidth="2"
        rx="4"
      />
    );

    // Hanging rods on all three walls
    const rodPositions = [
      { x: startX + 8 + leftWallWidth/2, y: startY + 20, width: leftWallWidth - 16 },
      { x: startX + drawWidth - rightWallWidth - 8 + rightWallWidth/2, y: startY + 20, width: rightWallWidth - 16 },
      { x: startX + leftWallWidth + 8 + backWallWidth/2, y: startY + 20, width: backWallWidth - 16 }
    ];

    rodPositions.forEach((rod, i) => {
      elements.push(
        <line
          key={`walkin-rod-${i}`}
          x1={rod.x - rod.width/2}
          y1={rod.y}
          x2={rod.x + rod.width/2}
          y2={rod.y}
          stroke="#8B4513"
          strokeWidth="3"
        />
      );
    });

    // Walking space in center
    const walkingAreaX = startX + leftWallWidth + 20;
    const walkingAreaY = startY + drawHeight * 0.4;
    const walkingAreaWidth = drawWidth - leftWallWidth - rightWallWidth - 40;
    const walkingAreaHeight = drawHeight * 0.5;
    
    elements.push(
      <rect
        key="walking-space"
        x={walkingAreaX}
        y={walkingAreaY}
        width={walkingAreaWidth}
        height={walkingAreaHeight}
        fill="none"
        stroke="#DDA0DD"
        strokeWidth="2"
        strokeDasharray="5,5"
        rx="8"
      />
    );
    
    elements.push(
      <text
        key="walking-label"
        x={walkingAreaX + walkingAreaWidth/2}
        y={walkingAreaY + walkingAreaHeight/2}
        textAnchor="middle"
        fontSize="12"
        fill="#8B008B"
        fontWeight="bold"
      >
        WALKING SPACE
      </text>
    );

    // Shelving indicators
    if (shelves > 0) {
      const shelfSpacing = (drawHeight * 0.6) / Math.min(shelves, 6);
      for (let i = 0; i < Math.min(shelves, 6); i++) {
        const shelfY = startY + 40 + (i * shelfSpacing);
        
        // Left wall shelves
        elements.push(
          <line
            key={`left-shelf-${i}`}
            x1={startX + 12}
            y1={shelfY}
            x2={startX + leftWallWidth + 4}
            y2={shelfY}
            stroke="#CD853F"
            strokeWidth="2"
          />
        );
        
        // Right wall shelves
        elements.push(
          <line
            key={`right-shelf-${i}`}
            x1={startX + drawWidth - rightWallWidth - 4}
            y1={shelfY}
            x2={startX + drawWidth - 12}
            y2={shelfY}
            stroke="#CD853F"
            strokeWidth="2"
          />
        );
      }
    }

    return elements;
  };

  // 🏠 WARDROBE INTERIOR - Shared interior rendering logic
  const renderWardrobeInterior = (elements: JSX.Element[], startX: number, startY: number, width: number, height: number, config: any) => {
    const { shelves, drawers, hangingRods } = config;
    
    // Hanging rod
    if (hangingRods > 0) {
      elements.push(
        <line
          key="hanging-rod"
          x1={startX + 10}
          y1={startY + 20}
          x2={startX + width - 10}
          y2={startY + 20}
          stroke="#8B4513"
          strokeWidth="3"
        />
      );
    }

    // Shelves
    if (shelves > 0) {
      const shelfSpacing = (height - 60) / (shelves + 1);
      for (let i = 0; i < shelves; i++) {
        const shelfY = startY + 40 + ((i + 1) * shelfSpacing);
        elements.push(
          <line
            key={`interior-shelf-${i}`}
            x1={startX + width * 0.6 + 5}
            y1={shelfY}
            x2={startX + width - 5}
            y2={shelfY}
            stroke="#CD853F"
            strokeWidth="2"
          />
        );
      }
    }

    // Drawers (bottom section)
    if (drawers > 0) {
      const drawerHeight = (height * 0.3) / Math.min(drawers, 3);
      const drawerStartY = startY + height - (height * 0.3);
      
      for (let i = 0; i < Math.min(drawers, 3); i++) {
        const drawerY = drawerStartY + (i * drawerHeight);
        elements.push(
          <rect
            key={`interior-drawer-${i}`}
            x={startX + width * 0.6 + 5}
            y={drawerY + 2}
            width={width * 0.35}
            height={drawerHeight - 4}
            fill="#FFFFFF"
            stroke="#A9A9A9"
            strokeWidth="1"
            rx="2"
          />
        );
      }
    }
  };

  // 📝 WARDROBE TYPE NAMES
  const getWardrobeTypeName = (): string => {
    const type = configuration.wardrobeType || 'openable';
    const names: Record<string, string> = {
      'openable': 'Hinged Door Wardrobe',
      'sliding': 'Sliding Door Wardrobe',
      'walk-in': 'Walk-in Wardrobe',
      'walkin': 'Walk-in Wardrobe'
    };
    return names[type.toLowerCase()] || 'Custom Wardrobe';
  };

  // 🛏️ INTELLIGENT BED RENDERING - AI-powered bed design based on type and dimensions
  const renderBed = () => {
    const elements: JSX.Element[] = [];
    const bedType = configuration.bedType || 'single';
    const hasStorage = configuration.storage === 'with_storage' || (configuration.drawers && configuration.drawers > 0);
    const hasHeadboard = configuration.headboard !== false;
    const hasFootboard = configuration.footboard === true;

    // 🎯 INTELLIGENT BED PROPORTIONS - Based on actual bed standards
    const bedProps = getBedProportions(bedType, widthMM, heightMM, depthMM);
    
    // Bed frame base (platform)
    const frameHeight = bedProps.frameHeight * scale;
    const bedBaseY = startY + drawHeight - frameHeight;
    
    elements.push(
      <rect
        key="bed-platform"
        x={startX}
        y={bedBaseY}
        width={drawWidth}
        height={frameHeight}
        fill="#8B4513"
        stroke="#654321"
        strokeWidth="2"
        rx="4"
      />
    );

    // 🛏️ INTELLIGENT MATTRESS - Realistic mattress representation
    const mattressHeight = bedProps.mattressHeight * scale;
    const mattressY = bedBaseY - mattressHeight;
    
    elements.push(
      <rect
        key="mattress-base"
        x={startX + 8}
        y={mattressY}
        width={drawWidth - 16}
        height={mattressHeight}
        fill="#F0F8FF"
        stroke="#D1D5DB"
        strokeWidth="2"
        rx="6"
      />
    );
    
    // Mattress quilting pattern (for realism)
    const quiltSpacing = Math.min(30, drawWidth / 6);
    for (let i = 1; i < Math.floor(drawWidth / quiltSpacing); i++) {
      elements.push(
        <line
          key={`quilt-vertical-${i}`}
          x1={startX + 8 + (i * quiltSpacing)}
          y1={mattressY + 4}
          x2={startX + 8 + (i * quiltSpacing)}
          y2={mattressY + mattressHeight - 4}
          stroke="#E5E7EB"
          strokeWidth="0.5"
          strokeDasharray="3,3"
        />
      );
    }

    // 🎯 INTELLIGENT HEADBOARD - Size varies by bed type
    if (hasHeadboard) {
      const headboardHeight = bedProps.headboardHeight * scale;
      const headboardY = mattressY - headboardHeight;
      
      elements.push(
        <rect
          key="headboard"
          x={startX - 8}
          y={headboardY}
          width={drawWidth + 16}
          height={headboardHeight}
          fill="#8B4513"
          stroke="#654321"
          strokeWidth="3"
          rx="8"
        />
      );
      
      // Headboard details (tufted design for larger beds)
      if (['king', 'queen', 'king_xl'].includes(bedType)) {
        const buttonCount = bedType === 'king_xl' ? 4 : 3;
        const buttonSpacing = (drawWidth + 16) / (buttonCount + 1);
        for (let i = 0; i < buttonCount; i++) {
          elements.push(
            <circle
              key={`headboard-tuft-${i}`}
              cx={startX - 8 + ((i + 1) * buttonSpacing)}
              cy={headboardY + headboardHeight / 2}
              r="4"
              fill="#654321"
              stroke="#4A4A4A"
              strokeWidth="1"
            />
          );
        }
      }
    }

    // 🦵 INTELLIGENT FOOTBOARD - Optional, smaller than headboard
    if (hasFootboard) {
      const footboardHeight = bedProps.footboardHeight * scale;
      
      elements.push(
        <rect
          key="footboard"
          x={startX}
          y={startY + drawHeight}
          width={drawWidth}
          height={footboardHeight}
          fill="#8B4513"
          stroke="#654321"
          strokeWidth="2"
          rx="4"
        />
      );
    }

    // 🗃️ INTELLIGENT STORAGE - Smart storage based on bed type and size
    if (hasStorage) {
      const drawerCount = configuration.drawers || (bedType === 'single' ? 2 : bedType === 'bunk' ? 3 : 4);
      const drawerWidth = drawWidth / drawerCount;
      const drawerHeight = 20;
      const storageY = startY + drawHeight + (hasFootboard ? 25 : 8);
      
      for (let i = 0; i < drawerCount; i++) {
        const drawerX = startX + (i * drawerWidth);
        
        elements.push(
          <rect
            key={`storage-drawer-${i}`}
            x={drawerX + 4}
            y={storageY}
            width={drawerWidth - 8}
            height={drawerHeight}
            fill="#FFFFFF"
            stroke="#9CA3AF"
            strokeWidth="1.5"
            rx="3"
          />
        );
        
        // Modern drawer handle
        elements.push(
          <rect
            key={`storage-handle-${i}`}
            x={drawerX + drawerWidth/2 - 8}
            y={storageY + drawerHeight/2 - 1.5}
            width="16"
            height="3"
            fill="#4B5563"
            rx="1.5"
          />
        );
      }
    }

    // 🏷️ BED TYPE INDICATOR
    elements.push(
      <text
        key="bed-type-label"
        x={startX + drawWidth/2}
        y={startY - 35}
        textAnchor="middle"
        fontSize="12"
        fill="#374151"
        fontWeight="bold"
      >
        {getBedTypeName(bedType)} {hasStorage ? '• Storage Bed' : ''}
      </text>
    );

    return elements;
  };

  // 🧠 INTELLIGENT BED PROPORTIONS - AI-powered sizing
  const getBedProportions = (bedType: string, width: number, height: number, depth: number) => {
    const baseProps = {
      frameHeight: 150,    // Platform height in mm
      mattressHeight: 200, // Mattress thickness in mm  
      headboardHeight: 600, // Headboard height in mm
      footboardHeight: 200  // Footboard height in mm
    };

    // Adjust proportions based on bed type
    switch (bedType) {
      case 'single':
        return {
          ...baseProps,
          headboardHeight: 500,
          footboardHeight: 150
        };
      case 'queen':
        return {
          ...baseProps,
          frameHeight: 180,
          mattressHeight: 220,
          headboardHeight: 700
        };
      case 'king':
      case 'king_xl':
        return {
          ...baseProps,
          frameHeight: 200,
          mattressHeight: 250,
          headboardHeight: 800,
          footboardHeight: 250
        };
      case 'bunk':
        return {
          ...baseProps,
          frameHeight: 120,
          mattressHeight: 150,
          headboardHeight: 400,
          footboardHeight: 400
        };
      default:
        return baseProps;
    }
  };

  // 📝 INTELLIGENT BED TYPE NAMES
  const getBedTypeName = (bedType: string): string => {
    const names: Record<string, string> = {
      'single': 'Single Bed (90×190cm)',
      'queen': 'Queen Bed (150×200cm)', 
      'king': 'King Bed (180×200cm)',
      'king_xl': 'King XL Bed (200×220cm)',
      'bunk': 'Bunk Bed (90×190cm)'
    };
    return names[bedType] || 'Platform Bed';
  };

  const renderDimensions = () => {
    const elements: JSX.Element[] = [];

    // Width dimension (top)
    elements.push(
      <g key="width-dimension">
        <line
          x1={startX}
          y1={startY - 30}
          x2={startX + drawWidth}
          y2={startY - 30}
          stroke="#000"
          strokeWidth="1"
          markerEnd="url(#arrowhead)"
          markerStart="url(#arrowhead)"
        />
        <text
          x={startX + drawWidth / 2}
          y={startY - 35}
          textAnchor="middle"
          fontSize="12"
          fill="#000"
          fontWeight="bold"
        >
          {formatDimension(widthMM)}
        </text>
      </g>
    );

    // Height dimension (right)
    elements.push(
      <g key="height-dimension">
        <line
          x1={startX + drawWidth + 30}
          y1={startY}
          x2={startX + drawWidth + 30}
          y2={startY + drawHeight}
          stroke="#000"
          strokeWidth="1"
          markerEnd="url(#arrowhead)"
          markerStart="url(#arrowhead)"
        />
        <text
          x={startX + drawWidth + 35}
          y={startY + drawHeight / 2}
          textAnchor="start"
          fontSize="12"
          fill="#000"
          fontWeight="bold"
          transform={`rotate(90, ${startX + drawWidth + 35}, ${startY + drawHeight / 2})`}
        >
          {formatDimension(heightMM)}
        </text>
      </g>
    );

    // Depth dimension (bottom right corner)
    elements.push(
      <text
        key="depth-dimension"
        x={startX + drawWidth - 10}
        y={startY + drawHeight + 20}
        textAnchor="end"
        fontSize="10"
        fill="#666"
      >
        Depth: {formatDimension(depthMM)}
      </text>
    );

    return elements;
  };


  // 📚 REALISTIC BOOKSHELF - Based on library standards
  const renderBookshelf = () => {
    const elements: JSX.Element[] = [];
    const targetShelves = configuration.shelves || 5;

    // Main bookshelf frame
    elements.push(
      <rect
        key="bookshelf-frame"
        x={startX}
        y={startY}
        width={drawWidth}
        height={drawHeight}
        fill="none"
        stroke="#2D2D2D"
        strokeWidth="2"
      />
    );

    const internalWidth = drawWidth - 8;
    const internalHeight = drawHeight - 8;
    const internalStartX = startX + 4;
    const internalStartY = startY + 4;

    // Calculate optimal shelf spacing (9-12" industry standard)
    const optimalSpacing = Math.max(30, Math.min(40, internalHeight / (targetShelves + 1)));
    const actualShelves = Math.floor(internalHeight / optimalSpacing) - 1;
    const shelfSpacing = internalHeight / (actualShelves + 1);

    // Draw horizontal shelves
    for (let i = 0; i <= actualShelves; i++) {
      const shelfY = internalStartY + (i * shelfSpacing);
      elements.push(
        <line
          key={`shelf-${i}`}
          x1={internalStartX}
          y1={shelfY}
          x2={internalStartX + internalWidth}
          y2={shelfY}
          stroke="#495057"
          strokeWidth="2"
        />
      );

      // Add books on each shelf (except the first one which is the top)
      if (i > 0) {
        const bookCount = Math.floor(internalWidth / 15); // ~15px per book
        for (let j = 0; j < bookCount; j++) {
          const bookX = internalStartX + 10 + (j * 15);
          const bookHeight = Math.random() * 15 + 10; // Variable book heights
          elements.push(
            <rect
              key={`book-${i}-${j}`}
              x={bookX}
              y={shelfY - bookHeight}
              width="12"
              height={bookHeight}
              fill={`hsl(${Math.random() * 360}, 60%, 70%)`}
              stroke="#495057"
              strokeWidth="0.5"
            />
          );
        }
      }
    }

    // Add depth indicator
    elements.push(
      <text
        key="bookshelf-info"
        x={internalStartX + internalWidth / 2}
        y={internalStartY + 20}
        textAnchor="middle"
        fontSize="10"
        fill="#6C757D"
      >
        {actualShelves + 1} Shelves • {formatDimension(depthMM)} Deep
      </text>
    );

    return elements;
  };

  // 🏠 INTELLIGENT KITCHEN RENDERING - AI-powered kitchen layout design
  const renderCabinet = () => {
    const elements: JSX.Element[] = [];
    const kitchenLayout = configuration.kitchenLayout || 'straight';
    const baseCabinets = configuration.baseCabinets || 3;
    const wallCabinets = configuration.wallCabinets || 2;
    const tallCabinets = configuration.tallCabinets || 1;
    const hasIsland = configuration.island === true;
    const hasCornerUnit = configuration.cornerUnit === true;

    // 🎯 INTELLIGENT LAYOUT RENDERING - Based on kitchen layout type
    switch (kitchenLayout.toLowerCase()) {
      case 'l_shaped':
        return renderLShapedKitchen(elements, { baseCabinets, wallCabinets, tallCabinets, hasCornerUnit });
      case 'u_shaped':
        return renderUShapedKitchen(elements, { baseCabinets, wallCabinets, tallCabinets, hasCornerUnit });
      case 'galley':
        return renderGalleyKitchen(elements, { baseCabinets, wallCabinets, tallCabinets });
      case 'island':
        return renderIslandKitchen(elements, { baseCabinets, wallCabinets, tallCabinets, hasIsland });
      default:
        return renderStraightKitchen(elements, { baseCabinets, wallCabinets, tallCabinets });
    }
  };

  // 📏 STRAIGHT KITCHEN LAYOUT - Single wall design
  const renderStraightKitchen = (elements: JSX.Element[], config: any) => {
    const { baseCabinets, wallCabinets, tallCabinets } = config;
    
    // Countertop (main surface)
    const countertopHeight = 20;
    const countertopY = startY + drawHeight * 0.6;
    
    elements.push(
      <rect
        key="countertop"
        x={startX}
        y={countertopY}
        width={drawWidth}
        height={countertopHeight}
        fill="#E5E5E5"
        stroke="#BBBBB"
        strokeWidth="2"
        rx="4"
      />
    );

    // Base cabinets (below countertop)
    const baseCabinetHeight = drawHeight * 0.35;
    const baseCabinetY = countertopY + countertopHeight;
    const baseCabinetWidth = drawWidth / baseCabinets;
    
    for (let i = 0; i < baseCabinets; i++) {
      const cabinetX = startX + (i * baseCabinetWidth);
      
      elements.push(
        <rect
          key={`base-cabinet-${i}`}
          x={cabinetX}
          y={baseCabinetY}
          width={baseCabinetWidth - 2}
          height={baseCabinetHeight}
          fill="#8B4513"
          stroke="#654321"
          strokeWidth="1.5"
          rx="2"
        />
      );
      
      // Cabinet door with handle
      elements.push(
        <rect
          key={`base-door-${i}`}
          x={cabinetX + 4}
          y={baseCabinetY + 4}
          width={baseCabinetWidth - 10}
          height={baseCabinetHeight - 8}
          fill="#A0522D"
          stroke="#654321"
          strokeWidth="1"
          rx="3"
        />
      );
      
      // Handle
      elements.push(
        <rect
          key={`base-handle-${i}`}
          x={cabinetX + baseCabinetWidth - 12}
          y={baseCabinetY + baseCabinetHeight/2 - 6}
          width="2"
          height="12"
          fill="#2C2C2C"
          rx="1"
        />
      );
    }

    // Wall cabinets (above countertop)
    const wallCabinetHeight = drawHeight * 0.25;
    const wallCabinetY = startY + 10;
    const wallCabinetWidth = drawWidth / wallCabinets;
    
    for (let i = 0; i < wallCabinets; i++) {
      const cabinetX = startX + (i * wallCabinetWidth);
      
      elements.push(
        <rect
          key={`wall-cabinet-${i}`}
          x={cabinetX}
          y={wallCabinetY}
          width={wallCabinetWidth - 2}
          height={wallCabinetHeight}
          fill="#8B4513"
          stroke="#654321"
          strokeWidth="1.5"
          rx="2"
        />
      );
      
      // Glass door effect for upper cabinets
      elements.push(
        <rect
          key={`wall-door-${i}`}
          x={cabinetX + 4}
          y={wallCabinetY + 4}
          width={wallCabinetWidth - 10}
          height={wallCabinetHeight - 8}
          fill="#F0F8FF"
          stroke="#B0C4DE"
          strokeWidth="1"
          strokeOpacity="0.7"
          fillOpacity="0.3"
          rx="3"
        />
      );
      
      // Handle
      elements.push(
        <circle
          key={`wall-handle-${i}`}
          cx={cabinetX + wallCabinetWidth - 10}
          cy={wallCabinetY + wallCabinetHeight - 15}
          r="3"
          fill="#2C2C2C"
        />
      );
    }

    // Appliances indicators
    renderKitchenAppliances(elements, 'straight');

    return elements;
  };

  // 🔄 L-SHAPED KITCHEN LAYOUT  
  const renderLShapedKitchen = (elements: JSX.Element[], config: any) => {
    const { baseCabinets, wallCabinets, hasCornerUnit } = config;
    
    // Horizontal section (60% of width)
    const horizontalWidth = drawWidth * 0.6;
    const verticalHeight = drawHeight * 0.6;
    
    // Horizontal countertop
    const countertopHeight = 15;
    const hCountertopY = startY + verticalHeight - countertopHeight;
    
    elements.push(
      <rect
        key="h-countertop"
        x={startX}
        y={hCountertopY}
        width={horizontalWidth}
        height={countertopHeight}
        fill="#E5E5E5"
        stroke="#BBBBBB"
        strokeWidth="2"
        rx="4"
      />
    );

    // Vertical countertop  
    const vCountertopX = startX + horizontalWidth - countertopHeight;
    
    elements.push(
      <rect
        key="v-countertop"
        x={vCountertopX}
        y={startY + 10}
        width={countertopHeight}
        height={verticalHeight - countertopHeight}
        fill="#E5E5E5"
        stroke="#BBBBBB"
        strokeWidth="2"
        rx="4"
      />
    );

    // Base cabinets along horizontal
    const hCabinetCount = Math.floor(baseCabinets * 0.7);
    const hCabinetWidth = horizontalWidth / hCabinetCount;
    const baseCabinetHeight = (drawHeight - verticalHeight) * 0.8;
    
    for (let i = 0; i < hCabinetCount; i++) {
      const cabinetX = startX + (i * hCabinetWidth);
      const cabinetY = hCountertopY + countertopHeight;
      
      elements.push(
        <rect
          key={`h-base-${i}`}
          x={cabinetX}
          y={cabinetY}
          width={hCabinetWidth - 2}
          height={baseCabinetHeight}
          fill="#8B4513"
          stroke="#654321"
          strokeWidth="1.5"
          rx="2"
        />
      );
    }

    // Base cabinets along vertical
    const vCabinetCount = Math.ceil(baseCabinets * 0.3);
    const vCabinetHeight = (verticalHeight - countertopHeight) / vCabinetCount;
    
    for (let i = 0; i < vCabinetCount; i++) {
      const cabinetY = startY + 10 + (i * vCabinetHeight);
      const cabinetX = vCountertopX + countertopHeight;
      
      elements.push(
        <rect
          key={`v-base-${i}`}
          x={cabinetX}
          y={cabinetY}
          width={drawWidth - (vCountertopX + countertopHeight - startX)}
          height={vCabinetHeight - 2}
          fill="#8B4513"
          stroke="#654321"
          strokeWidth="1.5"
          rx="2"
        />
      );
    }

    // Corner unit (if specified)
    if (hasCornerUnit) {
      elements.push(
        <circle
          key="corner-unit"
          cx={vCountertopX + countertopHeight/2}
          cy={hCountertopY + countertopHeight/2}
          r="12"
          fill="#654321"
          stroke="#4A3018"
          strokeWidth="2"
        />
      );
      
      elements.push(
        <text
          key="corner-label"
          x={vCountertopX + countertopHeight/2}
          y={hCountertopY - 15}
          textAnchor="middle"
          fontSize="8"
          fill="#333"
          fontWeight="bold"
        >
          Lazy Susan
        </text>
      );
    }

    // Wall cabinets
    const wallCabinetHeight = 40;
    for (let i = 0; i < Math.min(wallCabinets, 3); i++) {
      const cabinetWidth = horizontalWidth / 3;
      elements.push(
        <rect
          key={`l-wall-${i}`}
          x={startX + (i * cabinetWidth)}
          y={startY + 5}
          width={cabinetWidth - 2}
          height={wallCabinetHeight}
          fill="#A0522D"
          stroke="#654321"
          strokeWidth="1.5"
          rx="2"
        />
      );
    }

    return elements;
  };

  // 🅿️ U-SHAPED KITCHEN LAYOUT
  const renderUShapedKitchen = (elements: JSX.Element[], config: any) => {
    const { baseCabinets, wallCabinets } = config;
    
    const sideWidth = drawWidth * 0.25;
    const centerWidth = drawWidth * 0.5;
    const countertopHeight = 15;
    const midY = startY + drawHeight * 0.5;
    
    // Bottom horizontal section
    elements.push(
      <rect
        key="bottom-counter"
        x={startX}
        y={midY}
        width={drawWidth}
        height={countertopHeight}
        fill="#E5E5E5"
        stroke="#BBBBBB"
        strokeWidth="2"
        rx="4"
      />
    );
    
    // Left vertical section
    elements.push(
      <rect
        key="left-counter"
        x={startX}
        y={startY + 20}
        width={countertopHeight}
        height={midY - startY - 20}
        fill="#E5E5E5"
        stroke="#BBBBBB"
        strokeWidth="2"
        rx="4"
      />
    );
    
    // Right vertical section
    elements.push(
      <rect
        key="right-counter"
        x={startX + drawWidth - countertopHeight}
        y={startY + 20}
        width={countertopHeight}
        height={midY - startY - 20}
        fill="#E5E5E5"
        stroke="#BBBBBB"
        strokeWidth="2"
        rx="4"
      />
    );

    // Base cabinets for all three sections
    const cabinetHeight = (drawHeight - midY) * 0.7;
    const numCabinets = Math.min(baseCabinets, 8);
    
    // Bottom cabinets
    for (let i = 0; i < Math.floor(numCabinets * 0.6); i++) {
      const cabinetWidth = drawWidth / Math.floor(numCabinets * 0.6);
      elements.push(
        <rect
          key={`u-bottom-${i}`}
          x={startX + (i * cabinetWidth)}
          y={midY + countertopHeight}
          width={cabinetWidth - 2}
          height={cabinetHeight}
          fill="#8B4513"
          stroke="#654321"
          strokeWidth="1.5"
          rx="2"
        />
      );
    }
    
    // Wall cabinets (top)
    for (let i = 0; i < Math.min(wallCabinets, 4); i++) {
      const cabinetWidth = centerWidth / Math.min(wallCabinets, 4);
      elements.push(
        <rect
          key={`u-wall-${i}`}
          x={startX + sideWidth + (i * cabinetWidth)}
          y={startY + 5}
          width={cabinetWidth - 2}
          height={35}
          fill="#A0522D"
          stroke="#654321"
          strokeWidth="1.5"
          rx="2"
        />
      );
    }

    return elements;
  };

  // 🚢 GALLEY KITCHEN LAYOUT
  const renderGalleyKitchen = (elements: JSX.Element[], config: any) => {
    const { baseCabinets, wallCabinets } = config;
    
    const walkwayWidth = drawHeight * 0.3;
    const counterHeight = 15;
    const topCounterY = startY + 20;
    const bottomCounterY = startY + drawHeight - 60;
    
    // Top countertop
    elements.push(
      <rect
        key="top-counter"
        x={startX}
        y={topCounterY}
        width={drawWidth}
        height={counterHeight}
        fill="#E5E5E5"
        stroke="#BBBBBB"
        strokeWidth="2"
        rx="4"
      />
    );
    
    // Bottom countertop
    elements.push(
      <rect
        key="bottom-counter"
        x={startX}
        y={bottomCounterY}
        width={drawWidth}
        height={counterHeight}
        fill="#E5E5E5"
        stroke="#BBBBBB"
        strokeWidth="2"
        rx="4"
      />
    );

    // Top base cabinets
    const topCabinets = Math.ceil(baseCabinets / 2);
    for (let i = 0; i < topCabinets; i++) {
      const cabinetWidth = drawWidth / topCabinets;
      elements.push(
        <rect
          key={`galley-top-${i}`}
          x={startX + (i * cabinetWidth)}
          y={topCounterY + counterHeight}
          width={cabinetWidth - 2}
          height={40}
          fill="#8B4513"
          stroke="#654321"
          strokeWidth="1.5"
          rx="2"
        />
      );
    }
    
    // Bottom base cabinets
    const bottomCabinets = Math.floor(baseCabinets / 2);
    for (let i = 0; i < bottomCabinets; i++) {
      const cabinetWidth = drawWidth / bottomCabinets;
      elements.push(
        <rect
          key={`galley-bottom-${i}`}
          x={startX + (i * cabinetWidth)}
          y={startY + drawHeight - 40}
          width={cabinetWidth - 2}
          height={35}
          fill="#8B4513"
          stroke="#654321"
          strokeWidth="1.5"
          rx="2"
        />
      );
    }

    // Walkway indication
    elements.push(
      <rect
        key="walkway"
        x={startX + 20}
        y={topCounterY + counterHeight + 45}
        width={drawWidth - 40}
        height={walkwayWidth}
        fill="none"
        stroke="#CCC"
        strokeWidth="1"
        strokeDasharray="5,5"
        rx="8"
      />
    );
    
    elements.push(
      <text
        key="walkway-label"
        x={startX + drawWidth/2}
        y={topCounterY + counterHeight + 65}
        textAnchor="middle"
        fontSize="10"
        fill="#666"
        fontStyle="italic"
      >
        Walkway
      </text>
    );

    return elements;
  };

  // 🏝️ ISLAND KITCHEN LAYOUT  
  const renderIslandKitchen = (elements: JSX.Element[], config: any) => {
    const { baseCabinets, hasIsland } = config;
    
    // Main perimeter counters (L-shaped base)
    elements.push(
      ...renderStraightKitchen([], { baseCabinets: Math.floor(baseCabinets * 0.6), wallCabinets: 2, tallCabinets: 1 })
    );
    
    // Island in center (if specified)
    if (hasIsland) {
      const islandWidth = drawWidth * 0.4;
      const islandHeight = drawHeight * 0.2;
      const islandX = startX + (drawWidth - islandWidth) / 2;
      const islandY = startY + (drawHeight - islandHeight) / 2;
      
      // Island countertop
      elements.push(
        <rect
          key="island-counter"
          x={islandX}
          y={islandY}
          width={islandWidth}
          height={15}
          fill="#D3D3D3"
          stroke="#A9A9A9"
          strokeWidth="2"
          rx="8"
        />
      );
      
      // Island base
      elements.push(
        <rect
          key="island-base"
          x={islandX}
          y={islandY + 15}
          width={islandWidth}
          height={islandHeight - 15}
          fill="#8B4513"
          stroke="#654321"
          strokeWidth="2"
          rx="4"
        />
      );
      
      // Island seating area (overhang)
      elements.push(
        <rect
          key="island-overhang"
          x={islandX - 10}
          y={islandY}
          width={islandWidth + 20}
          height={8}
          fill="#E5E5E5"
          stroke="#BBBBBB"
          strokeWidth="1"
          rx="4"
          opacity="0.7"
        />
      );
      
      elements.push(
        <text
          key="island-label"
          x={islandX + islandWidth/2}
          y={islandY - 10}
          textAnchor="middle"
          fontSize="10"
          fill="#333"
          fontWeight="bold"
        >
          Kitchen Island
        </text>
      );
    }

    return elements;
  };

  // 🏠 KITCHEN APPLIANCES - Smart appliance placement
  const renderKitchenAppliances = (elements: JSX.Element[], layout: string) => {
    const appliances = ['Sink', 'Stove', 'Fridge'];
    const spacing = drawWidth / appliances.length;
    
    appliances.forEach((appliance, i) => {
      const applianceX = startX + (i * spacing) + spacing/2;
      const applianceY = startY + drawHeight * 0.7;
      
      // Appliance icon
      elements.push(
        <circle
          key={`appliance-${i}`}
          cx={applianceX}
          cy={applianceY}
          r="8"
          fill={appliance === 'Stove' ? '#FF6B6B' : appliance === 'Fridge' ? '#4ECDC4' : '#45B7D1'}
          stroke="#333"
          strokeWidth="1"
        />
      );
      
      // Appliance label
      elements.push(
        <text
          key={`appliance-label-${i}`}
          x={applianceX}
          y={applianceY + 20}
          textAnchor="middle"
          fontSize="8"
          fill="#333"
        >
          {appliance}
        </text>
      );
    });
  };

  // 📦 REALISTIC STORAGE UNIT - Modular storage design
  const renderStorageUnit = () => {
    const elements: JSX.Element[] = [];
    const shelves = configuration.shelves || 4;
    const drawers = configuration.drawers || 2;

    // Main storage frame
    elements.push(
      <rect
        key="storage-frame"
        x={startX}
        y={startY}
        width={drawWidth}
        height={drawHeight}
        fill="none"
        stroke="#2D2D2D"
        strokeWidth="2"
      />
    );

    const internalWidth = drawWidth - 6;
    const internalHeight = drawHeight - 6;
    const internalStartX = startX + 3;
    const internalStartY = startY + 3;

    // Divide into compartments
    const leftWidth = internalWidth * 0.6; // 60% for shelving
    const rightWidth = internalWidth * 0.4; // 40% for drawers/cubbies

    // Left section: Open shelves
    const actualShelves = Math.min(shelves, 5);
    const shelfSpacing = internalHeight / (actualShelves + 1);
    
    for (let i = 0; i < actualShelves; i++) {
      const shelfY = internalStartY + ((i + 1) * shelfSpacing);
      elements.push(
        <line
          key={`storage-shelf-${i}`}
          x1={internalStartX + 5}
          y1={shelfY}
          x2={internalStartX + leftWidth - 5}
          y2={shelfY}
          stroke="#495057"
          strokeWidth="2"
        />
      );
    }

    // Vertical divider
    elements.push(
      <line
        key="storage-divider"
        x1={internalStartX + leftWidth}
        y1={internalStartY}
        x2={internalStartX + leftWidth}
        y2={internalStartY + internalHeight}
        stroke="#495057"
        strokeWidth="2"
      />
    );

    // Right section: Drawers and cubbies
    const rightStartX = internalStartX + leftWidth;
    const actualDrawers = Math.min(drawers, 4);
    const drawerHeight = internalHeight / actualDrawers;

    for (let i = 0; i < actualDrawers; i++) {
      const drawerY = internalStartY + (i * drawerHeight);
      
      elements.push(
        <rect
          key={`storage-drawer-${i}`}
          x={rightStartX + 5}
          y={drawerY + 5}
          width={rightWidth - 10}
          height={drawerHeight - 10}
          fill="#F8F9FA"
          stroke="#6C757D"
          strokeWidth="1"
          rx="2"
        />
      );
      
      // Handle
      elements.push(
        <rect
          key={`storage-handle-${i}`}
          x={rightStartX + rightWidth - 15}
          y={drawerY + drawerHeight / 2 - 2}
          width="8"
          height="4"
          fill="#495057"
          rx="2"
        />
      );
    }

    // Labels
    elements.push(
      <text
        key="storage-label-left"
        x={internalStartX + leftWidth / 2}
        y={internalStartY + 15}
        textAnchor="middle"
        fontSize="9"
        fill="#6C757D"
      >
        OPEN SHELVES
      </text>
    );

    elements.push(
      <text
        key="storage-label-right"
        x={rightStartX + rightWidth / 2}
        y={internalStartY + 15}
        textAnchor="middle"
        fontSize="9"
        fill="#6C757D"
      >
        STORAGE BINS
      </text>
    );

    return elements;
  };

  const renderFurniture = () => {
    switch (furnitureType.toLowerCase()) {
      case 'wardrobe':
        return renderWardrobe();
      case 'bookshelf':
        return renderBookshelf();
      case 'storage_unit':
        return renderStorageUnit();
      case 'bed':
        return renderBed();
      case 'cabinet':
      case 'kitchen_cabinet':
        return renderCabinet();
      default:
        return renderCabinet(); // Safe fallback
    }
  };

  return (
    <div className="w-full bg-white rounded-lg border p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 capitalize">
          {furnitureType} Technical Drawing
        </h3>
        <p className="text-sm text-gray-600">
          Front view with dimensions and internal layout
        </p>
      </div>
      
      <div className="flex justify-center">
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="border border-gray-200"
          data-testid="furniture-technical-drawing"
        >
          {/* Define arrow markers for dimensions */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#000"
              />
            </marker>
          </defs>

          {/* Render the furniture */}
          {renderFurniture()}
          
          {/* Render dimensions */}
          {renderDimensions()}
        </svg>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <h4 className="font-medium text-gray-700 mb-1">Specifications:</h4>
          <p>Shelves: {configuration.shelves || 0}</p>
          <p>Drawers: {configuration.drawers || 0}</p>
          <p>Doors: {configuration.shutters || configuration.doors || 0}</p>
        </div>
        <div>
          <h4 className="font-medium text-gray-700 mb-1">Dimensions:</h4>
          <p>W: {formatDimension(widthMM)}</p>
          <p>H: {formatDimension(heightMM)}</p>
          <p>D: {formatDimension(depthMM)}</p>
        </div>
      </div>
    </div>
  );
};

export default FurnitureTechnicalDrawing;