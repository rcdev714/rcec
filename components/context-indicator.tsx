'use client';

import { useState, useEffect, useCallback } from 'react';

interface ContextIndicatorProps {
  conversationId?: string;
}

interface TokenStats {
  tokenCount: number;
  usableTokens: number;
}

export default function ContextIndicator({ conversationId }: ContextIndicatorProps) {
  const [stats, setStats] = useState<TokenStats>({ tokenCount: 0, usableTokens: 1000000 });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!conversationId) {
        setLoading(false);
        return;
    }
    setLoading(true);
    try {
      const params = `?conversationId=${conversationId}`;
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
  }, [conversationId]);

  useEffect(() => {
    fetchStats();
    // const interval = setInterval(fetchStats, 10000); // Poll every 10 seconds
    // return () => clearInterval(interval);
  }, [conversationId, fetchStats]);

  if (!conversationId) return null;

  const percentageUsed = stats.usableTokens > 0 ? (stats.tokenCount / stats.usableTokens) * 100 : 0;
  const percentageLeft = 100 - percentageUsed;

  return (
    <div className="text-xs text-gray-500 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-md border border-gray-200">
      {loading && stats.tokenCount === 0 ? (
        <span>(Loading context...)</span>
      ) : (
        <span>{percentageLeft.toFixed(1)}% context left</span>
      )}
    </div>
  );
}
