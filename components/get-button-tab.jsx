"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FaWhatsapp,
  FaFacebookMessenger,
  FaViber,
  FaTelegram,
  FaSnapchatGhost,
} from "react-icons/fa";
import { MdEmail } from "react-icons/md";
import {
  createButton,
  getButtonsByUserId,
  deleteButton,
} from "@/app/actions/button-actions";
import { Trash2 } from "lucide-react";
import FloatingButton from "@/components/floating-button";

const PLATFORMS = [
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: FaWhatsapp,
    color: "#25D366",
    placeholder: "+1 (800) 123-45-67",
  },
  {
    id: "messenger",
    name: "Messenger",
    icon: FaFacebookMessenger,
    color: "#0084FF",
    placeholder: "Your Facebook Page ID",
  },
  {
    id: "viber",
    name: "Viber",
    icon: FaViber,
    color: "#665CAC",
    placeholder: "+1 (800) 123-45-67",
  },
  {
    id: "telegram",
    name: "Telegram",
    icon: FaTelegram,
    color: "#0088cc",
    placeholder: "@yourusername",
  },
  {
    id: "snapchat",
    name: "Snapchat",
    icon: FaSnapchatGhost,
    color: "#FFFC00",
    placeholder: "Your Snapchat username",
  },
  {
    id: "email",
    name: "Email",
    icon: MdEmail,
    color: "#EA4335",
    placeholder: "your@email.com",
  },
];

export default function GetButtonTab({ initialButtons, userId }) {
  const [buttons, setButtons] = useState(initialButtons);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreateButton = async () => {
    if (!selectedPlatform || !contact.trim()) {
      setError("Please select a platform and enter contact information");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await createButton({
        platform: selectedPlatform.id,
        contact: contact.trim(),
      });
      const updated = await getButtonsByUserId(userId);
      setButtons(updated);
      setSelectedPlatform(null);
      setContact("");
    } catch (err) {
      setError(err.message || "Failed to create button");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteButton = async (buttonId) => {
    if (!confirm("Are you sure you want to delete this button?")) return;

    try {
      await deleteButton(buttonId);
      setButtons(buttons.filter((b) => b.id !== buttonId));
    } catch (err) {
      alert(err.message || "Failed to delete button");
    }
  };

  return (
    <div className="space-y-8">
      <Card className="p-8">
        <h2 className="text-2xl font-bold mb-6">Choose Your Platform</h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4  mb-8">
          {PLATFORMS.map((platform) => {
            const Icon = platform.icon;
            const isSelected = selectedPlatform?.id === platform.id;
            return (
              <button
                key={platform.id}
                onClick={() => setSelectedPlatform(platform)}
                className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${
                  isSelected
                    ? "border-accent bg-accent/10 scale-105"
                    : "border-border hover:border-accent/50 hover:bg-accent/5"
                }`}
              >
                <Icon
                  className="w-12 h-12"
                  style={{
                    color: isSelected ? platform.color : "currentColor",
                  }}
                />
                <span className="text-sm font-medium">{platform.name}</span>
              </button>
            );
          })}
        </div>

        {selectedPlatform && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
            <div>
              <label className="text-sm font-semibold text-foreground block mb-2">
                Enter {selectedPlatform.name} Contact
              </label>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder={selectedPlatform.placeholder}
                className="w-full px-4 py-3 border border-border rounded-xl text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button
              onClick={handleCreateButton}
              disabled={loading}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {loading ? "Creating..." : "Create Button"}
            </Button>
          </div>
        )}
      </Card>

      {buttons.length > 0 && (
        <Card className="p-8">
          <h2 className="text-2xl font-bold mb-6">Active Buttons</h2>
          <div className="space-y-4">
            {buttons.map((button) => {
              const platform = PLATFORMS.find((p) => p.id === button.platform);
              const Icon = platform?.icon;
              return (
                <div
                  key={button.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    {Icon && (
                      <Icon
                        className="w-8 h-8"
                        style={{ color: platform.color }}
                      />
                    )}
                    <div>
                      <p className="font-semibold">{platform?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {button.contact}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteButton(button.id)}
                    className="p-2 hover:bg-destructive/10 text-destructive rounded transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Render the buttons with an index for stacking */}
      {buttons.map((button, index) => {
        const platform = PLATFORMS.find((p) => p.id === button.platform);
        return (
          <FloatingButton key={button.id} button={button} platform={platform} index={index} />
        );
      })}
    </div>
  );
}