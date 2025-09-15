import { useIsMobile } from "./MobileOptimizer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MobileFormProps {
  title?: string;
  children: React.ReactNode;
  onSubmit?: () => void;
  onCancel?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  className?: string;
}

export default function MobileForm({
  title,
  children,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  isSubmitting = false,
  className
}: MobileFormProps) {
  const isMobile = useIsMobile();

  if (!isMobile) {
    // Return desktop form
    return (
      <div className={`space-y-6 ${className || ''}`}>
        {title && <h2 className="text-2xl font-bold">{title}</h2>}
        <div className="space-y-4">
          {children}
        </div>
        {(onSubmit || onCancel) && (
          <div className="flex justify-end space-x-2">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                {cancelLabel}
              </Button>
            )}
            {onSubmit && (
              <Button onClick={onSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : submitLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`form-mobile ${className || ''}`}>
      <Card className="border-0 shadow-none">
        {title && (
          <CardHeader className="px-4 py-3 border-b">
            <CardTitle className="text-lg">{title}</CardTitle>
          </CardHeader>
        )}
        
        <ScrollArea className="max-h-[70vh]">
          <CardContent className="p-4 space-y-3">
            {children}
          </CardContent>
        </ScrollArea>
        
        {(onSubmit || onCancel) && (
          <div className="p-4 border-t bg-muted/30 flex space-x-3">
            {onCancel && (
              <Button 
                variant="outline" 
                onClick={onCancel}
                className="flex-1 h-11"
              >
                {cancelLabel}
              </Button>
            )}
            {onSubmit && (
              <Button 
                onClick={onSubmit} 
                disabled={isSubmitting}
                className="flex-1 h-11"
              >
                {isSubmitting ? "Saving..." : submitLabel}
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}