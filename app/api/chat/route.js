import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";

const ADMIN_UID = "a1941b27-d783-45f0-bf73-f531a6394f02";

export async function OPTIONS(request) {
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
    console.log("[v0] Chat API called");

    const body = await req.json();
    const { message, chatbotId } = body;

    console.log("[v0] Request data:", {
      message: message?.substring(0, 50),
      chatbotId,
    });

    if (!message || !chatbotId) {
      return Response.json({ error: "Missing data" }, { status: 400, headers });
    }

    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
    });

    if (!chatbot) {
      return Response.json(
        { error: "Chatbot not found" },
        { status: 404, headers },
      );
    }

    const origin = req.headers.get("origin");
    const referer = req.headers.get("referer");

    const appDomain =
      process.env.NEXT_PUBLIC_DOMAIN_NAME || "http://localhost:3000";

    // Check if request is from the dashboard (authenticated) or external site (embed)
    const isFromDashboard =
      origin?.includes(appDomain) || referer?.includes(appDomain);

    let isAdmin = false;

    // Only check auth for dashboard requests
    if (isFromDashboard) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const isTestUser = user?.email === "test@test.com";
      isAdmin = user?.id === ADMIN_UID || isTestUser;
    }

    // For dashboard requests, admins can bypass limits
    if (!isAdmin) {
      const count = await prisma.chatMessage.count({ where: { chatbotId } });
      if (count >= (chatbot.messagesLimit || 20)) {
        return Response.json(
          { error: "Message limit reached." },
          { status: 403, headers },
        );
      }
    }

    const apiKey = process.env.API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error("[v0] API Key not found");
      return Response.json(
        { error: "Server Configuration Error" },
        { status: 500, headers },
      );
    }

    const allSources = await prisma.knowledgeSource.findMany({
      where: {
        chatbotId,
        isActive: true,
        title: {
          notIn: ["Crawl Failed", "Crawl Error"],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    console.log(
      `[v0] Chatbot ${chatbotId}: Found ${allSources.length} valid knowledge sources`,
    );

    const webSources = allSources.filter((s) => s.type === "web");
    const fileSources = allSources.filter((s) => s.type === "file");

    let contextData = "";
    const sourceLinks = [];

    if (fileSources.length > 0) {
      contextData += "\n=== UPLOADED FILES (HIGH PRIORITY) ===\n";
      fileSources.slice(0, 10).forEach((s, i) => {
        contextData += `
--- FILE ${i + 1}: ${s.title} ---
${s.content}
---
`;
      });
    }

    if (webSources.length > 0) {
      contextData += "\n=== WEBSITE CONTENT (REFERENCE) ===\n";
      webSources.slice(0, 10).forEach((s, i) => {
        contextData += `
--- PAGE ${i + 1}: ${s.title} ---
URL: ${s.url}
${s.content}
---
`;
        if (s.url) {
          sourceLinks.push({
            title: s.title,
            url: s.url,
          });
        }
      });
    }

    if (!contextData) {
      console.warn("[v0] No valid knowledge sources found for chatbot");
      contextData = "SYSTEM: No knowledge base data is currently available.";
    }

    const systemInstruction = `You are ${chatbot.name || "AI Assistant"}. ${
      chatbot.tagline || ""
    }

Personality: ${chatbot.personality || "Friendly and helpful"}

${
  chatbot.systemPrompt
    ? `=== CUSTOM INSTRUCTIONS (HIGHEST PRIORITY) ===
${chatbot.systemPrompt}

CRITICAL: These custom instructions take precedence over ALL other information sources. If there's any conflict between custom instructions and other data sources, ALWAYS follow the custom instructions.
=== END CUSTOM INSTRUCTIONS ===

`
    : ""
}

=== KNOWLEDGE BASE ===
${contextData}
=== END KNOWLEDGE BASE ===

INFORMATION PRIORITY RULES:
${
  chatbot.systemPrompt
    ? `1. CUSTOM INSTRUCTIONS (above) = HIGHEST PRIORITY - Always follow these first
2. UPLOADED FILES = HIGH PRIORITY - Use file data when custom instructions don't specify
3. WEBSITE CONTENT = REFERENCE - Use only when files and custom instructions don't provide the answer`
    : `1. UPLOADED FILES = HIGH PRIORITY - Prioritize information from uploaded files
2. WEBSITE CONTENT = REFERENCE - Use website data when files don't provide the answer`
}

${
  allSources.length === 0
    ? `IMPORTANT: NO KNOWLEDGE BASE DATA IS AVAILABLE
- You do not have access to any website content or files yet
- When asked about anything specific, respond: "I don't have that information in my knowledge base yet. Please contact us directly for assistance."
- Be polite and apologetic about the limitation
- NEVER make up or guess information`
    : `RESPONSE RULES:
1. Answer questions using the priority order above
2. If conflicting information exists, use the higher priority source
3. If specific information is not in any source, respond: "I don't have that specific information in my knowledge base. Please contact us directly or visit ${
        chatbot.dataSourceUrl || "our website"
      } for more details."
4. Be concise, helpful, and conversational
5. Use clear formatting for better readability
6. NEVER make up information - only use what's provided
7. When information IS available, be confident and helpful in your response
8. IMPORTANT: When answering from website content, you MUST cite sources naturally in your response (e.g., "According to our [page name]..." or "As mentioned on our website...")

SOURCE CITATION RULES:
- When using information from WEBSITE CONTENT (not files or custom instructions), naturally reference the source page in your response
- Example: "According to our About page..." or "As mentioned in our Services section..."
- This helps users know where to find more detailed information on the website`
}
`;

    const recentMessages = await prisma.chatMessage.findMany({
      where: { chatbotId },
      take: 6,
      orderBy: { createdAt: "desc" },
    });

    const history = recentMessages.reverse().map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content.substring(0, 800) }],
    }));

    const ai = new GoogleGenAI({ apiKey });
    const chat = ai.chats.create({
      model: "gemini-2.5-flash-lite",
      history: history,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    });

    const result = await chat.sendMessage({ message });
    const responseText = result.text.trim();

    const relevantSources = [];

    if (
      webSources.length > 0 &&
      allSources.length > 0 &&
      responseText.length > 20
    ) {
      const questionKeywords = message
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3);

      let bestMatch = null;
      let highestScore = 0;

      webSources.forEach((source) => {
        const sourceContent = (
          source.title +
          " " +
          source.content
        ).toLowerCase();
        const score = questionKeywords.filter((keyword) =>
          sourceContent.includes(keyword),
        ).length;

        if (score > highestScore && source.url) {
          highestScore = score;
          bestMatch = source;
        }
      });

      if (bestMatch && highestScore > 0) {
        relevantSources.push({
          title: bestMatch.title,
          url: bestMatch.url,
        });
      }
    }

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
      ].filter(Boolean),
    );

    return Response.json(
      {
        message: responseText,
        sources: relevantSources.length > 0 ? relevantSources : undefined,
      },
      { headers },
    );
  } catch (error) {
    console.error("[v0] Chat Error:", error);
    return Response.json(
      { error: "Failed to process request", details: error.message },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
}
