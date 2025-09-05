"use client";

import { useState, FormEvent, ChangeEvent, useRef, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, LoaderCircle, Copy, CopyCheck, ArrowUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import UserAvatar from "./user-avatar";
import ConversationSidebar from "./conversation-sidebar";
import ConversationManager from "@/lib/conversation-manager";
import { ChatCompanyResults } from "./chat-company-card";
import { CompanySearchResult } from "@/types/chat";
import { StarField } from "./star-field";

interface Message {
  role: "user" | "assistant";
  content: string;
  searchResult?: CompanySearchResult;
  metadata?: {
    type?: 'text' | 'company_results' | 'export_link';
  };
}

const LoadingSpinner = () => (
  <div className="flex items-center justify-center">
    <LoaderCircle className="w-5 h-5 text-gray-500 animate-spin" />
  </div>
);

interface ChatUIProps {
  initialConversationId?: string;
  initialMessages?: { role: string; content: string; metadata?: { searchResult?: CompanySearchResult; type?: 'text' | 'company_results' | 'export_link' } }[];
}

export function ChatUI({ initialConversationId, initialMessages = [] }: ChatUIProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId || null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const conversationManager = useMemo(() => ConversationManager.getInstance(), []);

  const allSuggestions = useMemo(() => [
    'Enseñame empresas del guayas con mas de 1000 empleados',
    'Busca empresas de almenos 100 empleados con almenos 1000 en ingresos',
    'Exporta una lista de empresas de construcción en Pichincha',
    'Encuentra el RUC de la empresa Unibrokers',
    'Dame los datos de la empresa con el ruc 1792848830001'
  ], []);

  // Efecto para seleccionar sugerencias dinámicas al montar
  useEffect(() => {
    const shuffled = [...allSuggestions].sort(() => 0.5 - Math.random());
    setSuggestions(shuffled.slice(0, 3));
  }, [allSuggestions]);

  // Cargar conversaciones guardadas al inicializar
  useEffect(() => {
    conversationManager.loadFromStorage();
    
    if (initialConversationId && initialMessages.length > 0) {
      // Load initial messages from server
      const formattedMessages: Message[] = initialMessages.map(msg => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
        searchResult: msg.metadata?.searchResult,
        metadata: msg.metadata
      }));
      setMessages(formattedMessages);
      setConversationId(initialConversationId);
    } else {
      const currentId = conversationManager.getCurrentConversationId();
      if (currentId) {
        setConversationId(currentId);
      }
    }
  }, [initialConversationId, initialMessages, conversationManager]);

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
  };

  const handleConversationChange = (id: string | null) => {
    setMessages([]);
    setConversationId(id);
    if (id) {
      conversationManager.setCurrentConversation(id);
    }
  };

  const handleExportCompanies = async (searchResult: CompanySearchResult) => {
    try {
      const filters = searchResult.filters;
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });
      
      // Add a unique session ID for progress tracking
      const sessionId = `export_${Date.now()}`;
      params.append('sessionId', sessionId);
      
      // Open export in new tab
      const exportUrl = `/api/companies/export?${params.toString()}`;
      window.open(exportUrl, '_blank');
      
      // Show success message
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: `Iniciando exportación de ${searchResult.totalCount} empresas. El archivo se descargará automáticamente cuando esté listo.`,
        metadata: { type: 'text' }
      }]);
      
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Error exporting companies:', error);
      }
      setMessages((prev) => [...prev, {
        role: "assistant", 
        content: "Error al exportar las empresas. Por favor, intenta de nuevo.",
        metadata: { type: 'text' }
      }]);
    }
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

    setIsSending(true);
    const userMessage: Message = { role: "user", content: message };
    setMessages((prev) => [...prev, userMessage]);
    
    // Crear nueva conversación si no existe
    let currentConvId = conversationId;
    if (!currentConvId) {
      currentConvId = await conversationManager.createConversation(message);
      setConversationId(currentConvId);
    } else {
      // Actualizar actividad de conversación existente
      await conversationManager.updateActivity(currentConvId);
    }
    
    setInput("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMessage.content,
          conversationId: currentConvId,
          useLangGraph: true // Enable LangGraph features
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
      let assistantResponse = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        
        // Check if this chunk contains search results
        if (chunk.includes('[SEARCH_RESULTS]') && chunk.includes('[/SEARCH_RESULTS]')) {
          const startTag = '[SEARCH_RESULTS]';
          const endTag = '[/SEARCH_RESULTS]';
          const startIndex = chunk.indexOf(startTag);
          const endIndex = chunk.indexOf(endTag);
          
          if (startIndex !== -1 && endIndex !== -1) {
            const beforeResults = chunk.substring(0, startIndex);
            const resultsJson = chunk.substring(startIndex + startTag.length, endIndex);
            const afterResults = chunk.substring(endIndex + endTag.length);
            
            assistantResponse += beforeResults + afterResults;
            
            try {
              const searchResult = JSON.parse(resultsJson);
              finalSearchResult = searchResult;
              setMessages((prev) => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                if (lastMessage.role === "assistant") {
                  lastMessage.content = assistantResponse;
                  lastMessage.searchResult = searchResult;
                  lastMessage.metadata = { type: 'company_results' };
                }
                return newMessages;
              });
            } catch (e) {
              if (process.env.NODE_ENV !== 'production') {
                console.warn('Failed to parse search results:', e);
              }
              assistantResponse += chunk;
            }
          } else {
            assistantResponse += chunk;
          }
        } else {
          assistantResponse += chunk;
        }
        
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.role === "assistant") {
            lastMessage.content = assistantResponse;
          }
          return newMessages;
        });
      }

      // Persist the final assistant message to the database
      if (currentConvId) {
        await conversationManager.addMessage(currentConvId, {
          id: '', // DB generates
          role: 'assistant',
          content: assistantResponse,
          metadata: {
            type: finalSearchResult ? 'company_results' : 'text',
            searchResult: finalSearchResult,
          },
          createdAt: new Date(),
        });
      }
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
      const response = await fetch('/api/usage/summary');
      if (response.ok) {
        const data = await response.json();
        const promptsUsed = data.usage?.prompt_input_tokens || 0;
        const isFreePlan = data.plan === 'FREE';
        const limit = isFreePlan ? 10 : -1; // FREE plan has 10 prompt limit

        if (isFreePlan && promptsUsed >= 8) { // Warn at 80% usage
          const shouldContinue = confirm(
            `Has usado ${promptsUsed} de ${limit} prompts este mes. ¿Quieres continuar? Considera actualizar tu plan para más prompts.`
          );
          if (!shouldContinue) {
            return false;
          }
        } else if (!isFreePlan && data.usage?.prompt_dollars >= (data.planDollarLimit * 0.8)) {
          const shouldContinue = confirm(
            `Has usado $${data.usage.prompt_dollars.toFixed(2)} de $${data.planDollarLimit} en prompts este mes. ¿Quieres continuar?`
          );
          if (!shouldContinue) {
            return false;
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
      <form onSubmit={handleSubmit} className="relative w-full max-w-2xl">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          placeholder="Escribe tu mensaje..."
          className="w-full pl-4 pr-16 md:pr-16 py-4 md:py-3 border border-gray-200 rounded-xl md:rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white text-base md:text-base touch-manipulation"
        />
        <button
          type="submit"
          disabled={isSending}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-3 md:px-2 md:py-2 bg-gray-800 text-white rounded-full hover:bg-gray-700 disabled:bg-gray-500 transition-colors min-h-[44px] min-w-[44px] md:min-h-[40px] md:min-w-[40px] flex items-center justify-center touch-manipulation"
        >
          {isSending ? (
            <LoaderCircle className="w-5 h-5 md:w-5 md:h-5 animate-spin" />
          ) : (
            <ArrowUp className="w-5 h-5 md:w-4 md:h-4" />
          )}
        </button>
      </form>

      {/* Token Progress Bar - Centered and same width as input */}

    </div>
  );

  return (
    <div className="relative flex h-screen bg-white overflow-hidden">
      {/* Night Sky Background Animation - only visible in empty state */}
      {messages.length === 0 && (
        <>
          {console.log('Rendering StarField - messages.length:', messages.length)}
          <StarField />
        </>
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
              <div className="text-center mb-8 md:mb-12">
                <h1 className="text-2xl md:text-3xl font-semibold mb-3 text-gray-800">
                  Agente
                </h1>
                <p className="text-gray-600 text-sm md:text-base max-w-md mx-auto">
                  Chat inteligente con acceso a toda la información de las empresas de Ecuador
                </p>
              </div>

              {/* Sugerencias de Prompt */}
              <div className="w-full max-w-2xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-2 text-center">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(s)}
                      className="p-4 md:p-3 border border-gray-200 rounded-xl md:rounded-lg text-sm md:text-xs text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 bg-white shadow-sm min-h-[48px] md:min-h-auto flex items-center justify-center touch-manipulation"
                    >
                      {s}
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
                {messages.map((msg, index) => (
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
                      <div className="w-8 h-8 md:w-8 md:h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs md:text-sm font-medium bg-gray-200 text-gray-700 mt-1">
                        AI
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[85%] md:max-w-[90%] px-4 md:px-4 py-3 md:py-3 rounded-2xl shadow-sm relative group border touch-manipulation",
                        msg.role === "user"
                          ? "bg-white text-gray-800 border-gray-200 rounded-br-md self-end"
                          : "bg-gray-100 text-gray-800 border-gray-200 rounded-bl-md self-start"
                      )}
                    >
                      {msg.role === 'assistant' && msg.content === '' && isSending ? (
                        <LoadingSpinner />
                      ) : (
                        <div className="space-y-4">
                          {msg.content && (
                            <div className="prose prose-sm max-w-none chat-content overflow-x-auto">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          )}
                          
                          {/* Render company search results */}
                          {msg.searchResult && msg.metadata?.type === 'company_results' && (
                            <ChatCompanyResults
                              companies={msg.searchResult.companies}
                              totalCount={msg.searchResult.totalCount}
                              query={msg.searchResult.query}
                              onExport={() => handleExportCompanies(msg.searchResult!)}
                              hasMore={msg.searchResult.companies.length < msg.searchResult.totalCount}
                              onLoadMore={() => handleLoadMoreResults(msg.searchResult!)}
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
                ))}
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


