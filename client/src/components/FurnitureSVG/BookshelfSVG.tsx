import React from "react";
import type { FurnitureSpec } from "@/types/furnitureSpec";

interface BookshelfSVGProps {
  spec: FurnitureSpec;
  showDimensions?: boolean;
  className?: string;
}

const BookshelfSVG: React.FC<BookshelfSVGProps> = ({ spec, showDimensions = true, className = "" }) => {
  const { width, height, depth, options = {} } = spec;
  
  const shelves = options.shelves || 4;
  const doors = options.doors || 0;
  const exposedSides = options.exposedSides || false;
  
  const scale = Math.min(300 / width, 250 / height);
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  
  const svgWidth = 400;
  const svgHeight = 300;
  const offsetX = (svgWidth - scaledWidth) / 2;
  const offsetY = (svgHeight - scaledHeight) / 2;
  
  return (
    <div className={`bg-white border rounded-lg p-4 ${className}`}>
      <div className="text-center mb-2">
        <h3 className="text-sm font-semibold text-gray-800">Bookshelf Technical Drawing</h3>
        <p className="text-xs text-gray-600">
          {width}mm × {height}mm × {depth}mm
        </p>
      </div>
      
      <svg width={svgWidth} height={svgHeight} className="border border-gray-200">
        <rect width={svgWidth} height={svgHeight} fill="#fafafa" />
        
        {/* Main frame */}
        <rect 
          x={offsetX} 
          y={offsetY} 
          width={scaledWidth} 
          height={scaledHeight} 
          fill="white" 
          stroke="#333" 
          strokeWidth="2"
        />
        
        {/* Shelves */}
        {Array.from({ length: shelves + 1 }).map((_, i) => {
          const shelfY = offsetY + (i * scaledHeight) / (shelves + 1);
          
          return (
            <line
              key={`shelf-${i}`}
              x1={offsetX}
              y1={shelfY}
              x2={offsetX + scaledWidth}
              y2={shelfY}
              stroke="#333"
              strokeWidth="1.5"
            />
          );
        })}
        
        {/* Vertical divisions (if multiple sections) */}
        {scaledWidth > 200 && (
          <line
            x1={offsetX + scaledWidth/2}
            y1={offsetY}
            x2={offsetX + scaledWidth/2}
            y2={offsetY + scaledHeight}
            stroke="#333"
            strokeWidth="1.5"
          />
        )}
        
        {/* Sample books on shelves */}
        {Array.from({ length: shelves }).map((_, shelfIndex) => {
          const shelfY = offsetY + ((shelfIndex + 1) * scaledHeight) / (shelves + 1);
          const bookCount = Math.floor(scaledWidth / 20);
          
          return (
            <g key={`books-${shelfIndex}`}>
              {Array.from({ length: Math.min(bookCount, 8) }).map((_, bookIndex) => {
                const bookWidth = 15 + Math.random() * 10;
                const bookHeight = 20 + Math.random() * 15;
                const bookX = offsetX + 5 + (bookIndex * (scaledWidth - 10) / Math.min(bookCount, 8));
                
                return (
                  <rect
                    key={`book-${shelfIndex}-${bookIndex}`}
                    x={bookX}
                    y={shelfY - bookHeight - 5}
                    width={bookWidth}
                    height={bookHeight}
                    fill={`hsl(${Math.random() * 360}, 60%, 70%)`}
                    stroke="#333"
                    strokeWidth="0.5"
                  />
                );
              })}
            </g>
          );
        })}
        
        {/* Doors (if any) */}
        {doors > 0 && (
          <g>
            <rect 
              x={offsetX} 
              y={offsetY} 
              width={scaledWidth} 
              height={scaledHeight} 
              fill="rgba(255,255,255,0.8)" 
              stroke="#333" 
              strokeWidth="2"
            />
            
            {/* Door handles */}
            {Array.from({ length: doors }).map((_, i) => {
              const handleX = offsetX + (i * scaledWidth) / doors + (scaledWidth / doors) * 0.8;
              const handleY = offsetY + scaledHeight / 2;
              
              return (
                <circle
                  key={`door-handle-${i}`}
                  cx={handleX}
                  cy={handleY}
                  r="4"
                  fill="#444"
                  stroke="#222"
                  strokeWidth="1"
                />
              );
            })}
            
            {/* Door divisions */}
            {doors > 1 && Array.from({ length: doors - 1 }).map((_, i) => (
              <line
                key={`door-div-${i}`}
                x1={offsetX + ((i + 1) * scaledWidth) / doors}
                y1={offsetY}
                x2={offsetX + ((i + 1) * scaledWidth) / doors}
                y2={offsetY + scaledHeight}
                stroke="#333"
                strokeWidth="1"
                strokeDasharray="8,4"
              />
            ))}
          </g>
        )}
        
        {/* Exposed sides indicator */}
        {exposedSides && (
          <g>
            <rect 
              x={offsetX - 3} 
              y={offsetY - 3} 
              width={6} 
              height={scaledHeight + 6} 
              fill="none" 
              stroke="#ff6b35" 
              strokeWidth="2"
              opacity="0.7"
            />
            <rect 
              x={offsetX + scaledWidth - 3} 
              y={offsetY - 3} 
              width={6} 
              height={scaledHeight + 6} 
              fill="none" 
              stroke="#ff6b35" 
              strokeWidth="2"
              opacity="0.7"
            />
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
          <text x={offsetX} y={svgHeight - 40}>• Shelves: {shelves}</text>
          <text x={offsetX} y={svgHeight - 25}>• Doors: {doors}</text>
          <text x={offsetX} y={svgHeight - 10}>• Open Storage: {doors === 0 ? 'Yes' : 'No'}</text>
          <text x={offsetX + 120} y={svgHeight - 40}>• Exposed Sides: {exposedSides ? 'Yes' : 'No'}</text>
        </g>
      </svg>
    </div>
  );
};

export default BookshelfSVG;