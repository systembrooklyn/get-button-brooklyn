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

  const { name, tagline, greetingMessage, systemPrompt, dataSourceUrl } = data;

  if (!name || !tagline || !greetingMessage || !systemPrompt) {
    throw new Error("Missing required fields");
  }

  const chatbot = await prisma.chatbot.create({
    data: {
      userId: user.id,
      name,
      tagline,
      greetingMessage,
      systemPrompt,
      dataSourceUrl: dataSourceUrl || "",
    },
    include: {
      messages: true,
    },
  });

  return chatbot;
}

export async function getChatbotByUserId(userid) {
  if (!userid) {
    throw new Error("User ID is required");
  }

  const chatbots = await prisma.chatbot.findMany({
    where: {
      userId: userid,
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

  // Verify the chatbot belongs to the user
  const chatbot = await prisma.chatbot.findUnique({
    where: { id: chatbotId },
  });

  if (!chatbot) {
    throw new Error("Chatbot not found");
  }

  if (chatbot.userId !== user.id) {
    throw new Error("Unauthorized: You do not own this chatbot");
  }

  const { name, tagline, greetingMessage, systemPrompt, avatar } = data;

  const updatedChatbot = await prisma.chatbot.update({
    where: { id: chatbotId },
    data: {
      ...(name && { name }),
      ...(tagline && { tagline }),
      ...(greetingMessage && { greetingMessage }),
      ...(systemPrompt && { systemPrompt }),
      ...(avatar && { avatar }),
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

  // Verify the chatbot belongs to the user
  const chatbot = await prisma.chatbot.findUnique({
    where: { id: chatbotId },
  });

  if (!chatbot) {
    throw new Error("Chatbot not found");
  }

  if (chatbot.userId !== user.id) {
    throw new Error("Unauthorized: You do not own this chatbot");
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
