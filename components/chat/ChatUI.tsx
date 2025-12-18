"use client";

import { useState, FormEvent, useRef, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ConversationSidebar from "@/components/conversation-sidebar";
import ConversationManager from "@/lib/conversation-manager";
import { useAgentRun, type AgentRun } from "@/lib/hooks/use-agent-run";
import { AgentSettings, DEFAULT_AGENT_SETTINGS, mergeAgentSettings } from "@/lib/types/agent-settings";
import { ChatSettingsPanel } from "./ChatSettingsPanel";
import { ChatInputBar } from "./ChatInputBar";
import { ChatMessageList, Message } from "./ChatMessageList";
import { PlanningCard } from "./PlanningCard";
import { parseAndSanitizeMessage, TodoItem, AgentStateEvent, EmailDraft } from "./messageParsing";
import { CompanySearchResult } from "@/types/chat";
import { createClient } from "@/lib/supabase/client";

// Generate ID helper
const genId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? (crypto.randomUUID as () => string)()
    : `${Date.now()}_${Math.random().toString(36).slice(2)}`;

interface ChatUIProps {
  initialConversationId?: string;
  initialMessages?: any[];
  appSidebarOffset?: number;
  useAsyncMode?: boolean;
}

export function ChatUI({ initialConversationId, initialMessages = [], appSidebarOffset = 0, useAsyncMode = false }: ChatUIProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId || null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [copiedInline, setCopiedInline] = useState<string | null>(null);
  
  // Settings State
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.5-flash");
  const [thinkingLevel, setThinkingLevel] = useState<'high' | 'low'>('high');
  const [agentSettings, setAgentSettings] = useState<AgentSettings>(DEFAULT_AGENT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [savingConversation, setSavingConversation] = useState(false);
  
  const [userPlan, setUserPlan] = useState<'FREE' | 'PRO' | 'ENTERPRISE'>('FREE');
  const [banner, setBanner] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ open: boolean; message: string; resolve?: (v: boolean) => void }>({ open: false, message: "" });
  
  // Detailed debug views per message
  const [expandedDebug, setExpandedDebug] = useState<Record<string, boolean>>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentAbort = useRef<AbortController | null>(null);
  const usageCheckRef = useRef<{ ts: number; allowed: boolean } | null>(null);
  const conversationManager = useMemo(() => ConversationManager.getInstance(), []);
  const supabase = createClient();

  // Load Settings
  useEffect(() => {
    async function loadSettings() {
      // 1. Get User Defaults
      const { data: { user } } = await supabase.auth.getUser();
      let userDefaults: Partial<AgentSettings> | null = null;
      
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('agent_settings')
          .eq('user_id', user.id)
          .single();
        if (profile?.agent_settings) {
          userDefaults = profile.agent_settings as Partial<AgentSettings>;
        }
      }

      // 2. Get Conversation Overrides
      let conversationOverrides: Partial<AgentSettings> | null = null;
      if (conversationId) {
        const { data: conv } = await supabase
          .from('conversations')
          .select('metadata')
          .eq('id', conversationId)
          .single();
        const meta = conv?.metadata as Record<string, any>;
        if (meta?.agentSettings) {
          conversationOverrides = meta.agentSettings as Partial<AgentSettings>;
        }
      }

      const merged = mergeAgentSettings(userDefaults, conversationOverrides, null);
      setAgentSettings(merged);
      
      // Sync local state
      setSelectedModel(merged.modelName);
      setThinkingLevel(merged.thinkingLevel);
    }
    
    loadSettings();
  }, [conversationId]);

  // Update settings when model/thinking changes from UI
  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    setAgentSettings(prev => ({ ...prev, modelName: model }));
  };

  const handleThinkingChange = (level: 'high' | 'low') => {
    setThinkingLevel(level);
    setAgentSettings(prev => ({ ...prev, thinkingLevel: level }));
  };

  // Sync settings panel changes back to local state
  const handleSettingsChange = (newSettings: AgentSettings) => {
    setAgentSettings(newSettings);
    setSelectedModel(newSettings.modelName);
    setThinkingLevel(newSettings.thinkingLevel);
  };

  const saveSettingsAsDefaults = useCallback(async () => {
    setSavingDefaults(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setBanner("Necesitas iniciar sesión para guardar tus predeterminados.");
        return;
      }

      const { error } = await supabase
        .from("user_profiles")
        .upsert(
          { user_id: user.id, agent_settings: agentSettings },
          { onConflict: "user_id" },
        );

      if (error) throw error;
      setBanner("Predeterminados guardados.");
      setTimeout(() => setBanner(null), 2500);
    } catch (e) {
      console.error("Error saving defaults:", e);
      setBanner("Error al guardar predeterminados.");
    } finally {
      setSavingDefaults(false);
    }
  }, [agentSettings, supabase]);

  const saveSettingsToConversation = useCallback(async () => {
    if (!conversationId) return;
    setSavingConversation(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setBanner("Necesitas iniciar sesión para guardar en una conversación.");
        return;
      }

      const { data: conv, error: fetchErr } = await supabase
        .from("conversations")
        .select("metadata")
        .eq("id", conversationId)
        .eq("user_id", user.id)
        .single();

      if (fetchErr) throw fetchErr;

      const meta = (conv?.metadata && typeof conv.metadata === "object")
        ? (conv.metadata as Record<string, unknown>)
        : {};

      const { error: updateErr } = await supabase
        .from("conversations")
        .update({ metadata: { ...meta, agentSettings } })
        .eq("id", conversationId)
        .eq("user_id", user.id);

      if (updateErr) throw updateErr;
      setBanner("Configuración guardada en la conversación.");
      setTimeout(() => setBanner(null), 2500);
    } catch (e) {
      console.error("Error saving conversation settings:", e);
      setBanner("Error al guardar configuración en la conversación.");
    } finally {
      setSavingConversation(false);
    }
  }, [agentSettings, conversationId, supabase]);

  // ... (rest of logic: handleAgentUpdate, handleAgentComplete, handleAgentError, startChat, etc.)
  // I will copy and adapt the logic from chat-ui.tsx

  const handleAgentUpdate = useCallback((run: AgentRun) => {
    setMessages(prev => {
      const next = [...prev];
      const lastMessage = next[next.length - 1];

      if (lastMessage?.role === 'assistant') {
        const todos = (run.todos || []) as Array<{ status: string }>;
        const hasUnresolvedTodos = todos.some(t => t.status === 'pending' || t.status === 'in_progress');
        const isFinalizing = run.current_node === 'finalize' || run.current_node === 'completed';
        const shouldRevealResponse = run.status === 'completed' || (!hasUnresolvedTodos && isFinalizing);
        const incomingContent = (run.response_content || '').toString();
        const previousContent = (lastMessage.content || '').toString();
        
        const nextContent = shouldRevealResponse && incomingContent ? incomingContent : previousContent;

        const agentEvents: AgentStateEvent[] = [];
        
        const processedToolResultIds = new Set<string>();
        
        if (run.tool_outputs && Array.isArray(run.tool_outputs)) {
          run.tool_outputs.forEach((output: any) => {
            if (output.kind === 'tool_call') {
              agentEvents.push({
                type: 'tool_call',
                toolName: output.toolName,
                toolCallId: output.toolCallId,
                input: output.input || {},
              });
            } else {
              processedToolResultIds.add(output.toolCallId);
              agentEvents.push({
                type: 'tool_result',
                toolName: output.toolName,
                toolCallId: output.toolCallId,
                success: !!output.success,
                output: output.output,
                error: output.error || output.errorMessage || (output.success ? undefined : 'Error desconocido'),
              });
            }
          });
        }

        if (run.status === 'completed' || run.status === 'failed') {
          const orphanCalls = agentEvents.filter(e => e.type === 'tool_call' && !processedToolResultIds.has(e.toolCallId || ''));
          orphanCalls.forEach(call => {
            if (call.type === 'tool_call') {
              agentEvents.push({
                type: 'tool_result',
                toolName: call.toolName!,
                toolCallId: call.toolCallId!,
                success: false,
                output: null,
                error: 'Cancelado (límite de iteraciones alcanzado)',
              });
            }
          });
        }

        if (run.current_node) {
          agentEvents.push({
            type: 'thinking',
            node: run.current_node,
            message: `Procesando: ${run.current_node}`,
          });
        }

        if (run.todos && run.todos.length > 0) {
          const planIndex = next.findIndex(m => m.role === 'system' && m.metadata?.type === 'planning');
          const planMessage: Message = {
            id: `plan-${run.id}`,
            role: 'system',
            content: '',
            todos: run.todos.map(t => ({
              id: t.id,
              description: t.description,
              status: t.status,
              createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
              completedAt: t.completedAt ? new Date(t.completedAt) : undefined,
              errorMessage: (t as any).errorMessage,
            })),
            metadata: { type: 'planning' }
          };
          
          if (planIndex !== -1) {
            next[planIndex] = planMessage;
          } else {
            const assistantIndex = next.length - 1;
            if (assistantIndex >= 0) {
              next.splice(assistantIndex, 0, planMessage);
            }
          }
        }

        next[next.length - 1] = {
          ...lastMessage,
          content: nextContent,
          searchResult: run.search_results as CompanySearchResult | undefined,
          emailDraft: run.email_draft as EmailDraft | undefined,
          todos: (run.todos || []).map(t => ({
            ...t,
            createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
            completedAt: t.completedAt ? new Date(t.completedAt) : undefined,
            errorMessage: (t as any).errorMessage,
          })) as TodoItem[],
          agentStateEvents: agentEvents.length > 0 ? agentEvents : lastMessage.agentStateEvents,
          metadata: {
            ...lastMessage.metadata,
            type: run.search_results ? 'company_results' : run.email_draft ? 'email_draft' : 'text',
          },
          waitToken: run.progress?.waitToken || undefined,
        };
      }

      return next;
    });
  }, []);

  const handleAgentComplete = useCallback((run: AgentRun) => {
    setIsSending(false);
    setMessages(prev => {
      const next = [...prev];
      const lastMessage = next[next.length - 1];

      if (lastMessage?.role === 'assistant') {
        next[next.length - 1] = {
          ...lastMessage,
          content: run.response_content || 'Tarea completada.',
          searchResult: run.search_results as CompanySearchResult | undefined,
          emailDraft: run.email_draft as EmailDraft | undefined,
          todos: (run.todos || []).map(t => ({
            ...t,
            createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
            completedAt: t.completedAt ? new Date(t.completedAt) : undefined,
            errorMessage: (t as any).errorMessage,
          })) as TodoItem[],
          metadata: {
            ...lastMessage.metadata,
            type: run.search_results ? 'company_results' : run.email_draft ? 'email_draft' : 'text',
          },
        };
      }
      return next;
    });
    window.dispatchEvent(new Event('conversation-updated'));
  }, []);

  const handleAgentError = useCallback((error: string) => {
    setIsSending(false);
    setBanner(error);
    setMessages(prev => {
      const next = [...prev];
      const lastMessage = next[next.length - 1];
      if (lastMessage?.role === 'assistant' && !lastMessage.content) {
        next[next.length - 1] = {
          ...lastMessage,
          content: `Lo siento, ocurrió un error: ${error}`,
        };
      }
      return next;
    });
  }, []);

  const handleWaitTokenAction = async (tokenId: string, approved: boolean) => {
    try {
      const response = await fetch('/api/agent/wait-token/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenId, approved }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to complete wait token');
      }
    } catch (error) {
      console.error('Error handling wait token:', error);
      setBanner('Error al procesar la aprobación. Intenta de nuevo.');
    }
  };

  const { startRun } = useAgentRun({
    onUpdate: handleAgentUpdate,
    onComplete: handleAgentComplete,
    onError: handleAgentError,
  });

  const checkUsageAndWarn = async (): Promise<boolean> => {
    try {
      const now = Date.now();
      const TTL = 60_000;
      if (usageCheckRef.current && now - usageCheckRef.current.ts < TTL) {
        return usageCheckRef.current.allowed;
      }
      const [summaryRes, logsRes] = await Promise.all([
        fetch('/api/usage/summary'),
        fetch('/api/agent/logs?limit=1000')
      ]);

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        const isFreePlan = data.plan === 'FREE';
        const dollarLimit = data.limits?.prompt_dollars || (isFreePlan ? 5.00 : 20.00);
        let dollarsUsed = 0;
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          dollarsUsed = logsData.logs?.reduce((sum: number, log: any) => sum + (log.cost || 0), 0) || 0;
        }

        if (dollarLimit > 0) {
          const usagePercentage = (dollarsUsed / dollarLimit) * 100;
          if (dollarsUsed >= dollarLimit) {
            setBanner(`Has excedido tu límite mensual de $${dollarLimit.toFixed(2)}. Has usado $${dollarsUsed.toFixed(2)}. Por favor actualiza tu plan para continuar.`);
            window.location.href = '/pricing';
            usageCheckRef.current = { ts: now, allowed: false };
            return false;
          }
          if (usagePercentage >= 80) {
            const shouldContinue = await openConfirm(
              `Has usado $${dollarsUsed.toFixed(2)} de $${dollarLimit.toFixed(2)} en tokens este mes (${Math.round(usagePercentage)}%). ¿Quieres continuar? ${isFreePlan ? 'Considera actualizar tu plan para más uso del agente.' : ''}`
            );
            if (!shouldContinue) {
              usageCheckRef.current = { ts: now, allowed: false };
              return false;
            }
          }
        }
      }
      usageCheckRef.current = { ts: Date.now(), allowed: true };
      return usageCheckRef.current.allowed;
    } catch (error) {
      console.error('Error checking usage:', error);
      return true;
    }
  };

  const startChat = async (message: string) => {
    if (!message.trim() || isSending) return;

    setIsSending(true);
    const userMessage: Message = { id: genId(), role: "user", content: message };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    let currentConvId = conversationId;
    if (!currentConvId) {
      currentConvId = await conversationManager.createConversation(message);
      setConversationId(currentConvId);
      window.dispatchEvent(new Event('conversation-updated'));
    } else {
      await conversationManager.updateActivity(currentConvId);
    }

    if (currentConvId) {
      await conversationManager.addMessage(currentConvId, {
        id: '',
        role: 'user' as const,
        content: message,
        createdAt: new Date(),
      });
    }

    if (useAsyncMode) {
      try {
        const assistantMessageId = genId();
        setMessages((prev) => [...prev, {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          metadata: { type: 'text' }
        }]);

        const result = await startRun({
          message,
          conversationId: currentConvId || undefined,
          model: selectedModel,
          thinkingLevel: thinkingLevel as 'high' | 'low',
          agentSettings, // Pass effective settings
        });

        if (result.conversationId && !conversationId) {
          setConversationId(result.conversationId);
        }
      } catch (error) {
        console.error('Error starting async chat:', error);
        setIsSending(false);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === 'assistant' && !last.content) {
            next[next.length - 1] = { ...last, content: `Lo siento, ocurrió un error: ${errorMessage}` };
          }
          return next;
        });
      }
      return;
    }

    // SYNC MODE (Fallback)
    try {
      const controller = new AbortController();
      currentAbort.current = controller;
      
      const assistantId = genId();
      setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "", metadata: { type: "text" } }]);
      
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId: currentConvId,
          useSalesAgent: true, // Use the new agent
          model: selectedModel,
          thinkingLevel: thinkingLevel,
          agentSettings, // Pass settings
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error("Failed to fetch response");
      }

      const headerConversationId = response.headers.get("X-Conversation-Id") || currentConvId || null;
      if (headerConversationId && !conversationId) setConversationId(headerConversationId);

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Streaming not supported");
      }

      const decoder = new TextDecoder();
      let text = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setMessages(prev => prev.map(m => (m.id === assistantId ? { ...m, content: text } : m)));
      }

      text += decoder.decode();
      setMessages(prev => prev.map(m => (m.id === assistantId ? { ...m, content: text } : m)));
      setIsSending(false);

      if (headerConversationId) {
        await conversationManager.addMessage(headerConversationId, {
          id: "",
          role: "assistant" as const,
          content: text,
          createdAt: new Date(),
          modelName: selectedModel,
          metadata: {},
        });
      }

      window.dispatchEvent(new Event("conversation-updated"));
    } catch (error) {
      console.error("Error in sync chat:", error);
      setIsSending(false);
      const msg = error instanceof Error ? error.message : "Error desconocido";
      setMessages(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant") {
          next[next.length - 1] = { ...last, content: `Lo siento, ocurrió un error: ${msg}` };
        }
        return next;
      });
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting || isSending) return;
    setIsSubmitting(true);
    try {
      const shouldContinue = await checkUsageAndWarn();
      if (!shouldContinue) return;
      await startChat(input);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuggestionClick = async (suggestion: string) => {
    if (isSubmitting || isSending) return;
    setInput(suggestion);
    setIsSubmitting(true);
    try {
      const shouldContinue = await checkUsageAndWarn();
      if (!shouldContinue) return;
      await startChat(suggestion);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Initial load effect
  useEffect(() => {
    conversationManager.loadFromStorage();
    if (initialConversationId && initialMessages.length > 0) {
      // Hydrate messages logic...
      // For brevity, using initialMessages directly if they match structure, 
      // otherwise needs parsing logic from original ChatUI.
      // Assuming initialMessages are already formatted or close enough.
      // The original code did complex parsing.
      
      const hydrated: Message[] = [];
      for (const msg of initialMessages) {
        // ... (parsing logic)
        // I'll skip full hydration logic copy-paste and assume standard format for now.
        // Or better, I should implement it.
        const role = msg.role as "user" | "assistant" | "system";
        if (role === 'assistant') {
           const { clean, extractedSearchResult, extractedEmailDraft, extractedTodos, extractedDisplayConfig, metadata } = parseAndSanitizeMessage(role, msg.content || '');
           if (extractedTodos && extractedTodos.length > 0) {
             hydrated.push({
               id: genId(),
               role: 'system',
               content: '',
               todos: extractedTodos,
               metadata: { type: 'planning' }
             });
           }
           hydrated.push({
             id: genId(),
             role: 'assistant',
             content: clean,
             searchResult: (msg.metadata?.searchResult) || extractedSearchResult,
             emailDraft: (msg.metadata?.emailDraft) || extractedEmailDraft,
             displayConfig: extractedDisplayConfig,
             agentStateEvents: msg.metadata?.agentStateEvents,
             metadata: { ...msg.metadata, ...metadata }
           });
        } else {
           hydrated.push({
             id: genId(),
             role,
             content: msg.content,
             metadata: msg.metadata,
             todos: msg.metadata?.todos
           });
        }
      }
      setMessages(hydrated);
      setConversationId(initialConversationId);
    }
  }, [initialConversationId, initialMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (autoScroll) scrollToBottom();
  }, [messages, autoScroll]);

  // Scroll handler
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const handleScroll = () => {
      if (scrollContainer) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        const isScrolledUp = scrollTop < scrollHeight - clientHeight - 100;
        setShowScrollToBottom(isScrolledUp);
        setAutoScroll(!isScrolledUp);
      }
    };
    scrollContainer?.addEventListener("scroll", handleScroll);
    return () => scrollContainer?.removeEventListener("scroll", handleScroll);
  }, []);

  const openConfirm = (message: string) => new Promise<boolean>(resolve => setConfirmState({ open: true, message, resolve }));

  const toggleDebug = (msgId: string) => {
    setExpandedDebug(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMessageIndex(index);
      setTimeout(() => setCopiedMessageIndex(null), 2000);
    });
  };

  // Suggestions logic
  const allSuggestions = useMemo(() => [
    'Analiza el sector de logística en Guayas: principales jugadores y cuotas',
    'Investiga la salud financiera de Corporación Favorita y sus subsidiarias',
    'Busca proveedores de alimentos en Quito con ingresos > $100k',
    'Encuentra al Gerente de Compras de Pronaca y redacta un correo de presentación',
    'Comparativa de métricas financieras: Supermaxi vs Mi Comisariato',
    'Mapea competidores en el sector farmacéutico en Cuenca',
    'Due diligence rápido de la empresa con RUC 1790016919001',
    'Identifica empresas exportadoras de banano en El Oro para alianza estratégica',
    'Busca oportunidades de inversión en el sector inmobiliario en Manta'
  ], []);

  useEffect(() => {
    const selectRandomSuggestions = () => {
      const shuffled = [...allSuggestions].sort(() => 0.5 - Math.random());
      setSuggestions(shuffled.slice(0, 4));
    };
    selectRandomSuggestions();
    const interval = setInterval(selectRandomSuggestions, 30000);
    return () => clearInterval(interval);
  }, [allSuggestions]);

  useEffect(() => {
    async function fetchUserPlan() {
      try {
        const response = await fetch('/api/subscriptions/status');
        if (response.ok) {
          const data = await response.json();
          setUserPlan(data.status?.plan || 'FREE');
        }
      } catch (error) {
        console.error('Error fetching user plan:', error);
      }
    }
    fetchUserPlan();
  }, []);

  return (
    <div className="relative flex h-full min-h-[100dvh] w-full bg-[#F8F8F8] overflow-hidden">
      <ConversationSidebar
        currentConversationId={conversationId}
        onConversationChange={(id) => {
          setMessages([]);
          setConversationId(id);
          conversationManager.setCurrentConversation(id);
        }}
        onNewConversation={() => {
          setMessages([]);
          setConversationId(null);
          conversationManager.setCurrentConversation(null);
        }}
        appSidebarOffset={appSidebarOffset}
      />

      <div className="flex-1 flex flex-col min-h-0 bg-white relative">
        <AnimatePresence>
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 lg:p-12"
            >
              <div className="w-full max-w-5xl mx-auto flex flex-col items-center gap-8 md:gap-12">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className="w-full max-w-2xl text-center space-y-3"
                >
                  <p className="text-[11px] md:text-[13px] uppercase tracking-[0.2em] text-gray-400">Impulsado por Gemini</p>
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-medium text-gray-900 leading-tight">
                    Motor de Búsqueda Empresarial
                  </h1>
                  <p className="text-sm md:text-base lg:text-lg text-gray-600 font-light leading-relaxed px-4">
                    Analiza empresas, compara mercados y genera ideas accionables con una interfaz enfocada en la información.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="w-full max-w-3xl px-4 md:px-0"
                >
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <p className="text-sm font-medium text-gray-800">Ideas para empezar</p>
                    <span className="text-xs text-gray-400">Selecciona una</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                    {suggestions.map((s, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 + i * 0.05, duration: 0.3 }}
                        onClick={() => handleSuggestionClick(s)}
                        disabled={isSubmitting || isSending}
                        className="text-left p-3 rounded-xl border border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 text-xs md:text-sm text-gray-600 transition-colors disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {s}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.4 }}
                  className="w-full max-w-3xl mt-4 px-4 md:px-0"
                >
                  <ChatInputBar
                    input={input}
                    onInputChange={(e) => setInput(e.target.value)}
                    onSubmit={handleSubmit}
                    isSending={isSending}
                    isSubmitting={isSubmitting}
                    selectedModel={selectedModel}
                    onModelChange={handleModelChange}
                    thinkingLevel={thinkingLevel}
                    onThinkingChange={handleThinkingChange}
                    userPlan={userPlan}
                    onSettingsClick={() => setSettingsOpen(true)}
                  />
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {messages.length > 0 && (
          <>
            <ChatMessageList
              messages={messages}
              isSending={isSending}
              expandedDebug={expandedDebug}
              toggleDebug={toggleDebug}
              handleWaitTokenAction={handleWaitTokenAction}
              copiedMessageIndex={copiedMessageIndex}
              handleCopy={handleCopy}
              copiedInline={copiedInline}
              setCopiedInline={setCopiedInline}
              messagesEndRef={messagesEndRef}
              scrollContainerRef={scrollContainerRef}
              showScrollToBottom={showScrollToBottom}
              scrollToBottom={scrollToBottom}
            />

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="border-t border-gray-200 bg-white p-2 md:p-4 lg:p-5 pb-3 md:pb-5"
            >
              {banner && (
                <div className="max-w-3xl mx-auto mb-2.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 px-3 py-2 text-xs flex items-start gap-2">
                  <span className="flex-1">{banner}</span>
                  <button
                    type="button"
                    className="px-2 py-0.5 rounded-md border border-amber-300 bg-white text-amber-900 text-[10px]"
                    onClick={() => setBanner(null)}
                    aria-label="Cerrar aviso"
                  >
                    Cerrar
                  </button>
                </div>
              )}
              
              {/* Extract latest todos from messages */}
              {(() => {
                // Find the latest planning message or assistant message with todos
                const planningMessage = [...messages].reverse().find(
                  msg => msg.role === 'system' && msg.metadata?.type === 'planning' && msg.todos
                );
                const assistantMessageWithTodos = [...messages].reverse().find(
                  msg => msg.role === 'assistant' && msg.todos && msg.todos.length > 0
                );
                const latestTodos = planningMessage?.todos || assistantMessageWithTodos?.todos;
                
                return latestTodos && latestTodos.length > 0 ? (
                  <div className="max-w-3xl mx-auto mb-3">
                    <PlanningCard todos={latestTodos} />
                  </div>
                ) : null;
              })()}
              
              <ChatInputBar
                input={input}
                onInputChange={(e) => setInput(e.target.value)}
                onSubmit={handleSubmit}
                isSending={isSending}
                isSubmitting={isSubmitting}
                selectedModel={selectedModel}
                onModelChange={handleModelChange}
                thinkingLevel={thinkingLevel}
                onThinkingChange={handleThinkingChange}
                userPlan={userPlan}
                onSettingsClick={() => setSettingsOpen(true)}
              />
            </motion.div>
          </>
        )}

        <ChatSettingsPanel
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          settings={agentSettings}
          onSettingsChange={handleSettingsChange}
          onSaveDefaults={saveSettingsAsDefaults}
          onSaveConversation={saveSettingsToConversation}
          canSaveConversation={!!conversationId}
          savingDefaults={savingDefaults}
          savingConversation={savingConversation}
        />
      </div>

      {confirmState.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-4 shadow-xl w-full max-w-sm border border-slate-200">
            <p className="text-sm text-gray-800 mb-4">{confirmState.message}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1.5 text-xs rounded-md border border-slate-200 bg-white hover:bg-gray-50"
                onClick={() => {
                  confirmState.resolve?.(false);
                  setConfirmState({ open: false, message: "" });
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-xs rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                onClick={() => {
                  confirmState.resolve?.(true);
                  setConfirmState({ open: false, message: "" });
                }}
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

