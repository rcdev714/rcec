"use client";

import { useState, FormEvent, ChangeEvent, useRef, useEffect, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, LoaderCircle, Copy, CopyCheck, ArrowUp, Infinity, CheckCircle2, XCircle } from "lucide-react";
import { ModelSelector } from "./model-selector";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import UserAvatar from "./user-avatar";
import ConversationSidebar from "./conversation-sidebar";
import ConversationManager from "@/lib/conversation-manager";
import { SmartCompanyDisplay } from "./chat-company-display";
import { CompanySearchResult } from "@/types/chat";
import { EmailDraftCard } from "./email-draft-card";
import { AgentStateEvent, AgentStateDetail } from "./agent-state-indicator";
import { useAgentRun, type AgentRun } from "@/lib/hooks/use-agent-run";

interface EmailDraft {
  subject: string;
  body: string;
  toName?: string;
  toEmail?: string;
  companyName?: string;
}

interface TodoItem {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  searchResult?: CompanySearchResult;
  emailDraft?: EmailDraft;
  agentStateEvents?: AgentStateEvent[];
  todos?: TodoItem[];
  // Display configuration - which company RUCs to feature
  displayConfig?: { featuredRUCs?: string[] };
  metadata?: {
    type?: 'text' | 'company_results' | 'export_link' | 'email_draft' | 'planning';
    showAgentDetails?: boolean;
  };
}

