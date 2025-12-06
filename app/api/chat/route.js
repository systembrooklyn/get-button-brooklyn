import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";

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

    // 2. Check Limits (Strict Check)
    // If usage is equal or greater than limit, block request
    if (chatbot.messageCount >= chatbot.messagesLimit) {
      return Response.json(
        { error: "Message limit reached." },
        { status: 403 } // 403 triggers the Limit Modal in frontend
      );
    }

    // 3. Prepare Personality Instruction
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

    // 4. Build Knowledge Base / File Context
    let fileContext = "";
    let trainingData = [];
    try {
      trainingData = chatbot.trainingFiles
        ? JSON.parse(chatbot.trainingFiles)
        : [];
    } catch (e) {
      console.error("Error parsing training files:", e);
    }

    // Gemini handles large context well
    const MAX_FILE_CONTEXT = 50000;

    for (const file of trainingData) {
      if (file.data && fileContext.length < MAX_FILE_CONTEXT) {
        try {
          const content = file.data.includes(",")
            ? file.data.split(",")[1]
            : file.data;
          const text = Buffer.from(content, "base64").toString("utf-8");
          const cleanText = text.replace(
            /[^\x20-\x7E\n\r\t\u00A0-\uFFFF]/g,
            " "
          );

          if (cleanText.length > 50) {
            fileContext += `\n\n--- SOURCE DOCUMENT: ${
              file.name
            } ---\n${cleanText.substring(0, 15000)}\n`;
          }
        } catch (e) {
          console.warn("Failed to process file context for", file.name);
        }
      }
    }

    // 5. Construct the System Prompt
    const currentSystemPrompt = `
You are ${chatbot.name}, ${chatbot.tagline || "an intelligent AI assistant"}.

## YOUR PERSONALITY
${personalityInstruction}

## CORE INSTRUCTIONS
- **Language Detection**: Detect the language of the user's message and ALWAYS reply in the SAME language.
- **Formatting**: Use Markdown to make your answers structured (Bold key terms, use Bullet points for lists).
- **Knowledge Base & Search**: Use the context below OR Google Search to answer questions. If the answer cannot be found in either, politely say you don't have that information.

## CUSTOM INSTRUCTIONS
${chatbot.systemPrompt || ""}

${fileContext ? `## KNOWLEDGE BASE CONTEXT\n${fileContext}` : ""}
`;

    // 6. Fetch History (Last 10 messages for context)
    let messageHistory = [];
    try {
      messageHistory = await prisma.chatMessage.findMany({
        where: {
          chatbotId,
        },
        take: 10,
        orderBy: { createdAt: "desc" },
      });
    } catch (dbError) {
      console.error("[v0] Error fetching message history:", dbError);
    }

    // Map DB history to Gemini format (user/model)
    const history = messageHistory.reverse().map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    // 7. Call LLM (Google Gemini)
    let assistantMessage;
    try {
      // Explicitly check for API Key to avoid confusing "default credentials" errors
      if (!process.env.API_KEY) {
        console.error(
          "CRITICAL ERROR: API_KEY is missing in environment variables."
        );
        throw new Error("Server Configuration: Missing API_KEY");
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const chat = ai.chats.create({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: currentSystemPrompt,
          temperature: 0.7,
          // Enable Google Search so the bot can "extract data from links"
          tools: [{ googleSearch: {} }],
        },
        history: history,
      });

      const result = await chat.sendMessage({ message: message });
      assistantMessage = result.text;

      // Extract and append sources from Google Search Grounding if available
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

        // Deduplicate sources
        const uniqueSources = [...new Set(sources)];

        if (uniqueSources.length > 0) {
          assistantMessage +=
            "\n\n**Sources:**\n" +
            uniqueSources.map((s) => `- ${s}`).join("\n");
        }
      }
    } catch (aiError) {
      console.error("[v0] AI Generation error:", aiError);

      if (
        aiError.message.includes("API_KEY") ||
        aiError.message.includes("default credentials")
      ) {
        return Response.json(
          { error: "Configuration Error: API Key missing or invalid." },
          { status: 500 }
        );
      }

      return Response.json(
        { error: "Failed to process request." },
        { status: 500 }
      );
    }

    // 8. Save Transaction & Update Limits
    await prisma.$transaction([
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
      prisma.chatbot.update({
        where: { id: chatbotId },
        data: { messageCount: { increment: 1 } },
      }),
    ]);

    return Response.json({
      message: assistantMessage,
    });
  } catch (error) {
    console.error("[v0] Uncaught Chat API error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
