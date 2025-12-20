/**
 * Optimized web crawler with deduplication and LLM-friendly markdown format
 * Uses ScrapingBee's return_page_markdown for clean, structured content
 */

const MAX_PAGES = 15;
const TIMEOUT_MS = 15000;

/**
 * Main crawler function - only checks for existing pages when re-crawling (updating)
 */
export async function crawlDomain(
  startUrl,
  chatbotId = null,
  isUpdate = false
) {
  if (!startUrl) return [];

  console.log(`[Crawler] Starting crawl for: ${startUrl}`);

  try {
    // Try ScrapingBee with markdown format first
    const pages = await crawlWithScrapingBee(startUrl, chatbotId, isUpdate);
    if (pages.length > 0) {
      console.log(`[Crawler] Success with ScrapingBee: ${pages.length} pages`);
      return pages;
    }
  } catch (e) {
    console.log("[Crawler] ScrapingBee failed, trying direct fetch...");
  }

  // Fallback to direct fetch
  try {
    const pages = await crawlWithDirectFetch(startUrl, chatbotId, isUpdate);
    if (pages.length > 0) {
      console.log(`[Crawler] Success with direct fetch: ${pages.length} pages`);
      return pages;
    }
  } catch (e) {
    console.log("[Crawler] Direct fetch failed");
  }

  // Last resort - just get homepage
  try {
    const homepage = await scrapeHomepage(startUrl);
    if (homepage) {
      console.log("[Crawler] Fallback: Got homepage content");
      return [homepage];
    }
  } catch (e) {
    console.error("[Crawler] All strategies failed:", e);
  }

  return [];
}

/**
 * Check if URL is already scraped in database
 */
async function isAlreadyScraped(url, chatbotId) {
  if (!chatbotId) return false;

  try {
    const { prisma } = await import("@/lib/prisma");
    const normalized = normalizeUrl(url);

    const existing = await prisma.knowledgeSource.findFirst({
      where: {
        chatbotId: chatbotId,
        url: normalized,
        type: "web",
      },
    });

    return !!existing;
  } catch (e) {
    console.log("[Crawler] Could not check database:", e.message);
    return false;
  }
}

/**
 * Strategy 1: ScrapingBee with LLM-friendly markdown format
 */
async function crawlWithScrapingBee(startUrl, chatbotId, isUpdate = false) {
  const apiKey = process.env.SCRAPINGBEE_API_KEY;

  if (!apiKey) {
    console.log("[Crawler] No ScrapingBee API key found, skipping...");
    return [];
  }

  console.log("[Crawler] Using ScrapingBee with markdown format...");

  const pages = [];
  const visited = new Set();
  const queue = [startUrl];

  const rootHostname = new URL(startUrl).hostname.replace(/^www\./, "");

  while (queue.length > 0 && pages.length < MAX_PAGES) {
    const url = queue.shift();
    const normalized = normalizeUrl(url);

    if (!normalized || visited.has(normalized)) continue;

    if (isUpdate && (await isAlreadyScraped(normalized, chatbotId))) {
      console.log(`[Crawler] ✓ Already scraped: ${url}`);
      visited.add(normalized);
      continue;
    }

    visited.add(normalized);

    try {
      // Get markdown for content
      const markdownApiUrl = new URL("https://app.scrapingbee.com/api/v1/");
      markdownApiUrl.searchParams.set("api_key", apiKey);
      markdownApiUrl.searchParams.set("url", url);
      markdownApiUrl.searchParams.set("return_page_markdown", "true");

      console.log(
        `[ScrapingBee] Fetching (${pages.length + 1}/${MAX_PAGES}): ${url}`
      );

      const markdownResponse = await fetch(markdownApiUrl.toString(), {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!markdownResponse.ok) {
        console.error(
          `[ScrapingBee] HTTP ${markdownResponse.status} for ${url}`
        );
        continue;
      }

      const markdown = await markdownResponse.text();

      console.log(
        `[ScrapingBee] Received ${markdown.length} chars of markdown for ${url}`
      );

      if (!markdown || markdown.length < 100) {
        console.warn(`[ScrapingBee] Empty or too short response for ${url}`);
        continue;
      }

      // Get HTML for link extraction
      const htmlApiUrl = new URL("https://app.scrapingbee.com/api/v1/");
      htmlApiUrl.searchParams.set("api_key", apiKey);
      htmlApiUrl.searchParams.set("url", url);

      const htmlResponse = await fetch(htmlApiUrl.toString(), {
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      let links = [];
      if (htmlResponse.ok) {
        const html = await htmlResponse.text();
        links = extractLinksFromHtml(html, url);
        console.log(`[ScrapingBee] Extracted ${links.length} links from HTML`);
      }

      const { title, content } = parseMarkdown(markdown, url);

      console.log(
        `[ScrapingBee] ✓ Scraped: ${title} (${content.length} chars, ${links.length} links)`
      );

      if (content.length > 100) {
        pages.push({ url: normalized, title, content });

        // Queue internal links
        for (const link of links) {
          const linkNormalized = normalizeUrl(link);
          if (
            linkNormalized &&
            !visited.has(linkNormalized) &&
            isInternalLink(link, rootHostname)
          ) {
            queue.push(link);
          }
        }
      }
    } catch (e) {
      console.error(`[ScrapingBee] Failed to fetch ${url}:`, e.message);
    }
  }

  console.log(`[ScrapingBee] Crawl complete: ${pages.length} pages saved`);
  return pages;
}

/**
 * Strategy 2: Direct fetch with plain text extraction (fallback)
 */
async function crawlWithDirectFetch(startUrl, chatbotId, isUpdate = false) {
  const pages = [];
  const visited = new Set();
  const queue = [startUrl];

  const rootHostname = new URL(startUrl).hostname.replace(/^www\./, "");

  while (queue.length > 0 && pages.length < MAX_PAGES) {
    const url = queue.shift();
    const normalized = normalizeUrl(url);

    if (!normalized || visited.has(normalized)) continue;

    if (isUpdate && (await isAlreadyScraped(normalized, chatbotId))) {
      console.log(`[Crawler] ✓ Already scraped: ${url}`);
      visited.add(normalized);
      continue;
    }

    visited.add(normalized);

    try {
      console.log(
        `[Direct] Fetching (${pages.length + 1}/${MAX_PAGES}): ${url}`
      );

      const response = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      if (!response.ok) continue;

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("text/html")) continue;

      const html = await response.text();

      if (isSPA(html)) {
        console.log(`[Crawler] SPA detected: ${url}`);
        continue;
      }

      const { title, content, links } = parseHtml(html, url);

      if (content.length > 100) {
        pages.push({ url: normalized, title, content });
        console.log(`[Direct] ✓ Scraped: ${title} (${content.length} chars)`);
      }

      for (const link of links) {
        try {
          const linkUrl = new URL(link);
          const linkHost = linkUrl.hostname.replace(/^www\./, "");
          if (linkHost === rootHostname && !visited.has(normalizeUrl(link))) {
            queue.push(link);
          }
        } catch (e) {}
      }
    } catch (e) {
      console.error(`[Direct] Failed to fetch ${url}:`, e.message);
    }
  }

  console.log(`[Direct] Crawl complete: ${pages.length} pages saved`);
  return pages;
}

/**
 * Strategy 3: Fallback - just get homepage content
 */
async function scrapeHomepage(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) return null;

    const html = await response.text();
    const { title, content } = parseHtml(html, url);

    if (content.length > 100) {
      return { url: normalizeUrl(url), title, content };
    }
  } catch (e) {
    console.error("[Fallback] Failed:", e.message);
  }

  return null;
}

