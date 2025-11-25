import { ChatUI } from "@/components/chat-ui";

export const dynamic = 'force-dynamic'

interface ChatPageProps {
  searchParams: Promise<{ new?: string }>
}

const APP_SIDEBAR_COLLAPSED_WIDTH = 64; // Matches collapsed width in components/sidebar.tsx

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const params = await searchParams;
  // Use the 'new' query param as key to force component remount for new conversations
  const key = params.new ? `chat-new-${params.new}` : 'chat-default';
  
  return (
    <section className="flex h-[100dvh] min-h-0 w-full">
      <ChatUI key={key} appSidebarOffset={APP_SIDEBAR_COLLAPSED_WIDTH} />
    </section>
  );
}

