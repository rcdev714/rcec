"use client";

import { useState, FormEvent, ChangeEvent, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, LoaderCircle, Copy, CopyCheck, ArrowUp, Sparkles, Infinity, CheckCircle2, XCircle } from "lucide-react";
import ModelSelector from "./model-selector";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import UserAvatar from "./user-avatar";
import ConversationSidebar from "./conversation-sidebar";
import ConversationManager from "@/lib/conversation-manager";
import { ChatCompanyResults } from "./chat-company-card";
import { CompanySearchResult } from "@/types/chat";
import { EmailDraftCard } from "./email-draft-card";
import { type AgentStateEvent } from "./agent-state-indicator";

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
  role: "user" | "assistant" | "system";
  content: string;
  searchResult?: CompanySearchResult;
  emailDraft?: EmailDraft;
  agentStateEvents?: AgentStateEvent[];
  todos?: TodoItem[];
  metadata?: {
    type?: 'text' | 'company_results' | 'export_link' | 'email_draft' | 'planning';
    showAgentDetails?: boolean;
  };
}

const LoadingSpinner = () => (
  <div className="flex items-center justify-center">
    <LoaderCircle className="w-5 h-5 text-gray-500 animate-spin" />
  </div>
);

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

// Defensive render-time sanitization to prevent any bracketed tags
function sanitizeForRender(text: string): string {
  if (!text) return "";
  return text
    .replace(/\[AGENT_PLAN\][\s\S]*?\[\/AGENT_PLAN\]/g, '')
    .replace(/\[STATE_EVENT\][\s\S]*?\[\/STATE_EVENT\]/g, '')
    .replace(/\[SEARCH_RESULTS\][\s\S]*?\[\/SEARCH_RESULTS\]/g, '')
    .replace(/\[EMAIL_DRAFT\][\s\S]*?\[\/EMAIL_DRAFT\]/g, '')
    .replace(/\[TOKEN_USAGE\][\s\S]*?\[\/TOKEN_USAGE\]/g, '');
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
    } catch {}
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
}

