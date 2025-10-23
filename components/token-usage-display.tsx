"use client";

import { useState, useEffect } from "react";
import { Zap, TrendingUp, DollarSign } from "lucide-react";
import { formatTokenCount, calculateGeminiCost } from "@/lib/token-counter";

interface TokenUsageDisplayProps {
  currentMessageTokens?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  conversationId?: string | null;
  modelName?: string;
  className?: string;
}

interface ConversationStats {
  totalTokens: number;
  totalCost: number;
  messageCount: number;
}

export function TokenUsageDisplay({
  currentMessageTokens,
  conversationId,
  modelName = "gemini-2.5-flash",
  className = "",
}: TokenUsageDisplayProps) {
  const [conversationStats, setConversationStats] = useState<ConversationStats>({
    totalTokens: 0,
    totalCost: 0,
    messageCount: 0,
  });

  // Fetch conversation token stats from database
  useEffect(() => {
    if (!conversationId) {
      setConversationStats({ totalTokens: 0, totalCost: 0, messageCount: 0 });
      return;
    }

    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/chat/conversation-stats?conversationId=${conversationId}`);
        if (response.ok) {
          const data = await response.json();
          setConversationStats({
            totalTokens: data.totalTokens || 0,
            totalCost: data.totalCost || 0,
            messageCount: data.messageCount || 0,
          });
        }
      } catch (error) {
        console.error("Error fetching conversation stats:", error);
      }
    };

    fetchStats();
  }, [conversationId, currentMessageTokens]); // Re-fetch when new message tokens arrive

  // Calculate current message cost
  const currentCost = currentMessageTokens
    ? calculateGeminiCost(
        modelName,
        currentMessageTokens.inputTokens,
        currentMessageTokens.outputTokens
      )
    : 0;

  // Show current message if available, otherwise show conversation totals
  const displayTokens = currentMessageTokens?.totalTokens || conversationStats.totalTokens;
  const displayCost = currentCost || conversationStats.totalCost;

  // Show placeholder while loading, or nothing if genuinely no data
  if (displayTokens === 0 && !conversationId && !currentMessageTokens) {
    return null;
  }

  // Show loading state if we're waiting for stats
  if (displayTokens === 0 && conversationId) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200">
          <Zap className="w-3.5 h-3.5 animate-pulse" />
          <span className="text-gray-500">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Token Count */}
      <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200">
        <Zap className="w-3.5 h-3.5 text-amber-500" />
        <span className="font-medium text-gray-700">{formatTokenCount(displayTokens)}</span>
        <span className="text-gray-500">tokens</span>
      </div>

      {/* Cost */}
      {displayCost > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200">
          <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-medium text-emerald-700">
            ${displayCost.toFixed(4)}
          </span>
        </div>
      )}

      {/* Current Message Indicator */}
      {currentMessageTokens && (
        <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200">
          <TrendingUp className="w-3 h-3" />
          <span className="font-medium">última</span>
        </div>
      )}

      {/* Conversation Totals (hover tooltip) */}
      {conversationStats.messageCount > 0 && !currentMessageTokens && (
        <div className="text-xs text-gray-500 hidden sm:block">
          <span className="font-medium">{conversationStats.messageCount}</span> mensajes
        </div>
      )}
    </div>
  );
}

