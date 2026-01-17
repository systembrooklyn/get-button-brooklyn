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
        { status: 403, headers },
      );
    }

    if (
      chatbot.messagesLimit &&
      chatbot.messageCount >= chatbot.messagesLimit
    ) {
      return Response.json(
        { error: "Message limit reached" },
        { status: 403, headers },
      );
    }

    const apiKey = process.env.GOOGLE_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: "Missing API key" },
        { status: 500, headers },
      );
    }
    // 1️⃣ LOAD KNOWLEDGE SOURCES (FILES + WEB)
    const sources = await prisma.knowledgeSource.findMany({
      where: {
        chatbotId,
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const fileSources = sources.filter((s) => s.type === "file");
    const webSources = sources.filter((s) => s.type === "web");

    // 2️⃣ BUILD CONTEXT (FILES FIRST)
    let context = "";

    if (fileSources.length > 0) {
      context += "\n=== UPLOADED FILES (HIGHEST PRIORITY) ===\n";
      fileSources.slice(0, 10).forEach((s, i) => {
        context += `
--- FILE ${i + 1}: ${s.title} ---
${s.content}
---
`;
      });
    }

    if (webSources.length > 0) {
      context += "\n=== WEBSITE CONTENT ===\n";
      webSources.slice(0, 10).forEach((s, i) => {
        context += `
--- PAGE ${i + 1}: ${s.title} ---
URL: ${s.url}
${s.content}
---
`;
      });
    }

    if (!context) {
      context = "SYSTEM: No knowledge base content available.";
    }

    // 3️⃣ FINAL SYSTEM PROMPT
    const systemInstruction = `
You are ${chatbot.name || "AI Assistant"}.
${chatbot.systemPrompt || ""}

=== KNOWLEDGE BASE ===
${context}
=== END KNOWLEDGE BASE ===

RULES:
- Prefer uploaded FILES over websites
- Never hallucinate
- Say when info is missing
`;

    // 4️⃣ SEND TO GEMINI
    const ai = new GoogleGenAI({ apiKey });

    const chat = ai.chats.create({
      model: "gemini-2.5-flash-lite",
      config: {
        systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 1000,
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
