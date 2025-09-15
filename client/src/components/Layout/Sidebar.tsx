import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { authService } from "@/lib/auth";
import { useState, useEffect, useRef } from "react";
import ChangePassword from "@/components/ChangePassword";
import ProjectManagementIcon from "@/components/icons/ProjectManagementIcon";
import { 
  LayoutDashboard, 
  Package, 
  Tag,
  PackageSearch, 
  FileText, 
  BarChart3, 
  Users, 
  LogOut,
  Warehouse,
  UserRoundPen,
  CircleDollarSign,
  CheckSquare,
  TrendingUp,
  MessageCircle,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Database,
  GitCompare,
  Brain,
  Settings,
  Download,
  FolderOpen,
  PanelLeftClose,
  PanelLeftOpen,
  GitBranch,
  Building,
  ShoppingCart,
  Clock,
  Calculator,
  Cog,
  ClipboardCheck,
  Factory,
  Users2,
  UserPlus,
  TrendingUpDown,
  MessageSquare,
  Star,
} from "lucide-react";

export const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'manager', 'staff', 'store_incharge'] },
  { 
    name: 'Products', 
    icon: Package, 
    roles: ['admin', 'manager', 'staff', 'store_incharge'],
    isCollapsible: true,
    subItems: [
      { name: 'Raw Materials', href: '/products', icon: Package, roles: ['admin', 'manager', 'staff', 'store_incharge'] },
      { name: 'Stock Movement', href: '/inventory-movement', icon: ArrowUpDown, roles: ['admin', 'manager', 'store_incharge'] },
      { name: 'Purchase Orders', href: '/purchase-orders', icon: ShoppingCart, roles: ['admin', 'manager', 'store_incharge'] },
      { name: 'Compare Material', href: '/product-comparison', icon: GitCompare, roles: ['admin', 'manager'] },
      { name: 'Inventory Optimization', href: '/inventory-optimization', icon: TrendingUp, roles: ['admin', 'manager'] },
    ]
  },
  { name: 'Material Requests', href: '/requests', icon: PackageSearch, roles: ['admin', 'manager', 'staff', 'store_incharge'] },

  { name: 'Staff Attendance', href: '/attendance', icon: UserRoundPen, roles: ['admin', 'manager', 'staff', 'store_incharge'] },
  { name: 'Petty Cash', href: '/petty-cash', icon: CircleDollarSign, roles: ['admin', 'manager', 'staff', 'store_incharge'] }, // Store keeper can access user-specific petty cash
  
  { 
    name: 'CRM & Sales', 
    icon: Users2, 
    roles: ['admin', 'manager'],
    isCollapsible: true,
    subItems: [
      { name: 'Lead Management', href: '/leads', icon: UserPlus, roles: ['admin', 'manager'] },
      { name: 'Sales Pipeline', href: '/pipeline', icon: TrendingUpDown, roles: ['admin', 'manager'] },
      { name: 'Customer Interactions', href: '/interactions', icon: MessageSquare, roles: ['admin', 'manager'] },
      { name: 'Customer Satisfaction', href: '/satisfaction', icon: Star, roles: ['admin', 'manager'] },
    ]
  },
  
  { name: 'Project Management', href: '/projects', icon: ProjectManagementIcon, roles: ['admin', 'manager', 'staff', 'store_incharge'] }, // Store keeper can access project management
  { name: 'Task Management', href: '/tasks', icon: CheckSquare, roles: ['admin', 'manager', 'staff', 'store_incharge'] },

  { 
    name: 'Production', 
    icon: Factory, 
    roles: ['admin', 'manager', 'staff'],
    isCollapsible: true,
    subItems: [
      { name: 'Production Planning', href: '/production/planning', icon: LayoutDashboard, roles: ['admin', 'manager', 'staff'] },
      { name: 'Work Orders', href: '/production/work-orders', icon: Cog, roles: ['admin', 'manager', 'staff'] },
      { name: 'Quality Control', href: '/production/quality', icon: ClipboardCheck, roles: ['admin', 'manager', 'staff'] },
    ]
  },

  { name: 'BOM Calculator', href: '/bom-calculator', icon: Calculator, roles: ['admin', 'manager', 'staff', 'store_incharge'] },
  { name: 'WhatsApp Export', href: '/whatsapp', icon: MessageCircle, roles: ['admin', 'manager', 'staff'] }, // Store keeper doesn't need WhatsApp export

  { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin', 'manager'] },
  { 
    name: 'System Settings', 
    icon: Database, 
    roles: ['admin', 'manager', 'staff', 'store_incharge'],
    isCollapsible: true,
    subItems: [
      { name: 'OCR Wizard', href: '/ocr-wizard', icon: Brain, roles: ['admin', 'manager', 'staff'] }, // Store keeper doesn't need OCR
      { name: 'Price Comparison', href: '/price-comparison', icon: TrendingUp, roles: ['admin', 'manager'] },
      { name: 'WhatsApp Console', href: '/whatsapp-console', icon: MessageCircle, roles: ['admin', 'manager'] },
      { name: 'Theme & Layout', href: '/display-settings', icon: Settings, roles: ['admin', 'manager', 'staff', 'store_incharge'] },
      { name: 'Workflow', href: '/system-flowchart', icon: GitBranch, roles: ['admin', 'manager', 'staff'] }, // Store keeper doesn't need flowchart
      { name: 'Backups', href: '/backups', icon: Download, roles: ['admin'] },
    ]
  },
  { 
    name: 'Master Data', 
    icon: Settings, 
    roles: ['admin', 'manager'], // Hidden from staff and store_incharge users
    isCollapsible: true,
    subItems: [
      { name: 'Suppliers', href: '/suppliers', icon: Building, roles: ['admin', 'manager'] },
      { name: 'Clients', href: '/clients', icon: Users, roles: ['admin', 'manager'] },
      { name: 'Users', href: '/users', icon: Users, roles: ['admin'] },
      { name: 'Sales Products', href: '/sales-products', icon: Package, roles: ['admin', 'manager'] }, // Removed staff access
      { name: 'Categories', href: '/categories', icon: Tag, roles: ['admin'] },
      { name: 'BOM Setting', href: '/bom-settings', icon: Calculator, roles: ['admin', 'manager'] },
    ]
  },
];

