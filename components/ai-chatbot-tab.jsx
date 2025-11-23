"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  MessageCircle,
  Edit2,
  Trash2,
  Play,
  Lock,
  BarChart3,
} from "lucide-react";
import CreateChatbotModal from "@/components/create-chatbot-modal";
import EditChatbotModal from "@/components/edit-chatbot-modal";
import { FloatingChatWidget } from "@/components/floating-chat-widget";
import {
  getChatbotByUserId,
  deleteChatbot,
} from "@/app/actions/chatbot-actions";

export default function AIChatbotTab({ initialChatbots, userId }) {
  const [chatbots, setChatbots] = useState(initialChatbots);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedChatbotForEdit, setSelectedChatbotForEdit] = useState(null);
  const [testingChatbot, setTestingChatbot] = useState(null);

  const handleDeleteChatbot = async (chatbotId) => {
    if (!confirm("Are you sure you want to delete this chatbot?")) return;

    try {
      await deleteChatbot(chatbotId);
      setChatbots(chatbots.filter((c) => c.id !== chatbotId));
    } catch (error) {
      alert(error.message || "Failed to delete chatbot");
    }
  };

  const handleChatbotCreated = async () => {
    try {
      const updatedChatbots = await getChatbotByUserId(userId);
      const formatted = (updatedChatbots || []).map((chatbot) => ({
        ...chatbot,
        messageCount: chatbot.messages ? chatbot.messages.length : 0,
      }));
      setChatbots(formatted);
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error("[v0] Error refreshing chatbots:", error);
    }
  };

  const handleChatbotUpdated = async () => {
    await handleChatbotCreated();
    setIsEditModalOpen(false);
  };

  // Calculate total usage for the summary box
  const totalMessagesUsed = chatbots.reduce(
    (acc, curr) => acc + (curr.messageCount || 0),
    0
  );
  const totalLimit = chatbots.reduce(
    (acc, curr) => acc + (curr.messagesLimit || 20),
    0
  );

  // Check if limit of 3 is reached
  const isLimitReached = chatbots.length >= 3;

  return (
    <>
      <div className="space-y-6 pb-20 relative animate-in fade-in">
        <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border shadow-sm">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-accent" />
              Your Chatbots
            </h2>
            <p className="text-sm text-muted-foreground">
              Manage and monitor your AI assistants
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isLimitReached && (
              <span className="text-xs text-destructive font-semibold bg-destructive/10 px-3 py-1.5 rounded-full border border-destructive/20 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Limit Reached (3/3)
              </span>
            )}
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-accent gap-2 shadow-lg"
              disabled={isLimitReached}
            >
              {isLimitReached ? (
                <Lock className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Create Chatbot
            </Button>
          </div>
        </div>

        {chatbots.length > 0 ? (
          <div className="grid gap-6">
            {chatbots.map((chatbot) => {
              const limit = chatbot.messagesLimit || 20;
              const count = chatbot.messageCount || 0;
              const percent = Math.min((count / limit) * 100, 100);

              return (
                <Card
                  key={chatbot.id}
                  className="overflow-hidden transition-all hover:shadow-xl border border-border bg-card text-card-foreground group"
                >
                  <div className="flex flex-col sm:flex-row">
                    {/* Color Strip */}
                    <div
                      className="w-full sm:w-2 h-2 sm:h-auto"
                      style={{ backgroundColor: chatbot.color || "#2563eb" }}
                    />

                    <div className="p-6 flex-1">
                      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-4">
                          <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-black/5"
                            style={{
                              backgroundColor: chatbot.color || "#2563eb",
                            }}
                          >
                            <MessageCircle className="w-8 h-8" />
                          </div>
                          <div>
                            <h3 className="font-bold text-xl text-foreground">
                              {chatbot.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {chatbot.tagline || "No tagline"}
                            </p>
                            <div className="flex gap-2 mt-2">
                              <span className="text-[10px] bg-secondary px-2 py-0.5 rounded border border-border font-mono uppercase">
                                {chatbot.botLanguage}
                              </span>
                              <span className="text-[10px] bg-secondary px-2 py-0.5 rounded border border-border font-medium capitalize">
                                {chatbot.personality}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons - Always visible now */}
                        <div className="flex items-center gap-2 self-end md:self-auto">
                          <Button
                            onClick={() => setTestingChatbot(chatbot)}
                            variant="outline"
                            size="sm"
                            className="gap-2 bg-background hover:bg-accent hover:text-white border-border"
                          >
                            <Play className="w-3.5 h-3.5" />
                            Test
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedChatbotForEdit(chatbot);
                              setIsEditModalOpen(true);
                            }}
                            variant="outline"
                            size="sm"
                            className="bg-background border-border"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <button
                            onClick={() => handleDeleteChatbot(chatbot.id)}
                            className="p-2.5 bg-background border border-border hover:bg-destructive/10 hover:border-destructive/30 text-destructive rounded-md transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Usage Progress Bar */}
                      <div className="mt-2 pt-4 border-t border-border">
                        <div className="flex justify-between items-end mb-2">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs font-semibold text-muted-foreground">
                              Messages Used
                            </span>
                          </div>
                          <span
                            className={`text-xs font-bold ${
                              percent >= 90
                                ? "text-destructive"
                                : "text-foreground"
                            }`}
                          >
                            {count}{" "}
                            <span className="text-muted-foreground font-normal">
                              / {limit}
                            </span>
                          </span>
                        </div>
                        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              percent >= 90 ? "bg-destructive" : "bg-primary"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-16 text-center border-dashed border-2 bg-muted/5">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageCircle className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">No chatbots created yet</h3>
            <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
              Create your first AI chatbot to engage visitors and answer
              questions automatically.
            </p>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-accent gap-2 px-8"
            >
              <Plus className="w-4 h-4" />
              Create Your First Chatbot
            </Button>
          </Card>
        )}
      </div>

      {/* Fixed Bottom Left Usage Summary */}
      {chatbots.length > 0 && (
        <div className="hidden lg:block fixed bottom-6 left-6 z-40 bg-card/95 backdrop-blur-md border border-border p-4 rounded-xl shadow-2xl w-64 animate-in slide-in-from-left-6">
          <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
            Total Account Usage
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between text-xs text-muted-foreground font-medium">
              <span>Total Messages</span>
              <span className="text-foreground">
                {totalMessagesUsed} / {totalLimit}
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700 ease-out"
                style={{
                  width: `${Math.min(
                    (totalMessagesUsed / totalLimit) * 100,
                    100
                  )}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground font-medium pt-2 border-t border-border">
              <span>Active Bots</span>
              <span className="text-foreground">{chatbots.length} / 3</span>
            </div>
          </div>
        </div>
      )}

      <CreateChatbotModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        userId={userId}
        onChatbotCreated={handleChatbotCreated}
      />

      <EditChatbotModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        chatbot={selectedChatbotForEdit}
        onChatbotUpdated={handleChatbotUpdated}
      />

      {testingChatbot && (
        <FloatingChatWidget
          chatbot={testingChatbot}
          onClose={() => setTestingChatbot(null)}
        />
      )}
    </>
  );
}
