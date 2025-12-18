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

  const baseMessages = (messages || []) as any[];

  // Collect agent run IDs from assistant messages (async mode stores runId in metadata)
  const runIds = Array.from(
    new Set(
      baseMessages
        .filter((m) => m?.role === 'assistant')
        .map((m) => {
          const md = m?.metadata;
          return md && typeof md === 'object' ? (md as any).runId : null;
        })
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    )
  );

  // Load todos for these runs from the normalized table (preferred for reload persistence)
  const todosByRunId = new Map<string, any[]>();
  if (runIds.length > 0) {
    const { data: todoRows } = await supabase
      .from('conversation_todos')
      .select('run_id, todo_id, description, status, sort_order, created_at, completed_at, error_message')
      .in('run_id', runIds)
      .order('run_id', { ascending: true })
      .order('sort_order', { ascending: true });

    (todoRows || []).forEach((row: any) => {
      const rid = row.run_id as string | undefined;
      if (!rid) return;
      const arr = todosByRunId.get(rid) || [];
      arr.push(row);
      todosByRunId.set(rid, arr);
    });
  }

  // Back-compat fallback: if a run has no rows (older data), use agent_runs.todos (jsonb)
  const runsById = new Map<string, any>();
  if (runIds.length > 0) {
    const { data: runs } = await supabase
      .from('agent_runs')
      .select('id, todos')
      .in('id', runIds);
    (runs || []).forEach((r: any) => {
      if (r?.id) runsById.set(r.id, r);
    });
  }

  // Inject a minimalist planning system message before each assistant message (if todos exist)
  const augmentedMessages: any[] = [];
  for (const msg of baseMessages) {
    const runId = msg?.role === 'assistant' && msg?.metadata && typeof msg.metadata === 'object'
      ? (msg.metadata as any).runId
      : null;

    const lastOut = augmentedMessages[augmentedMessages.length - 1];
    const hasPlanAlready =
      lastOut?.role === 'system' &&
      lastOut?.metadata &&
      typeof lastOut.metadata === 'object' &&
      (lastOut.metadata as any).type === 'planning';

    if (typeof runId === 'string' && runId && !hasPlanAlready) {
      const rows = todosByRunId.get(runId) || [];

      let todos: any[] = rows.map((r: any) => ({
        id: r.todo_id,
        description: r.description,
        status: r.status,
        createdAt: r.created_at,
        completedAt: r.completed_at,
        errorMessage: r.error_message,
      }));

      if (todos.length === 0) {
        const run = runsById.get(runId);
        if (run?.todos && Array.isArray(run.todos)) {
          todos = run.todos;
        }
      }

      if (Array.isArray(todos) && todos.length > 0) {
        augmentedMessages.push({
          role: 'system',
          content: '',
          metadata: {
            type: 'planning',
            todos,
          },
        });
      }
    }

    augmentedMessages.push(msg);
  }

  return (
    <section className="flex h-[100dvh] min-h-0 w-full">
      <ChatUI 
        initialConversationId={conversationId}
        initialMessages={augmentedMessages}
        appSidebarOffset={APP_SIDEBAR_COLLAPSED_WIDTH}
        useAsyncMode
      />
    </section>
  )
}
