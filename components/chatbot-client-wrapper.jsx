"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  MessageCircle,
  Trash2,
  Settings,
  History,
  ShoppingCart,
  Edit2,
  Play,
  Check,
  Copy,
} from "lucide-react";
import CreateChatbotModal from "@/components/create-chatbot-modal";
import EditChatbotModal from "@/components/edit-chatbot-modal";
import { FloatingChatWidget } from "@/components/floating-chat-widget";
import {
  getChatbotByUserId,
  deleteChatbot,
} from "@/app/actions/chatbot-actions";

export default function ChatbotClientWrapper({ initialChatbots, userId }) {
  const [chatbots, setChatbots] = useState(initialChatbots);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedChatbotForEdit, setSelectedChatbotForEdit] = useState(null);
  const [testingChatbot, setTestingChatbot] = useState(null);
  const [selectedTab, setSelectedTab] = useState("chatbots");
  const [copied, setCopied] = useState(false);

  const totalMessagesUsed = chatbots.reduce(
    (sum, c) => sum + (c.messageCount || 0),
    0
  );
  const totalMessagesLimit = chatbots.length * 20;
  const messagesRemaining = Math.max(0, totalMessagesLimit - totalMessagesUsed);

  const handleDeleteChatbot = async (chatbotId) => {
    if (!confirm("Are you sure you want to delete this chatbot?")) return;

    try {
      await deleteChatbot(chatbotId);
      setChatbots(chatbots.filter((c) => c.id !== chatbotId));
    } catch (error) {
      console.error("[v0] Error deleting chatbot:", error);
      alert(error.message || "Failed to delete chatbot");
    }
  };

  const handleChatbotCreated = async () => {
    try {
      const updatedChatbots = await getChatbotByUserId(userId);
      const formatted = (updatedChatbots || []).map((chatbot) => ({
        ...chatbot,
        messageCount: chatbot.messages ? chatbot.messages.length : 0,
        messages: chatbot.messages || [],
      }));
      setChatbots(formatted);
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error("[v0] Error refreshing chatbots:", error);
    }
  };

  const handleOpenEditModal = (chatbot) => {
    setSelectedChatbotForEdit(chatbot);
    setIsEditModalOpen(true);
  };

  const handleTestChatbot = (chatbot) => {
    setTestingChatbot(chatbot);
  };

  const handleChatbotUpdated = async () => {
    await handleChatbotCreated();
    setIsEditModalOpen(false);
  };

  const handleCloseTestWidget = async () => {
    setTestingChatbot(null);
    try {
      const updatedChatbots = await getChatbotByUserId(userId);
      const formatted = (updatedChatbots || []).map((chatbot) => ({
        ...chatbot,
        messageCount: chatbot.messages ? chatbot.messages.length : 0,
        messages: chatbot.messages || [],
      }));
      setChatbots(formatted);
    } catch (error) {
      console.error("[v0] Error refreshing chatbots:", error);
    }
  };

  const handleCopyScript = () => {
    const embedScript = `<script src="https://yourchatbot.app/embed.js" data-chatbot-id="YOUR_CHATBOT_ID"></script>`;
    navigator.clipboard.writeText(embedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const navigationItems = [
    { id: "chatbots", label: "Chatbots", icon: MessageCircle },
    { id: "history", label: "Chatlogs", icon: History },
    { id: "billing", label: "Billing", icon: ShoppingCart },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <nav className="flex-1 p-6 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                  selectedTab === item.id
                    ? "bg-accent/10 text-accent font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-6 border-t border-border">
          <div className="p-4 bg-card border-2 border-accent rounded-lg space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Messages Remaining
            </h3>
            <div>
              <p className="text-3xl font-bold text-accent">
                {messagesRemaining}
              </p>
              <p className="text-xs text-muted-foreground">
                of {totalMessagesLimit}
              </p>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-accent h-2 rounded-full transition-all"
                style={{
                  width: `${
                    totalMessagesLimit > 0
                      ? (totalMessagesUsed / totalMessagesLimit) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
            <button className="text-accent text-xs font-semibold hover:underline">
              Upgrade Plan
            </button>
          </div>
        </div>

        <div className="p-6 border-t border-border space-y-2 text-xs text-muted-foreground">
          <p className="hover:text-foreground cursor-pointer transition-colors">
            Documentation
          </p>
          <p className="hover:text-foreground cursor-pointer transition-colors">
            Contact Support
          </p>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-background">
        <div className="border-b border-border bg-background">
          <div className="p-8">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">
                  {selectedTab === "billing"
                    ? "Billing & Plans"
                    : "AI Chatbots"}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {selectedTab === "billing"
                    ? "Get started with our chatbot embedding service"
                    : "Manage and test your AI chatbots"}
                </p>
              </div>
              {selectedTab === "chatbots" && (
                <Button
                  onClick={() => setIsCreateModalOpen(true)}
                  disabled={chatbots.length >= 2}
                  className="btn-accent gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Chatbot
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="max-w-6xl mx-auto">
            {selectedTab === "chatbots" && (
              <div>
                {chatbots.length > 0 ? (
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted border-b border-border">
                          <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Messages Used
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Data Sources
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {chatbots.map((chatbot) => (
                          <tr
                            key={chatbot.id}
                            className="hover:bg-muted/50 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                                  <MessageCircle className="w-5 h-5 text-accent" />
                                </div>
                                <div>
                                  <p className="font-semibold text-foreground">
                                    {chatbot.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {chatbot.tagline}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-foreground font-medium">
                                  {chatbot.messageCount || 0}
                                </span>
                                <span className="text-muted-foreground">
                                  /20
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-accent text-sm font-medium">
                                1 Website
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Button
                                  onClick={() => handleTestChatbot(chatbot)}
                                  variant="outline"
                                  size="sm"
                                  className="text-xs gap-1"
                                >
                                  <Play className="w-3 h-3" />
                                  Test
                                </Button>
                                <Button
                                  onClick={() => handleOpenEditModal(chatbot)}
                                  variant="outline"
                                  size="sm"
                                  className="text-xs"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                                <button
                                  onClick={() =>
                                    handleDeleteChatbot(chatbot.id)
                                  }
                                  className="p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Card className="p-12 text-center bg-card border-border">
                    <MessageCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-foreground mb-2">
                      No chatbots yet
                    </h2>
                    <p className="text-muted-foreground mb-6 max-w-xs mx-auto">
                      Create your first AI chatbot to get started. You can
                      create up to 2 chatbots per account.
                    </p>
                    <Button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="btn-accent gap-2 mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                      Create Your First Chatbot
                    </Button>
                  </Card>
                )}
              </div>
            )}

            {selectedTab === "history" && (
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  Chat History
                </h2>
                {chatbots.length > 0 ? (
                  <div className="space-y-4">
                    {chatbots.map((chatbot) => (
                      <Card
                        key={chatbot.id}
                        className="p-6 bg-card border-border"
                      >
                        <h3 className="text-lg font-semibold text-foreground mb-4">
                          {chatbot.name}
                        </h3>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {chatbot.messages && chatbot.messages.length > 0 ? (
                            chatbot.messages.map((msg, idx) => (
                              <div
                                key={idx}
                                className={`flex ${
                                  msg.role === "user"
                                    ? "justify-end"
                                    : "justify-start"
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
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">
                              No messages yet
                            </p>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-12 text-center bg-card border-border">
                    <History className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-foreground">
                      No chat history yet
                    </h2>
                  </Card>
                )}
              </div>
            )}

            {selectedTab === "billing" && (
              <div className="space-y-8">
                {/* Pricing Plan */}
                <div className="grid gap-6">
                  <Card className="p-8 border-2 border-accent relative overflow-hidden">
                    {/* Popular Badge */}
                    <div className="absolute top-0 right-0 bg-accent text-accent-foreground px-4 py-1 text-sm font-semibold rounded-bl-lg">
                      POPULAR
                    </div>

                    <div className="space-y-6 pt-4">
                      {/* Plan Title */}
                      <div>
                        <h2 className="text-3xl font-bold mb-2">Pro Plan</h2>
                        <p className="text-muted-foreground">
                          Embed your chatbot on your website with full
                          customization and analytics
                        </p>
                      </div>

                      {/* Price */}
                      <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-bold">$29</span>
                        <span className="text-muted-foreground">/month</span>
                      </div>

                      {/* Features */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Check className="w-5 h-5 text-accent flex-shrink-0" />
                          <span className="text-foreground">
                            Unlimited message history
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Check className="w-5 h-5 text-accent flex-shrink-0" />
                          <span className="text-foreground">
                            Embed script for your website
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Check className="w-5 h-5 text-accent flex-shrink-0" />
                          <span className="text-foreground">
                            Analytics & conversation logs
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Check className="w-5 h-5 text-accent flex-shrink-0" />
                          <span className="text-foreground">
                            Custom branding & styling
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Check className="w-5 h-5 text-accent flex-shrink-0" />
                          <span className="text-foreground">
                            24/7 Priority support
                          </span>
                        </div>
                      </div>

                      {/* CTA Button */}
                      <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-12 text-base">
                        Subscribe Now
                      </Button>
                    </div>
                  </Card>
                </div>

                {/* What You Get After Payment */}
                <Card className="p-8 bg-muted/50 border border-border">
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold">
                      What You Get After Payment
                    </h3>
                    <p className="text-muted-foreground">
                      Once you subscribe, you&apos;ll receive an embed script
                      that you can add to any website to enable your AI chatbot.
                      Simply copy the script below and paste it into your
                      website&apos;s HTML before the closing {"</body>"} tag.
                    </p>

                    {/* Script Example */}
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">
                        Your Embed Script:
                      </p>
                      <div className="flex items-center gap-2 p-3 bg-background border border-border rounded-lg">
                        <code className="flex-1 text-xs text-foreground font-mono overflow-x-auto">
                          {`<script src="https://yourchatbot.app/embed.js" data-chatbot-id="YOUR_CHATBOT_ID"></script>`}
                        </code>
                        <button
                          onClick={handleCopyScript}
                          className="p-2 hover:bg-muted rounded transition-colors flex-shrink-0"
                          title="Copy script"
                        >
                          <Copy
                            className={`w-4 h-4 ${
                              copied ? "text-accent" : "text-muted-foreground"
                            }`}
                          />
                        </button>
                      </div>
                      {copied && (
                        <p className="text-sm text-accent">
                          Copied to clipboard!
                        </p>
                      )}
                    </div>

                    {/* Instructions */}
                    <div className="mt-4 p-4 bg-background border border-border rounded-lg">
                      <p className="text-sm font-semibold mb-2">
                        How to install:
                      </p>
                      <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                        <li>Copy the embed script above</li>
                        <li>Go to your website&apos;s HTML code</li>
                        <li>
                          Paste the script before the closing {"</body>"} tag
                        </li>
                        <li>
                          Replace YOUR_CHATBOT_ID with your chatbot&apos;s ID
                        </li>
                        <li>Your chatbot will now appear on your website!</li>
                      </ol>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>

      <CreateChatbotModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        userId={userId}
        onChatbotCreated={handleChatbotCreated}
      />

      {selectedChatbotForEdit && (
        <EditChatbotModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedChatbotForEdit(null);
          }}
          chatbot={selectedChatbotForEdit}
          userId={userId}
          onChatbotUpdated={handleChatbotUpdated}
        />
      )}

      {testingChatbot && (
        <FloatingChatWidget
          chatbot={testingChatbot}
          onClose={handleCloseTestWidget}
        />
      )}
    </div>
  );
}
