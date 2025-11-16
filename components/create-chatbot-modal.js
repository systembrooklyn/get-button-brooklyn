"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createChatbot } from "@/app/actions/chatbot-actions";
import { Upload } from "lucide-react";

export default function CreateChatbotModal({
  isOpen,
  onClose,
  userId,
  onChatbotCreated,
}) {
  const [step, setStep] = useState("general");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    tagline: "",
    greetingMessage: "",
    systemPrompt: "",
    dataSourceUrl: "",
    avatar: "",
  });

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be smaller than 1MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result;
      setAvatarPreview(base64);
      setFormData((prev) => ({ ...prev, avatar: base64 }));
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNextStep = () => {
    if (step === "general") {
      if (!formData.name.trim()) {
        setError("Please enter a chatbot name");
        return;
      }
      if (!formData.tagline.trim()) {
        setError("Please enter a tagline");
        return;
      }
      if (!formData.greetingMessage.trim()) {
        setError("Please enter a greeting message");
        return;
      }
      setStep("datasources");
      setError("");
    } else if (step === "datasources") {
      if (!formData.dataSourceUrl.trim()) {
        setError("Please enter a data source URL");
        return;
      }
      setStep("prompt");
      setError("");
    }
  };

  const handleCreate = async () => {
    if (!formData.systemPrompt.trim()) {
      setError("Please enter a system prompt");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("[v0] Creating chatbot with data:", formData);
      const result = await createChatbot({
        name: formData.name,
        tagline: formData.tagline,
        greetingMessage: formData.greetingMessage,
        systemPrompt: formData.systemPrompt,
        dataSourceUrl: formData.dataSourceUrl,
        avatar: formData.avatar,
      });
      console.log("[v0] Chatbot created successfully:", result);

      await new Promise((resolve) => setTimeout(resolve, 500));

      if (onChatbotCreated) {
        await onChatbotCreated();
      }

      onClose();
      setStep("general");
      setAvatarPreview("");
      setFormData({
        name: "",
        tagline: "",
        greetingMessage: "",
        systemPrompt: "",
        dataSourceUrl: "",
        avatar: "",
      });
    } catch (err) {
      console.error("[v0] Error creating chatbot:", err);
      setError(err.message || "Failed to create chatbot");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-screen overflow-y-auto bg-card border-border rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">
            Create New AI Chatbot
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Set up your chatbot&apos;s personality and data sources
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Tab Navigation */}
          <div className="flex gap-4 border-b border-border overflow-x-auto">
            <button
              onClick={() => setStep("general")}
              className={`pb-3 text-sm font-semibold whitespace-nowrap transition-all ${
                step === "general"
                  ? "border-b-2 border-accent text-accent"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              GENERAL
            </button>
            <button
              onClick={() => setStep("datasources")}
              className={`pb-3 text-sm font-semibold whitespace-nowrap transition-all ${
                step === "datasources"
                  ? "border-b-2 border-accent text-accent"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              disabled={!formData.name.trim()}
            >
              DATA SOURCES
            </button>
            <button
              onClick={() => setStep("prompt")}
              className={`pb-3 text-sm font-semibold whitespace-nowrap transition-all ${
                step === "prompt"
                  ? "border-b-2 border-accent text-accent"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              disabled={!formData.dataSourceUrl.trim()}
            >
              CUSTOM INSTRUCTIONS
            </button>
          </div>

          {/* Step 1: General Info */}
          {step === "general" && (
            <div className="space-y-6">
              {/* Avatar Upload */}
              <div>
                <label className="text-sm font-semibold text-foreground block mb-4">
                  Bot Avatar
                </label>
                <div className="flex gap-6 items-start">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-24 h-24 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 border-2 border-dashed border-accent/50 flex items-center justify-center cursor-pointer hover:border-accent transition-all group"
                  >
                    {avatarPreview ? (
                      <img
                        src={avatarPreview || "/placeholder.svg"}
                        alt="Avatar preview"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <Upload className="w-6 h-6 text-accent/70 mx-auto mb-1 group-hover:text-accent" />
                        <p className="text-xs text-muted-foreground">Upload</p>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <p className="text-sm text-muted-foreground mb-2">
                      Click the avatar to upload an image
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Recommended: Square image, Max 1MB
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">
                    Chatbot Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Customer Support Bot"
                    className="w-full px-4 py-3 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    maxLength={50}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.name.length}/50 characters
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">
                    Tagline <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    name="tagline"
                    value={formData.tagline}
                    onChange={handleInputChange}
                    placeholder="e.g., Your friendly AI assistant"
                    className="w-full px-4 py-3 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Brief description of your chatbot
                  </p>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">
                    Greeting Message <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    name="greetingMessage"
                    value={formData.greetingMessage}
                    onChange={handleInputChange}
                    placeholder="e.g., Hello! I'm here to help you with any questions."
                    className="w-full px-4 py-3 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                    rows="4"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.greetingMessage.length}/500 characters
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Data Sources */}
          {step === "datasources" && (
            <div className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">
                  Website URL <span className="text-destructive">*</span>
                </label>
                <input
                  type="url"
                  name="dataSourceUrl"
                  value={formData.dataSourceUrl}
                  onChange={handleInputChange}
                  placeholder="https://yourwebsite.com"
                  className="w-full px-4 py-3 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  The AI will learn from your website content to provide
                  accurate answers.
                </p>
              </div>

              <div className="bg-accent/5 border border-accent/30 rounded-lg p-4">
                <p className="text-sm text-foreground">
                  💡 <strong>Tip:</strong> Provide a website with comprehensive
                  information for better chatbot responses.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: System Prompt */}
          {step === "prompt" && (
            <div className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">
                  Custom Chatbot Instructions{" "}
                  <span className="text-destructive">*</span>
                </label>
                <p className="text-xs text-muted-foreground mb-3">
                  For better understanding of the instructions by the AI
                  Chatbot, use simple text without complex symbols (emoji,
                  bullets, etc) 😊
                </p>
                <textarea
                  name="systemPrompt"
                  value={formData.systemPrompt}
                  onChange={handleInputChange}
                  placeholder="Define your chatbot's personality and behavior. Example: You are a helpful customer service representative..."
                  className="w-full px-4 py-3 border border-border rounded-lg text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent resize-vertical"
                  rows="8"
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {formData.systemPrompt.length}/2000 characters
                </p>
              </div>

              <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
                <p className="text-sm text-foreground">
                  <strong>Example prompt template:</strong>
                </p>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  1. If a customer provides a greeting or something unrelated to
                  our knowledge base, give a polite response and guide them
                  towards providing more information or asking a question we can
                  assist with.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="px-6"
            >
              Cancel
            </Button>
            {step !== "prompt" ? (
              <Button
                onClick={handleNextStep}
                className="px-6 bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                Next Step
              </Button>
            ) : (
              <Button
                onClick={handleCreate}
                disabled={loading}
                className="px-6 bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {loading ? "Creating Chatbot..." : "Create Chatbot"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
