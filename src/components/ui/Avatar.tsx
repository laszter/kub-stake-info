"use client";

import Image from "next/image";
import { useState } from "react";

function initials(name: string | null, address: string): string {
  if (name) {
    const parts = name.replace(/[^a-zA-Z0-9 ]/g, " ").trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return address.slice(2, 4).toUpperCase();
}

export function Avatar({
  src,
  name,
  address,
  size = 48,
  className = "",
}: {
  src: string | null;
  name: string | null;
  address: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImg = src && !failed;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-light font-bold text-brand-dark ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {showImg ? (
        <Image
          src={src}
          alt={name ? `${name} logo` : `Validator ${address}`}
          width={size}
          height={size}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
          unoptimized={src.includes("ipfs")}
        />
      ) : (
        initials(name, address)
      )}
    </span>
  );
}
