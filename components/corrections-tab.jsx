"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, MessageSquare, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CorrectionsTab({ chatbots, userId }) {
  const [corrections, setCorrections] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCorrection, setEditingCorrection] = useState(null);

  const [selectedChatbotId, setSelectedChatbotId] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [correctedResponse, setCorrectedResponse] = useState("");

  // Fetch corrections on mount
  useEffect(() => {
    fetchCorrections();
  }, [userId]);

  async function fetchCorrections() {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/corrections?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setCorrections(data.corrections || []);
      }
    } catch (error) {
      console.error("Failed to fetch corrections:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function openCreateModal() {
    setEditingCorrection(null);
    setSelectedChatbotId("");
    setUserMessage("");
    setCorrectedResponse("");
    setIsModalOpen(true);
  }

  function openEditModal(correction) {
    setEditingCorrection(correction);
    setSelectedChatbotId(correction.chatbotId);
    setUserMessage(correction.userMessage);
    setCorrectedResponse(correction.correctedResponse);
    setIsModalOpen(true);
  }

  async function handleSave() {
    if (
      !selectedChatbotId ||
      !userMessage.trim() ||
      !correctedResponse.trim()
    ) {
      alert("Please fill in all fields");
      return;
    }

    setIsSaving(true);
    try {
      const method = editingCorrection ? "PUT" : "POST";
      const body = {
        chatbotId: selectedChatbotId,
        userMessage: userMessage.trim(),
        correctedResponse: correctedResponse.trim(),
      };

      if (editingCorrection) {
        body.id = editingCorrection.id;
      }

      const res = await fetch("/api/corrections", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await fetchCorrections();
        setIsModalOpen(false);
      } else {
        const error = await res.json();
        alert(error.message || "Failed to save correction");
      }
    } catch (error) {
      alert("Failed to save correction");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(correction) {
    if (!confirm("Are you sure you want to delete this correction?")) return;

    try {
      const res = await fetch(
        `/api/corrections?id=${correction.id}&chatbotId=${correction.chatbotId}`,
        {
          method: "DELETE",
        },
      );

      if (res.ok) {
        await fetchCorrections();
      }
    } catch (error) {
      alert("Failed to delete correction");
    }
  }

  // Group corrections by chatbot
  const correctionsByChatbot = corrections.reduce((acc, correction) => {
    const botId = correction.chatbotId;
    if (!acc[botId]) {
      acc[botId] = {
        chatbot: chatbots.find((c) => c.id === botId) || {
          name: "Unknown",
          color: "#6b7280",
        },
        items: [],
      };
    }
    acc[botId].items.push(correction);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Corrections</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Train your chatbots with custom response corrections.
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          className="btn-accent shadow-lg rounded-lg px-6 h-10 gap-2 font-semibold"
        >
          <Plus className="w-4 h-4" />
          Create Correction
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-foreground">
            {corrections.length}
          </div>
          <div className="text-sm text-muted-foreground">Total Corrections</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-foreground">
            {Object.keys(correctionsByChatbot).length}
          </div>
          <div className="text-sm text-muted-foreground">Chatbots Trained</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 hidden sm:block">
          <div className="text-2xl font-bold text-foreground">
            {chatbots.length}
          </div>
          <div className="text-sm text-muted-foreground">
            Available Chatbots
          </div>
        </div>
      </div>

      {/* Corrections List */}
      <div className="border border-border rounded-xl overflow-hidden bg-background shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">
            Loading corrections...
          </div>
        ) : corrections.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Pencil className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">
              No corrections yet
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              Create corrections to improve how your chatbots respond to
              specific messages.
            </p>
            <Button onClick={openCreateModal} className="btn-accent">
              Create Your First Correction
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {Object.entries(correctionsByChatbot).map(
              ([botId, { chatbot, items }]) => (
                <div key={botId} className="bg-card">
                  {/* Chatbot Header */}
                  <div className="px-6 py-3 bg-muted/30 flex items-center gap-3 border-b border-border">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                      style={{ backgroundColor: chatbot.color || "#2563eb" }}
                    >
                      <Bot className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-foreground">
                      {chatbot.name}
                    </span>
                    <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                      {items.length} correction{items.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Correction Items */}
                  {items.map((correction) => (
                    <div
                      key={correction.id}
                      className="px-6 py-4 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          {/* User Message */}
                          <div className="flex items-start gap-2">
                            <MessageSquare className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">
                                User Message
                              </div>
                              <p className="text-sm text-foreground">
                                {correction.userMessage}
                              </p>
                            </div>
                          </div>

                          {/* Corrected Response */}
                          <div className="flex items-start gap-2">
                            <Bot className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">
                                Corrected Response
                              </div>
                              <p className="text-sm text-foreground">
                                {correction.correctedResponse}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(correction)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(correction)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ),
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingCorrection ? "Edit Correction" : "Add Correction"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Chatbot Select */}
            <div className="space-y-2">
              <Label>Select AI Chatbot</Label>
              <Select
                value={selectedChatbotId}
                onValueChange={setSelectedChatbotId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="---" />
                </SelectTrigger>
                <SelectContent>
                  {chatbots.map((bot) => (
                    <SelectItem key={bot.id} value={bot.id}>
                      {bot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* User Message */}
            <div className="space-y-2">
              <Label>User Message</Label>
              <Textarea
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                placeholder="What the user might say..."
                rows={3}
              />
            </div>

            {/* Corrected Response */}
            <div className="space-y-2">
              <Label>Corrected Response</Label>
              <Textarea
                value={correctedResponse}
                onChange={(e) => setCorrectedResponse(e.target.value)}
                placeholder="How the bot should respond..."
                rows={4}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="btn-accent"
            >
              {isSaving ? "Saving..." : "Save correction"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
