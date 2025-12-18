import React from 'react';
import { AlertCircle } from "lucide-react";

interface WaitTokenCardProps {
  waitToken: {
    tokenId: string;
    toolName: string;
    toolCallId: string;
    reason: string;
    createdAt: string;
  };
  onAction: (tokenId: string, approved: boolean) => void;
}

export function WaitTokenCard({ waitToken, onAction }: WaitTokenCardProps) {
  return (
    <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-xl shadow-sm">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-100 rounded-full">
          <AlertCircle className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-amber-900 mb-1">
            Aprobación Requerida
          </h4>
          <p className="text-xs text-amber-800 mb-3">
            {waitToken.reason || `La herramienta ${waitToken.toolName} requiere tu aprobación para continuar.`}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onAction(waitToken.tokenId, true)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-md transition-colors"
            >
              Aprobar
            </button>
            <button
              onClick={() => onAction(waitToken.tokenId, false)}
              className="px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-50 text-amber-800 text-xs font-medium rounded-md transition-colors"
            >
              Rechazar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



