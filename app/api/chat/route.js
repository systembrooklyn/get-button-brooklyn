import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

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
    const trainingData = chatbot.trainingFiles
      ? JSON.parse(chatbot.trainingFiles)
      : [];

    const MAX_FILE_CONTEXT = 25000;

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
            } ---\n${cleanText.substring(0, 8000)}\n`;
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
- **Knowledge Base**: Use the context below to answer questions. If the answer is NOT in the context, politely say you don't have that information.

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

    const conversationMessages = messageHistory.reverse().map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    conversationMessages.push({
      role: "user",
      content: message,
    });

    // 7. Call LLM (Groq)
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
                content: currentSystemPrompt,
              },
              ...conversationMessages,
            ],
            max_tokens: 1500,
            temperature: 0.7,
            top_p: 0.9,
          }),
        }
      );

      if (!apiResponse.ok) {
        throw new Error("AI Service Unavailable");
      }

      const apiData = await apiResponse.json();
      assistantMessage =
        apiData.choices[0]?.message?.content ||
        "I apologize, I couldn't generate a response.";
    } catch (aiError) {
      console.error("[v0] AI Generation error:", aiError);
      return Response.json(
        { error: "Failed to process request." },
        { status: 500 }
      );
    }

    // 8. Save Transaction & Update Limits
    // FIX: Increment messageCount by 1 (counting the whole interaction as 1 credit)
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
