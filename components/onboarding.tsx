"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronRight, ChevronLeft, X, Play, Rocket, MessageSquare, Building2, LayoutDashboard, Package, Brain } from "lucide-react";

// Onboarding version - increment to re-show onboarding to all users
const ONBOARDING_VERSION = "v1";

// Content configuration for each route
type OnboardingSlide = {
  title: string;
  description: string;
  bullets?: string[];
  videoSrc?: string;
  icon?: React.ElementType;
};

type OnboardingEntry = {
  title: string;
  description: string;
  videoSrc?: string;
  icon?: React.ElementType;
};

// Global onboarding slides (shown once on first login)
const globalOnboardingSlides: OnboardingSlide[] = [
  {
    title: "¡Bienvenido a Camella!",
    description: "Tu plataforma B2B para encontrar y conectar con empresas ecuatorianas usando Inteligencia Artificial.",
    bullets: [
      "Accede a +300,000 empresas ecuatorianas",
      "Busca con IA conversacional",
      "Conecta con decision makers directamente"
    ],
    videoSrc: "/onboarding/overview.mp4",
    icon: Rocket,
  },
  {
    title: "¿Cómo funciona?",
    description: "Camella combina datos empresariales actualizados con inteligencia artificial para potenciar tu estrategia comercial.",
    bullets: [
      "Pregunta al Asistente IA en lenguaje natural",
      "Filtra empresas por industria, tamaño, ubicación",
      "Exporta listas y contacta decision makers"
    ],
    videoSrc: "/onboarding/how-it-works.mp4",
    icon: Brain,
  },
  {
    title: "Comienza ahora",
    description: "Explora las diferentes secciones de la plataforma y descubre todo lo que Camella puede hacer por ti.",
    bullets: [
      "Dashboard: Monitorea tu uso y suscripción",
      "Asistente: Haz preguntas con IA",
      "Empresas: Busca y filtra tu mercado objetivo"
    ],
    icon: Play,
  },
];

