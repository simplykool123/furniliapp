import React from "react";
import type { FurnitureSpec } from "@/types/furnitureSpec";

interface CabinetSVGProps {
  spec: FurnitureSpec;
  showDimensions?: boolean;
  className?: string;
}

const CabinetSVG: React.FC<CabinetSVGProps> = ({ spec, showDimensions = true, className = "" }) => {
  const { width, height, depth, options = {} } = spec;
  
  const shelves = options.shelves || 2;
  const drawers = options.drawers || 1;
  const doors = options.doors || 2;
  const exposedSides = options.exposedSides || false;
  
  const scale = Math.min(300 / width, 250 / height);
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  const scaledDepth = depth * scale * 0.5;
  
  const svgWidth = 400;
  const svgHeight = 300;
  const offsetX = (svgWidth - scaledWidth - scaledDepth) / 2;
  const offsetY = (svgHeight - scaledHeight) / 2;
  
  return (
    <div className={`bg-white border rounded-lg p-4 ${className}`}>
      <div className="text-center mb-2">
        <h3 className="text-sm font-semibold text-gray-800">Cabinet Technical Drawing</h3>
        <p className="text-xs text-gray-600">
          {width}mm × {height}mm × {depth}mm
        </p>
      </div>
      
      <svg width={svgWidth} height={svgHeight} className="border border-gray-200">
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
        
        {/* Shelves */}
        {Array.from({ length: shelves }).map((_, i) => {
          const shelfSpacing = scaledHeight / (shelves + 1);
          const shelfY = offsetY + scaledDepth + (i + 1) * shelfSpacing;
          
          // Don't draw shelves where drawers are
          if (drawers > 0 && shelfY > offsetY + scaledDepth + scaledHeight - (drawers * 50)) {
            return null;
          }
          
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
        
        {/* Drawers (bottom section) */}
        {Array.from({ length: drawers }).map((_, i) => {
          const drawerHeight = 45;
          const drawerY = offsetY + scaledDepth + scaledHeight - ((drawers - i) * drawerHeight);
          
          return (
            <g key={`drawer-${i}`}>
              <rect
                x={offsetX + 5}
                y={drawerY}
                width={scaledWidth - 10}
                height={drawerHeight - 5}
                fill="#f5f5f5"
                stroke="#333"
                strokeWidth="1"
              />
              <circle
                cx={offsetX + scaledWidth - 20}
                cy={drawerY + drawerHeight/2}
                r="3"
                fill="#666"
              />
              <text 
                x={offsetX + 15} 
                y={drawerY + drawerHeight/2 + 3} 
                fontSize="8" 
                fill="#666"
              >
                Drawer {i + 1}
              </text>
            </g>
          );
        })}
        
        {/* Door divisions */}
        {doors > 1 && Array.from({ length: doors - 1 }).map((_, i) => (
          <line
            key={`door-div-${i}`}
            x1={offsetX + ((i + 1) * scaledWidth) / doors}
            y1={offsetY + scaledDepth}
            x2={offsetX + ((i + 1) * scaledWidth) / doors}
            y2={offsetY + scaledDepth + scaledHeight}
            stroke="#333"
            strokeWidth="1"
            strokeDasharray="8,4"
          />
        ))}
        
        {/* Door handles */}
        {Array.from({ length: doors }).map((_, i) => {
          const handleX = offsetX + (i * scaledWidth) / doors + (scaledWidth / doors) * 0.8;
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
        
        {/* Exposed sides indicator */}
        {exposedSides && (
          <g>
            <rect 
              x={offsetX - 2} 
              y={offsetY + scaledDepth - 2} 
              width={4} 
              height={scaledHeight + 4} 
              fill="#ff6b35" 
              opacity="0.7"
            />
            <rect 
              x={offsetX + scaledWidth - 2} 
              y={offsetY + scaledDepth - 2} 
              width={4} 
              height={scaledHeight + 4} 
              fill="#ff6b35" 
              opacity="0.7"
            />
            <text 
              x={offsetX + scaledWidth/2} 
              y={offsetY + 15} 
              textAnchor="middle" 
              fontSize="8" 
              fill="#ff6b35"
              fontWeight="bold"
            >
              EXPOSED SIDES
            </text>
          </g>
        )}
        
        {/* Dimensions */}
        {showDimensions && (
          <g fontSize="10" fill="#666">
            <line x1={offsetX} y1={offsetY + scaledHeight + scaledDepth + 20} x2={offsetX + scaledWidth} y2={offsetY + scaledHeight + scaledDepth + 20} stroke="#666" strokeWidth="1" />
            <text x={offsetX + scaledWidth / 2} y={offsetY + scaledHeight + scaledDepth + 35} textAnchor="middle">{width}mm</text>
            
            <line x1={offsetX - 20} y1={offsetY + scaledDepth} x2={offsetX - 20} y2={offsetY + scaledDepth + scaledHeight} stroke="#666" strokeWidth="1" />
            <text x={offsetX - 35} y={offsetY + scaledDepth + scaledHeight / 2} textAnchor="middle" transform={`rotate(-90, ${offsetX - 35}, ${offsetY + scaledDepth + scaledHeight / 2})`}>{height}mm</text>
          </g>
        )}
        
        {/* Specifications */}
        <g fontSize="9" fill="#555">
          <text x={offsetX} y={svgHeight - 40}>• Doors: {doors}</text>
          <text x={offsetX} y={svgHeight - 25}>• Shelves: {shelves}</text>
          <text x={offsetX} y={svgHeight - 10}>• Drawers: {drawers}</text>
          <text x={offsetX + 120} y={svgHeight - 40}>• Exposed Sides: {exposedSides ? 'Yes' : 'No'}</text>
        </g>
      </svg>
    </div>
  );
};

export default CabinetSVG;