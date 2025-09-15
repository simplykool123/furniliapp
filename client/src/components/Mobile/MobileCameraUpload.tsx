import React from 'react';
import { Camera, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCapacitor } from '@/hooks/useCapacitor';
import { useToast } from '@/hooks/use-toast';

interface MobileCameraUploadProps {
  onImageCaptured: (imageFile: File) => void;
  children?: React.ReactNode;
}

export const MobileCameraUpload: React.FC<MobileCameraUploadProps> = ({
  onImageCaptured,
  children
}) => {
  const { isNative, takePicture, vibrate } = useCapacitor();
  const { toast } = useToast();

  const handleCameraCapture = async () => {
    try {
      await vibrate(); // Provide haptic feedback
      
      if (isNative) {
        // Use native camera
        const imageUri = await takePicture();
        
        if (imageUri) {
          // Convert URI to File object
          const response = await fetch(imageUri);
          const blob = await response.blob();
          const file = new File([blob], `mobile_capture_${Date.now()}.jpg`, {
            type: 'image/jpeg',
          });
          
          onImageCaptured(file);
          
          toast({
            title: "Photo captured",
            description: "Image ready for upload",
          });
        }
      } else {
        // Fallback to web file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            onImageCaptured(file);
          }
        };
        
        input.click();
      }
    } catch (error) {
      console.error('Camera capture error:', error);
      toast({
        title: "Camera Error",
        description: "Failed to capture image. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (children) {
    return (
      <div onClick={handleCameraCapture}>
        {children}
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleCameraCapture}
      className="flex items-center gap-2"
    >
      {isNative ? <Camera className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
      {isNative ? 'Take Photo' : 'Upload Image'}
    </Button>
  );
};