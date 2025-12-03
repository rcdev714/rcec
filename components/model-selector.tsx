"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { Brain, ChevronUp, Lock, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { MODEL_SPECS } from "@/lib/ai-config";

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
  className?: string;
  userPlan?: 'FREE' | 'PRO' | 'ENTERPRISE';
  thinkingLevel?: 'high' | 'low';
  onThinkingChange?: (level: 'high' | 'low') => void;
}

export function ModelSelector({ value, onChange, disabled, className, userPlan: _userPlan = 'FREE', thinkingLevel = 'high', onThinkingChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const options = useMemo(() => ([
    { value: 'gemini-3-pro-preview-high', label: 'Gemini 3 Pro Preview (high)', thinking: true, requiresPro: false, modelId: 'gemini-3-pro-preview', thinkingMode: 'high' as const, badge: 'Experimental' },
    { value: 'gemini-3-pro-preview-low', label: 'Gemini 3 Pro Preview (low)', thinking: true, requiresPro: false, modelId: 'gemini-3-pro-preview', thinkingMode: 'low' as const, badge: 'Experimental' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', thinking: true, requiresPro: false, modelId: 'gemini-2.5-pro', badge: 'Recomendado' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', thinking: true, requiresPro: false, modelId: 'gemini-2.5-flash' },
    { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite', thinking: false, requiresPro: false, modelId: 'gemini-2.5-flash-lite' },
  ]), []);

  // Determine the current value including thinking level for G3
  const currentValue = value === 'gemini-3-pro-preview' ? `gemini-3-pro-preview-${thinkingLevel}` : value;
  const selected = options.find(o => o.value === currentValue);

  // Check if user can access advanced reasoning models
  const canAccessProModels = true; // userPlan === 'PRO' || userPlan === 'ENTERPRISE';

  // Handle smooth animations
  useEffect(() => {
    if (open) {
      setIsAnimating(true);
    } else {
      const timer = setTimeout(() => setIsAnimating(false), 200);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={disabled}
        className={cn(
          "group flex items-center gap-2 flex-shrink-0 px-3 py-2 rounded-xl",
          "bg-white border border-gray-200",
          "text-xs font-medium text-gray-700",
          "shadow-sm hover:shadow-md",
          "focus:outline-none focus:ring-2 focus:ring-gray-400/30 focus:border-gray-400",
          "hover:border-gray-300 hover:bg-gray-50",
          "transition-all duration-300 ease-out",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm",
          selected?.thinking && "ring-1 ring-gray-200"
        )}
        title="Seleccionar modelo"
      >
        {selected?.thinking ? (
          <Brain className="w-4 h-4 text-gray-600 group-hover:text-gray-700 transition-colors duration-200" />
        ) : (
          <Sparkles className="w-4 h-4 text-gray-400 group-hover:text-gray-500 transition-colors duration-200" />
        )}
        <span className="truncate max-w-[10rem] font-medium">
          {selected?.label || value}
        </span>
        <ChevronUp className={cn(
          "w-3.5 h-3.5 text-gray-400 transition-all duration-300 ease-out",
          "group-hover:text-gray-600",
          open && "rotate-180 scale-110"
        )} />
      </button>
      {(open || isAnimating) && (
        <div
          className={cn(
            "absolute z-20 bottom-full mb-2 w-80",
            "bg-white border border-gray-200 rounded-xl",
            "shadow-xl",
            "p-2",
            "transition-all duration-300 ease-out",
            open ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-1 pointer-events-none"
          )}
        >
          <div className="space-y-1">
            {options.map((opt, index) => {
              const isLocked = opt.requiresPro && !canAccessProModels;
              const specs = MODEL_SPECS[opt.modelId as keyof typeof MODEL_SPECS];
              const isHovered = hoveredModel === opt.value;
              const isSelected = currentValue === opt.value;

              return (
                <div
                  key={opt.value}
                  className={cn(
                    "relative transition-all duration-300 ease-out",
                    open ? "animate-in slide-in-from-top-2 fade-in" : ""
                  )}
                  style={{
                    animationDelay: open ? `${index * 50}ms` : '0ms',
                    animationFillMode: 'forwards'
                  }}
                >
                  {isLocked ? (
                    <div className={cn(
                      "group w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg",
                      "bg-gray-50 border border-gray-200",
                      "transition-all duration-200"
                    )}>
                      <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate flex-1 text-left text-gray-500 font-medium">{opt.label}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = '/pricing';
                        }}
                        aria-label="Actualizar plan para desbloquear este modelo"
                        className={cn(
                          "px-2.5 py-1 text-xs font-semibold rounded-lg",
                          "bg-gray-900 text-white",
                          "hover:bg-gray-800",
                          "transition-all duration-200",
                          "focus:outline-none focus:ring-2 focus:ring-gray-400/30"
                        )}
                      >
                        Actualizar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        // Extract model ID and thinking level
                        if (opt.thinkingMode && onThinkingChange) {
                          onThinkingChange(opt.thinkingMode);
                          onChange(opt.modelId);
                        } else {
                          onChange(opt.value);
                        }
                        setOpen(false);
                      }}
                      onMouseEnter={() => setHoveredModel(opt.value)}
                      onMouseLeave={() => setHoveredModel(null)}
                      className={cn(
                        "group w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg",
                        "hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm",
                        "text-gray-700 font-medium",
                        "transition-all duration-200 ease-out",
                        "focus:outline-none focus:ring-2 focus:ring-gray-400/30",
                        "cursor-pointer relative", // Removed overflow-hidden here
                        isSelected && "bg-gray-100 border-gray-300 shadow-sm"
                      )}
                    >
                      {opt.thinking ? (
                        <Brain className="w-4 h-4 text-gray-600 flex-shrink-0 group-hover:scale-110 transition-transform duration-200" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-gray-400 flex-shrink-0 group-hover:text-gray-600 group-hover:scale-110 transition-all duration-200" />
                      )}
                      <span className="truncate flex-1 text-left flex items-center gap-2">
                        {opt.label}
                        {opt.badge && (
                          <span className={cn(
                            "text-[9px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wider",
                            opt.badge === 'Recomendado'
                              ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                              : "bg-amber-100 text-amber-700 border border-amber-200"
                          )}>
                            {opt.badge}
                          </span>
                        )}
                      </span>

                      {/* Hover card */}
                      {isHovered && specs && (
                        <div className={cn(
                          "absolute left-full ml-4 top-1/2 -translate-y-1/2 w-72",
                          "bg-white border border-gray-200 rounded-xl",
                          "shadow-xl p-2 text-left z-50",  // p-3 to p-2
                          "pointer-events-none",
                          "animate-in slide-in-from-left-2 fade-in duration-200"
                        )}>
                          <div className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-2 flex-wrap">
                            {opt.thinking ? (
                              <Brain className="w-4 h-4 text-gray-600" />
                            ) : opt.modelId === 'gemini-2.5-flash' || opt.modelId === 'gemini-2.5-flash-lite' ? (
                              <>
                                <Sparkles className="w-4 h-4 text-gray-400" />
                                <Zap className="w-4 h-4 text-emerald-500 opacity-80" />
                              </>
                            ) : (
                              <Sparkles className="w-4 h-4 text-gray-400" />
                            )}
                            <span className="truncate">{opt.label}</span>
                            <span className="text-[10px] text-gray-500">({opt.modelId})</span>
                          </div>
                          <div className="space-y-1 text-[10px] text-gray-600 leading-tight">
                            {opt.modelId === 'gemini-3-pro-preview' ? (
                              <>
                                <div className="flex items-start gap-1.5"><span className="text-amber-500 mt-0.5">•</span> <span><strong>Experimental:</strong> Potente pero puede ser inestable.</span></div>
                                <div className="flex items-start gap-1.5"><span className="text-gray-300 mt-0.5">•</span> <span><strong>Razonamiento:</strong> Capacidad superior de análisis.</span></div>
                              </>
                            ) : opt.modelId === 'gemini-2.5-pro' ? (
                              <>
                                <div className="flex items-start gap-1.5"><span className="text-emerald-500 mt-0.5">•</span> <span><strong>Recomendado:</strong> Mejor balance costo/calidad.</span></div>
                                <div className="flex items-start gap-1.5"><span className="text-gray-300 mt-0.5">•</span> <span><strong>Estable:</strong> Ideal para producción y uso diario.</span></div>
                              </>
                            ) : opt.modelId === 'gemini-2.5-flash' ? (
                              <>
                                <div className="flex items-start gap-1.5"><span className="text-blue-500 mt-0.5">•</span> <span><strong>Rápido:</strong> Respuestas veloces y eficientes.</span></div>
                                <div className="flex items-start gap-1.5"><span className="text-gray-300 mt-0.5">•</span> <span><strong>Económico:</strong> Bajo costo por token.</span></div>
                              </>
                            ) : (
                              <>
                                <div className="flex items-start gap-1.5"><span className="text-gray-400 mt-0.5">•</span> <span><strong>Básico:</strong> Para tareas muy simples.</span></div>
                                <div className="flex items-start gap-1.5"><span className="text-gray-300 mt-0.5">•</span> <span><strong>Ultra-rápido:</strong> Mínima latencia.</span></div>
                              </>
                            )}
                          </div>
                          {opt.thinkingMode && (
                            <div className="border-t border-gray-200 pt-3 mt-3">
                              <div className={cn(
                                "text-xs font-semibold px-2 py-1.5 rounded-lg",
                                opt.thinkingMode === 'high'
                                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              )}>
                                {opt.thinkingMode === 'high'
                                  ? '⚡ Razonamiento profundo (más lento, preciso)'
                                  : '🚀 Modo rápido (baja latencia, costo)'}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      )}

    </div>
  );
}



