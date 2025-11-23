"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, Check, Lock } from "lucide-react";

export default function BillingTab({ chatbots }) {
  // Aggregate usage across all chatbots
  const totalMessagesUsed = chatbots.reduce(
    (acc, curr) => acc + (curr.messageCount || 0),
    0
  );
  // Assuming a free tier limit of 100 messages total for simplicity or 20 per bot
  const totalLimit = 100;
  const progress = Math.min((totalMessagesUsed / totalLimit) * 100, 100);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Usage Card */}
        <Card className="p-8 border-2 border-border shadow-lg bg-card text-card-foreground">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg text-blue-600 dark:text-blue-300">
              <Zap className="w-5 h-5" />
            </span>
            Current Usage
          </h3>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm font-medium mb-2">
                <span>Monthly Messages</span>
                <span>
                  {totalMessagesUsed} / {totalLimit}
                </span>
              </div>
              <div className="w-full h-4 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    progress > 90 ? "bg-destructive" : "bg-green-500"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Resets on the 1st of every month
              </p>
            </div>

            <div className="p-4 bg-secondary/20 rounded-xl border border-border">
              <h4 className="font-semibold text-sm mb-2">Free Plan Limits</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" /> 3 Active Chatbots
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" /> Basic
                  Customization
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" /> Standard Support
                </li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Upgrade Card */}
        <Card className="p-8 border-2 border-accent/20 shadow-lg relative overflow-hidden bg-gradient-to-br from-card to-accent/5">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Zap className="w-40 h-40 text-accent" />
          </div>

          <div className="relative z-10">
            <h3 className="text-xl font-bold mb-2">Upgrade to Pro</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Unlock the full power of AI Chatbots
            </p>

            <div className="text-4xl font-bold mb-6">
              $19
              <span className="text-lg text-muted-foreground font-normal">
                /mo
              </span>
            </div>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2 text-sm font-medium">
                <span className="bg-green-100 text-green-600 rounded-full p-0.5">
                  <Check className="w-3 h-3" />
                </span>
                Unlimited Messages
              </li>
              <li className="flex items-center gap-2 text-sm font-medium">
                <span className="bg-green-100 text-green-600 rounded-full p-0.5">
                  <Check className="w-3 h-3" />
                </span>
                Unlimited Chatbots
              </li>
              <li className="flex items-center gap-2 text-sm font-medium">
                <span className="bg-green-100 text-green-600 rounded-full p-0.5">
                  <Check className="w-3 h-3" />
                </span>
                Remove Branding
              </li>
              <li className="flex items-center gap-2 text-sm font-medium">
                <span className="bg-green-100 text-green-600 rounded-full p-0.5">
                  <Check className="w-3 h-3" />
                </span>
                Priority Support
              </li>
            </ul>

            <Button className="w-full btn-accent py-6 text-lg shadow-xl">
              Upgrade Now
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
