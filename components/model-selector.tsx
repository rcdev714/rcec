"use client";

import { useMemo, useState } from "react";
import { Brain, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ModelSelector({ value, onChange, disabled, className }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const options = useMemo(() => ([
    { value: 'gemini-2.5-pro', label: 'gemini-2.5-pro', thinking: true },
    { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash', thinking: true },
    { value: 'gemini-2.5-flash-lite', label: 'gemini-2.5-flash-lite', thinking: false },
  ]), []);

  const selected = options.find(o => o.value === value);

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={disabled}
        className="flex items-center gap-1.5 flex-shrink-0 px-2.5 py-1.5 md:py-1.5 bg-white/90 backdrop-blur-sm border-2 border-gray-200/60 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 hover:border-indigo-400 transition-all duration-200 text-xs md:text-xs text-gray-700 shadow-sm hover:shadow-md focus:shadow-lg touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
        title="Seleccionar modelo"
      >
        {selected?.thinking ? (
          <Brain className="w-3.5 h-3.5 text-gray-500" />
        ) : null}
        <span className="truncate max-w-[8rem]">
          {selected?.label || value}
        </span>
        <ChevronUp className={cn(
          "w-3 h-3 text-gray-500 transition-transform duration-200",
          open && "rotate-180"
        )} />
      </button>
      {open && (
        <div className="absolute z-20 bottom-full mb-1 w-52 bg-white border border-gray-200 rounded-md shadow-lg p-1">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded hover:bg-gray-50 text-gray-700",
                value === opt.value && "bg-gray-50"
              )}
            >
              {opt.thinking ? (
                <Brain className="w-3.5 h-3.5 text-gray-500" />
              ) : (
                <span className="inline-block w-3.5 h-3.5" />
              )}
              <span className="truncate">{opt.label}</span>
            </button>
          ))}
          <div className="my-1 h-px bg-gray-200" />
          <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-gray-400">Coming soon</div>
          <div className="space-y-0.5 pb-1">
            <div className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400 cursor-not-allowed">
              <span className="inline-block w-3.5 h-3.5" />
              <span className="truncate">gpt-5</span>
            </div>
            <div className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400 cursor-not-allowed">
              <span className="inline-block w-3.5 h-3.5" />
              <span className="truncate">deepseek-r1</span>
            </div>
            <div className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400 cursor-not-allowed">
              <span className="inline-block w-3.5 h-3.5" />
              <span className="truncate">claude-4.5-sonnet</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ModelSelector;


