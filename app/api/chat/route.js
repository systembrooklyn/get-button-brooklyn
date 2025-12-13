import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";

const ADMIN_UID = "a1941b27-d783-45f0-bf73-f531a6394f02";

export async function POST(req) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await req.json();
    const { message, chatbotId } = body;

    if (!message || !chatbotId)
      return Response.json({ error: "Missing data" }, { status: 400 });

    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
    });
    if (!chatbot)
      return Response.json({ error: "Chatbot not found" }, { status: 404 });

    // Limit Check
    const isTestUser = user?.email === "test@test.com";
    const isAdmin = user?.id === ADMIN_UID || isTestUser;

    if (!isAdmin) {
      const count = await prisma.chatMessage.count({ where: { chatbotId } });
      if (count >= (chatbot.messagesLimit || 20)) {
        return Response.json(
          { error: "Message limit reached." },
          { status: 403 }
        );
      }
    }

    const apiKey = process.env.API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error("[v0] API Key not found");
      return Response.json(
        { error: "Server Configuration Error" },
        { status: 500 }
      );
    }

    const allSources = await prisma.knowledgeSource.findMany({
      where: {
        chatbotId,
        isActive: true,
        // Exclude error/failed crawl sources
        title: {
          notIn: ["Crawl Failed", "Crawl Error"],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20, // Reduced from 25 for better performance
    });

    console.log(
      `[v0] Chatbot ${chatbotId}: Found ${allSources.length} valid knowledge sources`
    );

    let contextData = "";

    if (allSources.length > 0) {
      contextData = allSources
        .map((s, i) => {
          return `
=== SOURCE ${i + 1}: ${s.title} ===
Type: ${s.type}
URL: ${s.url}

${s.content}
---
`;
        })
        .join("\n\n");
    } else {
      console.warn("[v0] No valid knowledge sources found for chatbot");
      contextData = "SYSTEM: No knowledge base data is currently available.";
    }

    const systemInstruction = `You are ${chatbot.name || "AI Assistant"}. ${
      chatbot.tagline || ""
    }

Personality: ${chatbot.personality || "Friendly and helpful"}
Language: Respond in ${chatbot.botLanguage || "English"}

${chatbot.systemPrompt ? `Custom Instructions:\n${chatbot.systemPrompt}\n` : ""}

=== KNOWLEDGE BASE ===
${contextData}
=== END KNOWLEDGE BASE ===

CRITICAL RULES:
${
  allSources.length === 0
    ? `1. NO KNOWLEDGE BASE DATA IS AVAILABLE. You do not have access to any website content yet.
2. When asked about anything specific, respond: "I don't have that information in my knowledge base yet. Please contact us directly for assistance."
3. Be polite and apologetic about the limitation.
4. NEVER make up or guess information.`
    : `1. Answer questions ONLY using information from the Knowledge Base above.
2. If the specific information is not in the Knowledge Base, respond with: "I don't have that specific information in my knowledge base. Please contact us directly or visit ${
        chatbot.dataSourceUrl || "our website"
      } for more details."
3. Be concise, helpful, and conversational.
4. Use clear formatting for better readability.
5. NEVER make up information - only use what's provided in the Knowledge Base.
6. When information IS available, be confident and helpful in your response.`
}
`;

    const recentMessages = await prisma.chatMessage.findMany({
      where: { chatbotId },
      take: 8,
      orderBy: { createdAt: "desc" },
    });

    const history = recentMessages.reverse().map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content.substring(0, 1000) }],
    }));

    // Generate Response
    const ai = new GoogleGenAI({ apiKey });
    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      history: history,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    });

    const result = await chat.sendMessage({ message });
    const responseText = result.text.trim();

    // Save to DB
    await prisma.$transaction(
      [
        prisma.chatMessage.create({
          data: { chatbotId, role: "user", content: message },
        }),
        prisma.chatMessage.create({
          data: { chatbotId, role: "assistant", content: responseText },
        }),
        !isAdmin
          ? prisma.chatbot.update({
              where: { id: chatbotId },
              data: { messageCount: { increment: 1 } },
            })
          : null,
      ].filter(Boolean)
    );

    return Response.json({ message: responseText });
  } catch (error) {
    console.error("[v0] Chat Error:", error);
    return Response.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