// Dynamic skeleton placeholder for assistant loading state
const LoadingSpinner = () => {
  const statuses = ['Pensando...', 'Accediendo base de datos...', 'Buscando en la web...'];
  const [statusIndex, setStatusIndex] = useState(0);
  const bars = ['100%', '96%', '88%'];

  useEffect(() => {
    const id = setInterval(() => {
      setStatusIndex((idx) => (idx + 1) % statuses.length);
    }, 3400);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w-full space-y-3" aria-busy="true" aria-label="Cargando respuesta">
      {bars.map((width, idx) => (
        <motion.div
          key={width}
          className="h-4 min-w-[320px] rounded-xl bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          style={{ width, backgroundSize: '200% 100%', maxWidth: width }}
          animate={{
            backgroundPosition: ['0% 0%', '120% 0%', '0% 0%'],
            opacity: [0.55, 1, 0.55],
          }}
          transition={{
            duration: 1.6,
            repeat: Number.POSITIVE_INFINITY,
            ease: 'easeInOut',
            delay: idx * 0.12,
          }}
        />
      ))}
      <div className="flex items-center gap-2 text-[11px] text-gray-600 min-h-[16px]">
        <LoaderCircle className="w-3.5 h-3.5 animate-spin text-gray-300" />
        <AnimatePresence mode="wait">
          <motion.span
            key={statusIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            {statuses[statusIndex]}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
};

// Helper to format tool names for display
const formatToolName = (toolName: string): string => {
  const toolNames: Record<string, string> = {
    // Company tools
    'search_companies': 'Búsqueda en base de datos empresarial',
    'get_company_details': 'Obtener detalles de empresa',
    'refine_search': 'Refinar búsqueda en base de datos empresarial',
    'export_companies': 'Exportar empresas',
    // Web search
    'web_search': 'Búsqueda en internet',
    'web_extract': 'Extraer información de páginas web',
    // Contact tools
    'enrich_company_contacts': 'Buscar contactos en base de datos empresarial',
    // Offerings tools
    'list_user_offerings': 'Ver mis servicios/productos',
    'get_offering_details': 'Obtener detalles de mi servicio',
    // Email tools (if re-enabled in future)
    'generate_sales_email': 'Generar email de ventas',
  };
  return toolNames[toolName] || toolName;
};

// Defensive render-time sanitization to prevent any bracketed tags or raw JSON
function sanitizeForRender(text: string): string {
  if (!text) return "";
  let clean = text
    // Remove internal tags
    .replace(/\[AGENT_PLAN\][\s\S]*?\[\/AGENT_PLAN\]/g, '')
    .replace(/\[STATE_EVENT\][\s\S]*?\[\/STATE_EVENT\]/g, '')
    .replace(/\[SEARCH_RESULTS\][\s\S]*?\[\/SEARCH_RESULTS\]/g, '')
    .replace(/\[DISPLAY_CONFIG\][\s\S]*?\[\/DISPLAY_CONFIG\]/g, '')
    .replace(/\[EMAIL_DRAFT\][\s\S]*?\[\/EMAIL_DRAFT\]/g, '')
    .replace(/\[TOKEN_USAGE\][\s\S]*?\[\/TOKEN_USAGE\]/g, '')
    // Remove any remaining [object Object] artifacts
    .replace(/\[object Object\],?/g, '')
    // Remove Gemini 3 specific tags
    .replace(/<const>[\s\S]*?<\/const>/g, '')
    .replace(/<tool_code>[\s\S]*?<\/tool_code>/g, '')
    // Replace HTML break tags with newlines
    .replace(/<br\s*\/?>/gi, '\n');
  
  // Remove Gemini internal JSON (functionCall, thoughtSignature) - can be very long
  // Match JSON arrays containing these keys and remove them completely
  if (clean.includes('"functionCall"') || clean.includes('"thoughtSignature"')) {
    // Remove JSON that starts with [{ and contains these internal keys
    clean = clean.replace(/\[\s*\{[^[\]]*"(?:functionCall|thoughtSignature)"[^]*?\}\s*\]/g, '');
    // Also try to catch partial JSON fragments
    clean = clean.replace(/"thoughtSignature"\s*:\s*"[^"]*"/g, '');
    clean = clean.replace(/"functionCall"\s*:\s*\{[^}]*\}/g, '');
  }
  
  return clean.trim();
}

// Code block component with copy button
const CodeBlock = ({ children }: { children?: React.ReactNode }) => {
  const [copied, setCopied] = useState(false);
  const text = Array.isArray(children) ? children.join('') : (children as string) || '';
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { }
  };
  return (
    <div className="relative group">
      <pre className="rounded-md border border-gray-200 bg-gray-50 p-3 overflow-auto text-sm">
        <code>{text}</code>
      </pre>
      <button
        type="button"
        onClick={onCopy}
        className="absolute top-2 right-2 rounded-md border border-gray-200 bg-white/90 px-2 py-1 text-xs text-gray-600 shadow-sm opacity-0 group-hover:opacity-100 transition"
      >
        {copied ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  );
};

interface ChatUIProps {
  initialConversationId?: string;
  initialMessages?: {
    role: string;
    content: string;
    metadata?: {
      searchResult?: CompanySearchResult;
      emailDraft?: EmailDraft;
      agentStateEvents?: AgentStateEvent[];
      todos?: TodoItem[];
      type?: 'text' | 'company_results' | 'export_link' | 'email_draft' | 'planning';
    }
  }[];
  appSidebarOffset?: number;
  /** Enable async mode using Trigger.dev background workers */
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
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.5-pro");
  const [thinkingLevel, setThinkingLevel] = useState<'high' | 'low'>('high');
  const [userPlan, setUserPlan] = useState<'FREE' | 'PRO' | 'ENTERPRISE'>('FREE');
  const [planLoaded, setPlanLoaded] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{ open: boolean; message: string; resolve?: (v: boolean) => void }>({ open: false, message: "" });
  const openConfirm = (message: string) => new Promise<boolean>(resolve => setConfirmState({ open: true, message, resolve }));

  // State for detailed debug views per message
  const [expandedDebug, setExpandedDebug] = useState<Record<string, boolean>>({});
  const toggleDebug = (msgId: string) => {
    setExpandedDebug(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  // Async mode: Use the agent run hook for realtime updates
  const handleAgentUpdate = useCallback((run: AgentRun) => {
    // Update the assistant message with real-time data
    setMessages(prev => {
      const next = [...prev];
      const lastMessage = next[next.length - 1];

      if (lastMessage?.role === 'assistant') {
        // Build agent state events from run progress
        const agentEvents: AgentStateEvent[] = [];
        if (run.current_node) {
          agentEvents.push({
            type: 'thinking',
            node: run.current_node,
            message: `Procesando: ${run.current_node}`,
          });
        }

        next[next.length - 1] = {
          ...lastMessage,
          content: run.response_content || lastMessage.content || '',
          searchResult: run.search_results as CompanySearchResult | undefined,
          emailDraft: run.email_draft || undefined,
          todos: (run.todos || []).map(t => ({
            ...t,
            createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
            completedAt: t.completedAt ? new Date(t.completedAt) : undefined,
          })) as TodoItem[],
          agentStateEvents: agentEvents.length > 0 ? agentEvents : lastMessage.agentStateEvents,
          metadata: {
            ...lastMessage.metadata,
            type: run.search_results ? 'company_results' : run.email_draft ? 'email_draft' : 'text',
          },
        };
      }

      return next;
    });
  }, []);

  const handleAgentComplete = useCallback((run: AgentRun) => {
    setIsSending(false);

    // Final update with complete data
    setMessages(prev => {
      const next = [...prev];
      const lastMessage = next[next.length - 1];

      if (lastMessage?.role === 'assistant') {
        next[next.length - 1] = {
          ...lastMessage,
          content: run.response_content || 'Tarea completada.',
          searchResult: run.search_results as CompanySearchResult | undefined,
          emailDraft: run.email_draft || undefined,
          todos: (run.todos || []).map(t => ({
            ...t,
            createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
            completedAt: t.completedAt ? new Date(t.completedAt) : undefined,
          })) as TodoItem[],
          metadata: {
            ...lastMessage.metadata,
            type: run.search_results ? 'company_results' : run.email_draft ? 'email_draft' : 'text',
          },
        };
      }

      return next;
    });

    // Notify sidebar
    window.dispatchEvent(new Event('conversation-updated'));
  }, []);

  const handleAgentError = useCallback((error: string) => {
    setIsSending(false);
    setBanner(error);

    // Update message with error
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

  const { startRun } = useAgentRun({
    onUpdate: handleAgentUpdate,
    onComplete: handleAgentComplete,
    onError: handleAgentError,
  });

  // Note: currentAgentEvents tracking removed - state events are now stored in message metadata
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentAbort = useRef<AbortController | null>(null);
  const usageCheckRef = useRef<{ ts: number; allowed: boolean } | null>(null);
  const conversationManager = useMemo(() => ConversationManager.getInstance(), []);
  const rafIdRef = useRef<number | null>(null);
  const genId = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? (crypto.randomUUID as () => string)()
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const scheduleAssistantContentUpdate = (text: string, events?: AgentStateEvent[]) => {
    if (rafIdRef.current != null) return;
    rafIdRef.current = requestAnimationFrame(() => {
      setMessages(prev => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === 'assistant') {
          next[next.length - 1] = { ...last, content: text, ...(events ? { agentStateEvents: [...events] } : {}) };
        }
        return next;
      });
      rafIdRef.current = null;
    });
  };

  // Markdown components configuration (stable reference)
  const markdownComponents = useMemo(() => ({
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline"
      >
        {children}
      </a>
    ),
    p: ({ children }: { children?: React.ReactNode }) => (
      <p className="mb-4 last:mb-0">{children}</p>
    ),
    h1: ({ children }: { children?: React.ReactNode }) => (
      <h1 className="text-xl font-normal mb-4 mt-6 first:mt-0">{children}</h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 className="text-lg font-normal mb-3 mt-5 first:mt-0">{children}</h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="text-base font-normal mb-2 mt-4 first:mt-0">{children}</h3>
    ),
    h4: ({ children }: { children?: React.ReactNode }) => (
      <h4 className="text-sm font-normal mb-2 mt-3 first:mt-0">{children}</h4>
    ),
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="list-disc list-inside mb-4 space-y-1">{children}</ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="list-decimal list-inside mb-4 space-y-1">{children}</ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => (
      <li className="ml-4">{children}</li>
    ),
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote className="border-l-4 border-gray-300 pl-4 italic my-4">{children}</blockquote>
    ),
    table: ({ children }: { children?: React.ReactNode }) => (
      <div className="overflow-x-auto mb-4">
        <table className="min-w-full border-collapse border border-gray-300">{children}</table>
      </div>
    ),
    thead: ({ children }: { children?: React.ReactNode }) => (
      <thead className="bg-gray-100">{children}</thead>
    ),
    th: ({ children }: { children?: React.ReactNode }) => (
      <th className="border border-gray-300 px-4 py-2 text-left font-normal">{children}</th>
    ),
    td: ({ children }: { children?: React.ReactNode }) => (
      <td className="border border-gray-300 px-4 py-2">{children}</td>
    ),
    code: ({ inline, children }: { inline?: boolean; children?: React.ReactNode }) => {
      const text = Array.isArray(children) ? children.join('') : (children as string) || '';
      if (inline) {
        return (
          <code
            onClick={async () => {
              setCopiedInline(text);
              try {
                await navigator.clipboard.writeText(text);
              } catch { }
              setTimeout(() => setCopiedInline(null), 1200);
            }}
            title={copiedInline === text ? 'Copiado' : 'Click para copiar'}
            className="cursor-pointer rounded bg-gray-100 px-1.5 py-0.5 text-gray-800 hover:bg-gray-200"
          >
            {children}
          </code>
        );
      }
      // For code blocks, just return the code element and let pre handle the styling
      return <code>{children}</code>;
    },
    pre: ({ children }: { children?: React.ReactNode }) => {
      // Extract text from children
      const getTextFromChildren = (node: React.ReactNode): string => {
        if (typeof node === 'string') return node;
        if (Array.isArray(node)) return node.map(getTextFromChildren).join('');
        if (node && typeof node === 'object' && 'props' in node) {
          const nodeWithProps = node as { props?: { children?: React.ReactNode } };
          return getTextFromChildren(nodeWithProps.props?.children);
        }
        return '';
      };
      const text = getTextFromChildren(children);
      return <CodeBlock>{text}</CodeBlock>;
    },
  }), [copiedInline]);

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

  // Efecto para seleccionar sugerencias dinámicas al montar y rotarlas cada 30 segundos
  useEffect(() => {
    const selectRandomSuggestions = () => {
      const shuffled = [...allSuggestions].sort(() => 0.5 - Math.random());
      setSuggestions(shuffled.slice(0, 4));
    };

    // Initial selection
    selectRandomSuggestions();

    // Rotate every 30 seconds
    const interval = setInterval(selectRandomSuggestions, 30000);

    return () => clearInterval(interval);
  }, [allSuggestions]);

  // Fetch user subscription plan
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
      } finally {
        setPlanLoaded(true);
      }
    }
    fetchUserPlan();
  }, []);

  // Load saved model preference and thinking level from localStorage and validate access
  useEffect(() => {
    // Only run after the plan has been loaded to avoid resetting pro users' models
    if (!planLoaded) {
      return;
    }

    const savedModel = localStorage.getItem('gemini-model');
    const savedThinkingLevel = localStorage.getItem('gemini-thinking-level');

    if (savedThinkingLevel && (savedThinkingLevel === 'high' || savedThinkingLevel === 'low')) {
      setThinkingLevel(savedThinkingLevel);
    }

    if (savedModel) {
      // If user has a pro model saved but they're on free plan, reset to flash - Removed to allow all models
      /*
      if ((savedModel === 'gemini-2.5-pro' || savedModel === 'gemini-3-pro-preview') && userPlan === 'FREE') {
        // Only update if different from current state to avoid unnecessary writes
        if (selectedModel !== 'gemini-2.5-flash') {
          setSelectedModel('gemini-2.5-flash');
          localStorage.setItem('gemini-model', 'gemini-2.5-flash');
        }
      } else {
      */
      // Only update if different from current state to avoid unnecessary writes
      if (selectedModel !== savedModel) {
        setSelectedModel(savedModel);
      }
      // }
    }
  }, [planLoaded, userPlan, selectedModel]);

  // Save model preference to localStorage and validate access
  const handleModelChange = (model: string) => {
    // Check if user can access pro models - Removed to allow all models for everyone
    /*
    if ((model === 'gemini-2.5-pro' || model === 'gemini-3-pro-preview') && userPlan === 'FREE') {
      const modelName = model === 'gemini-3-pro-preview' ? 'Gemini 3 Pro Preview' : 'gemini-2.5-pro';
      setBanner(`El modelo de razonamiento avanzado (${modelName}) requiere un plan Pro o Enterprise. Por favor actualiza tu plan.`);
      return;
    }
    */
    setSelectedModel(model);
    localStorage.setItem('gemini-model', model);
  };

  // Save thinking level preference to localStorage
  const handleThinkingLevelChange = (level: 'high' | 'low') => {
    setThinkingLevel(level);
    localStorage.setItem('gemini-thinking-level', level);
  };

  // Helper to sanitize legacy content and extract structured blocks
  const parseAndSanitizeMessage = (role: "user" | "assistant" | "system", content: string) => {
    let clean = content || "";

    // Remove any STATE_EVENT blocks entirely
    clean = clean.replace(/\[STATE_EVENT\][\s\S]*?\[\/STATE_EVENT\]/g, "");

    // Extract SEARCH_RESULTS
    let extractedSearchResult: CompanySearchResult | undefined;
    clean = clean.replace(/\[SEARCH_RESULTS\]([\s\S]*?)\[\/SEARCH_RESULTS\]/g, (_m: string, p1: string) => {
      try {
        const parsed = JSON.parse(p1);
        extractedSearchResult = parsed;
      } catch {
        // Ignore parse errors
      }
      return "";
    });

    // Extract DISPLAY_CONFIG for company cards
    let extractedDisplayConfig: { featuredRUCs?: string[] } | undefined;
    clean = clean.replace(/\[DISPLAY_CONFIG\]([\s\S]*?)\[\/DISPLAY_CONFIG\]/g, (_m: string, p1: string) => {
      try {
        const parsed = JSON.parse(p1);
        extractedDisplayConfig = parsed;
      } catch {
        // Ignore parse errors
      }
      return "";
    });

    // Extract EMAIL_DRAFT
    let extractedEmailDraft: EmailDraft | undefined;
    clean = clean.replace(/\[EMAIL_DRAFT\]([\s\S]*?)\[\/EMAIL_DRAFT\]/g, (_m: string, p1: string) => {
      try {
        const parsed = JSON.parse(p1);
        extractedEmailDraft = parsed;
      } catch {
        // Ignore parse errors
      }
      return "";
    });

    // Extract AGENT_PLAN (todos)
    let extractedTodos: TodoItem[] | undefined;
    clean = clean.replace(/\[AGENT_PLAN\]([\s\S]*?)\[\/AGENT_PLAN\]/g, (_m: string, p1: string) => {
      try {
        const parsed = JSON.parse(p1);
        extractedTodos = parsed;
      } catch {
        // Ignore parse errors
      }
      return "";
    });

    // Remove any remaining [AGENT_PLAN] markers (in case they appear without closing tags or with extra content)
    clean = clean.replace(/\[AGENT_PLAN\][^\[]*$/g, "");
    clean = clean.replace(/\[\/AGENT_PLAN\]/g, "");

    // Strip common tool transcript lines that might have leaked into model text
    clean = clean
      .replace(/^Herramienta utilizada:[\s\S]*?(?=\n\n|$)/gmi, "")
      .replace(/^Parámetros:[\s\S]*?(?=\n\n|$)/gmi, "")
      .replace(/\[CALL:[^\]]*\][^\n]*\n?/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const metadata: Message["metadata"] = {};
    if (extractedSearchResult) {
      metadata.type = 'company_results';
    }
    if (extractedEmailDraft) {
      metadata.type = 'email_draft';
    }

    return { clean, extractedSearchResult, extractedEmailDraft, extractedTodos, extractedDisplayConfig, metadata };
  };

  // Cargar conversaciones guardadas al inicializar
  useEffect(() => {
    conversationManager.loadFromStorage();

    if (initialConversationId && initialMessages.length > 0) {
      // Load and sanitize initial messages from server
      const hydrated: Message[] = [];
      for (const msg of initialMessages) {
        const role = msg.role as "user" | "assistant" | "system";
        if (role === 'assistant') {
          const { clean, extractedSearchResult, extractedEmailDraft, extractedTodos, extractedDisplayConfig, metadata } = parseAndSanitizeMessage(role, msg.content || '');
          if (extractedTodos && extractedTodos.length > 0) {
            hydrated.push({
              id: genId(),
              role: 'system',
              content: '',
              todos: extractedTodos as TodoItem[],
              metadata: { type: 'planning' }
            });
          }
          hydrated.push({
            id: genId(),
            role: 'assistant',
            content: clean,
            searchResult: (msg.metadata?.searchResult as CompanySearchResult) || extractedSearchResult,
            emailDraft: (msg.metadata?.emailDraft as EmailDraft) || extractedEmailDraft,
            displayConfig: extractedDisplayConfig,
            agentStateEvents: msg.metadata?.agentStateEvents as AgentStateEvent[] || undefined, // Restore agent workflow
            metadata: { ...msg.metadata, ...metadata }
          });
        } else {
          const { agentStateEvents: _drop, ...restMetadata } = (msg.metadata || {}) as Record<string, unknown>;
          hydrated.push({
            id: genId(),
            role,
            content: msg.content,
            // pass through any metadata except agent state events
            metadata: Object.keys(restMetadata).length > 0 ? restMetadata : undefined,
          });
        }
      }
      setMessages(hydrated);
      setConversationId(initialConversationId);
    }
    // Note: For new conversations (no initialConversationId), state is already initialized empty
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConversationId, initialMessages]);
  // Abort any active request when unmounting
  useEffect(() => {
    return () => currentAbort.current?.abort();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (autoScroll) {
      scrollToBottom();
    }
  }, [messages, autoScroll]);

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

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMessageIndex(index);
      setTimeout(() => setCopiedMessageIndex(null), 2000);
    });
  };

  const handleNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    // Clear current conversation from manager to ensure clean state
    conversationManager.setCurrentConversation(null);
  };

  const handleConversationChange = (id: string | null) => {
    setMessages([]);
    setConversationId(id);
    // Update the manager's current conversation
    conversationManager.setCurrentConversation(id);
  };


  /* 
  // Disable loading more results for now as it conflicts with the new async workflow
  const handleLoadMoreResults = async (searchResult: CompanySearchResult) => {
    try {
      const response = await fetch('/api/chat/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchResult.query,
          limit: 10,
          page: Math.floor(searchResult.companies.length / 10) + 1, // Next page
        }),
      });

      const result = await response.json();

      if (result.success && result.result) {
        // Update the message with more results
        setMessages((prev) => {
          const newMessages = [...prev];
          const messageIndex = newMessages.findIndex(msg =>
            msg.searchResult && msg.searchResult.query === searchResult.query
          );

          if (messageIndex !== -1) {
            const message = newMessages[messageIndex];
            if (message.searchResult) {
              // Create a unique key for each company entry (ruc + year + id combination)
              const existingKeys = new Set(
                message.searchResult.companies.map(c =>
                  `${c.ruc || c.id}-${c.anio || 'unknown'}`
                )
              );

              // Filter out duplicates from new results
              const newUniqueCompanies = result.result.companies.filter((c: { ruc?: string; id?: string; anio?: string | number }) => {
                const key = `${c.ruc || c.id}-${c.anio || 'unknown'}`;
                return !existingKeys.has(key);
              });

              message.searchResult.companies = [
                ...message.searchResult.companies,
                ...newUniqueCompanies
              ];
            }
          }

          return newMessages;
        });
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error loading more results:', error);
      }
    }
  };
  */

  /**
   * Start a chat message - routes to sync or async mode based on useAsyncMode prop
   */
  const startChat = async (message: string) => {
    if (!message.trim() || isSending) return;

    // Common setup
    setIsSending(true);
    const userMessage: Message = { id: genId(), role: "user", content: message };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Create or get conversation
    let currentConvId = conversationId;
    if (!currentConvId) {
      currentConvId = await conversationManager.createConversation(message);
      setConversationId(currentConvId);
      window.dispatchEvent(new Event('conversation-updated'));
    } else {
      await conversationManager.updateActivity(currentConvId);
    }

    // Store user message
    if (currentConvId) {
      await conversationManager.addMessage(currentConvId, {
        id: '',
        role: 'user' as const,
        content: message,
        createdAt: new Date(),
      });
    }

    // ASYNC MODE: Use Trigger.dev background worker
    if (useAsyncMode) {
      try {
        // Add placeholder assistant message
        const assistantMessageId = genId();
        setMessages((prev) => [...prev, {
          id: assistantMessageId,
          role: "assistant",
          content: "",
          metadata: { type: 'text' }
        }]);

        // Start async run
        const result = await startRun({
          message,
          conversationId: currentConvId || undefined,
          model: selectedModel,
          thinkingLevel: thinkingLevel as 'high' | 'low',
        });

        // Update conversation ID if new one was created
        if (result.conversationId && !conversationId) {
          setConversationId(result.conversationId);
        }

        // The hook will handle updates via realtime subscription
        console.log('[startChat] Async run started:', result.runId);

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

    // SYNC MODE: Original streaming implementation
    let finalSearchResult: CompanySearchResult | undefined;
    let finalEmailDraft: EmailDraft | undefined;
    let agentPlan: TodoItem[] | undefined;
    const agentEvents: AgentStateEvent[] = [];
    let tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number } | undefined;

    try {
      // Cancel any in-flight request and create a new controller
      currentAbort.current?.abort();
      const controller = new AbortController();
      currentAbort.current = controller;
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId: currentConvId,
          useLangGraph: true, // Enable LangGraph features
          model: selectedModel, // Send selected model
          thinkingLevel: thinkingLevel // Send thinking level for Gemini 3
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorMessage = "Failed to fetch chat response.";
        let isRateLimit = false;
        let upgradeUrl = "/pricing";

        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          isRateLimit = response.status === 429 || errorData.error === "Rate limit exceeded";
          upgradeUrl = errorData.upgradeUrl || "/pricing";

          if (process.env.NODE_ENV !== 'production') {
            console.error("API Error:", errorData);
          }
        } catch {
          // If response is not JSON, try to get text
          const errorText = await response.text();
          if (errorText) {
            errorMessage = errorText;
            isRateLimit = errorText.includes("Rate limit exceeded") || errorText.includes("límite");
          }
        }

        // Handle rate limiting specifically
        if (isRateLimit) {
          setMessages((prev) => [...prev, {
            id: genId(),
            role: "assistant",
            content: `${errorMessage}\n\n[Actualizar Plan](${upgradeUrl})`,
            metadata: { type: 'text' }
          }]);
          return;
        }

        throw new Error(errorMessage);
      }

      if (!response.body) return;

      // Extract conversation ID from response headers if not already set
      const responseConversationId = response.headers.get("X-Conversation-Id");
      if (responseConversationId && !conversationId) {
        setConversationId(responseConversationId);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantResponseText = ""; // To store text content without search results

      setMessages((prev) => [...prev, { id: genId(), role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (process.env.NODE_ENV === 'development') console.log("Stream finished.");
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        if (process.env.NODE_ENV === 'development') console.log(`Chunk received. Buffer size: ${buffer.length}`);

        // Process STATE_EVENT blocks
        const stateStartTag = '[STATE_EVENT]';
        const stateEndTag = '[/STATE_EVENT]';

        let stateEventBlockFound;
        do {
          stateEventBlockFound = false;
          const startIndex = buffer.indexOf(stateStartTag);
          const endIndex = buffer.indexOf(stateEndTag);

          if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            stateEventBlockFound = true;
            if (process.env.NODE_ENV === 'development') console.log("Found complete state event block in buffer.");

            const textBefore = buffer.substring(0, startIndex);
            const jsonStr = buffer.substring(startIndex + stateStartTag.length, endIndex);

            assistantResponseText += textBefore;
            buffer = buffer.substring(endIndex + stateEndTag.length);

            try {
              const stateEvent = JSON.parse(jsonStr) as AgentStateEvent;
              agentEvents.push(stateEvent);
              // Events are stored in agentEvents array and will be saved to message metadata

              if (process.env.NODE_ENV === 'development') console.log("Successfully parsed state event:", stateEvent);

              // Update the assistant message with live agent events
              setMessages((prev) => {
                const next = [...prev];
                const lastMessage = next[next.length - 1];
                if (lastMessage?.role === "assistant") {
                  next[next.length - 1] = { ...lastMessage, agentStateEvents: [...agentEvents] };
                }
                return next;
              });
            } catch (e) {
              console.error("Failed to parse state event JSON:", e, "JSON string was:", jsonStr);
            }
          }
        } while (stateEventBlockFound);

        // Process SEARCH_RESULTS blocks
        const searchStartTag = '[SEARCH_RESULTS]';
        const searchEndTag = '[/SEARCH_RESULTS]';

        let searchResultBlockFound;
        do {
          searchResultBlockFound = false;
          const startIndex = buffer.indexOf(searchStartTag);
          const endIndex = buffer.indexOf(searchEndTag);

          if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            searchResultBlockFound = true;
            if (process.env.NODE_ENV === 'development') console.log("Found complete search result block in buffer.");

            const textBefore = buffer.substring(0, startIndex);
            const jsonStr = buffer.substring(startIndex + searchStartTag.length, endIndex);

            assistantResponseText += textBefore;
            buffer = buffer.substring(endIndex + searchEndTag.length);

            try {
              const searchResult = JSON.parse(jsonStr);
              finalSearchResult = searchResult;

              if (process.env.NODE_ENV === 'development') console.log("Successfully parsed search results:", searchResult);

              setMessages((prev) => {
                const next = [...prev];
                const lastMessage = next[next.length - 1];
                if (lastMessage?.role === "assistant") {
                  next[next.length - 1] = {
                    ...lastMessage,
                    content: assistantResponseText,
                    searchResult,
                    metadata: { ...(lastMessage.metadata || {}), type: 'company_results' }
                  };
                }
                return next;
              });
            } catch (e) {
              console.error("Failed to parse search results JSON:", e, "JSON string was:", jsonStr);
              assistantResponseText += `${searchStartTag}${jsonStr}${searchEndTag}`;
            }
          }
        } while (searchResultBlockFound);

        // Process DISPLAY_CONFIG blocks (smart company rendering)
        const displayConfigStartTag = '[DISPLAY_CONFIG]';
        const displayConfigEndTag = '[/DISPLAY_CONFIG]';

        let displayConfigBlockFound;
        do {
          displayConfigBlockFound = false;
          const startIndex = buffer.indexOf(displayConfigStartTag);
          const endIndex = buffer.indexOf(displayConfigEndTag);

          if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            displayConfigBlockFound = true;
            if (process.env.NODE_ENV === 'development') console.log("Found display config block in buffer.");

            const textBefore = buffer.substring(0, startIndex);
            const jsonStr = buffer.substring(startIndex + displayConfigStartTag.length, endIndex);

            assistantResponseText += textBefore;
            buffer = buffer.substring(endIndex + displayConfigEndTag.length);

            try {
              const displayConfig = JSON.parse(jsonStr);
              if (process.env.NODE_ENV === 'development') console.log("Successfully parsed display config:", displayConfig);

              // Update the assistant message with display config
              setMessages((prev) => {
                const next = [...prev];
                const lastMessage = next[next.length - 1];
                if (lastMessage?.role === "assistant") {
                  next[next.length - 1] = {
                    ...lastMessage,
                    displayConfig,
                  };
                }
                return next;
              });
            } catch (e) {
              console.error("Failed to parse display config JSON:", e, "JSON string was:", jsonStr);
            }
          }
        } while (displayConfigBlockFound);

        // Process AGENT_PLAN blocks (planning/todos)
        const planStartTag = '[AGENT_PLAN]';
        const planEndTag = '[/AGENT_PLAN]';

        let planBlockFound;
        do {
          planBlockFound = false;
          const startIndex = buffer.indexOf(planStartTag);
          const endIndex = buffer.indexOf(planEndTag);

          if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            planBlockFound = true;
            if (process.env.NODE_ENV === 'development') console.log("Found complete agent plan block in buffer.");

            const textBefore = buffer.substring(0, startIndex);
            const jsonStr = buffer.substring(startIndex + planStartTag.length, endIndex);

            assistantResponseText += textBefore;
            buffer = buffer.substring(endIndex + planEndTag.length);

            try {
              const todos = JSON.parse(jsonStr);
              agentPlan = todos;

              if (process.env.NODE_ENV === 'development') console.log("Successfully parsed agent plan:", todos);

              // Insert or update a system message with the plan right after the user message
              setMessages((prev) => {
                const newMessages = [...prev];

                // Check if a planning message already exists
                const existingPlanIndex = newMessages.findIndex(m => m.role === "system" && m.metadata?.type === 'planning');

                if (existingPlanIndex !== -1) {
                  // Update existing plan
                  newMessages[existingPlanIndex] = {
                    ...newMessages[existingPlanIndex],
                    todos: todos
                  };
                } else {
                  // Insert plan message after user message (before assistant response)
                  const planMessage: Message = {
                    id: genId(),
                    role: "system",
                    content: "",
                    todos: todos,
                    metadata: { type: 'planning' }
                  };
                  // Insert before the last message (which is the assistant's empty message)
                  if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === "assistant") {
                    newMessages.splice(newMessages.length - 1, 0, planMessage);
                  } else {
                    newMessages.push(planMessage);
                  }
                }
                return newMessages;
              });
            } catch (e) {
              console.error("Failed to parse agent plan JSON:", e, "JSON string was:", jsonStr);
            }
          }
        } while (planBlockFound);

        // Process EMAIL_DRAFT blocks
        const emailStartTag = '[EMAIL_DRAFT]';
        const emailEndTag = '[/EMAIL_DRAFT]';

        let emailDraftBlockFound;
        do {
          emailDraftBlockFound = false;
          const startIndex = buffer.indexOf(emailStartTag);
          const endIndex = buffer.indexOf(emailEndTag);

          if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            emailDraftBlockFound = true;
            if (process.env.NODE_ENV === 'development') console.log("Found complete email draft block in buffer.");

            const textBefore = buffer.substring(0, startIndex);
            const jsonStr = buffer.substring(startIndex + emailStartTag.length, endIndex);

            assistantResponseText += textBefore;
            buffer = buffer.substring(endIndex + emailEndTag.length);

            try {
              const emailDraft = JSON.parse(jsonStr);
              finalEmailDraft = emailDraft;

              if (process.env.NODE_ENV === 'development') console.log("Successfully parsed email draft:", emailDraft);

              setMessages((prev) => {
                const next = [...prev];
                const lastMessage = next[next.length - 1];
                if (lastMessage?.role === "assistant") {
                  next[next.length - 1] = {
                    ...lastMessage,
                    content: assistantResponseText,
                    emailDraft,
                    metadata: { ...(lastMessage.metadata || {}), type: 'email_draft' }
                  };
                }
                return next;
              });
            } catch (e) {
              console.error("Failed to parse email draft JSON:", e, "JSON string was:", jsonStr);
              assistantResponseText += `${emailStartTag}${jsonStr}${emailEndTag}`;
            }
          }
        } while (emailDraftBlockFound);

        // Process TOKEN_USAGE blocks
        const tokenStartTag = '[TOKEN_USAGE]';
        const tokenEndTag = '[/TOKEN_USAGE]';

        let tokenUsageBlockFound;
        do {
          tokenUsageBlockFound = false;
          const startIndex = buffer.indexOf(tokenStartTag);
          const endIndex = buffer.indexOf(tokenEndTag);

          if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            tokenUsageBlockFound = true;
            if (process.env.NODE_ENV === 'development') console.log("Found complete token usage block in buffer.");

            const textBefore = buffer.substring(0, startIndex);
            const jsonStr = buffer.substring(startIndex + tokenStartTag.length, endIndex);

            assistantResponseText += textBefore;
            buffer = buffer.substring(endIndex + tokenEndTag.length);

            try {
              tokenUsage = JSON.parse(jsonStr);
              if (process.env.NODE_ENV === 'development') console.log("Successfully parsed token usage:", tokenUsage);
            } catch (e) {
              console.error("Failed to parse token usage JSON:", e, "JSON string was:", jsonStr);
            }
          }
        } while (tokenUsageBlockFound);

        // Optimized buffering: Move safe text (before any potential tag start) to assistantResponseText
        // This ensures users see text immediately instead of waiting for the stream to end or a tag to appear
        const tagStartIndex = buffer.indexOf('[');
        if (tagStartIndex === -1) {
          // No potential tags, flush all
          assistantResponseText += buffer;
          buffer = "";
        } else if (tagStartIndex > 0) {
          // Flush text before the tag start
          assistantResponseText += buffer.substring(0, tagStartIndex);
          buffer = buffer.substring(tagStartIndex);
        }

        // Update UI with processed text only (not the raw buffer with unparsed tags)
        scheduleAssistantContentUpdate(assistantResponseText);
      }

      // Process any remaining buffer content
      assistantResponseText += buffer;

      // Clean up ALL remaining tags from the complete response before final render
      assistantResponseText = assistantResponseText
        .replace(/\[AGENT_PLAN\][\s\S]*?\[\/AGENT_PLAN\]/g, '')
        .replace(/\[STATE_EVENT\][\s\S]*?\[\/STATE_EVENT\]/g, '')
        .replace(/\[SEARCH_RESULTS\][\s\S]*?\[\/SEARCH_RESULTS\]/g, '')
        .replace(/\[DISPLAY_CONFIG\][\s\S]*?\[\/DISPLAY_CONFIG\]/g, '')
        .replace(/\[EMAIL_DRAFT\][\s\S]*?\[\/EMAIL_DRAFT\]/g, '')
        .replace(/\[TOKEN_USAGE\][\s\S]*?\[\/TOKEN_USAGE\]/g, '')
        .trim();

      // Synthesize missing tool_result events so UI doesn't show infinite loaders
      // This handles cases where the server times out before tool completion
      try {
        const openToolCalls = new Map<string, { toolName: string }>();
        for (const ev of agentEvents) {
          if (ev.type === 'tool_call') {
            openToolCalls.set(ev.toolCallId, { toolName: ev.toolName });
          } else if (ev.type === 'tool_result') {
            openToolCalls.delete(ev.toolCallId);
          }
        }
        if (openToolCalls.size > 0) {
          // If tools were pending when stream ended, it's likely a timeout
          const isLikelyTimeout = openToolCalls.size > 0 && agentEvents.some(e => e.type === 'tool_call');
          const errorMessage = isLikelyTimeout
            ? 'La solicitud tardó demasiado tiempo. El servidor procesó parcialmente tu consulta. Intenta una búsqueda más simple.'
            : 'No se recibió resultado de la herramienta';

          for (const [toolCallId, info] of openToolCalls.entries()) {
            agentEvents.push({
              type: 'tool_result',
              toolName: info.toolName,
              toolCallId,
              success: false,
              error: errorMessage,
            } as AgentStateEvent);
          }
        }
      } catch { }

      // Final update for UI consistency with fully cleaned content
      setMessages((prev) => {
        const next = [...prev];
        const lastMessage = next[next.length - 1];
        if (lastMessage?.role === 'assistant') {
          let updated = { ...lastMessage, content: assistantResponseText, agentStateEvents: [...agentEvents] };
          // UI guard: If no text but structured data present, add minimal message
          if (assistantResponseText.trim() === '' && (finalSearchResult || finalEmailDraft || agentEvents.length > 0)) {
            updated = { ...updated, content: 'Acción completada. Revisa los resultados adjuntos.' };
            if (process.env.NODE_ENV === 'development') {
              console.log('[UI] Applied guard: Set minimal content for structured response');
            }
          }
          next[next.length - 1] = updated;
        }
        return next;
      });

      // Persist the final assistant message to the database
      if (currentConvId) {
        if (process.env.NODE_ENV === 'development') {
          console.log("Persisting final message. Content:", assistantResponseText, "Search Result:", finalSearchResult, "Email Draft:", finalEmailDraft);
        }

        // Determine message type
        let messageType: 'text' | 'company_results' | 'export_link' | 'email_draft' = 'text';
        if (finalEmailDraft) {
          messageType = 'email_draft';
        } else if (finalSearchResult) {
          messageType = 'company_results';
        }

        // Store planning as a separate system message if it exists
        if (agentPlan && agentPlan.length > 0) {
          await conversationManager.addMessage(currentConvId, {
            id: '',
            role: 'system' as const,
            content: '',
            metadata: {
              type: 'planning' as const,
              todos: agentPlan,
            },
            createdAt: new Date(),
          });
        }

        // Store the main assistant message with all metadata including agent events for review
        await conversationManager.addMessage(currentConvId, {
          id: '', // DB generates
          role: 'assistant' as const,
          content: assistantResponseText,
          metadata: {
            type: messageType,
            searchResult: finalSearchResult,
            emailDraft: finalEmailDraft,
            agentStateEvents: agentEvents, // Persist agent workflow for later review
          },
          tokenCount: tokenUsage?.totalTokens || 0, // Legacy field for backward compatibility
          inputTokens: tokenUsage?.inputTokens,
          outputTokens: tokenUsage?.outputTokens,
          modelName: selectedModel,
          createdAt: new Date(),
        });

        // Notify sidebar and other components that conversation was updated
        window.dispatchEvent(new Event('conversation-updated'));

        // Track token usage in user_usage table for analytics
        // Note: Tracking is now handled server-side in the agent nodes (lib/agents/sales-agent/nodes.ts)
        // or chat route. We no longer need to call the deprecated /api/chat/track-tokens endpoint here.
      }

      // Agent events have been stored in the message metadata
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error("Error fetching chat response:", error);
      }
      const errorMessage = error instanceof Error ? error.message : "Lo siento, algo salió mal.";
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage.role === 'assistant' && lastMessage.content === '') {
          newMessages[newMessages.length - 1] = { ...lastMessage, content: errorMessage };
        } else {
          newMessages.push({ id: genId(), role: "assistant", content: errorMessage });
        }
        return newMessages;
      });
    } finally {
      setIsSending(false);
    }
  };

  const checkUsageAndWarn = async (): Promise<boolean> => {
    try {
      const now = Date.now();
      const TTL = 60_000;
      if (usageCheckRef.current && now - usageCheckRef.current.ts < TTL) {
        return usageCheckRef.current.allowed;
      }
      // Fetch actual calculated costs from agent logs (same as analytics card)
      const [summaryRes, logsRes] = await Promise.all([
        fetch('/api/usage/summary'),
        fetch('/api/agent/logs?limit=1000')
      ]);

      if (summaryRes.ok) {
        const data = await summaryRes.json();
        const isFreePlan = data.plan === 'FREE';
        const dollarLimit = data.limits?.prompt_dollars || (isFreePlan ? 5.00 : 20.00);

        // Calculate actual dollars from agent logs (matches analytics card)
        let dollarsUsed = 0;
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          dollarsUsed = logsData.logs?.reduce((sum: number, log: any) => sum + (log.cost || 0), 0) || 0;
        }

        // Block at 100% usage, warn at 80%
        if (dollarLimit > 0) {
          const usagePercentage = (dollarsUsed / dollarLimit) * 100;

          // Hard block if over limit
          if (dollarsUsed >= dollarLimit) {
            setBanner(`Has excedido tu límite mensual de $${dollarLimit.toFixed(2)}. Has usado $${dollarsUsed.toFixed(2)}. Por favor actualiza tu plan para continuar.`);
            window.location.href = '/pricing';
            usageCheckRef.current = { ts: now, allowed: false };
            return false;
          }

          // Warn at 80% usage
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
      return true; // Continue if we can't check usage
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting || isSending) return;

    setIsSubmitting(true);
    try {
      // Check usage before sending request
      const shouldContinue = await checkUsageAndWarn();
      if (!shouldContinue) {
        return;
      }

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
      // Check usage before sending request
      const shouldContinue = await checkUsageAndWarn();
      if (!shouldContinue) {
        return;
      }

      await startChat(suggestion);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formLayout = (
    <div className="w-full flex flex-col items-center">
      <form onSubmit={handleSubmit} className="relative w-full max-w-3xl group">
        <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm focus-within:border-gray-900 focus-within:ring-1 focus-within:ring-gray-900/10 transition-colors">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Escribe una instrucción o pega información para analizar..."
            className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-[15px] placeholder:text-gray-400 text-gray-900 pr-3"
          />
          <div className="mt-3 flex items-center justify-between gap-2">
            <ModelSelector
              value={selectedModel}
              onChange={handleModelChange}
              disabled={isSending}
              userPlan={userPlan}
              thinkingLevel={thinkingLevel}
              onThinkingChange={handleThinkingLevelChange}
            />
            <button
              type="submit"
              disabled={isSubmitting || isSending || !input.trim()}
              className="w-9 h-9 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center text-sm transition-colors"
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

  return (
    <div className="relative flex h-full min-h-[100dvh] w-full bg-[#F8F8F8] overflow-hidden">

      {/* Conversation Sidebar as a normal flex child on desktop; mobile drawer handled inside */}
      <ConversationSidebar
        currentConversationId={conversationId}
        onConversationChange={handleConversationChange}
        onNewConversation={handleNewConversation}
        appSidebarOffset={appSidebarOffset}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0 bg-white">
        {/* Empty State */}
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
                {/* Hero Section */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className="w-full max-w-2xl text-center space-y-3"
                >
                  <p className="text-[11px] md:text-[13px] uppercase tracking-[0.2em] text-gray-400">Impulsado por Gemini</p>
                  <h1 className="text-2xl md:text-3xl lg:text-4xl font-medium text-gray-900 leading-tight">
                    Agente Empresarial
                  </h1>
                  <p className="text-sm md:text-base lg:text-lg text-gray-600 font-light leading-relaxed px-4">
                    Analiza empresas, compara mercados y genera ideas accionables con una interfaz enfocada en la información.
                  </p>
                </motion.div>

                {/* Suggestions */}
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

                {/* Input Area */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.4 }}
                  className="w-full max-w-3xl mt-4 px-4 md:px-0"
                >
                  {formLayout}
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        {messages.length > 0 && (
          <>
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto p-2 md:p-6 lg:p-8 pb-0 scroll-smooth"
            >
              <div className="w-full max-w-4xl lg:max-w-5xl mx-auto space-y-3 md:space-y-6">

                {messages.map((msg, index) => {
                  // Special rendering for planning messages
                  if (msg.role === "system" && msg.metadata?.type === 'planning' && msg.todos) {
                    return (
                      <div key={msg.id} className="w-full mb-4 px-1 md:px-0">
                        <div className="bg-white border border-gray-200 rounded-2xl p-4 md:p-5 shadow-sm">
                          <div className="flex items-center gap-3 mb-3 md:mb-4">
                            <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg md:rounded-xl bg-gray-900 text-white flex items-center justify-center text-[10px] md:text-xs font-semibold">
                              AI
                            </div>
                            <h4 className="font-medium text-gray-900 text-xs md:text-sm">Plan de acción</h4>
                          </div>
                          <div className="space-y-2">
                            {msg.todos.map((todo, todoIndex) => (
                              <div key={todoIndex} className="flex items-start gap-2 md:gap-3 text-xs md:text-sm p-2 rounded-xl border border-gray-100 bg-gray-50">
                                <span className={cn(
                                  "flex-shrink-0 w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[10px] md:text-[11px] font-medium",
                                  todo.status === 'completed' && "bg-green-100 text-green-700",
                                  todo.status === 'in_progress' && "bg-yellow-100 text-yellow-700",
                                  todo.status === 'pending' && "bg-gray-200 text-gray-600",
                                  todo.status === 'failed' && "bg-red-100 text-red-700"
                                )}>
                                  {todo.status === 'completed' ? '✓' : todoIndex + 1}
                                </span>
                                <span className={cn(
                                  "flex-1 leading-relaxed",
                                  todo.status === 'completed' && "text-gray-500 line-through",
                                  todo.status === 'in_progress' && "text-gray-900 font-medium",
                                  todo.status === 'pending' && "text-gray-600",
                                  todo.status === 'failed' && "text-red-600 font-medium"
                                )}>
                                  {todo.description}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Normal message rendering
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex items-start gap-2 md:gap-4",
                        msg.role === "user" && "flex-row-reverse"
                      )}
                    >
                      {msg.role === "user" ? (
                        <div className="flex-shrink-0 mt-1">
                          <UserAvatar />
                        </div>
                      ) : (
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm border-2 border-white mt-1">
                          <Infinity className="w-4 h-4 md:w-5 md:h-5" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[90%] md:max-w-[75%] lg:max-w-[70%] rounded-2xl relative group",
                          msg.role === "user"
                            ? "bg-white text-gray-900 border border-gray-200 px-3 py-2.5 md:px-4 md:py-3 shadow-sm"
                            : "bg-white text-gray-800 border border-gray-100 px-3 py-2.5 md:px-4 md:py-3 shadow-sm rounded-bl-sm"
                        )}
                      >
                        {msg.role === 'assistant' && msg.content === '' && isSending ? (
                          <div className="space-y-3">
                            <LoadingSpinner />
                          </div>
                        ) : (
                          <div className="space-y-3 md:space-y-4">
                            {/* Agent timeline: render events in chronological order */}
                            {msg.role === 'assistant' && msg.agentStateEvents && msg.agentStateEvents.length > 0 && (() => {
                              const raw = msg.agentStateEvents as AgentStateEvent[];
                              // Keep only tool events and thinking; drop others
                              const relevant = raw.filter(e => e.type === 'tool_call' || e.type === 'tool_result' || e.type === 'thinking');
                              // Boilerplate to hide
                              const GENERIC_THINKING = /(cargando.*contexto|planificando.*tarea|ejecutando.*herramient|procesando.*resultado|analizando.*consulta|finalizando.*respuesta)/i;
                              type ToolRun = {
                                toolName: string;
                                toolCallId: string;
                                status: 'pending' | 'success' | 'failed';
                                error?: string;
                                thought?: string;
                                output?: unknown;
                              };
                              const runs: ToolRun[] = [];
                              const byId = new Map<string, ToolRun>();
                              const pendingStack: string[] = [];
                              const attachThought = (text: string) => {
                                const msgText = (text || '').trim();
                                if (!msgText || GENERIC_THINKING.test(msgText)) return;
                                let target: ToolRun | undefined;
                                if (pendingStack.length > 0) {
                                  target = byId.get(pendingStack[pendingStack.length - 1]);
                                } else if (runs.length > 0) {
                                  target = runs[runs.length - 1];
                                }
                                if (target && !target.thought) target.thought = msgText;
                              };
                              for (const ev of relevant) {
                                if (ev.type === 'tool_call') {
                                  const r: ToolRun = { toolName: ev.toolName, toolCallId: ev.toolCallId, status: 'pending' };
                                  runs.push(r);
                                  byId.set(ev.toolCallId, r);
                                  pendingStack.push(ev.toolCallId);
                                } else if (ev.type === 'tool_result') {
                                  const r = byId.get(ev.toolCallId);
                                  if (r) {
                                    r.status = ev.success ? 'success' : 'failed';
                                    if ((ev as any).output !== undefined) r.output = (ev as any).output;
                                    if (!ev.success && ev.error) r.error = ev.error;
                                  }
                                  // remove from pending stack if present
                                  const idx = pendingStack.lastIndexOf(ev.toolCallId);
                                  if (idx !== -1) pendingStack.splice(idx, 1);
                                } else if (ev.type === 'thinking') {
                                  attachThought(ev.message || '');
                                }
                              }
                              const summarizeOutput = (out: any): string | null => {
                                try {
                                  if (!out) return null;
                                  if (typeof out === 'string') return out.slice(0, 200);
                                  if (out.success === false && out.error) return String(out.error).slice(0, 200);
                                  const data = out.result || out;
                                  if (data?.companies && Array.isArray(data.companies)) {
                                    return `Resultados: ${data.companies.length} empresas`;
                                  }
                                  if (data?.company && (data.company.nombre || data.company.nombre_comercial)) {
                                    return `Empresa: ${data.company.nombre || data.company.nombre_comercial}`;
                                  }
                                  if (data?.results && Array.isArray(data.results)) {
                                    return `Resultados: ${data.results.length}`;
                                  }
                                  if (data?.contacts && Array.isArray(data.contacts)) {
                                    return `Contactos: ${data.contacts.length}`;
                                  }
                                  if (data?.message) return String(data.message).slice(0, 200);
                                  return null;
                                } catch {
                                  return null;
                                }
                              };
                              if (runs.length === 0) return null;
                              return (
                                <div className="mb-3 p-2.5 md:p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
                                  <div className="flex items-center gap-2 mb-2.5 text-xs text-gray-600">
                                    <span className="font-medium text-gray-900">Ejecución del agente</span>
                                    <span className="ml-auto text-[11px] text-gray-400">
                                      {runs.length} {runs.length === 1 ? 'paso' : 'pasos'}
                                    </span>
                                  </div>
                                  <div className="space-y-2">
                                    {runs.map((run, i) => {
                                      const derivedThought = run.thought || summarizeOutput(run.output);
                                      const statusLabel = run.status === 'pending'
                                        ? 'En progreso'
                                        : run.status === 'failed'
                                          ? 'Error'
                                          : 'Completado';
                                      const statusColor = run.status === 'pending'
                                        ? 'text-amber-500'
                                        : run.status === 'failed'
                                          ? 'text-red-500'
                                          : 'text-green-500';

                                      return (
                                        <div key={`run-${run.toolCallId || i}`} className="text-xs rounded-lg bg-white/90 border border-indigo-100/60 shadow-sm">
                                          <div className="flex items-center gap-2.5 p-2">
                                            <div className="flex-shrink-0">
                                              {run.status === 'pending' ? (
                                                <LoaderCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-500 animate-spin" />
                                              ) : run.status === 'success' ? (
                                                <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-500" />
                                              ) : (
                                                <XCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-red-500" />
                                              )}
                                            </div>
                                            <div className="flex-1">
                                              <div className="text-xs font-medium text-gray-900">
                                                {formatToolName(run.toolName)}
                                              </div>
                                              <div className={cn("text-[10px] font-semibold uppercase tracking-wide", statusColor)}>
                                                {statusLabel}
                                              </div>
                                            </div>
                                          </div>
                                          {(run.error || derivedThought) && (
                                            <div className="px-2 pb-2">
                                              {run.error && (
                                                <div className="text-[10px] text-red-500/80 mt-0.5 truncate" title={run.error}>{run.error}</div>
                                              )}
                                              {derivedThought && (
                                                <div className="mt-1 p-2 rounded-lg bg-gray-50 border border-gray-100 text-[10px] md:text-[11px] text-gray-700">
                                                  {derivedThought}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Detailed Agent State View (Debug/Diagnostic) */}
                            {msg.role === 'assistant' && msg.agentStateEvents && msg.agentStateEvents.length > 0 && (
                              <AgentStateDetail
                                events={msg.agentStateEvents}
                                isExpanded={!!expandedDebug[msg.id]}
                                onToggle={() => toggleDebug(msg.id)}
                              />
                            )}

                            {msg.content && (
                              <div className="chat-content overflow-x-auto text-[13px] md:text-sm leading-relaxed prose prose-xs md:prose-sm prose-gray max-w-none" aria-live={msg.role === 'assistant' ? 'polite' : undefined}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                  {sanitizeForRender(msg.content)}
                                </ReactMarkdown>
                              </div>
                            )}

                            {/* Render company search results - simple display */}
                            {msg.searchResult && msg.metadata?.type === 'company_results' && (
                              <SmartCompanyDisplay
                                companies={msg.searchResult.companies}
                                totalCount={msg.searchResult.totalCount}
                                query={msg.searchResult.query}
                                featuredRUCs={msg.displayConfig?.featuredRUCs || []}
                              />
                            )}

                            {/* Render email draft */}
                            {msg.emailDraft && msg.metadata?.type === 'email_draft' && (
                              <EmailDraftCard
                                draft={msg.emailDraft}
                                index={index}
                              />
                            )}
                          </div>
                        )}
                        {msg.role === 'assistant' && msg.content && !isSending && (
                          <button
                            onClick={() => handleCopy(msg.content, index)}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 backdrop-blur-sm text-slate-500 hover:bg-white hover:text-slate-700 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-sm border border-slate-200/40 min-h-[32px] min-w-[32px] flex items-center justify-center touch-manipulation hover:scale-105"
                            title="Copiar mensaje"
                            aria-label="Copiar mensaje"
                          >
                            {copiedMessageIndex === index ? (
                              <CopyCheck className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Scroll to Bottom Button */}
              <AnimatePresence>
                {showScrollToBottom && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    onClick={scrollToBottom}
                    className="fixed bottom-24 md:bottom-32 right-4 md:right-6 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-full p-3 shadow-xl hover:shadow-2xl hover:from-indigo-600 hover:to-indigo-700 z-30 min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation transition-all duration-300 hover:scale-105 active:scale-95"
                    title="Ir al final"
                    aria-label="Ir al final"
                  >
                    <ArrowDown className="w-5 h-5 md:w-5 md:h-5" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Sticky Agent Actions Panel removed per request - inline actions remain in assistant messages */}

            {/* Input Area */}
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
              {formLayout}
            </motion.div>
          </>
        )}
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

// Default export for backward compatibility
export default function ChatUIDefault() {
  return <ChatUI />;
}


