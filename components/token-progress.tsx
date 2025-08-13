"use client";

import { useState, useEffect, useCallback } from "react";
import { Progress } from "@/components/ui/progress";

interface TokenProgressProps {
  conversationId?: string;
}

interface TokenStats {
  tokenCount: number;
  usableTokens: number;
}

export default function TokenProgress({ conversationId }: TokenProgressProps) {
  const [stats, setStats] = useState<TokenStats>({ tokenCount: 0, usableTokens: 1000000 });
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      const params = conversationId ? `?conversationId=${conversationId}` : '';
      const response = await fetch(`/api/chat/stats${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setStats({
          tokenCount: data.tokenCount || 0,
          usableTokens: data.usableTokens || 1000000
        });
      }
    } catch (error) {
      console.error("Error fetching token stats:", error);
    } finally {
      setLoading(false);
    }
  }, [conversationId, loading]);

  useEffect(() => {
    fetchStats();
    // Actualizar cada 5 segundos durante conversación activa
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [conversationId, fetchStats]);

  const percentage = stats.usableTokens > 0 ? (stats.tokenCount / stats.usableTokens) * 100 : 0;
  const formatNumber = (num: number) => num.toLocaleString();

  return (
    <div className="w-full space-y-1">
      <Progress 
        value={percentage} 
        className="h-1.5 w-full bg-gray-100"
      />
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>{formatNumber(stats.tokenCount)} tokens</span>
        <span>{percentage.toFixed(1)}% de 1M</span>
      </div>
    </div>
  );
}