export function ChatUI({ initialConversationId, initialMessages = [] }: ChatUIProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId || null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [copiedInline, setCopiedInline] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("gemini-2.5-flash");
  const [userPlan, setUserPlan] = useState<'FREE' | 'PRO' | 'ENTERPRISE'>('FREE');
  const [planLoaded, setPlanLoaded] = useState(false);
  // Note: currentAgentEvents tracking removed - state events are now stored in message metadata
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const conversationManager = useMemo(() => ConversationManager.getInstance(), []);

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
      <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0">{children}</h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 className="text-xl font-bold mb-3 mt-5 first:mt-0">{children}</h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="text-lg font-semibold mb-2 mt-4 first:mt-0">{children}</h3>
    ),
    h4: ({ children }: { children?: React.ReactNode }) => (
      <h4 className="text-base font-semibold mb-2 mt-3 first:mt-0">{children}</h4>
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
      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">{children}</th>
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
              } catch {}
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
    'Enseñame empresas del guayas con mas de 1000 empleados',
    'Busca los websites de las siguientes empresas:',
    'Cuales son las empresas con mayores ingresos en pichincha?',
    'Encuentra el RUC de la siguiente empresa: ',
    'Realiza un analisis de las finanzas de la siguiente empresa:'
  ], []);

  // Efecto para seleccionar sugerencias dinámicas al montar
  useEffect(() => {
    const shuffled = [...allSuggestions].sort(() => 0.5 - Math.random());
    setSuggestions(shuffled.slice(0, 3));
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

  // Load saved model preference from localStorage and validate access
  useEffect(() => {
    // Only run after the plan has been loaded to avoid resetting pro users' models
    if (!planLoaded) {
      return;
    }

    const savedModel = localStorage.getItem('gemini-model');
    if (savedModel) {
      // If user has a pro model saved but they're on free plan, reset to flash
      if (savedModel === 'gemini-2.5-pro' && userPlan === 'FREE') {
        // Only update if different from current state to avoid unnecessary writes
        if (selectedModel !== 'gemini-2.5-flash') {
          setSelectedModel('gemini-2.5-flash');
          localStorage.setItem('gemini-model', 'gemini-2.5-flash');
        }
      } else {
        // Only update if different from current state to avoid unnecessary writes
        if (selectedModel !== savedModel) {
          setSelectedModel(savedModel);
        }
      }
    }
  }, [planLoaded, userPlan, selectedModel]);

  // Save model preference to localStorage and validate access
  const handleModelChange = (model: string) => {
    // Check if user can access gemini-2.5-pro
    if (model === 'gemini-2.5-pro' && userPlan === 'FREE') {
      alert('El modelo de razonamiento avanzado (gemini-2.5-pro) requiere un plan Pro o Enterprise. Por favor actualiza tu plan.');
      return;
    }
    setSelectedModel(model);
    localStorage.setItem('gemini-model', model);
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

    return { clean, extractedSearchResult, extractedEmailDraft, extractedTodos, metadata };
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
          const { clean, extractedSearchResult, extractedEmailDraft, extractedTodos, metadata } = parseAndSanitizeMessage(role, msg.content || '');
          if (extractedTodos && extractedTodos.length > 0) {
            hydrated.push({
              role: 'system',
              content: '',
              todos: extractedTodos as TodoItem[],
              metadata: { type: 'planning' }
            });
          }
          hydrated.push({
            role: 'assistant',
            content: clean,
            searchResult: (msg.metadata?.searchResult as CompanySearchResult) || extractedSearchResult,
            emailDraft: (msg.metadata?.emailDraft as EmailDraft) || extractedEmailDraft,
            agentStateEvents: msg.metadata?.agentStateEvents as AgentStateEvent[] || undefined, // Restore agent workflow
            metadata: { ...msg.metadata, ...metadata }
          });
        } else {
          const { agentStateEvents: _drop, ...restMetadata } = (msg.metadata || {}) as Record<string, unknown>;
          hydrated.push({
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const handleScroll = () => {
      if (scrollContainer) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        const isScrolledUp = scrollTop < scrollHeight - clientHeight - 100;
        setShowScrollToBottom(isScrolledUp);
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

  const startChat = async (message: string) => {
    if (!message.trim() || isSending) return;

    let finalSearchResult: CompanySearchResult | undefined;
    let finalEmailDraft: EmailDraft | undefined;
    let agentPlan: TodoItem[] | undefined;
    const agentEvents: AgentStateEvent[] = [];
    let tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number } | undefined;

    setIsSending(true);
    // Agent events are tracked in agentEvents array and stored in message metadata
    const userMessage: Message = { role: "user", content: message };
    setMessages((prev) => [...prev, userMessage]);
    
    // Crear nueva conversación si no existe
    let currentConvId = conversationId;
    if (!currentConvId) {
      currentConvId = await conversationManager.createConversation(message);
      setConversationId(currentConvId);
      // Notify sidebar about new conversation
      window.dispatchEvent(new Event('conversation-updated'));
    } else {
      // Actualizar actividad de conversación existente
      await conversationManager.updateActivity(currentConvId);
    }

    // Store user message immediately
    if (currentConvId) {
      await conversationManager.addMessage(currentConvId, {
        id: '',
        role: 'user' as const,
        content: message,
        createdAt: new Date(),
      });
    }
    
    setInput("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMessage.content,
          conversationId: currentConvId,
          useLangGraph: true, // Enable LangGraph features
          model: selectedModel // Send selected model
        }),
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
      
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

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
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage?.role === "assistant") {
                  lastMessage.agentStateEvents = [...agentEvents];
                }
                return newMessages;
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
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage?.role === "assistant") {
                  lastMessage.content = assistantResponseText;
                  lastMessage.searchResult = searchResult;
                  lastMessage.metadata = { type: 'company_results' };
                }
                return newMessages;
              });
            } catch (e) {
              console.error("Failed to parse search results JSON:", e, "JSON string was:", jsonStr);
              assistantResponseText += `${searchStartTag}${jsonStr}${searchEndTag}`;
            }
          }
        } while (searchResultBlockFound);

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
              
              // Insert a system message with the plan right after the user message
              setMessages((prev) => {
                const newMessages = [...prev];
                // Insert plan message after user message (before assistant response)
                const planMessage: Message = {
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
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage?.role === "assistant") {
                  lastMessage.content = assistantResponseText;
                  lastMessage.emailDraft = emailDraft;
                  if (!lastMessage.metadata) lastMessage.metadata = {};
                  lastMessage.metadata.type = 'email_draft';
                }
                return newMessages;
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
        
        // Update UI with processed text only (not the raw buffer with unparsed tags)
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage?.role === "assistant") {
            lastMessage.content = assistantResponseText;
          }
          return newMessages;
        });
      }
      
      // Process any remaining buffer content
      assistantResponseText += buffer;
      
      // Clean up ALL remaining tags from the complete response before final render
      assistantResponseText = assistantResponseText
        .replace(/\[AGENT_PLAN\][\s\S]*?\[\/AGENT_PLAN\]/g, '')
        .replace(/\[STATE_EVENT\][\s\S]*?\[\/STATE_EVENT\]/g, '')
        .replace(/\[SEARCH_RESULTS\][\s\S]*?\[\/SEARCH_RESULTS\]/g, '')
        .replace(/\[EMAIL_DRAFT\][\s\S]*?\[\/EMAIL_DRAFT\]/g, '')
        .replace(/\[TOKEN_USAGE\][\s\S]*?\[\/TOKEN_USAGE\]/g, '')
        .trim();

      // Final update for UI consistency with fully cleaned content
      setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage?.role === 'assistant') {
              lastMessage.content = assistantResponseText;
              lastMessage.agentStateEvents = agentEvents; // Store for display
          }
          return newMessages;
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
        if (tokenUsage && tokenUsage.totalTokens > 0) {
          try {
            await fetch('/api/chat/track-tokens', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                inputTokens: tokenUsage.inputTokens,
                outputTokens: tokenUsage.outputTokens,
                totalTokens: tokenUsage.totalTokens,
                model: selectedModel,
              }),
            });
          } catch (error) {
            // Don't fail the chat if token tracking fails
            if (process.env.NODE_ENV !== 'production') {
              console.error('Failed to track token usage:', error);
            }
          }
        }
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
            newMessages[newMessages.length - 1].content = errorMessage;
        } else {
            newMessages.push({ role: "assistant", content: errorMessage });
        }
        return newMessages;
      });
    } finally {
      setIsSending(false);
    }
  };

  const checkUsageAndWarn = async (): Promise<boolean> => {
    try {
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
            alert(
              `Has excedido tu límite mensual de $${dollarLimit.toFixed(2)}. Has usado $${dollarsUsed.toFixed(2)}. Por favor actualiza tu plan para continuar.`
            );
            window.location.href = '/pricing';
            return false;
          }
          
          // Warn at 80% usage
          if (usagePercentage >= 80) {
            const shouldContinue = confirm(
              `Has usado $${dollarsUsed.toFixed(2)} de $${dollarLimit.toFixed(2)} en tokens este mes (${Math.round(usagePercentage)}%). ¿Quieres continuar? ${isFreePlan ? 'Considera actualizar tu plan para más uso del agente.' : ''}`
            );
            if (!shouldContinue) {
              return false;
            }
          }
        }
      }
      return true;
    } catch (error) {
      console.error('Error checking usage:', error);
      return true; // Continue if we can't check usage
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Check usage before sending request
    const shouldContinue = await checkUsageAndWarn();
    if (!shouldContinue) {
      return;
    }

    startChat(input);
  };

  const handleSuggestionClick = async (suggestion: string) => {
    setInput(suggestion);

    // Check usage before sending request
    const shouldContinue = await checkUsageAndWarn();
    if (!shouldContinue) {
      return;
    }

    startChat(suggestion);
  };

  const formLayout = (
    <div className="w-full flex flex-col items-center space-y-3 px-2 md:px-0">
      <form onSubmit={handleSubmit} className="relative w-full max-w-2xl group">
        <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-2xl p-3 md:p-4 shadow-sm hover:shadow-md focus-within:ring-4 focus-within:ring-indigo-100 transition-all duration-200">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="busca, analiza, conecta"
            className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-sm md:text-sm placeholder:text-xs md:placeholder:text-xs placeholder:text-gray-400"
          />
          <div className="mt-3 flex items-center justify-between">
            <ModelSelector value={selectedModel} onChange={handleModelChange} disabled={isSending} userPlan={userPlan} />
            <button
              type="submit"
              disabled={isSending}
              className="w-12 h-12 md:w-11 md:h-11 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-gray-400 transition-all duration-200 shadow-lg hover:shadow-xl active:shadow-md disabled:shadow-none flex items-center justify-center touch-manipulation group-hover:scale-105 active:scale-95"
            >
              {isSending ? (
                <LoaderCircle className="w-5 h-5 md:w-5 md:h-5 animate-spin" />
              ) : (
                <ArrowUp className="w-5 h-5 md:w-4 md:h-4" />
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Token Progress Bar - Centered and same width as input */}

    </div>
  );

  return (
    <div className="relative flex h-screen bg-white overflow-hidden">
      {/* Empty background accent (lightweight) */}
      {messages.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-start justify-center opacity-[0.06] -z-10">
          <Sparkles className="w-[420px] h-[420px] mt-16" />
        </div>
      )}

      {/* Conversation Sidebar as a normal flex child on desktop; mobile drawer handled inside */}
      <ConversationSidebar
        currentConversationId={conversationId}
        onConversationChange={handleConversationChange}
        onNewConversation={handleNewConversation}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0 bg-white">
        {/* Empty State */}
        <AnimatePresence>
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col items-center justify-center p-4 md:p-6"
            >
              <div className="w-full max-w-4xl mx-auto mb-10 md:mb-16">
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-6 md:p-8">
                  <div className="text-center">
                    <h1 className="text-3xl md:text-3xl tracking-tight mb-3 text-gray-900 leading-[1.1]">
                      Agente
                    </h1>
                    <div className="space-y-3">
                      <p className="text-gray-600 text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
                        Busca, analiza, encuentra y conecta con empresas y contactos.
                      </p>
                      <div className="w-16 h-0.5 bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-purple-500 mx-auto rounded-full"></div>
                      <p className="text-gray-600 text-xs md:text-sm max-w-xl mx-auto leading-relaxed">
                        Pregúntale sobre finanzas, contacta con ejecutivos y más. Accede a todo nuestro
                        registro empresarial a través del chat.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sugerencias de Prompt - modern cards */}
              <div className="w-full max-w-2xl mx-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(s)}
                      className="group relative p-4 text-left border rounded-xl text-[13px] text-gray-700 bg-white/90 hover:bg-white transition-all duration-200 shadow-sm hover:shadow-md hover:border-indigo-300/80 border-gray-200"
                    >
                      <span className="absolute -top-2 -left-2 bg-indigo-50 text-indigo-600 text-[10px] px-2 py-0.5 rounded-full border border-indigo-100">Sugerencia</span>
                      <span className="block pr-6 leading-relaxed">
                        {s}
                      </span>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500">↵</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-full px-4 mt-8">{formLayout}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        {messages.length > 0 && (
          <>
            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-y-auto p-3 md:p-6 pb-0"
            >
              <div className="w-full max-w-6xl mx-auto space-y-3 md:space-y-6">
                
                {messages.map((msg, index) => {
                  // Special rendering for planning messages
                  if (msg.role === "system" && msg.metadata?.type === 'planning' && msg.todos) {
                    return (
                      <div key={index} className="w-full mb-3">
                        <div className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-semibold">
                              AI
                            </div>
                            <h4 className="font-medium text-indigo-900 text-sm">Acciones del agente</h4>
                          </div>
                          <div className="space-y-2">
                            {msg.todos.map((todo, todoIndex) => (
                              <div key={todoIndex} className="flex items-start gap-3 text-sm">
                                <span className={cn(
                                  "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium",
                                  todo.status === 'completed' && "bg-green-500 text-white",
                                  todo.status === 'in_progress' && "bg-amber-500 text-white animate-pulse",
                                  todo.status === 'pending' && "bg-gray-300 text-gray-700",
                                  todo.status === 'failed' && "bg-red-500 text-white"
                                )}>
                                  {todo.status === 'completed' ? '✓' : todoIndex + 1}
                                </span>
                                <span className={cn(
                                  "flex-1 leading-relaxed",
                                  todo.status === 'completed' && "text-gray-600",
                                  todo.status === 'in_progress' && "text-gray-900 font-medium",
                                  todo.status === 'pending' && "text-gray-500",
                                  todo.status === 'failed' && "text-red-600"
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
                    key={index}
                    className={cn(
                      "flex items-start gap-2 md:gap-4",
                      msg.role === "user" && "justify-end"
                    )}
                  >
                    {msg.role === "user" ? (
                      <div className="order-2 flex-shrink-0">
                        <UserAvatar />
                      </div>
                    ) : (
                      <div className="w-8 h-8 md:w-8 md:h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-white text-indigo-500 border border-indigo-300 mt-1">
                        <Infinity className="w-4 h-4" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[85%] md:max-w-[90%] px-4 md:px-4 py-3 md:py-3 rounded-2xl relative group border touch-manipulation",
                        msg.role === "user"
                          ? "bg-white text-gray-900 border-gray-200 rounded-br-md self-end"
                          : "bg-gray-50 text-gray-900 border-gray-200 rounded-bl-md self-start"
                      )}
                    >
                      {msg.role === 'assistant' && msg.content === '' && isSending ? (
                        <div className="space-y-3">
                          <LoadingSpinner />
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Show agent execution steps as persistent inline cards */}
                          {msg.role === 'assistant' && msg.agentStateEvents && msg.agentStateEvents.length > 0 && (
                            <div className="mb-3 p-3 bg-gray-50/50 border border-gray-200/60 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-4 h-4 rounded-full bg-gray-200/60 text-gray-500 flex items-center justify-center text-[10px]">🔧</div>
                                <span className="text-[11px] font-normal text-gray-500">Pasos...</span>
                                <span className="ml-auto text-[10px] text-gray-400 bg-gray-100/60 px-1.5 py-0.5 rounded-full">
                                  {msg.agentStateEvents.filter(e => e.type === 'tool_call').length} acciones
                                </span>
                              </div>
                              <div className="space-y-1.5">
                                {(() => {
                                  const steps: { call: AgentStateEvent; result?: AgentStateEvent }[] = [];
                                  const events = msg.agentStateEvents.filter(e => e.type === 'tool_call' || e.type === 'tool_result');
                                  for (let i = 0; i < events.length; i++) {
                                    if (events[i].type === 'tool_call') {
                                      if (i + 1 < events.length && events[i + 1].type === 'tool_result') {
                                        steps.push({ call: events[i], result: events[i + 1] });
                                        i++;
                                      } else {
                                        steps.push({ call: events[i] });
                                      }
                                    }
                                  }

                                  return (
                                    <>
                                      {steps.map((step, stepIndex) => {
                                        const toolCallEvent = step.call.type === 'tool_call' ? step.call : undefined;
                                        const toolResultEvent = step.result?.type === 'tool_result' ? step.result : undefined;

                                        if (!toolCallEvent) return null;

                                        return (
                                          <div key={stepIndex} className="flex items-center gap-3 text-xs p-2 rounded-md bg-white border border-gray-200/80">
                                            <div className="flex-shrink-0">
                                              {toolResultEvent ? (
                                                toolResultEvent.success ? (
                                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                ) : (
                                                  <XCircle className="w-4 h-4 text-red-500" />
                                                )
                                              ) : (
                                                <LoaderCircle className="w-4 h-4 text-gray-400 animate-spin" />
                                              )}
                                            </div>
                                            <div className="flex-1 font-medium text-gray-700">
                                              {formatToolName(toolCallEvent.toolName)}
                                            </div>
                                            {!toolResultEvent && isSending && (
                                                <div className="flex items-center space-x-1">
                                                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></span>
                                                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></span>
                                                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></span>
                                                </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                      {isSending && (steps.length === 0 || (steps[steps.length - 1].result?.type === 'tool_result')) && (
                                        <div className="flex items-center gap-3 text-xs p-2">
                                           <div className="flex items-center space-x-1">
                                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></span>
                                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></span>
                                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></span>
                                            </div>
                                          <div className="flex-1 font-medium text-gray-500 italic">
                                            pensando...
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          )}
                          
                          {msg.content && (
                            <div className="max-w-none chat-content overflow-x-auto text-sm leading-relaxed">
                              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                                {sanitizeForRender(msg.content)}
                              </ReactMarkdown>
                            </div>
                          )}
                          
                          {/* Render company search results */}
                          {msg.searchResult && msg.metadata?.type === 'company_results' && (
                            <ChatCompanyResults
                              companies={msg.searchResult.companies}
                              totalCount={msg.searchResult.totalCount}
                              query={msg.searchResult.query}
                              hasMore={msg.searchResult.companies.length < msg.searchResult.totalCount}
                              onLoadMore={() => handleLoadMoreResults(msg.searchResult!)}
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
                          className="absolute top-2 right-2 p-2 md:p-1.5 rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300 opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity min-h-[36px] min-w-[36px] md:min-h-auto md:min-w-auto flex items-center justify-center touch-manipulation"
                        >
                          {copiedMessageIndex === index ? (
                            <CopyCheck className="w-4 h-4 md:w-3 md:h-3 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4 md:w-3 md:h-3" />
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
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    onClick={scrollToBottom}
                    className="fixed bottom-20 md:bottom-32 right-4 bg-gray-800 text-white rounded-full p-3 shadow-lg hover:bg-gray-700 z-30 min-h-[48px] min-w-[48px] md:min-h-[44px] md:min-w-[44px] flex items-center justify-center touch-manipulation"
                  >
                    <ArrowDown className="w-5 h-5 md:w-5 md:h-5" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {/* Sticky Agent Actions Panel removed per request - inline actions remain in assistant messages */}

            {/* Input Area */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="border-t border-gray-200 bg-white p-4 md:p-6 pb-6 md:pb-6"
            >
              {formLayout}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}

// Default export for backward compatibility
export default function ChatUIDefault() {
  return <ChatUI />;
}


