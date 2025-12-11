import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { scrapeWebsite } from "@/app/actions/scraper-actions";

// API KEY
const GOOGLE_API_KEY = "AIzaSyBNb9Oh105c8xDVY069ZMgly_RtH86ydnw";
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

    // UNLIMITED ACCESS CHECK
    const isTestUser = user?.email === "test@test.com";
    const isAdmin = user?.id === ADMIN_UID || isTestUser;

    // Enforce limits only for non-admins
    if (!isAdmin && chatbot.messageCount >= (chatbot.messagesLimit || 20)) {
      return Response.json(
        { error: "Message limit reached." },
        { status: 403 }
      );
    }

    // --- SYSTEM PROMPT ---
    let systemInstructionText = `You are ${chatbot.name || "AI"}. ${
      chatbot.tagline || ""
    }. 
Personality: ${chatbot.personality || "Friendly"}.
Format: Markdown. Keep answers concise.`;

    // Knowledge Base
    if (chatbot.systemPrompt) {
      systemInstructionText += `\n\n=== KNOWLEDGE BASE ===\n${chatbot.systemPrompt.substring(
        0,
        5000
      )}`;
    }

    // Files (Text Only, Simple)
    if (chatbot.trainingFiles) {
      try {
        const files = JSON.parse(chatbot.trainingFiles);
        for (const file of files) {
          // Decode text-based files only, skip images to keep it lite
          if (file.data && !file.type.startsWith("image/")) {
            const base64 = file.data.includes(",")
              ? file.data.split(",")[1]
              : file.data;
            const txt = Buffer.from(base64, "base64").toString("utf-8");
            if (txt.trim()) {
              systemInstructionText += `\n\n--- FILE: ${
                file.name
              } ---\n${txt.substring(0, 5000)}\n`;
            }
          }
        }
      } catch (e) {
        console.error("File parse error", e);
      }
    }

    // SCRAPER INSTRUCTION (Critical for preventing hallucinations)
    if (chatbot.dataSourceUrl) {
      systemInstructionText += `
\n=== DATA SOURCE TOOL ===
You are connected to: ${chatbot.dataSourceUrl}
If the user asks for specific information (like prices, features, location, recent news) and it is NOT present in the knowledge base or files above:
Reply with EXACTLY: [[SCRAPE_DATASOURCE]]
Do not answer the question yet. Do not add any other text.
`;
    }

    // --- HISTORY ---
    let history = [];
    try {
      const rawHistory = await prisma.chatMessage.findMany({
        where: { chatbotId },
        take: 10,
        orderBy: { createdAt: "desc" },
      });

      // Convert to Gemini format
      const mappedHistory = rawHistory.reverse().map((msg) => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content.substring(0, 1000) }],
      }));

      // CRITICAL FIX: Remove leading model messages to prevent API crash
      while (mappedHistory.length > 0 && mappedHistory[0].role === "model") {
        mappedHistory.shift();
      }
      history = mappedHistory;
    } catch (e) {}

    // --- EXECUTION (SIMPLE & FAST) ---
    const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

    // USING ONLY FLASH LITE AS REQUESTED
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      systemInstruction: systemInstructionText,
    });

    const chat = model.startChat({
      history: history,
      generationConfig: {
        maxOutputTokens: 800,
        temperature: 0.7,
      },
    });

    let result = await chat.sendMessage(message);
    let responseText = result.response.text().trim();

    // --- CHECK FOR SCRAPE TRIGGER ---
    // If the model asks to scrape, we do it now, then send the content back to the model.
    if (
      responseText.includes("[[SCRAPE_DATASOURCE]]") &&
      chatbot.dataSourceUrl
    ) {
      console.log(
        `[v0] ⚡ Model requested scrape for: ${chatbot.dataSourceUrl}`
      );

      // 1. Scrape
      const scrapedData = await scrapeWebsite(chatbot.dataSourceUrl);

      // 2. Truncate (Optimize tokens: ~4000 chars is safe for Lite context)
      const safeContent = scrapedData ? scrapedData.substring(0, 4000) : "";

      if (!safeContent) {
        responseText =
          "I tried to check the website, but I couldn't access the content right now. Please check the URL.";
      } else {
        // 3. Feed back to model
        const followUpPrompt = `
[SYSTEM: REAL-TIME WEBSITE CONTENT]
${safeContent}

[INSTRUCTION]
Using ONLY the content above, answer the user's question: "${message}".
Be concise and direct.
`;
        const finalResult = await chat.sendMessage(followUpPrompt);
        responseText = finalResult.response.text();
      }
    }

    // --- SAVE ---
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
    console.error("Chat Error:", error);
    if (error.message?.includes("429")) {
      return Response.json(
        { error: "High traffic. Please try again in a moment." },
        { status: 429 }
      );
    }
    return Response.json(
      { error: "Failed to generate response." },
      { status: 500 }
    );
  }
}
