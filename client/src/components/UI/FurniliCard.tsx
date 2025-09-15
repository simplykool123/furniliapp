import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface FurniliCardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  variant?: 'default' | 'stats' | 'glass' | 'gradient';
}

export default function FurniliCard({ 
  title, 
  description, 
  children, 
  className,
  headerClassName,
  contentClassName,
  variant = 'default'
}: FurniliCardProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'stats':
        return 'furnili-stats-card';
      case 'glass':
        return 'furnili-glass border';
      case 'gradient':
        return 'bg-gradient-to-br from-white via-background/30 to-secondary/10 border border-border/60 shadow-lg';
      default:
        return 'furnili-card';
    }
  };

  return (
    <Card className={cn(getVariantClasses(), className)}>
      {(title || description) && (
        <CardHeader className={cn('pb-4', headerClassName)}>
          {title && (
            <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
              {title}
            </CardTitle>
          )}
          {description && (
            <CardDescription className="text-muted-foreground">
              {description}
            </CardDescription>
          )}
        </CardHeader>
      )}
      <CardContent className={cn('pt-0', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}