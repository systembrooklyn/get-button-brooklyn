"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GetButtonTab from "@/components/get-button-tab";
import AIChatbotTab from "@/components/ai-chatbot-tab";
import BillingTab from "@/components/billing-tab";
import ChatLogsTab from "@/components/chat-logs-tab";
import { MessageCircle, LayoutGrid, CreditCard, History } from "lucide-react";

export default function ChatbotClientWrapper({
  initialChatbots,
  initialButtons,
  userId,
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card shadow-sm sticky top-0 z-30">
        <div className="container-minimal py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight mb-1">
                Chat Management
              </h1>
              <p className="text-muted-foreground text-sm">
                Manage your chat buttons, AI chatbots, and billing
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-minimal py-8">
        <Tabs defaultValue="ai-chatbot" className="w-full">
          <TabsList className="w-full flex flex-col sm:flex-row h-auto p-1 bg-muted/50 rounded-xl border border-border mb-8">
            <TabsTrigger
              value="ai-chatbot"
              className="flex-1 py-3 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md"
            >
              <MessageCircle className="w-4 h-4" /> AI Chatbots
            </TabsTrigger>
            <TabsTrigger
              value="get-button"
              className="flex-1 py-3 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md"
            >
              <LayoutGrid className="w-4 h-4" /> Floating Buttons
            </TabsTrigger>
            <TabsTrigger
              value="logs"
              className="flex-1 py-3 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md"
            >
              <History className="w-4 h-4" /> Chat Logs
            </TabsTrigger>
            <TabsTrigger
              value="billing"
              className="flex-1 py-3 gap-2 data-[state=active]:bg-background data-[state=active]:shadow-md"
            >
              <CreditCard className="w-4 h-4" /> Billing & Usage
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="ai-chatbot"
            className="mt-0 focus-visible:outline-none"
          >
            <AIChatbotTab initialChatbots={initialChatbots} userId={userId} />
          </TabsContent>

          <TabsContent
            value="get-button"
            className="mt-0 focus-visible:outline-none"
          >
            <GetButtonTab initialButtons={initialButtons} userId={userId} />
          </TabsContent>

          <TabsContent value="logs" className="mt-0 focus-visible:outline-none">
            <ChatLogsTab chatbots={initialChatbots} />
          </TabsContent>

          <TabsContent
            value="billing"
            className="mt-0 focus-visible:outline-none"
          >
            <BillingTab chatbots={initialChatbots} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
