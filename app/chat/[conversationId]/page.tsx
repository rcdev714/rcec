import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ChatUI } from '@/components/chat-ui'

interface ConversationPageProps {
  params: Promise<{
    conversationId: string
  }>
}

export default async function ConversationPage({ params }: ConversationPageProps) {
  const { conversationId } = await params
  const supabase = await createClient()

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  // Verify conversation exists and belongs to user
  const { data: conversation, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('user_id', user.id)
    .single()

  if (error || !conversation) {
    redirect('/chat')
  }

  // Get conversation messages
  const { data: messages } = await supabase
    .from('conversation_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4 shrink-0">
        <h1 className="text-lg font-semibold text-foreground">
          {conversation.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          Conversación iniciada el {new Date(conversation.created_at).toLocaleDateString('es-ES')}
        </p>
      </div>
      
      {/* Chat UI takes the remaining space */}
      <div className="flex-1 overflow-hidden">
        <ChatUI 
          initialConversationId={conversationId}
          initialMessages={messages || []}
        />
      </div>
    </div>
  )
}
