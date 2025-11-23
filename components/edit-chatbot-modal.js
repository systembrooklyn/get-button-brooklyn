"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { updateChatbot, deleteChatbot } from "@/app/actions/chatbot-actions";
import { Trash2, Upload, FileText, X, Sparkles } from "lucide-react";

export default function EditChatbotModal({
  isOpen,
  onClose,
  chatbot,
  onChatbotUpdated,
}) {
  const [step, setStep] = useState("general");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [avatarPreview, setAvatarPreview] = useState(chatbot?.avatar || "");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const trainingFileRef = useRef(null);

  const [formData, setFormData] = useState({
    name: chatbot?.name || "",
    tagline: chatbot?.tagline || "",
    botLanguage: chatbot?.botLanguage || "en",
    color: chatbot?.color || "#2563eb",
    personality: chatbot?.personality || "friendly",
    greetingMessage: chatbot?.greetingMessage || "",
    suggestedMessages: chatbot?.suggestedMessages || "",
    sendMessageText: chatbot?.sendMessageText || "Send",
    systemPrompt: chatbot?.systemPrompt || "",
    dataSourceUrl: chatbot?.dataSourceUrl || "",
    avatar: chatbot?.avatar || "",
    trainingFiles: chatbot?.trainingFiles || "",
  });

  const PERSONALITY_OPTIONS = [
    { id: "friendly", name: "Friendly", desc: "Warm, enthusiastic, uses emojis" },
    { id: "professional", name: "Professional", desc: "Formal, respectful, corporate" },
    { id: "direct", name: "Direct", desc: "Concise, straight to the point" },
    { id: "empathetic", name: "Empathetic", desc: "Caring, supportive, understanding" },
    { id: "humorous", name: "Humorous", desc: "Witty, fun, lighthearted" },
  ];

  useEffect(() => {
    if (chatbot) {
      setFormData({
        name: chatbot.name || "",
        tagline: chatbot.tagline || "",
        botLanguage: chatbot.botLanguage || "en",
        color: chatbot.color || "#2563eb",
        personality: chatbot.personality || "friendly",
        greetingMessage: chatbot.greetingMessage || "",
        suggestedMessages: chatbot.suggestedMessages || "",
        sendMessageText: chatbot.sendMessageText || "Send",
        systemPrompt: chatbot.systemPrompt || "",
        dataSourceUrl: chatbot.dataSourceUrl || "",
        avatar: chatbot.avatar || "",
        trainingFiles: chatbot.trainingFiles || "",
      });
      setAvatarPreview(chatbot.avatar || "");

      try {
        const files = chatbot.trainingFiles
          ? JSON.parse(chatbot.trainingFiles)
          : [];
        setUploadedFiles(files);
      } catch (e) {
        setUploadedFiles([]);
      }
    }
  }, [chatbot, isOpen]);

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be smaller than 2MB");
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

  const handleTrainingFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    const allowedTypes = [
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    const validFiles = [];
    const errors = [];

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        errors.push(`${file.name}: File too large (max 5MB)`);
        continue;
      }
      validFiles.push(file);
    }

    if (errors.length > 0) {
      setError(errors.join(", "));
      return;
    }

    const filePromises = validFiles.map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({
            name: file.name,
            type: file.type,
            size: file.size,
            data: reader.result,
          });
        };
        reader.readAsDataURL(file);
      });
    });

    const filesData = await Promise.all(filePromises);
    setUploadedFiles((prev) => [...prev, ...filesData]);
    setFormData((prev) => ({
      ...prev,
      trainingFiles: JSON.stringify([...uploadedFiles, ...filesData]),
    }));
    setError("");
  };

  const removeFile = (index) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    setFormData((prev) => ({
      ...prev,
      trainingFiles: JSON.stringify(newFiles),
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError("Please enter a chatbot name");
      return;
    }
    setLoading(true);
    setError("");

    try {
      await updateChatbot(chatbot.id, {
        name: formData.name,
        tagline: formData.tagline,
        botLanguage: formData.botLanguage,
        color: formData.color,
        personality: formData.personality,
        greetingMessage: formData.greetingMessage,
        suggestedMessages: formData.suggestedMessages,
        sendMessageText: formData.sendMessageText,
        systemPrompt: formData.systemPrompt,
        dataSourceUrl: formData.dataSourceUrl,
        avatar: formData.avatar,
        trainingFiles: formData.trainingFiles,
      });
      if (onChatbotUpdated) {
        await onChatbotUpdated();
      }
      onClose();
      setStep("general");
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
    } catch (err) {
      setError(err.message || "Failed to delete chatbot");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-card border-border rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">
            Edit AI Chatbot
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Tab Navigation */}
          <div className="flex gap-6 border-b border-border overflow-x-auto">
             {["general", "personality", "datasources", "prompt"].map((s) => (
                <button
                    key={s}
                    onClick={() => setStep(s)}
                    className={`pb-3 text-sm font-bold whitespace-nowrap transition-all uppercase ${
                        step === s
                        ? "border-b-2 border-accent text-accent"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    {s}
                </button>
            ))}
          </div>

          {/* Step 1: General Info */}
          {step === "general" && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row gap-6">
                 {/* Avatar Upload */}
                <div className="flex-shrink-0">
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-24 h-24 rounded-full border-2 border-dashed border-accent/50 flex items-center justify-center cursor-pointer hover:border-accent transition-all group overflow-hidden relative"
                    >
                        {avatarPreview ? (
                        <img
                            src={avatarPreview || "/placeholder.svg"}
                            alt="Avatar preview"
                            className="w-full h-full object-cover"
                        />
                        ) : (
                        <div className="text-center p-2">
                            <Upload className="w-6 h-6 text-accent/70 mx-auto mb-1 group-hover:text-accent" />
                            <p className="text-[10px] text-muted-foreground">Change</p>
                        </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleAvatarUpload}
                            accept="image/*"
                            className="hidden"
                        />
                    </div>
                </div>

                <div className="flex-1 space-y-4">
                    <div>
                        <label className="text-sm font-semibold text-foreground block mb-2">
                            Name
                        </label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-accent"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-foreground block mb-2">
                            Tagline
                        </label>
                        <input
                            type="text"
                            name="tagline"
                            value={formData.tagline}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-accent"
                        />
                    </div>
                </div>
              </div>

               <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">
                    Primary Color
                  </label>
                  <div className="flex items-center gap-3">
                      <input 
                        type="color" 
                        name="color"
                        value={formData.color}
                        onChange={handleInputChange}
                        className="h-10 w-20 p-1 bg-background border border-border rounded cursor-pointer"
                      />
                      <span className="text-sm font-mono text-muted-foreground">{formData.color}</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">
                    Bot Language
                  </label>
                  <select
                    name="botLanguage"
                    value={formData.botLanguage}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-accent"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="ar">Arabic</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                  </select>
                </div>
              </div>

              <div>
                  <label className="text-sm font-semibold text-foreground block mb-2">
                    Greeting Message
                  </label>
                  <textarea
                    name="greetingMessage"
                    value={formData.greetingMessage}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-accent resize-none"
                    rows="3"
                  />
              </div>
            </div>
          )}

           {/* Step 2: Personality */}
           {step === "personality" && (
              <div className="space-y-6 animate-in fade-in">
                  <div className="grid sm:grid-cols-2 gap-4">
                      {PERSONALITY_OPTIONS.map((option) => (
                          <div 
                            key={option.id}
                            onClick={() => setFormData(prev => ({ ...prev, personality: option.id }))}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                formData.personality === option.id 
                                ? "border-accent bg-accent/5" 
                                : "border-border hover:border-accent/50"
                            }`}
                          >
                              <div className="flex items-center gap-2 mb-1">
                                  <Sparkles className={`w-4 h-4 ${formData.personality === option.id ? "text-accent" : "text-muted-foreground"}`} />
                                  <h3 className="font-bold text-foreground">{option.name}</h3>
                              </div>
                              <p className="text-xs text-muted-foreground">{option.desc}</p>
                          </div>
                      ))}
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-foreground block mb-2">
                        Suggested Messages
                    </label>
                    <textarea
                        name="suggestedMessages"
                        value={formData.suggestedMessages}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-accent resize-none"
                        rows="4"
                    />
                  </div>
              </div>
          )}

          {/* Step 3: Data Sources */}
          {step === "datasources" && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">
                  Training Files
                </label>
                <div 
                    onClick={() => trainingFileRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-accent/5 hover:border-accent transition-colors cursor-pointer"
                >
                    <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium">Add more files</p>
                </div>

                <input
                  type="file"
                  ref={trainingFileRef}
                  onChange={handleTrainingFileUpload}
                  accept=".pdf,.txt,.docx,.csv,.xlsx"
                  multiple
                  className="hidden"
                />

                {uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-accent" />
                          <div>
                            <p className="text-sm font-medium text-foreground truncate max-w-[200px]">
                              {file.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {(file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="p-1 hover:bg-destructive/10 text-destructive rounded transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">
                  Website URL
                </label>
                <input
                  type="url"
                  name="dataSourceUrl"
                  value={formData.dataSourceUrl}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
          )}

          {/* Step 4: System Prompt */}
          {step === "prompt" && (
            <div className="space-y-5 animate-in fade-in">
              <div>
                <label className="text-sm font-semibold text-foreground block mb-2">
                  Custom Instructions
                </label>
                <textarea
                  name="systemPrompt"
                  value={formData.systemPrompt}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-border rounded-lg text-sm bg-background focus:ring-2 focus:ring-accent font-mono"
                  rows="10"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-between pt-6 border-t border-border">
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading || deleting}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading || deleting}
                className="px-6 bg-transparent"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading || deleting}
                className="px-6 btn-accent"
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