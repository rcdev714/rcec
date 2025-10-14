import ChatUI from "@/components/chat-ui";

export const dynamic = 'force-dynamic'

interface ChatPageProps {
  searchParams: Promise<{ new?: string }>
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const params = await searchParams;
  // Use the 'new' query param as key to force component remount for new conversations
  const key = params.new ? `chat-new-${params.new}` : 'chat-default';
  
  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-hidden">
        <ChatUI key={key} />
      </div>
    </div>
  );
}

