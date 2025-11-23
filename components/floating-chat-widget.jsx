"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, AlertCircle, CreditCard, Zap, RefreshCw } from "lucide-react";

// Helper to detect if text is predominantly RTL
const isRTL = (text) => {
  if (!text) return false;
  const rtlRegex = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
  return rtlRegex.test(text);
};

// Helper to convert URLs to clickable links
const linkify = (text) => {
  if (!text) return "";
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="underline decoration-1 underline-offset-2 hover:opacity-80 break-all font-semibold text-accent-foreground/90">${url}</a>`;
  });
};

export function FloatingChatWidget({ chatbot, onClose }) {
  const [sessionId, setSessionId] = useState("");

  const [messages, setMessages] = useState(() => {
    if (typeof window === "undefined") return [];

    const initialMsg = {
      id: 1,
      role: "assistant",
      content: chatbot?.greetingMessage || "Hello! How can I help you today?",
    };

    const saved = localStorage.getItem(`chat_${chatbot?.id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [initialMsg];
      }
    }
    return [initialMsg];
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showBilling, setShowBilling] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const accentColor = chatbot?.color || "#2563eb";

  // Initialize Session ID
  useEffect(() => {
    if (typeof window !== "undefined") {
      let storedSession = localStorage.getItem(`session_${chatbot?.id}`);
      if (!storedSession) {
        storedSession = `sess_${Math.random()
          .toString(36)
          .substr(2, 9)}_${Date.now()}`;
        localStorage.setItem(`session_${chatbot?.id}`, storedSession);
      }
      setSessionId(storedSession);
    }
  }, [chatbot?.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    if (typeof window !== "undefined" && chatbot?.id) {
      localStorage.setItem(`chat_${chatbot.id}`, JSON.stringify(messages));
    }
  }, [messages, chatbot?.id]);

  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  const renderAvatar = (size = "md") => {
    const sizeClass = size === "sm" ? "w-8 h-8" : "w-10 h-10";
    if (
      chatbot?.avatar?.startsWith("data:image") ||
      chatbot?.avatar?.startsWith("http")
    ) {
      return (
        <img
          src={chatbot.avatar}
          alt={chatbot?.name}
          className={`${sizeClass} rounded-full object-cover border border-white/20 shadow-sm bg-white`}
        />
      );
    }
    return (
      <div
        className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-sm shadow-sm text-white`}
        style={{ backgroundColor: accentColor }}
      >
        {chatbot?.name?.charAt(0)?.toUpperCase() || "A"}
      </div>
    );
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: currentInput,
          chatbotId: chatbot?.id,
          sessionId: sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();
      const assistantMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: data.message || "Unable to generate response.",
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError("Failed to send. Please retry.");
      setInput(currentInput);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    if (confirm("Start a new conversation?")) {
      // Regenerate Session ID for a clean slate on backend logs too
      const newSessionId = `sess_${Math.random()
        .toString(36)
        .substr(2, 9)}_${Date.now()}`;
      localStorage.setItem(`session_${chatbot?.id}`, newSessionId);
      setSessionId(newSessionId);

      const initialMsg = {
        id: Date.now(),
        role: "assistant",
        content: chatbot?.greetingMessage || "Hello! How can I help you today?",
      };
      setMessages([initialMsg]);
      localStorage.removeItem(`chat_${chatbot?.id}`);
    }
  };

  const messageCount = chatbot?.messageCount || 0;
  const messagesLimit = chatbot?.messagesLimit || 20;
  const isNearLimit = messageCount >= messagesLimit;

  // Render message with link detection and markdown support
  const renderMessageContent = (content) => {
    let processed = linkify(content);

    processed = processed
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/__(.*?)__/g, "<u>$1</u>")
      .replace(/^### (.*$)/gim, "<h3 class='font-bold text-sm my-1'>$1</h3>")
      .replace(/^## (.*$)/gim, "<h2 class='font-bold text-base my-2'>$1</h2>")
      .replace(/^- (.*$)/gim, "<li class='ml-4'>$1</li>")
      .replace(/^\d+\. (.*$)/gim, "<li class='ml-4 list-decimal'>$1</li>")
      .replace(/\n/g, "<br>");

    return (
      <div
        className="prose prose-sm max-w-none dark:prose-invert leading-relaxed break-words font-medium text-[15px]"
        dangerouslySetInnerHTML={{ __html: processed }}
      />
    );
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] w-[90vw] md:w-[380px] flex flex-col gap-3 font-sans animate-in slide-in-from-bottom-10 fade-in duration-300">
      <div className="bg-background border border-border/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden h-[600px] max-h-[80vh]">
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 text-white shadow-md z-10"
          style={{ backgroundColor: accentColor }}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="relative">
              {renderAvatar("sm")}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full"></span>
            </div>
            <div className="flex-col overflow-hidden">
              <h3 className="font-bold text-sm truncate leading-tight">
                {chatbot?.name || "AI Assistant"}
              </h3>
              <p className="text-[10px] opacity-90 truncate">
                {chatbot?.tagline || "Online"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleClearChat}
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
              title="New Chat"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowBilling(!showBilling)}
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
              title="Usage"
            >
              <CreditCard className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Usage/Billing Panel overlay */}
        {showBilling && (
          <div className="absolute top-16 left-0 right-0 p-4 bg-background/95 backdrop-blur-md border-b border-border z-20 animate-in slide-in-from-top-5 shadow-lg">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">
                  Monthly Usage
                </span>
                <span
                  className={`${
                    isNearLimit ? "text-destructive" : "text-primary"
                  }`}
                >
                  {messageCount} / {messagesLimit}
                </span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isNearLimit ? "bg-destructive" : "bg-primary"
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
                <div className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Limit reached. Please upgrade.
                </div>
              )}
              <button
                className="w-full py-2 text-white rounded-lg text-xs font-bold shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                style={{
                  background: `linear-gradient(to right, ${accentColor}, #2563eb)`,
                }}
              >
                <Zap className="w-3 h-3" />
                UPGRADE NOW
              </button>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-secondary/10 scroll-smooth">
          {messages.map((msg, idx) => {
            const isUser = msg.role === "user";
            const isMsgRtl = isRTL(msg.content);

            return (
              <div
                key={msg.id || idx}
                className={`flex w-full ${
                  isUser ? "justify-end" : "justify-start"
                } animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                <div
                  className={`flex max-w-[85%] ${
                    isUser ? "flex-row-reverse" : "flex-row"
                  } gap-2`}
                >
                  {!isUser && (
                    <div className="flex-shrink-0 mt-auto">
                      {renderAvatar("sm")}
                    </div>
                  )}

                  <div
                    className={`
                                relative px-4 py-3 shadow-sm text-[15px]
                                ${
                                  isUser
                                    ? "text-white rounded-2xl rounded-tr-sm"
                                    : "bg-card text-card-foreground border border-border/50 rounded-2xl rounded-tl-sm"
                                }
                            `}
                    style={isUser ? { backgroundColor: accentColor } : {}}
                    dir={isMsgRtl ? "rtl" : "ltr"}
                  >
                    {renderMessageContent(msg.content)}
                    <span
                      className={`text-[9px] block mt-1 ${
                        isUser ? "text-white/70" : "text-muted-foreground"
                      } ${isMsgRtl ? "text-left" : "text-right"}`}
                    >
                      {new Date().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {loading && (
            <div className="flex w-full justify-start animate-in fade-in">
              <div className="flex max-w-[85%] flex-row gap-2">
                <div className="flex-shrink-0 mt-auto">
                  {renderAvatar("sm")}
                </div>
                <div className="bg-card border border-border/50 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce"></span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex justify-center my-2 animate-in fade-in">
              <span className="bg-destructive/10 text-destructive text-xs px-3 py-1 rounded-full border border-destructive/20 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {error}
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 bg-background border-t border-border">
          {messages.length < 3 && chatbot?.suggestedMessages && (
            <div className="flex gap-2 overflow-x-auto pb-3 mb-1 scrollbar-hide">
              {chatbot.suggestedMessages
                .split("\n")
                .filter(Boolean)
                .map((s, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(s);
                      setTimeout(handleSendMessage, 0);
                    }}
                    className="whitespace-nowrap px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs rounded-full border border-border transition-colors"
                  >
                    {s}
                  </button>
                ))}
            </div>
          )}

          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type a message..."
              className="flex-1 max-h-32 min-h-[44px] py-3 px-4 bg-secondary/30 border border-transparent focus:border-input focus:bg-background rounded-2xl text-sm focus:outline-none resize-none transition-all scrollbar-hide"
              rows={1}
              disabled={loading || isNearLimit}
              style={{ height: "auto", overflowY: "hidden" }}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = e.target.scrollHeight + "px";
              }}
              dir="auto"
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || !input.trim() || isNearLimit}
              className={`
                h-[44px] w-[44px] flex items-center justify-center rounded-full shadow-sm transition-all
                ${
                  !input.trim() || loading || isNearLimit
                    ? "bg-secondary text-muted-foreground cursor-not-allowed"
                    : "text-white hover:scale-105 active:scale-95"
                }
              `}
              style={
                !input.trim() || loading || isNearLimit
                  ? { backgroundColor: accentColor }
                  : {}
              }
              aria-label="Send"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5 ml-0.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
