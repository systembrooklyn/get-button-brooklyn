"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, AlertCircle, CreditCard, Zap } from "lucide-react";

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
  const [error, setError] = useState("");
  const [showBilling, setShowBilling] = useState(false);
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

  const renderAvatar = (size = "md") => {
    const sizeClass = size === "sm" ? "w-8 h-8" : "w-10 h-10";
    if (chatbot?.avatar?.startsWith("data:image")) {
      return (
        <img
          src={chatbot.avatar || "/placeholder.svg"}
          alt={chatbot?.name}
          className={`${sizeClass} rounded-full object-cover border-2 border-accent shadow-md`}
        />
      );
    }
    return (
      <div
        className={`${sizeClass} rounded-full bg-gradient-to-br from-accent to-accent/70 text-accent-foreground flex items-center justify-center font-bold text-sm shadow-md`}
      >
        {chatbot?.name?.charAt(0)?.toUpperCase()}
      </div>
    );
  };

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
    setError("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input,
          chatbotId: chatbot?.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send message");
      }

      const data = await response.json();

      const assistantMessage = {
        id: messages.length + 2,
        role: "assistant",
        content: data.message || "Unable to generate response.",
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("[v0] Error sending message:", err);
      setError(err.message || "Failed to send message. Please try again.");

      const errorMessage = {
        id: messages.length + 2,
        role: "assistant",
        content: `I encountered an error: ${err.message}. Please try again.`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const messageCount = chatbot?.messageCount || 0;
  const messagesLimit = chatbot?.messagesLimit || 20;
  const isNearLimit = messageCount >= messagesLimit;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-md flex flex-col gap-3">
      <div className="bg-gradient-to-b from-card via-card to-card/95 border border-border/50 rounded-3xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-sm h-[600px]">
        {/* Header with gradient background */}
        <div className="flex items-center justify-between p-5 bg-gradient-to-r from-accent/20 via-accent/10 to-transparent border-b border-border/30 flex-shrink-0 gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {renderAvatar("sm")}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm text-foreground truncate">
                {chatbot?.name}
              </h3>
              <p className="text-xs text-muted-foreground truncate">
                {chatbot?.tagline}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowBilling(!showBilling)}
              className="p-2 hover:bg-accent/10 rounded-lg transition-colors"
              title="View billing info"
              aria-label="Billing info"
            >
              <CreditCard className="w-4 h-4 text-muted-foreground hover:text-accent" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
              aria-label="Close chat"
            >
              <X className="w-5 h-5 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        </div>

        {/* Billing Info - shown when showBilling is true */}
        {showBilling && (
          <div className="p-4 border-b border-border/30 bg-accent/5 backdrop-blur-sm animate-in slide-in-from-top-2">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  Messages Used
                </span>
                <span className="text-sm font-medium text-accent">
                  {messageCount} / {messagesLimit}
                </span>
              </div>
              <div className="w-full bg-border/50 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isNearLimit
                      ? "bg-destructive"
                      : "bg-gradient-to-r from-accent to-accent/60"
                  }`}
                  style={{
                    width: `${Math.min(
                      (messageCount / messagesLimit) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
              {isNearLimit && (
                <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive font-medium">
                    Message limit reached. Upgrade to continue.
                  </p>
                </div>
              )}
              <button className="w-full px-4 py-2.5 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground rounded-lg font-semibold text-sm hover:from-accent/90 hover:to-accent/70 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2">
                <Zap className="w-4 h-4" />
                Upgrade Plan
              </button>
            </div>
          </div>
        )}

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/30">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              } gap-3 animate-in fade-in slide-in-from-bottom-2`}
            >
              {msg.role === "assistant" && (
                <div className="flex-shrink-0">{renderAvatar("sm")}</div>
              )}
              <div
                className={`max-w-xs px-4 py-3 rounded-2xl text-sm leading-relaxed transition-all ${
                  msg.role === "user"
                    ? "bg-accent text-accent-foreground rounded-br-none shadow-md"
                    : "bg-muted text-muted-foreground rounded-bl-none border border-border/50 shadow-sm"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div
                    className="prose prose-sm max-w-none dark:prose-invert prose-headings:mt-2 prose-headings:mb-1 prose-p:my-1 prose-ul:my-1 prose-ol:my-1"
                    dangerouslySetInnerHTML={{
                      __html: msg.content
                        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                        .replace(/^### (.*$)/gim, "<h3>$1</h3>")
                        .replace(/^## (.*$)/gim, "<h2>$1</h2>")
                        .replace(/^# (.*$)/gim, "<h1>$1</h1>")
                        .replace(/^- (.*$)/gim, "<li>$1</li>")
                        .replace(/^\d+\. (.*$)/gim, "<li>$1</li>")
                        .replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>")
                        .replace(/```(.*?)```/gs, "<pre><code>$1</code></pre>")
                        .replace(/`(.*?)`/g, "<code>$1</code>")
                        .replace(/\n/g, "<br>"),
                    }}
                  />
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start gap-3">
              <div className="flex-shrink-0">{renderAvatar("sm")}</div>
              <div className="bg-muted text-muted-foreground px-4 py-3 rounded-2xl rounded-bl-none border border-border/50 shadow-sm">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
          {error && (
            <div className="flex justify-start gap-3">
              <div className="flex-shrink-0">{renderAvatar("sm")}</div>
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-2xl rounded-bl-none border border-destructive/30 text-sm max-w-xs">
                {error}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border/30 bg-card/95 flex-shrink-0 backdrop-blur-sm">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2.5 border border-border/50 rounded-xl text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-transparent transition-all"
              disabled={loading || isNearLimit}
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !input.trim() || isNearLimit}
              className="px-4 py-2.5 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground rounded-xl hover:from-accent/90 hover:to-accent/70 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold flex items-center justify-center shadow-md hover:shadow-lg"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
