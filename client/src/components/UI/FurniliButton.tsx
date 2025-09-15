import { cn } from '@/lib/utils';
import { Button, ButtonProps } from '@/components/ui/button';
import { forwardRef } from 'react';

interface FurniliButtonProps extends Omit<ButtonProps, 'variant'> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'furnili-primary' | 'furnili-secondary';
  loading?: boolean;
}

const FurniliButton = forwardRef<HTMLButtonElement, FurniliButtonProps>(
  ({ className, variant = 'default', loading, children, disabled, ...props }, ref) => {
    const getFurniliVariantClasses = () => {
      switch (variant) {
        case 'furnili-primary':
          return 'furnili-button-primary';
        case 'furnili-secondary':
          return 'furnili-button-secondary';
        default:
          return '';
      }
    };

    const furniliClasses = getFurniliVariantClasses();
    const isDisabled = disabled || loading;

    return (
      <Button
        className={cn(
          furniliClasses,
          loading && 'opacity-80 cursor-not-allowed',
          className
        )}
        variant={furniliClasses ? undefined : (variant as any)}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {loading && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
        )}
        {children}
      </Button>
    );
  }
);

FurniliButton.displayName = 'FurniliButton';

export default FurniliButton;