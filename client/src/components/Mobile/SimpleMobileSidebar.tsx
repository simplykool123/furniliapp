import { useState } from "react";
import { Link, useLocation } from "wouter";
import { X, ChevronDown, ChevronRight } from "lucide-react";
import { authService } from "@/lib/auth";
import { 
  LayoutDashboard, 
  Package, 
  FileText, 
  TrendingUp, 
  Users, 
  DollarSign,
  Building2,
  CheckSquare,
  MessageSquare,
  BarChart3,
  Settings,
  Database,
  Key,
  LogOut,
  Box,
  Archive,
  ArrowUpDown,
  ShoppingCart,
  BarChart2,
  Clipboard,
  UserCheck,
  Calculator,
  Layers,
  Share2
} from "lucide-react";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  href?: string;
  icon: any;
  children?: NavItem[];
  roles: string[];
}

const navItems: NavItem[] = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: ["admin", "manager", "staff", "store_incharge"]
  },
  {
    name: "Products",
    icon: Package,
    roles: ["admin", "manager", "staff", "store_incharge"],
    children: [
      { name: "Raw Materials", href: "/products", icon: Box, roles: ["admin", "manager", "staff", "store_incharge"] },
      { name: "Stock Movement", href: "/inventory/movements", icon: ArrowUpDown, roles: ["admin", "manager", "staff", "store_incharge"] },
      { name: "Purchase Orders", href: "/purchase-orders", icon: ShoppingCart, roles: ["admin", "manager", "staff"] },
      { name: "Compare Material", href: "/comparison", icon: BarChart2, roles: ["admin", "manager", "staff"] },
    ]
  },
  {
    name: "Material Requests",
    href: "/requests",
    icon: Clipboard,
    roles: ["admin", "manager", "staff", "store_incharge"]
  },
  {
    name: "Inventory Optimization",
    href: "/inventory-optimization",
    icon: TrendingUp,
    roles: ["admin", "manager", "staff"]
  },
  {
    name: "Staff Attendance",
    href: "/attendance",
    icon: UserCheck,
    roles: ["admin", "manager"]
  },
  {
    name: "Petty Cash",
    href: "/petty-cash",
    icon: DollarSign,
    roles: ["admin", "manager", "staff"]
  },
  {
    name: "Project Management",
    href: "/projects",
    icon: Building2,
    roles: ["admin", "manager", "staff"]
  },
  {
    name: "Task Management",
    href: "/tasks",
    icon: CheckSquare,
    roles: ["admin", "manager", "staff"]
  },
  {
    name: "WhatsApp Export",
    href: "/whatsapp",
    icon: MessageSquare,
    roles: ["admin", "manager", "staff"]
  },
  {
    name: "CRM & Sales",
    icon: Users,
    roles: ["admin", "manager", "staff"],
    children: [
      { name: "Leads", href: "/leads", icon: TrendingUp, roles: ["admin", "manager", "staff"] },
      { name: "Interactions", href: "/interactions", icon: MessageSquare, roles: ["admin", "manager", "staff"] },
      { name: "Quotes", href: "/quotes", icon: FileText, roles: ["admin", "manager", "staff"] },
    ]
  },
  {
    name: "Production",
    icon: Layers,
    roles: ["admin", "manager", "staff"],
    children: [
      { name: "Planning", href: "/production/planning", icon: Calculator, roles: ["admin", "manager", "staff"] },
      { name: "Work Orders", href: "/production/work-orders", icon: Clipboard, roles: ["admin", "manager", "staff"] },
      { name: "Quality Control", href: "/production/quality", icon: CheckSquare, roles: ["admin", "manager", "staff"] },
    ]
  },
  {
    name: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["admin", "manager"]
  },
  {
    name: "System Settings",
    icon: Settings,
    roles: ["admin"],
    children: [
      { name: "Categories", href: "/categories", icon: Archive, roles: ["admin"] },
      { name: "Suppliers", href: "/suppliers", icon: Building2, roles: ["admin"] },
      { name: "Clients", href: "/clients", icon: Users, roles: ["admin"] },
      { name: "Users", href: "/users", icon: Users, roles: ["admin"] },
    ]
  },
  {
    name: "Master Data",
    icon: Database,
    roles: ["admin"],
    children: [
      { name: "Display Settings", href: "/display-settings", icon: Settings, roles: ["admin"] },
      { name: "Backups", href: "/backups", icon: Archive, roles: ["admin"] },
      { name: "BOQ Upload", href: "/boq", icon: FileText, roles: ["admin", "manager", "staff"] },
    ]
  }
];

