import FurniliLayout from "./FurniliLayout";

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
  // Always use FurniliLayout - it handles responsive behavior internally
  return (
    <FurniliLayout
      title={title}
      subtitle={subtitle || ""}
      showAddButton={showAddButton}
      onAddClick={onAddClick}
      actions={actions}
      className={className}
    >
      {children}
    </FurniliLayout>
  );
}