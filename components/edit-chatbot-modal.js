"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { updateChatbot, deleteChatbot } from "@/app/actions/chatbot-actions";
import { Trash2, Upload } from "lucide-react";

export default function EditChatbotModal({
  isOpen,
  onClose,
  chatbot,
  onChatbotUpdated,
}) {
  const [tab, setTab] = useState("general");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: chatbot?.name || "",
    tagline: chatbot?.tagline || "",
    language: "english",
    greetingMessage: chatbot?.greetingMessage || "",
    suggestedMessages: "",
    systemPrompt: chatbot?.systemPrompt || "",
    avatar: chatbot?.avatar || "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          avatar: reader.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateChatbot(chatbot.id, {
        name: formData.name,
        tagline: formData.tagline,
        greetingMessage: formData.greetingMessage,
        systemPrompt: formData.systemPrompt,
        avatar: formData.avatar,
      });
      if (onChatbotUpdated) {
        await onChatbotUpdated();
      }
      onClose();
      setError("");
    } catch (err) {
      setError(err.message || "Failed to save changes");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this chatbot? This action cannot be undone."
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      await deleteChatbot(chatbot.id);
      if (onChatbotUpdated) {
        await onChatbotUpdated();
      }
      onClose();
      setError("");
    } catch (err) {
      setError(err.message || "Failed to delete chatbot");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-screen overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">
            Edit Chatbot: {chatbot?.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Customize your chatbot's settings and behavior
          </p>
        </DialogHeader>

        {/* Tabs */}
        <div className="space-y-4">
          <div className="flex gap-2 border-b border-border overflow-x-auto">
            {["general", "avatar", "messages", "instructions"].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`pb-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  tab === t
                    ? "border-b-2 border-accent text-accent"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* General Tab */}
          {tab === "general" && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Chatbot Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Tagline
                </label>
                <input
                  type="text"
                  name="tagline"
                  value={formData.tagline}
                  onChange={handleInputChange}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Bot Language
                </label>
                <select
                  name="language"
                  value={formData.language}
                  onChange={handleInputChange}
                  className="input-field w-full"
                >
                  <option value="english">English</option>
                  <option value="spanish">Spanish</option>
                  <option value="french">French</option>
                  <option value="german">German</option>
                  <option value="arabic">Arabic</option>
                </select>
              </div>
            </div>
          )}

          {tab === "avatar" && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-3 block">
                  Chatbot Avatar
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-lg bg-accent/10 flex items-center justify-center overflow-hidden border border-border">
                    {formData.avatar ? (
                      <img
                        src={formData.avatar || "/placeholder.svg"}
                        alt="Avatar preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-accent text-2xl">🤖</div>
                    )}
                  </div>
                  <label className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg cursor-pointer hover:bg-muted transition-colors">
                    <Upload className="w-4 h-4" />
                    <span className="text-sm">Upload Avatar</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Recommended: Square image, at least 200x200px
                </p>
              </div>
            </div>
          )}

          {/* Messages Tab */}
          {tab === "messages" && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Greeting Message
                </label>
                <textarea
                  name="greetingMessage"
                  value={formData.greetingMessage}
                  onChange={handleInputChange}
                  rows="3"
                  className="input-field w-full resize-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Suggested Messages (one per line)
                </label>
                <textarea
                  name="suggestedMessages"
                  value={formData.suggestedMessages}
                  onChange={handleInputChange}
                  placeholder="How can I help?&#10;Tell me about your services&#10;Pricing information"
                  rows="4"
                  className="input-field w-full resize-none"
                />
              </div>
            </div>
          )}

          {/* Instructions Tab */}
          {tab === "instructions" && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  System Prompt
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Use simple text without complex symbols for best results.
                </p>
                <textarea
                  name="systemPrompt"
                  value={formData.systemPrompt}
                  onChange={handleInputChange}
                  rows="8"
                  placeholder="Define how your AI should behave..."
                  className="input-field w-full resize-none"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-between pt-4 border-t border-border">
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading || deleting}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading || deleting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading || deleting}
                className="btn-accent"
              >
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
