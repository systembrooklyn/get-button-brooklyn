"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send } from "lucide-react";

export function FloatingChatWidget({ chatbot, onClose }) {
  const [messages, setMessages] = useState(() => {
    if (typeof window === "undefined") {
      return [
        {
          id: 1,
          role: "assistant",
          content:
            chatbot?.greetingMessage || "Hello! How can I help you today?",
        },
      ];
    }
    const saved = localStorage.getItem(`chat_${chatbot?.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [
          {
            id: 1,
            role: "assistant",
            content:
              chatbot?.greetingMessage || "Hello! How can I help you today?",
          },
        ];
      }
    }
    return [
      {
        id: 1,
        role: "assistant",
        content: chatbot?.greetingMessage || "Hello! How can I help you today?",
      },
    ];
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`chat_${chatbot?.id}`, JSON.stringify(messages));
    }
  }, [messages, chatbot?.id]);

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      id: messages.length + 1,
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Simulate AI response - replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const assistantMessage = {
        id: messages.length + 2,
        role: "assistant",
        content:
          "This is a test response. Connect your AI API to enable real responses.",
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("[v0] Error sending message:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-end p-4 z-50">
      <div className="w-full max-w-md h-96 bg-card border border-border rounded-lg shadow-lg flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="font-semibold text-foreground">{chatbot?.name}</h3>
            <p className="text-xs text-muted-foreground">{chatbot?.tagline}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
                  msg.role === "user"
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted text-muted-foreground px-4 py-2 rounded-lg text-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleSendMessage();
                }
              }}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              disabled={loading}
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !input.trim()}
              className="p-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
