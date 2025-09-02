import ChatUI from "@/components/chat-ui";

export const dynamic = 'force-dynamic'

export default function ChatPage() {
  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-hidden">
        <ChatUI />
      </div>
    </div>
  );
}

