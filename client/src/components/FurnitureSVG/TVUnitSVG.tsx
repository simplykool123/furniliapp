import React from "react";
import type { FurnitureSpec } from "@/types/furnitureSpec";

interface TVUnitSVGProps {
  spec: FurnitureSpec;
  showDimensions?: boolean;
  className?: string;
}

const TVUnitSVG: React.FC<TVUnitSVGProps> = ({ spec, showDimensions = true, className = "" }) => {
  const { width, height, depth, options = {} } = spec;
  
  const tvSize = options.tvSize || '55"';
  const glassShelf = options.glassShelf || 2;
  const cableManagement = options.cableManagement || false;
  const ledLighting = options.ledLighting || false;
  const powerOutlets = options.powerOutlets || false;
  const shelves = options.shelves || 2;
  const drawers = options.drawers || 2;
  
  const scale = Math.min(350 / width, 250 / height);
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  
  const svgWidth = 400;
  const svgHeight = 300;
  const offsetX = (svgWidth - scaledWidth) / 2;
  const offsetY = (svgHeight - scaledHeight) / 2;
  
  return (
    <div className={`bg-white border rounded-lg p-4 ${className}`}>
      <div className="text-center mb-2">
        <h3 className="text-sm font-semibold text-gray-800">TV Unit Technical Drawing</h3>
        <p className="text-xs text-gray-600">
          {tvSize} TV - {width}mm × {height}mm × {depth}mm
        </p>
      </div>
      
      <svg width={svgWidth} height={svgHeight} className="border border-gray-200">
        <rect width={svgWidth} height={svgHeight} fill="#fafafa" />
        
        {/* Main TV unit frame */}
        <rect 
          x={offsetX} 
          y={offsetY} 
          width={scaledWidth} 
          height={scaledHeight} 
          fill="white" 
          stroke="#333" 
          strokeWidth="2"
        />
        
        {/* TV placement area (top section) */}
        <rect 
          x={offsetX + 10} 
          y={offsetY + 10} 
          width={scaledWidth - 20} 
          height={scaledHeight * 0.4} 
          fill="#f0f8ff" 
          stroke="#b3d9ff" 
          strokeWidth="1"
          strokeDasharray="5,3"
        />
        <text 
          x={offsetX + scaledWidth/2} 
          y={offsetY + (scaledHeight * 0.4)/2 + 10} 
          textAnchor="middle" 
          fontSize="10" 
          fill="#0066cc"
          fontWeight="bold"
        >
          TV AREA ({tvSize})
        </text>
        
        {/* Glass shelves */}
        {Array.from({ length: glassShelf }).map((_, i) => {
          const shelfY = offsetY + (scaledHeight * 0.4) + 20 + (i * 30);
          return (
            <g key={`glass-shelf-${i}`}>
              <line
                x1={offsetX + 15}
                y1={shelfY}
                x2={offsetX + scaledWidth - 15}
                y2={shelfY}
                stroke="#4db8ff"
                strokeWidth="3"
                opacity="0.7"
              />
              <text 
                x={offsetX + scaledWidth - 10} 
                y={shelfY - 5} 
                fontSize="7" 
                fill="#0066cc"
              >
                Glass
              </text>
            </g>
          );
        })}
        
        {/* Regular shelves */}
        {Array.from({ length: shelves }).map((_, i) => {
          const shelfY = offsetY + (scaledHeight * 0.4) + 20 + (glassShelf * 30) + (i * 25);
          if (shelfY > offsetY + scaledHeight - 60) return null; // Don't overlap with drawers
          
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
          const drawerHeight = 40;
          const drawerY = offsetY + scaledHeight - ((drawers - i) * drawerHeight) - 10;
          const drawerWidth = scaledWidth / 2;
          const drawerX = offsetX + (i % 2) * drawerWidth + 5;
          
          return (
            <g key={`drawer-${i}`}>
              <rect
                x={drawerX}
                y={drawerY}
                width={drawerWidth - 10}
                height={drawerHeight - 5}
                fill="#f5f5f5"
                stroke="#333"
                strokeWidth="1"
              />
              <circle
                cx={drawerX + drawerWidth/2 - 5}
                cy={drawerY + drawerHeight/2}
                r="3"
                fill="#666"
              />
              <text 
                x={drawerX + 10} 
                y={drawerY + drawerHeight/2 + 3} 
                fontSize="7" 
                fill="#666"
              >
                D{i + 1}
              </text>
            </g>
          );
        })}
        
        {/* Cable management */}
        {cableManagement && (
          <g>
            <circle
              cx={offsetX + scaledWidth - 30}
              cy={offsetY + 30}
              r="8"
              fill="none"
              stroke="#ff6b35"
              strokeWidth="2"
            />
            <text 
              x={offsetX + scaledWidth - 60} 
              y={offsetY + 50} 
              fontSize="7" 
              fill="#ff6b35"
            >
              Cable Mgmt
            </text>
          </g>
        )}
        
        {/* LED lighting indicator */}
        {ledLighting && (
          <g>
            {Array.from({ length: 3 }).map((_, i) => (
              <circle
                key={`led-${i}`}
                cx={offsetX + 20 + (i * 20)}
                cy={offsetY + scaledHeight * 0.4 + 10}
                r="3"
                fill="#ffff00"
                stroke="#ffcc00"
                strokeWidth="1"
              />
            ))}
            <text 
              x={offsetX + 80} 
              y={offsetY + scaledHeight * 0.4 + 15} 
              fontSize="7" 
              fill="#666"
            >
              LED Strip
            </text>
          </g>
        )}
        
        {/* Power outlets */}
        {powerOutlets && (
          <g>
            <rect
              x={offsetX + 10}
              y={offsetY + scaledHeight - 25}
              width={15}
              height={10}
              fill="none"
              stroke="#333"
              strokeWidth="1"
            />
            <text 
              x={offsetX + 30} 
              y={offsetY + scaledHeight - 18} 
              fontSize="7" 
              fill="#666"
            >
              Power
            </text>
          </g>
        )}
        
        {/* Dimensions */}
        {showDimensions && (
          <g fontSize="10" fill="#666">
            <line x1={offsetX} y1={offsetY + scaledHeight + 20} x2={offsetX + scaledWidth} y2={offsetY + scaledHeight + 20} stroke="#666" strokeWidth="1" />
            <text x={offsetX + scaledWidth / 2} y={offsetY + scaledHeight + 35} textAnchor="middle">{width}mm</text>
            
            <line x1={offsetX - 20} y1={offsetY} x2={offsetX - 20} y2={offsetY + scaledHeight} stroke="#666" strokeWidth="1" />
            <text x={offsetX - 35} y={offsetY + scaledHeight / 2} textAnchor="middle" transform={`rotate(-90, ${offsetX - 35}, ${offsetY + scaledHeight / 2})`}>{height}mm</text>
          </g>
        )}
        
        {/* Specifications */}
        <g fontSize="9" fill="#555">
          <text x={offsetX} y={svgHeight - 40}>• TV Size: {tvSize}</text>
          <text x={offsetX} y={svgHeight - 25}>• Glass Shelves: {glassShelf}</text>
          <text x={offsetX} y={svgHeight - 10}>• Drawers: {drawers}</text>
          <text x={offsetX + 120} y={svgHeight - 40}>• Cable Mgmt: {cableManagement ? 'Yes' : 'No'}</text>
          <text x={offsetX + 120} y={svgHeight - 25}>• LED Lighting: {ledLighting ? 'Yes' : 'No'}</text>
          <text x={offsetX + 120} y={svgHeight - 10}>• Power Outlets: {powerOutlets ? 'Yes' : 'No'}</text>
        </g>
      </svg>
    </div>
  );
};

export default TVUnitSVG;