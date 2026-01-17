import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CORRECTIONS_MARKER = "\n\n---CORRECTIONS---\n";

function parseCorrections(systemPrompt, chatbotId) {
  const corrections = [];
  const markerIndex = systemPrompt.indexOf(CORRECTIONS_MARKER);

  if (markerIndex === -1) return corrections;

  const correctionsSection = systemPrompt.slice(
    markerIndex + CORRECTIONS_MARKER.length,
  );
  const lines = correctionsSection
    .split("\n")
    .filter((line) => line.startsWith("[CORRECTION:"));

  lines.forEach((line, index) => {
    // Format: [CORRECTION:id] User: "message" → Bot: "response"
    const match = line.match(
      /\[CORRECTION:([^\]]+)\] User: "(.*?)" → Bot: "(.*)"/,
    );
    if (match) {
      corrections.push({
        id: match[1],
        chatbotId,
        userMessage: match[2],
        correctedResponse: match[3],
      });
    }
  });

  return corrections;
}

function buildCorrectionsSection(corrections) {
  if (corrections.length === 0) return "";

  const lines = corrections.map(
    (c) =>
      `[CORRECTION:${c.id}] User: "${c.userMessage}" → Bot: "${c.correctedResponse}"`,
  );

  return CORRECTIONS_MARKER + lines.join("\n");
}

function getBasePrompt(systemPrompt) {
  const markerIndex = systemPrompt.indexOf(CORRECTIONS_MARKER);
  return markerIndex === -1 ? systemPrompt : systemPrompt.slice(0, markerIndex);
}

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

// GET - Fetch all corrections for a user (parsed from systemPrompts)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ message: "userId required" }, { status: 400 });
  }

  try {
    const chatbots = await prisma.chatbot.findMany({
      where: { userId },
      select: { id: true, systemPrompt: true },
    });

    const allCorrections = [];
    chatbots.forEach((chatbot) => {
      const corrections = parseCorrections(chatbot.systemPrompt, chatbot.id);
      allCorrections.push(...corrections);
    });

    return NextResponse.json({ corrections: allCorrections });
  } catch (error) {
    console.error("Failed to fetch corrections:", error);
    return NextResponse.json(
      { message: "Failed to fetch corrections" },
      { status: 500 },
    );
  }
}

// POST - Create new correction (inject into systemPrompt)
export async function POST(request) {
  try {
    const { chatbotId, userMessage, correctedResponse } = await request.json();

    if (!chatbotId || !userMessage || !correctedResponse) {
      return NextResponse.json(
        { message: "All fields required" },
        { status: 400 },
      );
    }

    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      select: { systemPrompt: true },
    });

    if (!chatbot) {
      return NextResponse.json(
        { message: "Chatbot not found" },
        { status: 404 },
      );
    }

    const existingCorrections = parseCorrections(
      chatbot.systemPrompt,
      chatbotId,
    );
    const newCorrection = {
      id: generateId(),
      chatbotId,
      userMessage,
      correctedResponse,
    };
    existingCorrections.push(newCorrection);

    const basePrompt = getBasePrompt(chatbot.systemPrompt);
    const newPrompt = basePrompt + buildCorrectionsSection(existingCorrections);

    await prisma.chatbot.update({
      where: { id: chatbotId },
      data: { systemPrompt: newPrompt },
    });

    return NextResponse.json({ success: true, correction: newCorrection });
  } catch (error) {
    console.error("Failed to create correction:", error);
    return NextResponse.json(
      { message: "Failed to create correction" },
      { status: 500 },
    );
  }
}

// PUT - Update existing correction
export async function PUT(request) {
  try {
    const { id, chatbotId, userMessage, correctedResponse } =
      await request.json();

    if (!id || !chatbotId || !userMessage || !correctedResponse) {
      return NextResponse.json(
        { message: "All fields required" },
        { status: 400 },
      );
    }

    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      select: { systemPrompt: true },
    });

    if (!chatbot) {
      return NextResponse.json(
        { message: "Chatbot not found" },
        { status: 404 },
      );
    }

    const corrections = parseCorrections(chatbot.systemPrompt, chatbotId);
    const index = corrections.findIndex((c) => c.id === id);

    if (index === -1) {
      return NextResponse.json(
        { message: "Correction not found" },
        { status: 404 },
      );
    }

    corrections[index] = { id, chatbotId, userMessage, correctedResponse };

    const basePrompt = getBasePrompt(chatbot.systemPrompt);
    const newPrompt = basePrompt + buildCorrectionsSection(corrections);

    await prisma.chatbot.update({
      where: { id: chatbotId },
      data: { systemPrompt: newPrompt },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update correction:", error);
    return NextResponse.json(
      { message: "Failed to update correction" },
      { status: 500 },
    );
  }
}

// DELETE - Remove correction from systemPrompt
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const chatbotId = searchParams.get("chatbotId");

  if (!id || !chatbotId) {
    return NextResponse.json(
      { message: "id and chatbotId required" },
      { status: 400 },
    );
  }

  try {
    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
      select: { systemPrompt: true },
    });

    if (!chatbot) {
      return NextResponse.json(
        { message: "Chatbot not found" },
        { status: 404 },
      );
    }

    const corrections = parseCorrections(chatbot.systemPrompt, chatbotId);
    const filtered = corrections.filter((c) => c.id !== id);

    const basePrompt = getBasePrompt(chatbot.systemPrompt);
    const newPrompt = basePrompt + buildCorrectionsSection(filtered);

    await prisma.chatbot.update({
      where: { id: chatbotId },
      data: { systemPrompt: newPrompt },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete correction:", error);
    return NextResponse.json(
      { message: "Failed to delete correction" },
      { status: 500 },
    );
  }
}
