"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Trash2, RefreshCw } from "lucide-react";

interface ConversationStats {
  messageCount: number;
  tokenCount: number;
  conversationId: string;
  maxTokens: number;
  usableTokens: number;
}

interface ConversationStatsProps {
  conversationId?: string;
  onClearConversation?: () => void;
}

export default function ConversationStats({ 
  conversationId, 
  onClearConversation 
}: ConversationStatsProps) {
  const [stats, setStats] = useState<ConversationStats | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const params = conversationId ? `?conversationId=${conversationId}` : '';
      // Usar el endpoint unificado con conteo preciso
      const response = await fetch(`/api/chat/stats${params}`);
      
      if (response.ok) {
        const data = await response.json();
        // Ensure all required properties exist with defaults
        const safeStats: ConversationStats = {
          messageCount: data.messageCount || 0,
          tokenCount: data.tokenCount || 0,
          conversationId: data.conversationId || 'default',
          maxTokens: data.maxTokens || 1000000,
          usableTokens: data.usableTokens || 1000000
        };
        setStats(safeStats);
      }
    } catch (error) {
      console.error("Error fetching conversation stats:", error);
      // Set default stats on error
      setStats({
        messageCount: 0,
        tokenCount: 0,
        conversationId: conversationId || 'default',
        maxTokens: 1000000,
        usableTokens: 1000000
      });
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const clearConversation = async () => {
    try {
      const response = await fetch("/api/chat/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });
      
      if (response.ok) {
        await fetchStats(); // Refresh stats
        onClearConversation?.();
      }
    } catch (error) {
      console.error("Error clearing conversation:", error);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [conversationId, fetchStats]);

  if (!stats) {
    return (
      <Card className="p-4 bg-gray-50">
        <div className="flex items-center justify-center">
          {loading ? (
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm text-gray-600">Loading stats...</span>
            </div>
          ) : (
            <span className="text-sm text-gray-600">No conversation data</span>
          )}
        </div>
      </Card>
    );
  }

  const tokenUsagePercentage = stats.usableTokens > 0 ? (stats.tokenCount / stats.usableTokens) * 100 : 0;
  const formatNumber = (num: number | undefined) => (num || 0).toLocaleString();

  return (
    <Card className="p-4 bg-gray-50">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-800">Conversation Memory</h3>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={fetchStats}
              disabled={loading}
              className="h-8 px-2"
              title="Actualizar estadísticas"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={clearConversation}
              className="h-8 px-2 text-red-600 hover:text-red-700"
              title="Limpiar conversación"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">Messages</span>
            <span className="text-xs font-medium">{formatNumber(stats.messageCount)}</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Uso de Tokens</span>
              <span className="text-xs font-medium">
                {formatNumber(stats.tokenCount)} / {formatNumber(stats.usableTokens)}
              </span>
            </div>
            <Progress 
              value={tokenUsagePercentage} 
              className="h-2"
            />
            <div className="text-xs text-gray-500 text-center">
              {tokenUsagePercentage.toFixed(1)}% de 1M tokens de contexto
            </div>
          </div>

          {tokenUsagePercentage > 80 && (
            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
              ⚠️ Acercándose al límite de contexto. Los mensajes antiguos se resumirán automáticamente.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
