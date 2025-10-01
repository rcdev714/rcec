"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Package, Building, CreditCard, Settings, Sparkles, FileText, LucideIcon, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import UserAvatar from "./user-avatar";

const Sidebar = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/chat", icon: Sparkles, label: "Asistente" },
    { href: "/offerings", icon: Package, label: "Servicios" },
    { href: "/companies", icon: Building, label: "Empresas" },
    { href: "/pricing", icon: CreditCard, label: "Suscripción" },
  ];

  return (
    <aside
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className={cn(
        "fixed top-0 left-0 h-full bg-white text-gray-500 transition-all duration-300 ease-in-out z-50 border-r border-gray-400 flex flex-col",
        isExpanded ? "w-48" : "w-16"
      )}
    >
      <div className="flex items-center justify-center h-16 p-2">
        <div className={cn("flex items-center gap-2", isExpanded ? "" : "justify-center") }>
          <Image src="/logo.png" alt="Camella Logo" width={40} height={40} />
          {isExpanded && (
            <span className="text-gray-900 font-semibold tracking-tight">Camella</span>
          )}
        </div>
      </div>

      <nav className="flex-grow px-2 py-6">
        <ul className="space-y-6">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon as LucideIcon;
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={cn(
                    "group relative flex items-center justify-center p-2 rounded-md transition-colors duration-200",
                    "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                    isActive && "bg-gray-100 text-gray-900 font-medium border border-gray-200"
                  )}
                >
                  <span
                    className={cn(
                      "absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full opacity-0 transition-all duration-200",
                      isExpanded ? "" : "",
                      isActive ? "opacity-100 bg-gray-900" : "group-hover:opacity-100 bg-gray-300"
                    )}
                  />
                  <div className={cn("flex items-center", isExpanded ? "" : "w-full justify-center")}>
                    <Icon
                      size={20}
                      className={cn(
                        "transition-colors transform duration-200",
                        isActive ? "text-gray-900 scale-105" : "text-gray-500 group-hover:text-gray-900 group-hover:scale-105"
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      "overflow-hidden transition-all duration-200 whitespace-nowrap text-gray-700 group-hover:text-gray-900",
                      isExpanded ? "w-auto ml-3" : "w-0",
                      isActive && "text-gray-900"
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
            "group relative flex items-center p-2 rounded-md transition-colors duration-200",
            "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
            pathname.startsWith("/docs") && "bg-gray-100 text-gray-900 font-medium border border-gray-200",
            isExpanded ? "justify-start" : "justify-center"
          )}
        >
          <span
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full opacity-0 transition-all duration-200",
              pathname.startsWith("/docs") ? "opacity-100 bg-gray-900" : "group-hover:opacity-100 bg-gray-300"
            )}
          />
          <FileText
            size={20}
            className={cn(
              "transition-colors transform duration-200",
              pathname.startsWith("/docs") ? "text-gray-900 scale-105" : "text-gray-500 group-hover:text-gray-900 group-hover:scale-105"
            )}
          />
          <span
            className={cn(
              "overflow-hidden transition-all duration-200 whitespace-nowrap text-gray-700 group-hover:text-gray-900",
              isExpanded ? "w-auto ml-3" : "w-0",
              pathname.startsWith("/docs") && "text-gray-900"
            )}
          >
            Documentación
          </span>
        </Link>
        <Link
          href="/settings"
          className={cn(
            "group relative flex items-center p-2 rounded-md transition-colors duration-200",
            "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
            pathname.startsWith("/settings") && "bg-gray-100 text-gray-900 font-medium border border-gray-200",
            isExpanded ? "justify-start" : "justify-center"
          )}
        >
          <span
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full opacity-0 transition-all duration-200",
              pathname.startsWith("/settings") ? "opacity-100 bg-gray-900" : "group-hover:opacity-100 bg-gray-300"
            )}
          />
          <Settings
            size={20}
            className={cn(
              "transition-colors transform duration-200",
              pathname.startsWith("/settings") ? "text-gray-900 scale-105" : "text-gray-500 group-hover:text-gray-900 group-hover:scale-105"
            )}
          />
          <span
            className={cn(
              "overflow-hidden transition-all duration-200 whitespace-nowrap text-gray-700 group-hover:text-gray-900",
              isExpanded ? "w-auto ml-3" : "w-0",
              pathname.startsWith("/settings") && "text-gray-900"
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
