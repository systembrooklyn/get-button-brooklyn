import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(req) {
  let supabase = null;

  try {
    supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { message, chatbotId } = body;

    if (!message || !chatbotId) {
      return Response.json(
        { error: "Message and chatbotId required" },
        { status: 400 }
      );
    }

    let chatbot;
    try {
      chatbot = await prisma.chatbot.findFirst({
        where: {
          id: chatbotId,
          userId: user.id,
        },
      });

      console.log("[v0] Chatbot found:", chatbot?.name);
    } catch (dbError) {
      console.error("[v0] Database error fetching chatbot:", dbError);
      return Response.json(
        { error: "Failed to fetch chatbot" },
        { status: 500 }
      );
    }

    if (!chatbot) {
      return Response.json({ error: "Chatbot not found" }, { status: 404 });
    }

    // Check message limit
    if (chatbot.messageCount >= chatbot.messagesLimit) {
      return Response.json(
        { error: "Message limit reached. Please upgrade to continue." },
        { status: 429 }
      );
    }

    let knowledgeBase = "";

    // Fetch website data
    if (chatbot.dataSourceUrl) {
      try {
        const response = await fetch(chatbot.dataSourceUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; ChatbotScraper/1.0)",
          },
        });

        if (response.ok) {
          const html = await response.text();
          const textContent = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();

          if (textContent) {
            knowledgeBase += textContent.substring(0, 8000) + "\n\n";
            console.log(
              "[v0] Website content fetched:",
              textContent.substring(0, 100) + "..."
            );
          }
        }
      } catch (error) {
        console.error("[v0] Error fetching website:", error.message);
      }
    }

    // Process training files
    if (chatbot.trainingFiles) {
      try {
        const files = JSON.parse(chatbot.trainingFiles);

        for (const file of files) {
          if (file.data) {
            try {
              const base64Content = file.data.includes(",")
                ? file.data.split(",")[1]
                : file.data;
              const decodedContent = Buffer.from(
                base64Content,
                "base64"
              ).toString("utf-8");

              if (decodedContent && decodedContent.length > 0) {
                knowledgeBase += decodedContent.substring(0, 5000) + "\n\n";
                console.log(
                  "[v0] File content extracted:",
                  file.name,
                  decodedContent.substring(0, 100) + "..."
                );
              }
            } catch (decodeError) {
              console.error(
                "[v0] Error decoding file:",
                file.name,
                decodeError.message
              );
            }
          }
        }
      } catch (error) {
        console.error("[v0] Error processing training files:", error.message);
      }
    }

    console.log("[v0] Total knowledge base length:", knowledgeBase.length);

    const enhancedSystemPrompt = `You are ${chatbot.name}, ${
      chatbot.tagline || "a helpful AI assistant"
    }.

CORE INSTRUCTIONS:
- Provide direct, smart answers without unnecessary elaboration
- Only go into detail when the question explicitly requires it or asks for more information
- NEVER mention that you have access to files, documents, or data sources
- NEVER list or describe what information you have access to
- Answer naturally as if the knowledge is your inherent expertise
- Only reference specific information when directly relevant to answering the user's question

FORMATTING RULES:
- Use **bold** for emphasis on key terms
- Use headers (##) only when organizing complex multi-part answers
- Use bullet points (-) for lists of 3+ items
- Use numbered lists (1. 2. 3.) for sequential steps or procedures
- Keep paragraphs short (2-3 sentences maximum)
- Add blank lines between sections for readability

${chatbot.systemPrompt || ""}

${
  knowledgeBase
    ? `REFERENCE INFORMATION (use silently, never mention):\n${knowledgeBase}`
    : ""
}`;

    let messageHistory = [];
    try {
      messageHistory = await prisma.chatMessage.findMany({
        where: { chatbotId },
        take: 6,
        orderBy: { createdAt: "desc" },
      });
    } catch (dbError) {
      console.error("[v0] Error fetching message history:", dbError);
      messageHistory = [];
    }

    const conversationMessages = messageHistory.reverse().map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    conversationMessages.push({
      role: "user",
      content: message,
    });

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
                content: enhancedSystemPrompt,
              },
              ...conversationMessages,
            ],
            max_tokens: 1024,
            temperature: 0.3,
          }),
        }
      );

      if (!apiResponse.ok) {
        const error = await apiResponse.json();
        console.error("[v0] API error:", error);
        return Response.json(
          { error: "Failed to generate response" },
          { status: 500 }
        );
      }

      const apiData = await apiResponse.json();
      assistantMessage =
        apiData.choices[0]?.message?.content || "Unable to generate response.";
    } catch (aiError) {
      console.error("[v0] API error:", aiError);
      return Response.json(
        { error: "Failed to generate response" },
        { status: 500 }
      );
    }

    try {
      await prisma.chatMessage.create({
        data: {
          chatbotId,
          role: "user",
          content: message,
        },
      });
    } catch (dbError) {
      console.error("[v0] Error saving user message:", dbError);
    }

    try {
      await prisma.chatMessage.create({
        data: {
          chatbotId,
          role: "assistant",
          content: assistantMessage,
        },
      });
    } catch (dbError) {
      console.error("[v0] Error saving assistant message:", dbError);
    }

    try {
      await prisma.chatbot.update({
        where: { id: chatbotId },
        data: { messageCount: { increment: 2 } },
      });
    } catch (dbError) {
      console.error("[v0] Error updating message count:", dbError);
    }

    return Response.json({ message: assistantMessage });
  } catch (error) {
    console.error("[v0] Chat API error:", error);
    return Response.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}
