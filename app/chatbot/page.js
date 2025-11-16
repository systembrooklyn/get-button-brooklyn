import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getChatbotByUserId } from "@/app/actions/chatbot-actions";
import ChatbotClientWrapper from "@/components/chatbot-client-wrapper";

export default async function ChatbotPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const chatbots = await getChatbotByUserId(user.id);

  const formattedChatbots = (chatbots || []).map((chatbot) => ({
    ...chatbot,
    messageCount: chatbot.messages ? chatbot.messages.length : 0,
  }));

  return (
    <ChatbotClientWrapper
      initialChatbots={formattedChatbots}
      userId={user.id}
    />
  );
}
