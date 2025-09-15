import { useIsMobile } from "@/components/Mobile/MobileOptimizer";
import FurniliLayout from "./FurniliLayout";
import MobileLayout from "@/components/Mobile/MobileLayout";

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  showAddButton?: boolean;
  onAddClick?: () => void;
  showBack?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export default function ResponsiveLayout({
  children,
  title,
  subtitle,
  showAddButton,
  onAddClick,
  showBack,
  onBack,
  actions,
  className
}: ResponsiveLayoutProps) {
  const isMobile = useIsMobile();

  // Use mobile layout for mobile devices
  if (isMobile) {
    return (
      <MobileLayout
        title={title}
        subtitle={subtitle}
        showBack={showBack}
        onBack={onBack}
        actions={actions}
        className={className}
      >
        {children}
      </MobileLayout>
    );
  }

  // Use desktop layout for larger screens
  return (
    <FurniliLayout
      title={title}
      subtitle={subtitle || ""}
      showAddButton={showAddButton}
      onAddClick={onAddClick}
      className={className}
    >
      {children}
    </FurniliLayout>
  );
}