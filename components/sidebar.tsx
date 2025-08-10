"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, Building, MessageSquare, CreditCard, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import UserAvatar from "./user-avatar";

const Sidebar = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", icon: <Home size={20} />, label: "Consola" },
    { href: "/offerings", icon: <Package size={20} />, label: "Servicios" },
    { href: "/companies", icon: <Building size={20} />, label: "Empresas" },
    { href: "/chat", icon: <MessageSquare size={20} />, label: "Asistente" },
    { href: "/pricing", icon: <CreditCard size={20} />, label: "Suscripción" },
  ];

  return (
    <aside
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className={cn(
        "fixed top-0 left-0 h-full bg-white text-gray-500 transition-all duration-300 ease-in-out z-50 border-r border-gray-400 flex flex-col",
        isExpanded ? "w-40" : "w-16"
      )}
    >
      {isExpanded ? (
        <div className="flex items-center justify-center h-16 text-xl font-semibold text-gray-700">
          Acquira
        </div>
      ) : (
        <div className="flex items-center justify-center h-16 text-xl font-bold text-gray-700">
          A
        </div>
      )}

      <nav className="flex-grow px-2 py-6">
        <ul className="space-y-6">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center p-2 rounded-md transition-colors duration-200 border border-transparent",
                    "text-gray-500 hover:bg-gray-100 hover:text-gray-900 hover:border-gray-200",
                    isActive && "bg-gray-100 text-gray-900 font-medium border-gray-200",
                    isExpanded ? "justify-start" : "justify-center"
                  )}
                >
                  {item.icon}
                  <span
                    className={cn(
                      "overflow-hidden transition-all duration-200",
                      isExpanded ? "w-full ml-3" : "w-0"
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
          href="/settings"
          className={cn(
            "flex items-center p-2 rounded-md transition-colors duration-200 border border-transparent",
            "text-gray-500 hover:bg-gray-100 hover:text-gray-900 hover:border-gray-200",
            pathname.startsWith("/settings") && "bg-gray-100 text-gray-900 font-medium border-gray-200",
            isExpanded ? "justify-start" : "justify-center"
          )}
        >
          <Settings size={20} />
          <span
            className={cn(
              "overflow-hidden transition-all duration-200",
              isExpanded ? "w-full ml-3" : "w-0"
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
