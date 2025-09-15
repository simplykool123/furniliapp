import React from "react";
import type { FurnitureSpec } from "@/types/furnitureSpec";
import WardrobeSVG from "./FurnitureSVG/WardrobeSVG";
import BedSVG from "./FurnitureSVG/BedSVG";
import KitchenSVG from "./FurnitureSVG/KitchenSVG";
import TVUnitSVG from "./FurnitureSVG/TVUnitSVG";
import CabinetSVG from "./FurnitureSVG/CabinetSVG";
import BookshelfSVG from "./FurnitureSVG/BookshelfSVG";
import GenericFurnitureSVG from "./FurnitureSVG/GenericFurnitureSVG";

interface FurnitureSVGRendererProps {
  spec: FurnitureSpec;
  showDimensions?: boolean;
  className?: string;
}

/**
 * Universal SVG Renderer for Technical Drawings
 * Routes to specific furniture type renderers based on spec.type
 */
const FurnitureSVGRenderer: React.FC<FurnitureSVGRendererProps> = ({ 
  spec, 
  showDimensions = true,
  className = "" 
}) => {
  const commonProps = { spec, showDimensions, className };

  switch (spec.type) {
    case "wardrobe":
      return <WardrobeSVG {...commonProps} />;
    case "bed":
      return <BedSVG {...commonProps} />;
    case "kitchen":
      return <KitchenSVG {...commonProps} />;
    case "tvunit":
      return <TVUnitSVG {...commonProps} />;
    case "cabinet":
      return <CabinetSVG {...commonProps} />;
    case "bookshelf":
      return <BookshelfSVG {...commonProps} />;
    case "dresser":
      return <CabinetSVG {...commonProps} />; // Use cabinet renderer for dresser
    case "door":
      return <GenericFurnitureSVG {...commonProps} />;
    case "shelving":
      return <BookshelfSVG {...commonProps} />; // Use bookshelf renderer for shelving
    case "table":
      return <GenericFurnitureSVG {...commonProps} />;
    case "sofa":
      return <GenericFurnitureSVG {...commonProps} />;
    case "panel":
      return <GenericFurnitureSVG {...commonProps} />;
    default:
      return (
        <div className="flex items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-center">
            <p className="text-gray-500">Unsupported furniture type</p>
            <p className="text-sm text-gray-400">{spec.type}</p>
          </div>
        </div>
      );
  }
};

export default FurnitureSVGRenderer;