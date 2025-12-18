"use client";

import { ChatUI } from "./chat/ChatUI";

export { ChatUI };

// Default export for backward compatibility
export default function ChatUIDefault(props: any) {
  return <ChatUI {...props} />;
}
