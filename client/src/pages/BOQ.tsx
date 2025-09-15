import BOQUpload from "@/components/BOQ/BOQUpload";
import { authService } from "@/lib/auth";
import { useEffect } from "react";
import { useIsMobile, MobileCard, MobileHeading, MobileText } from "@/components/Mobile/MobileOptimizer";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";

export default function BOQ() {
  const user = authService.getUser();

  useEffect(() => {
    if (user && !['admin', 'manager', 'staff'].includes(user.role)) {
      window.location.href = '/';
    }
  }, [user]);

  if (!user || !['admin', 'manager', 'staff'].includes(user.role)) {
    return null;
  }

  return (
    <ResponsiveLayout 
      title="BOQ Upload" 
      subtitle="Upload and process Bill of Quantities documents"
    >
      <BOQUpload />
    </ResponsiveLayout>
  );
}
