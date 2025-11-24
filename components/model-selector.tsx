"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { Brain, ChevronUp, Lock, Info, Sparkles } from "lucide-react";
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

export function ModelSelector({ value, onChange, disabled, className, userPlan = 'FREE', thinkingLevel = 'high', onThinkingChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [hoveredModel, setHoveredModel] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const options = useMemo(() => ([
    { value: 'gemini-3-pro-preview-high', label: 'gemini-3-pro (high)', thinking: true, requiresPro: false, modelId: 'gemini-3-pro-preview', thinkingMode: 'high' as const },
    { value: 'gemini-3-pro-preview-low', label: 'gemini-3-pro (low)', thinking: true, requiresPro: false, modelId: 'gemini-3-pro-preview', thinkingMode: 'low' as const },
    { value: 'gemini-2.5-pro', label: 'gemini-2.5-pro', thinking: true, requiresPro: false, modelId: 'gemini-2.5-pro' },
    { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash', thinking: true, requiresPro: false, modelId: 'gemini-2.5-flash' },
    { value: 'gemini-2.5-flash-lite', label: 'gemini-2.5-flash-lite', thinking: false, requiresPro: false, modelId: 'gemini-2.5-flash-lite' },
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
          "group flex items-center gap-2 flex-shrink-0 px-2.5 py-1.5 rounded-lg",
          "bg-white/95 backdrop-blur-md border border-indigo-200/50",
          "text-xs font-medium text-slate-700",
          "shadow-sm hover:shadow-md",
          "focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:border-indigo-400",
          "hover:border-indigo-300 hover:bg-white",
          "transition-all duration-300 ease-out",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm",
          selected?.thinking && "ring-1 ring-indigo-100"
        )}
        title="Seleccionar modelo"
      >
        {selected?.thinking ? (
          <Brain className="w-4 h-4 text-indigo-500 group-hover:text-indigo-600 transition-colors duration-200" />
        ) : (
          <Sparkles className="w-4 h-4 text-slate-400 group-hover:text-slate-500 transition-colors duration-200" />
        )}
        <span className="truncate max-w-[10rem] font-medium">
          {selected?.label || value}
        </span>
        <ChevronUp className={cn(
          "w-3.5 h-3.5 text-slate-500 transition-all duration-300 ease-out",
          "group-hover:text-indigo-500",
          open && "rotate-180 scale-110"
        )} />
      </button>
      {(open || isAnimating) && (
        <div
          className={cn(
            "absolute z-20 bottom-full mb-2 w-80",
            "bg-white/95 backdrop-blur-xl",
            "border border-slate-200/60 rounded-2xl",
            "shadow-2xl shadow-slate-900/10",
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
                      "group w-full flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg",
                      "bg-slate-50/80 border border-slate-200/50",
                      "transition-all duration-200"
                    )}>
                      <Lock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="truncate flex-1 text-left text-slate-500 font-medium">{opt.label}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = '/pricing';
                        }}
                        aria-label="Actualizar plan para desbloquear este modelo"
                        className={cn(
                          "px-2.5 py-1 text-xs font-semibold rounded-lg",
                          "bg-gradient-to-r from-indigo-500 to-indigo-600",
                          "text-white shadow-sm",
                          "hover:from-indigo-600 hover:to-indigo-700",
                          "hover:shadow-md hover:scale-105",
                          "transition-all duration-200",
                          "focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
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
                        "group w-full flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg",
                        "hover:bg-gradient-to-r hover:from-indigo-50 hover:to-slate-50",
                        "hover:border-indigo-200/60 hover:shadow-sm",
                        "text-slate-700 font-medium",
                        "transition-all duration-200 ease-out",
                        "focus:outline-none focus:ring-2 focus:ring-indigo-400/30",
                        "cursor-pointer relative overflow-hidden",
                        isSelected && "bg-gradient-to-r from-indigo-100 to-indigo-50 border-indigo-300/60 shadow-sm ring-1 ring-indigo-200/50"
                      )}
                    >
                      {opt.thinking ? (
                        <Brain className="w-4 h-4 text-indigo-500 flex-shrink-0 group-hover:scale-110 transition-transform duration-200" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-slate-400 flex-shrink-0 group-hover:text-indigo-400 group-hover:scale-110 transition-all duration-200" />
                      )}
                      <span className="truncate flex-1 text-left">{opt.label}</span>
                      <Info className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400 transition-colors duration-200 flex-shrink-0" />

                      {/* Hover card */}
                      {isHovered && specs && (
                        <div className={cn(
                          "absolute left-full ml-3 top-1/2 -translate-y-1/2 w-72",
                          "bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-2xl",
                          "shadow-2xl shadow-slate-900/10 p-4 text-left z-30",
                          "pointer-events-none",
                          "animate-in slide-in-from-left-2 fade-in duration-200"
                        )}>
                          <div className="text-xs font-semibold text-slate-900 mb-2.5 flex items-center gap-2">
                            {opt.thinking ? (
                              <Brain className="w-4 h-4 text-indigo-500" />
                            ) : (
                              <Sparkles className="w-4 h-4 text-slate-400" />
                            )}
                            {opt.label}
                          </div>
                          <div className="space-y-1.5 text-[11px] text-slate-600">
                            <div className="flex justify-between items-center py-1">
                              <span className="text-slate-500 font-medium">Contexto:</span>
                              <span className="font-semibold text-slate-800">{specs.contextWindow}</span>
                            </div>
                            <div className="flex justify-between items-center py-1">
                              <span className="text-slate-500 font-medium">Conocimiento:</span>
                              <span className="font-semibold text-slate-800">{specs.knowledgeCutoff}</span>
                            </div>
                            <div className="border-t border-slate-200/60 pt-3 mt-3">
                              <div className="text-xs text-slate-600 leading-relaxed">
                                {opt.modelId === 'gemini-3-pro-preview' ? (
                                  opt.thinkingMode === 'low'
                                    ? 'Perfil: menor costo y menor latencia (pensamiento bajo).'
                                    : 'Perfil: mayor razonamiento y precisión (mayor costo y latencia).'
                                ) : opt.modelId === 'gemini-2.5-pro' ? (
                                  'Perfil: buen razonamiento (costo medio/alto, latencia moderada).'
                                ) : opt.modelId === 'gemini-2.5-flash' ? (
                                  'Perfil: rápido (costo bajo).'
                                ) : (
                                  'Perfil: muy rápido (costo muy bajo).'
                                )}
                              </div>
                            </div>
                            {opt.thinkingMode && (
                              <div className="border-t border-slate-200/60 pt-3 mt-3">
                                <div className={cn(
                                  "text-xs font-semibold px-2 py-1.5 rounded-lg",
                                  opt.thinkingMode === 'high'
                                    ? "bg-indigo-100 text-indigo-700 border border-indigo-200"
                                    : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                )}>
                                  {opt.thinkingMode === 'high'
                                    ? '⚡ Razonamiento profundo (más lento, más preciso)'
                                    : '🚀 Modo rápido (menor latencia y costo)'}
                                </div>
                              </div>
                            )}
                          </div>
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

export default ModelSelector;


