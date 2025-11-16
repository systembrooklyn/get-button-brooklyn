"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  MessageCircle,
  Trash2,
  Settings,
  History,
  BarChart3,
  ShoppingCart,
  Edit2,
  Play,
} from "lucide-react";
import CreateChatbotModal from "@/components/create-chatbot-modal";
import EditChatbotModal from "@/components/edit-chatbot-modal";
import {
  getChatbotByUserId,
  deleteChatbot,
} from "@/app/actions/chatbot-actions";

export default function ChatbotClientWrapper({ initialChatbots, userId }) {
  const [chatbots, setChatbots] = useState(initialChatbots);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedChatbotForEdit, setSelectedChatbotForEdit] = useState(null);
  const [selectedTab, setSelectedTab] = useState("chatbots");
  const router = useRouter();

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

  const handleTestChatbot = (chatbotId) => {
    router.push(`/chatbot/test?botId=${chatbotId}`);
  };

  const handleChatbotUpdated = async () => {
    await handleChatbotCreated();
    setIsEditModalOpen(false);
  };

  const navigationItems = [
    { id: "chatbots", label: "Chatbots", icon: MessageCircle },
    { id: "history", label: "Chatlogs", icon: History },
    { id: "corrections", label: "Corrections", icon: Settings },
    { id: "billing", label: "Billing", icon: ShoppingCart },
  ];

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Navigation */}
        <nav className="flex-1 p-6 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                  selectedTab === item.id
                    ? "bg-blue-50 text-blue-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Messages Remaining Card */}
        <div className="p-6 border-t border-gray-200">
          <div className="p-4 bg-white border-2 border-blue-300 rounded-lg">
            <h3 className="text-xs font-semibold text-gray-700 mb-3">
              Messages Remaining
            </h3>
            <div className="mb-3">
              <p className="text-3xl font-bold text-blue-600">
                {messagesRemaining}
              </p>
              <p className="text-xs text-gray-600">of {totalMessagesLimit}</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{
                  width: `${
                    totalMessagesLimit > 0
                      ? (totalMessagesUsed / totalMessagesLimit) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
            <button className="text-blue-600 text-xs font-medium hover:underline">
              Manage
            </button>
          </div>
        </div>

        {/* Footer Links */}
        <div className="p-6 border-t border-gray-200 space-y-2 text-xs text-gray-600">
          <p className="hover:text-gray-900 cursor-pointer">Knowledge base</p>
          <p className="hover:text-gray-900 cursor-pointer">Contact Us</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Page Content */}
        <div className="p-8">
          <div className="max-w-6xl mx-auto">
            {/* Chatbots Tab */}
            {selectedTab === "chatbots" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    AI chatbots
                  </h2>
                  <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    disabled={chatbots.length >= 2}
                    className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="w-4 h-4" />
                    Create Chatbot
                  </Button>
                </div>

                {chatbots.length > 0 ? (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                            Chatlogs
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                            Data Sources
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {chatbots.map((chatbot) => (
                          <tr
                            key={chatbot.id}
                            className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                  <MessageCircle className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900">
                                    {chatbot.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {chatbot.tagline}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">
                              {chatbot.messageCount || 0}
                            </td>
                            <td className="px-6 py-4">
                              <a
                                href="#"
                                className="text-blue-600 text-sm hover:underline"
                              >
                                1 URLs
                              </a>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <Button
                                  onClick={() => handleTestChatbot(chatbot.id)}
                                  variant="outline"
                                  size="sm"
                                  className="text-xs border-gray-300 gap-1"
                                >
                                  <Play className="w-3 h-3" />
                                  Test
                                </Button>
                                <Button
                                  onClick={() => handleOpenEditModal(chatbot)}
                                  variant="outline"
                                  size="sm"
                                  className="text-xs border-gray-300"
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleDeleteChatbot(chatbot.id)
                                  }
                                  className="text-gray-400 hover:text-red-600 p-1 h-auto w-auto"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Card className="p-12 text-center bg-gray-50 border-gray-200">
                    <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      No chatbots yet
                    </h2>
                    <p className="text-gray-600 mb-6">
                      Create your first AI chatbot to get started. You can
                      create up to 2 chatbots per account.
                    </p>
                    <Button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Plus className="w-4 h-4" />
                      Create Your First Chatbot
                    </Button>
                  </Card>
                )}
              </div>
            )}

            {/* Chatlogs Tab */}
            {selectedTab === "history" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Chatlogs
                </h2>
                {chatbots.length > 0 ? (
                  <div className="space-y-4">
                    {chatbots.map((chatbot) => (
                      <Card key={chatbot.id} className="p-6 border-gray-200">
                        <h3 className="text-lg font-bold mb-4 text-gray-900">
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
                                      ? "bg-blue-100 text-blue-900"
                                      : "bg-gray-100 text-gray-900"
                                  }`}
                                >
                                  {msg.content}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-gray-500 text-center py-8">
                              No messages yet
                            </p>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-12 text-center bg-gray-50 border-gray-200">
                    <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-gray-900">
                      No chat history
                    </h2>
                  </Card>
                )}
              </div>
            )}

            {/* Corrections Tab */}
            {selectedTab === "corrections" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Corrections
                </h2>
                <Card className="p-12 text-center bg-gray-50 border-gray-200">
                  <Settings className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Coming soon
                  </h2>
                </Card>
              </div>
            )}

            {/* Billing Tab */}
            {selectedTab === "billing" && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Billing
                </h2>
                <Card className="p-12 text-center bg-gray-50 border-gray-200">
                  <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Coming soon
                  </h2>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
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
    </div>
  );
}
