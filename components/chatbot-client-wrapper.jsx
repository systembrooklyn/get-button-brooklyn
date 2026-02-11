"use client";

import { useState, useEffect } from "react";
import {
  MessageCircle,
  LayoutGrid,
  CreditCard,
  History,
  Menu,
  X,
  Zap,
  Code2,
  Pencil,
} from "lucide-react";
import AIChatbotTab from "@/components/ai-chatbot-tab";
import GetButtonTab from "@/components/get-button-tab";
import ChatLogsTab from "@/components/chat-logs-tab";
import BillingTab from "@/components/billing-tab";
import ScriptsTab from "@/components/scripts-tab";
import CorrectionsTab from "@/components/corrections-tab";

import { getChatbotByUserId } from "@/app/actions/chatbot-actions";

export default function ChatbotClientWrapper({
  initialChatbots,
  initialButtons,
  userId,
}) {
  // Initialize tab from localStorage if available, else default to "chatbots"
  const [activeTab, setActiveTab] = useState("chatbots");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatbots, setChatbots] = useState(initialChatbots);

  // Effect to load saved tab on mount
  useEffect(() => {
    const savedTab = localStorage.getItem("activeChatbotTab");
    if (savedTab) {
      setActiveTab(savedTab);
    }
    refreshChatbots();
  }, []);

  // Effect to save tab on change
  useEffect(() => {
    localStorage.setItem("activeChatbotTab", activeTab);
  }, [activeTab]);

  const refreshChatbots = async () => {
    try {
      const updatedChatbots = await getChatbotByUserId(userId);
      setChatbots(updatedChatbots);
    } catch (error) {
      console.error("Failed to refresh chatbots:", error);
    }
  };

  // const MESSAGES_PER_BOT = 20;
  // const totalLimit = Math.max(chatbots.length * MESSAGES_PER_BOT, 0);

  // Use the limit from DB (assuming all bots share the same limit)
  const MESSAGES_PER_BOT = chatbots[0]?.messagesLimit ?? 20;
  console.log("MESSAGES_PER_BOT", MESSAGES_PER_BOT);
  const totalLimit = Math.max(chatbots.length * MESSAGES_PER_BOT, 0);
  console.log("totalLimit", totalLimit);

  const totalMessagesUsed = chatbots.reduce(
    (acc, chatbot) => acc + (chatbot.messageCount || 0),
    0,
  );

  const messagesRemaining = Math.max(0, totalLimit - totalMessagesUsed);
  const usagePercentage =
    totalLimit > 0
      ? Math.min((totalMessagesUsed / totalLimit) * 100, 100)
      : totalMessagesUsed > 0
        ? 100
        : 0;

  const navItems = [
    { id: "chatbots", label: "AI Chatbots", icon: MessageCircle },
    { id: "buttons", label: "Floating Buttons", icon: LayoutGrid },
    { id: "scripts", label: "Embed Scripts", icon: Code2 },
    { id: "logs", label: "Chat Logs", icon: History },
    { id: "corrections", label: "Corrections", icon: Pencil },
    { id: "billing", label: "Billing & Usage", icon: CreditCard },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "chatbots":
        return (
          <AIChatbotTab
            chatbots={chatbots}
            userId={userId}
            onRefresh={refreshChatbots}
          />
        );
      case "buttons":
        return <GetButtonTab initialButtons={initialButtons} userId={userId} />;
      case "scripts":
        return <ScriptsTab chatbots={chatbots} />;
      case "logs":
        return <ChatLogsTab chatbots={chatbots} />;
      case "corrections":
        return (
          <CorrectionsTab
            chatbots={chatbots}
            userId={userId}
            onRefresh={refreshChatbots}
          />
        );
      case "billing":
        return <BillingTab chatbots={chatbots} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300">
      {/* Mobile Header */}
      <div className="md:hidden bg-card border-b border-border p-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-xl text-primary">
          <MessageCircle className="w-6 h-6" />
          <span>GetButton</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 hover:bg-muted rounded-md text-foreground"
        >
          {mobileMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      <div className="container-minimal mx-auto flex flex-col md:flex-row min-h-screen pt-4 md:pt-8 md:gap-8">
        {/* Sidebar */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-40 w-72 bg-card border-r border-border transition-transform duration-300 ease-in-out shadow-lg md:shadow-none
            md:static md:translate-x-0 md:bg-transparent md:border-r-0 md:w-64 md:flex-shrink-0
            ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          <div className="h-full flex flex-col p-4 md:p-0 overflow-y-auto">
            <div className="hidden md:flex items-center gap-2 font-bold text-2xl text-primary mb-8 px-2">
              <MessageCircle className="w-8 h-8" />
              <span>GetButton</span>
            </div>

            <nav className="flex-1 space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                    ${
                      activeTab === item.id
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }
                  `}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="mt-8 p-5 bg-card border border-border rounded-xl shadow-sm mb-[30%]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                  <span>Messages</span>
                </div>
                {totalLimit > 0 && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      usagePercentage >= 90
                        ? "bg-destructive/10 text-destructive border-destructive/20"
                        : "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                    }`}
                  >
                    {messagesRemaining} left
                  </span>
                )}
              </div>

              <div className="mb-2">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-2xl font-bold text-foreground">
                    {totalMessagesUsed}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    / {totalLimit} limit
                  </span>
                </div>
              </div>

              <div className="w-full bg-muted/50 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    usagePercentage >= 90 ? "bg-destructive" : "bg-primary"
                  }`}
                  style={{ width: `${usagePercentage}%` }}
                />
              </div>

              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                You get <strong>{MESSAGES_PER_BOT} messages</strong> for every
                chatbot you create.
              </p>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 pb-0 px-4 md:px-0">
          <div className="bg-card text-card-foreground border border-border rounded-xl shadow-sm min-h-[600px] p-6 animate-in fade-in duration-300">
            {renderContent()}
          </div>
        </main>
      </div>

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
