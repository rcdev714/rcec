import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import Script from "next/script";
import "./globals.css";
import ClientLayout from "@/components/client-layout";
import { Inter } from 'next/font/google';
import { getDefaultUrl } from "@/lib/base-url";
import { isAdmin } from "@/lib/admin";

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const defaultUrl = getDefaultUrl();

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: {
    default: 'Camella | Agente Empresarial',
    template: '%s | Camella',
  },
  description: "Busca, audita y conecta con empresas, sin abogados ni terceros a la velocidad de la luz.",
  keywords: [
    'camella',
    'b2b',
    'ventas ia',
    'ecuador',
    'prospectos',
    'empresas ecuatorianas',
    'inteligencia artificial',
    'finanzas',
    'agente comercial ia',
    'gemini 3 pro',
    'prospeccion empresas',
    'ventas con ia',
    'auditoria empresas',
    'auditoria ia',
    'busqueda de empresas',
    'busqueda de contactos',
    'busqueda de leads',
    'busqueda de clientes',
    'busqueda de oportunidades',
    'busqueda de mercado',
    'busqueda de negocios',
    'busqueda de inversiones',
  ],
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
    title: 'Camella | Agente Empresarial',
    description: 'Busca, audita y conecta con empresas, sin abogados ni terceros a la velocidad de la luz.',
    images: [
      {
        url: '/HeroImage.jpeg',
        width: 1200,
        height: 630,
        alt: 'Camella - Agente Empresarial',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Camella | Agente Empresarial',
    description: 'Busca, audita y conecta con empresas, sin abogados ni terceros a la velocidad de la luz.',
    images: [`${defaultUrl}/HeroImage.jpeg`],
  },
  alternates: {
    canonical: defaultUrl,
  },
  icons: {
    icon: '/logo.svg',
  },
};

export default async function RootLayout({
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
          <ClientLayout isAdmin={await isAdmin()}>{children}</ClientLayout>
        </ThemeProvider>
        <Script
          src="https://js.stripe.com/v3/pricing-table.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
