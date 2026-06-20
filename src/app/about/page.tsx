import type { Metadata } from "next";
import { FAQ_ITEMS, GLOSSARY } from "@/content/about";
import { AboutJsonLd } from "@/components/seo/AboutJsonLd";

const description =
  "What KUB Node Info is, how validators, pool/solo nodes, staking power, commission and rewards work on the KUB Chain, how to stake and manage your own nodes, which contracts the data comes from, and a staking glossary.";

export const metadata: Metadata = {
  title: "About & FAQ",
  description,
  alternates: { canonical: "/about" },
  openGraph: { title: "About & FAQ · KUB Node Info", description, url: "/about" },
  twitter: {
    card: "summary_large_image",
    title: "About & FAQ · KUB Node Info",
    description,
  },
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-8 sm:px-6 sm:py-10">
      <AboutJsonLd />

      <header className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          About &amp; FAQ
        </h1>
        <p className="text-sm leading-relaxed text-ink-muted">
          KUB Node Info is an unofficial explorer and stake manager for
          validators and nodes on the KUB Chain (Bitkub Chain, chainId 96).
          Browsing is read-only and needs no wallet; connect one and you can also
          manage the nodes you own — staking, claiming rewards and updating
          settings — read live from and written to the StakeManager smart
          contracts. It is not affiliated with the KUB Foundation.
        </p>
      </header>

      <section aria-labelledby="faq-heading" className="space-y-6">
        <h2
          id="faq-heading"
          className="text-lg font-bold tracking-tight text-ink"
        >
          Frequently asked questions
        </h2>
        <dl className="space-y-6">
          {FAQ_ITEMS.map((f) => (
            <div
              key={f.question}
              className="rounded-card border border-line bg-card p-5"
            >
              <dt className="text-base font-semibold text-ink">{f.question}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-ink-muted">
                {f.answer}
                {f.link && (
                  <>
                    {" "}
                    <a
                      href={f.link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                    >
                      {f.link.label} →
                    </a>
                  </>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="glossary-heading" className="space-y-6">
        <h2
          id="glossary-heading"
          className="text-lg font-bold tracking-tight text-ink"
        >
          Glossary
        </h2>
        <dl className="divide-y divide-line rounded-card border border-line bg-card px-5">
          {GLOSSARY.map((t) => (
            <div
              key={t.term}
              className="flex flex-col gap-1 py-4 sm:flex-row sm:gap-6"
            >
              <dt className="shrink-0 text-sm font-semibold text-ink sm:w-44">
                {t.term}
              </dt>
              <dd className="text-sm leading-relaxed text-ink-muted">
                {t.definition}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
