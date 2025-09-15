import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface FurniliStatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  onClick?: () => void;
}

export default function FurniliStatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
  onClick
}: FurniliStatsCardProps) {
  return (
    <div 
      className={cn(
        "furnili-stats-card group cursor-pointer",
        onClick && "hover:scale-[1.02] active:scale-[0.98]",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-1">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-foreground">
              {value}
            </p>
            {trend && (
              <span className={cn(
                "text-xs font-medium px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full",
                trend.isPositive 
                  ? "text-green-700 bg-green-100" 
                  : "text-red-700 bg-red-100"
              )}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
            )}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">
              {description}
            </p>
          )}
        </div>
        {Icon && (
          <div className="furnili-gradient p-3 sm:p-3 rounded-lg">
            <Icon className="h-7 w-7 text-white" />
          </div>
        )}
      </div>
    </div>
  );
}