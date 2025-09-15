import React, { useEffect } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { useCapacitor } from '@/hooks/useCapacitor';

export const MobileStatusBar: React.FC = () => {
  const { isNative } = useCapacitor();

  useEffect(() => {
    if (isNative) {
      // Set status bar style for mobile app
      StatusBar.setStyle({ style: Style.Dark });
      StatusBar.setBackgroundColor({ color: '#8B4513' }); // Furnili brown theme
    }
  }, [isNative]);

  // This component doesn't render anything visible
  return null;
};