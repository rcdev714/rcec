import type { Metadata } from "next";
import HomeContent from "@/components/home-content";

export const metadata: Metadata = {
  title: "Camella | Tu Agente Personal de Ventas B2B en Ecuador",
  description: "Encuentra prospectos B2B ideales en Ecuador con nuestro asistente de IA. Accede a datos de más de 300,000 empresas, optimiza tu prospección y cierra más ventas.",
  openGraph: {
    title: "Camella | Tu Agente Personal de Ventas B2B en Ecuador",
    description: "Aumenta tus ventas B2B en Ecuador. Camella te conecta con empresas ideales usando inteligencia artificial.",
    images: ['/logo.png'],
  },
  alternates: {
    canonical: '/',
  },
};

export default function Home() {
  return <HomeContent />;
}
