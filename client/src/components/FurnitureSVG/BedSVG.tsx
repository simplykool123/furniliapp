import React from "react";
import type { FurnitureSpec } from "@/types/furnitureSpec";

interface BedSVGProps {
  spec: FurnitureSpec;
  showDimensions?: boolean;
  className?: string;
}

const BedSVG: React.FC<BedSVGProps> = ({ spec, showDimensions = true, className = "" }) => {
  const { width, height, depth, options = {} } = spec;
  
  const bedType = options.bedType || 'queen';
  const storage = options.storage || false;
  const drawers = options.drawers || 0;
  const hydraulic = options.hydraulic || false;
  const headboard = options.headboard || false;
  const footboard = options.footboard || false;
  
  // Drawing calculations
  const scale = Math.min(350 / width, 250 / depth);
  const scaledWidth = width * scale;
  const scaledDepth = depth * scale;
  
  const svgWidth = 400;
  const svgHeight = 300;
  const offsetX = (svgWidth - scaledWidth) / 2;
  const offsetY = (svgHeight - scaledDepth) / 2;
  
  return (
    <div className={`bg-white border rounded-lg p-4 ${className}`}>
      <div className="text-center mb-2">
        <h3 className="text-sm font-semibold text-gray-800">Bed Technical Drawing</h3>
        <p className="text-xs text-gray-600">
          {bedType.toUpperCase()} - {width}mm × {depth}mm × {height}mm
        </p>
      </div>
      
      <svg width={svgWidth} height={svgHeight} className="border border-gray-200">
        <rect width={svgWidth} height={svgHeight} fill="#fafafa" />
        
        {/* Headboard */}
        {headboard && (
          <rect 
            x={offsetX - 10} 
            y={offsetY - 20} 
            width={scaledWidth + 20} 
            height={30} 
            fill="#8b4513" 
            stroke="#654321" 
            strokeWidth="2"
            rx="5"
          />
        )}
        
        {/* Main bed base */}
        <rect 
          x={offsetX} 
          y={offsetY} 
          width={scaledWidth} 
          height={scaledDepth} 
          fill="white" 
          stroke="#333" 
          strokeWidth="2"
        />
        
        {/* Mattress */}
        <rect 
          x={offsetX + 10} 
          y={offsetY + 10} 
          width={scaledWidth - 20} 
          height={scaledDepth - 20} 
          fill="#e6f3ff" 
          stroke="#b3d9ff" 
          strokeWidth="1"
          rx="8"
        />
        
        {/* Storage drawers */}
        {storage && drawers > 0 && (
          Array.from({ length: drawers }).map((_, i) => {
            const drawerWidth = scaledWidth / drawers;
            const drawerX = offsetX + (i * drawerWidth) + 5;
            return (
              <g key={`drawer-${i}`}>
                <rect
                  x={drawerX}
                  y={offsetY + scaledDepth + 10}
                  width={drawerWidth - 10}
                  height={40}
                  fill="white"
                  stroke="#333"
                  strokeWidth="1"
                  rx="3"
                />
                <circle
                  cx={drawerX + drawerWidth/2}
                  cy={offsetY + scaledDepth + 30}
                  r="3"
                  fill="#666"
                />
                <text 
                  x={drawerX + drawerWidth/2} 
                  y={offsetY + scaledDepth + 45} 
                  textAnchor="middle"
                  fontSize="8" 
                  fill="#666"
                >
                  Drawer {i + 1}
                </text>
              </g>
            );
          })
        )}
        
        {/* Hydraulic mechanism indicator */}
        {hydraulic && (
          <g>
            <line 
              x1={offsetX + 20} 
              y1={offsetY + 20} 
              x2={offsetX + scaledWidth - 20} 
              y2={offsetY + scaledDepth - 20} 
              stroke="#ff6b35" 
              strokeWidth="2" 
              strokeDasharray="8,4"
            />
            <text 
              x={offsetX + scaledWidth/2} 
              y={offsetY + scaledDepth/2} 
              textAnchor="middle" 
              fontSize="10" 
              fill="#ff6b35"
              fontWeight="bold"
            >
              HYDRAULIC
            </text>
          </g>
        )}
        
        {/* Footboard */}
        {footboard && (
          <rect 
            x={offsetX - 10} 
            y={offsetY + scaledDepth + 5} 
            width={scaledWidth + 20} 
            height={20} 
            fill="#8b4513" 
            stroke="#654321" 
            strokeWidth="2"
            rx="3"
          />
        )}
        
        {/* Dimensions */}
        {showDimensions && (
          <g fontSize="10" fill="#666">
            <line x1={offsetX} y1={offsetY + scaledDepth + 80} x2={offsetX + scaledWidth} y2={offsetY + scaledDepth + 80} stroke="#666" strokeWidth="1" />
            <text x={offsetX + scaledWidth / 2} y={offsetY + scaledDepth + 95} textAnchor="middle">{width}mm</text>
            
            <line x1={offsetX - 30} y1={offsetY} x2={offsetX - 30} y2={offsetY + scaledDepth} stroke="#666" strokeWidth="1" />
            <text x={offsetX - 45} y={offsetY + scaledDepth / 2} textAnchor="middle" transform={`rotate(-90, ${offsetX - 45}, ${offsetY + scaledDepth / 2})`}>{depth}mm</text>
          </g>
        )}
        
        {/* Specifications */}
        <g fontSize="9" fill="#555">
          <text x={offsetX} y={svgHeight - 40}>• Type: {bedType}</text>
          <text x={offsetX} y={svgHeight - 25}>• Storage: {storage ? 'Yes' : 'No'}</text>
          <text x={offsetX} y={svgHeight - 10}>• Drawers: {drawers}</text>
          <text x={offsetX + 120} y={svgHeight - 40}>• Hydraulic: {hydraulic ? 'Yes' : 'No'}</text>
          <text x={offsetX + 120} y={svgHeight - 25}>• Headboard: {headboard ? 'Yes' : 'No'}</text>
          <text x={offsetX + 120} y={svgHeight - 10}>• Footboard: {footboard ? 'Yes' : 'No'}</text>
        </g>
      </svg>
    </div>
  );
};

export default BedSVG;