"use client";

import { Suspense } from "react";
import Sidebar from "@/components/sidebar";
import LoadingSpinner from "@/components/loading-spinner";
import Onboarding from "@/components/onboarding";
import { usePathname } from "next/navigation";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Don't show sidebar on landing page, auth pages, or any other public pages
  const shouldRenderSidebar = pathname !== "/" && !pathname.startsWith("/auth") && !pathname.startsWith("/s/");
  
  return (
    <div className="flex min-h-screen">
      {shouldRenderSidebar && <Sidebar />}
      <main
        className={`flex-1 ${
          shouldRenderSidebar ? "ml-16 md:ml-48" : "ml-0"
        }`}
      >
        <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
      </main>
      {/* Onboarding modal - shows for authenticated users on first visit */}
      <Onboarding />
    </div>
  );
}

