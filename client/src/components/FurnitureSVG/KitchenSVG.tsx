import React from "react";
import type { FurnitureSpec } from "@/types/furnitureSpec";

interface KitchenSVGProps {
  spec: FurnitureSpec;
  showDimensions?: boolean;
  className?: string;
}

const KitchenSVG: React.FC<KitchenSVGProps> = ({ spec, showDimensions = true, className = "" }) => {
  const { width, height, depth, options = {} } = spec;
  
  const baseCabinets = options.baseCabinets || 3;
  const wallCabinets = options.wallCabinets || 3;
  const tallCabinets = options.tallCabinets || 1;
  const pulloutShelves = options.pulloutShelves || 2;
  const lazySusan = options.lazySusan || false;
  const cornerUnit = options.cornerUnit || false;
  
  const scale = Math.min(350 / width, 280 / height);
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  
  const svgWidth = 400;
  const svgHeight = 320;
  const offsetX = (svgWidth - scaledWidth) / 2;
  const offsetY = (svgHeight - scaledHeight) / 2;
  
  const baseCabinetHeight = 850 * scale;
  const wallCabinetHeight = 720 * scale;
  const counterHeight = 40 * scale;
  
  return (
    <div className={`bg-white border rounded-lg p-4 ${className}`}>
      <div className="text-center mb-2">
        <h3 className="text-sm font-semibold text-gray-800">Kitchen Cabinet Technical Drawing</h3>
        <p className="text-xs text-gray-600">
          {width}mm × {height}mm × {depth}mm
        </p>
      </div>
      
      <svg width={svgWidth} height={svgHeight} className="border border-gray-200">
        <rect width={svgWidth} height={svgHeight} fill="#fafafa" />
        
        {/* Wall cabinets */}
        {Array.from({ length: wallCabinets }).map((_, i) => {
          const cabinetWidth = scaledWidth / wallCabinets;
          const cabinetX = offsetX + (i * cabinetWidth);
          return (
            <g key={`wall-${i}`}>
              <rect
                x={cabinetX}
                y={offsetY}
                width={cabinetWidth}
                height={wallCabinetHeight}
                fill="#f8f9fa"
                stroke="#333"
                strokeWidth="1.5"
              />
              <rect
                x={cabinetX + 5}
                y={offsetY + 5}
                width={cabinetWidth - 10}
                height={wallCabinetHeight - 10}
                fill="none"
                stroke="#666"
                strokeWidth="1"
                strokeDasharray="3,2"
              />
              <circle
                cx={cabinetX + cabinetWidth - 15}
                cy={offsetY + wallCabinetHeight/2}
                r="3"
                fill="#444"
              />
              <text 
                x={cabinetX + cabinetWidth/2} 
                y={offsetY + wallCabinetHeight/2} 
                textAnchor="middle"
                fontSize="8" 
                fill="#666"
              >
                W{i + 1}
              </text>
            </g>
          );
        })}
        
        {/* Counter/Worktop */}
        <rect
          x={offsetX}
          y={offsetY + wallCabinetHeight + 30}
          width={scaledWidth}
          height={counterHeight}
          fill="#d4ac0d"
          stroke="#b7950b"
          strokeWidth="2"
        />
        
        {/* Base cabinets */}
        {Array.from({ length: baseCabinets }).map((_, i) => {
          const cabinetWidth = scaledWidth / baseCabinets;
          const cabinetX = offsetX + (i * cabinetWidth);
          const cabinetY = offsetY + wallCabinetHeight + 30 + counterHeight;
          return (
            <g key={`base-${i}`}>
              <rect
                x={cabinetX}
                y={cabinetY}
                width={cabinetWidth}
                height={baseCabinetHeight}
                fill="white"
                stroke="#333"
                strokeWidth="1.5"
              />
              
              {/* Drawers */}
              {i < pulloutShelves && (
                <>
                  <rect
                    x={cabinetX + 5}
                    y={cabinetY + 5}
                    width={cabinetWidth - 10}
                    height={baseCabinetHeight/3 - 5}
                    fill="#f5f5f5"
                    stroke="#999"
                    strokeWidth="1"
                  />
                  <rect
                    x={cabinetX + 5}
                    y={cabinetY + baseCabinetHeight/3 + 5}
                    width={cabinetWidth - 10}
                    height={baseCabinetHeight/3 - 5}
                    fill="#f5f5f5"
                    stroke="#999"
                    strokeWidth="1"
                  />
                  <circle
                    cx={cabinetX + cabinetWidth - 15}
                    cy={cabinetY + baseCabinetHeight/6}
                    r="2"
                    fill="#666"
                  />
                  <circle
                    cx={cabinetX + cabinetWidth - 15}
                    cy={cabinetY + baseCabinetHeight/2}
                    r="2"
                    fill="#666"
                  />
                </>
              )}
              
              {/* Regular door */}
              {i >= pulloutShelves && (
                <circle
                  cx={cabinetX + cabinetWidth - 15}
                  cy={cabinetY + baseCabinetHeight/2}
                  r="3"
                  fill="#444"
                />
              )}
              
              <text 
                x={cabinetX + cabinetWidth/2} 
                y={cabinetY + baseCabinetHeight - 10} 
                textAnchor="middle"
                fontSize="8" 
                fill="#666"
              >
                B{i + 1}
              </text>
            </g>
          );
        })}
        
        {/* Corner unit indicator */}
        {cornerUnit && (
          <g>
            <polygon
              points={`${offsetX},${offsetY + wallCabinetHeight + 30 + counterHeight + baseCabinetHeight + 10} ${offsetX + 40},${offsetY + wallCabinetHeight + 30 + counterHeight + baseCabinetHeight + 10} ${offsetX + 20},${offsetY + wallCabinetHeight + 30 + counterHeight + baseCabinetHeight + 30}`}
              fill="#ffd700"
              stroke="#ffb300"
              strokeWidth="1"
            />
            <text 
              x={offsetX + 20} 
              y={offsetY + wallCabinetHeight + 30 + counterHeight + baseCabinetHeight + 45} 
              textAnchor="middle"
              fontSize="8" 
              fill="#666"
            >
              Corner Unit
            </text>
          </g>
        )}
        
        {/* Lazy Susan indicator */}
        {lazySusan && (
          <circle
            cx={offsetX + scaledWidth - 30}
            cy={offsetY + wallCabinetHeight + 30 + counterHeight + baseCabinetHeight/2}
            r="15"
            fill="none"
            stroke="#ff6b35"
            strokeWidth="2"
            strokeDasharray="4,2"
          />
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
          <text x={offsetX} y={svgHeight - 40}>• Wall Units: {wallCabinets}</text>
          <text x={offsetX} y={svgHeight - 25}>• Base Units: {baseCabinets}</text>
          <text x={offsetX} y={svgHeight - 10}>• Pullout Shelves: {pulloutShelves}</text>
          <text x={offsetX + 140} y={svgHeight - 40}>• Corner Unit: {cornerUnit ? 'Yes' : 'No'}</text>
          <text x={offsetX + 140} y={svgHeight - 25}>• Lazy Susan: {lazySusan ? 'Yes' : 'No'}</text>
          <text x={offsetX + 140} y={svgHeight - 10}>• Tall Units: {tallCabinets}</text>
        </g>
      </svg>
    </div>
  );
};

export default KitchenSVG;