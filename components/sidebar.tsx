"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, Building, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import UserAvatar from "./user-avatar";

interface SidebarProps {}

const Sidebar = ({}: SidebarProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", icon: <Home size={20} />, label: "Consola" },
    { href: "/offerings", icon: <Package size={20} />, label: "Servicios" },
    { href: "/companies", icon: <Building size={20} />, label: "Empresas" },
    { href: "/chat", icon: <MessageSquare size={20} />, label: "Asistente" },
  ];

  return (
    <aside
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className={cn(
        "fixed top-0 left-0 h-full bg-white text-gray-400 transition-all duration-300 ease-in-out z-50 border-r flex flex-col",
        isExpanded ? "w-48" : "w-20"
      )}
    >
      {isExpanded ? (
        <div className="flex items-center justify-center h-20 text-2xl font-semibold text-gray-600">
          Acquira
        </div>
      ) : (
        <div className="flex items-center justify-center h-20 text-2xl font-bold text-gray-600">
          A
        </div>
      )}

      <nav className="flex-grow px-2 py-4">
        <ul className="space-y-6">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center p-3 rounded-lg transition-colors duration-200",
                    "text-gray-00 border border-gray-200 hover:bg-gray-200 hover:text-gray-200",
                    isActive && "bg-gray-200 text-gray-200 font-semibold",
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

      <div className="mt-auto p-4 flex justify-center items-center">
        <UserAvatar />
      </div>
    </aside>
  );
};

export default Sidebar;
