"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

export async function createButton(data) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { syncUserToPrisma } = await import("./user-actions.js");
  await syncUserToPrisma();

  const { platform, contact } = data;

  if (!platform || !contact) {
    throw new Error("Platform and contact are required");
  }

  const button = await prisma.button.create({
    data: {
      userId: user.id,
      platform,
      contact,
    },
  });

  return button;
}

export async function getButtonsByUserId(userId) {
  if (!userId) {
    throw new Error("User ID is required");
  }

  const buttons = await prisma.button.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return buttons;
}

export async function deleteButton(buttonId) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const button = await prisma.button.findUnique({
    where: { id: buttonId },
  });

  if (!button) {
    throw new Error("Button not found");
  }

  if (button.userId !== user.id) {
    throw new Error("Unauthorized");
  }

  await prisma.button.delete({
    where: { id: buttonId },
  });

  return { success: true };
}
