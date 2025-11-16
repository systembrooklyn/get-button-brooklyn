"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/utils/supabase/server";

export async function syncUserToPrisma() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  let prismaUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!prismaUser) {
    prismaUser = await prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
      },
    });
    console.log("[v0] Created new user in Prisma:", prismaUser.id);
  }

  return prismaUser;
}
