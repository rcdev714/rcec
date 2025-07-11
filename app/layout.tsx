import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Suspense } from "react";
import LoadingSpinner from "@/components/loading-spinner";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Aplicación de Empresas - Descubre y Gestiona Empresas",
  description: "Una aplicación web para descubrir, gestionar y explorar empresas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Suspense fallback={<LoadingSpinner />}>
            {children}
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
