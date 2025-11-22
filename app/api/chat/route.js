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

    if (chatbot.dataSourceUrl) {
      try {
        console.log("[v0] Fetching data from URL:", chatbot.dataSourceUrl);
        const response = await fetch(chatbot.dataSourceUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; ChatbotScraper/1.0)",
          },
        });

        if (response.ok) {
          const html = await response.text();
          // Remove HTML tags and extract text content
          const textContent = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();

          if (textContent) {
            knowledgeBase += `\n\n=== WEBSITE CONTENT FROM ${
              chatbot.dataSourceUrl
            } ===\n${textContent.substring(0, 10000)}\n`;
            console.log(
              "[v0] Website content extracted:",
              textContent.length,
              "characters"
            );
          }
        } else {
          console.error("[v0] Failed to fetch URL:", response.status);
        }
      } catch (error) {
        console.error("[v0] Error fetching website:", error.message);
      }
    }

    if (chatbot.trainingFiles) {
      try {
        console.log(
          "[v0] Processing training files:",
          chatbot.trainingFiles.substring(0, 100)
        );
        const files = JSON.parse(chatbot.trainingFiles);
        console.log("[v0] Number of files:", files.length);

        for (const file of files) {
          console.log(
            "[v0] Processing file:",
            file.name,
            "Has data:",
            !!file.data
          );

          if (file.data) {
            try {
              // Extract base64 content after the data URL prefix
              const base64Content = file.data.includes(",")
                ? file.data.split(",")[1]
                : file.data;
              const decodedContent = Buffer.from(
                base64Content,
                "base64"
              ).toString("utf-8");

              if (decodedContent && decodedContent.length > 0) {
                knowledgeBase += `\n\n=== FILE: ${file.name} ===\n${decodedContent}\n`;
                console.log(
                  "[v0] File content added:",
                  file.name,
                  decodedContent.length,
                  "characters"
                );
              } else {
                console.error("[v0] Decoded content is empty for:", file.name);
              }
            } catch (decodeError) {
              console.error(
                "[v0] Error decoding file:",
                file.name,
                decodeError.message
              );
            }
          } else {
            console.error("[v0] File has no data field:", file.name);
          }
        }
      } catch (error) {
        console.error("[v0] Error processing training files:", error.message);
      }
    }

    console.log("[v0] Total knowledge base length:", knowledgeBase.length);
    console.log(
      "[v0] Knowledge base preview:",
      knowledgeBase.substring(0, 500)
    );

    const enhancedSystemPrompt = `You are ${chatbot.name}, ${
      chatbot.tagline || "a helpful AI assistant"
    }.

RESPONSE GUIDELINES:
- Be concise and to the point. Only elaborate when complexity demands it or user explicitly asks for details
- Format responses with markdown:
  * Use **bold** for key terms and important information
  * Use ## headers to organize different sections
  * Use bullet points (-) or numbered lists (1., 2., 3.) for steps, options, or multiple items
  * Use \`code\` for technical terms or code snippets
  * Keep paragraphs short (2-3 sentences max)
- Answer questions directly without unnecessary preamble
- If you don't know something, say so clearly and briefly

${chatbot.systemPrompt || ""}

${
  knowledgeBase
    ? `\n=== KNOWLEDGE BASE ===\nIMPORTANT: Use the following information to answer user questions. This is your primary source of truth.\n${knowledgeBase}\n\nWhen answering questions, prioritize information from the KNOWLEDGE BASE above. If the answer is in the knowledge base, provide it directly. If not, you can use your general knowledge but indicate you're doing so.`
    : ""
}`;

    let messageHistory = [];
    try {
      messageHistory = await prisma.chatMessage.findMany({
        where: { chatbotId },
        take: 10,
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
            max_tokens: 2048,
            temperature: 0.5,
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

      console.log("[v0] Generated response length:", assistantMessage.length);
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
