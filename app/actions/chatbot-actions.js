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

  // Ensure user exists in Prisma
  // Dynamic import for avoiding circular deps if user-actions imports this
  const { syncUserToPrisma } = await import("./user-actions.js");
  await syncUserToPrisma();

  // Enforce 3 Chatbots Limit Server Side (Double Check)
  const currentCount = await prisma.chatbot.count({
    where: { userId: user.id },
  });

  if (currentCount >= 3) {
    throw new Error("LIMIT_REACHED");
  }

  const {
    name,
    tagline,
    greetingMessage,
    systemPrompt,
    dataSourceUrl,
    avatar,
    botLanguage,
    color,
    personality,
    suggestedMessages,
    sendMessageText,
    trainingFiles,
  } = data;

  if (!name || !tagline || !greetingMessage) {
    throw new Error("Missing required fields");
  }

  let scrapedContent = "";
  if (dataSourceUrl) {
    try {
      console.log("[v0] Scraping website:", dataSourceUrl);
      const { scrapeWebsite } = await import("./scraper-actions.js");
      scrapedContent = await scrapeWebsite(dataSourceUrl);
    } catch (error) {
      console.error("[v0] Error scraping website:", error);
    }
  }

  let trainingContent = "";
  if (trainingFiles) {
    try {
      const files = JSON.parse(trainingFiles);
      if (Array.isArray(files)) {
        for (const file of files) {
          if (file.data) {
            // Check if data is base64
            const base64Data = file.data.includes(",")
              ? file.data.split(",")[1]
              : file.data;
            const decodedContent = Buffer.from(base64Data, "base64").toString(
              "utf-8"
            );
            // Simple cleanup for display in system prompt
            const cleanText = decodedContent.replace(/[^\x20-\x7E\n\r\t]/g, "");
            trainingContent += `\n\nFile: ${file.name}\n${cleanText}\n`;
          }
        }
      }
    } catch (error) {
      console.error("[v0] Error parsing training files:", error);
    }
  }

  const knowledgeBase = `${scrapedContent}${trainingContent}`;
  const finalSystemPrompt = systemPrompt || "You are a helpful assistant.";
  const enhancedSystemPrompt = knowledgeBase
    ? `${finalSystemPrompt}

IMPORTANT INSTRUCTIONS:
- Be concise and direct.
- Format your responses using markdown.
- Prioritize clarity over verbosity.

KNOWLEDGE BASE:
${knowledgeBase}`
    : finalSystemPrompt;

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
      color: color || "#2563eb",
      personality: personality || "friendly",
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
  // If URL changed, re-scrape
  if (data.dataSourceUrl && data.dataSourceUrl !== chatbot.dataSourceUrl) {
    try {
      console.log("[v0] Scraping updated website:", data.dataSourceUrl);
      const { scrapeWebsite } = await import("./scraper-actions.js");
      const scrapedContent = await scrapeWebsite(data.dataSourceUrl);

      updatedSystemPrompt = `${data.systemPrompt || chatbot.systemPrompt}

IMPORTANT INSTRUCTIONS:
- Be concise and direct.
- Format your responses using markdown.

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
      ...(data.color && { color: data.color }),
      ...(data.personality && { personality: data.personality }),
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
