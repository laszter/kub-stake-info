// Build-only shim for design-sync previews. The real `next/image` drags Next's
// runtime (loader config via `process.env.__NEXT_IMAGE_OPTS`, etc.) into the
// browser IIFE; in a standalone preview it renders a plain <img> anyway. This
// mirrors that output so Avatar's image branch renders faithfully without the
// Next runtime. Aliased in tsconfig.build.json (paths: "next/image").
import * as React from "react";

type ImageLikeProps = {
  src?: string;
  alt?: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  // next/image-only props — accepted then dropped so they don't hit the DOM.
  fill?: boolean;
  priority?: boolean;
  quality?: number;
  unoptimized?: boolean;
  placeholder?: string;
  blurDataURL?: string;
  loader?: unknown;
  sizes?: string;
  [key: string]: unknown;
};

export default function Image(props: ImageLikeProps) {
  const {
    fill: _fill,
    priority: _priority,
    quality: _quality,
    unoptimized: _unoptimized,
    placeholder: _placeholder,
    blurDataURL: _blurDataURL,
    loader: _loader,
    ...rest
  } = props;
  return React.createElement("img", rest);
}
