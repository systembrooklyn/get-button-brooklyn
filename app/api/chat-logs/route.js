import { prisma } from "@/lib/prisma";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const chatbotId = searchParams.get("chatbotId");

    if (!chatbotId) {
      return Response.json({ error: "chatbotId is required" }, { status: 400 });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { chatbotId },
      orderBy: { createdAt: "desc" },
      take: 500, // Limit to last 500 messages
    });

    return Response.json({ messages });
  } catch (error) {
    console.error("Failed to fetch chat logs:", error);
    return Response.json(
      { error: "Failed to fetch chat logs" },
      { status: 500 },
    );
  }
}
