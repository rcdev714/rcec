"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [refreshKey, setRefreshKey] = useState(0);

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
    }
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
  const acceptDisabled = isSubmitting || !isChecked;

  if (!modalOpen) {
    return null;
  }

  return (
    <Dialog open={modalOpen} onOpenChange={() => {}}>
      <DialogContent className="w-[92vw] max-w-xl md:max-w-2xl max-h-[85vh] p-0 gap-0 overflow-hidden border border-gray-200/60 shadow-sm bg-white sm:rounded-xl flex flex-col font-sans">
        <DialogHeader className="flex-none px-4 py-3 md:px-5 md:py-3 border-b border-gray-100/80 bg-white z-10">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base md:text-lg font-medium tracking-tight text-gray-900">
                Términos y Condiciones
              </DialogTitle>
              <p className="text-[11px] md:text-xs text-gray-500 mt-1 font-medium">
                Versión {CURRENT_TERMS_VERSION} — Última actualización
              </p>
            </div>
            <span className="hidden md:inline-flex px-2.5 py-1 bg-gray-100 rounded-full text-[11px] font-semibold text-gray-600">
              Documento legal
            </span>
          </div>
        </DialogHeader>

        <div
          className="flex-1 overflow-y-auto min-h-0 bg-white p-4 md:p-5 text-[13px] leading-relaxed text-gray-700 font-sans [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-track]:bg-transparent"
        >
          <div className="max-w-2xl mx-auto space-y-5">
            <div className="prose prose-sm prose-gray max-w-none">
              <p className="text-gray-500 mb-4 italic text-[12px]">
                Por favor lee detenidamente este documento. Contiene información importante sobre tus derechos,
                obligaciones y el uso de los servicios de Camella.
              </p>
              
              {TERMS_SECTIONS.map((section) => (
                <section key={section.title} className="group">
                  <h3 className="text-sm md:text-base font-medium text-gray-900 mb-2">
                    {section.title}
                  </h3>
                  <div className="space-y-3">
                    {section.paragraphs.map((paragraph, pIndex) => (
                      <p key={pIndex} className="text-justify text-gray-700 leading-6 text-[13px] font-normal">
                        {paragraph}
                      </p>
                    ))}
                    {section.bullets && (
                      <ul className="list-disc pl-4 space-y-1.5 text-gray-700 text-[13px] font-normal">
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
            
            <div className="pt-6 border-t border-gray-200/60">
               <p className="text-center text-[11px] text-gray-400">Fin del documento</p>
            </div>
          </div>
        </div>

        <div className="flex-none bg-white border-t border-gray-100 p-3 md:px-5 md:py-4 z-20">
          <div className="max-w-2xl mx-auto w-full">
            <div className="mb-3">
              <div 
                className={`
                  group relative flex items-start gap-3 rounded-lg border p-4
                  ${isChecked ? "border-gray-900 bg-gray-900/5" : "border-gray-200 bg-white"}
                `}
              >
                <Checkbox
                  id="terms-acceptance"
                  checked={isChecked}
                  onCheckedChange={(checked) => setIsChecked(checked === true)}
                  className="mt-1 data-[state=checked]:bg-gray-900 data-[state=checked]:border-gray-900 border-gray-300"
                />
                <label
                  htmlFor="terms-acceptance"
                  className="text-[13px] text-gray-600 leading-relaxed cursor-pointer select-none group-hover:text-gray-900 transition-colors font-sans"
                >
                  <span className="font-medium text-gray-900 block mb-0.5 text-sm">Aceptación legal</span>
                  He leído, comprendido y acepto íntegramente los Términos y Condiciones de Camella, 
                  incluyendo las políticas de privacidad y tratamiento de datos.
                </label>
              </div>

              {error && (
                <div className="mt-2 flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-md">
                   <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                   {error}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                className="w-full sm:w-auto text-gray-600 hover:text-gray-900 hover:bg-gray-50 text-sm"
                onClick={handleSignOut}
                disabled={isSubmitting}
              >
                Cerrar sesión
              </Button>
              <Button
                type="button"
                size="sm"
                className="w-full sm:w-auto bg-gray-900 hover:bg-gray-800 text-white px-5 py-2 text-sm disabled:opacity-50"
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

