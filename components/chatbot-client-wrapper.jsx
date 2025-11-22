"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GetButtonTab from "@/components/get-button-tab";
import AIChatbotTab from "@/components/ai-chatbot-tab";

export default function ChatbotClientWrapper({
  initialChatbots,
  initialButtons,
  userId,
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card">
        <div className="container-minimal py-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Chat Management
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage your chat buttons and AI chatbots
          </p>
        </div>
      </div>

      <div className="container-minimal py-8">
        <Tabs defaultValue="get-button" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
            <TabsTrigger value="get-button">Get Button</TabsTrigger>
            <TabsTrigger value="ai-chatbot">AI Chatbot</TabsTrigger>
          </TabsList>

          <TabsContent value="get-button" className="mt-0">
            <GetButtonTab initialButtons={initialButtons} userId={userId} />
          </TabsContent>

          <TabsContent value="ai-chatbot" className="mt-0">
            <AIChatbotTab initialChatbots={initialChatbots} userId={userId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
