"use server";

import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function createChatbot(formData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("User not authenticated");

  const existingChatbots = await prisma.chatbot.findMany({
    where: {
      userId: user.id,
    },
  });

  if (existingChatbots && existingChatbots.length >= 2) {
    throw new Error(
      "You can only create up to 2 chatbots. Delete one to create another."
    );
  }

  const chatbot = await prisma.chatbot.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      name: formData.name,
      tagline: formData.tagline || "",
      greetingMessage: formData.greetingMessage || "Hello! How can I help?",
      avatar:
        formData.avatar ||
        "https://ui-avatars.com/api/?name=" + encodeURIComponent(formData.name),
      systemPrompt: formData.systemPrompt,
      dataSourceUrl: formData.dataSourceUrl || "",
      messageCount: 0,
      messagesLimit: 20,
    },
  });

  return chatbot;
}

export async function getChatbots() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated");
    }

    const chatbots = await prisma.chatbot.findMany({
      where: { userId: user.id },
      include: {
        messages: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return chatbots;
  } catch (error) {
    console.error("[v0] Error fetching chatbots:", error);
    return [];
  }
}

export async function getChatbotById(chatbotId) {
  try {
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      include: {
        messages: true,
      },
    });
    return chatbot;
  } catch (error) {
    console.error("[v0] Error fetching chatbot:", error);
    return null;
  }
}

export async function updateChatbot(chatbotId, updates) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("User not authenticated");

    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
    });

    if (!chatbot || chatbot.userId !== user.id) {
      throw new Error("Unauthorized: You can only update your own chatbots");
    }

    const updated = await prisma.chatbot.update({
      where: { id: chatbotId },
      data: updates,
    });
    return updated;
  } catch (error) {
    console.error("[v0] Error updating chatbot:", error);
    throw error;
  }
}

export async function deleteChatbot(chatbotId) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("User not authenticated");

    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
    });

    if (!chatbot || chatbot.userId !== user.id) {
      throw new Error("Unauthorized: You can only delete your own chatbots");
    }

    await prisma.chatMessage.deleteMany({
      where: { chatbotId },
    });

    await prisma.chatbot.delete({
      where: { id: chatbotId },
    });

    return { success: true };
  } catch (error) {
    console.error("[v0] Error deleting chatbot:", error);
    throw error;
  }
}

export async function addMessage(chatbotId, role, content) {
  const messageId = randomUUID();

  const message = await prisma.chatMessage.create({
    data: {
      id: messageId,
      chatbotId,
      role,
      content,
    },
  });

  if (role === "user") {
    await prisma.chatbot.update({
      where: { id: chatbotId },
      data: { messageCount: { increment: 1 } },
    });
  }

  return message;
}

export async function getChatHistory(chatbotId) {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { chatbotId },
      orderBy: { createdAt: "asc" },
    });
    return messages;
  } catch (error) {
    console.error("[v0] Error fetching chat history:", error);
    return [];
  }
}

export async function getChatbotByUserId(userId) {
  try {
    const chatbots = await prisma.chatbot.findMany({
      where: { userId },
      include: {
        messages: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return chatbots || [];
  } catch (error) {
    console.error("[v0] Error fetching chatbots for user:", error.message);
    try {
      await prisma.$disconnect();
      const retryResult = await prisma.chatbot.findMany({
        where: { userId },
        include: {
          messages: true,
        },
        orderBy: { createdAt: "desc" },
      });
      return retryResult || [];
    } catch (retryError) {
      console.error("[v0] Retry failed:", retryError.message);
      return [];
    }
  }
}

export async function getChatbotMessages(chatbotId) {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { chatbotId },
      orderBy: { createdAt: "asc" },
    });
    return messages;
  } catch (error) {
    console.error("[v0] Error fetching messages:", error);
    return [];
  }
}
