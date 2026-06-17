/**
 * Renders a JSON-LD <script> block. Server component — safe to drop into any
 * RSC. `data` is a schema.org object (or array of objects under @graph).
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is escaped; no user-controlled HTML here.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
