"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Agent run status from Supabase
 */
export interface AgentRun {
  id: string;
  thread_id: string;
  conversation_id: string;
  user_id: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  current_node: string | null;
  progress: {
    currentNode?: string;
    timestamp?: string;
    waitToken?: {
      tokenId: string;
      toolName: string;
      toolCallId: string;
      reason: string;
      createdAt: string;
    } | null;
  } | null;
  search_results: unknown | null;
  email_draft: {
    subject: string;
    body: string;
    toName?: string;
    toEmail?: string;
    companyName?: string;
  } | null;
  todos: Array<{
    id: string;
    description: string;
    status: "pending" | "in_progress" | "completed" | "failed";
    createdAt?: string;
    completedAt?: string;
    errorMessage?: string;
  }>;
  response_content: string | null;
  error_message: string | null;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  tool_outputs?: Array<{
    kind?: 'tool_call' | 'tool_result';
    toolName: string;
    toolCallId: string;
    input?: Record<string, unknown>;
    output?: unknown;
    success?: boolean;
    error?: string;
    timestamp: string;
  }>;
  model_name: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface UseAgentRunOptions {
  onComplete?: (run: AgentRun) => void;
  onError?: (error: string) => void;
  onUpdate?: (run: AgentRun) => void;
}

/**
 * Hook to subscribe to agent run updates via Supabase Realtime
 * 
 * Usage:
 * ```tsx
 * const { run, isLoading, error, startRun } = useAgentRun({
 *   onComplete: (run) => console.log("Agent completed:", run),
 * });
 * ```
 */
export function useAgentRun(options: UseAgentRunOptions = {}) {
  const [run, setRun] = useState<AgentRun | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());
  const optionsRef = useRef(options);
  
  // Update options ref without triggering re-renders
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Subscribe to a specific run
  const subscribeToRun = useCallback((runId: string) => {
    const supabase = supabaseRef.current;
    
    // Clean up existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Create new subscription
    const channel = supabase
      .channel(`agent-run-${runId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "agent_runs",
          filter: `id=eq.${runId}`,
        },
        (payload) => {
          const updatedRun = payload.new as AgentRun;
          setRun(updatedRun);
          
          // Call onUpdate callback
          optionsRef.current.onUpdate?.(updatedRun);

          // Check for completion
          if (updatedRun.status === "completed") {
            setIsLoading(false);
            optionsRef.current.onComplete?.(updatedRun);
          } else if (updatedRun.status === "failed") {
            setIsLoading(false);
            const errorMsg = updatedRun.error_message || "Agent run failed";
            setError(errorMsg);
            optionsRef.current.onError?.(errorMsg);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Subscribed to agent run ${runId}`);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error(`[Realtime] Channel error for run ${runId}`);
          // Don't fail immediately on channel error, might be transient
        }
        if (status === 'TIMED_OUT') {
          console.error(`[Realtime] Channel timeout for run ${runId}`);
        }
      });

    channelRef.current = channel;
  }, []);

  // Unsubscribe from run
  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      supabaseRef.current.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  // Start a new agent run
  const startRun = useCallback(async (params: {
    message: string;
    conversationId?: string;
    model?: string;
    thinkingLevel?: "high" | "low";
  }) => {
    setIsLoading(true);
    setError(null);
    setRun(null);

    try {
      const response = await fetch("/api/agent/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to start agent");
      }

      // Set initial run state
      const initialRun: AgentRun = {
        id: data.runId,
        thread_id: "",
        conversation_id: data.conversationId,
        user_id: "",
        status: "pending",
        current_node: null,
        progress: null,
        search_results: null,
        email_draft: null,
        todos: [],
        response_content: null,
        error_message: null,
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        model_name: params.model || "gemini-2.5-flash",
        started_at: null,
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setRun(initialRun);

      // Subscribe to updates
      subscribeToRun(data.runId);

      return {
        runId: data.runId,
        conversationId: data.conversationId,
        taskId: data.taskId,
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      setIsLoading(false);
      optionsRef.current.onError?.(errorMessage);
      throw err;
    }
  }, [subscribeToRun]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, [unsubscribe]);

  return {
    run,
    isLoading,
    error,
    startRun,
    subscribeToRun,
    unsubscribe,
  };
}

/**
 * Hook to subscribe to all runs for a conversation
 */
export function useConversationRuns(conversationId: string | null) {
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    if (!conversationId) {
      setRuns([]);
      return;
    }

    const supabase = supabaseRef.current;
    setIsLoading(true);

    // Fetch existing runs
    const fetchRuns = async () => {
      const { data, error } = await supabase
        .from("agent_runs")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setRuns(data as AgentRun[]);
      }
      setIsLoading(false);
    };

    fetchRuns();

    // Subscribe to changes
    const channel = supabase
      .channel(`conversation-runs-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agent_runs",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setRuns((prev) => [...prev, payload.new as AgentRun]);
          } else if (payload.eventType === "UPDATE") {
            setRuns((prev) =>
              prev.map((run) =>
                run.id === (payload.new as AgentRun).id
                  ? (payload.new as AgentRun)
                  : run
              )
            );
          } else if (payload.eventType === "DELETE") {
            setRuns((prev) =>
              prev.filter((run) => run.id !== (payload.old as { id: string }).id)
            );
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [conversationId]);

  return { runs, isLoading };
}