// Per-page onboarding content
const onboardingContentByRoute: Record<string, OnboardingEntry> = {
  dashboard: {
    title: "Dashboard",
    description: "Aquí puedes monitorear tu plan actual, uso de la plataforma y estado de suscripción. Mantén el control de tus límites mensuales.",
    videoSrc: "/onboarding/dashboard.mp4",
    icon: LayoutDashboard,
  },
  chat: {
    title: "Asistente IA",
    description: "Conversa con nuestro asistente inteligente para encontrar empresas, redactar correos y obtener insights accionables. Pregunta en lenguaje natural.",
    videoSrc: "/onboarding/chat.mp4",
    icon: MessageSquare,
  },
  companies: {
    title: "Base de Empresas",
    description: "Busca, filtra y explora empresas ecuatorianas con filtros avanzados. Exporta listas completas con datos de contacto y financieros.",
    videoSrc: "/onboarding/companies.mp4",
    icon: Building2,
  },
  offerings: {
    title: "Gestión de Servicios",
    description: "Crea perfiles de tus productos/servicios y define tu cliente ideal. El sistema te sugerirá prospectos automáticamente.",
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
  const [showGlobalOnboarding, setShowGlobalOnboarding] = useState(false);
  const [showPageOnboarding, setShowPageOnboarding] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Get current route segment (e.g., "dashboard", "chat")
  const routeSegment = pathname.split("/")[1] || "";

  // Get page-specific content
  const pageContent = onboardingContentByRoute[routeSegment];

  useEffect(() => {
    const initOnboarding = async () => {
      // Get authenticated user
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      setUserId(user.id);

      // Check if we should show global onboarding
      const globalKey = getStorageKey(user.id, "global");
      const hasSeenGlobal = localStorage.getItem(globalKey) === "done";

      if (!hasSeenGlobal && routeSegment) {
        setShowGlobalOnboarding(true);
        setIsLoading(false);
        return;
      }

      // Check if we should show page-specific onboarding
      if (routeSegment && pageContent) {
        const pageKey = getStorageKey(user.id, routeSegment);
        const hasSeenPage = localStorage.getItem(pageKey) === "done";

        if (!hasSeenPage) {
          setShowPageOnboarding(true);
        }
      }

      setIsLoading(false);
    };

    initOnboarding();
  }, [pathname, routeSegment, pageContent]);

  const markGlobalComplete = () => {
    if (userId) {
      const globalKey = getStorageKey(userId, "global");
      localStorage.setItem(globalKey, "done");
      setShowGlobalOnboarding(false);
      setCurrentSlide(0);

      // After global onboarding, check if we should show page onboarding
      if (routeSegment && pageContent) {
        const pageKey = getStorageKey(userId, routeSegment);
        const hasSeenPage = localStorage.getItem(pageKey) === "done";
        if (!hasSeenPage) {
          setTimeout(() => setShowPageOnboarding(true), 300);
        }
      }
    }
  };

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

  const skipGlobalOnboarding = () => {
    markGlobalComplete();
  };

  const nextSlide = () => {
    if (currentSlide < globalOnboardingSlides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      markGlobalComplete();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  if (isLoading) {
    return null;
  }

  // Global onboarding modal (multi-slide)
  if (showGlobalOnboarding) {
    const slide = globalOnboardingSlides[currentSlide];
    const Icon = slide.icon;

    return (
      <Dialog open={showGlobalOnboarding} onOpenChange={() => {}}>
        <DialogContent className="max-w-2xl">
          <div className="absolute top-4 right-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={skipGlobalOnboarding}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <DialogHeader>
            <div className="flex items-center space-x-3">
              {Icon && (
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <Icon className="h-6 w-6 text-gray-900" />
                </div>
              )}
              <div className="text-2xl font-semibold">
                <DialogTitle>{slide.title}</DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Video placeholder */}
            {slide.videoSrc && (
              <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <video
                  className="w-full h-full object-cover"
                  controls
                  poster="/placeholder-video.png"
                >
                  <source src={slide.videoSrc} type="video/mp4" />
                  Tu navegador no soporta el elemento de video.
                </video>
              </div>
            )}

            {/* Description */}
            <div>
              <p className="text-gray-700 text-base">{slide.description}</p>
            </div>

            {/* Bullets */}
            {slide.bullets && slide.bullets.length > 0 && (
              <ul className="space-y-2">
                {slide.bullets.map((bullet, idx) => (
                  <li key={idx} className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-900 mt-2 flex-shrink-0" />
                    <span className="text-gray-700">{bullet}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Progress dots */}
            <div className="flex justify-center space-x-2 pt-4">
              {globalOnboardingSlides.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentSlide
                      ? "w-8 bg-gray-900"
                      : "w-2 bg-gray-300"
                  }`}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center pt-4 border-t">
              <Button
                variant="ghost"
                onClick={prevSlide}
                disabled={currentSlide === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>

              <Button onClick={skipGlobalOnboarding} variant="ghost">
                Omitir
              </Button>

              <Button onClick={nextSlide}>
                {currentSlide === globalOnboardingSlides.length - 1
                  ? "Comenzar"
                  : "Siguiente"}
                {currentSlide < globalOnboardingSlides.length - 1 && (
                  <ChevronRight className="h-4 w-4 ml-1" />
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Page-specific onboarding modal (single slide)
  if (showPageOnboarding && pageContent) {
    const Icon = pageContent.icon;

    return (
      <Dialog open={showPageOnboarding} onOpenChange={() => {}}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <div className="flex items-center space-x-3">
              {Icon && (
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-gray-900" />
                </div>
              )}
              <div className="text-xl font-semibold">
                <DialogTitle>{pageContent.title}</DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Video placeholder */}
            {pageContent.videoSrc && (
              <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <video
                  className="w-full h-full object-cover"
                  controls
                  poster="/placeholder-video.png"
                >
                  <source src={pageContent.videoSrc} type="video/mp4" />
                  Tu navegador no soporta el elemento de video.
                </video>
              </div>
            )}

            {/* Description */}
            <p className="text-gray-700">{pageContent.description}</p>

            {/* Don't show again checkbox */}
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="dont-show"
                checked={dontShowAgain}
                onCheckedChange={(checked) => setDontShowAgain(checked === true)}
              />
              <label
                htmlFor="dont-show"
                className="text-sm text-gray-600 cursor-pointer"
              >
                No volver a mostrar este mensaje
              </label>
            </div>

            {/* Action button */}
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={markPageComplete}>Entendido</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}

