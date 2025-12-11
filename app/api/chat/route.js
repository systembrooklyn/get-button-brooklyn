import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";
import { scrapeWebsite } from "@/app/actions/scraper-actions";

// API KEY
const GOOGLE_API_KEY = "AIzaSyBhu7B__tg1uIltdDzOFmmDB1mh4EGoVGk";
const ADMIN_UID = "a1941b27-d783-45f0-bf73-f531a6394f02";

// Helper to extract URLs
function extractUrls(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

// Helper to get domain from URL
function getDomain(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch (e) {
    return "";
  }
}

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

    const isAdmin =
      (user && user.id === ADMIN_UID) ||
      (user && user.email === "test@test.com");
    const limit = chatbot.messagesLimit || 20;

    if (!isAdmin && chatbot.messageCount >= limit) {
      return Response.json(
        { error: "Message limit reached." },
        { status: 403 }
      );
    }

    // --- SYSTEM PROMPT CONSTRUCTION ---
    const systemParts = [];
    let activeDomain = "";

    // 1. Live Link Processing (Highest Priority)
    const liveUrls = extractUrls(message);
    let liveContentInstruction = "";

    if (liveUrls.length > 0) {
      const urlToScrape = liveUrls[0];
      activeDomain = getDomain(urlToScrape);

      const liveContent = await scrapeWebsite(urlToScrape);
      liveContentInstruction = `
\n=== 🚨 LIVE USER LINK DETECTED 🚨 ===
The user explicitly shared this link: ${urlToScrape}
Content:
${liveContent}

INSTRUCTION: 
- You MUST answer the user's question using ONLY the content above.
- Do NOT search for other companies. 
- You are discussing ${activeDomain}. If the content above is insufficient, check if 'googleSearch' can find info specifically for site:${activeDomain}.
- If you cannot find the info on ${activeDomain}, say "I couldn't find that information on the provided link."
`;
    }

    // 2. Base Persona
    let baseInstructions = `
You are ${chatbot.name || "an intelligent assistant"}.
Tagline: ${chatbot.tagline || "Here to help"}.
Personality: ${chatbot.personality || "Friendly"}.

STRICT RULES:
1. Answer using the provided KNOWLEDGE BASE, FILES, or LIVE LINK CONTENT.
2. If a specific website is discussed (e.g., ${
      activeDomain || chatbot.dataSourceUrl
    }), DO NOT provide information about DIFFERENT companies with similar names.
3. If you use Google Search, verify the URL matches the user's requested domain.
    `.trim();

    if (liveContentInstruction) {
      baseInstructions += liveContentInstruction;
    } else if (chatbot.systemPrompt) {
      // Only use static KB if no live link was provided to avoid confusion
      const kb =
        chatbot.systemPrompt.length > 30000
          ? chatbot.systemPrompt.substring(0, 30000) + "..."
          : chatbot.systemPrompt;
      baseInstructions += `\n\n=== KNOWLEDGE BASE ===\n${kb}`;
    }

    systemParts.push({ text: baseInstructions });

    // 3. File Attachments
    if (chatbot.trainingFiles) {
      try {
        const files = JSON.parse(chatbot.trainingFiles);
        for (const file of files) {
          if (!file.data) continue;
          const base64 = file.data.includes(",")
            ? file.data.split(",")[1]
            : file.data;
          if (file.type === "application/pdf") {
            systemParts.push({
              inlineData: { mimeType: "application/pdf", data: base64 },
            });
          } else if (file.type.startsWith("image/")) {
            systemParts.push({
              inlineData: { mimeType: file.type, data: base64 },
            });
          } else {
            try {
              const txt = Buffer.from(base64, "base64").toString("utf-8");
              systemParts.push({
                text: `\n=== FILE: ${file.name} ===\n${txt.substring(
                  0,
                  20000
                )}`,
              });
            } catch (e) {}
          }
        }
      } catch (e) {
        console.error("File parse error", e);
      }
    }

    // 4. History
    let history = [];
    try {
      const rawHistory = await prisma.chatMessage.findMany({
        where: { chatbotId },
        take: 6,
        orderBy: { createdAt: "desc" },
      });
      history = rawHistory.reverse().map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      }));
    } catch (e) {}

    // 5. Gemini Call
    const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });
    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: { parts: systemParts },
        temperature: 0.2, // Low temp for strict adherence
        tools: [{ googleSearch: {} }],
      },
      history: history,
    });

    const result = await chat.sendMessage({ message });
    let responseText = result.text;

    // Sources
    const chunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks?.length) {
      const links = chunks
        .map((c) =>
          c.web?.uri && c.web?.title ? `[${c.web.title}](${c.web.uri})` : null
        )
        .filter(Boolean);
      if (links.length)
        responseText += `\n\n**Sources:**\n${[...new Set(links)].join("\n")}`;
    }

    // 6. Save
    const ops = [
      prisma.chatMessage.create({
        data: { chatbotId, role: "user", content: message },
      }),
      prisma.chatMessage.create({
        data: { chatbotId, role: "assistant", content: responseText },
      }),
    ];

    if (!isAdmin) {
      ops.push(
        prisma.chatbot.update({
          where: { id: chatbotId },
          data: { messageCount: { increment: 1 } },
        })
      );
    }

    await prisma.$transaction(ops);

    return Response.json({ message: responseText });
  } catch (error) {
    console.error("[v0] Chat API Error:", error);
    if (error.status === 429) {
      return Response.json(
        { error: "System busy. Please retry." },
        { status: 429 }
      );
    }
    return Response.json(
      { error: "Failed to process message." },
      { status: 500 }
    );
  }
}
