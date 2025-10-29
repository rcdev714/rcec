"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MessageSquare, Building2, LayoutDashboard, Package } from "lucide-react";

// Onboarding version - increment to re-show onboarding to all users
const ONBOARDING_VERSION = "v1";

type OnboardingEntry = {
  title: string;
  description: string;
  features?: string[];
  planInfo?: string;
  videoSrc?: string;
  icon?: React.ElementType;
};

// Per-page onboarding content
const onboardingContentByRoute: Record<string, OnboardingEntry> = {
  dashboard: {
    title: "Dashboard",
    description: "Monitorea tu uso mensual de búsquedas y conversaciones con el Agente. Gestiona tu suscripción y analiza tu actividad.",
    features: [
      "Visualiza métricas de uso en tiempo real",
      "Gestiona tu plan y suscripción",
      "Accede a analíticas avanzadas de actividad"
    ],
    planInfo: "Plan Gratuito: $5.00 en tokens/mes y 10 búsquedas/mes. Actualiza a Pro ($20/mes) o Empresarial ($200/mes) para búsqueda ilimitada, acceso a LinkedIn, modelo de razonamiento avanzado y analíticas avanzadas.",
    videoSrc: "/onboarding/dashboard.mp4",
    icon: LayoutDashboard,
  },
  chat: {
    title: "Agente",
    description: "Tu agente te ayuda a buscar, analizar y conectar con mas de 300K empresas en segundos. Puedes preguntarle sobre las empresas, sus estados financieros, contactos, etc.",
    features: [
      "Busca, Analiza y Conecta con mas de 300K empresas en segundos",
      "Pregunta sobre las empresas, sus estados financieros, contactos, etc.",
      "Contacta directamente a los decision makers de la empresa"
    ],
    planInfo: "Los planes Pro y Empresarial incluyen acceso al modelo de razonamiento avanzado para análisis más profundos y complejos. Ademas de acceso a LinkedIn.",
    videoSrc: "/onboarding/chat.mp4",
    icon: MessageSquare,
  },
  companies: {
    title: "Base de Empresas",
    description: "Busca, filtra y explora empresas ecuatorianas con filtros financieros avanzados y acceso a más de 300,000 empresas.",
    features: [
      "Más de 14 filtros financieros avanzados",
      "Exporta listas completas con datos de contacto",
      "Contacta directamente a los decision makers"
    ],
    planInfo: "El Plan Gratuito incluye 10 búsquedas por mes. Actualiza tu plan para obtener búsqueda ilimitada.",
    videoSrc: "/onboarding/companies.mp4",
    icon: Building2,
  },
  offerings: {
    title: "Gestión de Servicios",
    description: "Crea perfiles profesionales de tus productos o servicios y facilita el contacto con potenciales clientes.",
    features: [
      "Define tu cliente ideal y perfil de negocio",
      "Establece precios y información pública",
      "Comparte un link personalizado para facilitar el contacto"
    ],
    videoSrc: "/onboarding/offerings.mp4",
    icon: Package,
  },
};

// Helper to get localStorage key
const getStorageKey = (userId: string, scope: string) => 
  `onb:${ONBOARDING_VERSION}:${userId}:${scope}`;

export default function Onboarding() {
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);
  const [showPageOnboarding, setShowPageOnboarding] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Get current route segment (e.g., "dashboard", "chat")
  const routeSegment = pathname.split("/")[1] || "";

  // Get page-specific content
  const pageContent = onboardingContentByRoute[routeSegment];

  useEffect(() => {
    const initOnboarding = async () => {
      const supabase = createClient();
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Error fetching user for onboarding:', error);
          setIsLoading(false);
          return;
        }

        if (!user) {
          setIsLoading(false);
          return;
        }

        setUserId(user.id);

        // Check if we should show page-specific onboarding
        if (routeSegment && pageContent) {
          const pageKey = getStorageKey(user.id, routeSegment);
          const hasSeenPage = localStorage.getItem(pageKey) === "done";

          if (!hasSeenPage) {
            setShowPageOnboarding(true);
          }
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Failed to initialize onboarding:', err);
        setIsLoading(false);
      }
      
      // Subscribe to auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          setUserId(session?.user?.id ?? null);
        }
      );
      
      return () => {
        subscription.unsubscribe();
      };
    };

    initOnboarding();
  }, [pathname, routeSegment, pageContent]);

  const markPageComplete = () => {
    if (userId && routeSegment) {
      const pageKey = getStorageKey(userId, routeSegment);
      if (dontShowAgain) {
        localStorage.setItem(pageKey, "done");
      }
      setShowPageOnboarding(false);
      setDontShowAgain(false);
    }
  };

  if (isLoading) {
    return null;
  }

  // Page-specific onboarding modal
  if (showPageOnboarding && pageContent) {
    const Icon = pageContent.icon;

    return (
      <Dialog open={showPageOnboarding} onOpenChange={() => {}}>
        <DialogContent className="max-w-[95vw] md:max-w-[1400px] w-full p-0 overflow-hidden border border-gray-200">
          {/* Video */}
          {pageContent.videoSrc && (
            <div className="bg-black">
              <video
                className="w-full h-auto"
                controls
                autoPlay
                muted
                style={{ maxHeight: '80vh' }}
              >
                <source src={pageContent.videoSrc} type="video/mp4" />
                Tu navegador no soporta el elemento de video.
              </video>
            </div>
          )}

          {/* Content */}
          <div className="p-8 md:p-10">
            <DialogHeader>
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  {Icon && (
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-6 w-6 text-gray-900" />
                    </div>
                  )}
                  <DialogTitle className="text-2xl font-semibold text-gray-900">
                    {pageContent.title}
                  </DialogTitle>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="dont-show"
                      checked={dontShowAgain}
                      onCheckedChange={(checked) => setDontShowAgain(checked === true)}
                    />
                    <label htmlFor="dont-show" className="text-xs text-gray-600 cursor-pointer whitespace-nowrap">
                      No volver a mostrar
                    </label>
                  </div>
                  <Button 
                    onClick={markPageComplete}
                    variant="outline"
                    size="sm"
                  >
                    Entendido
                  </Button>
                </div>
              </div>
            </DialogHeader>

            {/* Description */}
            <div className="mb-6">
              <p className="text-gray-700 text-base leading-relaxed">
                {pageContent.description}
              </p>
            </div>

            {/* Features */}
            {pageContent.features && pageContent.features.length > 0 && (
              <div className="mb-6 space-y-2">
                {pageContent.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-900 mt-2 flex-shrink-0" />
                    <span className="text-gray-700 text-sm leading-relaxed">{feature}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Plan Info */}
            {pageContent.planInfo && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-700 text-sm leading-relaxed">
                  {pageContent.planInfo}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}

