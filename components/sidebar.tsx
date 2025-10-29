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
import { useState } from "react";

const Sidebar = () => {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/chat", icon: Infinity, label: "Agente" },
    { href: "/offerings", icon: Package, label: "Servicios" },
    { href: "/companies", icon: Building, label: "Empresas" },
    { href: "/pricing", icon: CreditCard, label: "Suscripción" },
  ];

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 h-full bg-white text-gray-500 transition-all duration-300 ease-in-out z-50 border-r border-gray-200 flex flex-col",
        isCollapsed ? "w-16" : "w-16 md:w-48"
      )}
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-center h-16 relative">
        <div className={cn("flex items-center gap-2")}>
          <Image src="/logo.svg" alt="Camella Logo" width={28} height={28} />
          <Image
            src="/camella-logo.svg"
            alt="Camella Logo text"
            width={75}
            height={28}
            className={cn("hidden", !isCollapsed && "md:block")}
          />
        </div>
        <button
          onClick={toggleSidebar}
          className="absolute right-[-12px] top-1/2 -translate-y-1/2 bg-white border border-gray-300 rounded-full p-1 shadow-md hover:bg-gray-100 transition-all z-10"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-grow px-2 py-6">
        <ul className="space-y-3">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon as LucideIcon;
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={cn(
                    "group relative flex items-center justify-start pl-3 pr-2 py-2 rounded-md transition-colors duration-200",
                    "text-gray-600 hover:bg-white hover:scale-105",
                    isActive && "bg-white text-gray-900 font-medium"
                  )}
                >
                  <span
                    className={cn(
                      "absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[2px] rounded-r-full opacity-0 transition-all duration-200",
                      isActive
                        ? "opacity-100 bg-indigo-500"
                        : "group-hover:opacity-100 bg-indigo-300"
                    )}
                  />
                  <div className={cn("flex items-center")}>
                    <Icon
                      size={20}
                      className={cn(
                        "transition-colors transform duration-200",
                        isActive
                          ? "text-indigo-500 hover:text-indigo-500 group-hover:text-indigo-500 scale-105"
                          : "text-gray-500 hover:text-indigo-500 group-hover:text-indigo-500 group-hover:scale-105"
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      "overflow-hidden transition-all duration-200 whitespace-nowrap text-sm",
                      isCollapsed ? "hidden" : "hidden md:inline ml-2",
                      isActive
                        ? "text-indigo-500"
                        : "text-gray-700 group-hover:text-indigo-500"
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto p-2 space-y-2">
        <Link
          href="/docs"
          className={cn(
            "group relative flex items-center justify-start pl-3 pr-2 py-2 rounded-md transition-colors duration-200",
            "text-gray-600 hover:bg-white hover:scale-105",
            pathname.startsWith("/docs") &&
              "bg-white text-gray-900 font-medium"
          )}
        >
          <span
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[2px] rounded-r-full opacity-0 transition-all duration-200",
              pathname.startsWith("/docs")
                ? "opacity-100 bg-indigo-500"
                : "group-hover:opacity-100 bg-indigo-300"
            )}
          />
          <FileText
            size={18}
            className={cn(
              "transition-colors transform duration-200",
              pathname.startsWith("/docs")
                ? "text-indigo-500 hover:text-indigo-500 group-hover:text-indigo-500 scale-105"
                : "text-gray-500 hover:text-indigo-500 group-hover:text-indigo-500 group-hover:scale-105"
            )}
          />
          <span
            className={cn(
              "overflow-hidden transition-all duration-200 whitespace-nowrap text-sm",
              isCollapsed ? "hidden" : "hidden md:inline ml-2",
              pathname.startsWith("/docs")
                ? "text-indigo-500"
                : "text-gray-700 group-hover:text-indigo-500"
            )}
          >
            Documentación
          </span>
        </Link>
        <Link
          href="/settings"
          className={cn(
            "group relative flex items-center justify-start pl-3 pr-2 py-2 rounded-md transition-colors duration-200",
            "text-gray-600 hover:bg-white hover:scale-105",
            pathname.startsWith("/settings") &&
              "bg-white text-gray-900 font-medium"
          )}
        >
          <span
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[2px] rounded-r-full opacity-0 transition-all duration-200",
              pathname.startsWith("/settings")
                ? "opacity-100 bg-indigo-500"
                : "group-hover:opacity-100 bg-indigo-300"
            )}
          />
          <Settings
            size={18}
            className={cn(
              "transition-colors transform duration-200",
              pathname.startsWith("/settings")
                ? "text-indigo-500 hover:text-indigo-500 group-hover:text-indigo-500 scale-105"
                : "text-gray-500 hover:text-indigo-500 group-hover:text-indigo-500 group-hover:scale-105"
            )}
          />
          <span
            className={cn(
              "overflow-hidden transition-all duration-200 whitespace-nowrap text-sm",
              isCollapsed ? "hidden" : "hidden md:inline ml-2",
              pathname.startsWith("/settings")
                ? "text-indigo-500"
                : "text-gray-700 group-hover:text-indigo-500"
            )}
          >
            Configuración
          </span>
        </Link>
        <div className="flex justify-center items-center">
          <UserAvatar />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
