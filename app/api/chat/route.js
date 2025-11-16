import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(req) {
  let supabase = null;

  try {
    supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { message, chatbotId } = body;

    if (!message || !chatbotId) {
      return Response.json(
        { error: "Message and chatbotId required" },
        { status: 400 }
      );
    }

    let chatbot;
    try {
      chatbot = await prisma.chatbot.findFirst({
        where: {
          id: chatbotId,
          userId: user.id,
        },
      });
    } catch (dbError) {
      console.error("[v0] Database error fetching chatbot:", dbError);
      return Response.json(
        { error: "Failed to fetch chatbot" },
        { status: 500 }
      );
    }

    if (!chatbot) {
      return Response.json({ error: "Chatbot not found" }, { status: 404 });
    }

    // Check message limit
    if (chatbot.messageCount >= chatbot.messagesLimit) {
      return Response.json(
        { error: "Message limit reached. Please upgrade to continue." },
        { status: 429 }
      );
    }

    let messageHistory = [];
    try {
      messageHistory = await prisma.chatMessage.findMany({
        where: { chatbotId },
        take: 10,
        orderBy: { createdAt: "desc" },
      });
    } catch (dbError) {
      console.error("[v0] Error fetching message history:", dbError);
      messageHistory = [];
    }

    // Format messages for API
    const conversationMessages = messageHistory.reverse().map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    conversationMessages.push({
      role: "user",
      content: message,
    });

    let assistantMessage;
    try {
      const apiResponse = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content: chatbot.systemPrompt,
              },
              ...conversationMessages,
            ],
            max_tokens: 1024,
            temperature: 0.7,
          }),
        }
      );

      if (!apiResponse.ok) {
        const error = await apiResponse.json();
        console.error("[v0] API error:", error);
        return Response.json(
          { error: "Failed to generate response" },
          { status: 500 }
        );
      }

      const apiData = await apiResponse.json();
      assistantMessage =
        apiData.choices[0]?.message?.content || "Unable to generate response.";
    } catch (aiError) {
      console.error("[v0] API error:", aiError);
      return Response.json(
        { error: "Failed to generate response" },
        { status: 500 }
      );
    }

    try {
      await prisma.chatMessage.create({
        data: {
          chatbotId,
          role: "user",
          content: message,
        },
      });
    } catch (dbError) {
      console.error("[v0] Error saving user message:", dbError);
    }

    try {
      await prisma.chatMessage.create({
        data: {
          chatbotId,
          role: "assistant",
          content: assistantMessage,
        },
      });
    } catch (dbError) {
      console.error("[v0] Error saving assistant message:", dbError);
    }

    try {
      await prisma.chatbot.update({
        where: { id: chatbotId },
        data: { messageCount: { increment: 2 } },
      });
    } catch (dbError) {
      console.error("[v0] Error updating message count:", dbError);
    }

    return Response.json({ message: assistantMessage });
  } catch (error) {
    console.error("[v0] Chat API error:", error);
    return Response.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}
