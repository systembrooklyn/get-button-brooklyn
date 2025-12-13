"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { crawlDomain } from "@/utils/crawler";

export async function createChatbot(data) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not authenticated");

  // Sync User
  try {
    const { syncUserToPrisma } = await import("./user-actions.js");
    await syncUserToPrisma();
  } catch (e) {
    console.log("[v0] User sync skipped");
  }

  // Check Limit
  const count = await prisma.chatbot.count({ where: { userId: user.id } });
  if (count >= 3) throw new Error("LIMIT_REACHED");

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

  if (!name || !greetingMessage) throw new Error("Missing required fields");

  // 1. Create Chatbot
  const chatbot = await prisma.chatbot.create({
    data: {
      userId: user.id,
      name,
      tagline: tagline || "",
      greetingMessage,
      systemPrompt: systemPrompt || "",
      dataSourceUrl: dataSourceUrl || "",
      avatar: avatar || "",
      botLanguage: botLanguage || "en",
      color: color || "#2563eb",
      personality: personality || "friendly",
      suggestedMessages: suggestedMessages || "",
      sendMessageText: sendMessageText || "Send",
      trainingFiles: trainingFiles || "",
    },
  });

  // 2. Crawl Website (If URL provided)
  if (dataSourceUrl) {
    console.log("[v0] Starting website crawl for:", dataSourceUrl);

    try {
      const pages = await crawlDomain(dataSourceUrl, chatbot.id);

      if (pages.length > 0) {
        console.log(`[v0] Successfully crawled ${pages.length} pages`);

        await prisma.knowledgeSource.createMany({
          data: pages.map((p) => ({
            chatbotId: chatbot.id,
            type: "web",
            url: sanitizeForDatabase(p.url),
            title: sanitizeForDatabase(p.title),
            content: sanitizeForDatabase(p.content),
          })),
        });
      } else {
        console.warn("[v0] Crawl returned no pages");

        await prisma.knowledgeSource.create({
          data: {
            chatbotId: chatbot.id,
            type: "web",
            url: dataSourceUrl,
            title: "Crawl Failed",
            content: `Unable to automatically crawl ${dataSourceUrl}. This could be because:
1. The website blocks automated access
2. The website requires JavaScript to render content
3. The website has bot protection enabled

Solutions:
- Add SCRAPINGBEE_API_KEY to your environment variables for better crawling
- Manually upload documents with your website content
- Provide specific URLs to important pages instead of just the homepage`,
          },
        });
      }
    } catch (e) {
      console.error("[v0] Crawl error:", e);

      await prisma.knowledgeSource.create({
        data: {
          chatbotId: chatbot.id,
          type: "web",
          url: dataSourceUrl,
          title: "Crawl Error",
          content: `Failed to crawl ${dataSourceUrl}. Error: ${e.message}`,
        },
      });
    }
  }

  // 3. Process Files (If provided)
  if (trainingFiles) {
    try {
      const files = JSON.parse(trainingFiles);
      const fileSources = [];

      for (const file of files) {
        if (file.data) {
          const base64 = file.data.includes(",")
            ? file.data.split(",")[1]
            : file.data;
          const text = Buffer.from(base64, "base64").toString("utf-8");
          fileSources.push({
            chatbotId: chatbot.id,
            type: "file",
            url: `file://${file.name}`,
            title: sanitizeForDatabase(file.name),
            content: sanitizeForDatabase(text),
          });
        }
      }

      if (fileSources.length > 0) {
        await prisma.knowledgeSource.createMany({ data: fileSources });
        console.log(`[v0] Processed ${fileSources.length} files`);
      }
    } catch (e) {
      console.error("[v0] File processing error:", e);
    }
  }

  return chatbot;
}

