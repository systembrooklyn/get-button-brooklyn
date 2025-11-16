"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createChatbot } from "@/app/actions/chatbot-actions";

export default function CreateChatbotModal({
  isOpen,
  onClose,
  userId,
  onChatbotCreated,
}) {
  const [step, setStep] = useState("general");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    tagline: "",
    greetingMessage: "",
    systemPrompt: "",
    dataSourceUrl: "",
  });

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
      });
      console.log("[v0] Chatbot created successfully:", result);

      await new Promise((resolve) => setTimeout(resolve, 500));

      if (onChatbotCreated) {
        await onChatbotCreated();
      }

      onClose();
      setStep("general");
      setFormData({
        name: "",
        tagline: "",
        greetingMessage: "",
        systemPrompt: "",
        dataSourceUrl: "",
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
      <DialogContent className="max-w-2xl max-h-screen overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">
            Create New AI Chatbot
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Set up your chatbot's personality and data sources
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex gap-4 border-b border-border">
            <button
              onClick={() => setStep("general")}
              className={`pb-3 text-sm font-semibold transition-all ${
                step === "general"
                  ? "border-b-2 border-accent text-accent"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              General Info
            </button>
            <button
              onClick={() => setStep("datasources")}
              className={`pb-3 text-sm font-semibold transition-all ${
                step === "datasources"
                  ? "border-b-2 border-accent text-accent"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              disabled={!formData.name.trim()}
            >
              Data Sources
            </button>
            <button
              onClick={() => setStep("prompt")}
              className={`pb-3 text-sm font-semibold transition-all ${
                step === "prompt"
                  ? "border-b-2 border-accent text-accent"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              disabled={!formData.dataSourceUrl.trim()}
            >
              System Prompt
            </button>
          </div>

          {/* Step 1: General Info */}
          {step === "general" && (
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
                  className="input-field w-full"
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
                  className="input-field w-full"
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
                  className="input-field w-full resize-none"
                  rows="4"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.greetingMessage.length}/500 characters
                </p>
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
                  className="input-field w-full"
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
                  System Prompt <span className="text-destructive">*</span>
                </label>
                <textarea
                  name="systemPrompt"
                  value={formData.systemPrompt}
                  onChange={handleInputChange}
                  placeholder="Define your chatbot's personality and behavior. Example: You are a helpful customer service representative..."
                  className="input-field w-full resize-vertical"
                  rows="8"
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {formData.systemPrompt.length}/2000 characters
                </p>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <p className="text-sm text-foreground">
                  ⚠️ <strong>Note:</strong> Use simple, clear language for best
                  results.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Actions */}
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
              <Button onClick={handleNextStep} className="btn-accent px-6">
                Next Step
              </Button>
            ) : (
              <Button
                onClick={handleCreate}
                disabled={loading}
                className="btn-accent px-6"
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
