"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Package,
  Building,
  CreditCard,
  Settings,
  Infinity,
  FileText,
  LucideIcon,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import UserAvatar from "./user-avatar";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { SubscriptionStatus as SubscriptionStatusType } from '@/types/subscription';
import AdminPasswordModal from "./admin-password-modal";

interface SidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  isAdmin?: boolean;
}

const Sidebar = ({ isCollapsed, toggleSidebar, isAdmin: _isAdmin = false }: SidebarProps) => {
  const pathname = usePathname();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatusType | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const response = await fetch('/api/subscriptions/status');
        if (response.ok) {
          const data = await response.json();
          setSubscriptionStatus(data.status);
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
      }
    }

    fetchSubscription();
  }, []);

  const translatePlan = (plan: string) => {
    switch (plan) {
      case 'FREE':
        return 'Gratis';
      case 'PRO':
        return 'Pro';
      case 'ENTERPRISE':
        return 'Empresarial';
      default:
        return null;
    }
  };

  const handleAdminClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // Check if password was verified in this session (within 1 hour)
    const verified = sessionStorage.getItem("admin_password_verified");
    const timestamp = sessionStorage.getItem("admin_password_timestamp");
    
    if (verified === "true" && timestamp) {
      const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
      const isExpired = Date.now() - parseInt(timestamp) > oneHour;
      
      if (!isExpired) {
        window.location.href = "/admin";
        return;
      } else {
        // Clear expired verification
        sessionStorage.removeItem("admin_password_verified");
        sessionStorage.removeItem("admin_password_timestamp");
      }
    }
    
    setShowPasswordModal(true);
  };

  type NavItem = {
    href: string;
    icon: LucideIcon;
    label: string;
    onClick?: (e: React.MouseEvent) => void;
  };

  const navItems: NavItem[] = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/chat", icon: Infinity, label: "Agente" },
    { href: "/offerings", icon: Package, label: "Servicios" },
    { href: "/companies", icon: Building, label: "Empresas" },
    { href: "/pricing", icon: CreditCard, label: "Suscripción" },
  ];

  if (_isAdmin) {
    navItems.push({ href: "/admin", icon: Settings, label: "Admin", onClick: handleAdminClick });
  }

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 h-full bg-white text-gray-500 transition-all duration-300 ease-in-out z-50 border-r border-gray-100 shadow-sm flex flex-col",
        isCollapsed ? "w-16" : "w-16 md:w-56"
      )}
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-between h-16 px-4 relative border-b border-gray-50/50">
        <div className={cn("flex items-center gap-3 transition-opacity duration-200", isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100")}>
          <Image src="/logo.svg" alt="Camella Logo" width={28} height={28} className="flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900 tracking-tight">Camella</span>
            {subscriptionStatus && translatePlan(subscriptionStatus.plan) && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 h-4 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100 font-normal w-fit"
              >
                {translatePlan(subscriptionStatus.plan)}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Logo fallback for collapsed state */}
        <div className={cn("absolute left-1/2 -translate-x-1/2 transition-opacity duration-200", isCollapsed ? "opacity-100" : "opacity-0 pointer-events-none")}>
           <Image src="/logo.svg" alt="Camella Logo" width={24} height={24} />
        </div>

        <button
          onClick={toggleSidebar}
          className={cn(
            "bg-white border border-gray-200 rounded-full p-1.5 shadow-sm hover:bg-gray-50 hover:text-indigo-600 transition-all z-10 hidden md:flex items-center justify-center",
            isCollapsed ? "absolute -right-3 top-1/2 -translate-y-1/2" : "absolute -right-3 top-1/2 -translate-y-1/2"
          )}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      <nav className="flex-grow px-3 py-6 overflow-visible">
        <div className="mb-2 px-3">
          <p className={cn("text-xs font-medium text-gray-400 uppercase tracking-wider transition-opacity duration-200", isCollapsed ? "opacity-0 h-0" : "opacity-100")}>
            Menu
          </p>
        </div>
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon as LucideIcon;
            const hasOnClick = 'onClick' in item && item.onClick;
            
            return (
              <li key={item.label}>
                {hasOnClick ? (
                  <button
                    onClick={item.onClick}
                    className={cn(
                      "group relative flex items-center justify-start px-3 py-2.5 rounded-xl transition-all duration-200 w-full",
                      "text-gray-500 hover:bg-gray-50",
                      isActive && "bg-indigo-50/80 text-indigo-600 shadow-sm shadow-indigo-100"
                    )}
                  >
                    <div className={cn("flex items-center justify-center min-w-[20px]")}>
                      <Icon
                        size={20}
                        strokeWidth={isActive ? 2.5 : 2}
                        className={cn(
                          "transition-all duration-200",
                          isActive
                            ? "text-indigo-600 scale-100"
                            : "text-gray-400 group-hover:text-gray-600 group-hover:scale-105"
                        )}
                      />
                    </div>
                    <span
                      className={cn(
                        "overflow-hidden transition-all duration-300 whitespace-nowrap text-sm font-medium ml-3",
                        isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100",
                        isActive
                          ? "text-indigo-900"
                          : "text-gray-600 group-hover:text-gray-900"
                      )}
                    >
                      {item.label}
                    </span>
                    {/* Tooltip on Hover (Collapsed) */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg transform -translate-y-1/2 top-1/2">
                        {item.label}
                      </div>
                    )}
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      "group relative flex items-center justify-start px-3 py-2.5 rounded-xl transition-all duration-200",
                      "text-gray-500 hover:bg-gray-50",
                      isActive && "bg-indigo-50/80 text-indigo-600 shadow-sm shadow-indigo-100"
                    )}
                  >
                  <div className={cn("flex items-center justify-center min-w-[20px]")}>
                    <Icon
                      size={20}
                      strokeWidth={isActive ? 2.5 : 2}
                      className={cn(
                        "transition-all duration-200",
                        isActive
                          ? "text-indigo-600 scale-100"
                          : "text-gray-400 group-hover:text-gray-600 group-hover:scale-105"
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      "overflow-hidden transition-all duration-300 whitespace-nowrap text-sm font-medium ml-3",
                      isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100",
                      isActive
                        ? "text-indigo-900"
                        : "text-gray-600 group-hover:text-gray-900"
                    )}
                  >
                    {item.label}
                  </span>
                  {/* Tooltip on Hover (Collapsed) */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg transform -translate-y-1/2 top-1/2">
                      {item.label}
                    </div>
                  )}
                </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto p-3 space-y-1 border-t border-gray-100 bg-gray-50/30">
        <Link
          href="/docs"
          className={cn(
            "group relative flex items-center justify-start px-3 py-2.5 rounded-xl transition-all duration-200",
            "text-gray-500 hover:bg-white hover:shadow-sm",
            pathname.startsWith("/docs") &&
            "bg-white text-indigo-600 shadow-sm"
          )}
        >
          <div className={cn("flex items-center justify-center min-w-[20px]")}>
            <FileText
              size={18}
              strokeWidth={pathname.startsWith("/docs") ? 2.5 : 2}
              className={cn(
                "transition-all duration-200",
                pathname.startsWith("/docs")
                  ? "text-indigo-600"
                  : "text-gray-400 group-hover:text-gray-600"
              )}
            />
          </div>
          <span
            className={cn(
              "overflow-hidden transition-all duration-300 whitespace-nowrap text-sm font-medium ml-3",
              isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100",
              pathname.startsWith("/docs")
                ? "text-indigo-900"
                : "text-gray-600 group-hover:text-gray-900"
            )}
          >
            Documentación
          </span>
          {isCollapsed && (
            <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg transform -translate-y-1/2 top-1/2">
              Documentación
            </div>
          )}
        </Link>

        <Link
          href="/settings"
          className={cn(
            "group relative flex items-center justify-start px-3 py-2.5 rounded-xl transition-all duration-200",
            "text-gray-500 hover:bg-white hover:shadow-sm",
            pathname.startsWith("/settings") &&
            "bg-white text-indigo-600 shadow-sm"
          )}
        >
          <div className={cn("flex items-center justify-center min-w-[20px]")}>
            <Settings
              size={18}
              strokeWidth={pathname.startsWith("/settings") ? 2.5 : 2}
              className={cn(
                "transition-all duration-200",
                pathname.startsWith("/settings")
                  ? "text-indigo-600"
                  : "text-gray-400 group-hover:text-gray-600"
              )}
            />
          </div>
          <span
            className={cn(
              "overflow-hidden transition-all duration-300 whitespace-nowrap text-sm font-medium ml-3",
              isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100",
              pathname.startsWith("/settings")
                ? "text-indigo-900"
                : "text-gray-600 group-hover:text-gray-900"
            )}
          >
            Configuración
          </span>
          {isCollapsed && (
            <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-lg transform -translate-y-1/2 top-1/2">
              Configuración
            </div>
          )}
        </Link>
        
        <div className={cn("pt-2 flex justify-center", isCollapsed ? "" : "justify-start px-1")}>
          <UserAvatar showName={!isCollapsed} />
        </div>
      </div>
      
      <AdminPasswordModal open={showPasswordModal} onOpenChange={setShowPasswordModal} />
    </aside>
  );
};

export default Sidebar;
