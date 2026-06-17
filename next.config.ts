import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    // Validator logos come from the off-chain registry (src/data/validators.json).
    remotePatterns: [
      { protocol: "https", hostname: "static.bitkubnext.com" },
      { protocol: "https", hostname: "bitkubipfs.io" },
    ],
  },
};

export default nextConfig;
