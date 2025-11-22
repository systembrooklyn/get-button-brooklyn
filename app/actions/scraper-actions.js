"use server";

export async function scrapeWebsite(url) {
  try {
    console.log("[v0] Starting scrape for:", url);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ChatbotScraper/1.0)",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    const html = await response.text();
    console.log("[v0] Fetched HTML length:", html.length);

    const textContent = html
      // Remove scripts and styles
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      // Remove comments
      .replace(/<!--[\s\S]*?-->/g, "")
      // Remove HTML tags
      .replace(/<[^>]+>/g, " ")
      // Decode HTML entities
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      // Clean up whitespace
      .replace(/\s+/g, " ")
      .trim();

    console.log("[v0] Extracted text length:", textContent.length);

    // Limit content to reasonable size (50000 characters)
    const finalContent = textContent.substring(0, 50000);
    console.log("[v0] Final content length:", finalContent.length);

    return finalContent;
  } catch (error) {
    console.error("[v0] Error scraping website:", error);
    throw error;
  }
}
