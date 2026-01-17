"use client";

import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import {
  MessageSquare,
  User,
  Bot,
  Clock,
  Search,
  Calendar,
  RefreshCw,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ChatLogsTab({ chatbots }) {
  const [selectedChatbot, setSelectedChatbot] = useState(chatbots[0]?.id || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("all");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedSession, setExpandedSession] = useState(null);

  const activeBot = chatbots.find((c) => c.id === selectedChatbot);

  useEffect(() => {
    if (!selectedChatbot) return;

    const fetchMessages = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/chat-logs?chatbotId=${selectedChatbot}`,
        );
        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages || []);
        } else {
          // Fallback to chatbot messages if API doesn't exist
          setMessages(activeBot?.messages || []);
        }
      } catch (error) {
        console.error("Failed to fetch chat logs:", error);
        // Fallback to chatbot messages
        setMessages(activeBot?.messages || []);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [selectedChatbot, activeBot?.messages]);

  const sessions = useMemo(() => {
    if (!messages || messages.length === 0) return [];

    const sortedMessages = [...messages].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    );

    const grouped = [];
    let currentSession = null;
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

    sortedMessages.forEach((msg) => {
      const msgTime = new Date(msg.createdAt).getTime();

      if (
        !currentSession ||
        msgTime - currentSession.lastMsgTime > SESSION_TIMEOUT
      ) {
        if (currentSession) grouped.push(currentSession);
        currentSession = {
          id: `sess_${msg.id?.substring(0, 6) || Date.now()}_${msgTime}`,
          startTime: msg.createdAt,
          lastMsgTime: msgTime,
          messages: [msg],
          preview: msg.role === "user" ? msg.content : "",
        };
      } else {
        currentSession.messages.push(msg);
        currentSession.lastMsgTime = msgTime;
        if (msg.role === "user" && !currentSession.preview) {
          currentSession.preview = msg.content;
        }
      }
    });

    if (currentSession) grouped.push(currentSession);

    return grouped.sort(
      (a, b) => new Date(b.startTime) - new Date(a.startTime),
    );
  }, [messages]);

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch =
      s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.preview &&
        s.preview.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.messages.some((m) =>
        m.content.toLowerCase().includes(searchQuery.toLowerCase()),
      );

    if (!matchesSearch) return false;

    const sessionDate = new Date(s.startTime);
    const now = new Date();
    const diffHours = (now - sessionDate) / (1000 * 60 * 60);

    if (timeFilter === "24h") return diffHours <= 24;
    if (timeFilter === "7d") return diffHours <= 24 * 7;
    if (timeFilter === "30d") return diffHours <= 24 * 30;

    return true;
  });

  const handleExport = () => {
    const exportData = {
      chatbot: activeBot?.name,
      exportedAt: new Date().toISOString(),
      sessions: filteredSessions.map((s) => ({
        sessionId: s.id,
        startTime: s.startTime,
        messageCount: s.messages.length,
        messages: s.messages.map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.createdAt,
        })),
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-logs-${activeBot?.name || "export"}-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRefresh = async () => {
    if (!selectedChatbot) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/chat-logs?chatbotId=${selectedChatbot}`,
      );
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error("Failed to refresh:", error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const totalMessages = messages.length;
    const userMessages = messages.filter((m) => m.role === "user").length;
    const botMessages = messages.filter((m) => m.role === "assistant").length;
    return {
      totalMessages,
      userMessages,
      botMessages,
      sessions: sessions.length,
    };
  }, [messages, sessions]);

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Chat Logs</h2>
          <p className="text-muted-foreground text-sm mt-1">
            View and analyze conversation history from your chatbots.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="gap-2 bg-transparent"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={filteredSessions.length === 0}
            className="gap-2 bg-transparent"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Total Sessions
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {stats.sessions}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Total Messages
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {stats.totalMessages}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            User Messages
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {stats.userMessages}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Bot Responses
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {stats.botMessages}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row justify-between gap-4 p-4 bg-card rounded-xl border border-border shadow-sm">
        <div className="w-full md:w-1/3">
          <label className="text-xs font-bold text-muted-foreground mb-1.5 block uppercase tracking-wider">
            Select Chatbot
          </label>
          <div className="relative">
            <select
              className="w-full p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-accent outline-none appearance-none pr-10"
              value={selectedChatbot}
              onChange={(e) => setSelectedChatbot(e.target.value)}
            >
              {chatbots.map((bot) => (
                <option key={bot.id} value={bot.id}>
                  {bot.name}
                </option>
              ))}
            </select>
            <Bot className="absolute right-3 top-3 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        <div className="w-full md:w-2/3 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="text-xs font-bold text-muted-foreground mb-1.5 block uppercase tracking-wider">
              Filter by Date
            </label>
            <div className="relative">
              <select
                className="w-full p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-accent outline-none appearance-none pr-10"
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
              >
                <option value="all">All Time</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
              <Calendar className="absolute right-3 top-3 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="flex-[2]">
            <label className="text-xs font-bold text-muted-foreground mb-1.5 block uppercase tracking-wider">
              Search Logs
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search messages..."
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-accent outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">
            Loading chat logs...
          </span>
        </div>
      )}

      {/* Sessions List */}
      {!loading && (
        <div className="grid gap-4">
          {filteredSessions.length > 0 ? (
            filteredSessions.map((session) => (
              <Card
                key={session.id}
                className="overflow-hidden border border-border hover:border-accent/50 transition-colors shadow-sm"
              >
                <div
                  className="bg-muted/30 p-3 border-b border-border flex justify-between items-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() =>
                    setExpandedSession(
                      expandedSession === session.id ? null : session.id,
                    )
                  }
                >
                  <div className="flex items-center gap-3">
                    <span className="bg-accent/10 text-accent p-2 rounded-lg">
                      <Clock className="w-4 h-4" />
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground">
                        {new Date(session.startTime).toLocaleDateString(
                          undefined,
                          {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          },
                        )}
                        {" at "}
                        {new Date(session.startTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {session.preview && (
                        <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                          "{session.preview.substring(0, 50)}
                          {session.preview.length > 50 ? "..." : ""}"
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-background px-3 py-1.5 rounded-full border border-border font-medium">
                      {session.messages.length} messages
                    </span>
                    <span
                      className={`transition-transform ${expandedSession === session.id ? "rotate-180" : ""}`}
                    >
                      <svg
                        className="w-4 h-4 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </span>
                  </div>
                </div>

                {expandedSession === session.id && (
                  <div className="p-4 bg-card max-h-96 overflow-y-auto space-y-3">
                    {session.messages.map((msg, idx) => (
                      <div
                        key={msg.id || idx}
                        className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border border-border/50 ${
                            msg.role === "user"
                              ? "bg-primary/10 text-primary"
                              : "bg-accent/20 text-accent"
                          }`}
                        >
                          {msg.role === "user" ? (
                            <User className="w-4 h-4" />
                          ) : (
                            <Bot className="w-4 h-4" />
                          )}
                        </div>
                        <div
                          className={`p-3 rounded-2xl max-w-[80%] text-sm leading-relaxed ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground rounded-tr-sm"
                              : "bg-muted text-foreground border border-border rounded-tl-sm"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <span
                            className={`text-[10px] block mt-1.5 ${
                              msg.role === "user"
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            }`}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))
          ) : (
            <div className="text-center py-16 bg-muted/10 rounded-xl border border-dashed border-border">
              <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-foreground">
                No chat logs found
              </h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">
                {searchQuery
                  ? "Try adjusting your search or filters."
                  : "Start a conversation with your chatbot to see logs here."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
