"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  X,
  Send,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  Lock,
} from "lucide-react";

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
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="underline decoration-1 underline-offset-2 hover:opacity-80 break-all font-semibold text-blue-600 dark:text-blue-400">${url}</a>`;
  });
};

export function FloatingChatWidget({ chatbot, onClose, onMessageSent }) {
  const accentColor = chatbot?.color || "#2563eb";
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // LAZY INITIALIZATION: This runs exactly once when the component mounts (or remounts due to key change).
  // This guarantees we load the CORRECT chat history for THIS specific chatbot ID immediately.
  const [messages, setMessages] = useState(() => {
    if (typeof window === "undefined" || !chatbot?.id) return [];

    const key = `chat_${chatbot.id}`;
    const initialMsg = {
      id: 1,
      role: "assistant",
      content: chatbot?.greetingMessage || "Hello! How can I help you today?",
      createdAt: new Date().toISOString(),
    };

    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error("Failed to parse chat history", e);
    }
    return [initialMsg];
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isLimitReachedState, setIsLimitReachedState] = useState(false);

  // Check limits on mount/update
  useEffect(() => {
    if (!chatbot) return;
    const limit = chatbot.messagesLimit || 20;
    const count = chatbot.messageCount || 0;
    setIsLimitReachedState(count >= limit);
  }, [chatbot]);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Persist to LocalStorage whenever messages change
  useEffect(() => {
    if (chatbot?.id && messages.length > 0) {
      localStorage.setItem(`chat_${chatbot.id}`, JSON.stringify(messages));
    }
  }, [messages, chatbot?.id]);

  const renderAvatar = (size = "md") => {
    const sizeClass = size === "sm" ? "w-8 h-8" : "w-10 h-10";
    if (
      chatbot?.avatar?.startsWith("data:image") ||
      chatbot?.avatar?.startsWith("http")
    ) {
      return (
        <img
          src={chatbot.avatar || "/placeholder.svg"}
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

  const handleSendMessage = async (textOverride) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim() || loading || isLimitReachedState) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: textToSend,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textOverride) setInput("");
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          chatbotId: chatbot?.id,
        }),
      });

      if (response.status === 403) {
        setIsLimitReachedState(true);
        setError("Message limit reached.");
        return;
      }

      if (response.status === 429 || response.status === 503) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || "Server busy. Please try again.");
        return;
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send message");
      }

      const data = await response.json();
      const assistantMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: data.message || "Unable to generate response.",
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Notify parent to refresh usage
      if (onMessageSent) {
        onMessageSent();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    if (confirm("Start a new conversation?")) {
      const initialMsg = {
        id: Date.now(),
        role: "assistant",
        content: chatbot?.greetingMessage || "Hello! How can I help you today?",
        createdAt: new Date().toISOString(),
      };
      setMessages([initialMsg]);
      localStorage.removeItem(`chat_${chatbot?.id}`);
      setError("");
    }
  };

  const renderMessageContent = (content) => {
    let processed = linkify(content);
    processed = processed
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/__(.*?)__/g, "<u>$1</u>")
      .replace(/\n/g, "<br>");

    return (
      <div
        className="prose prose-sm max-w-none dark:prose-invert leading-relaxed break-words font-medium text-[15px]"
        dangerouslySetInnerHTML={{ __html: processed }}
      />
    );
  };

  const showSuggestions =
    chatbot?.suggestedMessages &&
    !loading &&
    messages.length > 0 &&
    messages[messages.length - 1].role === "assistant" &&
    !isLimitReachedState;

  const suggestions = chatbot?.suggestedMessages
    ? chatbot.suggestedMessages.split("\n").filter(Boolean)
    : [];

  return (
    <>
      <div className="fixed bottom-6 right-6 z-[100] w-[90vw] md:w-[400px] flex flex-col gap-3 font-sans animate-in slide-in-from-bottom-10 fade-in duration-300">
        <div className="bg-card text-card-foreground border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden h-[750px] max-h-[85vh]">
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
                <p className="text-[11px] opacity-90 truncate">
                  {chatbot?.tagline || "Online"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleClearChat}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                title="New Chat"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto bg-muted/30 p-4 space-y-6 scroll-smooth">
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
                              : "bg-background text-foreground border border-border rounded-2xl rounded-tl-sm"
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
                        {new Date(
                          msg.createdAt || Date.now()
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex w-full justify-start animate-in fade-in">
                <div className="flex max-w-[85%] flex-row gap-2">
                  <div className="flex-shrink-0 mt-auto">
                    {renderAvatar("sm")}
                  </div>
                  <div className="bg-background border border-border px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce"></span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-center my-2 animate-in fade-in">
                <span className="bg-destructive/10 text-destructive border border-destructive/20 text-xs px-3 py-1 rounded-full flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {error}
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area or Limit Reached State */}
          <div className="bg-card border-t border-border p-3">
            {isLimitReachedState ? (
              <div className="p-6 bg-background rounded-xl border border-border text-center shadow-inner animate-in fade-in slide-in-from-bottom-4">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                  <Lock className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-1">
                  You have reached your limit messages count
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upgrade to enjoy unlimited messages
                </p>
                <button
                  className="w-full text-sm text-white px-4 py-3 rounded-lg font-bold hover:opacity-90 transition-opacity shadow-md"
                  style={{ backgroundColor: accentColor }}
                  onClick={() => alert("Redirect to billing...")}
                >
                  Upgrade Now
                </button>
              </div>
            ) : (
              <>
                {showSuggestions && suggestions.length > 0 && (
                  <div className="mb-3 animate-in slide-in-from-bottom-2 fade-in">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground px-1 mb-2">
                      <MessageSquare className="w-3 h-3" />
                      <span>Suggested:</span>
                    </div>
                    {/* Horizontal Scroll Suggestions */}
                    <div className="flex flex-row overflow-x-auto gap-2 pb-2 scrollbar-hide px-1 mask-linear">
                      {suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => handleSendMessage(s)}
                          className="whitespace-nowrap flex-shrink-0 text-left bg-secondary hover:bg-secondary/80 border border-transparent rounded-full px-4 py-2 text-sm text-secondary-foreground transition-all shadow-sm hover:shadow active:scale-95"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
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
                    className="flex-1 max-h-32 min-h-[44px] py-3 px-4 bg-input text-foreground border border-transparent focus:border-ring rounded-2xl text-sm focus:outline-none resize-none transition-all placeholder:text-muted-foreground"
                    rows={1}
                    disabled={loading}
                    style={{ height: "auto", overflowY: "hidden" }}
                    onInput={(e) => {
                      e.target.style.height = "auto";
                      e.target.style.height = e.target.scrollHeight + "px";
                    }}
                    dir="auto"
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={loading || !input.trim()}
                    className={`
                        h-[44px] w-[44px] flex items-center justify-center rounded-full shadow-md transition-all flex-shrink-0
                        ${
                          !input.trim() || loading
                            ? "bg-muted text-muted-foreground cursor-not-allowed"
                            : "text-white hover:shadow-lg hover:scale-105 active:scale-95"
                        }
                    `}
                    style={
                      !input.trim() || loading
                        ? {}
                        : { backgroundColor: accentColor }
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
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
