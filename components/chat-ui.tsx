"use client";

import { useState, FormEvent, ChangeEvent, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown, LoaderCircle, Copy, CopyCheck, ArrowUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import UserAvatar from "./user-avatar";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const LoadingSpinner = () => (
  <div className="flex items-center justify-center">
    <LoaderCircle className="w-5 h-5 text-gray-500 animate-spin" />
  </div>
);

export default function ChatUI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const handleScroll = () => {
      if (scrollContainer) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        const isScrolledUp = scrollTop < scrollHeight - clientHeight - 100;
        setShowScrollToBottom(isScrolledUp);
      }
    };
    scrollContainer?.addEventListener("scroll", handleScroll);
    return () => scrollContainer?.removeEventListener("scroll", handleScroll);
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMessageIndex(index);
      setTimeout(() => setCopiedMessageIndex(null), 2000);
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    setIsSending(true);
    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input }),
      });

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantResponse = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        assistantResponse += chunk;
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.role === 'assistant') {
            lastMessage.content = assistantResponse;
          }
          return newMessages;
        });
      }
    } catch (error) {
      console.error("Error fetching chat response:", error);
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage.role === 'assistant' && lastMessage.content === '') {
            newMessages[newMessages.length - 1].content = "Lo siento, algo salió mal.";
        } else {
            newMessages.push({ role: "assistant", content: "Lo siento, algo salió mal." });
        }
        return newMessages;
      });
    } finally {
      setIsSending(false);
    }
  };

  const formLayout = (
    <form onSubmit={handleSubmit} className="relative w-full max-w-2xl">
      <input
        type="text"
        value={input}
        onChange={handleInputChange}
        placeholder="Escribe tu mensaje..."
        className="w-full pl-4 pr-16 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 bg-white"
      />
      <button
        type="submit"
        disabled={isSending}
        className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-2 bg-gray-200 text-gray-800 rounded-full hover:bg-gray-300 disabled:bg-gray-200"
      >
        {isSending ? (
          <LoaderCircle className="w-5 h-5 animate-spin" />
        ) : (
          <ArrowUp className="w-4 h-4" />
        )}
      </button>
    </form>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-white">
      <AnimatePresence>
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.3 }}
            className="flex-grow flex flex-col items-center justify-center"
          >
            <h1 className="text-2xl font-semibold mb-4">Asistente</h1>
            <div className="w-full px-4 max-w-2xl">{formLayout}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {messages.length > 0 && (
        <>
          <div ref={scrollContainerRef} className="flex-grow p-4 sm:p-6 overflow-y-auto relative">
            <div className="space-y-4 max-w-full sm:max-w-4xl mx-auto">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-start gap-2 sm:gap-4",
                    msg.role === "user" && "justify-end"
                  )}
                >
                  {msg.role === "user" ? (
                    <div className="order-2">
                      <UserAvatar />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-medium bg-white text-gray-800">
                      A
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-xs sm:max-w-lg px-3 sm:px-4 py-2 sm:py-3 rounded-lg shadow-sm relative group",
                      msg.role === "user"
                        ? "bg-white text-gray-800"
                        : "bg-gray-100 text-gray-800"
                    )}
                  >
                    {msg.role === 'assistant' && msg.content === '' && isSending ? (
                      <LoadingSpinner />
                    ) : (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                    {msg.role === 'assistant' && msg.content && !isSending && (
                       <button
                        onClick={() => handleCopy(msg.content, index)}
                        className="absolute top-1 right-1 sm:top-2 sm:right-2 p-1 rounded-md bg-gray-200 text-gray-600 hover:bg-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {copiedMessageIndex === index ? (
                          <CopyCheck className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                        ) : (
                          <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
             <AnimatePresence>
              {showScrollToBottom && (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  onClick={scrollToBottom}
                  className="absolute bottom-4 right-4 bg-gray-800 text-white rounded-full p-2 shadow-lg hover:bg-gray-700"
                >
                  <ArrowDown className="w-5 h-5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="border-t border-gray-200 p-2 sm:p-4"
          >
            <div className="max-w-full sm:max-w-4xl mx-auto">{formLayout}</div>
          </motion.div>
        </>
      )}
    </div>
  );
}

