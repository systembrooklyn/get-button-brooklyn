import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(req) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    const { message, chatbotId } = await req.json();

    if (!message || !chatbotId) {
      return Response.json({ error: "Missing data" }, { status: 400, headers });
    }

    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
    });

    if (!chatbot || !chatbot.isActive) {
      return Response.json(
        { error: "Chatbot inactive or not found" },
        { status: 403, headers }
      );
    }

    if (
      chatbot.messagesLimit &&
      chatbot.messageCount >= chatbot.messagesLimit
    ) {
      return Response.json(
        { error: "Message limit reached" },
        { status: 403, headers }
      );
    }

    const apiKey = process.env.GOOGLE_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "Missing API key" },
        { status: 500, headers }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction:
          chatbot.systemPrompt || "You are a helpful assistant.",
      },
    });

    const result = await chat.sendMessage({ message });
    const responseText = result.text.trim();

    await prisma.$transaction([
      prisma.chatMessage.create({
        data: { chatbotId, role: "user", content: message },
      }),
      prisma.chatMessage.create({
        data: { chatbotId, role: "assistant", content: responseText },
      }),
      prisma.chatbot.update({
        where: { id: chatbotId },
        data: { messageCount: { increment: 1 } },
      }),
    ]);

    return Response.json({ message: responseText }, { headers });
  } catch (err) {
    console.error("[Public Chat Error]", err);
    return Response.json({ error: "Server error" }, { status: 500, headers });
  }
}
