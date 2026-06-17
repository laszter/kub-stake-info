// Reuse the root brand OG image for this segment. Next only merges a
// file-convention image into a segment's openGraph when the file lives in that
// same segment, so re-export it here (this page sets its own openGraph object).
export { default, size, contentType, alt } from "../opengraph-image";
