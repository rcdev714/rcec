import React, { useEffect, useMemo } from 'react';
import { motion } from "framer-motion";
import { Copy, CopyCheck, Infinity, ArrowDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import UserAvatar from "@/components/user-avatar";
import { SmartCompanyDisplay } from "@/components/chat-company-display";
import { EmailDraftCard } from "@/components/email-draft-card";
import { AgentStateDetail } from "@/components/agent-state-indicator";
import { AgentTimeline } from "./AgentTimeline";
import { WaitTokenCard } from "./WaitTokenCard";
import { createMarkdownComponents } from "./markdown";
import type { AgentStateEvent } from "@/components/agent-state-indicator";
import { sanitizeForRender, TodoItem, EmailDraft } from "./messageParsing";
import { CompanySearchResult } from "@/types/chat";

// Define Message interface to match what's used in ChatUI
export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  searchResult?: CompanySearchResult;
  emailDraft?: EmailDraft;
  agentStateEvents?: AgentStateEvent[];
  todos?: TodoItem[];
  displayConfig?: { featuredRUCs?: string[] };
  metadata?: {
    type?: 'text' | 'company_results' | 'export_link' | 'email_draft' | 'planning';
    showAgentDetails?: boolean;
  };
  waitToken?: {
    tokenId: string;
    toolName: string;
    toolCallId: string;
    reason: string;
    createdAt: string;
  };
}

// Loading Spinner Component
const LoadingSpinner = () => {
  const [statusIndex, setStatusIndex] = React.useState(0);
  const statuses = ['Pensando...', 'Accediendo base de datos...', 'Buscando en la web...'];
  const bars = ['100%', '96%', '88%'];

  useEffect(() => {
    const id = setInterval(() => {
      setStatusIndex((idx) => (idx + 1) % statuses.length);
    }, 3400);
    return () => clearInterval(id);
  }, [statuses.length]);

  return (
    <div className="w-full space-y-3" aria-busy="true" aria-label="Cargando respuesta">
      {bars.map((width, idx) => (
        <motion.div
          key={width}
          className="h-3 sm:h-4 w-full max-w-[280px] sm:max-w-none rounded-xl bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          style={{ width: idx === 0 ? '100%' : width, backgroundSize: '200% 100%', maxWidth: idx === 0 ? '100%' : width }}
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
      <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-gray-600 min-h-[16px]">
        <LoaderCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin text-gray-300" />
        <span className="animate-pulse break-words">{statuses[statusIndex]}</span>
      </div>
    </div>
  );
};

// Icon for LoaderCircle
import { LoaderCircle } from "lucide-react";

interface ChatMessageListProps {
  messages: Message[];
  isSending: boolean;
  expandedDebug: Record<string, boolean>;
  toggleDebug: (msgId: string) => void;
  handleWaitTokenAction: (tokenId: string, approved: boolean) => void;
  copiedMessageIndex: number | null;
  handleCopy: (text: string, index: number) => void;
  copiedInline: string | null;
  setCopiedInline: (text: string | null) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  showScrollToBottom: boolean;
  scrollToBottom: () => void;
}

export function ChatMessageList({
  messages,
  isSending,
  expandedDebug,
  toggleDebug,
  handleWaitTokenAction,
  copiedMessageIndex,
  handleCopy,
  copiedInline,
  setCopiedInline,
  messagesEndRef,
  scrollContainerRef,
  showScrollToBottom,
  scrollToBottom
}: ChatMessageListProps) {
  
  const markdownComponents = useMemo(() => 
    createMarkdownComponents(setCopiedInline, copiedInline), 
    [copiedInline, setCopiedInline]
  );

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto p-1.5 sm:p-2 md:p-6 lg:p-8 pb-0 scroll-smooth"
    >
      <div className="w-full max-w-4xl lg:max-w-5xl mx-auto space-y-2 sm:space-y-3 md:space-y-6">
        {messages.map((msg, index) => {
          // Skip planning messages - they're now rendered above ChatInputBar
          if (msg.role === "system" && msg.metadata?.type === 'planning') {
            return null;
          }

          // Normal message rendering
          return (
            <div
              key={msg.id}
              className={cn(
                "flex items-start gap-1.5 sm:gap-2 md:gap-4",
                msg.role === "user" && "flex-row-reverse"
              )}
            >
              {msg.role === "user" ? (
                <div className="flex-shrink-0 mt-1">
                  <UserAvatar />
                </div>
              ) : (
                <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm border-2 border-white mt-1">
                  <Infinity className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[calc(100%_-_3rem)] sm:max-w-[85%] md:max-w-[75%] lg:max-w-[70%] rounded-xl sm:rounded-2xl relative group min-w-0",
                  msg.role === "user"
                    ? "bg-white text-gray-900 border border-gray-200 px-2 py-2 sm:px-3 sm:py-2.5 md:px-4 md:py-3 shadow-sm"
                    : "bg-white text-gray-800 border border-gray-100 px-2 py-2 sm:px-3 sm:py-2.5 md:px-4 md:py-3 shadow-sm rounded-bl-sm"
                )}
              >
                <div className="space-y-2 sm:space-y-3 md:space-y-4">
                  {/* While the agent runs, show progress UI even if text is still hidden */}
                  {msg.role === 'assistant' && index === messages.length - 1 && isSending && msg.content === '' && (
                    <div className="space-y-3">
                      <LoadingSpinner />
                    </div>
                  )}

                  {/* Agent timeline: render events in chronological order */}
                  {msg.role === 'assistant' && msg.agentStateEvents && msg.agentStateEvents.length > 0 && (
                    <AgentTimeline events={msg.agentStateEvents} />
                  )}

                  {/* Detailed Agent State View (Debug/Diagnostic) */}
                  {msg.role === 'assistant' && msg.agentStateEvents && msg.agentStateEvents.length > 0 && (
                    <AgentStateDetail
                      events={msg.agentStateEvents}
                      isExpanded={!!expandedDebug[msg.id]}
                      onToggle={() => toggleDebug(msg.id)}
                    />
                  )}

                  {msg.content && (
                    <div className="chat-content overflow-x-auto text-[13px] md:text-sm leading-relaxed prose prose-xs md:prose-sm prose-gray max-w-none break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }} aria-live={msg.role === 'assistant' ? 'polite' : undefined}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {sanitizeForRender(msg.content)}
                      </ReactMarkdown>
                    </div>
                  )}

                  {/* Wait Token Approval UI */}
                  {msg.waitToken && (
                    <WaitTokenCard 
                      waitToken={msg.waitToken} 
                      onAction={handleWaitTokenAction} 
                    />
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
    </div>
  );
}

