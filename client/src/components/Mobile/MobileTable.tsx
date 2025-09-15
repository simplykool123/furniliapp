import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "./MobileOptimizer";
import { ChevronDown, ChevronRight, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MobileTableProps {
  data: any[];
  columns: {
    key: string;
    label: string;
    render?: (value: any, row: any) => React.ReactNode;
    mobile?: boolean; // Show on mobile
  }[];
  onRowClick?: (row: any) => void;
  actions?: (row: any) => React.ReactNode;
  title?: string;
  emptyMessage?: string;
  loading?: boolean;
}

export default function MobileTable({
  data,
  columns,
  onRowClick,
  actions,
  title,
  emptyMessage = "No data available",
  loading = false
}: MobileTableProps) {
  const isMobile = useIsMobile();
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  if (!isMobile) {
    // Return desktop table component
    return (
      <div className="table-responsive">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              {columns.map((column) => (
                <th key={column.key} className="text-left p-3 font-medium">
                  {column.label}
                </th>
              ))}
              {actions && <th className="text-right p-3 font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={index}
                className="border-b hover:bg-muted/50 cursor-pointer"
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <td key={column.key} className="p-3">
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
                {actions && (
                  <td className="p-3 text-right">
                    {actions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const toggleRow = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const mobileColumns = columns.filter(col => col.mobile !== false).slice(0, 2);
  const detailColumns = columns.filter(col => !mobileColumns.includes(col));

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {title && (
        <CardHeader className="px-0 pt-0">
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      
      {data.map((row, index) => {
        const isExpanded = expandedRows.has(index);
        
        return (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-0">
              {/* Main row - always visible */}
              <div 
                className="p-4 cursor-pointer"
                onClick={() => onRowClick ? onRowClick(row) : toggleRow(index)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      {mobileColumns.map((column) => (
                        <div key={column.key} className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">
                            {column.render ? column.render(row[column.key], row) : row[column.key]}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {column.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-3">
                    {actions && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {actions(row)}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    
                    {detailColumns.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRow(index);
                        }}
                      >
                        {isExpanded ? 
                          <ChevronDown className="h-4 w-4" /> : 
                          <ChevronRight className="h-4 w-4" />
                        }
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && detailColumns.length > 0 && (
                <div className="border-t bg-muted/30 p-4 space-y-3">
                  {detailColumns.map((column) => (
                    <div key={column.key} className="flex justify-between items-center">
                      <span className="text-sm font-medium text-muted-foreground">
                        {column.label}:
                      </span>
                      <span className="text-sm">
                        {column.render ? column.render(row[column.key], row) : row[column.key]}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}