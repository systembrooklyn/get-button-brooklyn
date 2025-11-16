"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  getChatbotById,
  getChatHistory,
  addMessage,
} from "@/app/actions/chatbot-actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TestChatbotPage() {
  const searchParams = useSearchParams();
  const botId = searchParams.get("botId");

  const [chatbot, setChatbot] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const loadChatbot = async () => {
      if (!botId) return;

      try {
        const bot = await getChatbotById(botId);
        setChatbot(bot);

        const history = await getChatHistory(botId);
        setMessages(history);
      } catch (error) {
        console.error("[v0] Error loading chatbot:", error);
      } finally {
        setLoading(false);
      }
    };

    loadChatbot();
  }, [botId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !botId) return;

    setSending(true);
    try {
      const userMessage = await addMessage(botId, "user", input);
      setMessages([...messages, userMessage]);
      setInput("");

      // Simulate AI response
      const aiMessage = await addMessage(
        botId,
        "assistant",
        "Thank you for your message! This is a test response."
      );
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("[v0] Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading chatbot...</div>
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">Chatbot not found</h2>
          <Link href="/chatbot">
            <Button>Back to Chatbots</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/chatbot">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="font-bold">{chatbot.name}</h1>
              <p className="text-sm text-muted-foreground">{chatbot.tagline}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Greeting */}
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm">{chatbot.greetingMessage}</p>
          </div>

          {/* Messages */}
          {messages.map((msg, idx) => (
            <div
              key={idx}
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
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border p-4">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={sending}
              className="flex-1 px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <Button
              type="submit"
              disabled={sending || !input.trim()}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {sending ? "Sending..." : "Send"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
