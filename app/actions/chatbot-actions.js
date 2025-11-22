"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

export async function createChatbot(data) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { syncUserToPrisma } = await import("./user-actions.js");
  await syncUserToPrisma();

  const {
    name,
    tagline,
    greetingMessage,
    systemPrompt,
    dataSourceUrl,
    avatar,
    botLanguage,
    suggestedMessages,
    sendMessageText,
    trainingFiles,
  } = data;

  if (!name || !tagline || !greetingMessage || !systemPrompt) {
    throw new Error("Missing required fields");
  }

  let scrapedContent = "";
  if (dataSourceUrl) {
    try {
      console.log("[v0] Scraping website:", dataSourceUrl);
      const { scrapeWebsite } = await import("./scraper-actions.js");
      scrapedContent = await scrapeWebsite(dataSourceUrl);
      console.log("[v0] Scraped content length:", scrapedContent.length);
    } catch (error) {
      console.error("[v0] Error scraping website:", error);
    }
  }

  let trainingContent = "";
  if (trainingFiles) {
    try {
      const files = JSON.parse(trainingFiles);
      for (const file of files) {
        if (file.content) {
          // Decode base64 content
          const decodedContent = Buffer.from(
            file.content.split(",")[1],
            "base64"
          ).toString("utf-8");
          trainingContent += `\n\nFile: ${file.name}\n${decodedContent}\n`;
        }
      }
      console.log("[v0] Training content length:", trainingContent.length);
    } catch (error) {
      console.error("[v0] Error parsing training files:", error);
    }
  }

  const knowledgeBase = `${scrapedContent}${trainingContent}`;
  const enhancedSystemPrompt = knowledgeBase
    ? `${systemPrompt}

IMPORTANT INSTRUCTIONS:
- Be concise and direct. Only provide detailed explanations when specifically requested or when the complexity requires it.
- Format your responses using markdown for better readability:
  * Use **bold** for important terms
  * Use headers (##, ###) to organize sections
  * Use bullet points (-) or numbered lists (1., 2.) for steps or items
  * Use code blocks (\`\`\`) for code or technical content
  * Keep paragraphs short and well-spaced
- Prioritize clarity over verbosity.

KNOWLEDGE BASE:
${knowledgeBase}`
    : systemPrompt;

  const chatbot = await prisma.chatbot.create({
    data: {
      userId: user.id,
      name,
      tagline,
      greetingMessage,
      systemPrompt: enhancedSystemPrompt,
      dataSourceUrl: dataSourceUrl || "",
      avatar: avatar || "",
      botLanguage: botLanguage || "en",
      suggestedMessages: suggestedMessages || "",
      sendMessageText: sendMessageText || "Send",
      trainingFiles: trainingFiles || "",
    },
    include: {
      messages: true,
    },
  });

  return chatbot;
}

export async function getChatbotByUserId(userId) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const chatbots = await prisma.chatbot.findMany({
    where: {
      userId,
    },
    include: {
      messages: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return chatbots;
}

export async function getChatbotById(chatbotId) {
  if (!chatbotId) {
    throw new Error("Chatbot ID is required");
  }

  const chatbot = await prisma.chatbot.findUnique({
    where: {
      id: chatbotId,
    },
    include: {
      messages: true,
    },
  });

  return chatbot;
}

export async function updateChatbot(chatbotId, data) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const chatbot = await prisma.chatbot.findUnique({
    where: { id: chatbotId },
  });

  if (!chatbot) {
    throw new Error("Chatbot not found");
  }

  if (chatbot.userId !== user.id) {
    throw new Error("Unauthorized");
  }

  let updatedSystemPrompt = data.systemPrompt;
  if (data.dataSourceUrl && data.dataSourceUrl !== chatbot.dataSourceUrl) {
    try {
      console.log("[v0] Scraping updated website:", data.dataSourceUrl);
      const { scrapeWebsite } = await import("./scraper-actions.js");
      const scrapedContent = await scrapeWebsite(data.dataSourceUrl);
      console.log("[v0] Scraped content length:", scrapedContent.length);

      updatedSystemPrompt = `${data.systemPrompt || chatbot.systemPrompt}

IMPORTANT INSTRUCTIONS:
- Be concise and direct. Only provide detailed explanations when specifically requested or when the complexity requires it.
- Format your responses using markdown for better readability:
  * Use **bold** for important terms
  * Use headers (##, ###) to organize sections
  * Use bullet points (-) or numbered lists (1., 2.) for steps or items
  * Use code blocks (\`\`\`) for code or technical content
  * Keep paragraphs short and well-spaced
- Prioritize clarity over verbosity.

KNOWLEDGE BASE:
${scrapedContent}`;
    } catch (error) {
      console.error("[v0] Error scraping website during update:", error);
    }
  }

  const updatedChatbot = await prisma.chatbot.update({
    where: { id: chatbotId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.tagline && { tagline: data.tagline }),
      ...(data.greetingMessage && { greetingMessage: data.greetingMessage }),
      ...(updatedSystemPrompt && { systemPrompt: updatedSystemPrompt }),
      ...(data.avatar !== undefined && { avatar: data.avatar }),
      ...(data.dataSourceUrl !== undefined && {
        dataSourceUrl: data.dataSourceUrl,
      }),
      ...(data.botLanguage && { botLanguage: data.botLanguage }),
      ...(data.suggestedMessages !== undefined && {
        suggestedMessages: data.suggestedMessages,
      }),
      ...(data.sendMessageText && { sendMessageText: data.sendMessageText }),
      ...(data.trainingFiles !== undefined && {
        trainingFiles: data.trainingFiles,
      }),
    },
    include: {
      messages: true,
    },
  });

  return updatedChatbot;
}

export async function deleteChatbot(chatbotId) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const chatbot = await prisma.chatbot.findUnique({
    where: { id: chatbotId },
  });

  if (!chatbot) {
    throw new Error("Chatbot not found");
  }

  if (chatbot.userId !== user.id) {
    throw new Error("Unauthorized");
  }

  await prisma.chatbot.delete({
    where: { id: chatbotId },
  });

  return { success: true };
}

export async function addChatMessage(chatbotId, role, content) {
  if (!chatbotId || !role || !content) {
    throw new Error("Missing required fields");
  }

  const message = await prisma.chatMessage.create({
    data: {
      chatbotId,
      role,
      content,
    },
  });

  return message;
}

export async function getChatbotMessages(chatbotId) {
  if (!chatbotId) {
    throw new Error("Chatbot ID is required");
  }

  const messages = await prisma.chatMessage.findMany({
    where: {
      chatbotId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return messages;
}
