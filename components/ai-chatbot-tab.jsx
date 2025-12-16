"use client";

import React, { useState } from "react";
import {
  Plus,
  MessageCircle,
  MoreVertical,
  Play,
  Settings,
  Trash2,
  FileText,
  Globe,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CreateChatbotModal from "@/components/create-chatbot-modal";
import EditChatbotModal from "@/components/edit-chatbot-modal";
import UpgradeModal from "@/components/upgrade-modal"; // Import the new modal
import { FloatingChatWidget } from "@/components/floating-chat-widget";
import { deleteChatbot } from "@/app/actions/chatbot-actions";

export default function AIChatbotTab({ chatbots, userId, onRefresh }) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false); // State for upgrade modal
  const [selectedChatbotForEdit, setSelectedChatbotForEdit] = useState(null);

  // Store ID instead of object so it updates when parent chatbots array updates
  const [testingChatbotId, setTestingChatbotId] = useState(null);

  // Derived state for the active test bot
  const testingChatbot = testingChatbotId
    ? chatbots.find((c) => c.id === testingChatbotId)
    : null;

  const MAX_CHATBOTS = 3;

  const handleCreateClick = () => {
    if (chatbots.length >= MAX_CHATBOTS) {
      setIsUpgradeModalOpen(true);
    } else {
      setIsCreateModalOpen(true);
    }
  };

  const handleDeleteChatbot = async (chatbotId) => {
    if (!confirm("Are you sure you want to delete this chatbot?")) return;
    try {
      await deleteChatbot(chatbotId);
      if (onRefresh) onRefresh();
    } catch (error) {
      alert(error.message || "Failed to delete chatbot");
    }
  };

  const handleChatbotCreated = async () => {
    if (onRefresh) await onRefresh();
    setIsCreateModalOpen(false);
  };

  const handleChatbotUpdated = async () => {
    if (onRefresh) await onRefresh();
    setIsEditModalOpen(false);
  };

  // Helper to display clean Data Source info
  const renderDataSources = (bot) => {
    const sources = [];

    // Check for Website Source (either via knowledgeSources or legacy field)
    const hasWeb =
      bot.knowledgeSources?.some((ks) => ks.type === "web") ||
      bot.dataSourceUrl;
    if (hasWeb) sources.push({ type: "url", label: "Website" });

    // Check for File Sources
    // Now we rely on knowledgeSources count for accuracy
    const fileCount =
      bot.knowledgeSources?.filter((ks) => ks.type === "file").length || 0;

    if (fileCount > 0) {
      sources.push({
        type: "file",
        label: `${fileCount} File${fileCount > 1 ? "s" : ""}`,
      });
    } else if (bot.trainingFiles && bot.trainingFiles !== "[]") {
      // Legacy fallback (rare now)
      try {
        const files = JSON.parse(bot.trainingFiles);
        if (Array.isArray(files) && files.length > 0) {
          sources.push({
            type: "file",
            label: `${files.length} File${files.length > 1 ? "s" : ""}`,
          });
        }
      } catch (e) {}
    }

    if (sources.length === 0)
      return (
        <span className="text-muted-foreground italic text-xs">No sources</span>
      );

    return (
      <div className="flex gap-2">
        {sources.map((s, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1 text-xs bg-secondary/50 px-2 py-1 rounded-md text-foreground border border-border"
          >
            {s.type === "url" ? (
              <Globe className="w-3 h-3 text-blue-500" />
            ) : (
              <FileText className="w-3 h-3 text-orange-500" />
            )}
            {s.label}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
        <div>
          <h2 className="text-2xl font-bold text-foreground">AI Chatbots</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Create, manage and monitor your AI assistants.
          </p>
        </div>
        <Button
          onClick={handleCreateClick}
          className={`shadow-lg rounded-lg px-6 h-10 gap-2 font-semibold ${
            chatbots.length >= MAX_CHATBOTS
              ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              : "btn-accent shadow-accent/20"
          }`}
        >
          {chatbots.length >= MAX_CHATBOTS ? (
            <Lock className="w-4 h-4" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {chatbots.length >= MAX_CHATBOTS ? "Limit Reached" : "Create Chatbot"}
        </Button>
      </div>

      {/* Table Section */}
      <div className="border border-border rounded-xl overflow-hidden bg-background shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                  Name
                </th>
                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                  Usage
                </th>
                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                  Status
                </th>
                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                  Data Sources
                </th>
                <th className="px-6 py-4 font-semibold text-muted-foreground uppercase tracking-wider text-[11px] text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {chatbots.length > 0 ? (
                chatbots.map((chatbot) => {
                  const count = chatbot.messageCount || 0;
                  const limit = chatbot.messagesLimit || 20;
                  const isFull = count >= limit;

                  return (
                    <tr
                      key={chatbot.id}
                      className="hover:bg-muted/40 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm ring-2 ring-border"
                            style={{
                              backgroundColor: chatbot.color || "#2563eb",
                            }}
                          >
                            {chatbot.avatar ? (
                              <img
                                src={chatbot.avatar}
                                alt=""
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              <MessageCircle className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground text-sm">
                              {chatbot.name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {chatbot.tagline || "AI Assistant"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            isFull
                              ? "bg-destructive/10 text-destructive border-destructive/20"
                              : "bg-secondary text-secondary-foreground border-border"
                          }`}
                        >
                          {count} / {limit} Used
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2 w-2">
                            <span
                              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                                isFull ? "bg-amber-400" : "bg-green-400"
                              }`}
                            ></span>
                            <span
                              className={`relative inline-flex rounded-full h-2 w-2 ${
                                isFull ? "bg-amber-500" : "bg-green-500"
                              }`}
                            ></span>
                          </span>
                          <span
                            className={`text-xs font-medium ${
                              isFull
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-green-600 dark:text-green-400"
                            }`}
                          >
                            {isFull ? "Limit Reached" : "Active"}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {renderDataSources(chatbot)}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTestingChatbotId(chatbot.id)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-accent hover:bg-accent/10 rounded-full"
                            title="Test Chatbot"
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedChatbotForEdit(chatbot);
                              setIsEditModalOpen(true);
                            }}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
                            title="Edit Settings"
                          >
                            <Settings className="w-4 h-4" />
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                                onClick={() => handleDeleteChatbot(chatbot.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                                Chatbot
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                        <MessageCircle className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-1">
                        No chatbots created yet
                      </h3>
                      <p className="text-muted-foreground text-sm mb-6 text-center">
                        Create your first AI assistant to start engaging with
                        your visitors automatically.
                      </p>
                      <Button
                        onClick={handleCreateClick}
                        className="btn-accent"
                      >
                        Create Your First Chatbot
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
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

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />

      {testingChatbot && (
        <FloatingChatWidget
          key={testingChatbot.id}
          chatbot={testingChatbot}
          onClose={() => setTestingChatbotId(null)}
          // Removed onMessageSent={onRefresh} to avoid loop
        />
      )}
    </div>
  );
}