interface SidebarProps {
  onItemClick?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ onItemClick, collapsed = false, onToggleCollapse }: SidebarProps = {}) {
  const [location] = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [floatingMenu, setFloatingMenu] = useState<{name: string, subItems: any[], position: {x: number, y: number}} | null>(null);
  const floatingMenuRef = useRef<HTMLDivElement>(null);
  const user = authService.getUser();

  // Wait for auth initialization
  useEffect(() => {
    const checkAuthReady = () => {
      if (authService.isAuthInitialized()) {
        setIsLoading(false);
      } else {
        // Check again after a short delay
        setTimeout(checkAuthReady, 50);
      }
    };
    checkAuthReady();
  }, []);

  // Auto-expand Master Data/System Settings/Products menus if any sub-item is active
  useEffect(() => {
    ['Master Data', 'System Settings', 'Products'].forEach(sectionName => {
      const settingsItem = navigation.find(item => item.name === sectionName);
      if (settingsItem?.subItems) {
        const hasActiveSettingsSubItem = settingsItem.subItems.some(subItem => 
          subItem.href && (location === subItem.href || (subItem.href !== '/' && location.startsWith(subItem.href)))
        );
        if (hasActiveSettingsSubItem && !expandedItems.includes(sectionName)) {
          setExpandedItems(prev => [...prev, sectionName]);
        }
      }
    });
  }, [location, expandedItems]);

  const handleLogout = () => {
    authService.logout();
    window.location.href = '/login';
  };

  // Handle floating menu for collapsed sidebar
  const handleCollapsedMenuClick = (event: React.MouseEvent, item: any) => {
    if (collapsed && item.isCollapsible && item.subItems) {
      const rect = event.currentTarget.getBoundingClientRect();
      setFloatingMenu({
        name: item.name,
        subItems: item.subItems,
        position: { x: rect.right + 8, y: rect.top }
      });
    }
  };

  // Close floating menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (floatingMenuRef.current && !floatingMenuRef.current.contains(event.target as Node)) {
        setFloatingMenu(null);
      }
    };

    if (floatingMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [floatingMenu]);

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(item => item !== itemName)
        : [...prev, itemName]
    );
  };

  // Show loading state during initialization
  if (isLoading) {
    return (
      <div className="flex h-full flex-col bg-white border-r border-gray-200">
        <div className="flex items-center p-4">
          <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
          {!collapsed && <div className="ml-3 h-4 w-24 bg-gray-200 rounded animate-pulse"></div>}
        </div>
        <div className="flex-1 p-2 space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  // Return early if no user, but after all hooks
  if (!user) return null;

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user.role)
  ).map(item => {
    if (item.subItems) {
      return {
        ...item,
        subItems: item.subItems.filter(subItem => subItem.roles.includes(user.role))
      };
    }
    return item;
  });

  return (
    <aside className={cn(
      "shadow-xl border-r border-primary-foreground/20 h-full flex flex-col fixed left-0 top-0 z-40",
      collapsed ? "w-16" : "w-56 lg:w-60"
    )} style={{backgroundColor: '#D4B896'}} data-testid="main-sidebar">
      {/* Logo/Brand & Toggle */}
      <div className="p-2 border-b border-primary-foreground/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <img 
                src="/furnili-logo-small.png" 
                alt="Furnili Logo" 
                className="w-6 h-6 object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = '<span class="text-white font-bold text-sm">F</span>';
                  }
                }}
              />
            </div>
            {!collapsed && (
              <div className="flex-1">
                <h2 className="font-bold text-amber-900 text-sm tracking-wide">Furnili </h2>
                <p className="text-xs text-amber-800 capitalize font-medium">{user.role}</p>
              </div>
            )}
          </div>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded-md hover:bg-white/20 text-amber-900"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>
          )}
        </div>
      </div>
      {/* Navigation */}
      <nav className="flex-1 p-2">
        <div className="space-y-0.5">
          {filteredNavigation.map((item) => {
            if (item.isCollapsible && item.subItems) {
              const isExpanded = expandedItems.includes(item.name);
              const hasActiveSubItem = item.subItems.some(subItem => 
                subItem.href && (location === subItem.href || (subItem.href !== '/' && location.startsWith(subItem.href)))
              );
              
              return (
                <div key={item.name} className="space-y-1">
                  {/* Parent Menu Item */}
                  <button
                    onClick={(e) => collapsed ? handleCollapsedMenuClick(e, item) : toggleExpanded(item.name)}
                    className={cn(
                      "flex items-center w-full rounded-lg font-medium text-xs group",
                      collapsed ? "justify-center p-2" : "justify-between px-2 py-1.5",
                      hasActiveSubItem || isExpanded
                        ? "text-amber-900 bg-white/30"
                        : "text-amber-900 hover:bg-white/20 hover:text-amber-800"
                    )}
                    title={collapsed ? item.name : undefined}
                  >
                    <div className={cn("flex items-center", collapsed ? "justify-center" : "space-x-2")}>
                      <item.icon className="w-4 h-4 flex-shrink-0 !text-amber-900" style={{ color: '#92400e' }} />
                      {!collapsed && <span className="truncate font-semibold">{item.name}</span>}
                    </div>
                    {!collapsed && (isExpanded ? (
                      <ChevronDown className="w-3 h-3 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-3 h-3 flex-shrink-0" />
                    ))}
                  </button>
                  
                  {/* Sub Menu Items */}
                  {isExpanded && !collapsed && (
                    <div className="ml-6 space-y-0.5">
                      {item.subItems.map((subItem) => {
                        const isActive = subItem.href && (location === subItem.href || (subItem.href !== '/' && location.startsWith(subItem.href)));
                        
                        return subItem.href ? (
                          <Link
                            key={subItem.name}
                            href={subItem.href}
                            className={cn(
                              "flex items-center space-x-2 w-full px-2 py-1 rounded-lg font-medium text-xs group",
                              isActive
                                ? "text-amber-900 bg-white/25"
                                : "text-amber-900/80 hover:bg-white/15 hover:text-amber-800"
                            )}
                            onClick={onItemClick}
                          >
                            <subItem.icon className="w-3 h-3 flex-shrink-0 !text-amber-900" style={{ color: '#92400e' }} />
                            <span className="truncate">{subItem.name}</span>
                          </Link>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              );
            } else {
              // Regular navigation item
              const isActive = item.href && (location === item.href || (item.href !== '/' && location.startsWith(item.href)));
              
              return item.href ? (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-lg font-medium text-xs group",
                    collapsed ? "justify-center p-2" : "space-x-2 px-2 py-1.5",
                    isActive
                      ? "text-amber-900 bg-white/30"
                      : "text-amber-900/90 hover:bg-white/15 hover:text-amber-800"
                  )}
                  onClick={onItemClick}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0 !text-amber-900" style={{ color: '#92400e' }} />
                  {!collapsed && <span className="truncate font-semibold">{item.name}</span>}
                </Link>
              ) : null;
            }
          })}
        </div>
      </nav>

      {/* Floating Menu for Collapsed Sidebar */}
      {floatingMenu && (
        <div 
          ref={floatingMenuRef}
          className="fixed z-50 bg-white shadow-xl rounded-lg border border-gray-200 py-2 min-w-48"
          style={{ 
            left: floatingMenu.position.x, 
            top: floatingMenu.position.y 
          }}
        >
          <div className="px-3 py-2 border-b border-gray-100">
            <h3 className="font-semibold text-sm text-gray-900">{floatingMenu.name}</h3>
          </div>
          <div className="py-1">
            {floatingMenu.subItems.map((subItem) => (
              subItem.href ? (
                <Link
                  key={subItem.name}
                  href={subItem.href}
                  className="flex items-center space-x-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  onClick={() => {
                    setFloatingMenu(null);
                    onItemClick?.();
                  }}
                >
                  <subItem.icon className="w-4 h-4 text-gray-500" />
                  <span>{subItem.name}</span>
                </Link>
              ) : null
            ))}
          </div>
        </div>
      )}

      {/* User Actions */}
      <div className="p-2 border-t border-primary-foreground/20 space-y-1">
        {/* Change Password */}
        {!collapsed && (
          <div className="w-full">
            <ChangePassword />
          </div>
        )}
        
        {/* Logout */}
        <button 
          onClick={handleLogout}
          className={cn(
            "flex items-center rounded-lg font-medium text-xs text-amber-900/90 hover:bg-white/15 hover:text-amber-800 group w-full",
            collapsed ? "justify-center p-2" : "space-x-2 px-2 py-1.5"
          )}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0 !text-amber-900" style={{ color: '#92400e' }} />
          {!collapsed && <span className="font-semibold">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
