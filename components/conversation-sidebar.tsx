"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, MessageSquare, Trash2, Menu, X } from "lucide-react";
import ConversationManager, { ConversationItem } from "@/lib/conversation-manager";

interface ConversationSidebarProps {
  currentConversationId: string | null;
  onConversationChange: (id: string | null) => void;
  onNewConversation: () => void;
}

export default function ConversationSidebar({ 
  currentConversationId, 
  onConversationChange, 
  onNewConversation 
}: ConversationSidebarProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false); // mobile drawer
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [showAll, setShowAll] = useState(false); // For pagination
  const conversationManager = ConversationManager.getInstance();
  
  // Limit to show initially
  const INITIAL_LIMIT = 5;

  const loadConversations = useCallback(async () => {
    await conversationManager.initialize();
    const convs = conversationManager.getAllConversations();
    setConversations(convs);
    // Reset pagination when loading conversations
    setShowAll(false);
  }, [conversationManager]);

  // Force refresh from Supabase
  const refreshConversations = useCallback(async () => {
    await conversationManager.refresh();
    const convs = conversationManager.getAllConversations();
    setConversations(convs);
    // Reset pagination when refreshing conversations
    setShowAll(false);
  }, [conversationManager]);

  useEffect(() => {
    loadConversations();
  }, [currentConversationId, loadConversations]);

  // Listen for conversation updates from other components
  useEffect(() => {
    const handleConversationUpdate = () => {
      refreshConversations();
    };

    window.addEventListener('conversation-updated', handleConversationUpdate);
    return () => {
      window.removeEventListener('conversation-updated', handleConversationUpdate);
    };
  }, [refreshConversations]);

  const handleNewConversation = () => {
    // Clear current conversation first
    onNewConversation();
    
    // Navigate to the main chat page for new conversation
    // Adding a timestamp query param forces a fresh mount
    router.push(`/chat?new=${Date.now()}`);
    
    setIsOpen(false);
    
    // Refresh conversation list after navigation
    setTimeout(loadConversations, 100);
  };

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleSelectConversation = (id: string) => {
    // Navigate to the specific conversation page
    router.push(`/chat/${id}`);
    setIsOpen(false);
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Limpiar conversación del backend
    try {
      const response = await fetch("/api/chat/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: id }),
      });

      if (!response.ok) {
        console.error("Error clearing conversation:", await response.text());
        return;
      }
    } catch (error) {
      console.error("Error clearing conversation:", error);
      return;
    }

    // Eliminar del manager local
    conversationManager.deleteConversation(id);
    
    // Si era la conversación actual, navegar a /chat
    if (id === currentConversationId) {
      router.push('/chat');
      onConversationChange(null);
    }
    
    // Refresh the list
    await refreshConversations();
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (days === 1) {
      return 'Ayer';
    } else if (days < 7) {
      return `${days}d`;
    } else {
      return date.toLocaleDateString('es-ES', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  return (
    <>
      {/* Mobile toggle button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-40 md:hidden bg-white shadow-md min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar container: mobile drawer + desktop static */}
      <div
        className={`
          z-40 bg-transparent transition-all duration-300 ease-in-out
          fixed inset-y-0 left-0 w-64 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:ml-12
          ${isCollapsed ? 'md:w-16 md:ml-12' : 'md:w-64 md:ml-12'}
          flex flex-col h-full
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`p-4 ${isCollapsed ? 'px-2' : ''}`}>
            {!isCollapsed ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-normal text-gray-700">Agentes</h2>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleToggleCollapse}
                      className="hidden md:flex p-2"
                      title="Colapsar"
                    >
                      <Menu className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsOpen(false)}
                      className="md:hidden p-2 min-h-[40px] min-w-[40px] flex items-center justify-center touch-manipulation"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
                
                <Button
                  onClick={handleNewConversation}
                  className="w-full bg-white hover:bg-gray-200 text-black"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Agente
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleCollapse}
                  className="p-2 w-full"
                  title="Expandir"
                >
                  <Menu className="w-4 h-4" />
                </Button>
                <Button
                  onClick={handleNewConversation}
                  className="w-full bg-white hover:bg-gray-200 text-black p-2"
                  size="sm"
                  title="Nueva Conversación"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Conversations List */}
          {!isCollapsed && (
            <div className="flex-1 overflow-y-auto p-2">
              {conversations.length === 0 ? (
                <div className="text-center text-gray-500 mt-8">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay conversaciones</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    {(showAll ? conversations : conversations.slice(0, INITIAL_LIMIT)).map((conv) => (
                      <Card
                        key={conv.id}
                        className={`
                          p-3 cursor-pointer transition-all duration-200 hover:bg-gray-50 group
                          ${conv.id === currentConversationId ? 'bg-gray-100' : ''}
                        `}
                        onClick={() => handleSelectConversation(conv.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <MessageSquare className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              <span className="text-xs text-gray-500">
                                {formatDate(conv.lastActivity)}
                              </span>
                            </div>
                            <p className="text-xs font-normal text-gray-700 truncate">
                              {conv.title}
                            </p>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDeleteConversation(conv.id, e)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                  
                  {/* Show More/Less Button */}
                  {conversations.length > INITIAL_LIMIT && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAll(!showAll)}
                      className="w-full mt-2 text-xs text-gray-600 hover:text-gray-800"
                    >
                      {showAll ? (
                        <>Mostrar menos</>
                      ) : (
                        <>Ver {conversations.length - INITIAL_LIMIT} más</>
                      )}
                    </Button>
                  )}
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
