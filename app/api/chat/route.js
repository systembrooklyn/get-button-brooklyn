import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";

// HARDCODED API KEY AS REQUESTED
const GOOGLE_API_KEY = "AIzaSyBNxeNUfQDc_IcuCThQUBw758ijII6py1M";
const ADMIN_UID = "a1941b27-d783-45f0-bf73-f531a6394f02"; // test@test.com

export async function POST(req) {
  try {
    const supabase = await createClient();

    // Authenticate user for security
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await req.json();
    const { message, chatbotId } = body;

    if (!message || !chatbotId) {
      return Response.json(
        { error: "Message and chatbotId required" },
        { status: 400 }
      );
    }

    // 1. Fetch Chatbot Data using Prisma
    let chatbot;
    try {
      chatbot = await prisma.chatbot.findUnique({
        where: { id: chatbotId },
      });
    } catch (dbError) {
      console.error("[v0] Database error fetching chatbot:", dbError);
      return Response.json(
        { error: "Failed to fetch chatbot configuration" },
        { status: 500 }
      );
    }

    if (!chatbot) {
      return Response.json({ error: "Chatbot not found" }, { status: 404 });
    }

    // 2. Check Limits (Bypass for Admin UID)
    const isAdmin = user && user.id === ADMIN_UID;

    if (!isAdmin && chatbot.messageCount >= chatbot.messagesLimit) {
      return Response.json(
        { error: "Message limit reached." },
        { status: 403 }
      );
    }

    // 3. Prepare System Instructions (With Strict Truncation)
    const systemInstructionParts = [];

    // -- Part A: Personality & Core Text Instructions --
    const personalityMap = {
      friendly:
        "You are a friendly, enthusiastic, and warm assistant. Use emojis occasionally and keep the tone welcoming.",
      professional:
        "You are a formal, corporate, and professional assistant. Maintain a polite and respectful tone at all times. Avoid slang.",
      direct:
        "You are a direct and concise assistant. Provide short, accurate answers without unnecessary fluff or pleasantries.",
      empathetic:
        "You are a caring and supportive assistant. Validate the user's feelings and provide empathetic responses.",
      humorous:
        "You are a witty and lighthearted assistant. Feel free to use appropriate humor and jokes while being helpful.",
    };

    const personalityInstruction =
      personalityMap[chatbot.personality] || personalityMap.friendly;

    let textPrompt = `You are ${chatbot.name}, ${
      chatbot.tagline || "an intelligent AI assistant"
    }.\n\n`;
    textPrompt += `## YOUR PERSONALITY\n${personalityInstruction}\n\n`;

    // --- DYNAMIC GROUNDING LOGIC (STRICT) ---
    textPrompt += `## CRITICAL SOURCE OF TRUTH RULES\n`;
    textPrompt += `1. **EXCLUSIVE SOURCE**: You must ONLY use information from the provided files and the specific website URL: ${
      chatbot.dataSourceUrl || "NONE"
    }.\n`;
    textPrompt += `2. **NO HALLUCINATIONS**: Do NOT use your internal training data to answer questions about specific company details (prices, address, phone) unless they are in the source.\n`;

    if (chatbot.dataSourceUrl) {
      textPrompt += `3. **STRICT IDENTITY**: You represent the entity at "${chatbot.dataSourceUrl}".\n`;
      textPrompt += `   - You are NOT associated with any other company, even if they share a similar name.\n`;
      textPrompt += `   - If a user asks for contact info, you must ONLY provide details found on ${chatbot.dataSourceUrl} or in the files.\n`;
    } else {
      textPrompt += `3. **IDENTITY**: You are a helpful assistant. Do not pretend to be any specific real-world company unless detailed in the files below.\n`;
    }

    textPrompt += `\n## CORE INSTRUCTIONS\n`;
    textPrompt += `- **Language**: Reply in the same language as the user.\n`;
    textPrompt += `- **Format**: Use Markdown. Be concise.\n`;

    // Explicit instruction to use Google Search
    if (chatbot.dataSourceUrl) {
      textPrompt += `\n## GOOGLE SEARCH INSTRUCTIONS\n`;
      textPrompt += `If information is missing from files, use 'googleSearch'.\n`;
      textPrompt += `**STRICT QUERY**: You MUST append "site:${chatbot.dataSourceUrl}" to every search query.\n`;
      textPrompt += `Example: "pricing site:${chatbot.dataSourceUrl}"\n`;
    }

    // Append Scraped Content (AGGRESSIVE TRUNCATION: Max 10,000 chars)
    if (chatbot.systemPrompt) {
      const MAX_SCRAPE_CHARS = 10000;
      let contentToAdd = chatbot.systemPrompt;

      if (contentToAdd.length > MAX_SCRAPE_CHARS) {
        contentToAdd =
          contentToAdd.substring(0, MAX_SCRAPE_CHARS) +
          "\n...[Content Truncated]";
      }

      textPrompt += `\n## SCRAPED WEBSITE CONTENT\n${contentToAdd}\n`;
    }

    // Add the text prompt
    systemInstructionParts.push({ text: textPrompt });

    // -- Part B: File Context (AGGRESSIVE TRUNCATION) --
    if (chatbot.trainingFiles) {
      try {
        const files = JSON.parse(chatbot.trainingFiles);

        // Limit total processed files
        const MAX_FILES = 2;
        const filesToProcess = files.slice(0, MAX_FILES);

        for (const file of filesToProcess) {
          if (!file.data) continue;

          // Extract base64
          const base64Data = file.data.includes(",")
            ? file.data.split(",")[1]
            : file.data;

          if (file.type === "application/pdf") {
            systemInstructionParts.push({
              inlineData: {
                mimeType: "application/pdf",
                data: base64Data,
              },
            });
          } else if (file.type.startsWith("image/")) {
            systemInstructionParts.push({
              inlineData: {
                mimeType: file.type,
                data: base64Data,
              },
            });
          } else {
            // Text fallback: Decode and TRUNCATE (Max 5,000 chars per file)
            try {
              let textContent = Buffer.from(base64Data, "base64").toString(
                "utf-8"
              );

              if (textContent.length > 5000) {
                textContent =
                  textContent.substring(0, 5000) + "\n...[File Truncated]";
              }

              systemInstructionParts.push({
                text: `\n\n--- FILE: ${file.name} ---\n${textContent}\n`,
              });
            } catch (e) {
              console.warn(`[v0] Failed to decode text for file: ${file.name}`);
            }
          }
        }
      } catch (e) {
        console.error("[v0] Error parsing training files:", e);
      }
    }

    // 4. Fetch History (Optimized: Last 2 messages only)
    let messageHistory = [];
    try {
      messageHistory = await prisma.chatMessage.findMany({
        where: { chatbotId },
        take: 2,
        orderBy: { createdAt: "desc" },
      });
    } catch (dbError) {
      console.error("[v0] Error fetching message history:", dbError);
    }

    const history = messageHistory.reverse().map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // 5. Call LLM (Google Gemini)
    let assistantMessage;
    try {
      const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });

      // SWITCHED TO LITE MODEL AS REQUESTED
      const chat = ai.chats.create({
        model: "gemini-flash-lite-latest",
        config: {
          systemInstruction: {
            parts: systemInstructionParts,
          },
          temperature: 0.3,
          tools: [{ googleSearch: {} }],
        },
        history: history,
      });

      // --- RETRY LOGIC (Simplified) ---
      // We rely on the lighter model to avoid hitting limits as often
      try {
        const result = await chat.sendMessage({ message: message });
        assistantMessage = result.text;

        // Extract sources
        const groundingChunks =
          result.candidates?.[0]?.groundingMetadata?.groundingChunks;

        if (groundingChunks && groundingChunks.length > 0) {
          const sources = groundingChunks
            .map((chunk) => {
              if (chunk.web?.uri && chunk.web?.title) {
                return `[${chunk.web.title}](${chunk.web.uri})`;
              }
              return null;
            })
            .filter(Boolean);

          const uniqueSources = [...new Set(sources)];

          if (uniqueSources.length > 0) {
            assistantMessage +=
              "\n\n**Sources:**\n" +
              uniqueSources.map((s) => `- ${s}`).join("\n");
          }
        }
      } catch (err) {
        console.warn(`[v0] Gemini API failed:`, err.status || err.message);

        if (err.status === 429 || err.status === 503) {
          return Response.json(
            { error: "Traffic is high. Please wait a moment." },
            { status: 429 }
          );
        }
        throw err;
      }
    } catch (aiError) {
      console.error("[v0] AI Generation error:", aiError);
      return Response.json(
        { error: "Failed to process request." },
        { status: 500 }
      );
    }

    // 6. Save Transaction
    const transactionOps = [
      prisma.chatMessage.create({
        data: {
          chatbotId,
          role: "user",
          content: message,
        },
      }),
      prisma.chatMessage.create({
        data: {
          chatbotId,
          role: "assistant",
          content: assistantMessage,
        },
      }),
    ];

    if (!isAdmin) {
      transactionOps.push(
        prisma.chatbot.update({
          where: { id: chatbotId },
          data: { messageCount: { increment: 1 } },
        })
      );
    }

    await prisma.$transaction(transactionOps);

    return Response.json({
      message: assistantMessage,
    });
  } catch (error) {
    console.error("[v0] Uncaught Chat API error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
