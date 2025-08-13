// Gestión de conversaciones múltiples con persistencia en Supabase
import { createClient } from '@/lib/supabase/client';
import { ChatMessage } from '@/types/chat';

export interface ConversationItem {
  id: string;
  title: string;
  firstMessage: string;
  createdAt: Date;
  lastActivity: Date;
  messageCount: number;
}

class ConversationManager {
  private static instance: ConversationManager;
  private conversations: Map<string, ConversationItem> = new Map();
  private currentConversationId: string | null = null;
  private supabase = createClient();

  static getInstance(): ConversationManager {
    if (!ConversationManager.instance) {
      ConversationManager.instance = new ConversationManager();
    }
    return ConversationManager.instance;
  }

  // Crear nueva conversación
  async createConversation(firstMessage: string): Promise<string> {
    const now = new Date();
    const title = this.generateTitle(firstMessage);
    
    try {
      // Get current user
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) {
        // Fallback to localStorage for unauthenticated users
        return this.createLocalConversation(firstMessage);
      }

      // Create conversation in Supabase
      const { data: conversation, error } = await this.supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating conversation in Supabase:', error);
        return this.createLocalConversation(firstMessage);
      }

      // Add to local cache
      const conversationItem: ConversationItem = {
        id: conversation.id,
        title,
        firstMessage,
        createdAt: now,
        lastActivity: now,
        messageCount: 1
      };

      this.conversations.set(conversation.id, conversationItem);
      this.currentConversationId = conversation.id;
      this.saveToStorage();
      
      return conversation.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return this.createLocalConversation(firstMessage);
    }
  }

  // Fallback method for localStorage
  private createLocalConversation(firstMessage: string): string {
    const id = this.generateId();
    const now = new Date();
    
    const conversation: ConversationItem = {
      id,
      title: this.generateTitle(firstMessage),
      firstMessage,
      createdAt: now,
      lastActivity: now,
      messageCount: 1
    };

    this.conversations.set(id, conversation);
    this.currentConversationId = id;
    this.saveToStorage();
    
    return id;
  }

  // Obtener conversación actual
  getCurrentConversationId(): string | null {
    return this.currentConversationId;
  }

  // Cambiar conversación activa
  setCurrentConversation(id: string): void {
    if (this.conversations.has(id)) {
      this.currentConversationId = id;
      this.saveToStorage();
    }
  }

  // Actualizar actividad de conversación
  async updateActivity(id: string): Promise<void> {
    const conversation = this.conversations.get(id);
    if (conversation) {
      conversation.lastActivity = new Date();
      conversation.messageCount += 1;
      this.conversations.set(id, conversation);
      this.saveToStorage();

      // Update in Supabase
      try {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (user) {
          await this.supabase
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', user.id);
        }
      } catch (error) {
        console.warn('Error updating conversation activity in Supabase:', error);
      }
    }
  }

  // Obtener todas las conversaciones ordenadas por actividad
  getAllConversations(): ConversationItem[] {
    return Array.from(this.conversations.values())
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
  }

  // Eliminar conversación
  deleteConversation(id: string): void {
    this.conversations.delete(id);
    if (this.currentConversationId === id) {
      this.currentConversationId = null;
    }
    this.saveToStorage();
  }

  // Generar título a partir del primer mensaje
  private generateTitle(message: string): string {
    // Limpiar y truncar el mensaje
    const cleaned = message.trim().replace(/\n/g, ' ');
    if (cleaned.length <= 40) return cleaned;
    
    // Encontrar el final de la primera oración o truncar en palabra
    const firstSentence = cleaned.match(/^[^.!?]*[.!?]/);
    if (firstSentence && firstSentence[0].length <= 40) {
      return firstSentence[0];
    }
    
    // Truncar en la última palabra completa antes de 40 caracteres
    const truncated = cleaned.substring(0, 37);
    const lastSpace = truncated.lastIndexOf(' ');
    return lastSpace > 20 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
  }

  // Generar ID único
  private generateId(): string {
    return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Guardar en localStorage
  private saveToStorage(): void {
    try {
      const data = {
        conversations: Array.from(this.conversations.entries()),
        currentConversationId: this.currentConversationId
      };
      localStorage.setItem('chat_conversations', JSON.stringify(data));
    } catch (error) {
      console.warn('Error saving conversations to localStorage:', error);
    }
  }

  // Cargar desde localStorage y Supabase
  async loadFromStorage(): Promise<void> {
    try {
      // First load from localStorage for immediate UI
      this.loadFromLocalStorage();
      
      // Then sync with Supabase
      await this.syncWithSupabase();
    } catch (error) {
      console.warn('Error loading conversations:', error);
      this.loadFromLocalStorage();
    }
  }

  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem('chat_conversations');
      if (stored) {
        const data = JSON.parse(stored);
        this.conversations = new Map(data.conversations.map(([id, conv]: [string, ConversationItem]) => [
          id,
          {
            ...conv,
            createdAt: new Date(conv.createdAt),
            lastActivity: new Date(conv.lastActivity)
          }
        ]));
        this.currentConversationId = data.currentConversationId;
      }
    } catch (error) {
      console.warn('Error loading from localStorage:', error);
      this.conversations = new Map();
      this.currentConversationId = null;
    }
  }

  private async syncWithSupabase(): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return; // No user, keep localStorage data

      // Fetch conversations from Supabase
      const { data: conversations, error } = await this.supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations from Supabase:', error);
        return;
      }

      // Clear existing conversations and load from Supabase
      this.conversations.clear();

      // Convert to local format and update cache
      conversations?.forEach(conv => {
        const conversationItem: ConversationItem = {
          id: conv.id,
          title: conv.title,
          firstMessage: conv.title, // Using title as firstMessage for now
          createdAt: new Date(conv.created_at),
          lastActivity: new Date(conv.updated_at),
          messageCount: 0 // Will be updated when messages are loaded
        };
        this.conversations.set(conv.id, conversationItem);
      });

      this.saveToStorage();
    } catch (error) {
      console.warn('Error syncing with Supabase:', error);
    }
  }

  // Add message to conversation
  async addMessage(conversationId: string, message: ChatMessage): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return; // Skip Supabase storage for unauthenticated users

      // Store message in Supabase
      const { error } = await this.supabase
        .from('conversation_messages')
        .insert({
          conversation_id: conversationId,
          role: message.role,
          content: message.content,
          metadata: message.metadata || {},
          token_count: message.tokenCount || 0,
          created_at: message.createdAt.toISOString(),
        });

      if (error) {
        console.error('Error storing message in Supabase:', error);
      }

      // Update conversation activity
      await this.updateActivity(conversationId);
    } catch (error) {
      console.error('Error adding message:', error);
    }
  }

  // Get conversation messages
  async getConversationMessages(conversationId: string): Promise<ChatMessage[]> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return []; // No messages for unauthenticated users

      const { data: messages, error } = await this.supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages from Supabase:', error);
        return [];
      }

      return messages?.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        metadata: msg.metadata,
        tokenCount: msg.token_count,
        createdAt: new Date(msg.created_at),
      })) || [];
    } catch (error) {
      console.error('Error getting conversation messages:', error);
      return [];
    }
  }
}

export default ConversationManager;
