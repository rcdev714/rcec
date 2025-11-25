"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { requiresTermsAcceptance } from "@/lib/routes";
import { CURRENT_TERMS_VERSION, TERMS_SECTIONS } from "@/lib/terms";

type TermsStatusResponse = {
  accepted: boolean;
  acceptance: {
    accepted_at?: string;
    terms_version: string;
  } | null;
  currentVersion: string;
};

export default function TermsAndConditionsModal() {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const shouldGate = requiresTermsAcceptance(pathname);

  const [hasAccepted, setHasAccepted] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isChecked, setIsChecked] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!shouldGate) {
      setHasAccepted(true);
      setIsLoading(false);
      return;
    }

    const fetchStatus = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/user/terms", {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
        });

        if (!isMounted) return;

        if (response.status === 401) {
          setHasAccepted(true);
          return;
        }

        if (!response.ok) {
          console.error("Failed to verify terms acceptance:", await response.text());
          setHasAccepted(false);
          setError("No pudimos verificar tu aceptación. Intenta nuevamente.");
          return;
        }

        const payload = (await response.json()) as TermsStatusResponse;
        setHasAccepted(payload.accepted);
      } catch (err) {
        console.error("Unexpected error while checking terms acceptance:", err);
        if (!isMounted) return;
        setHasAccepted(false);
        setError("No pudimos verificar tu aceptación. Revisa tu conexión e inténtalo otra vez.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchStatus();

    return () => {
      isMounted = false;
    };
  }, [shouldGate, refreshKey]);

  useEffect(() => {
    if (hasAccepted === false) {
      setIsChecked(false);
      setHasScrolledToBottom(false);
    }
  }, [hasAccepted]);

  useEffect(() => {
    if (hasAccepted !== false) return;
    const scrollable = contentRef.current;
    if (!scrollable) return;

    const handleScroll = () => {
      const reachedBottom =
        scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 16;
      setHasScrolledToBottom(reachedBottom);
    };

    handleScroll();
    scrollable.addEventListener("scroll", handleScroll);

    return () => {
      scrollable.removeEventListener("scroll", handleScroll);
    };
  }, [hasAccepted]);

  const handleAccept = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const response = await fetch("/api/user/terms", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ termsVersion: CURRENT_TERMS_VERSION }),
      });

      if (response.status === 401) {
        await supabase.auth.signOut();
        window.location.href = "/auth/login";
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error ?? "No pudimos registrar tu aceptación. Intenta de nuevo.");
        return;
      }

      setHasAccepted(true);
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error("Failed to save terms acceptance:", err);
      setError("Ocurrió un error inesperado. Por favor vuelve a intentarlo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      window.location.href = "/auth/login";
    }
  };

  const modalOpen = shouldGate && !isLoading && hasAccepted === false;
  const acceptDisabled = isSubmitting || !isChecked || !hasScrolledToBottom;

  if (!modalOpen) {
    return null;
  }

  return (
    <Dialog open={modalOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] md:h-auto md:max-h-[85vh] p-0 gap-0 overflow-hidden border-none shadow-2xl bg-white sm:rounded-2xl flex flex-col">
        <DialogHeader className="flex-none px-6 py-5 md:px-8 md:py-6 border-b border-gray-100 bg-white/80 backdrop-blur-sm z-10">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 font-kalice">
                Términos y Condiciones
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-1.5 font-medium">
                Versión {CURRENT_TERMS_VERSION} — Última actualización
              </p>
            </div>
            <div className="hidden md:block px-3 py-1 bg-gray-100 rounded-full text-xs font-semibold text-gray-600">
              Documento Legal
            </div>
          </div>
        </DialogHeader>

        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto min-h-0 bg-gray-50/50 p-6 md:p-10 text-sm leading-relaxed text-gray-600 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent"
        >
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="prose prose-sm prose-gray max-w-none">
              <p className="text-gray-500 mb-8 italic">
                Por favor, lee detenidamente este documento. Contiene información importante sobre tus derechos,
                obligaciones y el uso de los servicios de Camella.
              </p>
              
              {TERMS_SECTIONS.map((section, index) => (
                <section key={section.title} className="group">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-900 text-[10px] font-bold text-white shadow-sm">
                      {index + 1}
                    </span>
                    {section.title}
                  </h3>
                  <div className="pl-9 space-y-4">
                    {section.paragraphs.map((paragraph, pIndex) => (
                      <p key={pIndex} className="text-justify text-gray-600 leading-7">
                        {paragraph}
                      </p>
                    ))}
                    {section.bullets && (
                      <ul className="list-disc pl-5 space-y-2 text-gray-600">
                        {section.bullets.map((item, bIndex) => (
                          <li key={bIndex} className="pl-1 marker:text-gray-400">
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
              ))}
            </div>
            
            <div className="pt-8 border-t border-gray-200/60">
               <p className="text-center text-xs text-gray-400">Fin del documento</p>
            </div>
          </div>
        </div>

        <div className="flex-none bg-white border-t border-gray-100 p-6 md:px-8 md:py-6 shadow-[0_-4px_20px_-1px_rgba(0,0,0,0.03)] z-20">
          <div className="max-w-3xl mx-auto w-full">
            <div className="mb-6">
              {!hasScrolledToBottom && (
                <div className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-700 border border-amber-100/50 animate-in fade-in slide-in-from-bottom-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Por favor lee todo el documento para habilitar la aceptación
                </div>
              )}
              
              <div 
                className={`
                  group relative flex items-start gap-4 rounded-xl border p-4 transition-all duration-200
                  ${isChecked 
                    ? "border-gray-900 bg-gray-900/5 shadow-sm" 
                    : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                  }
                  ${!hasScrolledToBottom ? "opacity-50 pointer-events-none grayscale" : "opacity-100"}
                `}
              >
                <Checkbox
                  id="terms-acceptance"
                  checked={isChecked}
                  onCheckedChange={(checked) => setIsChecked(checked === true)}
                  disabled={!hasScrolledToBottom}
                  className="mt-1 data-[state=checked]:bg-gray-900 data-[state=checked]:border-gray-900 border-gray-300"
                />
                <label
                  htmlFor="terms-acceptance"
                  className="text-sm text-gray-600 leading-relaxed cursor-pointer select-none group-hover:text-gray-900 transition-colors"
                >
                  <span className="font-medium text-gray-900 block mb-0.5">Aceptación legal</span>
                  He leído, comprendido y acepto íntegramente los Términos y Condiciones de Camella, 
                  incluyendo las políticas de privacidad y tratamiento de datos.
                </label>
              </div>

              {error && (
                <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
                   <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                   {error}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                className="text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
                onClick={handleSignOut}
                disabled={isSubmitting}
              >
                Cerrar sesión
              </Button>
              <Button
                type="button"
                size="lg"
                className="bg-gray-900 hover:bg-gray-800 text-white shadow-lg shadow-gray-900/20 px-8 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0"
                onClick={handleAccept}
                disabled={acceptDisabled}
              >
                {isSubmitting ? (
                    <span className="flex items-center gap-2">
                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Procesando...
                    </span>
                ) : (
                    "Aceptar y Continuar"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

