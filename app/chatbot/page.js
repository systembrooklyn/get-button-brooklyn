import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getChatbotByUserId } from "@/app/actions/chatbot-actions";
import { getButtonsByUserId } from "@/app/actions/button-actions";
import ChatbotClientWrapper from "@/components/chatbot-client-wrapper";

const ADMIN_UID = "a1941b27-d783-45f0-bf73-f531a6394f02";

export default async function ChatbotPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  try {
    const chatbots = await getChatbotByUserId(user.id);
    const buttons = await getButtonsByUserId(user.id);

    const isAdmin = user.id === ADMIN_UID;

    const formattedChatbots = (chatbots || []).map((chatbot) => ({
      ...chatbot,
      messageCount: chatbot.messages ? chatbot.messages.length : 0,
      // CRITICAL: If admin, set limit to Infinity so the UI never blocks
      messagesLimit: isAdmin ? 999999999 : chatbot.messagesLimit || 20,
    }));

    return (
      <ChatbotClientWrapper
        initialChatbots={formattedChatbots}
        initialButtons={buttons || []}
        userId={user.id}
      />
    );
  } catch (error) {
    console.error("Error loading chatbot page:", error);
    // Return a fallback UI instead of crashing/redirecting home
    return (
      <div className="p-10 text-center text-red-500">
        <h2>Failed to load chatbot data.</h2>
        <p>Please refresh the page or try again later.</p>
      </div>
    );
  }
}
