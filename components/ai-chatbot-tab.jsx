"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MessageCircle, Edit2, Trash2, Play } from "lucide-react";
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

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">AI Chatbots</h2>
            <p className="text-muted-foreground text-sm">
              Create and manage your AI-powered chatbots
            </p>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-accent gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Chatbot
          </Button>
        </div>

        {chatbots.length > 0 ? (
          <div className="grid gap-4">
            {chatbots.map((chatbot) => (
              <Card key={chatbot.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                      <MessageCircle className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{chatbot.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {chatbot.tagline}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Messages: {chatbot.messageCount}/20
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setTestingChatbot(chatbot)}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Test
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedChatbotForEdit(chatbot);
                        setIsEditModalOpen(true);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <button
                      onClick={() => handleDeleteChatbot(chatbot.id)}
                      className="p-2 hover:bg-destructive/10 text-destructive rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <MessageCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No chatbots yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first AI chatbot to get started
            </p>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-accent gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Chatbot
            </Button>
          </Card>
        )}
      </div>

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
