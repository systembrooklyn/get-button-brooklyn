"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";
import { crawlDomain } from "@/utils/crawler";
import { GoogleGenAI } from "@google/genai";

export async function createChatbot(data) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "You must be logged in." };
    }
    // Sync User
    try {
      const { syncUserToPrisma } = await import("./user-actions.js");
      await syncUserToPrisma();
    } catch (e) {
      console.log("[v0] User sync skipped");
    }

    // Check Limit
    const count = await prisma.chatbot.count({ where: { userId: user.id } });
    if (count >= 3) {
      return {
        success: false,
        error: "You have reached the maximum limit of 3 chatbots.",
      };
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

    if (!name || !greetingMessage) {
      return {
        success: false,
        error: "Chatbot name and greeting message are required.",
      };
    }

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
        trainingFiles: "[]", // Keep column empty/minimal to save DB space
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
        // Create - all files are new
        const fileSources = await processNewFiles(files, chatbot.id);

        if (fileSources.length > 0) {
          await prisma.knowledgeSource.createMany({ data: fileSources });
          console.log(`[v0] Processed ${fileSources.length} files`);
        }
      } catch (e) {
        console.error("[v0] File processing error:", e);
      }
    }

    return { success: true, chatbot };
  } catch (error) {
    console.error("[createChatbot]", error);
    return {
      success: false,
      error: "Something went wrong. Please try again.",
    };
  }
}

export async function updateChatbot(chatbotId, data) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
    });
    if (!chatbot || chatbot.userId !== user.id) {
      return { success: false, error: "Unauthorized" };
    }

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
        trainingFiles: "[]",
      },
    });

    // Handle URL Changes
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

    // Handle Training Files (Differential Update)
    if (data.trainingFiles) {
      try {
        const filesList = JSON.parse(data.trainingFiles);

        // 1. Identify Existing Files (Have an 'id')
        const existingIdsToKeep = filesList
          .filter((f) => f.id)
          .map((f) => f.id);

        // 2. Delete Removed Files (Type 'file' but ID not in keep list)
        await prisma.knowledgeSource.deleteMany({
          where: {
            chatbotId,
            type: "file",
            id: { notIn: existingIdsToKeep },
          },
        });

        // 3. Add New Files (No 'id', has 'data')
        const newFiles = filesList.filter((f) => !f.id && f.data);

        const fileSources = await processNewFiles(newFiles, chatbotId);

        if (fileSources.length > 0) {
          await prisma.knowledgeSource.createMany({ data: fileSources });
          console.log(`[v0] Added ${fileSources.length} new files`);
        }
      } catch (e) {
        console.error("[v0] File update error:", e);
      }
    }

    return { success: true, chatbot: updated };
  } catch (error) {
    console.error("[updateChatbot]", error);
    return {
      success: false,
      error: "Failed to update chatbot. Please try again.",
    };
  }
}

export async function deleteChatbot(chatbotId) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
    });
    if (!chatbot || chatbot.userId !== user.id) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.chatbot.delete({ where: { id: chatbotId } });
    return { success: true };
  } catch (error) {
    console.error("[deleteChatbot]", error);
    return {
      success: false,
      error: "Failed to delete chatbot.",
    };
  }
}

export async function getChatbotByUserId(userId) {
  return prisma.chatbot.findMany({
    where: { userId },
    include: { knowledgeSources: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getChatbotById(id) {
  return prisma.chatbot.findUnique({
    where: { id },
    include: {
      messages: true,
      knowledgeSources: true,
    },
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

// === HELPERS ===

async function processNewFiles(files, chatbotId) {
  if (!files || files.length === 0) return [];

  const results = await Promise.all(
    files.map(async (file) => {
      if (!file.data) return null;

      let mimeType = "text/plain";
      let base64 = file.data;

      // Handle Data URL if present (remove prefix)
      // Format: data:image/png;base64,.....
      if (file.data.includes(",")) {
        const parts = file.data.split(",");
        const match = parts[0].match(/:(.*?);/);
        if (match) mimeType = match[1];
        base64 = parts[1];
      }

      const text = await extractTextFromFile(base64, mimeType, file.name);

      return {
        chatbotId,
        type: "file",
        url: `file://${file.name}`,
        title: sanitizeForDatabase(file.name),
        content: sanitizeForDatabase(text),
      };
    })
  );

  return results.filter(Boolean);
}

async function extractTextFromFile(base64, mimeType, fileName) {
  // 1. Text formats - decode directly to avoid AI cost/latency
  if (
    mimeType.startsWith("text/") ||
    mimeType.includes("json") ||
    mimeType.includes("csv") ||
    mimeType.includes("xml") ||
    mimeType.includes("javascript")
  ) {
    return Buffer.from(base64, "base64").toString("utf-8");
  }

  // 2. Gemini extraction for PDF/Image
  const apiKey = process.env.API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return "[System: Missing API Key for file extraction]";

  try {
    const ai = new GoogleGenAI({ apiKey });
    // Use flash model for speed and capability
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64 } },
          {
            text: "Extract all text from this file verbatim. Return ONLY the text content, no markdown formatting or commentary.",
          },
        ],
      },
    });
    return response.text || "[System: No text extracted]";
  } catch (e) {
    console.error(`[v0] Gemini extraction error for ${fileName}:`, e.message);
    return `[System: Failed to extract text from ${fileName}. Error: ${e.message}]`;
  }
}

function sanitizeForDatabase(text) {
  if (!text) return "";

  return text
    .replace(/\0/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/[\uD800-\uDFFF]/g, "")
    .trim();
}
