import type { Metadata } from "next";
import HomeContent from "@/components/home-content";
import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Camella | Motor de Búsqueda Empresarial",
  description: "Busca, audita y conecta con empresas, sin abogados ni terceros a la velocidad de la luz.",
  keywords: [
    'camella',
    'planes ventas b2b',
    'ventas b2b',
    'ventas con ia',
    'auditoria empresas',
    'auditoria ia',
    'ecuador',
    'prospectos',
    'empresas ecuatorianas',
    'inteligencia artificial',
    'agente comercial ia',
    'prospectos empresas',
    'gemini 3 pro gratis',
    'ventas inteligentes',
  ],
  openGraph: {
    title: "Camella | Motor de Búsqueda Empresarial",
    description: "Busca, audita y conecta con empresas, sin abogados ni terceros a la velocidad de la luz.",
    images: ['/logo.png'],
  },
  alternates: {
    canonical: '/',
  },
};

export default async function Home() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <HomeContent initialUser={user ?? null} />;
}
