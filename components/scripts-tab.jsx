"use client";

import { useState } from "react";
import { Code2, Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ScriptsTab({ chatbots }) {
  const [copiedId, setCopiedId] = useState(null);

  const generateEmbedScript = (chatbot) => {
    const embedUrl = `${window.location.origin}/api/chat/${chatbot.id}/embed`;
    const scriptCode = `<!-- GetButton Chatbot Widget -->
<script src="${embedUrl}" async></script>`;

    return scriptCode;
  };

  const handleCopy = async (chatbotId, script) => {
    try {
      await navigator.clipboard.writeText(script);
      setCopiedId(chatbotId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Embed Scripts</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Copy and paste these scripts into your website to add the chatbot
            widget.
          </p>
        </div>
      </div>

      {/* Scripts List */}
      {chatbots.length > 0 ? (
        <div className="space-y-4">
          {chatbots.map((chatbot) => {
            const script = generateEmbedScript(chatbot);
            const isCopied = copiedId === chatbot.id;

            return (
              <div
                key={chatbot.id}
                className="border border-border rounded-xl overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Chatbot Header */}
                <div className="flex items-center justify-between p-4 bg-muted/30 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm ring-2 ring-border"
                      style={{
                        backgroundColor: chatbot.color || "#2563eb",
                      }}
                    >
                      {chatbot.avatar ? (
                        <img
                          src={chatbot.avatar || "/placeholder.svg"}
                          alt=""
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <Code2 className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">
                        {chatbot.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {chatbot.tagline || "AI Assistant"}
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleCopy(chatbot.id, script)}
                    size="sm"
                    className="gap-2 font-semibold"
                    style={{
                      backgroundColor: isCopied
                        ? "#10b981"
                        : chatbot.color || "#2563eb",
                      color: "white",
                    }}
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Script
                      </>
                    )}
                  </Button>
                </div>

                {/* Code Block */}
                <div className="p-4 bg-muted/20">
                  <pre className="bg-background border border-border rounded-lg p-4 overflow-x-auto text-xs font-mono leading-relaxed text-foreground max-h-[300px] overflow-y-auto">
                    <code>{script}</code>
                  </pre>

                  {/* Instructions */}
                  <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <ExternalLink className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div className="text-xs text-foreground space-y-1">
                        <p className="font-semibold">How to use:</p>
                        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                          <li>Copy the script above</li>
                          <li>
                            Paste it before the closing &lt;/body&gt; tag in
                            your HTML
                          </li>
                          <li>
                            The floating chat widget will automatically appear
                            on your website
                          </li>
                          <li>
                            All chatbot settings and styling are loaded from
                            your configuration
                          </li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 px-6">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Code2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">
            No chatbots available
          </h3>
          <p className="text-muted-foreground text-sm text-center max-w-md">
            Create your first AI chatbot to generate an embeddable script for
            your website.
          </p>
        </div>
      )}
    </div>
  );
}
