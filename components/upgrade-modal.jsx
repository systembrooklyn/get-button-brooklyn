"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles } from "lucide-react";

export default function UpgradeModal({ isOpen, onClose }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border rounded-2xl shadow-2xl">
        <DialogHeader className="text-center pt-6">
          <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4 ring-8 ring-amber-50 dark:ring-amber-900/10">
            <Crown className="w-8 h-8 text-amber-500 fill-amber-500" />
          </div>
          <DialogTitle className="text-2xl font-bold text-foreground">
            Limit Reached
          </DialogTitle>
          <DialogDescription className="text-center pt-2 text-base">
            You have reached the maximum limit of{" "}
            <span className="font-bold text-foreground">3 chatbots</span> on
            your current plan.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-secondary/50 p-4 rounded-xl border border-border my-2">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            Upgrade to Pro to unlock:
          </h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              Unlimited AI Chatbots
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              Increased message limits
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              Advanced analytics
            </li>
          </ul>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2 pb-2">
          <Button
            className="w-full btn-accent font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 border-0"
            onClick={onClose}
          >
            Upgrade Plan
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