/**
 * Parse markdown content and extract title and content (links extracted separately from HTML)
 */
function parseMarkdown(markdown, baseUrl) {
  // Extract title from first heading
  const titleMatch = markdown.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : "No Title";

  // Clean content - remove excessive whitespace but keep structure
  const content = markdown
    .replace(/\n{3,}/g, "\n\n") // Max 2 newlines
    .trim()
    .substring(0, 30000); // Limit to 30k chars

  return { title, content };
}

/**
 * Extract all internal links from HTML
 */
function extractLinksFromHtml(html, baseUrl) {
  const links = new Set();
  const patterns = [/href=["']([^"']+)["']/gi];

  const JUNK = [
    "login",
    "signup",
    "signin",
    "register",
    "cart",
    "checkout",
    "account",
    "profile",
    "admin",
    "wp-admin",
    "mailto:",
    "tel:",
    "javascript:",
    "#",
    ".css",
    ".js",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".pdf",
    ".zip",
    ".xml",
    ".json",
    "favicon",
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      try {
        const href = match[1].replace(/["']/g, "");

        if (
          !href ||
          href === "#" ||
          href.startsWith("javascript:") ||
          href.startsWith("mailto:") ||
          href.startsWith("tel:")
        ) {
          continue;
        }

        const abs = new URL(href, baseUrl).href;
        const lower = abs.toLowerCase();

        if (!JUNK.some((j) => lower.includes(j))) {
          links.add(abs);
        }
      } catch (e) {}
    }
  }

  return Array.from(links);
}

/**
 * Check if link is internal to the domain
 */
function isInternalLink(link, rootHostname) {
  try {
    const linkUrl = new URL(link);
    const linkHost = linkUrl.hostname.replace(/^www\./, "");
    return linkHost === rootHostname;
  } catch (e) {
    return false;
  }
}

/**
 * Clean HTML and extract meaningful text content
 */
function cleanHtml(html) {
  html = html
    .replace(/\0/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  const text = html
    .replace(
      /<(script|style|svg|noscript|iframe|nav|footer|header)[^>]*>[\s\S]*?<\/\1>/gi,
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
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();

  return text.substring(0, 30000);
}

/**
 * Detect if page is a Single Page Application
 */
function isSPA(html) {
  const indicators = [
    "You need to enable JavaScript to run this app",
    "Please enable JavaScript",
    "JavaScript is required",
    "noscript",
  ];

  return (
    indicators.some((indicator) => html.includes(indicator)) &&
    html.length < 1000
  );
}

/**
 * Normalize URL for deduplication
 */
function normalizeUrl(url) {
  try {
    const u = new URL(url);
    // Remove trailing slash and fragments
    return u.origin + u.pathname.replace(/\/$/, "");
  } catch (e) {
    return null;
  }
}

/**
 * Parse HTML content and extract title, content, and links
 */
function parseHtml(html, baseUrl) {
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : "No Title";

  const content = cleanHtml(html);

  const links = extractLinksFromHtml(html, baseUrl);

  return { title, content, links };
}
