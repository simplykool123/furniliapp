import React from "react";
import type { FurnitureSpec } from "@/types/furnitureSpec";

interface WardrobeSVGProps {
  spec: FurnitureSpec;
  showDimensions?: boolean;
  className?: string;
}

const WardrobeSVG: React.FC<WardrobeSVGProps> = ({ spec, showDimensions = true, className = "" }) => {
  const { width, height, depth, options = {} } = spec;
  
  // Configuration
  const drawers = options.drawers || 0;
  const shelves = options.shelves || 3;
  const loft = options.loft || false;
  const loftHeight = options.loftHeight || 400;
  const shutters = options.shutters || 2;
  const hangingRods = options.hangingRods || 1;
  const mirror = options.mirror || false;
  
  // Drawing calculations (scaled for display)
  const scale = Math.min(400 / width, 300 / height);
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  const scaledDepth = depth * scale * 0.6; // 3D perspective
  
  // Layout calculations
  const drawerHeight = 200; // mm
  const shelfSpacing = 350; // mm
  const hangingSpaceHeight = 1100; // mm
  
  // Calculate sections
  const drawerSectionHeight = drawers * drawerHeight;
  const loftSectionHeight = loft ? loftHeight : 0;
  const availableHeight = height - drawerSectionHeight - loftSectionHeight;
  const actualShelves = Math.max(1, Math.floor(availableHeight / shelfSpacing));
  const adjustedShelfSpacing = availableHeight / actualShelves;
  
  // SVG dimensions
  const svgWidth = 500;
  const svgHeight = 400;
  const offsetX = (svgWidth - scaledWidth - scaledDepth) / 2;
  const offsetY = (svgHeight - scaledHeight) / 2;
  
  return (
    <div className={`bg-white border rounded-lg p-4 ${className}`}>
      <div className="text-center mb-2">
        <h3 className="text-sm font-semibold text-gray-800">Wardrobe Technical Drawing</h3>
        <p className="text-xs text-gray-600">
          {width}mm × {height}mm × {depth}mm
        </p>
      </div>
      
      <svg width={svgWidth} height={svgHeight} className="border border-gray-200">
        {/* Background */}
        <rect width={svgWidth} height={svgHeight} fill="#fafafa" />
        
        {/* 3D Perspective - Back face */}
        <rect 
          x={offsetX + scaledDepth} 
          y={offsetY} 
          width={scaledWidth} 
          height={scaledHeight} 
          fill="#f0f0f0" 
          stroke="#333" 
          strokeWidth="1"
        />
        
        {/* 3D Perspective - Side face */}
        <polygon
          points={`${offsetX + scaledWidth + scaledDepth},${offsetY} ${offsetX + scaledWidth},${offsetY + scaledDepth} ${offsetX + scaledWidth},${offsetY + scaledHeight + scaledDepth} ${offsetX + scaledWidth + scaledDepth},${offsetY + scaledHeight}`}
          fill="#e0e0e0"
          stroke="#333"
          strokeWidth="1"
        />
        
        {/* Main front face */}
        <rect 
          x={offsetX} 
          y={offsetY + scaledDepth} 
          width={scaledWidth} 
          height={scaledHeight} 
          fill="white" 
          stroke="#333" 
          strokeWidth="2"
        />
        
        {/* Loft section */}
        {loft && (
          <>
            <rect 
              x={offsetX} 
              y={offsetY + scaledDepth} 
              width={scaledWidth} 
              height={loftSectionHeight * scale} 
              fill="#fff8dc" 
              stroke="#666" 
              strokeWidth="1"
              strokeDasharray="3,2"
            />
            <text 
              x={offsetX + scaledWidth / 2} 
              y={offsetY + scaledDepth + (loftSectionHeight * scale) / 2} 
              textAnchor="middle" 
              fontSize="10" 
              fill="#666"
            >
              LOFT
            </text>
          </>
        )}
        
        {/* Hanging section with rods */}
        {hangingRods > 0 && (
          <>
            {/* Hanging space */}
            <rect 
              x={offsetX} 
              y={offsetY + scaledDepth + (loftSectionHeight * scale)} 
              width={scaledWidth} 
              height={Math.min(hangingSpaceHeight * scale, scaledHeight - (drawerSectionHeight * scale) - (loftSectionHeight * scale))} 
              fill="#f8f9fa" 
              stroke="#999" 
              strokeWidth="1"
              strokeDasharray="5,3"
            />
            
            {/* Hanging rods */}
            {Array.from({ length: hangingRods }).map((_, i) => {
              const rodY = offsetY + scaledDepth + (loftSectionHeight * scale) + 50 + (i * 80);
              return (
                <g key={i}>
                  <line
                    x1={offsetX + 20}
                    y1={rodY}
                    x2={offsetX + scaledWidth - 20}
                    y2={rodY}
                    stroke="#444"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <text 
                    x={offsetX + scaledWidth - 15} 
                    y={rodY - 5} 
                    fontSize="8" 
                    fill="#666"
                  >
                    Rod {i + 1}
                  </text>
                </g>
              );
            })}
          </>
        )}
        
        {/* Shelves */}
        {Array.from({ length: actualShelves }).map((_, i) => {
          const shelfY = offsetY + scaledDepth + (loftSectionHeight * scale) + (i * adjustedShelfSpacing * scale);
          const isInHangingArea = shelfY < offsetY + scaledDepth + (loftSectionHeight * scale) + (hangingSpaceHeight * scale);
          
          if (isInHangingArea && hangingRods > 0) return null; // Skip shelves in hanging area
          
          return (
            <line
              key={`shelf-${i}`}
              x1={offsetX}
              y1={shelfY}
              x2={offsetX + scaledWidth}
              y2={shelfY}
              stroke="#666"
              strokeWidth="1.5"
            />
          );
        })}
        
        {/* Drawer section */}
        {drawers > 0 && (
          <g>
            <rect 
              x={offsetX} 
              y={offsetY + scaledDepth + scaledHeight - (drawerSectionHeight * scale)} 
              width={scaledWidth} 
              height={drawerSectionHeight * scale} 
              fill="#f5f5f5" 
              stroke="#999" 
              strokeWidth="1"
            />
            
            {/* Individual drawers */}
            {Array.from({ length: drawers }).map((_, i) => {
              const drawerY = offsetY + scaledDepth + scaledHeight - ((drawers - i) * drawerHeight * scale);
              return (
                <g key={`drawer-${i}`}>
                  <rect
                    x={offsetX + 5}
                    y={drawerY}
                    width={scaledWidth - 10}
                    height={drawerHeight * scale - 2}
                    fill="white"
                    stroke="#333"
                    strokeWidth="1"
                  />
                  <circle
                    cx={offsetX + scaledWidth - 20}
                    cy={drawerY + (drawerHeight * scale) / 2}
                    r="3"
                    fill="#666"
                  />
                  <text 
                    x={offsetX + 15} 
                    y={drawerY + (drawerHeight * scale) / 2 + 3} 
                    fontSize="8" 
                    fill="#666"
                  >
                    Drawer {i + 1}
                  </text>
                </g>
              );
            })}
          </g>
        )}
        
        {/* Shutter divisions */}
        {Array.from({ length: shutters - 1 }).map((_, i) => (
          <line
            key={`shutter-${i}`}
            x1={offsetX + ((i + 1) * scaledWidth) / shutters}
            y1={offsetY + scaledDepth}
            x2={offsetX + ((i + 1) * scaledWidth) / shutters}
            y2={offsetY + scaledDepth + scaledHeight}
            stroke="#333"
            strokeWidth="1"
            strokeDasharray="8,4"
          />
        ))}
        
        {/* Shutter handles */}
        {Array.from({ length: shutters }).map((_, i) => {
          const handleX = offsetX + (i * scaledWidth) / shutters + (scaledWidth / shutters) * 0.8;
          const handleY = offsetY + scaledDepth + scaledHeight / 2;
          return (
            <circle
              key={`handle-${i}`}
              cx={handleX}
              cy={handleY}
              r="4"
              fill="#444"
              stroke="#222"
              strokeWidth="1"
            />
          );
        })}
        
        {/* Mirror indication */}
        {mirror && (
          <g>
            <rect 
              x={offsetX + 5} 
              y={offsetY + scaledDepth + 5} 
              width={scaledWidth / shutters - 10} 
              height={scaledHeight - 10} 
              fill="none" 
              stroke="#0066cc" 
              strokeWidth="2"
              strokeDasharray="10,5"
            />
            <text 
              x={offsetX + (scaledWidth / shutters) / 2} 
              y={offsetY + scaledDepth + 25} 
              textAnchor="middle" 
              fontSize="9" 
              fill="#0066cc"
              fontWeight="bold"
            >
              MIRROR
            </text>
          </g>
        )}
        
        {/* Dimensions */}
        {showDimensions && (
          <g fontSize="10" fill="#666">
            {/* Width dimension */}
            <line x1={offsetX} y1={offsetY + scaledHeight + scaledDepth + 20} x2={offsetX + scaledWidth} y2={offsetY + scaledHeight + scaledDepth + 20} stroke="#666" strokeWidth="1" />
            <text x={offsetX + scaledWidth / 2} y={offsetY + scaledHeight + scaledDepth + 35} textAnchor="middle">{width}mm</text>
            
            {/* Height dimension */}
            <line x1={offsetX - 20} y1={offsetY + scaledDepth} x2={offsetX - 20} y2={offsetY + scaledDepth + scaledHeight} stroke="#666" strokeWidth="1" />
            <text x={offsetX - 35} y={offsetY + scaledDepth + scaledHeight / 2} textAnchor="middle" transform={`rotate(-90, ${offsetX - 35}, ${offsetY + scaledDepth + scaledHeight / 2})`}>{height}mm</text>
            
            {/* Depth dimension */}
            <line x1={offsetX + scaledWidth + 10} y1={offsetY} x2={offsetX + scaledWidth + 10} y2={offsetY + scaledDepth} stroke="#666" strokeWidth="1" />
            <text x={offsetX + scaledWidth + 25} y={offsetY + scaledDepth / 2} textAnchor="middle">{depth}mm</text>
          </g>
        )}
        
        {/* Specification labels */}
        <g fontSize="9" fill="#555">
          <text x={offsetX} y={svgHeight - 60}>• Shutters: {shutters}</text>
          <text x={offsetX} y={svgHeight - 45}>• Shelves: {actualShelves}</text>
          <text x={offsetX} y={svgHeight - 30}>• Drawers: {drawers}</text>
          <text x={offsetX + 120} y={svgHeight - 60}>• Hanging Rods: {hangingRods}</text>
          <text x={offsetX + 120} y={svgHeight - 45}>• Loft: {loft ? 'Yes' : 'No'}</text>
          <text x={offsetX + 120} y={svgHeight - 30}>• Mirror: {mirror ? 'Yes' : 'No'}</text>
        </g>
      </svg>
    </div>
  );
};

export default WardrobeSVG;