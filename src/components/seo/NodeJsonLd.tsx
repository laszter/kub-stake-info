import { JsonLd } from "./JsonLd";
import { SITE_URL, absoluteUrl } from "@/lib/site";

/** Breadcrumb trail for a validator detail page: Home › Validators › {name}. */
export function NodeJsonLd({
  name,
  address,
}: {
  name: string;
  address: string;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: "Validators",
        item: `${SITE_URL}/#nodes`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name,
        item: absoluteUrl(`/nodes/${address}`),
      },
    ],
  };
  return <JsonLd data={data} />;
}
