import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "./MobileOptimizer";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

interface MobileNavigationProps {
  items: {
    id: string;
    label: string;
    icon?: React.ComponentType<any>;
    href?: string;
    onClick?: () => void;
    active?: boolean;
  }[];
  onItemClick?: (id: string) => void;
  className?: string;
}

export default function MobileNavigation({ 
  items, 
  onItemClick, 
  className 
}: MobileNavigationProps) {
  const isMobile = useIsMobile();
  const [showAll, setShowAll] = useState(false);

  if (!isMobile) {
    return null;
  }

  const visibleItems = showAll ? items : items.slice(0, 4);
  const hasMore = items.length > 4;

  return (
    <Card className={`sticky bottom-4 mx-4 border-2 shadow-lg ${className || ''}`}>
      <CardContent className="p-2">
        <div className="flex items-center justify-between">
          {/* Navigation Items */}
          <div className="flex flex-1 space-x-1">
            {visibleItems.map((item) => (
              <Button
                key={item.id}
                variant={item.active ? "default" : "ghost"}
                size="sm"
                className={`flex-1 flex flex-col h-12 px-2 ${
                  item.active ? 'bg-furnili-brown text-white' : ''
                }`}
                onClick={() => {
                  item.onClick?.();
                  onItemClick?.(item.id);
                }}
              >
                {item.icon && <item.icon className="h-4 w-4 mb-1" />}
                <span className="text-xs truncate">{item.label}</span>
              </Button>
            ))}
          </div>

          {/* More button */}
          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              className="h-12 w-12 flex flex-col"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? (
                <ChevronLeft className="h-4 w-4 mb-1" />
              ) : (
                <MoreHorizontal className="h-4 w-4 mb-1" />
              )}
              <span className="text-xs">
                {showAll ? 'Less' : 'More'}
              </span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}