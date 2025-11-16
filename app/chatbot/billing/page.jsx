"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Copy } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function BillingPage() {
  const [copied, setCopied] = useState(false);

  const embedScript = `<script src="https://yourchatbot.app/embed.js" data-chatbot-id="YOUR_CHATBOT_ID"></script>`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(embedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <Link href="/chatbot">
          <Button variant="outline" size="sm" className="gap-2 mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>

        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-4xl font-bold mb-2">Billing & Plans</h1>
            <p className="text-muted-foreground">
              Get started with our chatbot embedding service
            </p>
          </div>

          {/* Pricing Plan */}
          <div className="grid gap-6">
            <Card className="p-8 border-2 border-accent relative overflow-hidden">
              {/* Popular Badge */}
              <div className="absolute top-0 right-0 bg-accent text-accent-foreground px-4 py-1 text-sm font-semibold rounded-bl-lg">
                POPULAR
              </div>

              <div className="space-y-6 pt-4">
                {/* Plan Title */}
                <div>
                  <h2 className="text-3xl font-bold mb-2">Pro Plan</h2>
                  <p className="text-muted-foreground">
                    Embed your chatbot on your website with full customization
                    and analytics
                  </p>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold">$29</span>
                  <span className="text-muted-foreground">/month</span>
                </div>

                {/* Features */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-accent flex-shrink-0" />
                    <span className="text-foreground">
                      Unlimited message history
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-accent flex-shrink-0" />
                    <span className="text-foreground">
                      Embed script for your website
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-accent flex-shrink-0" />
                    <span className="text-foreground">
                      Analytics & conversation logs
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-accent flex-shrink-0" />
                    <span className="text-foreground">
                      Custom branding & styling
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-accent flex-shrink-0" />
                    <span className="text-foreground">
                      24/7 Priority support
                    </span>
                  </div>
                </div>

                {/* CTA Button */}
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90 h-12 text-base">
                  Subscribe Now
                </Button>
              </div>
            </Card>
          </div>

          {/* What You Get After Payment */}
          <Card className="p-8 bg-muted/50 border border-border">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">
                What You Get After Payment
              </h3>
              <p className="text-muted-foreground">
                Once you subscribe, you&apos;ll receive an embed script that you
                can add to any website to enable your AI chatbot. Simply copy
                the script below and paste it into your website&apos;s HTML
                before the closing {"</body>"} tag.
              </p>

              {/* Script Example */}
              <div className="space-y-2">
                <p className="text-sm font-semibold">Your Embed Script:</p>
                <div className="flex items-center gap-2 p-3 bg-background border border-border rounded-lg">
                  <code className="flex-1 text-xs text-foreground font-mono overflow-x-auto">
                    {embedScript}
                  </code>
                  <button
                    onClick={handleCopyScript}
                    className="p-2 hover:bg-muted rounded transition-colors flex-shrink-0"
                    title="Copy script"
                  >
                    <Copy
                      className={`w-4 h-4 ${
                        copied ? "text-accent" : "text-muted-foreground"
                      }`}
                    />
                  </button>
                </div>
                {copied && (
                  <p className="text-sm text-accent">Copied to clipboard!</p>
                )}
              </div>

              {/* Instructions */}
              <div className="mt-4 p-4 bg-background border border-border rounded-lg">
                <p className="text-sm font-semibold mb-2">How to install:</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Copy the embed script above</li>
                  <li>Go to your website&apos;s HTML code</li>
                  <li>Paste the script before the closing {"</body>"} tag</li>
                  <li>Replace YOUR_CHATBOT_ID with your chatbot&apos;s ID</li>
                  <li>Your chatbot will now appear on your website!</li>
                </ol>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
