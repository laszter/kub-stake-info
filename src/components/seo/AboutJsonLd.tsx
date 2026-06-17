import { JsonLd } from "./JsonLd";
import { SITE_URL } from "@/lib/site";
import { FAQ_ITEMS, GLOSSARY } from "@/content/about";

/** FAQPage + DefinedTermSet built from the same copy shown on the About page. */
export function AboutJsonLd() {
  const faqPage = {
    "@type": "FAQPage",
    "@id": `${SITE_URL}/about#faq`,
    mainEntity: FAQ_ITEMS.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  const glossary = {
    "@type": "DefinedTermSet",
    "@id": `${SITE_URL}/about#glossary`,
    name: "KUB Chain staking glossary",
    hasDefinedTerm: GLOSSARY.map((t) => ({
      "@type": "DefinedTerm",
      name: t.term,
      description: t.definition,
      inDefinedTermSet: `${SITE_URL}/about#glossary`,
    })),
  };

  return (
    <JsonLd
      data={{ "@context": "https://schema.org", "@graph": [faqPage, glossary] }}
    />
  );
}
