"use client";

import { Suspense } from "react";
import Sidebar from "@/components/sidebar";
import LoadingSpinner from "@/components/loading-spinner";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-14">
        <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
      </main>
    </div>
  );
}

