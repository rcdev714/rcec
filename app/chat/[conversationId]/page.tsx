import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ChatUI } from '@/components/chat-ui'

interface ConversationPageProps {
  params: Promise<{
    conversationId: string
  }>
}

const APP_SIDEBAR_COLLAPSED_WIDTH = 64 // Matches collapsed width in components/sidebar.tsx

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
    <section className="flex h-[100dvh] min-h-0 w-full">
      <ChatUI 
        initialConversationId={conversationId}
        initialMessages={messages || []}
        appSidebarOffset={APP_SIDEBAR_COLLAPSED_WIDTH}
        useAsyncMode
      />
    </section>
  )
}
