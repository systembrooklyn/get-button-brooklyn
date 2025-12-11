"use server";

export async function scrapeWebsite(url) {
  if (!url) return "";

  try {
    console.log("[v0] Scraping URL:", url);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
      redirect: "follow",
      next: { revalidate: 300 }, // Cache for 5 mins for live testing
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Status ${response.status}`);
    }

    let html = await response.text();

    // SPA Detection (React/Next.js empty shells)
    if (
      html.includes("You need to enable JavaScript to run this app") ||
      html.length < 500
    ) {
      return `[SYSTEM WARNING]: The website ${url} appears to be a Single Page Application (SPA) hidden behind JavaScript. I cannot read its content directly with the current scraper. Please rely on Google Search or ask the user to copy-paste the text.`;
    }

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "No Title";

    // Aggressive Cleanup
    html = html.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      " "
    );
    html = html.replace(
      /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
      " "
    );
    html = html.replace(/<[^>]+>/g, " "); // Strip all tags
    html = html.replace(/\s+/g, " ").trim(); // Collapse whitespace

    const limit = 25000;
    const cleanText = html.substring(0, limit);

    return `
=== START SCRAPED CONTENT ===
URL: ${url}
TITLE: ${title}
CONTENT:
${cleanText}
=== END SCRAPED CONTENT ===
`;
  } catch (error) {
    console.error("[v0] Scrape Failed:", error.message);
    return `[System: Failed to read content from ${url}. Error: ${error.message}]`;
  }
}
