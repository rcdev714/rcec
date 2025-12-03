"use client";

import { Suspense, useState } from "react";
import Sidebar from "@/components/sidebar";
import LoadingSpinner from "@/components/loading-spinner";
import Onboarding from "@/components/onboarding";
import TermsAndConditionsModal from "@/components/terms-and-conditions-modal";
import { usePathname } from "next/navigation";
import { shouldRenderAppShell } from "@/lib/routes";

export default function ClientLayout({
  children,
  isAdmin = false,
}: {
  children: React.ReactNode;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const shouldRenderSidebar = shouldRenderAppShell(pathname);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="flex min-h-screen">
      {shouldRenderSidebar && (
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          toggleSidebar={toggleSidebar}
          isAdmin={isAdmin}
        />
      )}
      <main
        className={`flex-1 transition-all duration-300 ease-in-out ${shouldRenderSidebar
          ? (isSidebarCollapsed ? "ml-16" : "ml-16 md:ml-48")
          : "ml-0"
          }`}
      >
        <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
      </main>
      {/* Onboarding modal - shows for authenticated users on first visit */}
      <Onboarding />
      <TermsAndConditionsModal />
    </div>
  );
}
