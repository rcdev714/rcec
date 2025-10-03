import type { Metadata } from "next";
import DocsPageClient from "@/components/docs-client";

export const metadata: Metadata = {
  title: "Documentación",
  description: "Documentación completa de Camella. Aprende a usar nuestro asistente de IA, la base de datos de empresas, y a gestionar tus servicios para potenciar tus ventas B2B en Ecuador.",
  alternates: {
    canonical: '/docs',
  },
};

export default function DocsPage() {
  return <DocsPageClient />;
}
