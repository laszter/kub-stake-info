import { JsonLd } from "./JsonLd";
import {
  SITE_URL,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_DESCRIPTION,
  absoluteUrl,
} from "@/lib/site";

/**
 * Site-wide WebSite + Organization graph. Rendered once in the root layout so
 * every page carries the publisher/entity identity (helps SEO + AEO).
 */
export function SiteJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        inLanguage: "en",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        description: `${SITE_TAGLINE}. Unofficial — not affiliated with the KUB Foundation.`,
        logo: {
          "@type": "ImageObject",
          url: absoluteUrl("/icon-512.png"),
          width: 512,
          height: 512,
        },
      },
    ],
  };
  return <JsonLd data={data} />;
}
