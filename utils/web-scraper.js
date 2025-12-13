/**
 * Simple web scraper utility for single URLs
 * Use this when you just need to scrape one page quickly
 */

export async function scrapeUrl(url, options = {}) {
  const { timeout = 10000, renderJs = false, maxLength = 25000 } = options;

  console.log(`[Scraper] Fetching: ${url}`);

  // Try ScrapingBee first if API key is available
  const apiKey = process.env.SCRAPINGBEE_API_KEY;

  if (apiKey) {
    try {
      const result = await scrapeWithScrapingBee(url, {
        apiKey,
        renderJs,
        timeout,
      });
      if (result) return result;
    } catch (e) {
      console.log("[Scraper] ScrapingBee failed, trying direct fetch...");
    }
  }

  // Fallback to direct fetch
  try {
    return await scrapeWithDirectFetch(url, { timeout, maxLength });
  } catch (e) {
    throw new Error(`Failed to scrape ${url}: ${e.message}`);
  }
}

async function scrapeWithScrapingBee(url, { apiKey, renderJs, timeout }) {
  const apiUrl = new URL("https://app.scrapingbee.com/api/v1/");
  apiUrl.searchParams.set("api_key", apiKey);
  apiUrl.searchParams.set("url", url);
  apiUrl.searchParams.set("render_js", renderJs ? "true" : "false");

  const response = await fetch(apiUrl.toString(), {
    signal: AbortSignal.timeout(timeout),
  });

  if (!response.ok) {
    throw new Error(`ScrapingBee returned ${response.status}`);
  }

  const html = await response.text();
  return parseAndClean(html, url);
}

async function scrapeWithDirectFetch(url, { timeout, maxLength }) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeout),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("text/html")) {
    throw new Error("Not HTML content");
  }

  const html = await response.text();
  return parseAndClean(html, url, maxLength);
}

function parseAndClean(html, url, maxLength = 25000) {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "No Title";

  // Extract meta description
  const descMatch = html.match(
    /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i
  );
  const description = descMatch ? descMatch[1] : "";

  // Clean HTML
  let content = html
    .replace(
      /<(script|style|svg|noscript|iframe|nav|footer)[^>]*>[\s\S]*?<\/\1>/gi,
      ""
    )
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/(div|p|h[1-6]|li|tr|br|article|section)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();

  content = content.substring(0, maxLength);

  return {
    url,
    title,
    description,
    content,
    length: content.length,
  };
}
