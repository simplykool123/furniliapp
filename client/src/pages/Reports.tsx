import ReportsView from "@/components/Reports/ReportsView";
import ResponsiveLayout from "@/components/Layout/ResponsiveLayout";
import { authService } from "@/lib/auth";
import { useEffect } from "react";

export default function Reports() {
  const user = authService.getUser();

  useEffect(() => {
    if (user && !['admin', 'manager'].includes(user.role)) {
      window.location.href = '/';
    }
  }, [user]);

  if (!user || !['admin', 'manager'].includes(user.role)) {
    return null;
  }

  return (
    <ResponsiveLayout
      title="Reports & Analytics"
      subtitle="Comprehensive reporting and business insights"
    >
      <ReportsView />
    </ResponsiveLayout>
  );
}
