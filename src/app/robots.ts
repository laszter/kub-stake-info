import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // General search + crawlers. Stake Manager is a wallet tool — keep it out.
      { userAgent: "*", allow: "/", disallow: ["/stake-manager"] },
      // Explicitly welcome AI / answer-engine crawlers (AEO) so the explorer can
      // be cited. Remove any you'd rather not be ingested by.
      {
        userAgent: [
          "GPTBot",
          "OAI-SearchBot",
          "ChatGPT-User",
          "ClaudeBot",
          "Claude-Web",
          "anthropic-ai",
          "PerplexityBot",
          "Perplexity-User",
          "Google-Extended",
          "Applebot",
          "Applebot-Extended",
          "Bingbot",
          "CCBot",
        ],
        allow: "/",
        disallow: ["/stake-manager"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