export async function updateChatbot(chatbotId, data) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const chatbot = await prisma.chatbot.findUnique({ where: { id: chatbotId } });
  if (!chatbot || chatbot.userId !== user.id) throw new Error("Unauthorized");

  const updated = await prisma.chatbot.update({
    where: { id: chatbotId },
    data: {
      name: data.name,
      tagline: data.tagline,
      greetingMessage: data.greetingMessage,
      systemPrompt: data.systemPrompt,
      avatar: data.avatar,
      color: data.color,
      personality: data.personality,
      suggestedMessages: data.suggestedMessages,
      botLanguage: data.botLanguage,
      dataSourceUrl: data.dataSourceUrl,
      trainingFiles: data.trainingFiles,
    },
  });

  if (data.dataSourceUrl && data.dataSourceUrl !== chatbot.dataSourceUrl) {
    console.log(
      "[v0] URL changed, re-crawling website for:",
      data.dataSourceUrl
    );

    try {
      // Delete old web sources for this URL
      await prisma.knowledgeSource.deleteMany({
        where: { chatbotId, type: "web" },
      });

      const pages = await crawlDomain(data.dataSourceUrl, chatbotId);

      if (pages.length > 0) {
        await prisma.knowledgeSource.createMany({
          data: pages.map((p) => ({
            chatbotId,
            type: "web",
            url: sanitizeForDatabase(p.url),
            title: sanitizeForDatabase(p.title),
            content: sanitizeForDatabase(p.content),
          })),
        });
        console.log(
          `[v0] Successfully crawled and saved ${pages.length} pages`
        );
      } else {
        await prisma.knowledgeSource.create({
          data: {
            chatbotId,
            type: "web",
            url: data.dataSourceUrl,
            title: "Crawl Failed",
            content: `Unable to crawl ${data.dataSourceUrl}. The website may have bot protection or require JavaScript rendering. Try adding SCRAPINGBEE_API_KEY environment variable for better results.`,
          },
        });
        console.warn("[v0] Crawl returned 0 pages");
      }
    } catch (e) {
      console.error("[v0] Re-crawl error:", e);

      await prisma.knowledgeSource.create({
        data: {
          chatbotId,
          type: "web",
          url: data.dataSourceUrl,
          title: "Crawl Error",
          content: `Error crawling ${data.dataSourceUrl}: ${e.message}`,
        },
      });
    }
  }

  if (data.trainingFiles) {
    try {
      // Delete old file sources
      await prisma.knowledgeSource.deleteMany({
        where: { chatbotId, type: "file" },
      });

      const files = JSON.parse(data.trainingFiles);
      const fileSources = [];

      for (const file of files) {
        if (file.data) {
          const base64 = file.data.includes(",")
            ? file.data.split(",")[1]
            : file.data;
          const text = Buffer.from(base64, "base64").toString("utf-8");
          fileSources.push({
            chatbotId,
            type: "file",
            url: `file://${file.name}`,
            title: sanitizeForDatabase(file.name),
            content: sanitizeForDatabase(text),
          });
        }
      }

      if (fileSources.length > 0) {
        await prisma.knowledgeSource.createMany({ data: fileSources });
        console.log(`[v0] Updated ${fileSources.length} files`);
      }
    } catch (e) {
      console.error("[v0] File update error:", e);
    }
  }

  return updated;
}

export async function deleteChatbot(chatbotId) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const chatbot = await prisma.chatbot.findUnique({ where: { id: chatbotId } });
  if (!chatbot || chatbot.userId !== user.id) throw new Error("Unauthorized");

  await prisma.chatbot.delete({ where: { id: chatbotId } });
  return { success: true };
}

export async function getChatbotByUserId(userId) {
  return prisma.chatbot.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getChatbotById(id) {
  return prisma.chatbot.findUnique({
    where: { id },
    include: { messages: true },
  });
}

export async function addChatMessage(chatbotId, role, content) {
  return prisma.chatMessage.create({ data: { chatbotId, role, content } });
}

export async function getChatbotMessages(chatbotId) {
  return prisma.chatMessage.findMany({
    where: { chatbotId },
    orderBy: { createdAt: "asc" },
  });
}

function sanitizeForDatabase(text) {
  if (!text) return "";

  return text
    .replace(/\0/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/[\uD800-\uDFFF]/g, "")
    .trim();
}