export default function SimpleMobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const [location] = useLocation();
  const user = authService.getUser();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  if (!user) return null;

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev => 
      prev.includes(itemName) 
        ? prev.filter(name => name !== itemName)
        : [...prev, itemName]
    );
  };

  const hasPermission = (roles: string[]) => {
    return roles.includes(user.role);
  };

  const filteredNavItems = navItems.filter(item => hasPermission(item.roles));

  const handleLogout = () => {
    authService.logout();
    window.location.href = '/login';
  };

  const isActiveRoute = (href?: string, children?: NavItem[]) => {
    if (href) {
      return location === href || (href !== '/' && location.startsWith(href));
    }
    if (children) {
      return children.some(child => location === child.href || (child.href !== '/' && location.startsWith(child.href!)));
    }
    return false;
  };

  return (
    <>
      {/* Backdrop - covers entire screen with high z-index */}
      {isOpen && (
        <div 
          className="mobile-backdrop fixed inset-0 z-[999] bg-black/70 backdrop-blur-sm"
          onClick={onClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            transition: 'all 300ms ease-in-out'
          }}
        />
      )}

      {/* Sidebar - positioned above backdrop */}
      <div 
        className={`mobile-sidebar fixed inset-y-0 left-0 z-[1000] w-80 max-w-[85vw] bg-gradient-to-b from-amber-50 to-amber-100 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } border-r border-amber-200/50 shadow-2xl overflow-hidden`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: '320px',
          maxWidth: '85vw',
          background: 'linear-gradient(to bottom, #fef7cd, #fde68a)',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 300ms ease-in-out',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          borderRight: '1px solid rgba(217, 119, 6, 0.2)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-100 to-amber-50 border-b border-amber-200/50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-amber-800 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">F</span>
            </div>
            <div>
              <h1 className="text-amber-900 font-bold text-base">Furnili</h1>
              <p className="text-amber-700 text-xs">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-amber-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-amber-700" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-2 px-2 h-full">
          {filteredNavItems.map((item) => {
            const isExpanded = expandedItems.includes(item.name);
            const isActive = isActiveRoute(item.href, item.children);

            return (
              <div key={item.name} className="mb-1">
                {item.children ? (
                  <div>
                    <button
                      onClick={() => toggleExpanded(item.name)}
                      className={`
                        w-full flex items-center justify-between px-3 py-2.5 rounded-lg
                        text-sm transition-all duration-200
                        ${isActive 
                          ? 'bg-amber-200 text-amber-900 shadow-sm' 
                          : 'text-amber-800 hover:bg-amber-100'
                        }
                      `}
                    >
                      <div className="flex items-center space-x-3">
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    
                    {isExpanded && (
                      <div className="ml-4 mt-1 space-y-1">
                        {item.children
                          .filter(child => hasPermission(child.roles))
                          .map((child) => {
                            const isChildActive = location === child.href || (child.href !== '/' && location.startsWith(child.href!));
                            return (
                              <Link key={child.name} href={child.href!}>
                                <div
                                  className={`
                                    flex items-center space-x-3 px-3 py-2 rounded-lg
                                    text-sm transition-all duration-200
                                    ${isChildActive 
                                      ? 'bg-amber-300/50 text-amber-900 font-medium shadow-sm' 
                                      : 'text-amber-700 hover:bg-amber-100'
                                    }
                                  `}
                                  onClick={onClose}
                                >
                                  <child.icon className="w-4 h-4 flex-shrink-0" />
                                  <span>{child.name}</span>
                                </div>
                              </Link>
                            );
                          })}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link href={item.href!}>
                    <div
                      className={`
                        flex items-center space-x-3 px-3 py-2.5 rounded-lg
                        text-sm transition-all duration-200
                        ${isActive 
                          ? 'bg-amber-200 text-amber-900 font-medium shadow-sm' 
                          : 'text-amber-800 hover:bg-amber-100'
                        }
                      `}
                      onClick={onClose}
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span>{item.name}</span>
                    </div>
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Actions */}
        <div className="border-t border-amber-200/50 p-2 bg-gradient-to-r from-amber-50 to-amber-100">
          <button className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm text-amber-700 hover:bg-amber-100 transition-all duration-200 mb-1">
            <Key className="w-4 h-4" />
            <span>Change Password</span>
          </button>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm text-red-700 hover:bg-red-50 transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
}