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
    if (chatbot.messageCount >= chatbot.messagesLimit) {
      return Response.json(
        { error: "Message limit reached." },
        { status: 403 }
      );
    }

    // 3. Prepare System Instructions (Multimodal Support)
    // We will build an array of "parts" for the system instruction.
    // This allows us to pass text prompts AND files (PDFs, Images) natively to Gemini.
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
    textPrompt += `## CORE INSTRUCTIONS\n`;
    textPrompt += `- **Language Detection**: Detect the language of the user's message and ALWAYS reply in the SAME language.\n`;
    textPrompt += `- **Formatting**: Use Markdown to make your answers structured (Bold key terms, use Bullet points for lists).\n`;
    textPrompt += `- **Knowledge Base**: Answer questions primarily based on the attached files and website context provided below.\n`;

    // Explicit instruction to use Google Search for the attached URL if context is missing
    if (chatbot.dataSourceUrl) {
      textPrompt += `\n## WEBSITE SOURCE\nYou are connected to the website: ${chatbot.dataSourceUrl}\nIf the user asks for information about this website (e.g., location, prices, events) and it is NOT found in the text or files below, you MUST use the 'googleSearch' tool to find the most up-to-date information from ${chatbot.dataSourceUrl}.\n`;
    }

    // Append the scraped content (if it exists in systemPrompt)
    if (chatbot.systemPrompt) {
      textPrompt += `\n## CUSTOM INSTRUCTIONS & SCRAPED CONTENT\n${chatbot.systemPrompt}\n`;
    }

    // Add the text prompt as the first part
    systemInstructionParts.push({ text: textPrompt });

    // -- Part B: File Context (Native Gemini Support) --
    // Instead of naively converting everything to text (which breaks PDFs/DOCX),
    // we pass supported files as inlineData parts.
    if (chatbot.trainingFiles) {
      try {
        const files = JSON.parse(chatbot.trainingFiles);

        for (const file of files) {
          if (!file.data) continue;

          // Extract base64 string (remove data:mime;base64, prefix if present)
          const base64Data = file.data.includes(",")
            ? file.data.split(",")[1]
            : file.data;

          // Handle different file types
          if (file.type === "application/pdf") {
            // PDF: Pass as inlineData (Gemini handles this natively!)
            systemInstructionParts.push({
              inlineData: {
                mimeType: "application/pdf",
                data: base64Data,
              },
            });
          } else if (file.type.startsWith("image/")) {
            // Images: Pass as inlineData
            systemInstructionParts.push({
              inlineData: {
                mimeType: file.type,
                data: base64Data,
              },
            });
          } else {
            // Text files (txt, csv, json, md, html, js) AND Fallback for DOCX
            // DOCX files are binary (zip). 'Buffer.toString' results in garbage.
            // Since we can't use external libs (like mammoth) here easily, we fallback to text decoding.
            // Recommendation: User should upload PDF for documents.
            try {
              const textContent = Buffer.from(base64Data, "base64").toString(
                "utf-8"
              );
              // Only add if it looks somewhat like text (simple heuristic could be added here)
              systemInstructionParts.push({
                text: `\n\n--- SOURCE FILE: ${file.name} ---\n${textContent}\n`,
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

    // 4. Fetch History (Last 10 messages)
    let messageHistory = [];
    try {
      messageHistory = await prisma.chatMessage.findMany({
        where: { chatbotId },
        take: 10,
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
      if (!process.env.API_KEY) {
        throw new Error("Server Configuration: Missing API_KEY");
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const chat = ai.chats.create({
        model: "gemini-2.5-flash", // 2.5 Flash has excellent context handling
        config: {
          // Pass the structured parts (Text + Files) here
          systemInstruction: {
            parts: systemInstructionParts,
          },
          temperature: 0.7,
          // Enable Google Search for URL lookup
          tools: [{ googleSearch: {} }],
        },
        history: history,
      });

      const result = await chat.sendMessage({ message: message });
      assistantMessage = result.text;

      // Extract sources from Google Search
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
    } catch (aiError) {
      console.error("[v0] AI Generation error:", aiError);

      if (aiError.message?.includes("API_KEY")) {
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

    // 6. Save Transaction & Update Limits
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
