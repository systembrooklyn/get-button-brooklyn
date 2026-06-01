import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";
// import { GoogleGenAI } from "@google/genai";

const ADMIN_UID = "a1941b27-d783-45f0-bf73-f531a6394f02";

export async function OPTIONS(request) {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function POST(req) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  try {
    console.log("[v0] Chat API called");

    const body = await req.json();
    const { message, chatbotId } = body;

    console.log("[v0] Request data:", {
      message: message?.substring(0, 50),
      chatbotId,
    });

    if (!message || !chatbotId) {
      return Response.json({ error: "Missing data" }, { status: 400, headers });
    }

    const chatbot = await prisma.chatbot.findUnique({
      where: { id: chatbotId },
    });

    if (!chatbot) {
      return Response.json(
        { error: "Chatbot not found" },
        { status: 404, headers },
      );
    }

    const origin = req.headers.get("origin");
    const referer = req.headers.get("referer");

    const appDomain =
      process.env.NEXT_PUBLIC_DOMAIN_NAME || "http://localhost:3000";

    // Check if request is from the dashboard (authenticated) or external site (embed)
    const isFromDashboard =
      origin?.includes(appDomain) || referer?.includes(appDomain);

    let isAdmin = false;

    // Only check auth for dashboard requests
    if (isFromDashboard) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const isTestUser = user?.email === "test@test.com";
      isAdmin = user?.id === ADMIN_UID || isTestUser;
    }

    // For dashboard requests, admins can bypass limits
    if (!isAdmin) {
      const count = await prisma.chatMessage.count({ where: { chatbotId } });
      if (count >= (chatbot.messagesLimit || 20)) {
        return Response.json(
          { error: "Message limit reached." },
          { status: 403, headers },
        );
      }
    }

    const apiKey = process.env.API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      console.error("[v0] API Key not found");
      return Response.json(
        { error: "Server Configuration Error" },
        { status: 500, headers },
      );
    }

    const allSources = await prisma.knowledgeSource.findMany({
      where: {
        chatbotId,
        isActive: true,
        title: {
          notIn: ["Crawl Failed", "Crawl Error"],
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    console.log(
      `[v0] Chatbot ${chatbotId}: Found ${allSources.length} valid knowledge sources`,
    );

    const webSources = allSources.filter((s) => s.type === "web");
    const fileSources = allSources.filter((s) => s.type === "file");

    let contextData = "";
    const sourceLinks = [];

    if (fileSources.length > 0) {
      contextData += "\n=== UPLOADED FILES (HIGH PRIORITY) ===\n";
      fileSources.slice(0, 10).forEach((s, i) => {
        contextData += `
--- FILE ${i + 1}: ${s.title} ---
${s.content}
---
`;
      });
    }

    if (webSources.length > 0) {
      contextData += "\n=== WEBSITE CONTENT (REFERENCE) ===\n";
      webSources.slice(0, 10).forEach((s, i) => {
        contextData += `
--- PAGE ${i + 1}: ${s.title} ---
URL: ${s.url}
${s.content}
---
`;
        if (s.url) {
          sourceLinks.push({
            title: s.title,
            url: s.url,
          });
        }
      });
    }

    if (!contextData) {
      console.warn("[v0] No valid knowledge sources found for chatbot");
      contextData = "SYSTEM: No knowledge base data is currently available.";
    }

    /* === PREVIOUS SYSTEM INSTRUCTION (Commented Out) ===
    const systemInstruction = `You are ${chatbot.name || "AI Assistant"}. ${
      chatbot.tagline || ""
    }

Personality: ${chatbot.personality || "Friendly and helpful"}

${
  chatbot.systemPrompt
    ? `=== CUSTOM INSTRUCTIONS (HIGHEST PRIORITY) ===
${chatbot.systemPrompt}

CRITICAL: These custom instructions take precedence over ALL other information sources. If there's any conflict between custom instructions and other data sources, ALWAYS follow the custom instructions.
=== END CUSTOM INSTRUCTIONS ===

`
    : ""
}

=== KNOWLEDGE BASE ===
${contextData}
=== END KNOWLEDGE BASE ===

INFORMATION PRIORITY RULES:
${
  chatbot.systemPrompt
    ? `1. CUSTOM INSTRUCTIONS (above) = HIGHEST PRIORITY - Always follow these first
2. UPLOADED FILES = HIGH PRIORITY - Use file data when custom instructions don't specify
3. WEBSITE CONTENT = REFERENCE - Use only when files and custom instructions don't provide the answer`
    : `1. UPLOADED FILES = HIGH PRIORITY - Prioritize information from uploaded files
2. WEBSITE CONTENT = REFERENCE - Use website data when files don't provide the answer`
}

${
  allSources.length === 0
    ? `IMPORTANT: NO KNOWLEDGE BASE DATA IS AVAILABLE
- You do not have access to any website content or files yet
- When asked about anything specific, respond: "I don't have that information in my knowledge base yet. Please contact us directly for assistance."
- Be polite and apologetic about the limitation
- NEVER make up or guess information`
    : `RESPONSE RULES:
1. Answer questions using the priority order above.
2. If conflicting information exists, use the higher priority source.
3. PERSONALITY & PERSPECTIVE: Speak directly as a representative of the institution. Use first-person pronouns: "we", "our", "us" (and in Arabic: "نحن", "فروعنا", "موقعنا"). Do NOT say "according to the website", "based on the documents", or "in our knowledge base". Speak as if you ARE the business itself.
4. NO META-COMMENTARY: If specific information is not found in any source, do NOT say "I don't have that in my knowledge base". Instead, respond as the representative: "We don't have this specific detail at the moment, but please contact us directly or visit our website at ${
        chatbot.dataSourceUrl || "our homepage"
      } for assistance."
5. FOCUS: Be extremely concise and answer ONLY the specific question asked. Do not combine unrelated topics. For example, if asked about prices or registration, do NOT talk about branch locations unless explicitly asked.
6. NO FOOTNOTES/CITATIONS: Do NOT output bracketed numbers or footnotes (like [1], [5], [10]). Clean them out completely.
7. DIRECT LINKS: When referencing website pages, branches, or contact information, you MUST provide the direct clickable markdown link (e.g., [Contact Us](https://brooklynacademy.net/contact) or [Register Now](url)) using the exact URLs from the KNOWLEDGE BASE above. Do not refer to them in plain text.
8. NEVER make up information - only use what's provided.`
}
`;
    === END PREVIOUS SYSTEM INSTRUCTION === */

    // Detect which data sources are available for smart prompt adaptation
    const hasWebData = webSources.length > 0;
    const hasFileData = fileSources.length > 0;
    const hasCustomPrompt = !!chatbot.systemPrompt;
    const businessWebsite = chatbot.dataSourceUrl || "";

    // Build data-source-aware priority section
    let priorityRules = "";
    if (hasCustomPrompt && hasFileData && hasWebData) {
      priorityRules = `INFORMATION PRIORITY (follow this order strictly):
1. CUSTOM INSTRUCTIONS = HIGHEST — always follow these first, they override everything.
2. UPLOADED FILES = HIGH — use file content when custom instructions don't cover the topic.
3. WEBSITE PAGES = SUPPORTING — use only when files and custom instructions don't have the answer.`;
    } else if (hasCustomPrompt && hasFileData) {
      priorityRules = `INFORMATION PRIORITY (follow this order strictly):
1. CUSTOM INSTRUCTIONS = HIGHEST — always follow these first.
2. UPLOADED FILES = PRIMARY — your main knowledge source for all answers.`;
    } else if (hasCustomPrompt && hasWebData) {
      priorityRules = `INFORMATION PRIORITY (follow this order strictly):
1. CUSTOM INSTRUCTIONS = HIGHEST — always follow these first.
2. WEBSITE PAGES = PRIMARY — your main knowledge source for all answers.`;
    } else if (hasFileData && hasWebData) {
      priorityRules = `INFORMATION PRIORITY (follow this order strictly):
1. UPLOADED FILES = HIGHEST — prioritize file content for answers.
2. WEBSITE PAGES = SUPPORTING — use only when files don't cover the topic.`;
    } else if (hasFileData) {
      priorityRules = `INFORMATION PRIORITY:
1. UPLOADED FILES = YOUR ONLY SOURCE — all answers must come from these files.`;
    } else if (hasWebData) {
      priorityRules = `INFORMATION PRIORITY:
1. WEBSITE PAGES = YOUR ONLY SOURCE — all answers must come from these pages.`;
    } else {
      priorityRules = `IMPORTANT: NO KNOWLEDGE BASE DATA IS AVAILABLE.`;
    }

    const systemInstruction = `You are "${chatbot.name || "AI Assistant"}"${chatbot.tagline ? ` — ${chatbot.tagline}` : ""}.
Personality: ${chatbot.personality || "Friendly and helpful"}.

${
  hasCustomPrompt
    ? `=== CUSTOM INSTRUCTIONS (HIGHEST PRIORITY) ===
${chatbot.systemPrompt}

CRITICAL: These custom instructions take precedence over ALL other data sources. If there is any conflict between these instructions and information from files or website pages, ALWAYS follow the custom instructions.
=== END CUSTOM INSTRUCTIONS ===
`
    : ""
}
=== KNOWLEDGE BASE ===
${contextData}
=== END KNOWLEDGE BASE ===

${priorityRules}

=== CORE BEHAVIOR RULES ===

1. REPRESENTATIVE IDENTITY:
   - You ARE part of the business. Speak in the first person: "we", "our", "us" (Arabic: "نحن", "لدينا", "فروعنا", "موقعنا").
   - NEVER say "according to the website", "based on the documents", "the pages I have", "in my knowledge base", or any similar meta-commentary.
   - Present information naturally and confidently as a team member would.

2. STRICT FOCUS:
   - Answer ONLY the specific question asked by the user.
   - Do NOT volunteer unrelated information. If asked about pricing, talk about pricing only — not locations, not registration steps, not program lists.
   - If the user asks about multiple topics in one message, address each one separately and clearly.

3. WHEN INFORMATION IS MISSING:
   - Do NOT say "I don't have that in my knowledge base" or "that information is not available in my data".
   - Instead, respond warmly as the business: "لم نتمكن من توفير هذه المعلومة حالياً، يمكنك التواصل معنا مباشرة للحصول على التفاصيل." (or in English: "We don't have this specific detail available right now. Please contact us directly for assistance.")${businessWebsite ? `\n   - You may add: "or visit ${businessWebsite} for more information."` : ""}

4. CLEAN OUTPUT:
   - NEVER output bracketed citation numbers like [1], [5], [10], or footnote markers. Remove them completely.
   - Do not include source references like "Source: page title" at the end of your response.

5. LINKS & URLS:
   - When referring to a specific page from the KNOWLEDGE BASE (website content), you MUST output its URL as a clickable markdown link: [descriptive text](exact-url-from-knowledge-base).
   - When the chatbot owner has configured a website (${businessWebsite || "none configured"}), use it for fallback "learn more" links.
   - NEVER fabricate URLs. Only use URLs that exist in the KNOWLEDGE BASE above.

6. LANGUAGE:
   - Always respond in the same language the user writes in. If the user writes in Arabic, respond fully in Arabic. If in English, respond fully in English.

7. ACCURACY:
   - NEVER invent, guess, or hallucinate information. If it's not in your data sources, follow rule #3.
   - When information IS available, be confident, helpful, and direct.

=== END CORE BEHAVIOR RULES ===
`;

    const recentMessages = await prisma.chatMessage.findMany({
      where: { chatbotId },
      take: 6,
      orderBy: { createdAt: "desc" },
    });

    /* Original Google GenAI Code (Commented Out)
    const history = recentMessages.reverse().map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content.substring(0, 800) }],
    }));

    const ai = new GoogleGenAI({ apiKey });
    const chat = ai.chats.create({
      model: "gemini-2.5-flash-lite",
      history: history,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    });

    const result = await chat.sendMessage({ message });
    const responseText = result.text.trim();
    */

    // OpenRouter Integration
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openrouterApiKey) {
      console.error("[OpenRouter] OPENROUTER_API_KEY not found in environment");
      return Response.json(
        { error: "OpenRouter API Key not configured. Please set OPENROUTER_API_KEY in your .env.local file." },
        { status: 500, headers }
      );
    }

    const messages = [
      { role: "system", content: systemInstruction },
      ...recentMessages.reverse().map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content.substring(0, 800),
      })),
      { role: "user", content: message },
    ];

    let responseText = "";
    try {
      const openRouterResponse = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openrouterApiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": appDomain,
            "X-Title": "Get Button Brooklyn",
          },
          body: JSON.stringify({
            model: "openrouter/auto",
            messages: messages,
            temperature: 0.7,
            max_tokens: 1000,
          }),
        },
      );

      if (!openRouterResponse.ok) {
        const errText = await openRouterResponse.text();
        throw new Error(`OpenRouter API error: ${openRouterResponse.status} - ${errText}`);
      }

      const openRouterData = await openRouterResponse.json();
      responseText = openRouterData.choices?.[0]?.message?.content?.trim() || "";
    } catch (apiError) {
      console.error("[OpenRouter] API call failed:", apiError);
      return Response.json(
        { error: "Failed to fetch response from OpenRouter", details: apiError.message },
        { status: 502, headers }
      );
    }

    const relevantSources = [];

    if (
      webSources.length > 0 &&
      allSources.length > 0 &&
      responseText.length > 20
    ) {
      const questionKeywords = message
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3);

      let bestMatch = null;
      let highestScore = 0;

      webSources.forEach((source) => {
        const sourceContent = (
          source.title +
          " " +
          source.content
        ).toLowerCase();
        const score = questionKeywords.filter((keyword) =>
          sourceContent.includes(keyword),
        ).length;

        if (score > highestScore && source.url) {
          highestScore = score;
          bestMatch = source;
        }
      });

      if (bestMatch && highestScore > 0) {
        relevantSources.push({
          title: bestMatch.title,
          url: bestMatch.url,
        });
      }
    }

    await prisma.$transaction(
      [
        prisma.chatMessage.create({
          data: { chatbotId, role: "user", content: message },
        }),
        prisma.chatMessage.create({
          data: { chatbotId, role: "assistant", content: responseText },
        }),
        !isAdmin
          ? prisma.chatbot.update({
              where: { id: chatbotId },
              data: { messageCount: { increment: 1 } },
            })
          : null,
      ].filter(Boolean),
    );

    return Response.json(
      {
        message: responseText,
        sources: relevantSources.length > 0 ? relevantSources : undefined,
      },
      { headers },
    );
  } catch (error) {
    console.error("[v0] Chat Error:", error);
    return Response.json(
      { error: "Failed to process request", details: error.message },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
}



//old first
// 1. Answer questions using the priority order above
// 2. If conflicting information exists, use the higher priority source
// 3. If specific information is not in any source, respond: "I don't have that specific information in my knowledge base. Please contact us directly or visit ${
//         chatbot.dataSourceUrl || "our website"
//       } for more details."
// 4. Be concise, helpful, and conversational
// 5. Use clear formatting for better readability
// 6. NEVER make up information - only use what's provided
// 7. When information IS available, be confident and helpful in your response
// 8. IMPORTANT: When answering from website content, you MUST cite sources naturally in your response (e.g., "According to our [page name]..." or "As mentioned on our website...")

// SOURCE CITATION RULES:
// - When using information from WEBSITE CONTENT (not files or custom instructions), naturally reference the source page in your response
// - Example: "According to our About page..." or "As mentioned in our Services section..."
// - This helps users know where to find more detailed information on the website`
// }