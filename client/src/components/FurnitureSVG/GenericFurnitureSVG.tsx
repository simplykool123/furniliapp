import React from "react";
import type { FurnitureSpec } from "@/types/furnitureSpec";

interface GenericFurnitureSVGProps {
  spec: FurnitureSpec;
  showDimensions?: boolean;
  className?: string;
}

const GenericFurnitureSVG: React.FC<GenericFurnitureSVGProps> = ({ spec, showDimensions = true, className = "" }) => {
  const { width, height, depth, type } = spec;
  
  const scale = Math.min(300 / width, 200 / height);
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  const scaledDepth = depth * scale * 0.4;
  
  const svgWidth = 400;
  const svgHeight = 280;
  const offsetX = (svgWidth - scaledWidth - scaledDepth) / 2;
  const offsetY = (svgHeight - scaledHeight) / 2;
  
  return (
    <div className={`bg-white border rounded-lg p-4 ${className}`}>
      <div className="text-center mb-2">
        <h3 className="text-sm font-semibold text-gray-800 capitalize">{type} Technical Drawing</h3>
        <p className="text-xs text-gray-600">
          {width}mm × {height}mm × {depth}mm
        </p>
      </div>
      
      <svg width={svgWidth} height={svgHeight} className="border border-gray-200">
        <rect width={svgWidth} height={svgHeight} fill="#fafafa" />
        
        {/* 3D Isometric view */}
        {/* Top face */}
        <polygon
          points={`${offsetX},${offsetY} ${offsetX + scaledWidth},${offsetY} ${offsetX + scaledWidth + scaledDepth},${offsetY - scaledDepth} ${offsetX + scaledDepth},${offsetY - scaledDepth}`}
          fill="#f5f5f5"
          stroke="#333"
          strokeWidth="1.5"
        />
        
        {/* Right face */}
        <polygon
          points={`${offsetX + scaledWidth},${offsetY} ${offsetX + scaledWidth + scaledDepth},${offsetY - scaledDepth} ${offsetX + scaledWidth + scaledDepth},${offsetY + scaledHeight - scaledDepth} ${offsetX + scaledWidth},${offsetY + scaledHeight}`}
          fill="#e0e0e0"
          stroke="#333"
          strokeWidth="1.5"
        />
        
        {/* Front face */}
        <rect 
          x={offsetX} 
          y={offsetY} 
          width={scaledWidth} 
          height={scaledHeight} 
          fill="white" 
          stroke="#333" 
          strokeWidth="2"
        />
        
        {/* Type-specific details */}
        {type === 'table' && (
          <g>
            {/* Table legs */}
            <rect x={offsetX + 10} y={offsetY + scaledHeight - 15} width={8} height={15} fill="#8b4513" stroke="#654321" strokeWidth="1" />
            <rect x={offsetX + scaledWidth - 18} y={offsetY + scaledHeight - 15} width={8} height={15} fill="#8b4513" stroke="#654321" strokeWidth="1" />
            <rect x={offsetX + 10} y={offsetY + 5} width={8} height={15} fill="#8b4513" stroke="#654321" strokeWidth="1" />
            <rect x={offsetX + scaledWidth - 18} y={offsetY + 5} width={8} height={15} fill="#8b4513" stroke="#654321" strokeWidth="1" />
          </g>
        )}
        
        {type === 'door' && (
          <g>
            {/* Door handle */}
            <circle cx={offsetX + scaledWidth - 15} cy={offsetY + scaledHeight/2} r="5" fill="#444" stroke="#222" strokeWidth="1" />
            {/* Door panels */}
            <rect x={offsetX + 10} y={offsetY + 10} width={scaledWidth - 20} height={scaledHeight/2 - 15} fill="none" stroke="#666" strokeWidth="1" />
            <rect x={offsetX + 10} y={offsetY + scaledHeight/2 + 5} width={scaledWidth - 20} height={scaledHeight/2 - 15} fill="none" stroke="#666" strokeWidth="1" />
          </g>
        )}
        
        {type === 'sofa' && (
          <g>
            {/* Cushions */}
            <rect x={offsetX + 10} y={offsetY + 10} width={scaledWidth/3 - 5} height={scaledHeight/2} fill="#e6f3ff" stroke="#b3d9ff" strokeWidth="1" rx="5" />
            <rect x={offsetX + scaledWidth/3 + 5} y={offsetY + 10} width={scaledWidth/3 - 5} height={scaledHeight/2} fill="#e6f3ff" stroke="#b3d9ff" strokeWidth="1" rx="5" />
            <rect x={offsetX + 2*scaledWidth/3 + 5} y={offsetY + 10} width={scaledWidth/3 - 15} height={scaledHeight/2} fill="#e6f3ff" stroke="#b3d9ff" strokeWidth="1" rx="5" />
            {/* Armrests */}
            <rect x={offsetX} y={offsetY} width={15} height={scaledHeight*0.7} fill="#d4d4d4" stroke="#999" strokeWidth="1" rx="3" />
            <rect x={offsetX + scaledWidth - 15} y={offsetY} width={15} height={scaledHeight*0.7} fill="#d4d4d4" stroke="#999" strokeWidth="1" rx="3" />
          </g>
        )}
        
        {type === 'panel' && (
          <g>
            {/* Panel texture */}
            <pattern id="panelTexture" patternUnits="userSpaceOnUse" width="20" height="20">
              <rect width="20" height="20" fill="#f8f8f8"/>
              <path d="M 0,20 L 20,0" stroke="#e0e0e0" strokeWidth="0.5"/>
            </pattern>
            <rect x={offsetX + 5} y={offsetY + 5} width={scaledWidth - 10} height={scaledHeight - 10} fill="url(#panelTexture)" stroke="#ccc" strokeWidth="1" />
          </g>
        )}
        
        {/* Default generic outline if no specific type */}
        {!['table', 'door', 'sofa', 'panel'].includes(type) && (
          <g>
            <rect x={offsetX + 10} y={offsetY + 10} width={scaledWidth - 20} height={scaledHeight - 20} fill="none" stroke="#999" strokeWidth="1" strokeDasharray="5,5" />
            <text x={offsetX + scaledWidth/2} y={offsetY + scaledHeight/2} textAnchor="middle" fontSize="12" fill="#666" fontWeight="bold">
              {type.toUpperCase()}
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
            
            <line x1={offsetX + scaledWidth + 10} y1={offsetY - scaledDepth} x2={offsetX + scaledWidth + 10} y2={offsetY} stroke="#666" strokeWidth="1" />
            <text x={offsetX + scaledWidth + 25} y={offsetY - scaledDepth/2} textAnchor="middle">{depth}mm</text>
          </g>
        )}
        
        {/* Basic specifications */}
        <g fontSize="9" fill="#555">
          <text x={offsetX} y={svgHeight - 25}>• Type: {type.charAt(0).toUpperCase() + type.slice(1)}</text>
          <text x={offsetX} y={svgHeight - 10}>• Volume: {((width * height * depth) / 1000000).toFixed(2)} m³</text>
        </g>
      </svg>
    </div>
  );
};

export default GenericFurnitureSVG;