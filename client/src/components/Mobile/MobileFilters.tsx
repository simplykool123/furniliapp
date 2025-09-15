import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X, ChevronDown } from "lucide-react";

interface FilterOption {
  key: string;
  label: string;
  type: 'search' | 'select' | 'date' | 'daterange';
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
}

interface MobileFiltersProps {
  filters: FilterOption[];
  onClearAll?: () => void;
  className?: string;
  showActiveCount?: boolean;
}

export default function MobileFilters({
  filters,
  onClearAll,
  className,
  showActiveCount = true
}: MobileFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Count active filters
  const activeFiltersCount = filters.filter(filter => 
    filter.value && filter.value !== '' && filter.value !== 'all'
  ).length;

  const searchFilters = filters.filter(f => f.type === 'search');
  const otherFilters = filters.filter(f => f.type !== 'search');

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-4 space-y-3">
        {/* Search Filters - Always Visible */}
        {searchFilters.map((filter) => (
          <div key={filter.key} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={filter.placeholder || `Search ${filter.label.toLowerCase()}...`}
              value={filter.value || ''}
              onChange={(e) => filter.onChange?.(e.target.value)}
              className="pl-10 h-10"
            />
            {filter.value && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => filter.onChange?.('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}

        {/* Filter Toggle Button */}
        {otherFilters.length > 0 && (
          <Button
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full justify-between h-10"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              {showActiveCount && activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs h-5 px-1.5">
                  {activeFiltersCount}
                </Badge>
              )}
            </div>
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform",
              isExpanded && "rotate-180"
            )} />
          </Button>
        )}

        {/* Expandable Filters */}
        {isExpanded && otherFilters.length > 0 && (
          <div className="space-y-3 border-t border-border pt-3">
            {otherFilters.map((filter) => (
              <div key={filter.key} className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">
                  {filter.label}
                </label>
                {filter.type === 'select' && (
                  <Select 
                    value={filter.value || 'all'} 
                    onValueChange={(value) => filter.onChange?.(value)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={filter.placeholder || `Select ${filter.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All {filter.label}</SelectItem>
                      {filter.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {filter.type === 'date' && (
                  <Input
                    type="date"
                    value={filter.value || ''}
                    onChange={(e) => filter.onChange?.(e.target.value)}
                    className="h-9"
                  />
                )}
              </div>
            ))}

            {/* Clear All Button */}
            {activeFiltersCount > 0 && onClearAll && (
              <Button
                variant="outline"
                onClick={onClearAll}
                className="w-full h-9 text-sm"
              >
                <X className="h-4 w-4 mr-2" />
                Clear All Filters
              </Button>
            )}
          </div>
        )}

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            {filters
              .filter(f => f.value && f.value !== '' && f.value !== 'all')
              .map((filter) => (
                <Badge 
                  key={filter.key} 
                  variant="secondary" 
                  className="text-xs px-2 py-1 flex items-center gap-1"
                >
                  <span>{filter.label}: {filter.value}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-3 w-3 p-0 hover:bg-transparent"
                    onClick={() => filter.onChange?.('')}
                  >
                    <X className="h-2 w-2" />
                  </Button>
                </Badge>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Quick Filter Chips Component
export function MobileQuickFilters({
  options,
  selectedValue,
  onChange,
  className
}: {
  options: Array<{ value: string; label: string; count?: number }>;
  selectedValue: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-2", className)}>
      {options.map((option) => (
        <Button
          key={option.value}
          variant={selectedValue === option.value ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(option.value)}
          className="flex-shrink-0 h-8 text-xs px-3"
        >
          {option.label}
          {option.count !== undefined && (
            <Badge 
              variant={selectedValue === option.value ? "secondary" : "outline"}
              className="ml-1.5 h-4 px-1.5 text-xs"
            >
              {option.count}
            </Badge>
          )}
        </Button>
      ))}
    </div>
  );
}