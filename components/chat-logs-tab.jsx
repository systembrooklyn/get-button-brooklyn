"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import {
  MessageSquare,
  User,
  Bot,
  Clock,
  Search,
  Calendar,
} from "lucide-react";

export default function ChatLogsTab({ chatbots }) {
  const [selectedChatbot, setSelectedChatbot] = useState(chatbots[0]?.id || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [timeFilter, setTimeFilter] = useState("all"); // all, 24h, 7d, 30d

  const activeBot = chatbots.find((c) => c.id === selectedChatbot);

  // Flatten messages and group by Session ID
  const groupedSessions = (activeBot?.messages || []).reduce((acc, msg) => {
    const sessId = msg.sessionId || "Legacy";
    if (!acc[sessId]) {
      acc[sessId] = {
        id: sessId,
        startTime: msg.createdAt,
        messages: [],
        preview: "",
      };
    }
    acc[sessId].messages.push(msg);
    // Sort messages by time within session
    acc[sessId].messages.sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );

    // Set preview to first user message
    if (msg.role === "user" && !acc[sessId].preview) {
      acc[sessId].preview = msg.content;
    }

    return acc;
  }, {});

  const now = new Date();

  const sessions = Object.values(groupedSessions)
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime))
    .filter((s) => {
      // Search Filter
      const matchesSearch =
        s.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.preview.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Time Filter
      const sessionDate = new Date(s.startTime);
      const diffHours = (now - sessionDate) / (1000 * 60 * 60);

      if (timeFilter === "24h") return diffHours <= 24;
      if (timeFilter === "7d") return diffHours <= 24 * 7;
      if (timeFilter === "30d") return diffHours <= 24 * 30;

      return true;
    });

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row justify-between gap-4 p-4 bg-card rounded-xl border border-border shadow-sm">
        <div className="w-full md:w-1/3">
          <label className="text-xs font-bold text-muted-foreground mb-1.5 block uppercase tracking-wider">
            Select Chatbot
          </label>
          <div className="relative">
            <select
              className="w-full p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-accent outline-none appearance-none"
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
                className="w-full p-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-accent outline-none appearance-none"
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
                placeholder="Search session ID or message content..."
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-border bg-background focus:ring-2 focus:ring-accent outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="grid gap-4">
        {sessions.length > 0 ? (
          sessions.map((session) => (
            <Card
              key={session.id}
              className="overflow-hidden border border-border hover:border-accent/50 transition-colors shadow-sm"
            >
              <div className="bg-secondary/30 p-3 border-b border-border flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="bg-accent/10 text-accent p-1.5 rounded-md">
                    <Clock className="w-4 h-4" />
                  </span>
                  <div className="flex flex-col">
                    <span
                      className="text-xs font-mono text-muted-foreground"
                      title={session.id}
                    >
                      {session.id.length > 20
                        ? session.id.substring(0, 20) + "..."
                        : session.id}
                    </span>
                    <span className="text-xs font-medium">
                      {new Date(session.startTime).toLocaleString()}
                    </span>
                  </div>
                </div>
                <span className="text-xs bg-background px-2 py-1 rounded border border-border font-medium">
                  {session.messages.length} msgs
                </span>
              </div>

              <div className="p-4 bg-card max-h-64 overflow-y-auto space-y-3 custom-scrollbar">
                {session.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${
                      msg.role === "user" ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border border-border/50 ${
                        msg.role === "user"
                          ? "bg-muted text-muted-foreground"
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
                      className={`p-3 rounded-2xl max-w-[85%] text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-muted text-foreground rounded-tr-sm"
                          : "bg-accent/5 text-foreground border border-accent/10 rounded-tl-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-16 bg-muted/10 rounded-xl border border-dashed border-border">
            <MessageSquare className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-foreground">
              No chat logs found
            </h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">
              Try adjusting your search or filters, or start a new conversation
              with your chatbot to populate logs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
