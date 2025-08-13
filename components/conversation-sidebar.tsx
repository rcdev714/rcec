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
  const conversationManager = ConversationManager.getInstance();

  const loadConversations = useCallback(() => {
    const convs = conversationManager.getAllConversations();
    setConversations(convs);
  }, [conversationManager]);

  useEffect(() => {
    loadConversations();
  }, [currentConversationId, loadConversations]);

  const handleNewConversation = () => {
    // Navigate to the main chat page for new conversation
    router.push('/chat');
    onNewConversation();
    setIsOpen(false);
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
      await fetch("/api/chat/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: id }),
      });
    } catch (error) {
      console.error("Error clearing conversation:", error);
    }

    // Eliminar del manager local
    conversationManager.deleteConversation(id);
    
    // Si era la conversación actual, iniciar nueva
    if (id === currentConversationId) {
      onConversationChange(null);
    }
    
    loadConversations();
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
        className="fixed top-4 left-4 z-40 md:hidden bg-white shadow-md"
      >
        {isOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
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
          z-40 border-r border-gray-200 bg-white transition-all duration-300 ease-in-out
          fixed inset-y-0 left-0 w-64 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static
          ${isCollapsed ? 'md:w-16' : 'md:w-64'}
          flex flex-col h-full
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`p-4 border-b border-gray-200 ${isCollapsed ? 'px-2' : ''}`}>
            {!isCollapsed ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-800">Conversaciones</h2>
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
                      className="md:hidden p-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <Button
                  onClick={handleNewConversation}
                  className="w-full bg-white hover:bg-gray-200 text-black border border-gray-200"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Conversación
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
                  className="w-full bg-white hover:bg-gray-200 text-black border border-gray-200 p-2"
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
                <div className="space-y-1">
                  {conversations.map((conv) => (
                    <Card
                      key={conv.id}
                      className={`
                        p-3 cursor-pointer transition-all duration-200 hover:bg-gray-50 group
                        ${conv.id === currentConversationId ? 'bg-gray-100 border-gray-300' : 'border-gray-200'}
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
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {conv.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {conv.messageCount} mensajes
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
              )}
            </div>
          )}

          {/* Collapsed state - minimal indicators */}
          {isCollapsed && conversations.length > 0 && (
            <div className="flex-1 overflow-y-auto p-1">
              <div className="space-y-1">
                {conversations.slice(0, 10).map((conv) => (
                  <Button
                    key={conv.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`
                      w-full p-2 h-8 justify-center
                      ${conv.id === currentConversationId ? 'bg-gray-100' : ''}
                    `}
                    title={conv.title}
                  >
                    <MessageSquare className="w-3 h-3" />
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
