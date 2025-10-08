import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import ClientLayout from "@/components/client-layout";
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Ensure no double protocol and normalize the URL
const defaultUrl = baseUrl.startsWith('http://') || baseUrl.startsWith('https://')
  ? baseUrl
  : `https://${baseUrl}`;

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: {
    default: 'Camella | Tu Agente Personal de Ventas',
    template: '%s | Camella',
  },
  description: "Encuentra prospectos B2B ideales en Ecuador con nuestro Agente Personal de Ventas. Accede a datos de más de 300,000 empresas, optimiza tu prospección y cierra más ventas.",
  keywords: ['b2b', 'ventas', 'ecuador', 'prospectos', 'empresas ecuatorianas', 'inteligencia artificial', 'finanzas'],
  authors: [{ name: 'Camella' }],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'es_EC',
    url: defaultUrl,
    siteName: 'Camella.app',
    title: 'Camella | Tu Agente Personal de Ventas B2B en Ecuador',
    description: 'Aumenta tus ventas B2B en Ecuador. Camella te conecta con empresas ideales usando inteligencia artificial.',
    images: [
      {
        url: '/logo.png',
        alt: 'Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Camella | Ventas B2B Inteligentes en Ecuador',
    description: 'Descubre prospectos, analiza empresas y cierra más negocios en Ecuador con la ayuda de IA.',
    images: [`${defaultUrl}/logo.png`],
  },
  alternates: {
    canonical: defaultUrl,
  },
  icons: {
    icon: '/logo.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={inter.variable} suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClientLayout>{children}</ClientLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
