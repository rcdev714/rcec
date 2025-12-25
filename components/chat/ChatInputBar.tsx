import React, { ChangeEvent, FormEvent } from 'react';
import { LoaderCircle, ArrowUp, Settings } from "lucide-react";
import { ModelSelector } from "@/components/model-selector";
import { Button } from "@/components/ui/button";

interface ChatInputBarProps {
  input: string;
  onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isSending: boolean;
  isSubmitting: boolean;
  selectedModel: string;
  onModelChange: (model: string) => void;
  thinkingLevel: 'high' | 'low';
  onThinkingChange: (level: 'high' | 'low') => void;
  userPlan: 'FREE' | 'PRO' | 'ENTERPRISE';
  onSettingsClick: () => void;
}

export function ChatInputBar({
  input,
  onInputChange,
  onSubmit,
  isSending,
  isSubmitting,
  selectedModel,
  onModelChange,
  thinkingLevel,
  onThinkingChange,
  userPlan,
  onSettingsClick
}: ChatInputBarProps) {
  return (
    <div className="w-full flex flex-col items-center">
      <form onSubmit={onSubmit} className="relative w-full max-w-3xl group">
        <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-2 sm:p-3 shadow-sm focus-within:border-gray-900 focus-within:ring-1 focus-within:ring-gray-900/10 transition-colors">
          <input
            type="text"
            value={input}
            onChange={onInputChange}
            placeholder="Escribe una instrucción o pega información para analizar..."
            className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-[14px] sm:text-[15px] placeholder:text-gray-400 text-gray-900 pr-2 sm:pr-3"
          />
          <div className="mt-2 sm:mt-3 flex items-center justify-between gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
              <ModelSelector
                value={selectedModel}
                onChange={onModelChange}
                disabled={isSending}
                userPlan={userPlan}
                thinkingLevel={thinkingLevel}
                onThinkingChange={onThinkingChange}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onSettingsClick}
                className="h-9 w-9 rounded-xl border border-transparent hover:border-gray-200 hover:bg-gray-50 text-gray-500 flex-shrink-0"
                title="Configuración del agente"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
            
            <button
              type="submit"
              disabled={isSubmitting || isSending || !input.trim()}
              className="w-9 h-9 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center text-sm transition-colors flex-shrink-0"
              title="Enviar mensaje"
            >
              {isSending ? (
                <LoaderCircle className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowUp className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}



